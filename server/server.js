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
    folder: 'msc2026_profiles', // 自动在云端创建的文件夹名
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1000, crop: 'limit' }] // 自动调整大图尺寸
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

// --- 刚才创建的模型文件 ---
const User = require('./models/User');
const Score = require('./models/Score');
const app = express();

// --- 中间件配置 ---
app.use(cors());
app.use(express.json()); // 解析 JSON 请求体

// --- 数据库连接 ---
// 使用环境变量中的 MONGO_URI 连接
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // 连接失败直接退出进程
    });

// ==========================================
// 辅助工具与中间件
// ==========================================

// ==========================================
// 辅助工具与中间件
// ==========================================
// (在 authMiddleware 下方添加这个函数)

const addXp = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    user.xp = (user.xp || 0) + amount;
    // 核心算法：1级开始，每 300 经验升 1 级，无穷无尽！
    user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
  } catch (err) {
    console.error('加经验失败:', err);
  }
};

// JWT 验证中间件 (保护需要登录的路由)
const authMiddleware = (req, res, next) => {
    // 从请求头获取 Token (格式: Bearer <token>)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ msg: '无权限，请先登录' });
    }

    try {
        // 验证 Token 是否合法
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // 将解密出的用户ID存入 req.user，供后续路由使用
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token 无效或已过期' });
    }
};

// ==========================================
// API 路由逻辑
// ==========================================

// --- A. 认证模块 (注册/登录/自动登录) ---

// 1. 注册账号
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 检查用户名是否存在
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ msg: '该用户名已被占用' });

        // 密码加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // 注意：生产环境中最好用原子计数器防止重复，但小规模比赛随机碰撞概率极低
        let randomUid;
        let uidExists = true;
        while (uidExists) {
            randomUid = Math.floor(10000 + Math.random() * 90000);
            const checkUid = await User.findOne({ uid: randomUid });
            if (!checkUid) uidExists = false;
        }

        // 创建新用户
        const newUser = new User({
            username,
            password: hashedPassword,
            uid: randomUid,
        });

        const savedUser = await newUser.save();

        // 注册成功后直接签发 Token 实现自动登录
        const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: savedUser._id,
                username: savedUser.username,
                isRegistered: false
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 2. 登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: '用户不存在' });

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: '密码错误' });

        // 签发 Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                isRegistered: user.isRegistered,
                nickname: user.nickname,
                // [新增] 登录返回 PF 与水鱼账号信息
                totalPf: user.totalPf || 0,
                divingFishUsername: user.divingFishUsername,
                proberUsername: user.proberUsername
            }
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 3. 验证 Token (用于页面刷新后的自动登录)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password') // 不返回密码
	.populate('friends', 'username uid avatarUrl totalPf rating isB50Visible');
        if (!user) return res.status(404).json({ msg: '用户未找到' });
	const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
        if (user.lastLoginDate !== today) {
          user.lastLoginDate = today;
          user.xp = (user.xp || 0) + 10;
          user.level = Math.floor(user.xp / 300) + 1;
          await user.save();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// ==========================================
// [原有+新增] 同步水鱼查分器成绩并结算 PF 分 (普通查分器版本)
// ==========================================
app.post('/api/users/sync-diving-fish', async (req, res) => {
  // 1. JWT 鉴权验证
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: '请先登录' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);

    if (!user.divingFishUsername) {
      return res.status(400).json({ message: '请先在个人主页绑定水鱼查分器用户名！' });
    }

    // 2. 请求水鱼 API
    const dfResponse = await axios.post('https://www.diving-fish.com/api/maimaidxprober/query/player', {
      username: user.divingFishUsername
    });

    const allRecords = [...(dfResponse.data.records || []), ...(dfResponse.data.records_new || [])];
    let processedScores = [];

    // 3. 遍历计算每首歌的 PF
    for (const record of allRecords) {
      const song = await Song.findOne({ id: record.song_id.toString() });
      if (!song) continue; 

      const chartInfo = song.charts[record.level_index];
      if (!chartInfo) continue;

      const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0);
      const maxDxScore = totalNotes * 3;

      const constant = record.ds || song.ds[record.level_index];

      // ✨ 调用我们写的计算器 ✨
      const dxRatio = maxDxScore > 0 ? (record.dxScore / maxDxScore) : 0;
      const pf = calculatePF(constant, record.achievements, record.dxScore, maxDxScore);

      processedScores.push({
        userId: userId, // 统一使用 userId 适配你的原版 Score.js
        songId: song.id,
        songName: record.title,
        difficulty: record.level_index,
        level: record.level,
        achievement: record.achievements, // 统一使用 achievement
        dxScore: record.dxScore,
        fc: record.fc,
        fs: record.fs,
        rating: record.ra,
        // 新增的 PF 字段
        pf: pf,
        dxRatio: dxRatio,
        constant: constant,
        finishTime: new Date()
      });
    }

    // 4. 更新数据库：先删旧成绩，再插新成绩
    await Score.deleteMany({ userId: userId });
    await Score.insertMany(processedScores);

    // 5. 结算玩家的 Total PF (取 PF 最高的 50 首歌)
    const top50 = processedScores
      .sort((a, b) => b.pf - a.pf)
      .slice(0, 50);
    
    const totalPf = top50.reduce((sum, score) => sum + score.pf, 0);

    // 6. 更新用户总分并保存
    user.totalPf = Number(totalPf.toFixed(2));
    await user.save();

    res.json({ 
      message: '数据同步成功！', 
      totalPf: user.totalPf,
      syncedCount: processedScores.length 
    });

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

// 提交比赛报名信息 (需要登录)
app.post('/api/match/register', authMiddleware, async (req, res) => {
    try {
        // 解构新的字段
        const { nickname, contactType, contactValue, prizeWish, intro } = req.body;
        
        // 1. 必填验证
        if (!nickname || !contactValue) {
            return res.status(400).json({ msg: '昵称和联系方式内容为必填项' });
        }

        // 2. 更新用户信息 (注意这里对应 User.js 的新字段)
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                isRegistered: true,
                nickname,
                contactType,
                contactValue,
                prizeWish,
                intro,
                regTime: new Date() // 自动记录服务器时间
            },
            { new: true }
        );
	await addXp(req.user.id, 200); // 赛事报名奖励

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '报名提交失败' });
    }
});

