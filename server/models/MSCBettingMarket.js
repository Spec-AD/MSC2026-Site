const mongoose = require('mongoose');

const MSCBettingMarketSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MSC2026Tournament', required: true, index: true },
  stage: { type: String, enum: ['stage1', 'stage4'], required: true },
  matchKey: { type: String, required: true },
  generation: { type: Number, min: 1, default: 1 },
  groupIndex: { type: Number, default: null },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    pool: { type: Number, min: 0, default: 0 },
    betCount: { type: Number, min: 0, default: 0 }
  }],
  minimumStake: { type: Number, required: true },
  opensAt: { type: Date, required: true },
  closesAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['scheduled', 'open', 'locked', 'settled', 'void'], default: 'scheduled' },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  totalPool: { type: Number, min: 0, default: 0 },
  payoutPool: { type: Number, min: 0, default: 0 },
  settledAt: { type: Date, default: null }
}, { timestamps: true });

MSCBettingMarketSchema.index({ tournamentId: 1, stage: 1, matchKey: 1, generation: 1 }, { unique: true });

module.exports = mongoose.model('MSCBettingMarket', MSCBettingMarketSchema);
