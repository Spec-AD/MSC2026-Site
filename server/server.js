const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const Announcement = require('./models/Announcement'); 
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');
const Song = require('./models/Song');
const { calculatePF } = require('./utils/pfCalculator');
const Feedback = require('./models/Feedback');
const Message = require('./models/Message');
const QualifierScore = require('./models/QualifierScore');
const WikiPage = require('./models/WikiPage');
const WikiCategory = require('./models/WikiCategory'); 
const OsuScore = require('./models/OsuScore');
const MessageFolder = require('./models/MessageFolder');
const ChunithmScore = require('./models/ChunithmScore');
const ChunithmSong = require('./models/ChunithmSong');
const nodemailer = require('nodemailer');
const Otp = require('./models/Otp');
const DailySong = require('./models/DailySong');
const ArcaeaSong = require('./models/ArcaeaSong');

// ==========================================
// CHUNITHM 单曲 Rating 算分引擎
// ==========================================
const calculateChuniRating = (score, constant) => {
  if (score >= 1009000) return constant + 2.15;
  if (score >= 1007500) return constant + 2.0 + (score - 1007500) * 0.15 / 1500;
  if (score >= 1005000) return constant + 1.5 + (score - 1005000) * 0.5 / 2500;
  if (score >= 1000000) return constant + 1.0 + (score - 1000000) * 0.5 / 5000;
  if (score >= 975000) return constant + 0.0 + (score - 975000) * 1.0 / 25000;
  if (score >= 925000) return constant - 3.0 + (score - 925000) * 3.0 / 50000;
  if (score >= 900000) return constant - 5.0 + (score - 900000) * 2.0 / 25000;
  if (score >= 800000) return (constant - 5.0) / 2 + (score - 800000) * ((constant - 5.0) / 2) / 100000;
  return 0;
};

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'msc2026_profiles', 
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1000, crop: 'limit' }] 
  }
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, 
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const upload = multer({ storage: storage });

process.on('uncaughtException', (err) => { console.error('🔥 致命错误:', err); });
process.on('unhandledRejection', (reason, promise) => { console.error('🔥 未处理的 Promise 拒绝:', reason); });

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Score = require('./models/Score');
const app = express();

app.use(cors());
app.use(express.json()); 

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => { console.error('❌ MongoDB Connection Error:', err); process.exit(1); });

const addXp = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    user.xp = (user.xp || 0) + amount;
    user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
  } catch (err) {}
};

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: '无权限，请先登录' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (e) { res.status(401).json({ msg: 'Token 无效或已过期' }); }
};

const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) { try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch (e) {} }
    next();
};

// ==========================================
// 🌟 v1.6.0 Arcaea 全量曲库系统 API
// ==========================================

// 1. 前端获取本地 Arcaea 曲库
app.get('/api/arcaea-songs', async (req, res) => {
  try {
    const songs = await ArcaeaSong.find({}).lean();
    res.json(songs);
  } catch (err) {
    console.error('获取 Arcaea 曲库失败:', err);
    res.status(500).json({ msg: '获取 Arcaea 曲库失败' });
  }
});

// 2. [管理员] 从远端源同步 Arcaea 曲库
app.post('/api/admin/sync-arcaea', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });

    // 使用 Estertion 提供的公开解析源获取最新 songlist
    const response = await axios.get('https://arcapi.estertion.win/songlist', {
      headers: { 'Accept-Encoding': 'gzip, deflate' }
    });

    const songData = response.data.songs;
    if (!songData || !Array.isArray(songData)) {
      return res.status(500).json({ msg: '远端数据格式异常' });
    }

    let bulkOps = songData.map(song => ({
      updateOne: {
        filter: { id: song.id },
        update: { $set: song },
        upsert: true
      }
    }));

    await ArcaeaSong.bulkWrite(bulkOps);
    res.json({ msg: `成功同步 ${bulkOps.length} 首 Arcaea 曲目！` });
  } catch (err) {
    console.error('同步 Arcaea 曲目失败:', err);
    res.status(500).json({ msg: '同步失败，请检查网络或远端源状态' });
  }
});

// ==========================================
// 🌟 v1.4.0 泛音乐每日推荐引擎 (凌晨4点刷新)
// ==========================================
app.get('/api/daily-song', async (req, res) => {
  try {
    // 1. 计算凌晨 4 点偏移的 Date Key
    const now = new Date();
    const offsetMs = now.getTime() - (4 * 60 * 60 * 1000);
    const offsetDate = new Date(offsetMs);
    
    // 格式化出 YYYY-MM-DD
    const dateKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, '0')}-${String(offsetDate.getDate()).padStart(2, '0')}`;

    // 2. 去独立库中查找录入的今日推荐
    const dailyRecord = await DailySong.findOne({ dateKey });
    
    if (!dailyRecord) {
      // 如果你某天忘记录入了，给一个优美的占位兜底，防止前端空白
      return res.json({
        title: "今天正在精挑细选...",
        artist: "System",
        source: "PureBeat",
        coverUrl: "/assets/logos.png"
      });
    }

    res.json(dailyRecord);
  } catch (err) {
    console.error('获取每日推荐失败:', err);
    res.status(500).json({ msg: '获取每日推荐失败' });
  }
});

// ==========================================
// 🌟 获取每日推荐曲目历史列表 (防剧透版)
// ==========================================
app.get('/api/daily-song/history', async (req, res) => {
  try {
    const now = new Date();
    const offsetMs = now.getTime() - (4 * 60 * 60 * 1000);
    const offsetDate = new Date(offsetMs);
    const todayKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, '0')}-${String(offsetDate.getDate()).padStart(2, '0')}`;

    const history = await DailySong.find({ dateKey: { $lte: todayKey } })
      .sort({ dateKey: -1 })
      .limit(50);

    res.json(history);
  } catch (err) {
    console.error('获取历史推荐失败:', err);
    res.status(500).json({ msg: '获取历史推荐失败' });
  }
});