// --- C. 榜单模块 (带简单缓存) ---

let leaderboardCache = {
    data: null,
    lastUpdated: 0
};
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时 (毫秒)

app.get('/api/leaderboard', async (req, res) => {
    try {
        const now = Date.now();

        // 检查缓存是否有效
        // if (leaderboardCache.data && (now - leaderboardCache.lastUpdated < CACHE_DURATION)) {
        // return res.json(leaderboardCache.data);
        // }
        // console.log('Fetching Leaderboard from DB...');
        // 排序逻辑：完成率降序 > DX分降序 > 完成时间升序
        const scores = await Score.find()
            .sort({ achievement: -1, dxScore: -1, finishTime: 1 })
            .limit(100); 

        // 更新缓存
        // leaderboardCache.data = scores;
        // leaderboardCache.lastUpdated = now;

        res.json(scores);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '获取榜单失败' });
    }
});

// (可选) 强制刷新榜单 API - 供管理员手动调用
app.get('/api/leaderboard/refresh', async (req, res) => {
    leaderboardCache.data = null;
    res.json({ msg: '缓存已清除，下次请求将从数据库拉取最新数据' });
});

// --- D. 系统工具模块 ---

// 获取服务器时间 (防止客户端篡改时间)
app.get('/api/time', (req, res) => {
    res.json({
        serverTime: new Date(), // ISO 格式
        timestamp: Date.now()   // 时间戳格式
    });
});

// --- E. 个人资料模块 (Profile) ---
// POST /api/upload
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  try {
    // req.file.path 就是 Cloudinary 返回的图片 URL
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ msg: '图片上传失败' });
  }
});

// GET /api/users/search - 玩家模糊搜索接口
app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query; // 获取前端传来的搜索词
    
    // 如果搜索词为空，直接返回空数组
    if (!q || q.trim() === '') {
      return res.json([]);
    }

    // 使用聚合管道进行跨类型模糊搜索
    const users = await User.aggregate([
      {
        // 1. 临时将数字型 uid 转换为字符串型 uidString
        $addFields: { 
          uidString: { $toString: "$uid" } 
        }
      },
      {
        // 2. 匹配逻辑：用户名 或 UID 字符串 包含搜索词（忽略大小写）
        $match: {
          $or: [
            { username: { $regex: q, $options: 'i' } }, // i 代表忽略大小写
            { uidString: { $regex: q, $options: 'i' } }
          ]
        }
      },
      { 
        // 3. 限制返回结果数量，防止搜索 "a" 导致服务器卡死
        $limit: 10 
      },
      { 
        // 4. 数据清洗：坚决不能把密码等隐私返回给前端！只返回必要展示字段
        $project: { 
          _id: 1, 
          username: 1, 
          uid: 1, 
          avatarUrl: 1, 
          isRegistered: 1,
          role: 1 
        } 
      }
    ]);

    res.json(users);
  } catch (err) {
    console.error('搜索接口错误:', err);
    res.status(500).json({ msg: '服务器搜索错误' });
  }
});

// 1. 获取特定用户的公开资料 (包含成绩)
// 路由: GET /api/users/:username
app.get('/api/users/:username', async (req, res) => {
    try {
        // A. 查用户基础信息
        // 使用 .select('-password') 排除密码等敏感信息
        const user = await User.findOne({ username: req.params.username })
            .select('-password -contactValue -contactType')
	    .populate('friends', 'username uid avatarUrl totalPf rating isB50Visible');
        
        if (!user) return res.status(404).json({ msg: '用户不存在' });

        // [新增] 计算站内 PF 排名
        let pfRank = '-';
        if (user.totalPf && user.totalPf > 0) {
            pfRank = await User.countDocuments({ totalPf: { $gt: user.totalPf } }) + 1;
        }
	const allScores = await Score.find({ userId: user._id }).lean();

// 🔥 机制 A：查该用户的 B50 成绩 (按 Rating 降序，供卡片区使用)
        const topScores = await Score.find({ userId: user._id })
            .sort({ rating: -1, achievement: -1 })
            .limit(50);

        // [新增] 查该用户的 PF 历史最佳成绩 (Top 50)
        const topPfScores = await Score.find({ userId: user._id })
            .sort({ pf: -1 })
            .limit(50);


        // C. 查好友 (暂时只返回空数组或简单的计数，后续完善)
        // const friends = await User.find({ '_id': { $in: user.friends } }).select('username avatarUrl');

            const qualifierScores = await QualifierScore.find({ userId: user._id }).sort({ entryTime: -1 });

        res.json({
            ...user.toObject(),
	    allScores: allScores || [],
            topScores: topScores || [],       
            pfRank: pfRank,               
            topPfScores: topPfScores || [],  
            qualifierScores: qualifierScores || [], // 🔥 把预选赛成绩塞给前端
            friendsCount: user.friends ? user.friends.length : 0,
            friends: user.friends 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 2. 更新我的资料 (需要登录)
// 路由: PUT /api/users/profile
app.put('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const { bio, avatarUrl, bannerUrl, divingFishUsername, proberUsername, isB50Visible } = req.body;

        // 构建更新对象 (只允许更新这几个字段)
        const updateFields = {};
        if (bio !== undefined) updateFields.bio = bio;
        if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
        if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;
        if (isB50Visible !== undefined) updateFields.isB50Visible = isB50Visible;
        
        // [新增] 支持用户手动更新水鱼账号绑定
        if (divingFishUsername !== undefined) updateFields.divingFishUsername = divingFishUsername;
        if (proberUsername !== undefined) updateFields.proberUsername = proberUsername;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true } // 返回更新后的数据
        ).select('-password');

        res.json(updatedUser);

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: '更新失败' });
    }
});

