const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // ID 本身就是唯一的！
  title: { type: String, required: true },
  type: { type: String, required: true },
  ds: [{ type: Number }],
  level: [{ type: String }],
  basic_info: {
    artist: String,
    genre: String,
    bpm: Number,
    is_new: Boolean
  },
  // 🔥 终极防丢手段：显式声明物量字段为混合类型，强迫 MongoDB 接收所有音符数据
  charts: { type: mongoose.Schema.Types.Mixed }, 
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);