const mongoose = require('mongoose');

// 定义成绩表结构
const ScoreSchema = new mongoose.Schema({
    // 关联到具体的 User (虽然目前的榜单逻辑可能只需存昵称，但关联 ID 是好习惯)
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    
    // 冗余存储昵称，方便直接查询显示，不用查两张表
    nickname: { 
        type: String, 
        required: true 
    },
    
    // 达成率 (例如 100.5000)
    achievement: { 
        type: Number, 
        required: true 
    },
    
    // DX分数
    dxScore: { 
        type: Number, 
        required: true 
    },
    
    // 完成时间 (用于同分排名：越早越好)
    finishTime: { 
        type: Date, 
        default: Date.now 
    }
});

// 导出模型
module.exports = mongoose.model('Score', ScoreSchema);