// ==========================================
// 🌟 v1.5.3 别名自动同步引擎 (自动兼容解析)
// ==========================================
// ==========================================
// 🌟 v1.5.3 别名自动同步引擎 (加入高可用抗抖动与重试机制)
// ==========================================
const syncAliasesTask = async () => {
  console.log('🔄 [v1.5.3] 开始自动同步曲目别名库...');
  
  let response;
  let success = false;
  const maxRetries = 3; // 最大重试 3 次

  // 1. 发起带重试机制的网络请求
  for (let i = 0; i < maxRetries; i++) {
    try {
      response = await axios.get('http://114.66.10.76:5000/GetAliasFile', { 
        responseType: 'text',
        timeout: 120000, // 🔥 提升到 120 秒，给对方小水管充足的时间
        headers: { 'Accept-Encoding': 'gzip, deflate, br' } 
      });
      success = true;
      break; // 如果成功拿到数据，直接跳出循环
    } catch (err) {
      console.warn(`⚠️ 第 ${i + 1} 次尝试拉取别名失败: ${err.message}`);
      if (i < maxRetries - 1) {
        console.log(`⏳ 等待 5 秒后进行第 ${i + 2} 次重试...`);
        // 阻塞等待 5 秒
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // 如果 3 次全部失败，则终止本次同步
  if (!success) {
    console.error('❌ [v1.5.3] 别名同步最终失败：网络持续不稳定，已达到最大重试次数。下次定时任务再试。');
    return;
  }

  // 2. 解析与入库逻辑
  try {
    let aliasData;
    try {
      aliasData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } catch (e) {
      console.error('❌ 解析别名文件失败，可能下载的数据不完整或不是标准的 JSON 格式');
      return;
    }

    let bulkOps = [];
    
    // 兼容解析 1：字典格式 { "833": ["皇帝", "农夫山泉"], ... }
    if (typeof aliasData === 'object' && !Array.isArray(aliasData)) {
      for (const [songId, aliases] of Object.entries(aliasData)) {
        bulkOps.push({
          updateOne: {
            filter: { id: String(songId) },
            update: { $set: { aliases: Array.isArray(aliases) ? aliases : [aliases] } }
          }
        });
      }
    } 
    // 兼容解析 2：数组格式 [ { SongID: 833, Alias: ["..."] } ]
    else if (Array.isArray(aliasData)) {
      aliasData.forEach(item => {
        const sId = item.SongID || item.songId || item.id;
        const aliases = item.Alias || item.aliases || item.alias;
        if (sId && aliases) {
          bulkOps.push({
            updateOne: {
              filter: { id: String(sId) },
              update: { $set: { aliases: Array.isArray(aliases) ? aliases : [aliases] } }
            }
          });
        }
      });
    }

    if (bulkOps.length > 0) {
      await Song.bulkWrite(bulkOps);
      console.log(`✅ [v1.5.3] 别名库同步完成！共为 ${bulkOps.length} 首曲目挂载了别名。`);
    } else {
      console.log('⚠️ 别名库解析为空，请检查文件格式。');
    }
  } catch (err) {
    console.error('❌ [v1.5.3] 同步别名时数据库操作失败:', err.message);
  }
};

// 启动服务器后，延迟 5 秒执行一次全量拉取
setTimeout(syncAliasesTask, 5000);
// 之后每隔 12 小时自动同步一次
setInterval(syncAliasesTask, 12 * 60 * 60 * 1000);

// ==========================================
// 认证与安全 API
// ==========================================
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) return res.status(400).json({ msg: '参数不完整' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ msg: '邮箱格式不正确' });

    if (type === 'BIND') {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ msg: '该邮箱已被绑定！' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.findOneAndUpdate( { email, type }, { otp: otpCode, createdAt: Date.now() }, { upsert: true, new: true } );

    const actionText = type === 'BIND' ? '绑定邮箱' : type === 'UNBIND' ? '解绑邮箱' : '系统验证';
    const mailOptions = {
      from: `"PureBeat 社区" <${process.env.SMTP_USER}>`, to: email, subject: '【PureBeat】账号安全验证码',
      html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2>PureBeat Security</h2><p>您正在进行 <strong>${actionText}</strong> 操作。验证码：</p><div style="background: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0; font-size: 32px; letter-spacing: 8px;">${otpCode}</div><p style="color: red; font-size: 14px;">有效期 10 分钟。</p></div>`
    };
    await transporter.sendMail(mailOptions);
    res.json({ msg: '验证码已发送至您的邮箱' });
  } catch (err) { res.status(500).json({ msg: '发送失败' }); }
});

app.post('/api/users/settings/bind-email', authMiddleware, async (req, res) => {
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

app.post('/api/users/settings/change-email', authMiddleware, async (req, res) => {
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

app.post('/api/auth/register', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/auth/me', authMiddleware, async (req, res) => {
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

app.post('/api/match/register', authMiddleware, async (req, res) => {
    try {
        const { nickname, contactType, contactValue, prizeWish, intro } = req.body;
        if (!nickname || !contactValue) return res.status(400).json({ msg: '必填项缺失' });
        
        const updatedUser = await User.findByIdAndUpdate( req.user.id, { isRegistered: true, nickname, contactType, contactValue, prizeWish, intro, regTime: new Date() }, { new: true } );
	      await addXp(req.user.id, 200); 
        res.json({ success: true, user: updatedUser });
    } catch (err) { res.status(500).json({ msg: '报名失败' }); }
});

app.get('/api/time', (req, res) => {
    res.json({ serverTime: new Date(), timestamp: Date.now() });
});

app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  try { res.json({ url: req.file.path }); } catch (err) { res.status(500).json({ msg: '上传失败' }); }
});

app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query; 
    if (!q || q.trim() === '') return res.json([]);
    const users = await User.aggregate([
      { $addFields: { uidString: { $toString: "$uid" } } },
      { $match: { $or: [{ username: { $regex: q, $options: 'i' } }, { uidString: { $regex: q, $options: 'i' } }] } },
      { $limit: 10 },
      { $project: { _id: 1, username: 1, uid: 1, avatarUrl: 1, isRegistered: 1, role: 1 } }
    ]);
    res.json(users);
  } catch (err) { res.status(500).json({ msg: '搜索错误' }); }
});


// ==========================================
// 🌟 核心修复：纯净的好友列表查询接口
// ==========================================
app.get('/api/users/:username/friends', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } })
      .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role')
      .populate('friendRequests', 'username uid avatarUrl level sponsorTier role');

    if (!user) return res.status(404).json({ msg: '该用户不存在' });

    // 安全校验：只有当登录者是本人时，才返回 friendRequests（收到的申请列表）
    const isOwnProfile = req.user && (req.user.id === user._id.toString() || req.user._id === user._id.toString());

    res.json({
      friends: user.friends || [],
      friendRequests: isOwnProfile ? (user.friendRequests || []) : []
    });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.status(500).json({ msg: '获取好友列表失败' });
  }
});


// ==========================================
// 核心：获取玩家详细档案
// ==========================================
app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } })
            .select('-password -contactValue -contactType')
	          .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role');
        
        if (!user) return res.status(404).json({ msg: '用户不存在' });

        let pfRank = '-';
        if (user.totalPf && user.totalPf > 0) pfRank = await User.countDocuments({ totalPf: { $gt: user.totalPf } }) + 1;
        let chuniRank = '-';
        if (user.chuniRating && user.chuniRating > 0) chuniRank = await User.countDocuments({ chuniRating: { $gt: user.chuniRating } }) + 1;

	      const allScores = await Score.find({ userId: user._id }).lean();
        const topScores = await Score.find({ userId: user._id }).sort({ rating: -1, achievement: -1 }).limit(50);
        const topPfScores = await Score.find({ userId: user._id }).sort({ pf: -1 }).limit(50);
        const qualifierScores = await QualifierScore.find({ userId: user._id }).sort({ entryTime: -1 });
        const osuScores = await OsuScore.find({ userId: user._id }).sort({ pp: -1 }).lean();

        res.json({
            ...user.toObject(),
	          allScores: allScores || [], topScores: topScores || [], pfRank, chuniRank, 
            topPfScores: topPfScores || [], qualifierScores: qualifierScores || [], osuScores: osuScores || [],             
            friendsCount: user.friends ? user.friends.length : 0, friends: user.friends 
        });
    } catch (err) { res.status(500).json({ msg: '服务器错误' }); }
});

app.put('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const { bio, avatarUrl, bannerUrl, divingFishUsername, proberUsername, isB50Visible } = req.body;
        const updateFields = {};
        if (bio !== undefined) updateFields.bio = bio;
        if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
        if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;
        if (isB50Visible !== undefined) updateFields.isB50Visible = isB50Visible;
        if (divingFishUsername !== undefined) updateFields.divingFishUsername = divingFishUsername;
        if (proberUsername !== undefined) updateFields.proberUsername = proberUsername;

        const updatedUser = await User.findByIdAndUpdate(req.user.id, { $set: updateFields }, { new: true }).select('-password');
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ msg: '更新失败' }); }
});

// ==========================================
// 📰 公告与新闻系统 API
// ==========================================

// 1. 获取新闻列表 (用于首页展示)
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ msg: '获取公告失败' });
  }
});

// 2. 发布新闻 (管理员专属，支持横幅大图与副标题)
app.post('/api/announcements', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '🚨 权限不足：只有管理员可以发布公告！' });

    // 🔥 完整接收包含 coverUrl(画面) 和 subtitle(副标题) 的数据
    const { title, subtitle, type, content, coverUrl } = req.body;
    if (!title || !content) return res.status(400).json({ msg: '标题和内容不能为空' });

    const newAnnouncement = new Announcement({ 
      title, 
      subtitle,       // 存入副标题
      type: type || 'NEWS', 
      content, 
      coverUrl,       // 存入横幅画面
      author: user._id 
    });
    
    await newAnnouncement.save();
    res.json({ msg: '公告发布成功！', data: newAnnouncement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '发布失败，服务器错误' });
  }
});

app.post('/api/admin/sync-songs', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });
    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/music_data');
    const songs = response.data;
    await Song.collection.dropIndexes().catch(() => {});

    const bulkOps = songs.map(song => {
      const isUtage = song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场' || song.basic_info?.from === '宴会場' || song.basic_info?.from === '宴会场' || song.type === 'UTAGE';
      const finalDs = isUtage ? (song.ds ? song.ds.map(() => 0) : [0, 0, 0, 0, 0]) : song.ds;
      return { updateOne: { filter: { id: String(song.id) }, update: { $set: { id: String(song.id), title: song.title, type: song.type, ds: finalDs, level: song.level, basic_info: song.basic_info, charts: song.charts } }, upsert: true } };
    });
    await Song.bulkWrite(bulkOps);
    res.json({ msg: `✅ 成功同步 ${songs.length} 首乐曲！` });
  } catch (err) { res.status(500).json({ msg: '同步失败' }); }
});

// ==========================================
//  前端拉取本地 Maimai 曲库 (包含别名 aliases)
// ==========================================
app.get('/api/songs', async (req, res) => {
  try {
    // 从我们自己的数据库读取曲库，这里面才包含刚刚同步的 aliases 字段！
    // 使用 .lean() 提高大数据量查询性能
    const songs = await Song.find({}).sort({ id: 1 }).lean(); 
    res.json(songs);
  } catch (err) {
    console.error('获取本地曲库失败:', err);
    res.status(500).json({ msg: '获取曲库数据失败' });
  }
});

app.post('/api/users/:username/friend-request', authMiddleware, async (req, res) => {
  try {
    const sender = await User.findById(req.user.id);
    const receiver = await User.findOne({ username: req.params.username });
    if (!receiver) return res.status(404).json({ message: '目标用户不存在' });
    if (sender._id.toString() === receiver._id.toString()) return res.status(400).json({ message: '不能添加自己' });

    const getLimit = (tier) => { if (tier === 2) return 5000; if (tier === 1) return 300; return 50; };
    if (sender.friends.length >= getLimit(sender.sponsorTier || 0)) return res.status(400).json({ message: `你的好友数量已达上限` });
    if (receiver.friends.length >= getLimit(receiver.sponsorTier || 0)) return res.status(400).json({ message: '对方好友满' });
    if (receiver.friends.includes(sender._id)) return res.status(400).json({ message: '已经是好友了' });
    if (receiver.friendRequests.includes(sender._id)) return res.status(400).json({ message: '已发送过请求' });

    receiver.friendRequests.push(sender._id); await receiver.save();
    await Message.create({ receiver: receiver._id, sender: sender._id, type: 'FRIEND_REQUEST', title: '📬 新的好友申请', content: `玩家 [${sender.username}] 希望添加你为好友！`, actionData: { senderId: sender._id } });
    res.json({ message: '申请已发送' });
  } catch (err) { res.status(500).json({ message: '发送失败' }); }
});

app.post('/api/users/friend-request/accept', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);
    const sender = await User.findById(senderId);
    if (!sender) return res.status(404).json({ message: '发送者不存在' });

    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
    if (!receiver.friends.includes(senderId)) receiver.friends.push(senderId);
    if (!sender.friends.includes(receiver._id)) sender.friends.push(receiver._id);

    await receiver.save(); await sender.save();
    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });
    res.json({ message: '已添加好友' });
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

app.post('/api/users/friend-request/reject', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);
    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
    await receiver.save();
    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });
    res.json({ message: '已拒绝申请' });
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

app.get('/api/messages', authMiddleware, async (req, res) => {
  try { res.json(await Message.find({ receiver: req.user.id }).populate('sender', 'username avatarUrl').sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ message: '获取失败' }); }
});

app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
  try { res.json({ count: await Message.countDocuments({ receiver: req.user.id, isRead: false }) }); } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.delete('/api/messages/bulk-delete-read', authMiddleware, async (req, res) => {
  try { await Message.deleteMany({ receiver: req.user.id, isRead: true, isStarred: { $ne: true } }); res.json({ msg: '清理成功' }); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.put('/api/messages/:id/read', authMiddleware, async (req, res) => {
  try { res.json(await Message.findOneAndUpdate( { _id: req.params.id, receiver: req.user.id }, { isRead: true }, { new: true } )); } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.put('/api/messages/:id/star', authMiddleware, async (req, res) => {
  try { res.json(await Message.findOneAndUpdate( { _id: req.params.id, receiver: req.user.id }, { isStarred: req.body.isStarred }, { new: true } )); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.put('/api/messages/:id/move', authMiddleware, async (req, res) => {
  try { res.json(await Message.findOneAndUpdate( { _id: req.params.id, receiver: req.user.id }, { folderId: req.body.folderId || null }, { new: true } )); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  try { await Message.findOneAndDelete({ _id: req.params.id, receiver: req.user.id }); res.json({ msg: '已删除' }); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/messages/folders', authMiddleware, async (req, res) => {
  try { res.json(await MessageFolder.find({ userId: req.user.id }).sort({ createdAt: 1 })); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.post('/api/messages/folders', authMiddleware, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ msg: '名称不能为空' });
    const count = await MessageFolder.countDocuments({ userId: req.user.id });
    if (count >= 20) return res.status(400).json({ msg: '最多只能创建 20 个分类夹' });
    const newFolder = new MessageFolder({ name: req.body.name, userId: req.user.id }); await newFolder.save(); res.json(newFolder);
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.delete('/api/messages/folders/:id', authMiddleware, async (req, res) => {
  try {
    await MessageFolder.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    await Message.updateMany({ folderId: req.params.id, receiver: req.user.id }, { $set: { folderId: null } });
    res.json({ msg: '已删除' });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.post('/api/admin/send-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });
    const { targetUid, title, content } = req.body;
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ message: '未找到' });
    await Message.create({ receiver: targetUser._id, sender: admin._id, type: 'ADM_DIRECT', title, content }); res.json({ message: `成功` });
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.post('/api/admin/broadcast-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });
    const allUsers = await User.find({}, '_id');
    const messages = allUsers.map(u => ({ receiver: u._id, sender: admin._id, type: 'SYSTEM', title: req.body.title, content: req.body.content }));
    await Message.insertMany(messages); res.json({ message: `广播成功！` });
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.post('/api/admin/qualifier-score', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || !['ADM', 'TO'].includes(adminUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { targetUid, songName, level, achievement, dxScore } = req.body;
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ msg: '未找到' });
    const existingScore = await QualifierScore.findOne({ userId: targetUser._id, songName: songName });

    if (existingScore) {
      existingScore.level = Number(level); existingScore.achievement = Number(achievement); existingScore.dxScore = Number(dxScore || 0);
      existingScore.entryBy = adminUser.username; existingScore.entryTime = Date.now(); await existingScore.save();
      return res.json({ msg: `更新成功！` });
    } else {
      await QualifierScore.create({ userId: targetUser._id, songName, level: Number(level), achievement: Number(achievement), dxScore: Number(dxScore || 0), entryBy: adminUser.username });
      return res.json({ msg: `录入成功！` });
    }
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/leaderboard/qualifiers', async (req, res) => {
  try {
    const leaderboard = await QualifierScore.aggregate([
      { $group: { _id: '$userId', totalAchievement: { $sum: '$achievement' }, totalDxScore: { $sum: '$dxScore' }, playCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' }, 
      { $project: { _id: 0, userId: '$_id', username: { $ifNull: ['$userInfo.nickname', '$userInfo.username'] }, avatarUrl: '$userInfo.avatarUrl', uid: '$userInfo.uid', totalAchievement: 1, totalDxScore: 1, playCount: 1 } },
      { $sort: { totalAchievement: -1, totalDxScore: -1 } }
    ]);
    res.json(leaderboard);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

app.get('/api/feedback', async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await Feedback.updateMany({ status: { $ne: 'CLOSED' }, statusUpdatedAt: { $lt: ninetyDaysAgo } }, { $set: { status: 'CLOSED', statusUpdatedAt: new Date() } });
    const feedbacks = await Feedback.find().populate('author', 'username avatarUrl role').populate('replies.author', 'username avatarUrl role').sort({ isPinned: -1, updatedAt: -1 });
    res.json(feedbacks);
  } catch (err) { res.status(500).json({ message: '获取失败' }); }
});

app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const newFeedback = new Feedback({ author: req.user.id, title: req.body.title, content: req.body.content, type: req.body.type });
    await newFeedback.save(); res.status(201).json(newFeedback);
  } catch (err) { res.status(500).json({ message: '发布失败' }); }
});

app.put('/api/feedback/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: '不存在' });
    if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '无权修改' });
    feedback.title = req.body.title || feedback.title; feedback.content = req.body.content || feedback.content; feedback.type = req.body.type || feedback.type; feedback.status = 'PENDING'; feedback.statusUpdatedAt = Date.now();
    await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '修改失败' }); }
});

app.delete('/api/feedback/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    const user = await User.findById(req.user.id);
    if (feedback.author.toString() !== req.user.id && user.role !== 'ADM') return res.status(403).json({ message: '无权删除' });
    await Feedback.findByIdAndDelete(req.params.id); res.json({ message: '已删除' });
  } catch (err) { res.status(500).json({ message: '删除失败' }); }
});

app.patch('/api/feedback/:id/status', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; 
    const feedback = await Feedback.findById(req.params.id);
    const user = await User.findById(req.user.id);
    
    if (action === 'SOLVE') {
      if (user.role !== 'ADM') return res.status(403).json({ message: '仅管理员可操作' });
      const referenceTime = (feedback.status === 'PENDING' && feedback.statusUpdatedAt && feedback.statusUpdatedAt > feedback.createdAt) ? feedback.statusUpdatedAt : feedback.createdAt;
      feedback.status = 'SOLVED'; feedback.statusUpdatedAt = Date.now();
      await addXp(feedback.author, 100); 
      await User.findByIdAndUpdate(feedback.author, { $inc: { feedbackApprovedCount: 1 } });
      const timeStr = new Date(referenceTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
      await Message.create({ receiver: feedback.author, sender: user._id, type: 'SYSTEM', title: '反馈已解决', content: `您于 ${timeStr} 发布的反馈被标记为已解决。` });
    } else if (action === 'REAPPEAL') {
      if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '无权操作' });
      feedback.status = 'PENDING'; feedback.statusUpdatedAt = Date.now();
    }
    await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.patch('/api/feedback/:id/pin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'ADM') return res.status(403).json({ message: '无权' });
    const feedback = await Feedback.findById(req.params.id);
    feedback.isPinned = !feedback.isPinned; await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.post('/api/feedback/:id/reply', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    feedback.replies.push({ author: req.user.id, content: req.body.content.trim() });
    await feedback.save(); res.status(201).json({ message: '回复成功' });
  } catch (err) { res.status(500).json({ message: '失败' }); }
});

app.post('/api/users/sync-maimai', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/player/records', { headers: { 'Import-Token': importToken.trim(), 'Accept': 'application/json' }, timeout: 20000 });
    const data = response.data;
    const playerRating = data.rating || 0; 
    const allRecords = data.records;

    const allSongsArray = await Song.find({}, 'id title ds charts basic_info').lean();
    const songMap = new Map();
    allSongsArray.forEach(song => songMap.set(String(song.id), song));

    const processedScores = allRecords.map(rec => {
      const song = songMap.get(String(rec.song_id));
      let pf = 0, dxRatio = 0, constant = rec.ds || 0, isNew = false;
      
      if (song) {
        isNew = song.basic_info?.is_new || false; 
        const isUtage = /^\[.+?\]/.test(rec.title) || /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场';
        if (song.charts && song.charts[rec.level_index]) {
          const chartInfo = song.charts[rec.level_index];
          const maxDxScore = chartInfo.notes.reduce((a, b) => a + b, 0) * 3;
          constant = isUtage ? 0 : (rec.ds || song.ds[rec.level_index]);
          dxRatio = maxDxScore > 0 ? (rec.dxScore / maxDxScore) : 0;
          if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, rec.dxScore, maxDxScore);
        }
      }
      return {
        userId: req.user.id, nickname: data.nickname || 'MaimaiPlayer', imageUrl: `https://www.diving-fish.com/covers/${String(rec.song_id).padStart(5, '0')}.png`, 
        achievementRate: rec.achievements || 0, songId: rec.song_id, songName: song ? song.title : rec.title, achievement: rec.achievements || 0, 
	      fcStatus: rec.fc || '', fsStatus: rec.fs || '', dxScore: rec.dxScore || 0, rating: rec.ra || 0, level: rec.level_index || 0, finishTime: new Date(),
        pf: isNaN(pf) || !isFinite(pf) ? 0 : pf, dxRatio: isNaN(dxRatio) || !isFinite(dxRatio) ? 0 : dxRatio, constant: isNaN(constant) || !isFinite(constant) ? 0 : constant, isNew: isNew
      };
    });

    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + rec.rating, 0);
    const finalRating = calculatedRating > 0 ? calculatedRating : playerRating;

    const finalScoresToSave = processedScores.map(({ isNew, ...rest }) => rest);
    await Score.deleteMany({ userId: req.user.id });
    await Score.insertMany(finalScoresToSave);

    const topRecordsByPf = [...finalScoresToSave].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    await User.findByIdAndUpdate(req.user.id, { importToken: importToken.trim(), totalPf: Number(totalPf.toFixed(2)), rating: finalRating });

    res.json({ msg: `成功同步！`, rating: finalRating, totalPf: Number(totalPf.toFixed(2)) });
  } catch (err) { res.status(500).json({ msg: '错误' }); }
});