// === 公告系统 API ===

// 1. 获取所有公告 (所有人都能看)
app.get('/api/announcements', async (req, res) => {
  try {
    // 按时间倒序排列，最新的在最前面
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ msg: '获取公告失败' });
  }
});

// 2. 发布新公告 (只有 ADM 能发)
// 注意：这里需要用到你的 authMiddleware 来验证用户是否登录
app.post('/api/announcements', authMiddleware, async (req, res) => {
  try {
    // 绝对安全防御：检查发布者是不是真的 ADM
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') {
      return res.status(403).json({ msg: '🚨 权限不足：只有管理员可以发布公告！' });
    }

    const { title, type, content } = req.body;
    if (!title || !content) return res.status(400).json({ msg: '标题和内容不能为空' });

    const newAnnouncement = new Announcement({
      title,
      type: type || 'NEWS',
      content,
      author: user._id
    });
    
    await newAnnouncement.save();
    res.json({ msg: '公告发布成功！', data: newAnnouncement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '发布失败，服务器错误' });
  }
});

// === ADM 全量曲库同步 (权限校验修复版) ===
app.post('/api/admin/sync-songs', authMiddleware, async (req, res) => {
  try {
    // 🔥 修复点：不能直接查 req.user.role（Token里没有），必须去数据库查出你的真身！
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') {
      return res.status(403).json({ msg: '权限不足：服务器未能识别您的 ADM 身份' });
    }

    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/music_data');
    const songs = response.data;

    // 清除错误的旧索引
    await Song.collection.dropIndexes().catch(() => {});

    // 直接用绝对唯一的 id 覆盖写入
    const bulkOps = songs.map(song => ({
      updateOne: {
        filter: { id: String(song.id) }, 
        update: {
          $set: {
            id: String(song.id),
            title: song.title,
            type: song.type,
            ds: song.ds,
            level: song.level,
            basic_info: song.basic_info,
            charts: song.charts // 🔥 确保物量数据 100% 写入数据库
          }
        },
        upsert: true
      }
    }));

    await Song.bulkWrite(bulkOps);
    res.json({ msg: `✅ 成功同步 ${songs.length} 首乐曲，物量数据已全量保存！` });
  } catch (err) {
    console.error('[曲库同步报错]', err);
    res.status(500).json({ msg: '曲库同步失败，请检查网络或后端日志' });
  }
});


// ==========================================
// 好友系统 API (Friend System)
// ==========================================

// 1. 发送好友请求 (并同步发送站内信)
app.post('/api/users/:username/friend-request', authMiddleware, async (req, res) => {
  try {
    const sender = await User.findById(req.user.id);
    const receiver = await User.findOne({ username: req.params.username });

    if (!receiver) return res.status(404).json({ message: '目标用户不存在' });
    if (sender._id.toString() === receiver._id.toString()) return res.status(400).json({ message: '不能添加自己为好友' });

    // 赞助分级栏位计算法则
    const getFriendLimit = (tier) => {
      if (tier === 2) return 5000;
      if (tier === 1) return 300;
      return 50; // 默认普通用户
    };

    const senderLimit = getFriendLimit(sender.sponsorTier || 0);
    const receiverLimit = getFriendLimit(receiver.sponsorTier || 0);

    // 容量上限拦截
    if (sender.friends.length >= senderLimit) {
      return res.status(400).json({ message: `你的好友数量已达上限 (${senderLimit})，请升级赞助档位或清理好友` });
    }
    if (receiver.friends.length >= receiverLimit) {
      return res.status(400).json({ message: '对方的好友栏位已满，无法接收新请求' });
    }

    // 重复性拦截
    if (receiver.friends.includes(sender._id)) {
      return res.status(400).json({ message: '你们已经是好友了' });
    }
    if (receiver.friendRequests.includes(sender._id)) {
      return res.status(400).json({ message: '你已经发送过请求，请耐心等待对方同意' });
    }

    // 将发送者的 ID 推入接收者的“待处理请求列表”
    receiver.friendRequests.push(sender._id);
    await receiver.save();

    // 🔥 核心新增：向对方的收件箱发送一封带按钮的“好友请求邮件”
    const friendRequestMsg = new Message({
      receiver: receiver._id,
      sender: sender._id,
      type: 'FRIEND_REQUEST',
      title: '📬 新的好友申请',
      content: `玩家 [${sender.username}] 希望添加你为好友！`,
      actionData: { senderId: sender._id } // 绑定发送者的 ID，供前端展示“同意/拒绝”按钮使用
    });
    await friendRequestMsg.save();

    res.json({ message: '好友申请已发送，请等待对方查收信件！' });
  } catch (err) {
    console.error('发送请求失败:', err);
    res.status(500).json({ message: '请求发送失败，请稍后重试' });
  }
});

// 2. 同意好友申请
app.post('/api/users/friend-request/accept', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);
    const sender = await User.findById(senderId);

    if (!sender) return res.status(404).json({ message: '发送者不存在' });

    // 从接收者的“待处理列表”中移除
    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);

    // 互相添加好友 (自动去重)
    if (!receiver.friends.includes(senderId)) receiver.friends.push(senderId);
    if (!sender.friends.includes(receiver._id)) sender.friends.push(receiver._id);

    await receiver.save();
    await sender.save();

    // 自动将这封请求信件标记为已读
    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });

    res.json({ message: '已成功添加为好友！' });
  } catch (err) {
    res.status(500).json({ message: '操作失败' });
  }
});

