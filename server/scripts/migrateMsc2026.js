/**
 * MSC 2026 旧数据迁移脚本
 *
 * 将 User 文档中的 isRegistered / nickname / contactType / contactValue / prizeWish / intro
 * 迁移到新赛事系统的 Tournament.registrations[] 中。
 *
 * 用法: node server/scripts/migrateMsc2026.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Tournament = require('../models/Tournament');

const OLD_TOURNAMENT_ID = 'msc-2026';
const REG_FORM_FIELDS = [
  { label: '参赛昵称', type: 'text', required: true, placeholder: '' },
  { label: '联系方式类型', type: 'select', required: true, options: ['QQ', 'Phone', 'Email'] },
  { label: '联系方式', type: 'text', required: true, placeholder: '' },
  { label: '奖品期望', type: 'text', required: false, placeholder: '' },
  { label: '出场介绍', type: 'textarea', required: false, placeholder: '' },
];

async function migrate() {
  console.log('='.repeat(50));
  console.log('MSC 2026 数据迁移脚本');
  console.log('='.repeat(50));

  // 1. 连接数据库
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB 已连接\n');

  // 2. 查找 ADM 用户作为 createdBy
  const adminUser = await User.findOne({ role: 'ADM' });
  if (!adminUser) return console.error('❌ 未找到 ADM 用户，无法创建赛事');
  console.log(`✅ 找到 ADM 用户: ${adminUser.username} (${adminUser._id})\n`);

  // 3. 检查是否已存在 MSC 2026 赛事
  let tournament = await Tournament.findOne({ title: 'MSC 2026' });
  if (tournament) {
    console.log('⚠️  MSC 2026 赛事已存在，跳过创建，直接迁移报名数据');
  } else {
    // 4. 创建新 Tournament 文档
    tournament = new Tournament({
      title: 'MSC 2026',
      subtitle: '第二届 MSC 官方锦标赛',
      description: 'MSC 2026（Maimai Summer Championship 2026）是面向全国舞萌玩家的第二届官方锦标赛。\n\n赛程分为：预选赛报名 → 预选海选 → 选手分组 → 正赛对局 → 最终排名五个阶段。',
      coverUrl: '/assets/register_banner.png',
      rules: '',
      status: 'REGISTRATION',
      registrationStart: new Date('2026-01-01T00:00:00Z'),
      registrationEnd: new Date('2026-07-01T23:59:59Z'),
      startTime: new Date('2026-07-04T00:00:00Z'),
      endTime: new Date('2026-07-13T23:59:59Z'),
      timeApproved: true, // ADM 创建，自动审核
      createdBy: adminUser._id,
      managers: [adminUser._id], // 将 ADM 加入管理者
      registrationForm: REG_FORM_FIELDS,
      advanceCount: 16,
      seeding: 'qualifier',
      tags: ['msc', 'official', '2026'],
    });

    await tournament.save();
    console.log(`✅ MSC 2026 赛事已创建 (ID: ${tournament._id})`);
  }

  // 5. 迁移报名数据
  const registeredUsers = await User.find({ isRegistered: true });
  console.log(`\n📊 找到 ${registeredUsers.length} 个已报名的用户`);

  let migrated = 0;
  let skipped = 0;
  const errors = [];

  for (const user of registeredUsers) {
    try {
      // 检查是否已迁移（防重复）
      const existing = tournament.registrations.find(
        r => r.userId.toString() === user._id.toString()
      );
      if (existing) {
        console.log(`  ⏩ ${user.username} — 已迁移，跳过`);
        skipped++;
        continue;
      }

      tournament.registrations.push({
        userId: user._id,
        formData: {
          '参赛昵称': user.nickname || user.username || '',
          '联系方式类型': user.contactType || 'QQ',
          '联系方式': user.contactValue || '',
          '奖品期望': user.prizeWish || '',
          '出场介绍': user.intro || '',
        },
        registeredAt: user.regTime || new Date(),
      });

      migrated++;
      console.log(`  ✅ ${user.username} — 已迁移`);
    } catch (err) {
      errors.push({ userId: user._id, username: user.username, error: err.message });
      console.error(`  ❌ ${user.username} — 失败: ${err.message}`);
    }
  }

  await tournament.save();
  console.log(`\n📋 迁移结果`);
  console.log(`  成功: ${migrated}`);
  console.log(`  跳过: ${skipped}`);
  console.log(`  失败: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n  失败详情:');
    errors.forEach(e => console.log(`    - ${e.username}: ${e.error}`));
  }

  console.log(`\n✅ MSC 2026 迁移完成`);
  console.log(`  赛事 ID: ${tournament._id}`);
  console.log(`  总报名人数: ${tournament.registrations.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ 迁移脚本异常:', err);
  process.exit(1);
});
