const mongoose = require('mongoose');

const OsuScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, required: true },
  beatmapId: { type: Number },
  title: { type: String },         // 曲名
  version: { type: String },       // 难度名 (如 Extra)
  accuracy: { type: Number },      // 准确率 (如 99.50)
  mods: { type: [String] },        // 开启的 Mod (如 HD, DT)
  pp: { type: Number },            // 获得的 PP
  grade: { type: String },         // 评级 (SS, S, A, B...)
  coverUrl: { type: String },      // 曲绘链接
  playedAt: { type: Date },        // 游玩时间
  // b1.7 新增字段 — 成绩详情
  maxCombo:  { type: Number, default: null },
  combo:     { type: Number, default: null },
  count300:  { type: Number, default: null },
  count100:  { type: Number, default: null },
  count50:   { type: Number, default: null },
  countMiss: { type: Number, default: null },
  // b1.7 新增字段 — 总分与曲目状态
  score:         { type: Number, default: 0 },
  beatmapStatus: { type: String, default: '' }
});

// b1.7 复合索引 — best / BP 200 查询
OsuScoreSchema.index({ userId: 1, mode: 1, pp: -1 });
// b1.7 复合索引 — pass / recent 查询
OsuScoreSchema.index({ userId: 1, mode: 1, playedAt: -1 });
// b1.7 复合索引 — score 查询
OsuScoreSchema.index({ userId: 1, beatmapId: 1 });

module.exports = mongoose.model('OsuScore', OsuScoreSchema);
