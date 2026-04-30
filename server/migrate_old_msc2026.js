/**
 * MSC 2026 老赛事 → 新赛事系统 迁移脚本
 *
 * 功能：
 * 1. 创建 Tournament 文档（MSC 2026）
 * 2. 将 User 上 17 人的 isRegistered 报名数据迁移到新赛事的 registrations[]
 *
 * 运行：node migrate_old_msc2026.js
 * 安全：幂等设计（检查是否已迁移，可重复运行）
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/purebeat';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const TOURNAMENT_TITLE = 'MSC 2026';
  const ADMIN_USERNAME = 'Magix'; // 迁移脚本中查找的创建者

  // ── 1. 找管理员 (createdBy) ──
  const admin = await db.collection('users').findOne({ username: ADMIN_USERNAME });
  if (!admin) {
    console.error('❌ 管理员用户未找到，请确认 ADMIN_USERNAME');
    process.exit(1);
  }
  console.log(`✅ 管理员: ${admin.username} (${admin._id})`);

  // ── 2. 检查是否已迁移（幂等） ──
  let existingTournament = await db.collection('tournaments').findOne({ title: TOURNAMENT_TITLE, createdBy: admin._id });
  if (existingTournament) {
    console.log(`⚠️  赛事「${TOURNAMENT_TITLE}」已存在（ID: ${existingTournament._id}），跳过创建`);
  } else {
    // ── 3. 创建 Tournament 文档 ──
    const registrationForm = [
      { label: '参赛昵称', type: 'text', required: true, placeholder: '请输入参赛昵称' },
      { label: '联系方式类型', type: 'select', required: true, options: ['QQ', 'Phone', 'Email'] },
      { label: '联系方式', type: 'text', required: true, placeholder: 'QQ号/手机号/邮箱' },
      { label: '奖品期望', type: 'textarea', required: false, placeholder: '你希望获得的奖品' },
      { label: '出场介绍', type: 'textarea', required: false, placeholder: '一句话介绍自己' },
    ];

    const now = new Date();
    const tournamentDoc = {
      title: TOURNAMENT_TITLE,
      subtitle: '第二届 MSC 官方锦标赛',
      description: '',
      coverUrl: '/assets/register_banner.png',
      rules: '选手必须使用和预选赛提交成绩相同的舞萌账号进行正赛。\n严禁使用第三方插件。违者取消成绩并禁赛两年。',
      registrationStart: new Date('2026-01-01T00:00:00+08:00'),
      registrationEnd: new Date('2026-04-30T00:00:00+08:00'),
      startTime: new Date('2026-07-04T00:00:00+08:00'),
      endTime: new Date('2026-07-13T23:59:59+08:00'),
      timeApproved: true,
      status: 'QUALIFYING',          // 报名已截止，当前是预选阶段
      createdBy: admin._id,
      managers: [admin._id],
      registrationForm,
      registrations: [],
      qualifierSongs: [
        { songName: 'PANDORA PARADOXXX', difficulty: 'MASTER', constant: 14.4 },
        { songName: 'Oshama Scramble!', difficulty: 'MASTER', constant: 14.0 },
      ],
      advanceCount: 8,
      operationLogs: [
        {
          action: 'transition',
          fromStatus: 'DRAFT',
          toStatus: 'QUALIFYING',
          operatedBy: admin._id,
          note: '赛事迁移 — 老 MSC 2026 数据迁入',
          operatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('tournaments').insertOne(tournamentDoc);
    existingTournament = await db.collection('tournaments').findOne({ _id: result.insertedId });
    console.log(`✅ 赛事「${TOURNAMENT_TITLE}」创建成功（ID: ${existingTournament._id}）`);
  }

  const tournamentId = existingTournament._id;

  // ── 4. 迁移报名数据 ──
  const registeredUsers = await db.collection('users').find({ isRegistered: true }).toArray();
  console.log(`\n📋 待迁移报名用户: ${registeredUsers.length} 人`);

  // 获取当前已有 registrations（防重入）
  const currentRegs = existingTournament.registrations || [];
  const existingUserIds = new Set(currentRegs.map(r => r.userId?.toString()));

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of registeredUsers) {
    const uid = user._id.toString();
    if (existingUserIds.has(uid)) {
      console.log(`  ⏭️  ${user.username} — 已迁移，跳过`);
      skippedCount++;
      continue;
    }

    const registration = {
      userId: user._id,
      formData: {
        '参赛昵称': user.nickname || '',
        '联系方式类型': user.contactType || 'QQ',
        '联系方式': user.contactValue || '',
        '奖品期望': user.prizeWish || '',
        '出场介绍': user.intro || '',
      },
      registeredAt: user.createdAt || new Date(),
    };

    await db.collection('tournaments').updateOne(
      { _id: tournamentId },
      { $push: { registrations: registration } }
    );

    console.log(`  ✅  ${user.username} → ${user.nickname || '(无昵称)'}`);
    migratedCount++;
  }

  // ── 5. 更新 advanceCount ──
  const finalRegCount = (await db.collection('tournaments').findOne({ _id: tournamentId })).registrations?.length || 0;

  // ── 6. 统计报告 ──
  console.log(`\n═══════════ 迁移报告 ═══════════`);
  console.log(`  赛事 ID:    ${tournamentId}`);
  console.log(`  新建 / 已有: ${existingTournament.title === TOURNAMENT_TITLE ? '已有' : '新建'}`);
  console.log(`  迁移报名:    ${migratedCount} 人`);
  console.log(`  已存在跳过:  ${skippedCount} 人`);
  console.log(`  赛事总报名:  ${finalRegCount} 人`);
  console.log(`  当前状态:    QUALIFYING`);
  console.log(`  预选曲目:    2 首（PANDORA PARADOXXX / Oshama Scramble!）`);
  console.log(`═══════════════════════════════\n`);
  console.log('查询验证命令:');
  console.log(`  node -e "fetch('http://localhost:5000/api/tournaments/detail/${tournamentId}',{headers:{Authorization:'Bearer <TOKEN>'}}).then(r=>r.json()).then(d=>console.log(d.title,d.status,d.registrations?.length))"`);
  console.log('');

  await mongoose.disconnect();
}

main().catch(e => {
  console.error('❌ 迁移失败:', e);
  process.exit(1);
});
