const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, required: true, enum: ['BIND', 'LOGIN', 'RESET'] }, // 标记验证码用途
  createdAt: { type: Date, default: Date.now, expires: 600 } 
});

module.exports = mongoose.model('Otp', otpSchema);