app.post('/api/users/sync-luoxue-oauth', authMiddleware, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const tokenResponse = await axios.post('https://maimai.lxns.net/api/v0/oauth/token', { grant_type: 'authorization_code', client_id: process.env.LXNS_CLIENT_ID, client_secret: process.env.LXNS_CLIENT_SECRET, code: code, redirect_uri: redirectUri }, { headers: { 'Content-Type': 'application/json' } });
    const userAccessToken = tokenResponse.data.access_token || tokenResponse.data.data?.access_token;
    const scoreResponse = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player/scores', { headers: { 'Authorization': `Bearer ${userAccessToken}` }, timeout: 30000 });
    const allRecords = scoreResponse.data?.data?.records || scoreResponse.data?.records || [];

    const allSongsArray = await Song.find({}, 'id title ds charts basic_info type').lean();
    const processedScores = [];

    for (const rec of allRecords) {
      const rawType = String(rec.type || '').trim().toUpperCase();
      let lxType = 'SD'; if (rawType === 'DX' || rawType === '1') lxType = 'DX';
      const lxId = Number(rec.song_id || rec.music_id || rec.id);
      const lxLevelIndex = Number(rec.level_index !== undefined ? rec.level_index : rec.level);

      const song = allSongsArray.find(s => {
        const sId = Number(s.id);
        const sType = String(s.type || 'SD').trim().toUpperCase();
        return (sId === lxId || sId === lxId + 10000 || sId === lxId - 10000) && (sType === lxType);
      });
      if (!song) continue;

      let pf = 0, dxRatio = 0, constant = 0;
      const isNew = song.basic_info?.is_new || false;
      const isUtage = /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会场';

      if (song.charts && song.charts[lxLevelIndex]) {
        const maxDxScore = song.charts[lxLevelIndex].notes ? song.charts[lxLevelIndex].notes.reduce((a, b) => a + b, 0) * 3 : 0;
        constant = isUtage ? 0 : (song.ds[lxLevelIndex] || 0);
        const currentDxScore = rec.dxScore || rec.dx_score || 0; 
        dxRatio = maxDxScore > 0 ? (currentDxScore / maxDxScore) : 0;
        if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, currentDxScore, maxDxScore);
      }

      processedScores.push({
        userId: req.user.id, nickname: 'LxOAuthPlayer', imageUrl: `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`, 
        achievementRate: rec.achievements || 0, songId: song.id, songName: song.title, achievement: rec.achievements || 0, fcStatus: rec.fc || '', fsStatus: rec.fs || '',
        dxScore: rec.dxScore || rec.dx_score || 0, rating: Math.floor(rec.dx_rating || rec.ra || 0), level: lxLevelIndex, constant: isNaN(constant) ? 0 : constant, finishTime: new Date(rec.play_time || Date.now()), pf: isNaN(pf) ? 0 : pf, dxRatio: isNaN(dxRatio) ? 0 : dxRatio, isNew: isNew
      });
    }

    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + (rec.rating || 0), 0);

    await Score.deleteMany({ userId: req.user.id });
    await Score.insertMany(processedScores);

    const topRecordsByPf = [...processedScores].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    await User.findByIdAndUpdate(req.user.id, { totalPf: Number(totalPf.toFixed(2)), rating: calculatedRating });

    res.json({ msg: `全量同步成功！`, rating: calculatedRating });
  } catch (err) { res.status(500).json({ msg: `同步失败` }); }
});

