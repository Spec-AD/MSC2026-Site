const mongoose = require('mongoose');

const PointsRedemptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointsStoreProduct', required: true },
  productSnapshot: {
    name: { type: String, required: true },
    cost: { type: Number, required: true }
  },
  publicToken: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['issued', 'redeemed', 'cancelled'], default: 'issued' },
  redeemedAt: { type: Date, default: null },
  redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('PointsRedemption', PointsRedemptionSchema);
