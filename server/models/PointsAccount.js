const mongoose = require('mongoose');

const PointsAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  balance: { type: Number, min: 0, default: 5000 },
  lifetimeEarned: { type: Number, min: 0, default: 5000 },
  lifetimeSpent: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PointsAccount', PointsAccountSchema);
