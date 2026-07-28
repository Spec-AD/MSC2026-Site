'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { determineWinner, validateScore, calculateRaceRankings } = require('./utils');
const { undoRaceLastChallengeResult } = require('./rollback');

test('perfect BREAK count is the third competitive tie-break', () => {
  const base = { achievement: 100, dxScore: 1000 };
  assert.equal(
    determineWinner([{ ...base, perfectBreak: 8 }], [{ ...base, perfectBreak: 7 }]),
    'p1'
  );
  assert.equal(
    determineWinner([{ ...base, perfectBreak: 8 }], [{ ...base, perfectBreak: 8 }]),
    'tie'
  );
});

test('perfect BREAK input rejects negative and fractional counts', () => {
  assert.deepEqual(validateScore({ achievement: 100, dxScore: 1000, perfectBreak: 8 }), []);
  assert.match(validateScore({ achievement: 100, dxScore: 1000, perfectBreak: -1 }).join(' '), /完美 BREAK/);
  assert.match(validateScore({ achievement: 100, dxScore: 1000, perfectBreak: 1.5 }).join(' '), /完美 BREAK/);
});

test('unfinished race ranking uses position, failures, achievement and DX in order', () => {
  const players = [
    { userId: 'a', currentLayer: 1, challengeFailureCount: 2, successfulChallengeCount: 1, successfulChallengeAchievementTotal: 100, cumulativeDxScore: 2000, startVertex: 0 },
    { userId: 'b', currentLayer: 1, challengeFailureCount: 1, successfulChallengeCount: 1, successfulChallengeAchievementTotal: 99, cumulativeDxScore: 1000, startVertex: 1 },
    { userId: 'c', currentLayer: 2, challengeFailureCount: 9, startVertex: 2 },
  ];
  assert.deepEqual(calculateRaceRankings(players).map(entry => entry.userId), ['c', 'b', 'a']);
});

test('challenge rollback restores the exact pre-judgement snapshot', () => {
  const player = {
    userId: 'a', currentLayer: 3, silentUntilTurn: 20, disableItemsUntilTurn: 21,
    finishOrder: 4, finishTimestamp: 999, challengeFailureCount: 2,
    successfulChallengeAchievementTotal: 201, successfulChallengeCount: 2,
    cumulativeDxScore: 6000,
  };
  const race = {
    players: [player, { userId: 'b' }],
    currentPlayerIndex: 1,
    currentTurn: 13,
    turnStartedAt: new Date('2026-01-02T00:00:00Z'),
    terminated: true,
    terminatedReason: 'all_qualified',
    finishOrder: [{ userId: 'a', finishTimestamp: 999, order: 4 }],
    globalEffect: { sourceItemRef: 9, startsAtTurn: 10, endsAtTurn: 14 },
    actionLog: [
      { playerId: 'a', actionType: 'challenge_passed', detail: { taskId: 201 } },
      { playerId: 'b', actionType: 'skip_timeout', detail: { reason: 'silent' } },
    ],
    challengeHistory: [{
      playerId: 'a', taskId: 201, passed: true, judgedBy: 'judge', judgedAt: new Date(),
      rollbackSnapshot: {
        player: {
          currentLayer: 1, silentUntilTurn: 8, disableItemsUntilTurn: null,
          finishOrder: null, finishTimestamp: null, challengeFailureCount: 2,
          successfulChallengeAchievementTotal: 100, successfulChallengeCount: 1,
          cumulativeDxScore: 3000,
        },
        race: {
          currentPlayerIndex: 0, currentTurn: 9, turnStartedAt: null,
          terminated: false, terminatedReason: null, finishOrder: [],
          globalEffect: { sourceItemRef: 7, startsAtTurn: 8, endsAtTurn: 12 },
          actionLogLength: 0,
        },
        qualifiedIds: ['legacy'],
      },
    }],
  };
  const tournament = { qualifiedStage2: ['a', 'b'] };

  undoRaceLastChallengeResult(race, tournament, 'stage2');

  assert.equal(player.currentLayer, 1);
  assert.equal(player.silentUntilTurn, 8);
  assert.equal(player.cumulativeDxScore, 3000);
  assert.equal(race.currentPlayerIndex, 0);
  assert.equal(race.currentTurn, 9);
  assert.equal(race.terminated, false);
  assert.deepEqual(race.finishOrder, []);
  assert.deepEqual(race.actionLog, []);
  assert.deepEqual(tournament.qualifiedStage2, ['legacy']);
  assert.equal(race.challengeHistory[0].passed, null);
});

test('challenge rollback refuses to cross a later manual action', () => {
  const race = {
    players: [{ userId: 'a' }, { userId: 'b' }],
    actionLog: [
      { playerId: 'a', actionType: 'challenge_failed', detail: { taskId: 1 } },
      { playerId: 'b', actionType: 'pickup', detail: { zoneIndex: 0 } },
    ],
    challengeHistory: [{ playerId: 'a', passed: false }],
  };
  assert.throws(() => undoRaceLastChallengeResult(race), /已有其他行动/);
});
