// server/models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  // 绿色: FEATURE(建议), 黄色: PROBLEM(非代码问题), 红色: BUG(代码问题)
  type: { type: String, enum: ['FEATURE', 'PROBLEM', 'BUG'], required: true },
  
  // 黄色: PENDING, 绿色: SOLVED, 灰色: CLOSED
  status: { type: String, enum: ['PENDING', 'SOLVED', 'CLOSED'], default: 'PENDING' },
  
  // 用于计算 2小时重申 和 90天自动 Closed 的核心时间戳
  statusUpdatedAt: { type: Date, default: Date.now }
}, { timestamps: true }); // Mongoose 会自动管理 createdAt 和 updatedAt

module.exports = mongoose.model('Feedback', feedbackSchema);