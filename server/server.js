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

        // 创建新用户
        const newUser = new User({
            username,
            password: hashedPassword
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
        if (leaderboardCache.data && (now - leaderboardCache.lastUpdated < CACHE_DURATION)) {
            // console.log('Using Cached Leaderboard'); // 调试用，嫌吵可以注释掉
            return res.json(leaderboardCache.data);
        }

        // console.log('Fetching Leaderboard from DB...');
        // 排序逻辑：完成率降序 > DX分降序 > 完成时间升序
        const scores = await Score.find()
            .sort({ achievement: -1, dxScore: -1, finishTime: 1 })
            .limit(100); 

        // 更新缓存
        leaderboardCache.data = scores;
        leaderboardCache.lastUpdated = now;

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
