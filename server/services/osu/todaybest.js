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
 *   { scores: [...], bp200Threshold: number, isNewRecord: boolean }
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

  // 今日玩 BP 成绩（仅 Ranked/Approved, 排除 F）
  const todayScores = await OsuScore.find({
    userId,
    mode,
    grade: { $ne: 'F' },
    beatmapStatus: { $in: [/^ranked$/i, /^approved$/i] },
    playedAt: { $gte: todayMidnight }
  })
    .sort({ pp: -1 })
    .lean();

  // 当前 BP 200 底线（仅 Ranked/Approved, 最后一名 PP 值）
  const bp200 = await OsuScore.find({
    userId,
    mode,
    beatmapStatus: { $in: [/^ranked$/i, /^approved$/i] }
  })
    .sort({ pp: -1 })
    .limit(200)
    .select('pp')
    .lean();

  console.log('[todaybest debug] bp200 count=%d, threshold=%d', bp200.length, bp200[199]?.pp || 0);

  const bp200Threshold = bp200.length >= 200
    ? (bp200[199]?.pp || 0)
    : 0;

  // 筛选今日成绩中 PP >= BP 底线的谱面
  const qualifiedScores = todayScores.filter(s => s.pp >= bp200Threshold);

  // 是否有新 record
  const isNewRecord = qualifiedScores.length > 0;

  return {
    scores: qualifiedScores.map(s => {
      const { _id, userId: uid, ...rest } = s;
      return rest;
    }),
    bp200Threshold,
    isNewRecord
  };
}

module.exports = { getTodayBest };
