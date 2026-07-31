const mongoose = require('mongoose');

const PointsTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['WELCOME', 'BET_STAKE', 'BET_PAYOUT', 'STORE_REDEMPTION', 'ADJUSTMENT', 'REFUND'],
    required: true
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, min: 0, required: true },
  referenceType: { type: String, enum: ['system', 'bet', 'market', 'redemption'], default: 'system' },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  note: { type: String, default: '' },
  idempotencyKey: { type: String, unique: true, sparse: true }
}, { timestamps: true });

PointsTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PointsTransaction', PointsTransactionSchema);
