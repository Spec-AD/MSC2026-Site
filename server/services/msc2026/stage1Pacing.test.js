'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const stage1 = require('./stage1');

const score = achievement => ({ achievement, dxScore: Math.round(achievement * 100), perfectBreak: 1 });

test('第三首成绩完成后停留在总结，直到主办方显式推进', async () => {
  const tournament = {
    status: 'stage1',
    stage1: {
      status: 'playing', currentGroupIndex: 0, songPool: [], difficultyIndexes: {},
      groups: [
        {
          order: 0, p1: '000000000000000000000001', p2: '000000000000000000000002', status: 'playing', winner: null, needTiebreak: false,
          songs: [
            { songId: '000000000000000000000011', order: 0, pickType: 'p1_pick', p1Score: score(100), p2Score: score(99) },
            { songId: '000000000000000000000012', order: 1, pickType: 'p2_pick', p1Score: score(100), p2Score: score(99) },
            { songId: '000000000000000000000013', order: 2, pickType: 'random', p1Score: null, p2Score: null }
          ]
        },
        { order: 1, p1: '000000000000000000000003', p2: '000000000000000000000004', songs: [], status: 'pending', winner: null, needTiebreak: false }
      ]
    },
    operationLogs: [],
    async save() {}
  };

  const result = await stage1.submitScore(tournament, '000000000000000000000099', {
    songId: '000000000000000000000013', songIndex: 2, p1Score: score(100), p2Score: score(99)
  });
  assert.equal(result.nextStep, 'group_complete_waiting');
  assert.equal(tournament.stage1.currentGroupIndex, 0);
  assert.equal(tournament.stage1.groups[0].status, 'done');
  assert.equal(tournament.stage1.groups[1].status, 'pending');

  await stage1.advance(tournament);
  assert.equal(tournament.stage1.currentGroupIndex, 1);
  assert.equal(tournament.stage1.groups[1].status, 'revealing');
});
