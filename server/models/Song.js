const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // ID 本身就是唯一的！
  title: { type: String, required: true },
  type: { type: String, required: true },
  ds: [{ type: Number }],
  level: [{ type: String }],
  aliases: { type: [String], default: [] },
  basic_info: {
    artist: String,
    genre: String,
    bpm: Number,
    is_new: Boolean,
    from: String
  },
  // 🔥 终极防丢手段：显式声明物量字段为混合类型，强迫 MongoDB 接收所有音符数据
  charts: { type: mongoose.Schema.Types.Mixed }, 

  // ==========================================
  // 🌟 五维雷达图系统
  // ==========================================
  // radarStats[diffIndex] = { stamina, star, stable, accuracy, potential }
  // 每个维度 0.0 ~ 10.0，精确到 1 位小数
  // 由管理员手动设置，作为贝叶斯平滑的 Base 锚点
  radarStats: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 玩家投票池：存放每个难度每个玩家的投票记录
  // radarVotes[diffIndex] = [ { userId, weight, values: {stamina, star, stable, accuracy, potential}, createdAt } ]
  radarVotes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);