// 3. 拒绝好友申请
app.post('/api/users/friend-request/reject', authMiddleware, async (req, res) => {
  try {
    const { senderId, messageId } = req.body;
    const receiver = await User.findById(req.user.id);

    // 从待处理列表中移除即可
    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
    await receiver.save();

    if (messageId) await Message.findByIdAndUpdate(messageId, { isRead: true });

    res.json({ message: '已拒绝该申请' });
  } catch (err) {
    res.status(500).json({ message: '操作失败' });
  }
});

// ==========================================
// 收件箱与邮件系统 API (Inbox System)
// ==========================================

// 1. 获取当前登录用户的收件箱列表
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ receiver: req.user.id })
      .populate('sender', 'username avatarUrl')
      .sort({ createdAt: -1 }); // 最新收到的在最前面
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: '获取收件箱失败' });
  }
});

// 2. 获取未读消息数量 (供主页右上角小红点使用)
app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: '获取未读数失败' });
  }
});

// 3. 标记信件为已读
app.patch('/api/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message || message.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: '无权操作' });
    }
    message.isRead = true;
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: '操作失败' });
  }
});

// 4. [ADM 专属] 按 UID 向指定玩家发送系统邮件
app.post('/api/admin/send-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });

    const { targetUid, title, content } = req.body;
    if (!targetUid || !title || !content) return res.status(400).json({ message: '请填写完整信息' });

    // 通过 UID 查找接收人
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ message: '未找到该 UID 对应的玩家' });

    // 生成并保存系统邮件
    const newMessage = new Message({
      receiver: targetUser._id,
      sender: admin._id,
      type: 'ADM_DIRECT',
      title,
      content
    });

    await newMessage.save();
    res.json({ message: `成功向 ${targetUser.username} (UID:${targetUid}) 发送了邮件！` });
  } catch (err) {
    res.status(500).json({ message: '邮件发送失败' });
  }
});

// [ADM 专属] 全局广播邮件：向全站所有注册玩家发送
app.post('/api/admin/broadcast-message', authMiddleware, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'ADM') return res.status(403).json({ message: '权限不足' });

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: '标题和内容不能为空' });

    // 1. 获取所有玩家的 ID
    const allUsers = await User.find({}, '_id');
    
    // 2. 构造邮件数组
    const messages = allUsers.map(u => ({
      receiver: u._id,
      sender: admin._id,
      type: 'SYSTEM', // 全局邮件统一标记为系统类型
      title: `📢 ${title}`,
      content: content
    }));

    // 3. 使用 insertMany 高效批量插入数据库
    await Message.insertMany(messages);

    res.json({ message: `广播成功！已向 ${allUsers.length} 位玩家投递邮件。` });
  } catch (err) {
    console.error('广播失败:', err);
    res.status(500).json({ message: '服务器内部错误，广播失败' });
  }
});

// === [ADM/TO 专属] 录入/更新预选赛单曲成绩与智能通知 ===
app.post('/api/admin/qualifier-score', authMiddleware, async (req, res) => {
  try {
    // 1. 校验裁判身份
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || !['ADM', 'TO'].includes(adminUser.role)) {
      return res.status(403).json({ msg: '权限不足：仅考官或管理员可录入成绩' });
    }

    const { targetUid, songName, level, achievement, dxScore } = req.body;
    
    if (!targetUid || !songName || !achievement) {
      return res.status(400).json({ msg: '请填写完整的比赛记录信息' });
    }

    // 2. 找到参赛选手
    const targetUser = await User.findOne({ uid: targetUid });
    if (!targetUser) return res.status(404).json({ msg: '未找到该 UID 的选手' });

    // 难度映射表，用于邮件显示
    const levelMap = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
    const levelStr = levelMap[Number(level)] || 'UNKNOWN';

    // 3. 核心逻辑：检查是否是“刷榜更新”
    const existingScore = await QualifierScore.findOne({ 
      userId: targetUser._id, 
      songName: songName // 同一首歌视为同一条比赛记录
    });

    const Message = require('./models/Message'); // 引入站内信模型

    if (existingScore) {
      // ---> 场景 A：玩家刷榜更新成绩 <---
      existingScore.level = Number(level);
      existingScore.achievement = Number(achievement);
      existingScore.dxScore = Number(dxScore || 0);
      existingScore.entryBy = adminUser.username;
      existingScore.entryTime = Date.now();
      await existingScore.save();

      // 发送【更新】邮件
      await Message.create({
        receiver: targetUser._id,
        sender: adminUser._id,
        type: 'SYSTEM',
        title: '🔄 您的预选赛成绩已更新',
        content: `你好！你（选手：${targetUser.username}）的预选赛成绩：\n[${songName}] [${levelStr}] [${Number(achievement).toFixed(4)}%] [${dxScore || 0}]\n已成功更新，详情查看该赛事的预选赛成绩列表。\n如果有疑问，请向该赛事主办方及时反馈。`
      });

      return res.json({ msg: `成绩更新成功！已向选手 ${targetUser.username} 发送更新邮件。` });

    } else {
      // ---> 场景 B：录入全新的歌曲成绩 <---
      const newQScore = new QualifierScore({
        userId: targetUser._id,
        songName,
        level: Number(level),
        achievement: Number(achievement),
        dxScore: Number(dxScore || 0),
        entryBy: adminUser.username
      });
      await newQScore.save();

      // 统计该选手目前录入了几首歌
      const scoreCount = await QualifierScore.countDocuments({ userId: targetUser._id });

      // 当且仅当录满 3 首歌时，发送【汇总】邮件
      if (scoreCount === 3) {
        const allScores = await QualifierScore.find({ userId: targetUser._id }).sort({ entryTime: 1 });
        
        let scoresText = '';
        allScores.forEach(score => {
          const sLevelStr = levelMap[score.level] || 'UNKNOWN';
          scoresText += `[${score.songName}] [${sLevelStr}] [${score.achievement.toFixed(4)}%] [${score.dxScore || 0}]\n`;
        });

        await Message.create({
          receiver: targetUser._id,
          sender: adminUser._id,
          type: 'SYSTEM',
          title: '🎉 您的预选赛成绩已全部录入！',
          content: `你好！你（选手：${targetUser.username}）的预选赛成绩：\n${scoresText}已成功录入，详情查看该赛事的预选赛成绩列表。\n如果有疑问，请向赛事主办方及时反馈。`
        });

        return res.json({ msg: `第 3 首歌录入成功！已向选手 ${targetUser.username} 发送成绩汇总邮件。` });
      }

      return res.json({ msg: `录入成功！该选手目前已录入 ${scoreCount}/3 首曲目。` });
    }

  } catch (err) {
    console.error('[录入赛事成绩报错]', err);
    res.status(500).json({ msg: '服务器错误，录入失败' });
  }
});

