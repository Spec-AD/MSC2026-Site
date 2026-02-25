// server/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 可为空，代表系统自动发送
  type: { type: String, enum: ['SYSTEM', 'ADM_DIRECT', 'FRIEND_REQUEST'], default: 'SYSTEM' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  
  // 专门用来存额外数据，比如好友请求发送者的 ID，方便后续点“同意”时调接口
  actionData: { type: Object } 
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);