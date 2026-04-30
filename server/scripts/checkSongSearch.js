/**
 * 检查曲库集合的数据情况
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  // 验证各模型是否存在
  const models = {};
  try { models.Song = require('../models/Song'); } catch(e) { console.log('Song model load error:', e.message); }
  try { models.ChunithmSong = require('../models/ChunithmSong'); } catch(e) { console.log('ChunithmSong model error:', e.message); }
  try { models.ArcaeaSong = require('../models/ArcaeaSong'); } catch(e) { console.log('ArcaeaSong model error:', e.message); }

  for (const [name, Model] of Object.entries(models)) {
    const count = await Model.countDocuments();
    console.log(`\n${name}: ${count} documents`);
    
    if (count > 0) {
      const sample = await Model.findOne().lean();
      console.log('  Fields:', Object.keys(sample));
      // 检查 title 字段
      if (sample.title) console.log('  title example:', String(sample.title).substring(0, 40));
      if (sample.basic_info) console.log('  basic_info:', JSON.stringify(sample.basic_info).substring(0, 80));
      if (sample.aliases) console.log('  aliases:', JSON.stringify(sample.aliases).substring(0, 80));
    }

    // 测试实际搜索
    if (count > 0) {
      const testQuery = 'test';
      const regex = new RegExp(testQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      
      if (name === 'Song') {
        const results = await Model.find({ title: regex }).limit(5).lean();
        console.log(`  Search '${testQuery}' by title: ${results.length} results`);
        if (results.length > 0) console.log('  First:', results[0].title);
      } else if (name === 'ChunithmSong') {
        const results = await Model.find({ $or: [{ title: regex }, { 'basic_info.title': regex }] }).limit(5).lean();
        console.log(`  Search '${testQuery}' by title/basic_info.title: ${results.length} results`);
        if (results.length > 0) console.log('  First:', results[0].title || results[0].basic_info?.title);
      } else if (name === 'ArcaeaSong') {
        const results = await Model.find({ $or: [{ title: regex }, { aliases: regex }] }).limit(5).lean();
        console.log(`  Search '${testQuery}' by title/aliases: ${results.length} results`);
        if (results.length > 0) console.log('  First:', results[0].title);
      }
    }
  }

  await mongoose.disconnect();
}
check().catch(e => { console.error('Error:', e); process.exit(1); });
