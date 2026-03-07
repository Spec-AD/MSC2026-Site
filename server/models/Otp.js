const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  // 👇 增加了 'UNBIND' 用于旧邮箱解绑验证
  type: { type: String, required: true, enum: ['BIND', 'UNBIND', 'LOGIN', 'RESET'] }, 
  createdAt: { type: Date, default: Date.now, expires: 600 } 
});

module.exports = mongoose.model('Otp', otpSchema);