app.post('/api/users/sync-chunithm-oauth', authMiddleware, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const tokenResponse = await axios.post('https://maimai.lxns.net/api/v0/oauth/token', { grant_type: 'authorization_code', client_id: process.env.LXNS_CLIENT_ID, client_secret: process.env.LXNS_CLIENT_SECRET, code, redirect_uri: redirectUri }, { headers: { 'Content-Type': 'application/json' } });
    const userAccessToken = tokenResponse.data.access_token || tokenResponse.data.data?.access_token;
    const scoreResponse = await axios.get('https://maimai.lxns.net/api/v0/user/chunithm/player/scores', { headers: { 'Authorization': `Bearer ${userAccessToken}` }, timeout: 30000 });
    const allRecords = scoreResponse.data?.data?.records || scoreResponse.data?.records || [];

    const allSongsArray = await ChunithmSong.find({}, 'id title ds basic_info').lean();
    const processedScores = [];

    for (const rec of allRecords) {
      const lxId = Number(rec.song_id || rec.id);
      const lxLevelIndex = Number(rec.level_index);
      const song = allSongsArray.find(s => Number(s.id) === lxId);
      if (!song) continue;

      let constant = 0;
      if (song.ds && song.ds[lxLevelIndex]) constant = song.ds[lxLevelIndex];
      const isWE = lxLevelIndex === 5; 

      processedScores.push({
        userId: req.user.id, songId: song.id, songName: song.title || song.basic_info?.title, imageUrl: `https://www.diving-fish.com/covers/${song.id}.png`, 
        level: lxLevelIndex, constant: isWE ? 0 : constant, score: rec.score || 0, rating: isWE ? 0 : (rec.rating || 0), rank: rec.rank || '', clearStatus: rec.clear || '', fcStatus: rec.full_combo || rec.fc || '', isNew: song.basic_info?.from === 'LUMINOUS PLUS' || false, finishTime: new Date(rec.play_time || Date.now())
      });
    }

    await ChunithmScore.deleteMany({ userId: req.user.id });
    await ChunithmScore.insertMany(processedScores);

    const validScores = processedScores.filter(s => s.level !== 5 && s.rating > 0);
    validScores.sort((a, b) => b.rating - a.rating || b.score - a.score);
    const b30 = validScores.filter(s => !s.isNew).slice(0, 30);
    const r20 = validScores.filter(s => s.isNew).slice(0, 20);
    const sumB30 = b30.reduce((sum, s) => sum + s.rating, 0);
    const sumR20 = r20.reduce((sum, s) => sum + s.rating, 0);
    const totalCount = b30.length + r20.length;
    const avgRating = totalCount > 0 ? Number(((sumB30 + sumR20) / totalCount).toFixed(2)) : 0;

    await User.findByIdAndUpdate(req.user.id, { chuniRating: avgRating });
    res.json({ msg: `同步成功！` });
  } catch (err) { res.status(500).json({ msg: `失败` }); }
});

