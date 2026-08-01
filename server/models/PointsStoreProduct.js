const mongoose = require('mongoose');

const PointsStoreProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 2000 },
  imageUrl: { type: String, default: '', maxlength: 2048 },
  cost: { type: Number, min: 1, required: true },
  stock: { type: Number, min: 0, max: 1000000, default: 0 },
  active: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PointsStoreProduct', PointsStoreProductSchema);
