/**
 * map — 谱面信息查询（含缓存）
 *
 * 查 BeatmapCache 命中则直接返回
 * 未命中调 osu! API 获取并写入缓存（TTL 24h）
 */

const BeatmapCache = require('../../models/BeatmapCache');
const osuApi = require('./api');

/**
 * 规范化 osu! API 返回的谱面数据
 */
function normalizeBeatmap(raw) {
  return {
    beatmapId:      raw.id,
    beatmapsetId:   raw.beatmapset_id || raw.beatmapset?.id,
    mode:           raw.mode || raw.mode_int?.toString(),
    title:          raw.beatmapset?.title || raw.title || '',
    artist:         raw.beatmapset?.artist || raw.artist || '',
    creator:        raw.beatmapset?.creator || raw.creator || '',
    version:        raw.version || '',
    bpm:            raw.bpm || 0,
    length:         raw.total_length || 0,
    cs:             raw.cs || 0,
    ar:             raw.ar || 0,
    od:             raw.od || 0,
    hp:             raw.drain || 0,
    starRating:     raw.difficulty_rating || 0,
    aimDifficulty:  raw.aim_difficulty || 0,
    speedDifficulty: raw.speed_difficulty || 0,
    maxCombo:       raw.max_combo || 0,
    passcount:      raw.passcount || 0,
    playcount:      raw.playcount || 0,
    covers: {
      cover:     raw.beatmapset?.covers?.cover      || raw.covers?.cover      || '',
      card:      raw.beatmapset?.covers?.card       || raw.covers?.card       || '',
      list:      raw.beatmapset?.covers?.list       || raw.covers?.list       || '',
      slimCover: raw.beatmapset?.covers?.slim_cover || raw.covers?.slim_cover || '',
    },
    status:         raw.status || 'unknown',
    lastUpdated:    new Date(),
    expiresAt:      new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

/**
 * 获取谱面信息（优先读缓存）
 *
 * @param {number} beatmapId
 * @returns {Promise<Object>}
 */
async function getMap(beatmapId) {
  // 查缓存
  const cached = await BeatmapCache.findOne({ beatmapId }).lean();
  if (cached) {
    const { _id, __v, expiresAt, ...rest } = cached;
    return { ...rest, cached: true };
  }

  // 未命中 → 调 osu! API
  const raw = await osuApi.getBeatmap(beatmapId);
  const normalized = normalizeBeatmap(raw);

  // 写缓存（不阻塞返回）
  BeatmapCache.findOneAndUpdate(
    { beatmapId },
    { $set: normalized },
    { upsert: true, new: true }
  ).catch(err => console.error('BeatmapCache 写入失败:', err.message));

  return { ...normalized, cached: false };
}

module.exports = { getMap };