// === [公共接口] 获取预选赛全局总分排行榜 ===
app.get('/api/leaderboard/qualifiers', async (req, res) => {
  try {
    const leaderboard = await QualifierScore.aggregate([
      {
        // 1. 按选手分组，计算他们录入的曲目总达成率和总DX分
        $group: {
          _id: '$userId',
          totalAchievement: { $sum: '$achievement' },
          totalDxScore: { $sum: '$dxScore' },
          playCount: { $sum: 1 } // 统计已经录入了几首歌
        }
      },
      {
        // 2. 连表查询，获取选手的名字、头像、UID
        $lookup: {
          from: 'users', // 注意 MongoDB 中集合名是小写复数
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' }, 
      {
        // 3. 整理发给前端的数据格式
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userInfo.nickname', '$userInfo.username'] },
          avatarUrl: '$userInfo.avatarUrl',
          uid: '$userInfo.uid',
          totalAchievement: 1,
          totalDxScore: 1,
          playCount: 1
        }
      },
      {
        // 4. 终极排名：总达成率降序，同分看总 DX 降序
        $sort: { totalAchievement: -1, totalDxScore: -1 }
      }
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error('[预选赛榜单报错]', err);
    res.status(500).json({ msg: '获取排行榜失败' });
  }
});

// ==========================================
// 反馈大厅 API (Feedback System)
// ==========================================

// 1. 获取所有反馈 (处理 90 天 Closed，按置顶和时间排序，并带出回复者的信息)
app.get('/api/feedback', async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await Feedback.updateMany(
      { status: { $ne: 'CLOSED' }, statusUpdatedAt: { $lt: ninetyDaysAgo } },
      { $set: { status: 'CLOSED', statusUpdatedAt: new Date() } }
    );

    const feedbacks = await Feedback.find()
      .populate('author', 'username avatarUrl role')
      .populate('replies.author', 'username avatarUrl role') // 联表查询回复者的信息
      .sort({ isPinned: -1, updatedAt: -1 }); // 先按置顶降序排列，再按时间降序
      
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: '获取反馈失败' });
  }
});

// 2. 提交新反馈 (需登录)
app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { title, content, type } = req.body;
    if (!title || !content || !type) return res.status(400).json({ message: '请填写完整信息' });

    const newFeedback = new Feedback({
      author: req.user.id,
      title,
      content,
      type
    });
    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ message: '发布反馈失败' });
  }
});

// 3. 重编/修改反馈 (仅限作者本人)
app.put('/api/feedback/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: '反馈不存在' });
    if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '无权修改' });

    // 更新内容，状态强制重置为 PENDING
    feedback.title = req.body.title || feedback.title;
    feedback.content = req.body.content || feedback.content;
    feedback.type = req.body.type || feedback.type;
    feedback.status = 'PENDING';
    feedback.statusUpdatedAt = Date.now();
    
    await feedback.save();
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: '修改失败' });
  }
});

// 4. 删除反馈 (作者本人 或 ADM)
app.delete('/api/feedback/:id', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: '反馈不存在' });
    
    const user = await User.findById(req.user.id);
    if (feedback.author.toString() !== req.user.id && user.role !== 'ADM') {
      return res.status(403).json({ message: '无权删除' });
    }

    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: '反馈已删除' });
  } catch (err) {
    res.status(500).json({ message: '删除失败' });
  }
});

// 5. 状态流转操作 (ADM解决 / 作者重申)
app.patch('/api/feedback/:id/status', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; // 'SOLVE' or 'REAPPEAL'
    const feedback = await Feedback.findById(req.params.id);
    const user = await User.findById(req.user.id);
    if (!feedback) return res.status(404).json({ message: '反馈不存在' });

    if (action === 'SOLVE') {
      if (user.role !== 'ADM') return res.status(403).json({ message: '仅管理员可标记为已解决' });
      feedback.status = 'SOLVED';
      feedback.statusUpdatedAt = Date.now();
      await addXp(feedback.author, 100);
      await User.findByIdAndUpdate(feedback.author, { $inc: { feedbackApprovedCount: 1 } });
    } 
    else if (action === 'REAPPEAL') {
      if (feedback.author.toString() !== req.user.id) return res.status(403).json({ message: '仅发起者可要求重申' });
      if (feedback.status !== 'SOLVED') return res.status(400).json({ message: '当前状态不可重申' });
      
      const hoursSinceSolved = (Date.now() - new Date(feedback.statusUpdatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceSolved < 2) return res.status(400).json({ message: '标记为已解决至少 2 小时后才可申请重申' });

      feedback.status = 'PENDING';
      feedback.statusUpdatedAt = Date.now();
    }
    
    await feedback.save();
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: '状态更新失败' });
  }
});

