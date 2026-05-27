/**
 * b1.7.08 Hotfix — 数据清理脚本
 *
 * 用法: node server/scripts/b1.7.08-cleanup.js
 *
 * 步骤:
 *   1. 删除所有 source='bp' 的记录（playedAt 错乱）
 *   2. 删除重复记录（同 userId+mode+beatmapId 保留最新一条）
 *   3. 创建唯一复合索引
 *   4. 打印统计
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/purebeat';

async function cleanup() {
  console.log('[cleanup] 连接数据库...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const OsuScore = mongoose.model('OsuScore', require('../models/OsuScore').schema);

  // ── Step 1: 删除所有 BP 源数据 ──
  console.log('[cleanup] Step 1: 删除 source=bp 的记录...');
  const delResult = await OsuScore.deleteMany({ source: 'bp' });
  console.log('  ✓ 已删除 %d 条 BP 记录', delResult.deletedCount);

  // ── Step 2: 删除重复记录 ──
  console.log('[cleanup] Step 2: 删除重复记录（保留最新一条）...');
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
    // 保留第一条（按字符串排序最小 _id = 最早插入），删其余
    const [keep, ...remove] = dup.ids.sort();
    await OsuScore.deleteMany({ _id: { $in: remove } });
    removedDupCount += remove.length;
  }
  console.log('  ✓ 发现 %d 组重复, 已删除 %d 条', duplicates.length, removedDupCount);

  // ── Step 3: 创建唯一索引 ──
  console.log('[cleanup] Step 3: 创建唯一索引 { userId, mode, beatmapId }...');
  try {
    await OsuScore.collection.createIndex(
      { userId: 1, mode: 1, beatmapId: 1 },
      { unique: true, background: true }
    );
    console.log('  ✓ 唯一索引创建成功');
  } catch (err) {
    if (err.code === 85 || err.message?.includes('already exists')) {
      console.log('  ℹ️ 索引已存在');
    } else {
      throw err;
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

  await mongoose.disconnect();
  console.log('[cleanup] ✅ 清理完成');
}

cleanup().catch((err) => {
  console.error('[cleanup] ❌ 失败:', err.message);
  process.exit(1);
});
