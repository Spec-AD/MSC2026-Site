/**
 * 标记已迁移到新赛事系统的用户
 * 在 User 文档上加 migratedToTournament = tournamentId
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const TOURNAMENT_ID = '69f2c6ac3b94b363cf5e82b6';

async function mark() {
  await mongoose.connect(process.env.MONGO_URI);

  const r = await User.updateMany(
    { isRegistered: true, migratedToTournament: null },
    { $set: { migratedToTournament: new mongoose.Types.ObjectId(TOURNAMENT_ID) } }
  );

  console.log(`已标记: ${r.modifiedCount} 个用户`);

  // 确认
  const marked = await User.countDocuments({ migratedToTournament: { $ne: null } });
  const registered = await User.countDocuments({ isRegistered: true });
  const unmarked = await User.countDocuments({ isRegistered: true, migratedToTournament: null });
  console.log(`isRegistered 用户: ${registered}`);
  console.log(`已标记: ${marked}`);
  console.log(`未标记: ${unmarked}`);

  await mongoose.disconnect();
}
mark().catch(e => { console.error(e); process.exit(1); });