// 6. 切换置顶状态 (仅限 ADM)
app.patch('/api/feedback/:id/pin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'ADM') return res.status(403).json({ message: '权限不足' });

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: '反馈不存在' });

    feedback.isPinned = !feedback.isPinned; // 切换置顶状态
    await feedback.save();
    
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: '置顶操作失败' });
  }
});

// 7. 添加回复 (需登录)
app.post('/api/feedback/:id/reply', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: '回复内容不能为空' });

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: '反馈不存在' });

    feedback.replies.push({
      author: req.user.id,
      content: content.trim()
    });

    await feedback.save();
    res.status(201).json({ message: '回复成功' });
  } catch (err) {
    res.status(500).json({ message: '回复失败' });
  }
});

// === 玩家成绩同步 API (Import-Token 毫秒级防爆版) ===
app.post('/api/users/sync-maimai', authMiddleware, async (req, res) => {
  try {
    const { importToken } = req.body;
    
    if (!importToken) return res.status(400).json({ msg: '请提供有效的 Import-Token' });

    // 1. 向水鱼官方 GET 端点发起请求 (去除坑人的 User-Agent 伪装，防止触发 CF 指纹拦截)
    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/player/records', {
      headers: { 
        'Import-Token': importToken.trim(),
        'Accept': 'application/json'
      },
      timeout: 20000 // 给足 20 秒，确保 1500+ 首成绩能完整下载完
    });

    const data = response.data;

    // 2. 严密的数据校验
    if (!data || !data.records || !Array.isArray(data.records)) {
      return res.status(400).json({ msg: '水鱼返回了无法解析的成绩格式。' });
    }
    if (data.records.length === 0) {
      return res.status(400).json({ msg: '在您的水鱼账号中未找到打歌记录！' });
    }

    const playerRating = data.rating || 0; 
    const allRecords = data.records;

// 🔥 仅凭全局唯一的 ID 构建字典
    const allSongsArray = await Song.find({}, 'id title ds charts basic_info').lean();
    const songMap = new Map();
    allSongsArray.forEach(song => {
      songMap.set(String(song.id), song); 
    });

    // 3. 极速内存计算
    const processedScores = allRecords.map(rec => {
      // 🔥 直接用成绩单的 song_id 去字典里拿歌
      const song = songMap.get(String(rec.song_id));
      let pf = 0, dxRatio = 0, constant = rec.ds || 0;
      let isNew = false;
      
      if (song) {
        isNew = song.basic_info?.is_new || false; 
        
        // 如果数据库里成功存入了物量 (charts)
        if (song.charts && song.charts[rec.level_index]) {
          const chartInfo = song.charts[rec.level_index];
          // 计算满分 DX
          const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0);
          const maxDxScore = totalNotes * 3;
          
          constant = rec.ds || song.ds[rec.level_index];
          dxRatio = maxDxScore > 0 ? (rec.dxScore / maxDxScore) : 0;
          
          // 引擎启动，算出真实的 PF 分！
          if (maxDxScore > 0) {
             pf = calculatePF(constant, rec.achievements, rec.dxScore, maxDxScore);
          }
        }
      }
      
      return {
        userId: req.user.id,
        nickname: data.nickname || 'MaimaiPlayer', 
        imageUrl: `https://www.diving-fish.com/covers/${String(rec.song_id).padStart(5, '0')}.png`, 
        achievementRate: rec.achievements || 0, 
        songId: rec.song_id, 
        songName: song ? song.title : rec.title,
        achievement: rec.achievements || 0, 
	fcStatus: rec.fc || '',
        dxScore: rec.dxScore || 0,
        rating: rec.ra || 0, 
        level: rec.level_index || 0, 
        finishTime: new Date(),
        pf: isNaN(pf) || !isFinite(pf) ? 0 : pf,            
        dxRatio: isNaN(dxRatio) || !isFinite(dxRatio) ? 0 : dxRatio,  
        constant: isNaN(constant) || !isFinite(constant) ? 0 : constant,
        isNew: isNew
      };
    });


    // 4. 重算真实水鱼 Rating (旧曲35 + 新曲15)
    const oldTop35 = processedScores.filter(r => !r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 35);
    const newTop15 = processedScores.filter(r => r.isNew).sort((a, b) => b.rating - a.rating).slice(0, 15);
    const calculatedRating = [...oldTop35, ...newTop15].reduce((sum, rec) => sum + rec.rating, 0);
    const finalRating = calculatedRating > 0 ? calculatedRating : playerRating;

    // 5. 剔除临时字段，极速覆写数据库
    const finalScoresToSave = processedScores.map(({ isNew, ...rest }) => rest);
    await Score.deleteMany({ userId: req.user.id });
    await Score.insertMany(finalScoresToSave);

    // 6. 结算 PF50
    const topRecordsByPf = [...finalScoresToSave].sort((a, b) => b.pf - a.pf).slice(0, 50);
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    
    // 7. 更新面板
    await User.findByIdAndUpdate(req.user.id, { 
      importToken: importToken.trim(),
      totalPf: Number(totalPf.toFixed(2)),
      rating: finalRating 
    });

    res.json({ msg: `成功同步 ${finalScoresToSave.length} 首成绩！`, rating: finalRating, totalPf: Number(totalPf.toFixed(2)) });
  } catch (err) {
    console.error('[水鱼同步报错]', err);
    let exactErrorMsg = '未知错误';
    if (err.response) {
      exactErrorMsg = `水鱼服务器拒绝 (HTTP ${err.response.status}): ${err.response.data?.message || err.response.statusText}`;
    } else if (err.request) {
      exactErrorMsg = '连接水鱼服务器超时。';
    } else {
      exactErrorMsg = `内部错误: ${err.message}`;
    }
    res.status(500).json({ msg: exactErrorMsg });
  }
});

