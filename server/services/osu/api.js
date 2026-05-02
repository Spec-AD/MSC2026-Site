/**
 * osu! API v2 封装层
 *
 * 职责：
 *  - Token 管理（Client Credentials + User Token）
 *  - Token Bucket 限流
 *  - 指数退避重试
 *  - 统一错误格式
 *
 * 使用：
 *   const osuApi = require('./services/osu/api');
 *   const user = await osuApi.getUser('username', { type: 'client' });
 *   const scores = await osuApi.getBestScores(user.osuId, 'osu', 200, user);
 */

const axios = require('axios');
const User = require('../../models/User');

// ─── 配置 ────────────────────────────────────────────────────────────

const CFG = {
  clientId:     Number(process.env.OSU_CLIENT_ID),
  clientSecret: String(process.env.OSU_CLIENT_SECRET || '').trim(),
  baseUrl:      'https://osu.ppy.sh/api/v2',
  tokenUrl:     'https://osu.ppy.sh/oauth/token',

  // 限流
  bucketSize:   15,           // 初始 tokens/s（远低于 20/s 上限）
  maxTokens:    15,
  refillRate:   15,           // 每秒补充 tokens
  slowdownPct:  0.5,          // 429 后降速 50%
  globalCooldownMs: 60_000,   // 连续 3 次 429 全局限流时长

  // 重试
  maxRetries:   3,
  retryBaseMs:  1000,         // 1s → 2s → 4s → 8s
  retryMultiplier: 2,

  // User Token 刷新缓冲
  tokenRefreshBufferMs: 5 * 60 * 1000,  // 5 分钟
};

// ─── 限流器（Token Bucket）────────────────────────────────────────────

class TokenBucket {
  constructor() {
    this.tokens = CFG.bucketSize;
    this.maxTokens = CFG.maxTokens;
    this.refillRate = CFG.refillRate;     // tokens/s
    this.lastRefill = Date.now();
    this.consecutive429 = 0;
    this.globalCooldownUntil = 0;          // 全局限流直到此时间戳
    this.slowdownFactor = 1;               // 1 = 正常, 0.5 = 半速
  }

  /** 补充 token */
  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate * this.slowdownFactor);
    this.lastRefill = now;
  }

  /** 获取一个 token（无阻塞），返回是否需要等待 */
  tryConsume() {
    this._refill();

    // 全局限流中
    if (this.globalCooldownUntil > Date.now()) {
      return { allowed: false, waitMs: this.globalCooldownUntil - Date.now() };
    }

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { allowed: true, waitMs: 0 };
    }

    // 无可用 token，估算需要等待的时间
    const waitMs = Math.ceil((1 - this.tokens) / (this.refillRate * this.slowdownFactor) * 1000);
    return { allowed: false, waitMs: Math.max(waitMs, 100) };
  }

  /** 遇到 429 — 降速 */
  handle429(retryAfterMs) {
    this.consecutive429++;
    if (this.consecutive429 >= 3) {
      this.globalCooldownUntil = Date.now() + CFG.globalCooldownMs;
      this.consecutive429 = 0;
    }
    // 按 Retry-After 或默认降速
    const delay = retryAfterMs || Math.ceil(1000 / this.refillRate);
    this.slowdownFactor *= CFG.slowdownPct;
    this.tokens = 0;
    return delay;
  }

  /** 请求成功 — 逐步恢复速度 */
  handleSuccess() {
    this.consecutive429 = 0;
    // 缓慢回归正常速度
    if (this.slowdownFactor < 1) {
      this.slowdownFactor = Math.min(1, this.slowdownFactor + 0.1);
    }
  }
}

// ─── 单例 ────────────────────────────────────────────────────────────

const bucket = new TokenBucket();
let _clientToken = null;          // { token, expiresAt }

// ─── 工具函数 ─────────────────────────────────────────────────────────

/** 等待指定毫秒 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 构建标准错误响应
 */
function makeError(msg, status, retryAfter) {
  const err = new Error(msg);
  err.status = status || 500;
  err.retryAfter = retryAfter;
  return err;
}

// ─── Token 管理 ───────────────────────────────────────────────────────

/**
 * 获取 Client Credentials Token（自动缓存 + 过期刷新）
 */
async function getClientToken() {
  if (_clientToken && _clientToken.expiresAt > Date.now() + 60_000) {
    return _clientToken.token;
  }

  try {
    const res = await axios.post(CFG.tokenUrl, {
      client_id:     CFG.clientId,
      client_secret: CFG.clientSecret,
      grant_type:    'client_credentials',
      scope:         'public'
    }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });

    _clientToken = {
      token:     res.data.access_token,
      expiresAt: Date.now() + res.data.expires_in * 1000
    };
    return _clientToken.token;
  } catch (err) {
    throw makeError('无法获取 osu! API Client Token', 502);
  }
}

