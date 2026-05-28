/**
 * info — 玩家信息实时查询
 *
 * b1.7 升级：串行查询四模式统计数据
 * 支持 osu! 用户名或 UID 查询，5 分钟内存缓存
 * 使用 Client Credentials（公共查询）
 */

const osuApi = require('./api');

// ─── 5 分钟缓存 ───────────────────────────────────────────────────────

const MODE_MAP = { standard: 'osu', taiko: 'taiko', catch: 'fruits', mania: 'mania' };
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟
const infoCache = new Map();

function getCacheKey(query) {
  return `info:${String(query)}`;
}

function getFromCache(query) {
  const key = getCacheKey(query);
  const entry = infoCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  infoCache.delete(key);
  return null;
}

function setCache(query, data) {
  const key = getCacheKey(query);
  infoCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  // 缓存清理：超过 100 条时删除最旧的
  if (infoCache.size > 100) {
    const oldest = infoCache.keys().next().value;
    if (oldest) infoCache.delete(oldest);
  }
}

// ─── 主查询 ────────────────────────────────────────────────────────────

/**
 * 格式化 mode 统计数据
 */
function formatStats(statistics, modeData = null) {
  if (!statistics) return null;
  const result = {
    pp:          statistics.pp || 0,
    rank:        statistics.global_rank || 0,
    countryRank: statistics.country_rank || 0,
    accuracy:    statistics.hit_accuracy || 0,
    playCount:   statistics.play_count || 0,
    totalHits:   statistics.total_hits || 0,
    level:       statistics.level?.current || 0,
    maxCombo:    statistics.maximum_combo || 0,
    // b1.7.10 统一字段名（与 syncStats osuDetails 一致）
    maximumCombo: statistics.maximum_combo || 0,
    rankedScore:  statistics.ranked_score || 0,
    totalScore:   statistics.total_score || 0,
    // 第三轮新增
    playTime:        statistics.play_time || 0,
    replaysWatched:  statistics.replays_watched_by_others || 0,
    replaysWatchedByOthers: statistics.replays_watched_by_others || 0,  // 前端用名
    rankHistory:     modeData?.rank_history?.data || [],
    // b1.7.10 Grade 计数（同步到 osuDetails 时用，实时查询也提供）
    gradeCounts: {
      ssh: statistics.grade_counts?.ssh || 0,
      ss:  statistics.grade_counts?.ss || 0,
      sh:  statistics.grade_counts?.sh || 0,
      s:   statistics.grade_counts?.s || 0,
      a:   statistics.grade_counts?.a || 0,
    },
  };
  return result;
}

/**
 * 查询 osu! 玩家信息（四模式）
 *
 * @param {string|number} query - 用户名或 UID
 * @returns {Promise<Object>} 四模式玩家信息
 */
async function getInfo(query) {
  // 查缓存
  const cached = getFromCache(query);
  if (cached) return cached;

  // 1. 基础用户信息（不含统计数据，仅获取 osuId）
  const raw = await osuApi.getOsuUser(query);
  const osuId = raw.id;

  // 2. 串行查询四模式 stats
  const stats = {};
  const modePlayCounts = {};
  for (const [internalMode, apiMode] of Object.entries(MODE_MAP)) {
    try {
      const modeData = await osuApi.getUserStats(osuId, apiMode);
      stats[internalMode] = formatStats(modeData.statistics, modeData);
      modePlayCounts[internalMode] = modeData.statistics?.play_count || 0;
    } catch (_) {
      stats[internalMode] = null;
      modePlayCounts[internalMode] = 0;
    }
  }

  // 计算 defaultMode：playCount 最高的模式
  const defaultMode = Object.entries(modePlayCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'standard';

  const result = {
    osuId,
    username: raw.username,
    avatarUrl: raw.avatar_url,
    coverUrl: raw.cover?.url || '',
    joinDate: raw.join_date || null,
    profileColour: raw.profile_colour || null,
    playMode: raw.playmode || 'osu',
    // 第三轮新增
    defaultMode,
    countryCode: raw.country?.code || '',  // 改名为 countryCode 避免与对象格式混淆
    rankHistory: raw.rank_history?.data || [],
    badges: raw.badges || [],
    badgeCount: raw.badges?.length || 0,
    friendsCount: raw.friends_count || null,
    followerCount: raw.follower_count || null,
    mapperFollowersCount: raw.follower_count || null,  // osu! 中 follower_count 即谱师关注者
    // 模式统计数据
    statistics: stats
  };

  // 写入缓存
  setCache(query, result);

  return result;
}

/**
 * 查询本地用户的 osu 统计数据（从 User.osuDetails 读取）
 *
 * @param {Object} user - Mongoose User 文档
 * @param {string} mode - 指定模式（不传则返回 playCount 最多的）
 * @returns {Object}     本地统计数据
 */
function getLocalUserStats(user, mode) {
  if (!user.osuDetails) return null;

  const targetMode = mode || getPrimaryMode(user);
  const stats = user.osuDetails[targetMode];

  if (!stats) return null;

  return {
    mode: targetMode,
    statistics: stats,
    otherModes: Object.fromEntries(
      Object.entries(user.osuDetails)
        .filter(([m]) => m !== targetMode && stats)
    )
  };
}

/**
 * 确定用户的主要模式（各模式中 playCount 最大的，若都为空则返回 standard）
 */
function getPrimaryMode(user) {
  if (!user.osuDetails) return 'standard';
  const modes = Object.keys(user.osuDetails);
  if (modes.length === 0) return 'standard';

  return modes.reduce((best, mode) => {
    const a = user.osuDetails[mode]?.playCount || 0;
    const b = user.osuDetails[best]?.playCount || 0;
    return a > b ? mode : best;
  }, modes[0]);
}

module.exports = { getInfo, getLocalUserStats, getPrimaryMode };