// ==========================================
// 📚 [WIKI 维基系统接口]
// ==========================================

// 1. [公共] 获取全部分类（返回扁平列表，前端会自己组装成树）
app.get('/api/wiki/categories', async (req, res) => {
  try {
    const categories = await WikiCategory.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ msg: '获取维基分类失败' });
  }
});

// 2. [ADM专属] 创建新类别
app.post('/api/admin/wiki/category', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) {
      return res.status(403).json({ msg: '权限不足' });
    }

    const { name, slug, description, parentId, icon, color } = req.body;
    if (!name || !slug) return res.status(400).json({ msg: '类别名称和 Slug 不能为空' });

    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await WikiCategory.findOne({ slug: formattedSlug });
    if (existing) return res.status(400).json({ msg: '该类别 Slug 已存在' });

    const newCategory = new WikiCategory({
      name,
      slug: formattedSlug,
      description,
      parentId: parentId || null, 
      icon: icon || 'FaFolder',
      color: color || 'text-cyan-400'
    });

    await newCategory.save();
    res.json({ msg: '新类别创建成功！', category: newCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '创建类别失败' });
  }
});

// 3. [公共] 获取所有已通过审核的文章 (连表查询 Category)
app.get('/api/wiki/list', async (req, res) => {
  try {
    const pages = await WikiPage.find({ status: 'APPROVED' })
      .select('title slug category views updatedAt')
      .populate('category', 'name slug parentId color icon') 
      .sort({ views: -1 });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ msg: '获取维基列表失败' });
  }
});

// 4. [公共] 获取文章详情
app.get('/api/wiki/page/:slug', async (req, res) => {
  try {
    const page = await WikiPage.findOneAndUpdate(
      { slug: req.params.slug, status: 'APPROVED' },
      { $inc: { views: 1 } },
      { new: true, timestamps: false }
    )
    .populate('category', 'name slug parentId') 
    .populate('author', 'username avatarUrl role')
    .populate('lastEditedBy', 'username avatarUrl role');

    if (!page) return res.status(404).json({ msg: '词条不存在或未过审' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ msg: '获取维基文章失败' });
  }
});

// 5. [玩家/管理共享] 提交文章 (🔥 修复 ADM 免审奖励 & 区分创建/更新)
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
      // --- 场景 A：更新现有词条 ---
      page.title = title;
      page.category = categoryId;
      page.content = content;
      page.lastEditedBy = currentUser._id;
      page.status = newStatus;
      page.isPendingUpdate = !isAdmin; // 如果不是管理员，标记为“待审核的更新”
      await page.save();

      if (isAdmin) {
        // ADM 免审更新：+30 XP，+1 贡献数
        await addXp(currentUser._id, 30);
        await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } });
      }
      return res.json({ msg: isAdmin ? '✅ 更新成功！经验+30，贡献+1' : '更新已提交审核。' });
      
    } else {
      // --- 场景 B：创建新词条 ---
      const newPage = new WikiPage({
        title,
        slug: formattedSlug,
        category: categoryId,
        content,
        author: currentUser._id,
        lastEditedBy: currentUser._id,
        status: newStatus,
        isPendingUpdate: false
      });
      await newPage.save();

      if (isAdmin) {
        // ADM 免审创建：+50 XP，+1 贡献数
        await addXp(currentUser._id, 50);
        await User.findByIdAndUpdate(currentUser._id, { $inc: { wikiApprovedCount: 1 } });
      }
      return res.json({ msg: isAdmin ? '✅ 发布成功！经验+50，贡献+1' : '提交成功，请等待审核。' });
    }
  } catch (err) {
    res.status(500).json({ msg: '提交文章失败' });
  }
});

// 6. [ADM 专属] 获取待审核列表
app.get('/api/admin/wiki/pending', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) {
      return res.status(403).json({ msg: '权限不足' });
    }
    
    const pendingPages = await WikiPage.find({ status: 'PENDING' })
      .populate('category', 'name') 
      .populate('author', 'username')
      .sort({ createdAt: -1 });
      
    res.json(pendingPages);
  } catch (err) {
    res.status(500).json({ msg: '获取待审核列表失败' });
  }
});

// 7. [ADM 专属] 审核操作 (🔥 智能识别新建与更新奖励)
app.put('/api/admin/wiki/review/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id || req.user._id);
    if (!currentUser || !['ADM', 'TO'].includes(currentUser.role)) {
      return res.status(403).json({ msg: '权限不足' });
    }

    const { action, rejectReason } = req.body;
    const page = await WikiPage.findById(req.params.id);
    if (!page) return res.status(404).json({ msg: '文章不存在' });

    if (action === 'APPROVE') {
      page.status = 'APPROVED';
      page.rejectReason = '';
      
      // 💡 核心逻辑：区分是“新建过审”还是“更新过审”
      const xpReward = page.isPendingUpdate ? 30 : 50;
      const targetUserId = page.isPendingUpdate ? page.lastEditedBy : page.author;
      
      await addXp(targetUserId, xpReward);
      await User.findByIdAndUpdate(targetUserId, { $inc: { wikiApprovedCount: 1 } });
      
      // 审核完毕，重置标记
      page.isPendingUpdate = false;
    } else if (action === 'REJECT') {
      page.status = 'REJECTED';
      page.rejectReason = rejectReason || '内容不符合社区规范';
    }

    await page.save();
    res.json({ msg: `文章已被标记为 ${page.status}` });
  } catch (err) {
    res.status(500).json({ msg: '审核操作失败' });
  }
});

