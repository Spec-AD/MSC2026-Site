<<<<<<< HEAD
const mongoose = require('mongoose');

const messageFolderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxLength: 15 },
  createdAt: { type: Date, default: Date.now }
});

=======
const mongoose = require('mongoose');

const messageFolderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxLength: 15 },
  createdAt: { type: Date, default: Date.now }
});

>>>>>>> e56fccf0a8d274e3e32451f60dda3b05c8c75016
module.exports = mongoose.model('MessageFolder', messageFolderSchema);