const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- 账户基本信息 ---
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // --- 比赛报名信息 ---
    isRegistered: { type: Boolean, default: false },
    
    // 参赛昵称
    nickname: { type: String, default: '' },
    
    // 联系方式 (修改处：拆分为类型和值)
    contactType: { 
        type: String, 
        enum: ['QQ', 'Phone', 'Email'], 
        default: 'QQ' 
    },
    contactValue: { type: String, default: '' },
    
    // 奖品期望
    prizeWish: { type: String, default: '' },
    
    // 出场介绍
    intro: { type: String, default: '' },
    
    // 报名提交时间
    regTime: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);