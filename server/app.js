/**
 * PureBeat 后端入口 (解耦重构版)
 * 原 server.js (2700 行) → app.js (~70 行引导文件)
 * 解耦时间: 2026-04-29
 *
 * 目录结构:
 *   config/     → Cloudinary, Nodemailer 配置
 *   middleware/ → auth 中间件 (authMiddleware, addXp 等)
 *   services/   → 业务服务层 (chuniRating, gameSession)
 *   routes/     → 18 个路由模块，按功能域拆分
 *   tasks/      → 定时任务 (syncAliases)
 *   utils/      → 原有游戏引擎工具函数
 *   models/     → Mongoose 数据模型 (不变)
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===== 启动时配置检查 =====
if (!process.env.LXNS_CLIENT_ID || !process.env.LXNS_CLIENT_SECRET) {
  console.warn('⚠️ LXNS_CLIENT_ID / LXNS_CLIENT_SECRET 未配置，落雪 OAuth 功能不可用');
}
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI 未配置');
  process.exit(1);
}

// ===== 全局中间件 =====
app.use(cors());
app.use(express.json());

// ===== 全局错误处理 =====
process.on('uncaughtException', (err) => { console.error('🔥 致命错误:', err); });
process.on('unhandledRejection', (reason) => { console.error('🔥 未处理的 Promise 拒绝:', reason); });

// ===== MongoDB 连接 =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => { console.error('❌ MongoDB Connection Error:', err); process.exit(1); });

// ===== 路由注册 (18 个模块) =====
app.use(require('./routes/auth'));
app.use(require('./routes/users'));
app.use(require('./routes/songs'));
app.use(require('./routes/arcaea'));
app.use(require('./routes/letterGame'));
app.use(require('./routes/social'));
app.use(require('./routes/announcement'));
app.use(require('./routes/feedback'));
app.use(require('./routes/maimai'));
app.use(require('./routes/wiki'));
app.use(require('./routes/leaderboard'));
app.use(require('./routes/osu'));
app.use(require('./routes/radar'));
app.use(require('./routes/scores'));
app.use(require('./routes/scoreLeaderboard'));
app.use(require('./routes/chunithm'));
app.use(require('./routes/tournament'));
app.use(require('./routes/admin'));
app.use('/api/msc2026', require('./routes/msc2026'));

// ===== 定时任务 =====
const { startSyncAliases } = require('./tasks/syncAliases');
startSyncAliases();

const { checkTimeoutMatches, checkStageAutoAdvance } = require('./tasks/tournamentTimeout');
setInterval(checkTimeoutMatches, 60_000); // 每 60s 检查一次超时比赛
setInterval(checkStageAutoAdvance, 60_000); // 每 60s 检查阶段自动推进

// ===== 服务器启动 =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

module.exports = app;
