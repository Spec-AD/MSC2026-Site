/**
 * 修正 MSC 2026 赛事字段：registrationEnd 和 tags
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);

  const r = await Tournament.updateOne(
    { title: 'MSC 2026' },
    {
      $set: {
        registrationEnd: new Date('2026-07-01T23:59:59Z'),
        tags: ['msc', 'official', '2026'],
      },
    }
  );

  console.log(`匹配: ${r.matchedCount}, 修改: ${r.modifiedCount}`);

  const t = await Tournament.findOne({ title: 'MSC 2026' }).lean();
  console.log('regEnd:', t.registrationEnd);
  console.log('tags:', t.tags);
  console.log('status:', t.status);

  await mongoose.disconnect();
}
fix().catch(e => { console.error(e); process.exit(1); });
