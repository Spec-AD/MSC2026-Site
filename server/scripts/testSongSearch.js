/**
 * 测试歌曲搜索，模拟实际 API 逻辑
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Song = require('../models/Song');
const ChunithmSong = require('../models/ChunithmSong');
const ArcaeaSong = require('../models/ArcaeaSong');

const testQueries = ['world', 'test', 'maimai', 'a', '1', 'true'];

async function test() {
  await mongoose.connect(process.env.MONGO_URI);

  for (const q of testQueries) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [maimai, chuni, arcaea] = await Promise.all([
      Song.find({ title: regex }).select('title type ds level basic_info.artist basic_info.genre').limit(30).lean(),
      ChunithmSong.find({ $or: [{ title: regex }, { 'basic_info.title': regex }] })
        .select('title ds level basic_info.artist basic_info.genre').limit(30).lean(),
      ArcaeaSong.find({ $or: [{ title: regex }, { aliases: regex }] })
        .select('title id aliases').limit(30).lean(),
    ]);

    console.log(`q="${q}": maimai=${maimai.length}, chuni=${chuni.length}, arcaea=${arcaea.length}`);
    if (maimai.length > 0) console.log('  maimai第一首:', maimai[0].title);
    if (chuni.length > 0) console.log('  chuni第一首:', chuni[0].title || chuni[0].basic_info?.title);
    if (arcaea.length > 0) console.log('  arcaea第一首:', arcaea[0].title);
  }

  await mongoose.disconnect();
}
test().catch(e => { console.error(e); process.exit(1); });
