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
const ChunithmSong = require('./models/ChunithmSong');
const nodemailer = require('nodemailer');
const Otp = require('./models/Otp');

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 配置 Multer 存储策略
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'msc2026_profiles', 
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1000, crop: 'limit' }] 
  }
});

// ==========================================
// 邮件发送器初始化 (Nodemailer Transporter)
// ==========================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true 对应 465 端口
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


const upload = multer({ storage: storage });

process.on('uncaughtException', (err) => {
  console.error('🔥 致命错误 (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 未处理的 Promise 拒绝:', reason);
});

console.log("🚀 服务器脚本开始执行...");

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

// 使用环境变量中的 MONGO_URI 连接
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); 
    });

// ==========================================
// 辅助工具与中间件
// ==========================================

const addXp = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    user.xp = (user.xp || 0) + amount;
    user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
  } catch (err) {
    console.error('加经验失败:', err);
  }
};

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: '无权限，请先登录' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token 无效或已过期' });
    }
};

const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {}
    }
    next();
};

// ==========================================
// API 路由逻辑
// ==========================================
// ==========================================
// API: 1. 发送 6 位数邮箱验证码
// ==========================================
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) return res.status(400).json({ msg: '参数不完整' });

    // 格式粗筛
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ msg: '邮箱格式不正确' });

    // 如果是“绑定邮箱”操作，提前检查是否已被其他账号占用
    if (type === 'BIND') {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ msg: '该邮箱已被其他账号绑定！' });
    }

    // 生成 6 位随机数字
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 将验证码存入数据库 (使用 upsert: 如果该邮箱之前有验证码还没过期，直接覆盖刷新)
    await Otp.findOneAndUpdate(
      { email, type },
      { otp: otpCode, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // 构建精美的 HTML 邮件模板
    const mailOptions = {
      from: `"PureBeat 社区" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '【PureBeat】您的账号安全验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #06b6d4;">PureBeat Security</h2>
          <p>您好，</p>
          <p>您正在执行 <strong>${type === 'BIND' ? '绑定邮箱' : '系统验证'}</strong> 操作。您的 6 位动态验证码为：</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${otpCode}</span>
          </div>
          <p style="color: #ef4444; font-size: 14px;">⚠️ 该验证码将在 <strong>10 分钟</strong> 后失效。打死也不要告诉别人！</p>
          <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #eee; padding-top: 15px; mt-5">
            如果这不是您本人的操作，请忽略此邮件。
          </p>
        </div>
      `
    };

    // 发送邮件
    await transporter.sendMail(mailOptions);
    res.json({ msg: '验证码已发送至您的邮箱，请注意查收' });

  } catch (err) {
    console.error('发送邮件失败:', err);
    res.status(500).json({ msg: '邮件发送失败，请检查服务器配置' });
  }
});

// ==========================================
// API: 2. 校验验证码并绑定邮箱
// ==========================================
app.post('/api/users/settings/bind-email', authMiddleware, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ msg: '请提供邮箱和验证码' });

    // 1. 去数据库核对验证码
    const otpRecord = await Otp.findOne({ email, otp, type: 'BIND' });
    if (!otpRecord) {
      return res.status(400).json({ msg: '验证码错误或已失效 (有效期10分钟)' });
    }

    // 2. 二次确认邮箱是否被占用 (防止并发极小概率的漏洞)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: '手慢了，该邮箱已被别人绑定' });
    }

    // 3. 将邮箱写入当前用户的档案中
    await User.findByIdAndUpdate(req.user.id, { email });

    // 4. 验证成功后，立即销毁这条验证码 (防止重复使用)
    await Otp.findByIdAndDelete(otpRecord._id);

    res.json({ msg: '邮箱绑定成功！' });

  } catch (err) {
    console.error('绑定邮箱报错:', err);
    res.status(500).json({ msg: '系统错误，绑定失败' });
  }
});

