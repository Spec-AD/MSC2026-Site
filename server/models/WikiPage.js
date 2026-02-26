const mongoose = require('mongoose');

const wikiPageSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  }, // 文章的唯一 URL 标识，例如 "ppf-algorithm"
  category: { 
    type: String, 
    required: true,
    enum: ['SYSTEM', 'GUIDE', 'TOURNAMENT', 'COMMUNITY', 'ARCHIVE'], // 预设几个大类
    default: 'COMMUNITY'
  },
  content: { 
    type: String, 
    required: true 
  }, // 支持 BBCode 的正文内容
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, // 词条创建者
  lastEditedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }, // 最后修改者
  views: { 
    type: Number, 
    default: 0 
  }, // 浏览量
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'], 
    default: 'PENDING' 
  }, // 🔥 核心：审核状态（普通玩家提交默认为 PENDING）
  rejectReason: { 
    type: String, 
    default: '' 
  } // 如果被打回，ADM填写的退回理由
}, { timestamps: true });

module.exports = mongoose.model('WikiPage', wikiPageSchema);