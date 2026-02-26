const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 满足旧校验器的必填字段 (如果之前有的话)
    imageUrl: { type: String },
    achievementRate: { type: Number },
    nickname: { type: String },

    // 🔥 前端真正需要的核心渲染字段
    songId: { type: Number },         // 曲目 ID (用于加载封面)
    songName: { type: String },       // 曲名
    level: { type: Number },          // 难度 (0=绿, 1=黄, 2=红, 3=紫, 4=白)
    achievement: { type: Number },    // 达成率 (如 100.5000)
    dxScore: { type: Number },        // DX 分数
    rating: { type: Number },         // 单曲底分(ra)
    fc: { type: String, default: '' },

    // 🔥 PF 战力专属系统字段
    pf: { type: Number, default: 0 },         // Performance 战力
    dxRatio: { type: Number, default: 0 },    // DX 分数占比 (0~1)
    constant: { type: Number, default: 0 },   // 定数 (如 14.9)
    
    finishTime: { type: Date, default: Date.now }
}, { strict: false }); // strict: false 允许兼容未来可能增加的新字段

module.exports = mongoose.model('Score', scoreSchema);