const mongoose = require('mongoose');

// 1. 已完成的对局记录 (用于计算玩家总 OV 和全球排位)
const GameRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalOv: { type: Number, required: true }, // 本局最终得分
  mods: [{ type: String }],
  isFullCombo: { type: Boolean, default: false }, // 是否 5 首全部主动猜中
  songs: [{
    songId: String,
    title: String,
    baseOv: Number,
    actualOv: Number,
    revealRatio: Number,
    mistakes: Number,
    isCleared: Boolean
  }],
  createdAt: { type: Date, default: Date.now }
});

// 2. 活跃的对局会话 (核心防作弊存储)
const ActiveSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameType: { type: String, required: true }, // 例如 'arcaea'
  mods: [{ type: String }],
  openedChars: [{ type: String }], // 全局已开出的字符集合
  expireAt: { type: Date, required: true }, // 核心计时器 (前端倒计时的基准)
  songs: [{
    songId: String,
    realTitle: String, // 真实歌名 (绝对不可发给前端！)
    baseOv: Number,
    mistakes: { type: Number, default: 0 },
    status: { type: String, enum: ['PLAYING', 'CLEARED', 'DEAD'], default: 'PLAYING' },
    actualOv: { type: Number, default: 0 }, // 如果 CLEARED，记录得分
    hasKana: { type: Boolean, default: false },
    hasKanji: { type: Boolean, default: false },
    hasSym: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now, expires: 3600 } // TTL 索引: 1小时后自动销毁掉线的残局
});

const GameRecord = mongoose.model('GameRecord', GameRecordSchema);
const ActiveSession = mongoose.model('ActiveSession', ActiveSessionSchema);

module.exports = { GameRecord, ActiveSession };