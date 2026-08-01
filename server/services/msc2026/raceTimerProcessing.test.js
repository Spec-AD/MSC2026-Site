'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pauseRace, resumeRace, processRaceTimersUnlocked } = require('./raceEngine');

const NOW = Date.parse('2026-07-16T10:00:00.000Z');

function tournamentWithRace(overrides = {}) {
  let saves = 0;
  const tournament = {
    status: 'stage2',
    qualifiedStage2: [],
    oldTournamentId: null,
    stage2: {
      timeLimitMs: 45 * 60_000,
      turnTimeLimitMs: 45_000,
      totalTimeStartedAt: new Date(NOW - 60_000),
      turnStartedAt: new Date(NOW - 45_000),
      currentPlayerIndex: 0,
      currentTurn: 0,
      players: [
        { userId: 'player-1', currentLayer: 0, startVertex: 0, finishOrder: null },
        { userId: 'player-2', currentLayer: 0, startVertex: 1, finishOrder: null }
      ],
      actionLog: [],
      challengeHistory: [],
      globalEffect: { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null },
      finishOrder: [],
      terminated: false,
      terminatedReason: null,
      ...overrides
    },
    async save() { saves++; }
  };
  return { tournament, getSaveCount: () => saves };
}

test('MSC race processing disables legacy map and turn timeouts', async () => {
  const { tournament, getSaveCount } = tournamentWithRace();
  const result = await processRaceTimersUnlocked(tournament, NOW);

  assert.equal(result.type, 'none');
  assert.equal(tournament.stage2.currentPlayerIndex, 0);
  assert.equal(tournament.stage2.currentTurn, 0);
  assert.equal(tournament.stage2.terminated, false);
  assert.equal(tournament.stage2.timeLimitMs, null);
  assert.equal(tournament.stage2.turnTimeLimitMs, null);
  assert.equal(getSaveCount(), 0);
});

test('global pause blocks automatic expiry and resume shifts both active clocks', async () => {
  const { tournament, getSaveCount } = tournamentWithRace({
    status: 'racing',
    turnStartedAt: new Date(NOW - 10_000),
  });
  const originalTotalStart = tournament.stage2.totalTimeStartedAt.getTime();
  const originalTurnStart = tournament.stage2.turnStartedAt.getTime();

  await pauseRace(tournament, null, NOW);
  const pausedDecision = await processRaceTimersUnlocked(tournament, NOW + 10 * 60_000);
  assert.equal(pausedDecision.type, 'globally_paused');
  assert.equal(tournament.stage2.currentTurn, 0);

  const pausedDurationMs = 2 * 60_000;
  await resumeRace(tournament, null, NOW + pausedDurationMs);
  assert.equal(tournament.stage2.paused, false);
  assert.equal(tournament.stage2.totalTimeStartedAt.getTime(), originalTotalStart + pausedDurationMs);
  assert.equal(tournament.stage2.turnStartedAt.getTime(), originalTurnStart + pausedDurationMs);
  assert.equal(tournament.stage2.totalPausedDurationMs, pausedDurationMs);
  assert.equal(getSaveCount(), 2);
});