// --- A. 认证模块 ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ msg: '请填写所有字段' });
        }

        // 🌟 1. 优化注册查重：大小写不敏感的精确匹配
        // 例如数据库里有 "Wolong"，别人注册 "wolong" 或 "WOLONG" 都会被拦截
        const existingUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${username}$`, 'i') } 
        });

        if (existingUser) {
            // 🌟 2. 检查是否是被注销的账号（180天保护期机制）
            if (existingUser.deletionStatus === 'DELETED') {
                const requestDate = existingUser.deletionRequestDate || new Date();
                const daysSinceDeletion = (new Date() - requestDate) / (1000 * 60 * 60 * 24);
                
                if (daysSinceDeletion < 180) {
                    return res.status(400).json({ 
                        msg: `该用户名处于注销保护期内，还需 ${Math.ceil(180 - daysSinceDeletion)} 天方可被重新注册` 
                    });
                } else {
                    // 超过 180 天，彻底删除旧占位记录，释放该用户名允许新用户注册
                    await User.findByIdAndDelete(existingUser._id);
                }
            } else {
                // 正常活跃状态 (ACTIVE) 或 正在申请注销犹豫期 (PENDING) 的同名账号
                return res.status(400).json({ msg: '该用户名已被占用（系统对大小写不敏感，请更换其他名称）' });
            }
        }

        // --- 3. 原有的密码加密、UID生成和保存逻辑 ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        let randomUid;
        let uidExists = true;
        while (uidExists) {
            randomUid = Math.floor(10000 + Math.random() * 90000);
            const checkUid = await User.findOne({ uid: randomUid });
            if (!checkUid) uidExists = false;
        }

        const newUser = new User({ 
            username, 
            password: hashedPassword, 
            uid: randomUid 
        });
        const savedUser = await newUser.save();
        
        const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({ token, user: { id: savedUser._id, username: savedUser.username, isRegistered: false } });
    } catch (err) {
        console.error('注册接口报错:', err);
        res.status(500).json({ msg: '服务器错误，请稍后重试' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: '用户不存在' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: '密码错误' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user._id, username: user.username, isRegistered: user.isRegistered, nickname: user.nickname,
                totalPf: user.totalPf || 0, divingFishUsername: user.divingFishUsername, proberUsername: user.proberUsername
            }
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password')
	.populate('friends', 'username uid avatarUrl totalPf rating isB50Visible');
        if (!user) return res.status(404).json({ msg: '用户未找到' });
	const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
        if (user.lastLoginDate !== today) {
          user.lastLoginDate = today; user.xp = (user.xp || 0) + 10; user.level = Math.floor(user.xp / 300) + 1;
          await user.save();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// ==========================================
// 同步水鱼查分器成绩并结算 PF 分 (普通查分器版本)
// ==========================================
app.post('/api/users/sync-diving-fish', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: '请先登录' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);

    if (!user.divingFishUsername) {
      return res.status(400).json({ message: '请先在个人主页绑定水鱼查分器用户名！' });
    }

    const dfResponse = await axios.post('https://www.diving-fish.com/api/maimaidxprober/query/player', {
      username: user.divingFishUsername
    });

    const allRecords = [...(dfResponse.data.records || []), ...(dfResponse.data.records_new || [])];
    let processedScores = [];

    for (const record of allRecords) {
      const song = await Song.findOne({ id: record.song_id.toString() });
      if (!song) continue; 

      const chartInfo = song.charts[record.level_index];
      if (!chartInfo) continue;
      
      // 🔥 兼容繁体/日文“宴会場”和简体“宴会场”
      const isUtage = /^\[.+?\]/.test(record.title) || /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场';

      const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0);
      const maxDxScore = totalNotes * 3;
      
      // 🔥 彻底解决重复声明：直接在这里使用三元运算符赋值给唯一的 const
      const constant = isUtage ? 0 : (record.ds || song.ds[record.level_index]);
      
      const dxRatio = maxDxScore > 0 ? (record.dxScore / maxDxScore) : 0;
      const pf = calculatePF(constant, record.achievements, record.dxScore, maxDxScore);

      processedScores.push({
        userId: userId, 
        songId: song.id,
        songName: record.title,
        difficulty: record.level_index,
        level: record.level,
        achievement: record.achievements, 
        dxScore: record.dxScore,
        fc: record.fc,
        fs: record.fs,
        rating: record.ra,
        pf: pf,
        dxRatio: dxRatio,
        constant: constant,
        finishTime: new Date()
      });
    }

    await Score.deleteMany({ userId: userId });
    await Score.insertMany(processedScores);

    const top50 = processedScores.sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = top50.reduce((sum, score) => sum + score.pf, 0);

    user.totalPf = Number(totalPf.toFixed(2));
    await user.save();

    res.json({ message: '数据同步成功！', totalPf: user.totalPf, syncedCount: processedScores.length });

  } catch (error) {
    console.error('同步失败:', error);
    if (error.response && error.response.status === 400) {
      return res.status(400).json({ message: '无法获取数据。请确保水鱼账号存在，且在查分器设置中开启了“数据公开”。' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '登录已过期，请重新登录' });
    }
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// --- B. 报名模块 ---
app.post('/api/match/register', authMiddleware, async (req, res) => {
    try {
        const { nickname, contactType, contactValue, prizeWish, intro } = req.body;
        if (!nickname || !contactValue) return res.status(400).json({ msg: '昵称和联系方式内容为必填项' });
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { isRegistered: true, nickname, contactType, contactValue, prizeWish, intro, regTime: new Date() },
            { new: true }
        );
	await addXp(req.user.id, 200); 

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '报名提交失败' });
    }
});

// --- C. 榜单模块 ---
let leaderboardCache = { data: null, lastUpdated: 0 };
const CACHE_DURATION = 2 * 60 * 60 * 1000; 

app.get('/api/leaderboard', async (req, res) => {
    try {
        const scores = await Score.find().sort({ achievement: -1, dxScore: -1, finishTime: 1 }).limit(100); 
        res.json(scores);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '获取榜单失败' });
    }
});

app.get('/api/leaderboard/refresh', async (req, res) => {
    leaderboardCache.data = null;
    res.json({ msg: '缓存已清除' });
});

// --- D. 系统工具模块 ---
app.get('/api/time', (req, res) => {
    res.json({ serverTime: new Date(), timestamp: Date.now() });
});

// --- E. 个人资料模块 (Profile) ---
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  try { res.json({ url: req.file.path }); } catch (err) { res.status(500).json({ msg: '图片上传失败' }); }
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
  } catch (err) {
    console.error('搜索接口错误:', err);
    res.status(500).json({ msg: '服务器搜索错误' });
  }
});

app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
            .select('-password -contactValue -contactType')
	    .populate('friends', 'username uid avatarUrl totalPf rating isB50Visible');
        
        if (!user) return res.status(404).json({ msg: '用户不存在' });

        let pfRank = '-';
        if (user.totalPf && user.totalPf > 0) {
            pfRank = await User.countDocuments({ totalPf: { $gt: user.totalPf } }) + 1;
        }
	const allScores = await Score.find({ userId: user._id }).lean();
        const topScores = await Score.find({ userId: user._id }).sort({ rating: -1, achievement: -1 }).limit(50);
        const topPfScores = await Score.find({ userId: user._id }).sort({ pf: -1 }).limit(50);
        const qualifierScores = await QualifierScore.find({ userId: user._id }).sort({ entryTime: -1 });
        const osuScores = await OsuScore.find({ userId: user._id }).sort({ pp: -1 }).lean();

        res.json({
            ...user.toObject(),
	          allScores: allScores || [],
            topScores: topScores || [],       
            pfRank: pfRank,               
            topPfScores: topPfScores || [],  
            qualifierScores: qualifierScores || [], 
            osuScores: osuScores || [],             
            friendsCount: user.friends ? user.friends.length : 0,
            friends: user.friends 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '服务器错误' });
    }
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '更新失败' });
    }
});

// === 公告系统 API ===
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ msg: '获取公告失败' });
  }
});

app.post('/api/announcements', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') return res.status(403).json({ msg: '🚨 权限不足：只有管理员可以发布公告！' });

    const { title, type, content } = req.body;
    if (!title || !content) return res.status(400).json({ msg: '标题和内容不能为空' });

    const newAnnouncement = new Announcement({ title, type: type || 'NEWS', content, author: user._id });
    await newAnnouncement.save();
    res.json({ msg: '公告发布成功！', data: newAnnouncement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '发布失败，服务器错误' });
  }
});

// === ADM 全量曲库同步 ===
app.post('/api/admin/sync-songs', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });

    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/music_data');
    const songs = response.data;

    await Song.collection.dropIndexes().catch(() => {});

    const bulkOps = songs.map(song => {
      // 🔥 补充宴会场过滤
      const isUtage = song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场' || song.basic_info?.from === '宴会場' || song.basic_info?.from === '宴会场' || song.type === 'UTAGE';
      const finalDs = isUtage ? (song.ds ? song.ds.map(() => 0) : [0, 0, 0, 0, 0]) : song.ds;

      return {
        updateOne: {
          filter: { id: String(song.id) }, 
          update: { $set: { id: String(song.id), title: song.title, type: song.type, ds: finalDs, level: song.level, basic_info: song.basic_info, charts: song.charts } },
          upsert: true
        }
      };
    });

    await Song.bulkWrite(bulkOps);
    res.json({ msg: `✅ 成功同步 ${songs.length} 首乐曲！` });
  } catch (err) {
    console.error('[曲库同步报错]', err);
    res.status(500).json({ msg: '曲库同步失败，请检查网络或后端日志' });
  }
});

// ==========================================
// 好友系统 API 
// ==========================================
app.post('/api/users/:username/friend-request', authMiddleware, async (req, res) => {
  try {
    const sender = await User.findById(req.user.id);
    const receiver = await User.findOne({ username: req.params.username });

    if (!receiver) return res.status(404).json({ message: '目标用户不存在' });
    if (sender._id.toString() === receiver._id.toString()) return res.status(400).json({ message: '不能添加自己为好友' });

    const getFriendLimit = (tier) => { if (tier === 2) return 5000; if (tier === 1) return 300; return 50; };
    const senderLimit = getFriendLimit(sender.sponsorTier || 0);
    const receiverLimit = getFriendLimit(receiver.sponsorTier || 0);

    if (sender.friends.length >= senderLimit) return res.status(400).json({ message: `你的好友数量已达上限` });
    if (receiver.friends.length >= receiverLimit) return res.status(400).json({ message: '对方的好友栏位已满' });
    if (receiver.friends.includes(sender._id)) return res.status(400).json({ message: '你们已经是好友了' });
    if (receiver.friendRequests.includes(sender._id)) return res.status(400).json({ message: '你已经发送过请求' });

    receiver.friendRequests.push(sender._id);
    await receiver.save();

    const friendRequestMsg = new Message({
      receiver: receiver._id, sender: sender._id, type: 'FRIEND_REQUEST', title: '📬 新的好友申请',
      content: `玩家 [${sender.username}] 希望添加你为好友！`, actionData: { senderId: sender._id } 
    });
    await friendRequestMsg.save();

    res.json({ message: '好友申请已发送！' });
  } catch (err) {
    console.error('发送请求失败:', err);
    res.status(500).json({ message: '请求发送失败' });
  }
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

    await receiver.save();
    await sender.save();

    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });
    res.json({ message: '已成功添加为好友！' });
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

app.post('/api/users/friend-request/reject', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);
    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
    await receiver.save();
    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });
    res.json({ message: '已拒绝该申请' });
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

// ==========================================
// 收件箱与邮件系统 API
// ==========================================
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ receiver: req.user.id }).populate('sender', 'username avatarUrl').sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: '获取收件箱失败' }); }
});

app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: '获取未读数失败' }); }
});

// 一键清理已读邮件（跳过星标邮件）
app.delete('/api/messages/bulk-delete-read', authMiddleware, async (req, res) => {
  try {
    await Message.deleteMany({ 
      receiver: req.user.id, 
      isRead: true, 
      isStarred: { $ne: true } // 🔥 核心逻辑：星标邮件即使已读也不会被删除
    });
    res.json({ msg: '清理成功' });
  } catch (err) { res.status(500).json({ msg: '批量清理失败' }); }
});


app.put('/api/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user.id },
      { isRead: true },
      { new: true }
    );
    res.json(message);
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

app.put('/api/messages/:id/star', authMiddleware, async (req, res) => {
  try {
    const { isStarred } = req.body;
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user.id },
      { isStarred: isStarred },
      { new: true }
    );
    res.json(msg);
  } catch (err) { res.status(500).json({ msg: '标星失败' }); }
});

// 移动邮件到分类夹
app.put('/api/messages/:id/move', authMiddleware, async (req, res) => {
  try {
    const { folderId } = req.body;
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user.id },
      { folderId: folderId || null },
      { new: true }
    );
    res.json(msg);
  } catch (err) { res.status(500).json({ msg: '移动失败' }); }
});

// 删除单封邮件
app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  try {
    await Message.findOneAndDelete({ _id: req.params.id, receiver: req.user.id });
    res.json({ msg: '已删除' });
  } catch (err) { res.status(500).json({ msg: '删除失败' }); }
});


// ==========================================
// 分类夹 (Folders) 管理 API
// ==========================================

// 获取用户的分类夹
app.get('/api/messages/folders', authMiddleware, async (req, res) => {
  try {
    const folders = await MessageFolder.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(folders);
  } catch (err) { res.status(500).json({ msg: '获取分类夹失败' }); }
});

// 创建分类夹
app.post('/api/messages/folders', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ msg: '名称不能为空' });
    
    // 限制最多 20 个
    const count = await MessageFolder.countDocuments({ userId: req.user.id });
    if (count >= 20) return res.status(400).json({ msg: '最多只能创建 20 个分类夹' });

    const newFolder = new MessageFolder({ name, userId: req.user.id });
    await newFolder.save();
    res.json(newFolder);
  } catch (err) { res.status(500).json({ msg: '创建分类夹失败' }); }
});

// 删除分类夹
app.delete('/api/messages/folders/:id', authMiddleware, async (req, res) => {
  try {
    const folderId = req.params.id;
    // 1. 删除分类夹本体
    await MessageFolder.findOneAndDelete({ _id: folderId, userId: req.user.id });
    
    // 2. 将该分类夹下的所有邮件移出（folderId 设为 null，回到全部邮件）
    await Message.updateMany(
      { folderId: folderId, receiver: req.user.id },
      { $set: { folderId: null } }
    );
    
    res.json({ msg: '分类夹已删除' });
  } catch (err) { res.status(500).json({ msg: '删除分类夹失败' }); }
});

app.post('/api/admin/send-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });
    const { targetUid, title, content } = req.body;
    if (!targetUid || !title || !content) return res.status(400).json({ message: '请填写完整信息' });
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ message: '未找到该 UID 对应的玩家' });

    const newMessage = new Message({ receiver: targetUser._id, sender: admin._id, type: 'ADM_DIRECT', title, content });
    await newMessage.save();
    res.json({ message: `成功发送邮件！` });
  } catch (err) { res.status(500).json({ message: '邮件发送失败' }); }
});

app.post('/api/admin/broadcast-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: '不能为空' });

    const allUsers = await User.find({}, '_id');
    const messages = allUsers.map(u => ({ receiver: u._id, sender: admin._id, type: 'SYSTEM', title: `${title}`, content: content }));
    await Message.insertMany(messages);
    res.json({ message: `广播成功！` });
  } catch (err) { res.status(500).json({ message: '广播失败' }); }
});

app.post('/api/admin/qualifier-score', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || !['ADM', 'TO'].includes(adminUser.role)) return res.status(403).json({ msg: '权限不足' });
    const { targetUid, songName, level, achievement, dxScore } = req.body;
    if (!targetUid || !songName || !achievement) return res.status(400).json({ msg: '请填写完整' });

    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ msg: '未找到' });
    const existingScore = await QualifierScore.findOne({ userId: targetUser._id, songName: songName });

    if (existingScore) {
      existingScore.level = Number(level); existingScore.achievement = Number(achievement); existingScore.dxScore = Number(dxScore || 0);
      existingScore.entryBy = adminUser.username; existingScore.entryTime = Date.now(); await existingScore.save();
      await Message.create({ receiver: targetUser._id, sender: adminUser._id, type: 'SYSTEM', title: '您的预选赛成绩已更新', content: `[${songName}] 更新成功` });
      return res.json({ msg: `成绩更新成功！` });
    } else {
      const newQScore = new QualifierScore({ userId: targetUser._id, songName, level: Number(level), achievement: Number(achievement), dxScore: Number(dxScore || 0), entryBy: adminUser.username });
      await newQScore.save();
      const scoreCount = await QualifierScore.countDocuments({ userId: targetUser._id });
      if (scoreCount === 3) {
        await Message.create({ receiver: targetUser._id, sender: adminUser._id, type: 'SYSTEM', title: '预选赛成绩已全部录入！', content: `录入成功` });
        return res.json({ msg: `第 3 首歌录入成功！` });
      }
      return res.json({ msg: `录入成功！` });
    }
  } catch (err) { res.status(500).json({ msg: '录入失败' }); }
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
    const { title, content, type } = req.body;
    if (!title || !content || !type) return res.status(400).json({ message: '请填写完整信息' });
    const newFeedback = new Feedback({ author: req.user.id, title, content, type });
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
    await Feedback.findByIdAndDelete(req.params.id); res.json({ message: '反馈已删除' });
  } catch (err) { res.status(500).json({ message: '删除失败' }); }
});

app.patch('/api/feedback/:id/status', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; 
    const feedback = await Feedback.findById(req.params.id);
    const user = await User.findById(req.user.id);
    
    if (action === 'SOLVE') {
      if (user.role !== 'ADM') return res.status(403).json({ message: '仅管理员可操作' });
      
      // 精准捕获时间：如果是重审(PENDING且存在更新时间)，则取重审时间；否则取初始发布时间
      const referenceTime = (feedback.status === 'PENDING' && feedback.statusUpdatedAt && feedback.statusUpdatedAt > feedback.createdAt) 
                            ? feedback.statusUpdatedAt 
                            : feedback.createdAt;
                            
      feedback.status = 'SOLVED'; 
      feedback.statusUpdatedAt = Date.now();
      
      await addXp(feedback.author, 100); 
      await User.findByIdAndUpdate(feedback.author, { $inc: { feedbackApprovedCount: 1 } });

      // 发送提醒邮件 (无图标，纯参数替换)
      const timeStr = new Date(referenceTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
      await Message.create({
        receiver: feedback.author,
        sender: user._id,
        type: 'SYSTEM',
        title: '反馈状态更新',
        content: `你好，你于 ${timeStr} 发布的反馈 ${feedback.title} 被标记为 已解决，如需要重审，请在解决后至少 2 小时内发起重审。`
      });

    } else if (action === 'REAPPEAL') {
      if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '无权操作' });
      feedback.status = 'PENDING'; 
      feedback.statusUpdatedAt = Date.now();
    }
    
    await feedback.save(); 
    res.json(feedback);
  } catch (err) { 
    res.status(500).json({ message: '状态更新失败' }); 
  }
});

app.patch('/api/feedback/:id/pin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'ADM') return res.status(403).json({ message: '无权' });
    const feedback = await Feedback.findById(req.params.id);
    feedback.isPinned = !feedback.isPinned; await feedback.save(); res.json(feedback);
  } catch (err) { res.status(500).json({ message: '操作失败' }); }
});

app.post('/api/feedback/:id/reply', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const feedback = await Feedback.findById(req.params.id);
    feedback.replies.push({ author: req.user.id, content: content.trim() });
    await feedback.save(); res.status(201).json({ message: '回复成功' });
  } catch (err) { res.status(500).json({ message: '回复失败' }); }
});

app.post('/api/users/sync-maimai', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    if (!importToken) return res.status(400).json({ msg: '无 Token' });

    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/player/records', {
      headers: { 'Import-Token': importToken.trim(), 'Accept': 'application/json' }, timeout: 20000 
    });

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
        
        // 🔥 兼容繁体/日文“宴会場”和简体“宴会场”
        const isUtage = /^\[.+?\]/.test(rec.title) || /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场';
        
        if (song.charts && song.charts[rec.level_index]) {
          const chartInfo = song.charts[rec.level_index];
          const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0);
          const maxDxScore = totalNotes * 3;
          
          // 🔥 修改：这里直接把判定好的值给到外层声明过的 constant，并去除了原本的那句重复赋值
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

// ==========================================
// 同步落雪 (LXNS) - OAuth 2.0 授权流 (终极兼容版)
// ==========================================
app.post('/api/users/sync-luoxue-oauth', authMiddleware, async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) return res.status(400).json({ msg: '缺少授权码 (Code)' });

    if (!process.env.LXNS_CLIENT_ID || !process.env.LXNS_CLIENT_SECRET) {
        throw new Error('后端 .env 未加载 Client ID 或 Secret');
    }

    // 1. 获取 Token
    const tokenResponse = await axios.post('https://maimai.lxns.net/api/v0/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.LXNS_CLIENT_ID,
      client_secret: process.env.LXNS_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri
    }, { headers: { 'Content-Type': 'application/json' } });

    const userAccessToken = tokenResponse.data.access_token || tokenResponse.data.data?.access_token;
    if (!userAccessToken) throw new Error('未能从落雪获取到 Access Token');

    // 2. 调用玩家全量成绩接口
    const scoreResponse = await axios.get('https://maimai.lxns.net/api/v0/user/maimai/player/scores', {
      headers: { 'Authorization': `Bearer ${userAccessToken}` },
      timeout: 30000 
    });

    const dataObj = scoreResponse.data?.data || scoreResponse.data || {};
    const allRecords = dataObj.records || (Array.isArray(dataObj) ? dataObj : []);

    if (allRecords.length === 0) {
       return res.status(400).json({ msg: '落雪返回的成绩为空，请确认账号有记录' });
    }

    // 3. 究极数据匹配与入库
    const allSongsArray = await Song.find({}, 'id title ds charts basic_info type').lean();
    const processedScores = [];

    for (const rec of allRecords) {
      // 提取并强力翻译落雪的 Type
      const rawType = String(rec.type || '').trim().toUpperCase();
      let lxType = 'SD'; 
      if (rawType === 'DX' || rawType === '1') lxType = 'DX';
      if (rawType === 'STANDARD' || rawType === '0' || rawType === 'SD') lxType = 'SD';

      // 提取 Lxns ID 和 Level
      const lxId = Number(rec.song_id || rec.music_id || rec.id);
      const lxLevelIndex = Number(rec.level_index !== undefined ? rec.level_index : rec.level);

      // 🔥 核心修补：水鱼数据双向容错匹配
      const song = allSongsArray.find(s => {
        const sId = Number(s.id);
        // 致命原因：水鱼数据库中，早期的旧曲可能压根没有存 type 字段！如果为空则默认视为 SD。
        const sType = String(s.type || 'SD').trim().toUpperCase();
        
        const isIdMatch = (sId === lxId || sId === lxId + 10000 || sId === lxId - 10000);
        const isTypeMatch = (sType === lxType);
        
        return isIdMatch && isTypeMatch;
      });

      if (!song) continue;

      let pf = 0, dxRatio = 0, constant = 0;
      const isNew = song.basic_info?.is_new || false;
      const isUtage = /^\[.+?\]/.test(rec.song_name || rec.title) || /^\[.+?\]/.test(song.title) || song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场';

      if (song.charts && song.charts[lxLevelIndex]) {
        const chartInfo = song.charts[lxLevelIndex];
        const totalNotes = chartInfo.notes ? chartInfo.notes.reduce((a, b) => a + b, 0) : 0;
        const maxDxScore = totalNotes * 3;
        
        constant = isUtage ? 0 : (song.ds[lxLevelIndex] || 0);
        const currentDxScore = rec.dxScore || rec.dx_score || 0; 
        
        dxRatio = maxDxScore > 0 ? (currentDxScore / maxDxScore) : 0;
        if (maxDxScore > 0) pf = calculatePF(constant, rec.achievements, currentDxScore, maxDxScore);
      }

      processedScores.push({
        userId: req.user.id, 
        nickname: 'LxOAuthPlayer', 
        imageUrl: `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`, 
        achievementRate: rec.achievements || 0, 
        songId: song.id, 
        songName: song.title, 
        achievement: rec.achievements || 0, 
        fcStatus: rec.fc || '', 
        fsStatus: rec.fs || '',
        dxScore: rec.dxScore || rec.dx_score || 0, 
        rating: Math.floor(rec.dx_rating || rec.ra || 0), 
        level: lxLevelIndex, 
        constant: isNaN(constant) || !isFinite(constant) ? 0 : constant, 
        finishTime: new Date(rec.play_time || rec.upload_time || Date.now()),
        pf: isNaN(pf) || !isFinite(pf) ? 0 : pf, 
        dxRatio: isNaN(dxRatio) || !isFinite(dxRatio) ? 0 : dxRatio, 
        isNew: isNew
      });
    }

    // 重新计算 Rating
    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + (rec.rating || 0), 0);

    await Score.deleteMany({ userId: req.user.id });
    await Score.insertMany(processedScores);

    const topRecordsByPf = [...processedScores].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    
    await User.findByIdAndUpdate(req.user.id, { 
      totalPf: Number(totalPf.toFixed(2)), 
      rating: calculatedRating 
    });

    res.json({ msg: `落雪全量同步成功！完美载入 ${processedScores.length} 条记录。`, rating: calculatedRating });
  } catch (err) { 
    console.error('落雪 OAuth 同步报错日志:', err.response?.data || err.message);
    const detail = err.response?.data?.message || err.response?.data?.msg || err.message || '未知错误';
    res.status(500).json({ msg: `落雪拒绝了请求: ${detail}` }); 
  }
});

app.get('/api/wiki/categories', async (req, res) => {
  try { res.json(await WikiCategory.find().sort({ createdAt: 1 })); } catch (err) { res.status(500).json({ msg: '获取维基分类失败' }); }
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
    if (!slug || !title || !categoryId || !content) return res.status(400).json({ msg: '请填写完整信息，包括分类' });

    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    let page = await WikiPage.findOne({ slug: formattedSlug });
    
    const currentUser = await User.findById(req.user.id || req.user._id);
    const isAdmin = currentUser && ['ADM', 'TO'].includes(currentUser.role);
    const newStatus = isAdmin ? 'APPROVED' : 'PENDING';

    if (page) {
      if (!page.history) page.history = [];
      page.history.push({
        title: page.title,
        content: page.content,
        editedBy: page.lastEditedBy,
        editedAt: page.updatedAt || new Date()
      });

      page.title = title; page.category = categoryId; page.content = content; page.lastEditedBy = currentUser._id; page.status = newStatus; page.isPendingUpdate = !isAdmin;
      await page.save();
      
      if (isAdmin) { 
        await addXp(currentUser._id, 30); 
        await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } }); 
        return res.json({ msg: '✅ 更新成功！经验+30，自动留存历史版本。' });
      }
      return res.json({ msg: '更新已提交审核并生成历史快照。' });
    } else {
      const newPage = new WikiPage({ title, slug: formattedSlug, category: categoryId, content, author: currentUser._id, lastEditedBy: currentUser._id, status: newStatus, isPendingUpdate: false });
      await newPage.save();
      if (isAdmin) { await addXp(currentUser._id, 50); await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } }); }
      return res.json({ msg: isAdmin ? '✅ 发布成功！' : '提交成功。' });
    }
  } catch (err) { res.status(500).json({ msg: '提交文章失败' }); }
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
    if (!page) return res.status(404).json({ msg: '文章不存在' });
    
    if (action === 'APPROVE') {
      page.status = 'APPROVED'; page.rejectReason = '';
      const xpReward = page.isPendingUpdate ? 30 : 50; 
      const targetUserId = page.isPendingUpdate ? page.lastEditedBy : page.author;
      
      await addXp(targetUserId, xpReward); 
      await User.findByIdAndUpdate(targetUserId, { $inc: { wikiApprovedCount: 1 } });
      
      await Message.create({
        receiver: targetUserId,
        sender: currentUser._id,
        type: 'SYSTEM',
        title: page.isPendingUpdate ? '📝 维基更新已通过' : '📝 新维基词条已收录',
        content: `恭喜！您${page.isPendingUpdate ? '更新' : '创建'}的维基词条 [${page.title}] 已通过审核并发布！\n经验值奖励: +${xpReward}`
      });
      
      page.isPendingUpdate = false;
    } else if (action === 'REJECT') {
      page.status = 'REJECTED'; page.rejectReason = rejectReason || '不符合规范';
      
      const targetUserId = page.isPendingUpdate ? page.lastEditedBy : page.author;
      await Message.create({
        receiver: targetUserId,
        sender: currentUser._id,
        type: 'SYSTEM',
        title: '❌ 维基审核未通过',
        content: `很遗憾，您提交的维基词条 [${page.title}] 未通过审核。\n原因: ${page.rejectReason}`
      });
    }
    await page.save(); res.json({ msg: `文章审核操作成功，已发送站内信通知！` });
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
  } catch (err) { res.status(500).json({ msg: '奖励发放失败' }); }
});


app.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const type = req.params.type;
    let sortQuery = {};
    switch(type) {
      case 'level': sortQuery = { xp: -1, createdAt: 1 }; break;
      case 'wiki': sortQuery = { wikiApprovedCount: -1, createdAt: 1 }; break;
      case 'feedback': sortQuery = { feedbackApprovedCount: -1, createdAt: 1 }; break;
      case 'checkin': sortQuery = { checkInCount: -1, createdAt: 1 }; break;
      case 'pf':
      default: sortQuery = { totalPf: -1, createdAt: 1 }; break;
    }
    const users = await User.find().sort(sortQuery).select('username uid avatarUrl totalPf rating role isRegistered isB50Visible xp level wikiApprovedCount feedbackApprovedCount checkInCount').limit(100);
    res.json(users);
  } catch (err) { res.status(500).json({ msg: '获取排行榜失败' }); }
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
    if (!code) return res.status(400).json({ msg: '未提供授权码(Code)' });

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

    const syncMode = req.body.mode || 'osu'; 
    const tokenRes = await axios.post('https://osu.ppy.sh/oauth/token', { client_id: Number(process.env.OSU_CLIENT_ID), client_secret: process.env.OSU_CLIENT_SECRET.trim(), grant_type: 'client_credentials', scope: 'public' });
    const token = tokenRes.data.access_token;

    const osuUserRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${user.osuId}/${syncMode}`, { headers: { Authorization: `Bearer ${token}` } });
    const osuStats = osuUserRes.data.statistics;

    user.osuPp = osuStats.pp; user.osuGlobalRank = osuStats.global_rank || 0; user.osuCountryRank = osuStats.country_rank || 0; user.osuMode = syncMode; 
    await user.save();

    const bpRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${user.osuId}/scores/best?mode=${syncMode}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    await OsuScore.deleteMany({ userId: user._id });
    
    const bpDocs = bpRes.data.map(s => ({ userId: user._id, beatmapId: s.beatmap.id, title: s.beatmapset.title, version: s.beatmap.version, accuracy: s.accuracy * 100, mods: s.mods.map(m => m.acronym || m), pp: s.pp, grade: s.rank, coverUrl: s.beatmapset.covers.list, playedAt: s.created_at }));
    await OsuScore.insertMany(bpDocs);

    res.json({ msg: `同步成功！` });
  } catch (err) { res.status(500).json({ msg: '数据拉取失败' }); }
});

