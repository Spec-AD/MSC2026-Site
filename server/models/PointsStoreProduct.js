const mongoose = require('mongoose');

const PointsStoreProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  cost: { type: Number, min: 1, required: true },
  stock: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PointsStoreProduct', PointsStoreProductSchema);
