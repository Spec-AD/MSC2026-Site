/**
 * leaderboard — 谱面全球排行榜（b1.7 第二轮）
 *
 * 修复/变更：
 *  - rank 使用 index+1（修复 #S 显示问题）
 *  - score 优先 legacy_total_score（stable 分制）
 *  - mode 使用 PureBeat 命名（standard/taiko/catch/mania）
 *  - 新增 beatmap 详情字段（od/cs/ar/hp/totalLength/modeInt）
 *  - 新增 userScore（未上榜用户的成绩展示）
 *  - 移除 mode/mods 参数（BID 自带 mode，Mod 筛选不允许）
 */

const osuApi = require('./api');

// mode 名转换：osu 原生 → PureBeat
const MODE_MAP_REVERSE = { osu: 'standard', taiko: 'taiko', fruits: 'catch', mania: 'mania' };

// ─── 120s 内存缓存 ──────────────────────────────────────────────────────
const CACHE_TTL = 120 * 1000;
const lbCache = new Map();

function cacheKey(bid, opts) {
  return `${bid}:${opts.limit || 50}:${opts.legacy ?? ''}:${opts.type || 'global'}`;
}

function getFromCache(key) {
  const entry = lbCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  lbCache.delete(key);
  return null;
}

function setCache(key, data) {
  lbCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  if (lbCache.size > 200) {
    const oldest = lbCache.keys().next().value;
    if (oldest) lbCache.delete(oldest);
  }
}

/**
 * 格式化 Score 对象为通用判定字段
 */
function formatJudgements(s) {
  return {
    count300:  s.statistics?.count_300 ?? null,    // ← 旧字段，过渡期保留
    count100:  s.statistics?.count_100 ?? null,
    count50:   s.statistics?.count_50 ?? null,
    countMiss: s.statistics?.count_miss ?? null,
    // 别名（同值不同名，方便前端按 mode 动态映射）
    countGreat:  s.statistics?.count_300 ?? null,  // 300 / GREAT
    countOk:     s.statistics?.count_100 ?? null,  // 100 / OK
    countMeh:    s.statistics?.count_50 ?? null,   // 50 / MEH
    // 多模式专属字段
    countPerf:    s.statistics?.count_geki ?? null,   // mania PERFECT(Geki) / 标准 combo break
    countLDrp:    s.statistics?.count_large_droplet ?? null,
    countSDrpMiss: s.statistics?.count_small_droplet_miss ?? null,
  };
}

/**
 * 格式化单个 score 条目
 */
function formatScore(s, rank) {
  const osuScoreId = s.id || s.best_id || s.legacy_score_id;
  return {
    rank,
    score:     s.legacy_total_score || s.total_score || s.score || 0,
    accuracy:  s.accuracy ? s.accuracy * 100 : 0,
    pp:        s.pp || 0,
    maxCombo:  s.max_combo || 0,
    mods:      (s.mods || []).map(m => m.acronym || m),
    grade:     s.rank_letter || s.rank || '',
    playedAt:  s.ended_at || s.created_at || null,
    hasReplay: !!s.replay,
    // 判定（通用字段）
    ...formatJudgements(s),
    // 平铺 user
    userId:    s.user?.id || s.user_id,
    username:  s.user?.username || '',
    avatarUrl: s.user?.avatar_url || '',
    countryCode: s.user?.country?.code || '',
    // 跳转
    osuScoreUrl: osuScoreId ? `https://osu.ppy.sh/scores/${osuScoreId}` : '',
  };
}

/**
 * 给缓存的排行榜响应注入当前用户的排名/成绩
 */
async function injectUserScore(response, beatmapId, currentUser, legacy, type) {
  if (!currentUser || !currentUser.osuId) {
    return { ...response, currentUserRank: null, userScore: null };
  }

  const existing = response.scores.find(s => s.userId === currentUser.osuId);
  if (existing) {
    return { ...response, currentUserRank: { rank: existing.rank, highlight: true }, userScore: null };
  }

  // 未上榜 → 查用户是否打过这个图
  try {
    const us = await osuApi.getUserScoreOnBeatmap(beatmapId, currentUser.osuId, { legacy, type, user: currentUser });
    if (us) {
      if (us.position) {
        return { ...response, currentUserRank: { rank: us.position, highlight: false }, userScore: null };
      }
      return {
        ...response,
        currentUserRank: null,
        userScore: { ...formatScore(us, null), isOnLeaderboard: false },
      };
    }
  } catch (_) {
    // 用户没打过这个图，什么都不做
  }

  return { ...response, currentUserRank: null, userScore: null };
}