// ==========================================
// 🎵 [v1.2.3] 单曲排行榜 (全局 / 好友)
// ==========================================
app.get('/api/songs/:songId/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { level, scope } = req.query;
    const songId = req.params.songId;

  let query = { 
      songId: { $in: [String(songId), Number(songId)] }, 
      level: Number(level) 
    };   
    if (scope === 'friends') {
      if (!req.user) return res.status(401).json({ msg: '请先登录以查看好友排行榜' });
      const currentUser = await User.findById(req.user.id);
      
      if (!currentUser || (currentUser.sponsorTier || 0) < 1) {
        return res.status(403).json({ msg: '好友排行榜特权需要 赞助者 Tier 1 或以上' });
      }
      
      const friendIds = currentUser.friends || [];
      query.userId = { $in: [...friendIds, currentUser._id] };
    }

    const leaderboard = await Score.aggregate([
      { $match: query },
      { $sort: { achievement: -1, dxScore: -1 } }, 
      { $limit: 100 },
      {
        $lookup: {
          from: 'users', 
          let: { uId: '$userId' }, 
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', { $convert: { input: '$$uId', to: 'objectId', onError: '$$uId', onNull: '$$uId' } }] } } }
          ],
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          _id: 1,
          achievement: 1,
          dxScore: 1,
          pf: 1,
          rating: 1,
          fcStatus: { $ifNull: ['$fc', '$fcStatus'] }, 
          fsStatus: { $ifNull: ['$fs', '$fsStatus'] },
          username: '$userInfo.username',
          avatarUrl: '$userInfo.avatarUrl',
          uid: '$userInfo.uid',
          sponsorTier: '$userInfo.sponsorTier'
        }
      }
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error('[单曲排行榜报错]', err);
    res.status(500).json({ msg: '获取单曲排行榜失败' });
  }
});

