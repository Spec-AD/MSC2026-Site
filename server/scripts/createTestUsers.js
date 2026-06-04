/**
 * 创建 24 个测试账号 t_01 ~ t_24
 * 注入到 MSC 2026 比赛选手列表
 *
 * 用法: node scripts/createTestUsers.js
 *       或 node scripts/createTestUsers.js --clean  先清理再重建
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  const clean = process.argv.includes('--clean');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB 已连接');

  const User = require('../models/User');
  const MSC2026Tournament = require('../models/MSC2026Tournament');

  // ---- 清理旧测试账号 ----
  if (clean) {
    const delResult = await User.deleteMany({ username: /^t_/ });
    console.log('已清理', delResult.deletedCount, '个旧测试账号');
  }

  // ---- 创建 24 个测试账号 ----
  const password = 'test123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const createdIds = [];

  for (let i = 1; i <= 24; i++) {
    const username = `t_${String(i).padStart(2, '0')}`;

    // 检查是否已存在（避免重复创建）
    const existing = await User.findOne({ username });
    if (existing) {
      console.log(`  ${username} 已存在，跳过 (${existing._id})`);
      createdIds.push(existing._id);
      continue;
    }

    let randomUid;
    let uidExists = true;
    while (uidExists) {
      randomUid = Math.floor(10000 + Math.random() * 90000);
      const checkUid = await User.findOne({ uid: randomUid });
      if (!checkUid) uidExists = false;
    }

    const user = new User({
      username,
      password: hashedPassword,
      uid: randomUid,
      role: 'user',
    });

    const saved = await user.save();
    createdIds.push(saved._id);
    console.log(`  ${username} 已创建 (${saved._id})`);
  }

  console.log(`\n总计 ${createdIds.length} 个测试账号`);

  // ---- 注入到比赛选手列表 ----
  let tournament = await MSC2026Tournament.findOne();
  if (!tournament) {
    tournament = new MSC2026Tournament();
    console.log('创建新 MSC 2026 Tournament 文档');
  }

  tournament.registeredPlayers = createdIds;
  await tournament.save();
  console.log(`已注入 ${createdIds.length} 人到比赛 registeredPlayers`);

  // ---- 输出摘要 ----
  console.log('\n=== 选手信息（供测试使用） ===');
  const users = await User.find({ _id: { $in: createdIds } }).select('username _id').lean();
  
  // 按序号排序输出
  const sorted = users.sort((a, b) => {
    const na = parseInt(a.username.replace('t_', ''));
    const nb = parseInt(b.username.replace('t_', ''));
    return na - nb;
  });

  console.log('\n用户名\t\tID');
  sorted.forEach(u => console.log(`${u.username}\t\t${u._id}`));

  console.log('\n=== 选手 ID 数组（JSON，可直接用于 API） ===');
  const allUserIds = sorted.map(u => u._id.toString());
  console.log(JSON.stringify(allUserIds));

  console.log('\n所有账号密码: test123');

  await mongoose.disconnect();
  console.log('完成');
}

run().catch(e => { console.error('脚本失败:', e); process.exit(1); });
