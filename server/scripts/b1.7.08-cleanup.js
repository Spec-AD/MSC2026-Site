/**
 * b1.7.08 Hotfix — 数据清理脚本 v2
 *
 * 背景：
 *   hotfix v1 在 OsuScore 模型加了全局唯一索引 { userId, mode, beatmapId }
 *   导致 BP sync 的 upsert 误匹配到同 beatmapId 的 recent 记录
 *   → 覆盖 source 为 'bp' + 错误数据
 *   后改为 partial unique index (source: 'bp')
 *
 * 本脚本修复：
 *   1. 清理全局唯一索引（如有）
 *   2. 删除被污染的 source='bp' 数据（含被误覆盖的 recent）
 *   3. 清理重复记录
 *   4. 创建 partial unique index (source: 'bp')
 *
 * 用法: node server/scripts/b1.7.08-cleanup.js
 * 注意：会删除所有 BP 源数据 + 被 BP 覆盖的 recent 数据，
 *       用户需重新触发 syncBP + refresh-light 恢复。
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/purebeat';

async function cleanup() {
  console.log('[cleanup] 连接数据库...');
  await mongoose.connect(MONGO_URI);
  const OsuScore = mongoose.model('OsuScore', require('../models/OsuScore').schema);
  const collection = OsuScore.collection;

  // ── Step 0: 清理旧索引 ──
  // 必须先删全局唯一索引再操作数据，否则后续写入可能继续触发 duplicate key
  console.log('[cleanup] Step 0: 清理旧索引...');
  const existingIndexes = await collection.indexes();
  const fullUniqueIdx = existingIndexes.find(
    (idx) => idx.name === 'userId_1_mode_1_beatmapId_1' && idx.unique === true && !idx.partialFilterExpression
  );
  if (fullUniqueIdx) {
    await collection.dropIndex('userId_1_mode_1_beatmapId_1');
    console.log('  ✓ 已删除全局唯一索引');
  } else {
    console.log('  ℹ️ 未发现全局唯一索引，跳过');
  }

  // ── Step 1: 删除所有 BP 源数据 ──
  // 包括：原本 source='bp' 的记录 + 被 BP upsert 误覆盖的 recent 记录
  console.log('[cleanup] Step 1: 删除 source=bp 的记录（含误覆盖的 recent 数据）...');
  const delResult = await OsuScore.deleteMany({ source: 'bp' });
  console.log('  ✓ 已删除 %d 条（用户需重新 syncBP / refresh-light 恢复）', delResult.deletedCount);

  // ── Step 2: 删除重复记录 ──
  console.log('[cleanup] Step 2: 删除重复记录（保留最早一条）...');
  const dupPipeline = [
    {
      $group: {
        _id: { userId: '$userId', mode: '$mode', beatmapId: '$beatmapId' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];
  const duplicates = await OsuScore.aggregate(dupPipeline);
  let removedDupCount = 0;
  for (const dup of duplicates) {
    const [keep, ...remove] = dup.ids.sort();
    await OsuScore.deleteMany({ _id: { $in: remove } });
    removedDupCount += remove.length;
  }
  console.log('  ✓ 发现 %d 组重复, 已删除 %d 条', duplicates.length, removedDupCount);

  // ── Step 3: 创建唯一索引（仅 BP 来源） ──
  console.log('[cleanup] Step 3: 创建 BP-only partial unique index...');
  try {
    await collection.createIndex(
      { userId: 1, mode: 1, beatmapId: 1 },
      {
        unique: true,
        partialFilterExpression: { source: 'bp' },
        background: true,
      }
    );
    console.log('  ✓ BP-only 唯一索引创建成功');
  } catch (err) {
    if (err.code === 85 || err.message?.includes('already exists')) {
      console.log('  ℹ️ 索引已存在');
    } else {
      console.log('  ⚠️ 索引创建异常:', err.message);
    }
  }

  // ── 汇总 ──
  const totalCount = await OsuScore.countDocuments();
  const bpCount = await OsuScore.countDocuments({ source: 'bp' });
  const recentCount = await OsuScore.countDocuments({ source: 'recent' });
  console.log('\n[cleanup] 汇总:');
  console.log('  总记录数: %d', totalCount);
  console.log('  source=bp:  %d', bpCount);
  console.log('  source=recent: %d', recentCount);
  console.log('\n⚠️ 用户需手动触发全量同步 BP + 各页面 refresh-light 恢复数据');

  await mongoose.disconnect();
  console.log('[cleanup] ✅ 完成');
}

cleanup().catch((err) => {
  console.error('[cleanup] ❌ 失败:', err.message);
  process.exit(1);
});
