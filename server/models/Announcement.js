// server/models/Announcement.js
const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true, default: 'NEWS' }, // 如 TOURNAMENT, SYSTEM, NEWS
  content: { type: String, required: true }, // 存放 BBCode
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);