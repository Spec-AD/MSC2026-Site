'use strict';

function hasPendingChallenge(race) {
  return Boolean(race?.challengeHistory?.some(ch => ch.passed === null));
}

function getRaceTimerDecision(race, now = Date.now()) {
  if (!race || race.terminated) return { type: 'none' };
  if (race.status === 'waiting') return { type: 'waiting' };
  if (race.paused) return { type: 'globally_paused' };

  if (race.totalTimeStartedAt && race.timeLimitMs != null) {
    const totalElapsed = now - new Date(race.totalTimeStartedAt).getTime();
    if (totalElapsed >= race.timeLimitMs) return { type: 'map_timeout' };
  }

  if (race.status === 'adjudicating' || (!race.status && hasPendingChallenge(race)) || !race.turnStartedAt) {
    return { type: 'turn_paused' };
  }

  const turnElapsed = now - new Date(race.turnStartedAt).getTime();
  if (turnElapsed >= race.turnTimeLimitMs) return { type: 'turn_timeout' };
  return { type: 'none' };
}

module.exports = { getRaceTimerDecision, hasPendingChallenge };
