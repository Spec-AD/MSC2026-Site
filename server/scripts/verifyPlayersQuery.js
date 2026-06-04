/**
 * 模拟 GET /api/msc2026/players 的查询逻辑
 * 验证选手列表能正常返回
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  // 必须先加载 User 模型，否则 populate 找不到 schema
  require('../models/User');
  const MSC2026Tournament = require('../models/MSC2026Tournament');

  const t = await MSC2026Tournament.findOne()
    .populate('registeredPlayers', 'username avatarUrl')
    .lean();

  if (!t) {
    console.log('❌ 比赛文档不存在');
    process.exit(1);
  }

  console.log('=== MSC 2026 Tournament ===');
  console.log('ID:', t._id.toString());
  console.log('Status:', t.status);

  // 模拟 GET /players 的收集逻辑
  const playerSet = new Map();

  const addPlayer = (p) => {
    if (!p) return;
    const id = String(p._id || p);
    if (!playerSet.has(id)) {
      playerSet.set(id, {
        userId: id,
        username: p.username || null,
        avatarUrl: p.avatarUrl || null
      });
    }
  };

  // registeredPlayers 作为兜底
  (t.registeredPlayers || []).forEach(addPlayer);

  const players = Array.from(playerSet.values());
  
  // 按 username 排序
  players.sort((a, b) => (a.username || '').localeCompare(b.username || ''));

  console.log(`\n=== 选手列表 (${players.length} 人) ===`);
  players.forEach((p, i) => {
    console.log(`  ${i+1}. ${p.username || '?'} (${p.userId})`);
  });

  console.log('\n✅ 选手列表正常返回');

  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
