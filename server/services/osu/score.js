/**
 * score — 指定谱面的最好成绩
 *
 * 查询当前用户（或指定用户）在某谱面上的最好成绩
 */

const OsuScore = require('../../models/OsuScore');
const User = require('../../models/User');

/**
 * 获取某用户在指定谱面的最好成绩
 *
 * @param {string}  userId   - 查询的目标用户 ID
 * @param {number}  beatmapId
 * @param {string}  [mode]   - 可选，用于精确匹配模式
 * @returns {Promise<Object|null>}
 */
async function getScore(userId, beatmapId, mode) {
  const filter = { userId, beatmapId };
  if (mode) filter.mode = mode;

  return await OsuScore.findOne(filter, { _id: 0, userId: 0 })
    .sort({ pp: -1 })
    .lean();
}

/**
 * 根据用户名获取谱面最好成绩
 *
 * @param {string}  username  - PureBeat 用户名
 * @param {number}  beatmapId
 * @param {string}  [mode]
 * @returns {Promise<Object|null>}
 */
async function getScoreByUsername(username, beatmapId, mode) {
  const targetUser = await User.findOne({ username }).select('_id').lean();
  if (!targetUser) return null;
  return await getScore(targetUser._id, beatmapId, mode);
}

module.exports = { getScore, getScoreByUsername };
