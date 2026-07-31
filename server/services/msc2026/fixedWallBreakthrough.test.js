'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { challengeResult, FIXED_WALL_BREAKTHROUGH_THRESHOLD } = require('./raceEngine');

test('第二道墙第三次失败触发统一攻坚保底并记录失败', async () => {
  const tournament = {
    status: 'stage2', qualifiedStage2: [], qualifiedStage3: [],
    stage2: {
      status: 'adjudicating', terminated: false, timeLimitMs: 60 * 60 * 1000, totalTimeStartedAt: new Date(), turnStartedAt: null,
      currentTurn: 6, currentPlayerIndex: 0, roundNumber: 2, roundPosition: 2, turnOrder: [0, 1], pendingRoundActions: [],
      mapConfig: { wallLabels: ['密锁之墙', '准锁之墙'], layers: 3 },
      players: [
        { userId: 'p1', currentLayer: 1, finishOrder: null, fixedWallFailureCount: 2, challengeFailureCount: 2, successfulChallengeAchievementTotal: 0, successfulChallengeCount: 0, cumulativeDxScore: 0, items: [] },
        { userId: 'p2', currentLayer: 0, finishOrder: null, fixedWallFailureCount: 0, challengeFailureCount: 0, successfulChallengeAchievementTotal: 0, successfulChallengeCount: 0, cumulativeDxScore: 0, items: [] }
      ],
      challengeHistory: [{ wallIndex: 1, taskId: 9001, playerId: 'p1', passed: null, usedItemRefs: [], roundNumber: 2 }],
      actionLog: [], finishOrder: [], itemsOnMap: [], globalEffect: { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null }
    },
    async save() {}
  };

  const result = await challengeResult(tournament, 'judge', false);
  assert.equal(FIXED_WALL_BREAKTHROUGH_THRESHOLD, 3);
  assert.equal(result.breakthroughGranted, true);
  assert.equal(result.wallBreached, true);
  assert.equal(tournament.stage2.players[0].currentLayer, 3);
  assert.equal(tournament.stage2.players[0].challengeFailureCount, 3);
  assert.equal(tournament.stage2.challengeHistory[0].passed, false);
  assert.equal(tournament.stage2.challengeHistory[0].breakthroughGranted, true);
});
