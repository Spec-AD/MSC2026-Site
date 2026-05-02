const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const osuServices = require('../services/osu');

/*
 * MODE_MAP — frontendId → osu! API mode 映射
 *
 * GET /api/osu/modes 是单一数据源，前端已改为消费此端点。
 * 新增 mode 时只需更新此映射。
 */
const MODE_MAP = { standard: 'osu', taiko: 'taiko', catch: 'fruits', mania: 'mania' };

/** 获取模式映射（前端消费，消除两端重复维护） */
router.get('/api/osu/modes', (_req, res) => {
  res.json(MODE_MAP);
});

// ─── OAuth 绑定 ─────────────────────────────────────────────────────

/**
 * POST /api/osu/bind
 *
 * OAuth Authorization Code Flow 绑定
 * b1.7：持久化 osuAccessToken / osuRefreshToken / osuTokenExpiresAt
 */
router.post('/api/osu/bind', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = Number(process.env.OSU_CLIENT_ID);
    const clientSecret = String(process.env.OSU_CLIENT_SECRET || '').trim();
    const redirectUri = req.body.redirect_uri || String(process.env.OSU_CALLBACK_URL || '').trim();

    // Token Exchange — scope: public 确保 token 有权访问排行榜/BP 等端点
    const axios = require('axios');
    const tokenRes = await axios.post('https://osu.ppy.sh/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      scope: 'public'
    }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // 获取 osu! 用户信息
    const userRes = await axios.get('https://osu.ppy.sh/api/v2/me/osu', {
      headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' }
    });
    const osuUser = userRes.data;

    // 持久化
    const user = await User.findById(req.user.id || req.user._id);
    user.osuId = osuUser.id;
    user.osuUsername = osuUser.username;
    user.osuAvatarUrl = osuUser.avatar_url;
    user.osuAccessToken = access_token;
    user.osuRefreshToken = refresh_token;
    user.osuTokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    user.xp = (user.xp || 0) + 50;
    user.level = Math.floor(user.xp / 300) + 1;
    await user.save();

    res.json({ msg: '绑定成功' });
  } catch (err) {
    console.error('[osu bind error]', err.response?.data || err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.error_description || err.response?.data?.error || '绑定失败';
    res.status(status).json({ msg: '绑定失败', detail });
  }
});

// ─── 同步 ───────────────────────────────────────────────────────────

/**
 * POST /api/users/sync-osu
 *
 * b1.7：改为增量 upsert 模式，BP 100 → BP 200
 */
router.post('/api/users/sync-osu', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user.osuId) return res.status(400).json({ msg: '请先绑定 osu! 账号' });

    const frontendMode = req.body.mode || 'standard';

    // 并行同步统计 + BP
    const [stats, bpResult] = await Promise.all([
      osuServices.sync.syncStats(user, frontendMode),
      osuServices.sync.syncBP(user, frontendMode)
    ]);

    res.json({
      msg: `${frontendMode} 模式同步成功`,
      stats,
      bp: bpResult
    });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ msg: err.message, error: 'token_expired' });
    if (err.status === 429) return res.status(429).json({ msg: err.message, retryAfter: err.retryAfter, error: 'rate_limited' });
    res.status(500).json({ msg: '同步失败', error: 'api_error' });
  }
});

/**
 * POST /api/osu/sync-all
 *
 * b1.7 新增：一键同步所有四模式，各模式独立返回结果
 */
router.post('/api/osu/sync-all', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user.osuId) return res.status(400).json({ msg: '请先绑定 osu! 账号' });

    const results = await osuServices.sync.syncAllModes(user);
    res.json({ msg: '全模式同步完成', results });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ msg: err.message, error: 'token_expired' });
    if (err.status === 429) return res.status(429).json({ msg: err.message, retryAfter: err.retryAfter, error: 'rate_limited' });
    res.status(500).json({ msg: '全模式同步失败', error: 'api_error' });
  }
});

// ─── 八大新增模块 ─────────────────────────────────────────────────────

/**
 * GET /api/osu/pass — 最近通过的单个成绩
 *
 * 查询参数：
 *   mode  - standard | taiko | catch | mania（默认 standard）
 *   all   - 设为 true 时返回四模式全部
 */
