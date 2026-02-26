const mongoose = require('mongoose');

const wikiCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  }, // 类别名称，如 "Maimai 机制", "赛事规程"
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  }, // 类别 URL 标识，如 "maimai-mechanics"
  description: { 
    type: String,
    default: ''
  }, // 类别描述
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'WikiCategory', 
    default: null 
  }, // 🔥 核心：父级类别 ID。如果为 null，说明是一级分类
  icon: {
    type: String,
    default: 'FaFolder' // 可以让管理员指定前台图标名称
  },
  color: {
    type: String,
    default: 'text-cyan-400' // 类别的主题色
  }
}, { timestamps: true });

module.exports = mongoose.model('WikiCategory', wikiCategorySchema);