/**
 * 确保 User Token 可用
 *
 * 从 User 模型读取 osuAccessToken，若过期且在 5 分钟缓冲期内，
 * 使用 osuRefreshToken 刷新后回写。
 *
 * @param {Object} user - Mongoose User 文档
 * @returns {Promise<string>} 可用的 access_token
 */
async function ensureUserToken(user) {
  if (!user.osuAccessToken) {
    throw makeError('该用户未绑定 osu! 账号或未授权', 401);
  }

  // Token 有效且不在刷新缓冲期内
  if (user.osuTokenExpiresAt && user.osuTokenExpiresAt > Date.now() + CFG.tokenRefreshBufferMs) {
    return user.osuAccessToken;
  }

  // Token 过期或即将过期 → 用 refresh_token 刷新
  if (!user.osuRefreshToken) {
    throw makeError('缺少 osu! refresh_token，请重新绑定', 401);
  }

  try {
    const res = await axios.post(CFG.tokenUrl, {
      client_id:     CFG.clientId,
      client_secret: CFG.clientSecret,
      grant_type:    'refresh_token',
      refresh_token: user.osuRefreshToken
    }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });

    user.osuAccessToken  = res.data.access_token;
    user.osuRefreshToken = res.data.refresh_token || user.osuRefreshToken;
    user.osuTokenExpiresAt = new Date(Date.now() + res.data.expires_in * 1000);
    await user.save();

    return user.osuAccessToken;
  } catch (err) {
    // refresh 失败（如 token 已 revoke），清除 token 让用户重新绑定
    user.osuAccessToken = undefined;
    user.osuRefreshToken = undefined;
    user.osuTokenExpiresAt = undefined;
    await user.save();
    throw makeError('osu! 授权已过期，请重新绑定', 401);
  }
}

// ─── 核心 HTTP 请求方法 ───────────────────────────────────────────────

/**
 * 带限流 + 重试的 osu! API 请求
 *
 * @param {string} method  - HTTP 方法
 * @param {string} path    - API 路径（如 /users/123/osu）
 * @param {Object} [opts]  - 选项
 * @param {string} [opts.tokenType] - 'client' | 'user'
 * @param {Object} [opts.user]      - User 文档（tokenType='user' 时必传）
 * @param {Object} [opts.params]    - URL 查询参数
 * @returns {Promise<Object>}
 */
async function request(method, path, opts = {}) {
  const { tokenType = 'client', user, params } = opts;

  for (let attempt = 0; attempt <= CFG.maxRetries; attempt++) {
    // ── 限流等待 ──
    const { allowed, waitMs } = bucket.tryConsume();
    if (!allowed) {
      await sleep(Math.min(waitMs, 5000));
    }

    // ── 获取 Token ──
    let token;
    try {
      token = tokenType === 'user'
        ? await ensureUserToken(user)
        : await getClientToken();
    } catch (err) {
      throw err; // ensureUserToken 的 401 / 502 直接透传
    }

    // ── 发起请求 ──
    try {
      const res = await axios({
        method,
        url: `${CFG.baseUrl}${path}`,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        },
        params
      });

      bucket.handleSuccess();
      return res.data;

    } catch (err) {
      const status = err.response?.status;

      // 429 — Rate Limited
      if (status === 429) {
        const retryAfter = parseInt(err.response?.headers?.['retry-after'] || '0', 10) * 1000;
        const delay = bucket.handle429(retryAfter);
        if (attempt < CFG.maxRetries) {
          const waitMs = delay || CFG.retryBaseMs * Math.pow(CFG.retryMultiplier, attempt);
          await sleep(waitMs);
          continue;
        }
        throw makeError('osu! API 请求被限流，请稍后重试', 429, Math.ceil(delay / 1000));
      }

      // 503 — Service Unavailable（重试）
      if (status === 503) {
        if (attempt < CFG.maxRetries) {
          const waitMs = CFG.retryBaseMs * Math.pow(CFG.retryMultiplier, attempt);
          await sleep(waitMs);
          continue;
        }
        throw makeError('osu! API 服务不可用', 503);
      }

      // 401 — Token 失效（尝试刷新一次）
      if (status === 401 && attempt === 0 && tokenType === 'client') {
        _clientToken = null; // 强制刷新 client token
        continue;
      }
      if (status === 401 && attempt === 0 && tokenType === 'user' && user) {
        user.osuAccessToken = undefined;  // 强制重新 ensureUserToken
        continue;
      }

      // 其他错误直接抛出
      const msg = err.response?.data?.error?.description
        || err.response?.data?.error
        || err.message
        || 'osu! API 请求失败';
      throw makeError(msg, status || 502);
    }
  }

  // 全部重试耗尽
  throw makeError('osu! API 请求重试耗尽', 502);
}

