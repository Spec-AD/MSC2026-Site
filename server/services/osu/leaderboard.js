/**
 * leaderboard — 谱面全球排行榜
 *
 * 调 osu! API 实时获取指定谱面的排行榜
 * 支持 mode / mods 过滤
 */

const osuApi = require('./api');

/**
 * 获取谱面排行榜
 *
 * @param {number} beatmapId
 * @param {Object} [opts]
 * @param {string} [opts.mode]  - 'osu' | 'taiko' | 'fruits' | 'mania'
 * @param {string} [opts.mods]  - 'HDDT' 等 mod 缩写组合
 * @param {number} [opts.limit=50]
 * @returns {Promise<Object>}
 */
async function getLeaderboard(beatmapId, opts = {}) {
  const { mode, mods, limit = 50 } = opts;

  const raw = await osuApi.getBeatmapScores(beatmapId, { mode, mods, limit });

  // 提取谱面基本信息
  const beatmapInfo = raw.beatmap ? {
    beatmapId: raw.beatmap.id,
    title:     raw.beatmap.beatmapset?.title || '',
    artist:    raw.beatmap.beatmapset?.artist || '',
    version:   raw.beatmap.version || '',
    mode:      raw.beatmap.mode || '',
    starRating: raw.beatmap.difficulty_rating || 0,
    maxCombo:  raw.beatmap.max_combo || 0,
    bpm:       raw.beatmap.bpm || 0,
  } : null;

  // 格式化排行榜成绩
  const scores = (raw.scores || []).map(s => ({
    rank:         s.rank || s.position,
    score:        s.score || 0,
    accuracy:     s.accuracy ? s.accuracy * 100 : 0,
    pp:           s.pp || 0,
    maxCombo:     s.max_combo || 0,
    mods:         (s.mods || []).map(m => m.acronym || m),
    grade:        s.rank_letter || s.rank,
    combo:        s.max_combo || 0,
    count300:     s.statistics?.count_300 ?? null,
    count100:     s.statistics?.count_100 ?? null,
    count50:      s.statistics?.count_50 ?? null,
    countMiss:    s.statistics?.count_miss ?? null,
    user: {
      id:         s.user?.id || s.user_id,
      username:   s.user?.username || '',
      avatarUrl:  s.user?.avatar_url || '',
      country:    s.user?.country?.code || '',
    }
  }));

  return {
    beatmap: beatmapInfo,
    scores,
    total: scores.length
  };
}

module.exports = { getLeaderboard };
