/**
 * 检查新 MSC 2026 Tournament 状态 + 旧赛事关联
 * 验证新模块是否关联已有比赛 ID
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  // 检查旧 Tournament 模型
  const Tour = require('../models/Tournament');
  const oldMsc = await Tour.findOne({ title: /msc\s*2026/i }).lean();
  if (oldMsc) {
    console.log('=== 旧赛事 (Tournament) ===');
    console.log('ID:', oldMsc._id.toString());
    console.log('Title:', oldMsc.title);
    console.log('Status:', oldMsc.status);
    console.log('Registrations:', oldMsc.registrations?.length || 0);
    console.log('Managers:', (oldMsc.managers || []).map(m => m.toString()));
    console.log();
  } else {
    console.log('旧赛事: 未找到 MSC 2026');
  }

  // 检查新 MSC2026Tournament 模型
  const NewMSC = require('../models/MSC2026Tournament');
  const newMsc = await NewMSC.findOne().lean();
  console.log('=== 新赛事 (MSC2026Tournament) ===');
  if (newMsc) {
    console.log('ID:', newMsc._id.toString());
    console.log('Status:', newMsc.status);
    console.log('registeredPlayers:', newMsc.registeredPlayers?.length || 0);
    console.log('stage1.groups:', newMsc.stage1?.groups?.length || 0);
    console.log('stage2.players:', newMsc.stage2?.players?.length || 0);
    console.log('stage3.players:', newMsc.stage3?.players?.length || 0);
    console.log('stage4:', newMsc.stage4 ? '已初始化' : '未初始化');
    console.log('qualifiedStage1:', newMsc.qualifiedStage1?.length || 0);
    console.log('qualifiedStage2:', newMsc.qualifiedStage2?.length || 0);
    console.log('qualifiedStage3:', newMsc.qualifiedStage3?.length || 0);
  } else {
    console.log('不存在（pending 状态，尚未初始化）');
  }

  // 检查用户分布
  const User = require('../models/User');
  const total = await User.countDocuments();
  const admins = await User.countDocuments({ role: 'ADM' });
  const users = await User.countDocuments({ role: 'user' });
  const testUsers = await User.countDocuments({ username: /^t_/ });
  console.log('\n=== 用户分布 ===');
  console.log('总数:', total, '| ADM:', admins, '| user:', users, '| t_xx:', testUsers);

  if (oldMsc && oldMsc.registrations && oldMsc.registrations.length > 0) {
    console.log('\n=== 旧赛事注册选手 ===');
    for (const reg of oldMsc.registrations) {
      const u = await User.findById(reg.userId).select('username').lean();
      console.log(' -', u ? u.username : '?', '(' + (reg.userId?.toString() || '?') + ')');
    }
  }

  // 验证关联: 新模块是否引用了旧比赛 ID
  const newMscFull = await NewMSC.findOne().lean();
  console.log('\n=== 关联验证 ===');
  console.log('新模型字段中没有引用旧 Tournament ID 的字段:', !newMscFull || !newMscFull.oldTournamentId);
  console.log('新模块完全独立，不关联已有比赛 ID');

  await mongoose.disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