app.get('/api/wiki/categories', async (req, res) => {
  try { res.json(await WikiCategory.find().sort({ createdAt: 1 })); } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

app.post('/api/admin/wiki/category', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { name, slug, description, parentId, icon, color } = req.body;
    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const newCategory = new WikiCategory({ name, slug: formattedSlug, description, parentId: parentId || null, icon: icon || 'FaFolder', color: color || 'text-cyan-400' });
    await newCategory.save(); res.json({ msg: '创建成功！', category: newCategory });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/wiki/list', async (req, res) => {
  try { res.json(await WikiPage.find({ status: 'APPROVED' }).select('title slug category views updatedAt').populate('category', 'name slug parentId color icon').sort({ views: -1 })); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/wiki/page/:slug', async (req, res) => {
  try {
    const page = await WikiPage.findOneAndUpdate({ slug: req.params.slug, status: 'APPROVED' }, { $inc: { views: 1 } }, { new: true, timestamps: false }).populate('category', 'name slug parentId').populate('author', 'username avatarUrl role').populate('lastEditedBy', 'username avatarUrl role');
    if (!page) return res.status(404).json({ msg: '不存在' }); res.json(page);
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.post('/api/wiki/submit', authMiddleware, async (req, res) => {
  try {
    const { slug, title, categoryId, content } = req.body; 
    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    let page = await WikiPage.findOne({ slug: formattedSlug });
    const currentUser = await User.findById(req.user.id || req.user._id);
    const isAdmin = currentUser && ['ADM', 'TO'].includes(currentUser.role);
    const newStatus = isAdmin ? 'APPROVED' : 'PENDING';

    if (page) {
      if (!page.history) page.history = [];
      page.history.push({ title: page.title, content: page.content, editedBy: page.lastEditedBy, editedAt: page.updatedAt || new Date() });
      page.title = title; page.category = categoryId; page.content = content; page.lastEditedBy = currentUser._id; page.status = newStatus; page.isPendingUpdate = !isAdmin;
      await page.save();
      if (isAdmin) { await addXp(currentUser._id, 30); await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } }); }
      return res.json({ msg: '更新成功' });
    } else {
      const newPage = new WikiPage({ title, slug: formattedSlug, category: categoryId, content, author: currentUser._id, lastEditedBy: currentUser._id, status: newStatus, isPendingUpdate: false });
      await newPage.save();
      if (isAdmin) { await addXp(currentUser._id, 50); await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } }); }
      return res.json({ msg: '提交成功' });
    }
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/admin/wiki/pending', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) return res.status(403).json({ msg: '权限不足' });
    res.json(await WikiPage.find({ status: 'PENDING' }).populate('category', 'name').populate('author', 'username').sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.put('/api/admin/wiki/review/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { action, rejectReason } = req.body;
    const page = await WikiPage.findById(req.params.id);
    
    if (action === 'APPROVE') {
      page.status = 'APPROVED'; page.rejectReason = '';
      const targetUserId = page.isPendingUpdate ? page.lastEditedBy : page.author;
      await addXp(targetUserId, page.isPendingUpdate ? 30 : 50); 
      await User.findByIdAndUpdate(targetUserId, { $inc: { wikiApprovedCount: 1 } });
      page.isPendingUpdate = false;
    } else if (action === 'REJECT') {
      page.status = 'REJECTED'; page.rejectReason = rejectReason || '不符合规范';
    }
    await page.save(); res.json({ msg: `审核完成` });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.post('/api/wiki/read-reward', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    if (user.lastWikiReadDate !== today) {
      user.lastWikiReadDate = today; user.xp = (user.xp || 0) + 5; user.level = Math.floor(user.xp / 300) + 1; 
      await user.save(); return res.json({ awarded: true, msg: '📚 每日奖励 +5' });
    }
    res.json({ awarded: false });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});


app.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const type = req.params.type;
    const { game, mode } = req.query; 

    // osu! 特殊处理逻辑（兼容新旧数据）
    if (type === 'pf' && game === 'osu') {
      const currentMode = mode || 'standard';
      
      const users = await User.find({
        $or: [
          { [`osuDetails.${currentMode}.pp`]: { $gt: 0 } },
          { osuMode: currentMode, osuPp: { $gt: 0 } },
          ...(currentMode === 'standard' ? [{ osuMode: { $exists: false }, osuPp: { $gt: 0 } }] : [])
        ]
      })
      .select('username uid avatarUrl role isRegistered isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails createdAt')
      .lean();

      // 在内存中将对应的 PP 映射到根节点的 pp 属性
      const formattedUsers = users.map(u => {
        let pp = 0;
        if (u.osuDetails && u.osuDetails[currentMode] && u.osuDetails[currentMode].pp > 0) {
          pp = u.osuDetails[currentMode].pp;
        } else if ((u.osuMode === currentMode || (!u.osuMode && currentMode === 'standard')) && u.osuPp > 0) {
          pp = u.osuPp;
        }
        return { ...u, pp };
      });

      // 手动按 PP 排序（降序）
      formattedUsers.sort((a, b) => b.pp - a.pp || new Date(a.createdAt) - new Date(b.createdAt));
      return res.json(formattedUsers.slice(0, 100));
    }

    // 常规模式处理 (Maimai / Chuni / 社区活跃榜)
    let sortQuery = {};
    let filterQuery = {};

    switch(type) {
      case 'level': sortQuery = { xp: -1, createdAt: 1 }; break;
      case 'wiki': sortQuery = { wikiApprovedCount: -1, createdAt: 1 }; break;
      case 'feedback': sortQuery = { feedbackApprovedCount: -1, createdAt: 1 }; break;
      case 'checkin': sortQuery = { checkInCount: -1, createdAt: 1 }; break;
      case 'chunithm': 
        sortQuery = { chuniRating: -1, createdAt: 1 }; 
        filterQuery = { chuniRating: { $gt: 0 } }; 
        break;
      case 'pf':
      default: 
        sortQuery = { totalPf: -1, createdAt: 1 };
        filterQuery = { totalPf: { $gt: 0 } };
        break;
    }

    const users = await User.find(filterQuery)
      .sort(sortQuery)
      // 必须暴露 osuDetails 字典让前端读取
      .select('username uid avatarUrl totalPf rating role isRegistered isB50Visible xp level wikiApprovedCount feedbackApprovedCount checkInCount chuniRating isChuniB50Visible osuPp osuMode osuDetails')
      .limit(100)
      .lean();

    res.json(users);
  } catch (err) { 
    console.error('排行榜拉取失败:', err);
    res.status(500).json({ msg: '获取排行榜失败' }); 
  }
});

