'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { playerAction } = require('./raceEngine');

test('advancing exposes original and effective challenges with per-item applicability', async () => {
  const tournament = {
    status: 'stage2',
    stage2: {
      terminated: false,
      timeLimitMs: 45 * 60 * 1000,
      turnTimeLimitMs: 45 * 1000,
      totalTimeStartedAt: new Date(),
      turnStartedAt: new Date(),
      currentTurn: 0,
      currentPlayerIndex: 0,
      mapConfig: { wallLabels: ['密锁之墙', '准锁之墙'], layers: 3 },
      players: [{
        userId: 'p1',
        currentLayer: 0,
        finishOrder: null,
        silentUntilTurn: null,
        items: [
          { itemRef: 1, status: 'armed' },
          { itemRef: 2, status: 'armed' }
        ]
      }],
      challengeHistory: [],
      actionLog: [],
      finishOrder: [],
      taskPool: { remaining: [1], used: [], fallbackTasks: [], fallbackCount: 0 },
      globalEffect: { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null }
    },
    save: async () => {}
  };

  const result = await playerAction(tournament, 'p1', 'advance');

  assert.equal(result.challenge.originalChallenge.evalRequirement, 'AP');
  assert.equal(result.challenge.effectiveChallenge.evalRequirement, 'FC+');
  assert.equal(result.challenge.itemEffectResults[0].status, 'applied');
  assert.equal(result.challenge.itemEffectResults[1].status, 'not_applicable');
  assert.equal(tournament.stage2.challengeHistory[0].originalChallenge.evalRequirement, 'AP');
  assert.ok(tournament.stage2.players[0].items.every(item => item.status === 'consumed'));
  assert.equal(tournament.stage2.turnStartedAt, null);
});