// 🏆 [新增] 每日首次阅读维基奖励 (+5 XP)
app.post('/api/wiki/read-reward', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ msg: '用户不存在' });

    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    if (user.lastWikiReadDate !== today) {
      user.lastWikiReadDate = today;
      user.xp = (user.xp || 0) + 5;
      user.level = Math.floor(user.xp / 300) + 1; // 💡 严格遵守 300 经验/级
      await user.save();
      return res.json({ awarded: true, msg: '📚 每日首次阅读维基，经验值 +5！' });
    }
    res.json({ awarded: false });
  } catch (err) {
    res.status(500).json({ msg: '奖励发放失败' });
  }
});

// ==========================================
// 🏆 [全局多榜单 排行榜 API]
// ==========================================
app.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const type = req.params.type;
    let sortQuery = {};

    // 动态决定排序字段 (降序 -1，同分按注册时间 1 垫底)
    switch(type) {
      case 'level': sortQuery = { xp: -1, createdAt: 1 }; break;
      case 'wiki': sortQuery = { wikiApprovedCount: -1, createdAt: 1 }; break;
      case 'feedback': sortQuery = { feedbackApprovedCount: -1, createdAt: 1 }; break;
      case 'checkin': sortQuery = { checkInCount: -1, createdAt: 1 }; break;
      case 'pf':
      default: sortQuery = { totalPf: -1, createdAt: 1 }; break;
    }

    const users = await User.find()
      .sort(sortQuery)
      .select('username uid avatarUrl totalPf rating role isRegistered isB50Visible xp level wikiApprovedCount feedbackApprovedCount checkInCount')
      .limit(100);

    res.json(users);
  } catch (err) {
    console.error('获取排行榜失败:', err);
    res.status(500).json({ msg: '获取排行榜失败' });
  }
});

// [新增] 每日签到接口 (+20 XP)
app.post('/api/users/check-in', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }); // 获取东八区今天的日期字符串
    
    if (user.lastCheckInDate === today) {
      return res.status(400).json({ msg: '今天已经签到过啦，明天再来吧！' });
    }
    
    user.lastCheckInDate = today;
    user.xp = (user.xp || 0) + 20;
    user.checkInCount = (user.checkInCount || 0) + 1;
    user.level = Math.floor(user.xp / 300) + 1;
    await user.save();
    
    res.json({ msg: '签到成功！经验值 +20', xp: user.xp, level: user.level });
  } catch (err) {
    res.status(500).json({ msg: '签到失败' });
  }
});

// ==========================================
// 🔴 [v1.2.0] osu! API 授权绑定系统
// ==========================================
app.post('/api/osu/bind', authMiddleware, async (req, res) => {
  try {
    // ================== 🔥 替换这一段 ==================
    const { code } = req.body;
    if (!code) return res.status(400).json({ msg: '未提供授权码(Code)' });

    // 🕵️ 打印日志，帮你揪出到底哪个变量没读到！
    console.log("👉 [调试] 准备向 osu! 发送的凭证:", {
      client_id: process.env.OSU_CLIENT_ID,
      secret_exists: !!process.env.OSU_CLIENT_SECRET,
      secret_length: process.env.OSU_CLIENT_SECRET ? process.env.OSU_CLIENT_SECRET.length : 0,
      redirect_uri: process.env.OSU_CALLBACK_URL
    });

    if (!process.env.OSU_CLIENT_ID || !process.env.OSU_CLIENT_SECRET) {
      return res.status(500).json({ msg: '后端环境变量未配置，请检查 .env 并重启服务器' });
    }

// 💡 终极修复：使用标准 OAuth 表单格式 (x-www-form-urlencoded) 发送数据，而不是 JSON！
    const params = new URLSearchParams();
    params.append('client_id', process.env.OSU_CLIENT_ID.trim());
    params.append('client_secret', process.env.OSU_CLIENT_SECRET.trim());
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', process.env.OSU_CALLBACK_URL.trim());

    // 1. 拿着前端传来的 code 和表单数据，去向 osu! 服务器换取 Access Token
    const tokenResponse = await axios.post('https://osu.ppy.sh/oauth/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. 拿着 Access Token，去获取该玩家的 osu! 个人信息
    const userResponse = await axios.get('https://osu.ppy.sh/api/v2/me/osu', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const osuUser = userResponse.data;

    // 3. 将 osu! 数据绑定到当前登录的 Purebeat 用户身上
    // 同时可以给绑定 osu! 账号的玩家发放 50 经验值奖励！
    const user = await User.findById(req.user.id || req.user._id);
    user.osuId = osuUser.id;
    user.osuUsername = osuUser.username;
    user.osuAvatarUrl = osuUser.avatar_url;
    user.xp = (user.xp || 0) + 50;
    user.level = Math.floor(user.xp / 300) + 1;

    await user.save();

    res.json({ 
      msg: `成功绑定 osu! 账号：${osuUser.username}！经验值 +50`,
      osuUser: {
        id: osuUser.id,
        username: osuUser.username,
        avatar: osuUser.avatar_url
      }
    });

  } catch (err) {
    console.error('osu! 绑定报错:', err.response?.data || err.message);
    res.status(500).json({ msg: '绑定失败，授权码可能已过期，请重试' });
  }
});

// --- 启动服务器 ---
// [注意！] 为了保证所有的路由都能被 Express 正确拦截并生效，app.listen 必须写在文件的最后面！
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Current Server Time: ${new Date().toLocaleString()}`);
});