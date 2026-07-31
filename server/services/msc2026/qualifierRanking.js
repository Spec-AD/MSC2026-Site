function playerIdOf(registration) {
  return String(registration?.userId?._id || registration?.userId || '');
}

function finiteScore(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function registrationTime(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Build the authoritative qualifier ranking from registered players only.
 * Stray score rows are deliberately ignored so pre-match check-in and stage
 * initialization cannot disagree about the top 12.
 */
function buildQualifierRankings(oldTournament, advanceCount = 12) {
  if (!Number.isInteger(advanceCount) || advanceCount < 1) {
    throw new Error('晋级人数必须为正整数');
  }

  const registrations = (oldTournament?.registrations || []).filter(reg => playerIdOf(reg));
  const registeredIds = new Set(registrations.map(playerIdOf));
  const scoresByUser = new Map();

  for (const score of oldTournament?.qualifierScores || []) {
    const userId = String(score?.userId?._id || score?.userId || '');
    if (!registeredIds.has(userId)) continue;
    const scores = scoresByUser.get(userId) || [];
    scores.push(score);
    scoresByUser.set(userId, scores);
  }

  const rankings = registrations.map((registration, registrationIndex) => {
    const userId = playerIdOf(registration);
    const scores = scoresByUser.get(userId) || [];
    return {
      userId,
      username: registration.userId?.username || null,
      avatarUrl: registration.userId?.avatarUrl || null,
      token: registration.token || '',
      totalAchievement: scores.reduce((sum, score) => sum + finiteScore(score.achievement), 0),
      totalDxScore: scores.reduce((sum, score) => sum + finiteScore(score.dxScore), 0),
      qualifierCount: scores.length,
      registeredAt: registration.registeredAt || null,
      registrationIndex,
    };
  });

  rankings.sort((a, b) => {
    if (b.totalAchievement !== a.totalAchievement) return b.totalAchievement - a.totalAchievement;
    if (b.totalDxScore !== a.totalDxScore) return b.totalDxScore - a.totalDxScore;
    const timeDifference = registrationTime(a.registeredAt) - registrationTime(b.registeredAt);
    return timeDifference || a.registrationIndex - b.registrationIndex;
  });

  return rankings.map(({ registrationIndex, ...ranking }, index) => ({
    ...ranking,
    rank: index + 1,
    qualified: index < advanceCount,
  }));
}

module.exports = { buildQualifierRankings };
