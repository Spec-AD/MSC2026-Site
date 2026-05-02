/**
 * leaderboard — 谱面全球排行榜
 *
 * b1.7 升级：
 *  - 字段补全（coverUrl, status, hasReplay, osuScoreUrl）
 *  - user 平铺（userId/username/avatarUrl 不再是嵌套对象）
 *  - currentUserRank（绑定 JWT 后显示当前用户排名）
 *  - legacy 参数透传（stable/lazer 区分）
 *  - availableTypes 告知前端排行榜类型
 */

const osuApi = require('./api');

/**
 * 获取谱面排行榜
 *
 * @param {number} beatmapId
 * @param {Object} [opts]
 * @param {string} [opts.mode]   - PureBeat 模式名（内置转 osu 原生）
 * @param {string} [opts.mods]   - 'HDDT' 等 mod 缩写组合
 * @param {number} [opts.limit=50]
 * @param {number} [opts.legacy] - 0=包含 lazer, 1=仅 stable
 * @param {string} [opts.type]   - 'global' | 'country' | 'friend'
 * @param {Object} [opts.currentUser] - 当前登录用户（用于 currentUserRank）
 * @returns {Promise<Object>}
 */
async function getLeaderboard(beatmapId, opts = {}) {
  const { mode, mods, limit = 50, legacy, type, currentUser } = opts;

  // 调 osu! API
  const raw = await osuApi.getBeatmapScores(beatmapId, { mode, mods, limit, legacy, type });

  // 谱面信息
  const beatmapInfo = raw.beatmap ? {
    beatmapId:  raw.beatmap.id,
    title:      raw.beatmap.beatmapset?.title || '',
    artist:     raw.beatmap.beatmapset?.artist || '',
    version:    raw.beatmap.version || '',
    mode:       raw.beatmap.mode || '',
    coverUrl:   raw.beatmap.beatmapset?.covers?.cover || raw.beatmap.beatmapset?.covers?.['card@2x'] || '',
    status:     raw.beatmap.status || '',
    starRating: raw.beatmap.difficulty_rating || 0,
    maxCombo:   raw.beatmap.max_combo || 0,
    bpm:        raw.beatmap.bpm || 0,
  } : null;

  // 格式化成绩列表（平铺 user 字段）
  const scores = (raw.scores || []).map(s => {
    const osuScoreId = s.id || s.best_id || s.legacy_score_id;
    return {
      rank:      s.rank || s.position,
      score:     s.score || 0,
      accuracy:  s.accuracy ? s.accuracy * 100 : 0,
      pp:        s.pp || 0,
      maxCombo:  s.max_combo || 0,
      mods:      (s.mods || []).map(m => m.acronym || m),
      grade:     s.rank_letter || s.rank,
      count300:  s.statistics?.count_300 ?? null,
      count100:  s.statistics?.count_100 ?? null,
      count50:   s.statistics?.count_50 ?? null,
      countMiss: s.statistics?.count_miss ?? null,
      playedAt:  s.ended_at || s.created_at || null,
      hasReplay: !!s.replay,
      // 平铺 user 字段
      userId:    s.user?.id || s.user_id,
      username:  s.user?.username || '',
      avatarUrl: s.user?.avatar_url || '',
      countryCode: s.user?.country?.code || '',
      // 跳转链接
      osuScoreUrl: osuScoreId ? `https://osu.ppy.sh/scores/${osuScoreId}` : '',
    };
  });

  // 当前用户排名检测
  let currentUserRank = null;
  if (currentUser && currentUser.osuId) {
    // 先扫已有榜单
    const existing = scores.find(s => s.userId === currentUser.osuId);
    if (existing) {
      currentUserRank = { rank: existing.rank, highlight: true };
    } else {
      // 未上榜 → 单独查用户成绩
      try {
        const userScore = await osuApi.getUserScoreOnBeatmap(beatmapId, currentUser.osuId, { mode, legacy, type, user: currentUser });
        if (userScore && userScore.position) {
          currentUserRank = { rank: userScore.position, highlight: false };
        }
      } catch (_) {
        // 用户未打过这个图，忽略
      }
    }
  }

  return {
    beatmap: beatmapInfo,
    availableTypes: ['stable'],
    totalEntries: raw.total || scores.length,
    mode: raw.beatmap?.mode || mode || '',
    currentUserRank,
    scores
  };
}

module.exports = { getLeaderboard };
