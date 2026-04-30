/**
 * info — 玩家信息实时查询
 *
 * 支持 osu! 用户名或 UID 查询
 * 无需绑定即可查他人信息
 * 使用 Client Credentials（公共查询）
 */

const osuApi = require('./api');

/**
 * 查询 osu! 玩家信息
 *
 * @param {string|number} query - 用户名或 UID
 * @returns {Promise<Object>} 标准化玩家信息
 */
async function getInfo(query) {
  const raw = await osuApi.getOsuUser(query);

  return {
    osuId:        raw.id,
    username:     raw.username,
    avatarUrl:    raw.avatar_url,
    country:      raw.country?.code || '',
    coverUrl:     raw.cover?.url || '',
    joinDate:     raw.join_date || null,
    profileColour: raw.profile_colour || null,
    playMode:     raw.playmode || 'osu',
    statistics: {
      standard: raw.statistics ? {
        pp:          raw.statistics.pp || 0,
        rank:        raw.statistics.global_rank || 0,
        countryRank: raw.statistics.country_rank || 0,
        accuracy:    raw.statistics.hit_accuracy || 0,
        playCount:   raw.statistics.play_count || 0,
        totalHits:   raw.statistics.total_hits || 0,
        level:       raw.statistics.level?.current || 0,
        maxCombo:    raw.statistics.maximum_combo || 0,
        rankedScore: raw.statistics.ranked_score || 0,
        totalScore:  raw.statistics.total_score || 0,
      } : null
    }
  };
}

module.exports = { getInfo };
