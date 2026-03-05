const mongoose = require('mongoose');

const messageFolderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxLength: 15 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MessageFolder', messageFolderSchema);