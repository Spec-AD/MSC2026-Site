const mongoose = require('mongoose');

const dailySongSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, unique: true }, // 日期标识，格式: "YYYY-MM-DD"
  title: { type: String, required: true },                 // 曲名
  artist: { type: String, required: true },                // 曲师/歌手
  source: { type: String, required: true },                // 出处 (如: "Arcaea", "Vocaloid", "POPS & Anime")
  coverUrl: { type: String, required: true }               // 封面图链接 (可以填网图链接)
});

module.exports = mongoose.model('DailySong', dailySongSchema);