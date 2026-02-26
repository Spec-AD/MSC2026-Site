// server/models/QualifierScore.js
const mongoose = require('mongoose');

const QualifierScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 赛事记录核心字段
  songName: { type: String, required: true },     // 比赛曲目名
  level: { type: Number, required: true },        // 难度 (0-4)
  achievement: { type: Number, required: true },  // 比赛打出的达成率
  dxScore: { type: Number, default: 0 },          // 比赛打出的 DX 分
  
  // 录入与审核信息
  entryBy: { type: String },                      // 录入该成绩的考官(ADM/TO)用户名
  entryTime: { type: Date, default: Date.now }    // 录入时间
});

module.exports = mongoose.model('QualifierScore', QualifierScoreSchema);