router.get('/api/osu/pass', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { mode, all } = req.query;

    if (all === 'true') {
      const data = await osuServices.pass.getAllPass(userId);
      return res.json(data);
    }

    const targetMode = mode || 'standard';
    const data = await osuServices.pass.getPass(userId, targetMode);
    if (!data) return res.json({ mode: targetMode, msg: '暂无通过的 osu! 成绩' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/recent — 最近所有成绩
 *
 * 查询参数：
 *   mode    — standard | taiko | catch | mania（默认 standard）
 *   from    — 起始日期 YYYY-MM-DD
 *   to      — 截止日期 YYYY-MM-DD
 *   page    — 页码（默认 1）
 *   limit   — 每页条数（默认 20）
 *   refresh — 设为 true 时强制从 osu! API 拉最新数据
 */
router.get('/api/osu/recent', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { mode, from, to, page, limit, refresh } = req.query;
    const targetMode = mode || 'standard';

    if (refresh === 'true') {
      const user = await User.findById(userId);
      const data = await osuServices.recent.refreshFromApi(user, targetMode);
      return res.json(data);
    }

    const data = await osuServices.recent.getRecentLocal({
      userId,
      mode: targetMode,
      from, to,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    res.json(data);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ msg: err.message });
    if (err.status === 429) return res.status(429).json({ msg: err.message, retryAfter: err.retryAfter });
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/score/:bid — 谱面最好成绩
 *
 * 查询参数：
 *   mode     — 指定模式
 *   username — 指定其他用户
 */
router.get('/api/osu/score/:bid', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const beatmapId = parseInt(req.params.bid, 10);
    if (isNaN(beatmapId) || beatmapId <= 0) {
      return res.status(400).json({ msg: '无效的谱面 ID' });
    }
    const { mode, username } = req.query;

    let data;
    if (username) {
      data = await osuServices.score.getScoreByUsername(username, beatmapId, mode);
      if (data === null) return res.status(404).json({ msg: '未找到该用户' });
    } else {
      data = await osuServices.score.getScore(userId, beatmapId, mode);
    }

    if (!data) return res.json({ beatmapId, msg: '暂无该谱面的成绩' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/best — BP 200 列表
 *
 * 查询参数：
 *   mode     — standard | taiko | catch | mania（默认 standard）
 *   limit    — 条数（默认 200）
 *   page     — 页码（默认 1）
 *   userId   — 目标用户 MongoDB ObjectId（查他人 BP）
 *   username — 目标用户 osu 用户名（查他人 BP）
 *
 * Auth: optional（未登录时需传 userId 或 username）
 */
router.get('/api/osu/best', optionalAuth, async (req, res) => {
  try {
    const { mode, limit, page, userId: targetUserId, username } = req.query;

    // 确定目标用户
    let targetUser = null;
    if (targetUserId) {
      targetUser = await User.findById(targetUserId).select('osuId osuUsername osuAvatarUrl username avatarUrl');
    } else if (username) {
      targetUser = await User.findOne({ osuUsername: username }).select('osuId osuUsername osuAvatarUrl username avatarUrl');
    } else if (req.user) {
      targetUser = await User.findById(req.user.id || req.user._id).select('osuId osuUsername osuAvatarUrl username avatarUrl');
    } else {
      return res.status(400).json({ msg: '请提供 userId 或 username，或登录后查询自己的 BP' });
    }

    if (!targetUser) {
      return res.status(404).json({ msg: '未找到该用户' });
    }

    const data = await osuServices.best.getBest({
      userId: targetUser._id,
      mode: mode || 'standard',
      limit: parseInt(limit) || 200,
      page: parseInt(page) || 1
    });

    res.json({
      user: {
        id: targetUser._id,
        username: targetUser.username || targetUser.osuUsername,
        osuUsername: targetUser.osuUsername,
        avatarUrl: targetUser.osuAvatarUrl || targetUser.avatarUrl,
        osuId: targetUser.osuId
      },
      ...data
    });
  } catch (err) {
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/todaybest — 今日最佳成绩
 *
 * 查询参数：
 *   mode — standard | taiko | catch | mania（默认 standard）
 */
router.get('/api/osu/todaybest', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const mode = req.query.mode || 'standard';

    const data = await osuServices.todaybest.getTodayBest(userId, mode);
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/info — 玩家信息实时查询
 *
 * 查询参数：
 *   q — osu! 用户名或 UID（必填）
 */
router.get('/api/osu/info', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ msg: '请提供查询参数 q（用户名或 UID）' });

    const data = await osuServices.info.getInfo(q);
    res.json(data);
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ msg: err.message, retryAfter: err.retryAfter });
    if (err.status === 404) return res.status(404).json({ msg: '未找到该 osu! 玩家' });
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/map/:bid — 谱面信息查询
 */
router.get('/api/osu/map/:bid', async (req, res) => {
  try {
    const beatmapId = parseInt(req.params.bid, 10);
    if (isNaN(beatmapId) || beatmapId <= 0) {
      return res.status(400).json({ msg: '无效的谱面 ID' });
    }
    const data = await osuServices.map.getMap(beatmapId);
    res.json(data);
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ msg: err.message, retryAfter: err.retryAfter });
    res.status(500).json({ msg: '查询失败' });
  }
});

/**
 * GET /api/osu/leaderboard/:bid — 谱面全球排行榜
 *
 * 查询参数：
 *   mode   — standard | taiko | catch | mania（PureBeat 命名）
 *   mods   — HD / DT / HR 等 mod 缩写组合
 *   limit  — 条数（默认 50）
 *   legacy — 0=包含 lazer, 1=仅 stable（默认 0）
 *   type   — global | country | friend（默认 global）
 *
 * Auth: optional（绑定 JWT 后返回 currentUserRank）
 */
router.get('/api/osu/leaderboard/:bid', optionalAuth, async (req, res) => {
  try {
    const beatmapId = parseInt(req.params.bid, 10);
    if (isNaN(beatmapId) || beatmapId <= 0) {
      return res.status(400).json({ msg: '无效的谱面 ID' });
    }
    const { mode, mods, limit, legacy, type } = req.query;

    // 如果已登录，获取用户 osuId 用于 currentUserRank
    let currentUser = null;
    if (req.user) {
      currentUser = await User.findById(req.user.id || req.user._id).select('osuId');
    }

    const data = await osuServices.leaderboard.getLeaderboard(beatmapId, {
      mode,
      mods,
      limit: parseInt(limit) || 50,
      legacy: legacy !== undefined ? parseInt(legacy) : undefined,
      type,
      currentUser
    });
    res.json(data);
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ msg: err.message, retryAfter: err.retryAfter });
    res.status(500).json({ msg: '查询失败' });
  }
});

module.exports = router;
