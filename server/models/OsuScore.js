const mongoose = require('mongoose');

const OsuScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  beatmapId: { type: Number },
  title: { type: String },         // 曲名
  version: { type: String },       // 难度名 (如 Extra)
  accuracy: { type: Number },      // 准确率 (如 99.50)
  mods: { type: [String] },        // 开启的 Mod (如 HD, DT)
  pp: { type: Number },            // 获得的 PP
  grade: { type: String },         // 评级 (SS, S, A, B...)
  coverUrl: { type: String },      // 曲绘链接
  playedAt: { type: Date }         // 游玩时间
});

module.exports = mongoose.model('OsuScore', OsuScoreSchema);