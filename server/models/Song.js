// server/models/Song.js
const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // 乐曲 ID (水鱼的唯一标识)
  title: { type: String, required: true }, // 曲名
  type: { type: String, required: true },  // 谱面类型 (SD 或 DX)
  
  // 难度定数数组 (例如 [4.0, 7.5, 11.2, 14.6, 14.9]) 
  // 长度通常是 4 (绿,黄,红,紫) 或 5 (含白谱)
  ds: [{ type: Number }], 
  
  // 难度等级文本数组 (例如 ["4", "7", "11", "14", "14+"])
  level: [{ type: String }],
  
  // 基础信息
  basic_info: {
    artist: String,
    genre: String,
    bpm: Number,
    is_new: Boolean
  },
  
  // 记录同步时间
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);