app.post('/api/users/check-in', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }); 
    if (user.lastCheckInDate === today) return res.status(400).json({ msg: '今天已经签到过啦！' });
    user.lastCheckInDate = today; user.xp = (user.xp || 0) + 20; user.checkInCount = (user.checkInCount || 0) + 1; user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
    res.json({ msg: '签到成功！经验值 +20', xp: user.xp, level: user.level });
  } catch (err) { res.status(500).json({ msg: '签到失败' }); }
});

app.post('/api/osu/bind', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = Number(process.env.OSU_CLIENT_ID); 
    const clientSecret = process.env.OSU_CLIENT_SECRET ? String(process.env.OSU_CLIENT_SECRET).trim() : '';
    const redirectUri = process.env.OSU_CALLBACK_URL ? String(process.env.OSU_CALLBACK_URL).trim() : '';

    const payload = { client_id: clientId, client_secret: clientSecret, code: code, grant_type: 'authorization_code', redirect_uri: redirectUri };
    const tokenResponse = await axios.post('https://osu.ppy.sh/oauth/token', payload, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
    const accessToken = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://osu.ppy.sh/api/v2/me/osu', { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } });
    const osuUser = userResponse.data;

    const user = await User.findById(req.user.id || req.user._id);
    user.osuId = osuUser.id; user.osuUsername = osuUser.username; user.osuAvatarUrl = osuUser.avatar_url;
    user.xp = (user.xp || 0) + 50; user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
    res.json({ msg: `绑定成功` });
  } catch (err) { res.status(500).json({ msg: '绑定失败' }); }
});