/**
 * 获取谱面排行榜
 *
 * @param {number} beatmapId
 * @param {Object} [opts]
 * @param {number} [opts.limit=50]
 * @param {number} [opts.legacy] - 0=包含 lazer, 1=仅 stable
 * @param {string} [opts.type]   - 'global' | 'country' | 'friend'
 * @param {Object} [opts.currentUser] - 当前登录用户（用于 currentUserRank + userScore）
 * @returns {Promise<Object>}
 */
async function getLeaderboard(beatmapId, opts = {}) {
  const { limit = 50, legacy, type, currentUser } = opts;

  // 缓存命中直接返回（只缓存 API 响应，userScore 动态查）
  const ckey = cacheKey(beatmapId, opts);
  const cached = getFromCache(ckey);
  if (cached) {
    // userScore 仍需要根据当前用户动态查
    const result = await injectUserScore(cached, beatmapId, currentUser, legacy, type);
    return result;
  }

  // 1. 调 osu! API 获取排行榜（不传 mode/mods）
  const raw = await osuApi.getBeatmapScores(beatmapId, { limit, legacy, type });

  // 2. 谱面信息：排行榜 API 在 scores 为空时不返回 beatmap 对象
  //    此时单独调 getBeatmap 补数据
  let beatmapData = raw.beatmap;
  if (!beatmapData) {
    try {
      beatmapData = await osuApi.getBeatmap(beatmapId);
    } catch (_) {
      // beatmap 不存在，保持 null
    }
  }

  const nativeMode = beatmapData?.mode || '';
  const pureBeatMode = MODE_MAP_REVERSE[nativeMode] || nativeMode;

  const beatmapset = beatmapData?.beatmapset;
  const beatmapInfo = beatmapData ? {
    beatmapId:    beatmapData.id,
    title:        beatmapset?.title || '',
    titleUnicode: beatmapset?.title_unicode || '',
    artist:       beatmapset?.artist || '',
    version:      beatmapData.version || '',
    mode:         pureBeatMode,
    coverUrl:     beatmapset?.covers?.cover || beatmapset?.covers?.['card@2x'] || '',
    status:       beatmapData.status || '',
    starRating:   beatmapData.difficulty_rating || 0,
    maxCombo:     beatmapData.max_combo || 0,
    bpm:          beatmapData.bpm || 0,
    // 第二轮新增谱面属性
    od:           beatmapData.accuracy ?? 0,
    cs:           beatmapData.cs ?? 0,
    ar:           beatmapData.approach_rate ?? 0,  // graveyard 谱面可能是 undefined
    hp:           beatmapData.drain ?? 0,
    totalLength:  beatmapData.total_length || 0,
    hitLength:    beatmapData.hit_length || 0,
    modeInt:      beatmapData.mode_int ?? 0,
    // 第三轮新增：谱师 & 曲目详情
    mapperId:      beatmapset?.creator_id || null,
    mapperUsername: beatmapset?.creator || '',
    submittedDate: beatmapset?.submitted_date || null,
    rankedDate:    beatmapset?.ranked_date || null,
    circles:       beatmapData.count_circles || 0,
    sliders:       beatmapData.count_sliders || 0,
    spinners:      beatmapData.count_spinners || 0,
  } : null;

  // 格式化成绩列表（rank = index + 1）
  const scores = (raw.scores || []).map((s, i) => formatScore(s, i + 1));

  const response = {
    beatmap: beatmapInfo,
    availableTypes: ['stable'],
    mode: pureBeatMode,
    totalEntries: raw.total || scores.length,
    scores,
  };

  // 写入缓存（不含 currentUserRank / userScore）
  setCache(ckey, response);

  // 当前用户排名 + 未上榜成绩检测（动态，不缓存）
  const result = await injectUserScore(response, beatmapId, currentUser, legacy, type);
  return result;
}

module.exports = { getLeaderboard };
