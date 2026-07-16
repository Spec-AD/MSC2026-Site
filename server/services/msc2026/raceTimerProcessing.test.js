'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { processRaceTimersUnlocked } = require('./raceEngine');

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

test('turn timeout advances exactly one player and persists the result', async () => {
  const { tournament, getSaveCount } = tournamentWithRace();
  const result = await processRaceTimersUnlocked(tournament, NOW);

  assert.equal(result.type, 'turn_timeout');
  assert.equal(tournament.stage2.currentPlayerIndex, 1);
  assert.equal(tournament.stage2.currentTurn, 1);
  assert.equal(tournament.stage2.actionLog.length, 1);
  assert.equal(tournament.stage2.actionLog[0].actionType, 'skip_timeout');
  assert.equal(getSaveCount(), 1);
});

test('map timeout terminates the race and stores the qualified ranking', async () => {
  const { tournament, getSaveCount } = tournamentWithRace({
    totalTimeStartedAt: new Date(NOW - 45 * 60_000)
  });
  const result = await processRaceTimersUnlocked(tournament, NOW);

  assert.equal(result.type, 'map_timeout');
  assert.equal(tournament.stage2.terminated, true);
  assert.equal(tournament.stage2.terminatedReason, 'timeout');
  assert.deepEqual(tournament.qualifiedStage2, ['player-1', 'player-2']);
  assert.equal(getSaveCount(), 1);
});
