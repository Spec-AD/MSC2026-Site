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

  // 今日通过的成绩（排除 F）
  const todayScores = await OsuScore.find({
    userId,
    mode,
    grade: { $ne: 'F' },
    playedAt: { $gte: todayMidnight }
  })
    .sort({ pp: -1 })
    .lean();

  // 当前 BP 200 底线（最后一名 PP 值）
  const bp200 = await OsuScore.find({ userId, mode })
    .sort({ pp: -1 })
    .limit(200)
    .select('pp')
    .lean();

  const bp200Threshold = bp200.length >= 200
    ? (bp200[199]?.pp || 0)
    : 0;

  // 筛选今日成绩中 PP 高于 BP 底线（或 BP 未满时所有今日 pass 成绩）
  const qualifiedScores = todayScores.filter(s => s.pp > bp200Threshold || bp200.length < 200);

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
