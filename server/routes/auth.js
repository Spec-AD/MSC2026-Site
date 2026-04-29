const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const transporter = require('../config/mailer');
const { addXp, authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 认证与安全 API
// ==========================================
router.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) return res.status(400).json({ msg: '参数不完整' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ msg: '邮箱格式不正确' });

    if (type === 'BIND') {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ msg: '该邮箱已被绑定！' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.findOneAndUpdate({ email, type }, { otp: otpCode, createdAt: Date.now() }, { upsert: true, new: true });

    const actionText = type === 'BIND' ? '绑定邮箱' : type === 'UNBIND' ? '解绑邮箱' : '系统验证';
    const mailOptions = {
      from: `"PureBeat 社区" <${process.env.SMTP_USER}>`, to: email, subject: '【PureBeat】账号安全验证码',
      html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2>PureBeat Security</h2><p>您正在进行 <strong>${actionText}</strong> 操作。验证码：</p><div style="background: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0; font-size: 32px; letter-spacing: 8px;">${otpCode}</div><p style="color: red; font-size: 14px;">有效期 10 分钟。</p></div>`
    };
    await transporter.sendMail(mailOptions);
    res.json({ msg: '验证码已发送至您的邮箱' });
  } catch (err) { res.status(500).json({ msg: '发送失败' }); }
});

router.post('/api/users/settings/bind-email', authMiddleware, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await Otp.findOne({ email, otp, type: 'BIND' });
    if (!otpRecord) return res.status(400).json({ msg: '验证码错误或已失效' });
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: '该邮箱已被绑定' });

    await User.findByIdAndUpdate(req.user.id, { email });
    await Otp.findByIdAndDelete(otpRecord._id);
    res.json({ msg: '邮箱绑定成功！' });
  } catch (err) { res.status(500).json({ msg: '绑定失败' }); }
});

router.post('/api/users/settings/change-email', authMiddleware, async (req, res) => {
  try {
    const { newEmail, oldOtp, newOtp } = req.body;
    const user = await User.findById(req.user.id);
    if (!user.email) return res.status(400).json({ msg: '当前账号未绑定邮箱' });

    const oldOtpRecord = await Otp.findOne({ email: user.email, otp: oldOtp, type: 'UNBIND' });
    if (!oldOtpRecord) return res.status(400).json({ msg: '旧邮箱验证码错误' });

    const newOtpRecord = await Otp.findOne({ email: newEmail, otp: newOtp, type: 'BIND' });
    if (!newOtpRecord) return res.status(400).json({ msg: '新邮箱验证码错误' });

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) return res.status(400).json({ msg: '新邮箱已被绑定' });

    user.email = newEmail; await user.save();
    await Otp.findByIdAndDelete(oldOtpRecord._id);
    await Otp.findByIdAndDelete(newOtpRecord._id);
    res.json({ msg: '邮箱换绑成功！' });
  } catch (err) { res.status(500).json({ msg: '换绑失败' }); }
});

// ==========================================
// 注册 / 登录 / Token 验证
// ==========================================
router.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ msg: '请填写所有字段' });

    const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (existingUser) {
      if (existingUser.deletionStatus === 'DELETED') {
        const reqDate = existingUser.deletionRequestDate || new Date();
        const days = (new Date() - reqDate) / (1000 * 60 * 60 * 24);
        if (days < 180) return res.status(400).json({ msg: `注销保护期内，还需 ${Math.ceil(180 - days)} 天` });
        else await User.findByIdAndDelete(existingUser._id);
      } else {
        return res.status(400).json({ msg: '该用户名已被占用' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let randomUid;
    let uidExists = true;
    while (uidExists) {
      randomUid = Math.floor(10000 + Math.random() * 90000);
      const checkUid = await User.findOne({ uid: randomUid });
      if (!checkUid) uidExists = false;
    }

    const newUser = new User({ username, password: hashedPassword, uid: randomUid });
    const savedUser = await newUser.save();
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: savedUser._id, username: savedUser.username, isRegistered: false } });
  } catch (err) { res.status(500).json({ msg: '服务器错误' }); }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: '用户不存在' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: '密码错误' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, username: user.username, isRegistered: user.isRegistered, nickname: user.nickname, totalPf: user.totalPf || 0, divingFishUsername: user.divingFishUsername, proberUsername: user.proberUsername } });
  } catch (err) { res.status(500).json({ msg: '服务器错误' }); }
});

router.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
      .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role');
    if (!user) return res.status(404).json({ msg: '用户未找到' });
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    if (user.lastLoginDate !== today) {
      user.lastLoginDate = today; user.xp = (user.xp || 0) + 10; user.level = Math.floor(user.xp / 300) + 1;
      await user.save();
    }
    res.json(user);
  } catch (err) { res.status(500).json({ msg: '服务器错误' }); }
});

module.exports = router;
