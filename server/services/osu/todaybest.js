/**
 * todaybest — 今日最佳成绩
 *
 * 查询今日通过的成绩中，PP 高于当前 BP 200 底线的成绩。
 * 纯本地计算，无需调 osu! API。
 */

const OsuScore = require('../../models/OsuScore');

/**
 * 获取当日零点时间戳
 */
function getTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 获取今日最佳成绩
 *
 * @param {string} userId
 * @param {string} mode
 * @returns {Promise<Object>}
 *   { scores: [...], bpThreshold: number, isNewRecord: boolean }
 */
async function getTodayBest(userId, mode) {
  const todayMidnight = getTodayMidnight();

  // Bug 3 debug: 检查 beatmapStatus 实际值
  const sampleStatuses = await OsuScore.find({ userId, mode })
    .limit(5)
    .select('beatmapStatus pp playedAt')
    .lean();
  console.log('[todaybest debug] mode=%s, todayMidnight=%s, sample statuses:', mode, todayMidnight.toISOString(),
    JSON.stringify(sampleStatuses.map(s => ({ status: s.beatmapStatus, pp: s.pp, playedAt: s.playedAt }))));

  // 今日成绩（仅 Ranked/Approved, 排除 F, 排除 BP 陈旧数据）
  const todayScores = await OsuScore.find({
    userId,
    mode,
    grade: { $ne: 'F' },
    beatmapStatus: { $in: [/^ranked$/i, /^approved$/i] },
    playedAt: { $gte: todayMidnight },
    source: { $ne: 'bp' },  // 只统计 recent 来源的今日成绩
  })
    .sort({ pp: -1 })
    .lean();

  // 当前 BP 100 底线（仅 Ranked/Approved, 最后一名 PP 值）
  const BP_LIMIT = 100;
  const bpScores = await OsuScore.find({
    userId,
    mode,
    beatmapStatus: { $in: [/^ranked$/i, /^approved$/i] }
  })
    .sort({ pp: -1 })
    .limit(BP_LIMIT)
    .select('pp')
    .lean();

  console.log('[todaybest debug] bp count=%d, threshold=%d', bpScores.length, bpScores[BP_LIMIT - 1]?.pp || 0);

  const bpThreshold = bpScores.length >= BP_LIMIT
    ? (bpScores[BP_LIMIT - 1]?.pp || 0)
    : 0;

  // 筛选今日成绩中 PP >= BP 底线的谱面
  const qualifiedScores = todayScores.filter(s => s.pp >= bpThreshold);

  // 是否有新 record
  const isNewRecord = qualifiedScores.length > 0;

  return {
    scores: qualifiedScores.map(s => {
      const { _id, userId: uid, ...rest } = s;
      return rest;
    }),
    bpThreshold,
    isNewRecord
  };
}

module.exports = { getTodayBest };
