/**
 * 🏆 奖励发放
 */

const User = require('../../models/User');

/**
 * 根据排名计算 XP 奖励
 * @param {number} rank
 * @param {Object} rewardConfig — tournament.rewardConfig
 * @returns {number}
 */
function getXpByRank(rank, rewardConfig = {}) {
  const { championXp = 1000, runnerUpXp = 500, semiFinalistXp = 200 } = rewardConfig;
  if (rank === 1) return championXp;
  if (rank === 2) return runnerUpXp;
  if (rank <= 4) return semiFinalistXp;
  return 0;
}

/**
 * 批量发放 XP 奖励
 *
 * @param {Object} tournament — Tournament document
 * @param {Array} [customRecipients] — 自定义发放名单 [{ userId, xp }]，不传则按 results 自动计算
 * @returns {{ recipients: number, totalXp: number, details: Array }}
 */
async function distributeXp(tournament, customRecipients = null) {
  const rewardConfig = tournament.rewardConfig || {};
  const participantXp = rewardConfig.participantXp ?? 50;

  let recipients;
  if (customRecipients) {
    recipients = customRecipients;
  } else {
    // 按 results 自动计算排名奖励
    const topRecipients = (tournament.results || []).map(r => ({
      userId: r.userId,
      xp: getXpByRank(r.rank, rewardConfig),
    }));

    // 所有报名选手参与奖
    const participantIds = new Set((tournament.registrations || []).map(r => r.userId?.toString()));
    const topIds = new Set(topRecipients.map(r => r.userId?.toString()));
    const participantRecipients = [...participantIds]
      .filter(id => !topIds.has(id))
      .map(userId => ({ userId, xp: participantXp }));

    recipients = [...topRecipients, ...participantRecipients].filter(r => r.xp > 0);
  }

  let totalXp = 0;
  const details = [];

  for (const r of recipients) {
    try {
      const user = await User.findByIdAndUpdate(
        r.userId,
        { $inc: { xp: r.xp } },
        { new: true }
      );
      if (user) {
        totalXp += r.xp;
        details.push({ userId: r.userId.toString(), xp: r.xp, newTotal: user.xp });
      }
    } catch (err) {
      details.push({ userId: r.userId?.toString(), xp: r.xp, error: err.message });
    }
  }

  return { recipients: details.length, totalXp, details };
}

module.exports = {
  getXpByRank,
  distributeXp,
};
