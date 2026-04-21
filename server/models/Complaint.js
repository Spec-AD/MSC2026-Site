const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  // 投诉/反馈发起者
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 投诉类型
  type: { 
    type: String, 
    enum: ['COMMENT_REPORT', 'FAIRNESS', 'FEEDBACK', 'OTHER'], 
    required: true 
  },
  
  // 投诉标题与内容
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  // 关联目标 (可选，如举报某条评论或某个用户)
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  targetContentId: { type: String, default: '' },  // 关联内容ID (如评论ID)
  
  // 状态
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'RESOLVED', 'DISMISSED'], 
    default: 'PENDING' 
  },
  
  // 处理记录
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handlerNote: { type: String, default: '' },
  resolvedAt: { type: Date },

  // 附件截图
  attachments: [{ type: String }]  // URL 数组

}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);