const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },    //  新增：用于首页列表的简短说明
  type: { type: String, default: 'NEWS' },
  content: { type: String, required: true },
  coverUrl: { type: String },    // 新增：这是横幅画面路径
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);