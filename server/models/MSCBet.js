const mongoose = require('mongoose');

const MSCBetSchema = new mongoose.Schema({
  marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'MSCBettingMarket', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  selectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stake: { type: Number, min: 1, required: true },
  status: { type: String, enum: ['placed', 'won', 'lost', 'refunded'], default: 'placed' },
  payout: { type: Number, min: 0, default: 0 },
  settledAt: { type: Date, default: null }
}, { timestamps: true });

MSCBetSchema.index({ marketId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MSCBet', MSCBetSchema);