// --- [1.2.5新增] 获取用户好友列表（用于主页好友按钮） ---
app.get('/api/users/:username/friends', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate({
        path: 'friends',
        select: 'username uid avatarUrl bannerUrl totalPf rating isB50Visible pfRank role',
        options: { lean: true }
      });

    if (!user) return res.status(404).json({ msg: '用户不存在' });

    // 可以在这里根据需要进行二次处理，例如重新计算实时排名
    const friendsList = user.friends || [];
    
    res.json(friendsList);
  } catch (err) {
    console.error('获取好友列表报错:', err);
    res.status(500).json({ msg: '获取好友列表失败' });
  }
});

// ==========================================
// CHUNITHM 曲库管理接口
// ==========================================

// 1. 从水鱼 API 同步 CHUNITHM 全量曲库 (建议加上管理员权限中间件)
app.post('/api/chunithm-songs/sync', async (req, res) => {
  try {
    const response = await axios.get('https://www.diving-fish.com/api/chunithmprober/music_data', {
      timeout: 15000
    });
    
    const songs = response.data;
    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({ msg: '获取到的曲库数据无效' });
    }

    // 清空旧数据并插入新数据 (原子化操作推荐使用 bulkWrite，但这里为了简便先 deleteMany)
    await ChunithmSong.deleteMany({});
    await ChunithmSong.insertMany(songs);

    res.json({ msg: `CHUNITHM 曲库同步成功！共载入 ${songs.length} 首歌曲。` });
  } catch (err) {
    console.error('CHUNITHM 曲库同步失败:', err);
    res.status(500).json({ msg: '同步失败，请检查网络或水鱼服务器状态' });
  }
});

