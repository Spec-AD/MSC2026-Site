const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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
                nickname: user.nickname 
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


// --- 启动服务器 ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Current Server Time: ${new Date().toLocaleString()}`);
});

// server/server.js 添加到文件末尾或路由区域

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

        // B. 查该用户的历史最佳成绩 (Top 5)
        // 假设 Score 模型里有 userId 字段关联
        const topScores = await Score.find({ userId: user._id })
            .sort({ achievement: -1 }) // 按达成率降序
            .limit(5);

        // C. 查好友 (暂时只返回空数组或简单的计数，后续完善)
        // const friends = await User.find({ '_id': { $in: user.friends } }).select('username avatarUrl');

        // D. 组装数据返回
        res.json({
            ...user.toObject(),
            topScores: topScores || [], // 如果没成绩就返回空数组
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
        const { bio, avatarUrl, bannerUrl } = req.body;

        // 构建更新对象 (只允许更新这几个字段，防止恶意篡改 UID 或成绩)
        const updateFields = {};
        if (bio !== undefined) updateFields.bio = bio;
        if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
        if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;

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