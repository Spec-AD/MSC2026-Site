/**
 * 迁移脚本：关联旧 Tournament → MSC2026Tournament
 * 一次性执行。已在 Atlas 确认旧赛事存在。
 *
 * 用法: node scripts/migrate-msc2026-link-old.js
 */
const mongoose = require('mongoose');
const Tournament = require('../server/models/Tournament');
const MSC2026Tournament = require('../server/models/MSC2026Tournament');

const OLD_TOURNAMENT_ID = '69f2c6ac3b94b363cf5e82b6';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('已连接数据库');

  const oldT = await Tournament.findById(OLD_TOURNAMENT_ID);
  if (!oldT) throw new Error(`旧赛事 ${OLD_TOURNAMENT_ID} 未找到`);

  console.log(`旧赛事: ${oldT.title} | status=${oldT.status} | registrations=${oldT.registrations?.length || 0}`);

  let msc = await MSC2026Tournament.findOne();
  if (!msc) {
    msc = new MSC2026Tournament({ status: 'pending' });
    console.log('创建新 MSC2026Tournament 文档');
  } else {
    console.log(`MSC2026Tournament 已存在: status=${msc.status}`);
  }

  msc.oldTournamentId = oldT._id;
  msc.registeredPlayers = [];
  await msc.save();

  console.log('✅ 迁移完成：已关联旧赛事，废弃 registeredPlayers');
  await mongoose.disconnect();
}

migrate().then(() => process.exit(0)).catch(e => { console.error('❌', e); process.exit(1); });
