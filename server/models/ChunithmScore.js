const mongoose = require('mongoose');

const chunithmScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  songId: { type: Number, required: true },
  songName: { type: String, required: true },
  imageUrl: { type: String }, // 封面图
  
  // 中二独有数据结构
  level: { type: Number, required: true }, // 0:BAS, 1:ADV, 2:EXP, 3:MAS, 4:ULT, 5:WE
  constant: { type: Number, required: true }, // 谱面定数
  score: { type: Number, required: true }, // 最高 1010000
  rating: { type: Number, default: 0 }, // 单曲 Rating (Rating Value)
  
  // 状态标识
  rank: { type: String, default: '' }, // SSS+, SSS, SS+, 等
  clearStatus: { type: String, default: '' }, // Clear, Hard, Absolute, Absolute+
  fcStatus: { type: String, default: '' }, // FC, AJ, AJC
  
  isNew: { type: Boolean, default: false }, // 是否为当前版本新曲 (中二也有类似区分)
  finishTime: { type: Date, default: Date.now }
});

// 建立复合索引以提升查询性能
chunithmScoreSchema.index({ userId: 1, songId: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('ChunithmScore', chunithmScoreSchema);