app.post('/api/users/sync-osu', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user.osuId) return res.status(400).json({ msg: '请先绑定 osu! 账号' });

    const modeMap = { 'standard': 'osu', 'taiko': 'taiko', 'catch': 'fruits', 'mania': 'mania' };
    const frontendMode = req.body.mode || 'standard';
    const syncMode = modeMap[frontendMode] || 'osu'; 

    const tokenRes = await axios.post('https://osu.ppy.sh/oauth/token', { 
      client_id: Number(process.env.OSU_CLIENT_ID), 
      client_secret: process.env.OSU_CLIENT_SECRET.trim(), 
      grant_type: 'client_credentials', 
      scope: 'public' 
    });
    const token = tokenRes.data.access_token;

    const osuUserRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${user.osuId}/${syncMode}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const osuStats = osuUserRes.data.statistics;

    if (!user.osuDetails) user.osuDetails = {};
    user.osuDetails[frontendMode] = {
      pp: osuStats.pp || 0,
      rank: osuStats.global_rank || 0,
      countryRank: osuStats.country_rank || 0,
      accuracy: osuStats.hit_accuracy || 0,
      playCount: osuStats.play_count || 0
    };
    user.markModified('osuDetails');

    user.osuPp = osuStats.pp; 
    user.osuGlobalRank = osuStats.global_rank || 0; 
    user.osuCountryRank = osuStats.country_rank || 0; 
    user.osuMode = frontendMode; 
    await user.save();

    const bpRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${user.osuId}/scores/best?mode=${syncMode}&limit=100`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    await OsuScore.deleteMany({ userId: user._id, mode: syncMode });
    
    const bpDocs = bpRes.data.map(s => ({ 
      userId: user._id, 
      mode: syncMode, 
      beatmapId: s.beatmap.id, 
      title: s.beatmapset.title, 
      version: s.beatmap.version, 
      accuracy: s.accuracy * 100, 
      mods: s.mods.map(m => m.acronym || m), 
      pp: s.pp, 
      grade: s.rank, 
      coverUrl: s.beatmapset.covers.list, 
      playedAt: s.created_at 
    }));
    await OsuScore.insertMany(bpDocs);

    res.json({ msg: `${frontendMode} 模式同步成功！` });
  } catch (err) { 
    res.status(500).json({ msg: '同步失败' }); 
  }
});

app.get('/api/songs/:songId/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { level, scope, game } = req.query;
    const songId = req.params.songId;

    let query = { songId: { $in: [String(songId), Number(songId)] } };   
    
    if (level !== undefined && !isNaN(Number(level))) {
        query.level = Number(level);
    }

    if (game === 'chunithm') {
        query.score = { $gt: 0 };
    }

    if (scope === 'friends') {
      if (!req.user) return res.status(401).json({ msg: '请先登录以查看好友排行榜' });
      const currentUser = await User.findById(req.user.id);
      
      if (!currentUser || (currentUser.sponsorTier || 0) < 1) {
        return res.status(403).json({ msg: '好友特权需要 赞助者 Tier 1 或以上' });
      }
      
      const friendIds = currentUser.friends || [];
      query.userId = { $in: [...friendIds, currentUser._id] };
    }

    const Model = game === 'chunithm' ? ChunithmScore : Score;
    const sortCriteria = game === 'chunithm' ? { score: -1, finishTime: 1 } : { achievement: -1, dxScore: -1 };

    const scores = await Model.find(query)
      .sort(sortCriteria)
      .limit(100)
      .populate('userId', 'username avatarUrl uid sponsorTier role nickname')
      .lean();

    const formattedScores = scores.map(s => ({
      ...s,
      username: s.userId?.username || s.nickname || 'Unknown Player',
      avatarUrl: s.userId?.avatarUrl,
      uid: s.userId?.uid,
      sponsorTier: s.userId?.sponsorTier,
      role: s.userId?.role,
      fcStatus: s.fc || s.fcStatus || '',
      fsStatus: s.fs || s.fsStatus || ''
    }));

    res.json(formattedScores);
  } catch (err) {
    console.error('[单曲排行榜报错]', err);
    res.status(500).json({ msg: '获取单曲排行榜失败' });
  }
});

app.get('/api/users/:username/chunithm-scores', async (req, res) => {
  try {
    const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } });
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    const scores = await ChunithmScore.find({ userId: user._id });
    res.json(scores);
  } catch (err) { res.status(500).json({ msg: '获取失败' }); }
});

app.post('/api/users/sync-chunithm', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    const response = await axios.get('https://www.diving-fish.com/api/chunithmprober/player/records', { headers: { 'Developer-Token': importToken.trim() }, timeout: 15000 });

    let rawRecords = [];
    if (Array.isArray(response.data)) rawRecords = response.data;
    else if (response.data.records) {
       const best = response.data.records.best || [];
       const r20 = response.data.records.r20 || [];
       const map = new Map();
       [...best, ...r20].forEach(r => map.set(`${r.cid || r.music_id}`, r));
       rawRecords = Array.from(map.values());
    }

    const allSongsArray = await ChunithmSong.find({}, 'id title ds basic_info cids').lean();
    const processedScores = [];

    for (const rec of rawRecords) {
       let song = null; let levelIndex = 0;
       if (rec.cid) {
          song = allSongsArray.find(s => s.cids && s.cids.includes(rec.cid));
          if (song) levelIndex = song.cids.indexOf(rec.cid);
       } else if (rec.music_id || rec.id) {
          const lxId = Number(rec.music_id || rec.id);
          song = allSongsArray.find(s => Number(s.id) === lxId);
          levelIndex = Number(rec.level_index !== undefined ? rec.level_index : rec.level);
       }

       if (!song) continue;
       let constant = 0;
       if (song.ds && song.ds[levelIndex] !== undefined) constant = song.ds[levelIndex];
       const isWE = levelIndex === 5;
       const realScore = rec.score || 0;
       const singleRating = isWE ? 0 : (rec.rating || calculateChuniRating(realScore, constant));

       processedScores.push({
         userId: req.user.id, songId: song.id, songName: song.title || song.basic_info?.title, imageUrl: `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`,
         level: levelIndex, constant: isWE ? 0 : constant, score: realScore, rating: singleRating, rank: rec.rank || '', clearStatus: rec.clear || '', fcStatus: rec.fc || rec.full_combo || '', isNew: song.basic_info?.from === 'LUMINOUS PLUS' || false, finishTime: new Date(rec.upload_time || rec.play_time || Date.now())
       });
    }

    await ChunithmScore.deleteMany({ userId: req.user.id });
    await ChunithmScore.insertMany(processedScores);

    const validScores = processedScores.filter(s => s.level !== 5 && s.rating > 0);
    validScores.sort((a, b) => b.rating - a.rating || b.score - a.score);
    const b30 = validScores.filter(s => !s.isNew).slice(0, 30);
    const r20 = validScores.filter(s => s.isNew).slice(0, 20);
    const sumB30 = b30.reduce((sum, s) => sum + s.rating, 0);
    const sumR20 = r20.reduce((sum, s) => sum + s.rating, 0);
    const totalCount = b30.length + r20.length;
    const avgRating = totalCount > 0 ? Number(((sumB30 + sumR20) / totalCount).toFixed(2)) : 0;

    await User.findByIdAndUpdate(req.user.id, { importToken: importToken, chuniRating: avgRating });
    res.json({ msg: `同步成功！`, rating: avgRating });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.post('/api/chunithm-songs/sync', async (req, res) => {
  try {
    const response = await axios.get('https://www.diving-fish.com/api/chunithmprober/music_data', { timeout: 15000 });
    const songs = response.data;
    await ChunithmSong.deleteMany({});
    await ChunithmSong.insertMany(songs);
    res.json({ msg: `同步成功！` });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/chunithm-songs', async (req, res) => {
  try { res.json(await ChunithmSong.find({}).sort({ id: -1 })); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.get('/api/users/settings/me', authMiddleware, async (req, res) => {
  try { res.json(await User.findById(req.user.id).select('location occupation website twitter birthday isB50Visible isChuniB50Visible email')); } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.put('/api/users/settings/profile', authMiddleware, async (req, res) => {
  try {
    const { location, occupation, website, twitter, birthday } = req.body;
    await User.findByIdAndUpdate(req.user.id, { location, occupation, website, twitter, birthday });
    res.json({ msg: '资料更新成功' });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.put('/api/users/settings/privacy', authMiddleware, async (req, res) => {
  try {
    const { isB50Visible, isChuniB50Visible } = req.body;
    await User.findByIdAndUpdate(req.user.id, { isB50Visible, isChuniB50Visible });
    res.json({ msg: '更新成功' });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

app.post('/api/users/settings/request-deletion', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { deletionStatus: 'PENDING', deletionRequestDate: new Date() });
    res.json({ msg: '已提交' });
  } catch (err) { res.status(500).json({ msg: '失败' }); }
});

// ==========================================
// 🌟 核心修复：多维好友列表查询引擎 (彻底解决 404 与 filter 报错)
// ==========================================

// 1. 获取当前登录者的好友列表 (解决 Friends.jsx 访问 /api/users/friends 的 404 崩溃问题)
app.get('/api/users/friends', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role')
      .populate('friendRequests', 'username uid avatarUrl level sponsorTier role');
      
    if (!user) return res.status(404).json({ msg: '用户未找到' });
    
    // 必须确保返回的是数组，防止前端 .filter() 报错崩溃
    res.json({ 
      friends: user.friends || [], 
      friendRequests: user.friendRequests || [] 
    });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.status(500).json({ msg: '获取好友列表失败' });
  }
});

// 2. 兼容带 list 后缀的潜在请求
app.get('/api/users/friends/list', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role')
      .populate('friendRequests', 'username uid avatarUrl level sponsorTier role');
      
    res.json({ friends: user.friends || [], friendRequests: user.friendRequests || [] });
  } catch (err) {
    res.status(500).json({ msg: '获取好友列表失败' });
  }
});

// 3. 获取指定玩家的好友列表 (兼容在他人主页查看)
app.get('/api/users/:username/friends', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } })
      .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role')
      .populate('friendRequests', 'username uid avatarUrl level sponsorTier role');

    if (!user) return res.status(404).json({ msg: '该用户不存在' });

    const isOwnProfile = req.user && (req.user.id === user._id.toString() || req.user._id === user._id.toString());

    res.json({
      friends: user.friends || [],
      friendRequests: isOwnProfile ? (user.friendRequests || []) : []
    });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.status(500).json({ msg: '获取好友列表失败' });
  }
});

// ==========================================
// 🌟 核心：获取玩家详细档案
// ==========================================
app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } })
            .select('-password -contactValue -contactType')
	          .populate('friends', 'username uid avatarUrl bannerUrl level totalPf rating isB50Visible chuniRating isChuniB50Visible osuPp osuMode osuDetails sponsorTier role');
        
        if (!user) return res.status(404).json({ msg: '用户不存在' });

        let pfRank = '-';
        if (user.totalPf && user.totalPf > 0) pfRank = await User.countDocuments({ totalPf: { $gt: user.totalPf } }) + 1;
        let chuniRank = '-';
        if (user.chuniRating && user.chuniRating > 0) chuniRank = await User.countDocuments({ chuniRating: { $gt: user.chuniRating } }) + 1;

	      const allScores = await Score.find({ userId: user._id }).lean();
        const topScores = await Score.find({ userId: user._id }).sort({ rating: -1, achievement: -1 }).limit(50);
        const topPfScores = await Score.find({ userId: user._id }).sort({ pf: -1 }).limit(50);
        const qualifierScores = await QualifierScore.find({ userId: user._id }).sort({ entryTime: -1 });
        const osuScores = await OsuScore.find({ userId: user._id }).sort({ pp: -1 }).lean();

        res.json({
            ...user.toObject(),
	          allScores: allScores || [], topScores: topScores || [], pfRank, chuniRank, 
            topPfScores: topPfScores || [], qualifierScores: qualifierScores || [], osuScores: osuScores || [],             
            friendsCount: user.friends ? user.friends.length : 0, friends: user.friends 
        });
    } catch (err) { res.status(500).json({ msg: '服务器错误' }); }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Current Server Time: ${new Date().toLocaleString()}`);
});