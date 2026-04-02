<<<<<<< HEAD
const mongoose = require('mongoose');

// 🔥 核心：关闭 strict 模式，允许外部数据原封不动写入，防范字段丢失
const arcaeaSongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  aliases: { type: [String], default: [] }
}, { strict: false }); 

=======
const mongoose = require('mongoose');

// 🔥 核心：关闭 strict 模式，允许外部数据原封不动写入，防范字段丢失
const arcaeaSongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  aliases: { type: [String], default: [] }
}, { strict: false }); 

>>>>>>> e56fccf0a8d274e3e32451f60dda3b05c8c75016
module.exports = mongoose.model('ArcaeaSong', arcaeaSongSchema);