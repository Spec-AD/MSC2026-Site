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
    regTime: { type: Date },
        
    // 1. 数字 UID (类似 osu! 的 #10025)
    uid: { type: Number, unique: true }, 

    // 2. 个人介绍 (支持 BBCode)
    bio: { type: String, default: '' },

    // 3. 头像与背景 (暂时存 URL 字符串)
    avatarUrl: { type: String, default: '/assets/logos.png' }, // 默认头像
    bannerUrl: { type: String, default: '/assets/bg.png' },    // 默认背景

    // 4. 好友列表 (存 User 的 ObjectId)
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});


module.exports = mongoose.model('User', UserSchema);

