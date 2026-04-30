/**
 * 🏆 预选赛排名算法
 *
 * 算法（2026-04-30 凛月版）:
 * 1. 按选手聚合所有预选曲目成绩
 * 2. 总榜 = Σachievement（简单求和，不丢最低分，不加权）
 * 3. 平局则按 totalDxScore 降序
 * 4. songBreakdown：每曲独立排行，dxStar 由 dxScore/theoreticalDxScore 计算
 *   排序：achievement 降序 → dxScore 降序 → entryTime 升序
 */

/**
 * 计算 DX 星级（按 dxScore/theoreticalDxScore 比值）
 * @param {number} dxScore - 选手 DX 分数
 * @param {number} theoreticalDxScore - 该曲理论 DX 分（0 则返回 0）
 * @returns {number} 0–5
 */
function calcDxStar(dxScore, theoreticalDxScore) {
  if (!theoreticalDxScore || theoreticalDxScore <= 0) return 0;
  const ratio = (dxScore / theoreticalDxScore) * 100;
  if (ratio >= 97) return 5;
  if (ratio >= 95) return 4;
  if (ratio >= 93) return 3;
  if (ratio >= 90) return 2;
  if (ratio >= 85) return 1;
  return 0;
}

/**
 * 构建单曲排行榜
 * @param {Array} qualifierSongs — tournament.qualifierSongs
 * @param {Array} qualifierScores — tournament.qualifierScores
 * @returns {Array<{ songName, rankings }>}
 */
function buildSongBreakdown(qualifierSongs, qualifierScores) {
  if (!qualifierSongs || qualifierSongs.length === 0) return [];

  const songMap = {};
  qualifierSongs.forEach(s => {
    songMap[s.songName] = { songName: s.songName, theoreticalDxScore: Number(s.theoreticalDxScore) || 0 };
  });

  // 按 songName 分组
  const grouped = {};
  qualifierScores.forEach(entry => {
    const name = entry.songName;
    if (!songMap[name]) return;
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(entry);
  });

  // 辅助：从 entry 提取用户信息
  const extractUser = (entry) => {
    const u = entry.userId || {};
    return {
      userId: u._id?.toString?.() ?? u.toString?.() ?? entry.userId,
      username: u.username || '未知',
      avatarUrl: u.avatarUrl || '',
    };
  };

  return Object.values(songMap).map(song => {
    const entries = grouped[song.songName] || [];

    // 排序：achievement 降序 → dxScore 降序 → entryTime 升序
    const sorted = [...entries].sort((a, b) => {
      const ach = (Number(b.achievement) || 0) - (Number(a.achievement) || 0);
      if (ach !== 0) return ach;
      const dx = (Number(b.dxScore) || 0) - (Number(a.dxScore) || 0);
      if (dx !== 0) return dx;
      const tA = a.entryTime ? new Date(a.entryTime).getTime() : 0;
      const tB = b.entryTime ? new Date(b.entryTime).getTime() : 0;
      return tA - tB;
    });

    const rankings = sorted.map((entry, i) => ({
      rank: i + 1,
      ...extractUser(entry),
      achievement: Number(entry.achievement) || 0,
      dxScore: Number(entry.dxScore) || 0,
      entryTime: entry.entryTime,
      dxStar: calcDxStar(Number(entry.dxScore) || 0, song.theoreticalDxScore),
    }));

    return { songName: song.songName, rankings };
  });
}

/**
 * 计算预选赛排名
 * @param {Object} tournament — Tournament document
 * @param {Object} [options]
 * @param {number} [options.cutoff] — 晋级线（前 N 名），默认取 tournament.advanceCount
 * @returns {{ rankings: Array, cutoff: number, cutoffScore: number|null, songBreakdown: Array }}
 */
function calculateQualifierRankings(tournament, options = {}) {
  const { qualifierSongs, qualifierScores } = tournament;
  const cutoff = options.cutoff ?? tournament.advanceCount ?? 8;

  if (!qualifierSongs || qualifierSongs.length === 0) {
    return { rankings: [], cutoff, cutoffScore: null, songBreakdown: [] };
  }

  // ── 按选手聚合成绩 ──
  const playerMap = {};
  qualifierScores.forEach(entry => {
    const u = entry.userId || {};
    const uid = u._id?.toString?.() ?? u.toString?.() ?? entry.userId;
    if (!playerMap[uid]) {
      playerMap[uid] = {
        userId: uid,
        username: u.username || '未知',
        avatarUrl: u.avatarUrl || '',
        scores: [],
      };
    }
    playerMap[uid].scores.push(entry);
  });

  // ── Σachievement（简单求和，不丢最低分，不加权） ──
  const players = Object.values(playerMap).map(p => {
    const total = p.scores.reduce((sum, s) => sum + (Number(s.achievement) || 0), 0);
    const totalDxScore = p.scores.reduce((sum, s) => sum + (Number(s.dxScore) || 0), 0);
    return {
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl,
      total: Math.round(total * 10000) / 10000,
      totalDxScore,
      scoreCount: p.scores.length,
    };
  });

  // 排序：total 降序 → totalDxScore 降序
  players.sort((a, b) => {
    const diff = b.total - a.total;
    if (Math.abs(diff) > 0.0001) return diff;
    return b.totalDxScore - a.totalDxScore;
  });

  const rankings = players.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    username: p.username,
    avatarUrl: p.avatarUrl,
    total: p.total,
    totalDxScore: p.totalDxScore,
    scoreCount: p.scoreCount,
  }));

  const cutoffScore = rankings.length >= cutoff
    ? rankings[cutoff - 1]?.total ?? null
    : (rankings.length > 0 ? rankings[rankings.length - 1].total : null);

  // ── 构建单曲排行榜 ──
  const songBreakdown = buildSongBreakdown(qualifierSongs, qualifierScores);

  return { rankings, cutoff, cutoffScore, songBreakdown };
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
