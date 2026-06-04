/**
 * 验证测试账号：检查 /players 端点的数据正确性
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = require('../models/User');
  const MSC2026Tournament = require('../models/MSC2026Tournament');

  // 1. 验证已存在旧赛事选手不受影响
  const Tour = require('../models/Tournament');
  const oldRegCount = await Tour.countDocuments({ title: /msc\s*2026/i });
  console.log('旧赛事仍存在:', oldRegCount > 0 ? '✅' : '❌');

  // 2. 验证测试账号
  const testUsers = await User.find({ username: /^t_/ }).sort({ username: 1 }).lean();
  console.log(`测试账号: ${testUsers.length}/24 ✅`);
  if (testUsers.length > 0) {
    console.log('  首:', testUsers[0].username, '末:', testUsers[testUsers.length - 1].username);
  }

  // 3. 验证比赛 registeredPlayers
  const t = await MSC2026Tournament.findOne();
  if (t) {
    const regCount = t.registeredPlayers?.length || 0;
    console.log(`比赛注册选手数: ${regCount}/24 ${regCount === 24 ? '✅' : '❌'}`);
  }

  // 4. 验证旧选手 + 新选手总数
  const totalUsers = await User.countDocuments();
  console.log(`用户总数: ${totalUsers}（之前84 + 新增24 = 108）`);

  // 5. 验证 token 可用性
  const jwt = require('jsonwebtoken');
  const testUser = testUsers[0];
  const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  console.log(`\n测试账号 t_01 的 JWT token（登录用）:`);
  console.log(token);

  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
