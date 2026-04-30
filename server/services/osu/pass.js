/**
 * pass — 最近通过的单个成绩
 *
 * 每个模式仅返回 1 条 pass 成绩（rank !== "F"）
 * 按 playedAt 降序取最新一条
 */

const OsuScore = require('../../models/OsuScore');

const MODES = ['standard', 'taiko', 'catch', 'mania'];

/**
 * 获取指定模式的最新 pass 成绩
 *
 * @param {string} userId
 * @param {string} mode - 'standard' | 'taiko' | 'catch' | 'mania'
 * @returns {Promise<Object|null>}
 */
async function getPass(userId, mode) {
  return await OsuScore.findOne(
    { userId, mode, grade: { $ne: 'F' } },
    { _id: 0, userId: 0 }
  )
    .sort({ playedAt: -1 })
    .lean();
}

/**
 * 获取所有四模式的最新 pass 成绩
 *
 * @param {string} userId
 * @returns {Promise<Object>} - { standard: {...}, taiko: {...}, catch: {...}, mania: {...} }
 */
async function getAllPass(userId) {
  const results = {};
  for (const mode of MODES) {
    results[mode] = await getPass(userId, mode);
  }
  return results;
}

module.exports = { getPass, getAllPass };
