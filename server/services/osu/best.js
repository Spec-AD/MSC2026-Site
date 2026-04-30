/**
 * best — BP 列表（扩展至 BP 200）
 *
 * 分页查询当前用户的最好成绩，按 PP 降序排列
 */

const OsuScore = require('../../models/OsuScore');

/**
 * 获取 BP 列表
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.mode
 * @param {number} [opts.limit=200]
 * @param {number} [opts.page=1]
 * @returns {Promise<Object>}  { scores, total, limit, page, hasMore }
 */
async function getBest({ userId, mode, limit = 200, page = 1 }) {
  const skip = (page - 1) * limit;

  const [scores, total] = await Promise.all([
    OsuScore.find({ userId, mode }, { _id: 0, userId: 0 })
      .sort({ pp: -1, beatmapId: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OsuScore.countDocuments({ userId, mode })
  ]);

  return {
    scores,
    total,
    limit,
    page,
    hasMore: skip + scores.length < total
  };
}

module.exports = { getBest };
