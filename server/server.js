const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const Announcement = require('./models/Announcement'); 
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');
const Song = require('./models/Song');
const { calculatePF } = require('./utils/pfCalculator');
const Feedback = require('./models/Feedback');
const Message = require('./models/Message');

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
        const user = await User.findById(req.user.id).select('-password'); // 不返回密码
        if (!user) return res.status(404).json({ msg: '用户未找到' });
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
            .select('-password -contactValue -contactType'); 
        
        if (!user) return res.status(404).json({ msg: '用户不存在' });

        // [新增] 计算站内 PF 排名
        let pfRank = '-';
        if (user.totalPf && user.totalPf > 0) {
            pfRank = await User.countDocuments({ totalPf: { $gt: user.totalPf } }) + 1;
        }

        // [新增] 查该用户的 PF 历史最佳成绩 (Top 50)
        const topPfScores = await Score.find({ userId: user._id })
            .sort({ pf: -1 })
            .limit(50);

        // B. 查该用户的达成率最佳成绩 (Top 5，保留你原有的功能)
        const topScores = await Score.find({ userId: user._id })
            .sort({ achievement: -1 }) // 按达成率降序
            .limit(5);

        // C. 查好友 (暂时只返回空数组或简单的计数，后续完善)
        // const friends = await User.find({ '_id': { $in: user.friends } }).select('username avatarUrl');

        // D. 组装数据返回
        res.json({
            ...user.toObject(),
            topScores: topScores || [], 
            pfRank: pfRank,               // [新增] 返回 PF 排名
            topPfScores: topPfScores,     // [新增] 返回 PF 排行榜
            friendsCount: user.friends ? user.friends.length : 0,
            friends: [] // 暂时留空
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
        const { bio, avatarUrl, bannerUrl, divingFishUsername, proberUsername } = req.body;

        // 构建更新对象 (只允许更新这几个字段)
        const updateFields = {};
        if (bio !== undefined) updateFields.bio = bio;
        if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
        if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;
        
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

// === ADM 专属：从水鱼同步全量曲库 ===
app.post('/api/admin/sync-songs', authMiddleware, async (req, res) => {
  try {
    // 1. 权限校验
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'ADM') {
      return res.status(403).json({ msg: '权限不足：仅限 ADM 执行高危操作' });
    }

    console.log('[Sync] 正在从水鱼服务器拉取全量曲库...');
    
    // 2. 发起拉取请求
    const response = await axios.get('https://www.diving-fish.com/api/maimaidxprober/music_data');
    const songsData = response.data; // 这是一个包含上千首歌的巨型数组

    console.log(`[Sync] 成功拉取到 ${songsData.length} 首曲目，开始写入数据库...`);

    // 3. 批量写入/更新数据库 (使用 BulkWrite 提升性能)
    // 核心逻辑：如果库里没这首歌就插入，如果有就更新（Upsert），防止产生重复数据
    const bulkOps = songsData.map(song => ({
      updateOne: {
        filter: { id: song.id },
        update: {
          $set: {
            title: song.title,
            type: song.type,
            ds: song.ds,
            level: song.level,
            basic_info: song.basic_info,
            lastUpdated: new Date()
          }
        },
        upsert: true // 找不到就新建
      }
    }));

    await Song.bulkWrite(bulkOps);

    console.log('[Sync] 曲库同步/更新完成！');
    res.json({ msg: `曲库同步成功！共收录 ${songsData.length} 首曲目数据。` });

  } catch (err) {
    console.error('[Sync Error]', err.message);
    res.status(500).json({ msg: '曲库同步失败，请检查服务器网络或水鱼接口状态' });
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
      content: `玩家 [${sender.username}] 觉得你的实力很强，希望添加你为好友！`,
      actionData: { senderId: sender._id } // 绑定发送者的 ID，供前端展示“同意/拒绝”按钮使用
    });
    await friendRequestMsg.save();

    res.json({ message: '好友申请已发送，请等待对方查收信件！' });
  } catch (err) {
    console.error('发送请求失败:', err);
    res.status(500).json({ message: '请求发送失败，请稍后重试' });
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

// === 玩家成绩同步 API (带Developer Token的强力版本) ===
app.post('/api/users/sync-maimai', authMiddleware, async (req, res) => {
  try {
    const { proberUsername } = req.body;
    if (!proberUsername) return res.status(400).json({ msg: '请输入水鱼查分器账号或QQ号' });

    // 🔥 1. 智能识别：全是数字就当作 QQ 号，否则是用户名
    const isQQ = /^\d+$/.test(proberUsername);
    const payload = isQQ ? { qq: proberUsername } : { username: proberUsername };

    // 🔥 2. 将你刚才在水鱼官网申请到的 Developer Token 填入这里 (保留双引号)
    const DEVELOPER_TOKEN = "u1XGtb7pVZ8AaDyKLM3IjT4CEnHrckvf";

    // 3. 向水鱼发送带 Token 的请求
    const response = await axios.post('https://www.diving-fish.com/api/maimaidxprober/query/player', payload, {
      headers: {
        'Developer-Token': DEVELOPER_TOKEN // 核心通行证！
      }
    });

    const data = response.data;
    if (!data.records) return res.status(404).json({ msg: '水鱼返回成功，但未找到成绩数据' });

    // 更新用户绑定的账号
    await User.findByIdAndUpdate(req.user.id, { proberUsername, divingFishUsername: proberUsername });

    const allRecords = [...(data.records || []), ...(data.records_new || [])];

    // [新增] 遍历全体成绩并计算 PF 
    const recordsWithPf = await Promise.all(allRecords.map(async rec => {
      const song = await Song.findOne({ id: String(rec.song_id) });
      let pf = 0, dxRatio = 0, constant = rec.ds || 0;
      
      if (song && song.charts && song.charts[rec.level_index]) {
        const chartInfo = song.charts[rec.level_index];
        const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0);
        const maxDxScore = totalNotes * 3;
        constant = rec.ds || song.ds[rec.level_index];
        dxRatio = maxDxScore > 0 ? (rec.dxScore / maxDxScore) : 0;
        pf = calculatePF(constant, rec.achievements, rec.dxScore, maxDxScore);
      }
      return { ...rec, pf, dxRatio, constant, songName: song ? song.title : rec.title };
    }));

    // 提取 B50 数据 (按你的原逻辑)
    const topRecordsByRa = recordsWithPf.sort((a, b) => b.ra - a.ra).slice(0, 50);

    // [新增] 提取 Top 50 PF
    const topRecordsByPf = [...recordsWithPf].sort((a, b) => b.pf - a.pf).slice(0, 50);

    // [新增] 合并 RA50 和 PF50，去重后写入数据库，保证两种榜单数据都在
    const mergedRecordsMap = new Map();
    [...topRecordsByRa, ...topRecordsByPf].forEach(rec => {
        mergedRecordsMap.set(`${rec.song_id}_${rec.level_index}`, rec);
    });
    const finalRecordsToSave = Array.from(mergedRecordsMap.values());

    // 先清空旧数据
    await Score.deleteMany({ userId: req.user.id });

    // 批量写入新数据
    const scoreOps = finalRecordsToSave.map(rec => ({
      userId: req.user.id,
      songId: rec.song_id, 
      songName: rec.songName, // 保存名字供前端展示
      achievement: rec.achievements,
      dxScore: rec.dxScore,
      rating: rec.ra,
      level: rec.level_index, 
      finishTime: new Date(),
      // [新增] PF 相关字段
      pf: rec.pf,            
      dxRatio: rec.dxRatio,  
      constant: rec.constant 
    }));

    await Score.insertMany(scoreOps);

    // [新增] 结算全站 Total PF
    const totalPf = topRecordsByPf.reduce((sum, score) => sum + score.pf, 0);
    await User.findByIdAndUpdate(req.user.id, { totalPf: Number(totalPf.toFixed(2)) });

    res.json({ msg: '数据同步成功！', rating: data.rating, totalPf: Number(totalPf.toFixed(2)) });
  } catch (err) {
    console.error('[水鱼同步报错]', err.response?.data || err.message);
    
    // 🔥 精准捕获水鱼抛出的原本中文报错信息 (水鱼返回字段是 message)
    const dfError = err.response?.data?.message; 
    res.status(500).json({ msg: dfError ? `水鱼服务器拒绝: ${dfError}` : '同步失败，请检查网络或账号' });
  }
});

// --- 启动服务器 ---
// [注意！] 为了保证所有的路由都能被 Express 正确拦截并生效，app.listen 必须写在文件的最后面！
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Current Server Time: ${new Date().toLocaleString()}`);
});