// 2. 前端拉取 CHUNITHM 曲库
app.get('/api/chunithm-songs', async (req, res) => {
  try {
    // 按 ID 降序排列，通常新歌 ID 较大
    const songs = await ChunithmSong.find({}).sort({ id: -1 }); 
    res.json(songs);
  } catch (err) {
    res.status(500).json({ msg: '获取 CHUNITHM 曲库失败' });
  }
});

// ==========================================
// 用户设置中心 API (Settings)
// ==========================================

// 1. 拉取当前用户的所有设置项
app.get('/api/users/settings/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('location occupation website twitter birthday isB50Visible email');
    if (!user) return res.status(404).json({ msg: '用户不存在' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: '获取设置失败' });
  }
});

// 2. 储存个人资料更新
app.put('/api/users/settings/profile', authMiddleware, async (req, res) => {
  try {
    const { location, occupation, website, twitter, birthday } = req.body;
    await User.findByIdAndUpdate(req.user.id, { 
      location, occupation, website, twitter, birthday 
    });
    res.json({ msg: '资料更新成功' });
  } catch (err) {
    res.status(500).json({ msg: '资料更新失败' });
  }
});

// 3. 储存隐私设置更新
app.put('/api/users/settings/privacy', authMiddleware, async (req, res) => {
  try {
    const { isB50Visible } = req.body;
    await User.findByIdAndUpdate(req.user.id, { isB50Visible });
    res.json({ msg: '隐私设置更新成功' });
  } catch (err) {
    res.status(500).json({ msg: '隐私设置更新失败' });
  }
});

// 4. 危险操作：申请注销账号
app.post('/api/users/settings/request-deletion', authMiddleware, async (req, res) => {
  try {
    // 将状态改为 PENDING（犹豫期），并记录申请时间
    await User.findByIdAndUpdate(req.user.id, { 
      deletionStatus: 'PENDING',
      deletionRequestDate: new Date()
    });
    // [TODO] 这里后续可以接入 Nodemailer 给站长发邮件通知
    res.json({ msg: '注销申请已提交，账号进入犹豫期' });
  } catch (err) {
    res.status(500).json({ msg: '申请提交失败' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Current Server Time: ${new Date().toLocaleString()}`);
});