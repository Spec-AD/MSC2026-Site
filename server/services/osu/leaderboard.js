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
    countPerf:    s.statistics?.count_perfect ?? null,
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
    score:     s.legacy_total_score ?? s.total_score ?? s.score ?? 0,
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

  // 调 osu! API（不传 mode/mods — BID 自带 mode，Mod 筛选已移除）
  const raw = await osuApi.getBeatmapScores(beatmapId, { limit, legacy, type });

  // 谱面信息
  const nativeMode = raw.beatmap?.mode || '';
  const pureBeatMode = MODE_MAP_REVERSE[nativeMode] || nativeMode;

  const beatmapInfo = raw.beatmap ? {
    beatmapId:    raw.beatmap.id,
    title:        raw.beatmap.beatmapset?.title || '',
    artist:       raw.beatmap.beatmapset?.artist || '',
    version:      raw.beatmap.version || '',
    mode:         pureBeatMode,
    coverUrl:     raw.beatmap.beatmapset?.covers?.cover || raw.beatmap.beatmapset?.covers?.['card@2x'] || '',
    status:       raw.beatmap.status || '',
    starRating:   raw.beatmap.difficulty_rating || 0,
    maxCombo:     raw.beatmap.max_combo || 0,
    bpm:          raw.beatmap.bpm || 0,
    // 第二轮新增谱面属性
    od:           raw.beatmap.accuracy ?? 0,
    cs:           raw.beatmap.cs ?? 0,
    ar:           raw.beatmap.approach_rate ?? 0,
    hp:           raw.beatmap.drain ?? 0,
    totalLength:  raw.beatmap.total_length || 0,
    hitLength:    raw.beatmap.hit_length || 0,
    modeInt:      raw.beatmap.mode_int ?? 0,
  } : null;

  // 格式化成绩列表（rank = index + 1）
  const scores = (raw.scores || []).map((s, i) => formatScore(s, i + 1));

  // 当前用户排名 + 未上榜成绩检测
  let currentUserRank = null;
  let userScore = null;

  if (currentUser && currentUser.osuId) {
    const existing = scores.find(s => s.userId === currentUser.osuId);
    if (existing) {
      currentUserRank = { rank: existing.rank, highlight: true };
    } else {
      // 未上榜 → 查用户是否打过这个图
      try {
        const us = await osuApi.getUserScoreOnBeatmap(beatmapId, currentUser.osuId, { legacy, type, user: currentUser });
        if (us) {
          if (us.position) {
            // 有排名但不在前 N 条内
            currentUserRank = { rank: us.position, highlight: false };
          } else {
            // 有成绩但没入榜
            userScore = {
              ...formatScore(us, null),
              isOnLeaderboard: false,
            };
          }
        }
      } catch (_) {
        // 用户没打过这个图，什么都不做
      }
    }
  }

  return {
    beatmap: beatmapInfo,
    availableTypes: ['stable'],
    mode: pureBeatMode,
    totalEntries: raw.total || scores.length,
    currentUserRank,
    userScore,
    scores,
  };
}

module.exports = { getLeaderboard };
