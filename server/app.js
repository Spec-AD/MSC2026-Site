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
const fs = require('fs');

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
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready, database: ready ? 'connected' : 'unavailable' });
});

app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  res.setHeader('Retry-After', '3');
  return res.status(503).json({ msg: '服务正在恢复连接，请稍后重试', retryable: true });
});

// ===== 全局错误处理 =====
process.on('uncaughtException', (err) => { console.error('🔥 致命错误:', err); });
process.on('unhandledRejection', (reason) => { console.error('🔥 未处理的 Promise 拒绝:', reason); });

// 数据库断开时快速返回错误，不让请求在白屏背后静默挂起 10 秒。
mongoose.set('bufferCommands', false);

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
app.use('/api/msc2026', require('./routes/mscPoints'));
app.use('/api/msc2026', require('./routes/msc2026'));

// 可选的前后端同机模式。香港节点可直接承载前端，避开跨境静态站点与 API 二次转发。
const clientDist = process.env.CLIENT_DIST_DIR || path.resolve(__dirname, '../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, {
    maxAge: '7d',
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ===== 服务器启动 =====
const PORT = process.env.PORT || 5000;

async function start() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 30000
  });
  console.log('✅ MongoDB Connected');

  const { startSyncAliases } = require('./tasks/syncAliases');
  startSyncAliases();
  const { checkTimeoutMatches, checkStageAutoAdvance } = require('./tasks/tournamentTimeout');
  setInterval(checkTimeoutMatches, 60_000);
  setInterval(checkStageAutoAdvance, 60_000);
  const { startRaceTimerScheduler } = require('./services/msc2026/raceTimerScheduler');
  startRaceTimerScheduler();

  const server = app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  return server;
}

if (require.main === module) {
  start().catch(err => {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  });
}

module.exports = app;
module.exports.start = start;
