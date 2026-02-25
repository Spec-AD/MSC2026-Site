const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const feedbackSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  type: { type: String, enum: ['FEATURE', 'PROBLEM', 'BUG'], required: true },
  status: { type: String, enum: ['PENDING', 'SOLVED', 'CLOSED'], default: 'PENDING' },
  statusUpdatedAt: { type: Date, default: Date.now },
  
  // 新增：置顶功能
  isPinned: { type: Boolean, default: false },
  
  // 新增：回复列表
  replies: [replySchema]
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);