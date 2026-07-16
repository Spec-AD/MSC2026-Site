'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { challengeResult } = require('./raceEngine');

test('a failed challenge applies and reports only its bound double-item penalty', async () => {
  let saves = 0;
  const tournament = {
    status: 'stage2',
    stage2: {
      terminated: false,
      timeLimitMs: 45 * 60 * 1000,
      totalTimeStartedAt: new Date(),
      turnStartedAt: null,
      currentTurn: 0,
      currentPlayerIndex: 0,
      mapConfig: { wallLabels: ['密锁之墙', '准锁之墙'], layers: 3 },
      players: [
        { userId: 'p1', currentLayer: 1, finishOrder: null, silentUntilTurn: null, disableItemsUntilTurn: null },
        { userId: 'p2', currentLayer: 0, finishOrder: null, silentUntilTurn: null, disableItemsUntilTurn: null }
      ],
      challengeHistory: [{
        wallIndex: 1,
        taskId: 4,
        playerId: 'p1',
        passed: null,
        usedItemRefs: [4]
      }],
      actionLog: [],
      finishOrder: [],
      globalEffect: { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null }
    },
    save: async () => { saves += 1; }
  };

  const result = await challengeResult(tournament, 'judge', false);

  assert.equal(result.passed, false);
  assert.equal(result.penaltiesApplied.length, 1);
  assert.equal(result.penaltiesApplied[0].itemRef, 4);
  assert.equal(result.penaltiesApplied[0].silentTurns, 1);
  assert.equal(tournament.stage2.players[0].silentUntilTurn, 2);
  assert.equal(tournament.stage2.actionLog.at(-1).detail.penaltiesApplied.length, 1);
  assert.equal(saves, 1);
});
