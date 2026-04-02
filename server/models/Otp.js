<<<<<<< HEAD
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  // 👇 增加了 'UNBIND' 用于旧邮箱解绑验证
  type: { type: String, required: true, enum: ['BIND', 'UNBIND', 'LOGIN', 'RESET'] }, 
  createdAt: { type: Date, default: Date.now, expires: 600 } 
});

=======
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  // 👇 增加了 'UNBIND' 用于旧邮箱解绑验证
  type: { type: String, required: true, enum: ['BIND', 'UNBIND', 'LOGIN', 'RESET'] }, 
  createdAt: { type: Date, default: Date.now, expires: 600 } 
});

>>>>>>> e56fccf0a8d274e3e32451f60dda3b05c8c75016
module.exports = mongoose.model('Otp', otpSchema);