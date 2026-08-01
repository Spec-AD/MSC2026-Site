'use strict';

const MSC2026Tournament = require('../../models/MSC2026Tournament');
const { broadcast } = require('./ssePool');
const { withRaceMutationLock } = require('./raceMutationLock');
const { processRaceTimersUnlocked } = require('./raceEngine');

const DEFAULT_INTERVAL_MS = 1000;
const TIMER_BROADCAST_MS = 5000;

let timer = null;
let tickRunning = false;
let lastBroadcastAt = 0;

function remainingMs(limit, startedAt, now) {
  if (limit == null || !startedAt) return null;
  return Math.max(0, limit - (now - new Date(startedAt).getTime()));
}

async function tickRaceTimer(now = Date.now()) {
  if (tickRunning) return { type: 'busy' };
  tickRunning = true;
  try {
    return await withRaceMutationLock(async () => {
      const tournament = await MSC2026Tournament.findOne();
      if (!tournament || (tournament.status !== 'stage2' && tournament.status !== 'stage3')) {
        return { type: 'none' };
      }

      const result = await processRaceTimersUnlocked(tournament, now);
      const race = tournament[tournament.status];
      if (race && race.status !== 'waiting' && !race.terminated && now - lastBroadcastAt >= TIMER_BROADCAST_MS) {
        lastBroadcastAt = now;
        const pendingChallenge = race.challengeHistory?.some(ch => ch.passed === null);
        const clockNow = race.paused && race.pausedAt ? new Date(race.pausedAt).getTime() : now;
        broadcast('timer_tick', {
          stage: tournament.status,
          paused: Boolean(race.paused),
          totalRemainingMs: remainingMs(race.timeLimitMs, race.totalTimeStartedAt, clockNow),
          turnRemainingMs: race.status === 'adjudicating' || (!race.status && pendingChallenge)
            ? null
            : remainingMs(race.turnTimeLimitMs, race.turnStartedAt, clockNow)
        });
      }
      return result;
    });
  } finally {
    tickRunning = false;
  }
}

function startRaceTimerScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  if (timer) return timer;
  timer = setInterval(() => {
    tickRaceTimer().catch(err => console.error('[MSC2026] 跑图计时调度失败:', err));
  }, intervalMs);
  return timer;
}

function stopRaceTimerScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = { startRaceTimerScheduler, stopRaceTimerScheduler, tickRaceTimer };
