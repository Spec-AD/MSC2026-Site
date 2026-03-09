const mongoose = require('mongoose');

// 🔥 核心：关闭 strict 模式，允许外部数据原封不动写入，防范字段丢失
const arcaeaSongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  aliases: { type: [String], default: [] }
}, { strict: false }); 

module.exports = mongoose.model('ArcaeaSong', arcaeaSongSchema);