// ─── 公共 API 方法 ────────────────────────────────────────────────────

/**
 * 查询 osu! 用户信息
 *
 * @param {number|string} query - osu! UID 或用户名
 * @param {Object}        [user] - User 文档（传则用 user token，否则 client credentials）
 * @returns {Promise<Object>}
 */
async function getOsuUser(query, user) {
  const key = typeof query === 'number' || /^\d+$/.test(query) ? 'id' : 'username';
  const tokenType = user ? 'user' : 'client';
  return await request('GET', `/users/${query}?key=${key}`, { tokenType, user });
}

/**
 * 查询用户指定模式的详细统计
 *
 * @param {number} osuId
 * @param {string} apiMode - 'osu' | 'taiko' | 'fruits' | 'mania'
 * @param {Object} [user]
 * @returns {Promise<Object>}
 */
async function getUserStats(osuId, apiMode, user) {
  const tokenType = user ? 'user' : 'client';
  return await request('GET', `/users/${osuId}/${apiMode}`, { tokenType, user });
}

/**
 * 获取 BP（Best Performance）列表
 *
 * @param {number}  osuId
 * @param {string}  apiMode
 * @param {number}  [limit=200]
 * @param {Object}  [user]
 * @returns {Promise<Array>}
 */
async function getBestScores(osuId, apiMode, limit = 200, user) {
  const tokenType = user ? 'user' : 'client';
  return await request('GET', `/users/${osuId}/scores/best`, {
    tokenType, user,
    params: { mode: apiMode, limit: Math.min(limit, 200) }
  });
}

/**
 * 获取 Recent Scores
 *
 * @param {number}  osuId
 * @param {string}  apiMode
 * @param {number}  [limit=50]
 * @param {boolean} [includeFails=true]
 * @param {Object}  [user]
 * @returns {Promise<Array>}
 */
async function getRecentScores(osuId, apiMode, limit = 50, includeFails = true, user) {
  const tokenType = user ? 'user' : 'client';
  return await request('GET', `/users/${osuId}/scores/recent`, {
    tokenType, user,
    params: { mode: apiMode, limit: Math.min(limit, 50), include_fails: includeFails ? '1' : '0' }
  });
}

/**
 * 获取谱面信息
 *
 * @param {number} beatmapId
 * @returns {Promise<Object>}
 */
async function getBeatmap(beatmapId) {
  return await request('GET', `/beatmaps/${beatmapId}`);
}

/**
 * 获取谱面排行榜
 *
 * @param {number} beatmapId
 * @param {Object} [opts]
 * @param {string} [opts.mode]
 * @param {string} [opts.mods]
 * @param {number} [opts.limit=50]
 * @returns {Promise<Object>}
 */
async function getBeatmapScores(beatmapId, opts = {}) {
  const { mode, mods, limit = 50, legacy, type } = opts;
  const params = { limit: Math.min(limit, 100) };
  if (mode) params.mode = mode;
  if (mods) params.mods = mods;
  if (legacy !== undefined) params.legacy_only = legacy ? 1 : 0;
  if (type) params.type = type;
  return await request('GET', `/beatmaps/${beatmapId}/scores`, { params });
}

// ─── 导出 ─────────────────────────────────────────────────────────────

/**
 * 获取用户在特定谱面的成绩
 *
 * @param {number} beatmapId
 * @param {number} osuId
 * @param {Object} [opts]
 * @param {string} [opts.mode]
 * @param {number} [opts.legacy]
 * @param {string} [opts.type]
 * @param {Object} [opts.user] - Mongoose User（使用 user token 查）
 * @returns {Promise<Object|null>}
 */
async function getUserScoreOnBeatmap(beatmapId, osuId, opts = {}) {
  const { mode, legacy, type, user } = opts;
  const tokenType = user ? 'user' : 'client';
  const params = {};
  if (mode) params.mode = mode;
  if (legacy !== undefined) params.legacy_only = legacy ? 1 : 0;
  if (type) params.type = type;
  try {
    return await request('GET', `/beatmaps/${beatmapId}/scores/users/${osuId}`, { params, tokenType, user });
  } catch (err) {
    if (err.status === 404) return null;   // 用户没打过，不是错误
    throw err;
  }
}

module.exports = {
  // Token 管理
  getClientToken,
  ensureUserToken,

  // 公共 API 方法
  getOsuUser,
  getUserStats,
  getBestScores,
  getRecentScores,
  getBeatmap,
  getBeatmapScores,
  getUserScoreOnBeatmap,

  // 工具
  request,
  makeError,
};
