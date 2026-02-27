const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- 账户基本信息 ---
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    proberUsername: { type: String, default: '' },
    sponsorTier: { type: Number, default: 0 }, // 0: 普通用户, 1: 赞助一档, 2: 赞助二档
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 已添加的好友
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    importToken: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },         // 总经验值
    level: { type: Number, default: 1 },      // 当前等级 (登塔层数)
    lastLoginDate: { type: String, default: '' },   // 上次每日登录加经验的日期
    lastCheckInDate: { type: String, default: '' }, // 上次主动点击签到的日期
    checkInCount: { type: Number, default: 0 },          // 累计签到天数
    wikiApprovedCount: { type: Number, default: 0 },     // 维基审核通过数
    feedbackApprovedCount: { type: Number, default: 0 }, // 反馈采纳数
    lastWikiReadDate: { type: String, default: '' }, // 记录每日阅读维基的日期
    osuId: { type: Number, default: null },           // osu! 官方的用户 ID
    osuUsername: { type: String, default: '' },       // osu! 玩家名
    osuAvatarUrl: { type: String, default: '' },      // osu! 头像链接
    // --- 比赛报名信息 ---
    isRegistered: { type: Boolean, default: false },
    isB50Visible: { type: Boolean, default: false },
    divingFishUsername: { 
       type: String, 
       default: '' 
    },
    totalPf: { 
       type: Number, 
       default: 0 
    }, // 记录 Top 50 的 PF 总和
    
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

    // 新增：荣誉陈列架（只存图片 URL 的数组）
    honors: [{ 
        type: String 
    }],

    role: { 
        type: String, 
        enum: ['user', 'ADM', 'TO', 'DS'], // 限制只能填这四个值
        default: 'user' // 默认注册的都是普通玩家
    },

    // 3. 头像与背景 (暂时存 URL 字符串)
    avatarUrl: { type: String, default: '/assets/logos.png' }, // 默认头像
    bannerUrl: { type: String, default: '/assets/bg.png' },    // 默认背景

    // 4. 好友列表 (存 User 的 ObjectId)
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('User', UserSchema);