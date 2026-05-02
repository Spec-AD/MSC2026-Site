/**
 * osu! 增量同步引擎
 *
 * b1.7 重构：
 *  - deleteMany + insertMany → upsert 模式
 *  - BP 100 → BP 200
 *  - 对比 beatmapId + mode：无变化跳过，有变更 upsert，掉出 BP 200 删除
 *  - 填充新增字段（maxCombo、count300 等）
 */

const OsuScore = require('../../models/OsuScore');
const osuApi = require('./api');

// frontendId → apiMode
const MODE_MAP = { standard: 'osu', taiko: 'taiko', catch: 'fruits', mania: 'mania' };
const MODE_MAP_REVERSE = Object.fromEntries(Object.entries(MODE_MAP).map(([k, v]) => [v, k]));

/**
 * 将 osu! API 返回的 score 对象映射为 OsuScore 文档
 */
function mapScoreToDoc(userId, apiScore) {
  const beatmap = apiScore.beatmap;
  const beatmapset = apiScore.beatmapset;
  const mode = MODE_MAP_REVERSE[beatmap.mode] || beatmap.mode;

  return {
    userId,
    mode,
    beatmapId: beatmap.id,
    title: beatmapset?.title || '',
    version: beatmap.version || '',
    accuracy: apiScore.accuracy ? apiScore.accuracy * 100 : 0,
    mods: (apiScore.mods || []).map(m => m.acronym || m),
    pp: apiScore.pp || 0,
    grade: apiScore.rank || '',
    coverUrl: beatmapset?.covers?.list || '',
    playedAt: apiScore.created_at || new Date(),
    // b1.7 新字段
    maxCombo:  apiScore.max_combo ?? null,
    combo:     apiScore.max_combo ?? null,    // max_combo 即 combo
    count300:  apiScore.statistics?.count_300 ?? null,
    count100:  apiScore.statistics?.count_100 ?? null,
    count50:   apiScore.statistics?.count_50 ?? null,
    countMiss: apiScore.statistics?.count_miss ?? null,
    // b1.7 新增: 总分与曲目状态
    score:         apiScore.total_score ?? apiScore.score ?? 0,
    beatmapStatus: beatmap.status || '',
  };
}

/**
 * 同步指定用户的 BP 列表（增量 upsert）
 *
 * @param {Object} user          - Mongoose User 文档
 * @param {string} frontendMode  - 'standard' | 'taiko' | 'catch' | 'mania'
 * @returns {Promise<Object>}    - { upserted, inserted, updated, deleted }
 */
async function syncBP(user, frontendMode) {
  const apiMode = MODE_MAP[frontendMode];
  if (!apiMode) throw new Error(`未知模式: ${frontendMode}`);

  // 从 osu! API 获取 BP 200
  const apiScores = await osuApi.getBestScores(user.osuId, apiMode, 200, user);

  // 已有本地成绩
  const localScores = await OsuScore.find({ userId: user._id, mode: frontendMode }).lean();
  const localMap = new Map(localScores.map(s => [s.beatmapId, s]));

  const upsertOps = [];
  const incomingIds = new Set();

  for (const apiScore of apiScores) {
    const beatmapId = apiScore.beatmap.id;
    incomingIds.add(beatmapId);

    const doc = mapScoreToDoc(user._id, apiScore);
    const existing = localMap.get(beatmapId);

    // 无变化跳过
    if (existing && existing.pp === doc.pp && existing.playedAt?.toISOString?.() === doc.playedAt?.toISOString?.()) {
      continue;
    }

    upsertOps.push({
      updateOne: {
        filter: { userId: user._id, mode: frontendMode, beatmapId },
        update: { $set: doc },
        upsert: true
      }
    });
  }

  // 删除掉出 BP 200 的旧成绩
  const deleteResult = await OsuScore.deleteMany({
    userId: user._id,
    mode: frontendMode,
    beatmapId: { $nin: [...incomingIds] }
  });

  let upserted = 0, updated = 0;
  if (upsertOps.length > 0) {
    const bulkResult = await OsuScore.bulkWrite(upsertOps);
    upserted = bulkResult.upsertedCount || 0;
    updated = bulkResult.modifiedCount || 0;
  }

  return {
    upserted,
    updated,
    inserted: upserted,
    deleted: deleteResult.deletedCount
  };
}

/**
 * 将 osu API 错误映射到标准错误码
 */
function classifyError(err) {
  if (err.status === 401) return 'token_expired';
  if (err.status === 429) return 'rate_limited';
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('network')) {
    return 'network_error';
  }
  return 'api_error';
}

/**
 * 同步所有四模式的 BP
 *
 * 各模式独立 try-catch，一个模式失败不影响其他模式
 *
 * @param {Object} user - Mongoose User 文档
 * @returns {Promise<Object>} - 各模式同步结果
 */
async function syncAllModes(user) {
  const results = {};
  for (const [frontendMode] of Object.entries(MODE_MAP)) {
    const modeResult = {};
    // 统计信息（可能失败但不阻塞 BP）
    try {
      await syncStats(user, frontendMode);
      modeResult.stats = 'success';
    } catch (err) {
      modeResult.stats = classifyError(err);
    }
    // BP 同步
    try {
      const bpResult = await syncBP(user, frontendMode);
      modeResult.bp = { status: 'success', count: (bpResult.upserted || 0) + (bpResult.updated || 0) };
    } catch (err) {
      modeResult.bp = { status: 'failed', error: classifyError(err) };
    }
    results[frontendMode] = modeResult;
  }
  return results;
}

/**
 * 同步指定模式的统计数据（写入 User.osuDetails）
 *
 * @param {Object} user          - Mongoose User 文档
 * @param {string} frontendMode
 */
async function syncStats(user, frontendMode) {
  const apiMode = MODE_MAP[frontendMode];
  if (!apiMode) throw new Error(`未知模式: ${frontendMode}`);

  const osuStats = await osuApi.getUserStats(user.osuId, apiMode, user);
  const stats = osuStats.statistics;

  if (!user.osuDetails) user.osuDetails = {};
  user.osuDetails[frontendMode] = {
    pp:           stats.pp || 0,
    rank:         stats.global_rank || 0,
    countryRank:  stats.country_rank || 0,
    accuracy:     stats.hit_accuracy || 0,
    playCount:    stats.play_count || 0,
    totalHits:    stats.total_hits || 0,
    level:        stats.level?.current || 0,
  };
  user.markModified('osuDetails');

  // 保持向后兼容——standard 模式的全局字段
  if (frontendMode === 'standard') {
    user.osuPp          = stats.pp || 0;
    user.osuGlobalRank  = stats.global_rank || 0;
    user.osuCountryRank = stats.country_rank || 0;
  }

  await user.save();
  return user.osuDetails[frontendMode];
}

module.exports = {
  syncBP,
  syncAllModes,
  syncStats,
  MODE_MAP,
  MODE_MAP_REVERSE,
};
