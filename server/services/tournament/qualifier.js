/**
 * 🏆 预选赛排名算法
 *
 * 算法（spec §3.3.3 + 琉璃修正）:
 * 1. 按选手聚合所有预选曲目成绩
 * 2. 每首曲目录入权重 = constant / avgConstant
 * 3. 每位选手取 N 首（剔除 1 首最低分，1 首曲目不剔除）
 * 4. 加权总分 = Σ(single × weight)
 * 5. 按总分降序排名
 */

/**
 * 计算预选赛排名
 * @param {Object} tournament — Tournament document
 * @param {Object} [options]
 * @param {number} [options.cutoff] — 晋级线（前 N 名），默认取 tournament.advanceCount
 * @returns {{ rankings: Array, cutoff: number, cutoffScore: number|null }}
 */
function calculateQualifierRankings(tournament, options = {}) {
  const { qualifierSongs, qualifierScores, registrations } = tournament;
  const cutoff = options.cutoff ?? tournament.advanceCount ?? 8;

  if (!qualifierSongs || qualifierSongs.length === 0) {
    return { rankings: [], cutoff, cutoffScore: null };
  }

  const avgConstant =
    qualifierSongs.reduce((s, q) => s + (Number(q.constant) || 0), 0) / qualifierSongs.length;

  // ── 按选手聚合成绩 ──
  const playerMap = {};
  qualifierScores.forEach(entry => {
    const uid = entry.userId?._id?.toString?.() ?? entry.userId?.toString?.() ?? entry.userId;
    if (!playerMap[uid]) {
      playerMap[uid] = { userId: uid, scores: [] };
    }
    playerMap[uid].scores.push(entry);
  });

  // ── 计算每位选手加权总分 ──
  const players = Object.values(playerMap).map(p => {
    // 按 achievement 降序
    p.scores.sort((a, b) => (Number(b.achievement) || 0) - (Number(a.achievement) || 0));

    // 取最佳 N-1 首（>= 2 首时才剔除最低分，1 首直接取）
    const takeCount = qualifierSongs.length >= 2
      ? Math.max(1, qualifierSongs.length - 1)
      : qualifierSongs.length;
    const selected = p.scores.slice(0, takeCount);

    // 加权总分 = Σ(单曲 achievement × 该曲目 weight)
    let total = 0;
    selected.forEach(s => {
      const song = qualifierSongs.find(q => q.songName === s.songName);
      const constant = Number(song?.constant) || 0;
      const weight = avgConstant > 0 ? constant / avgConstant : 1;
      total += (Number(s.achievement) || 0) * weight;
    });

    return {
      userId: p.userId,
      total: Math.round(total * 100) / 100,
      scoreCount: p.scores.length,
    };
  });

  // ── 按总分降序排名 ──
  players.sort((a, b) => b.total - a.total);

  const rankings = players.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    total: p.total,
    scoreCount: p.scoreCount,
  }));

  const cutoffScore = rankings.length >= cutoff
    ? rankings[cutoff - 1]?.total ?? null
    : (rankings.length > 0 ? rankings[rankings.length - 1].total : null);

  return { rankings, cutoff, cutoffScore };
}

/**
 * 根据排名截取晋级选手 ID 列表
 */
function getQualifiedUserIds(rankings, cutoff) {
  const effectiveCutoff = cutoff ?? rankings.length;
  return rankings.slice(0, effectiveCutoff).map(r => r.userId);
}

module.exports = {
  calculateQualifierRankings,
  getQualifiedUserIds,
};
