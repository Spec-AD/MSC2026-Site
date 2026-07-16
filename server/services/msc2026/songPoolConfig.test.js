'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSongPool,
  assertFinalSongConfig,
  resolveConfiguredSongPool,
  isStage4Initialized,
  getStoredStage4Config
} = require('./songPoolConfig');

const IDS = [
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
  '507f1f77bcf86cd799439014'
];

test('normalizes a usable song pool and rejects duplicates', () => {
  assert.deepEqual(normalizeSongPool(IDS.slice(0, 3), '图池'), IDS.slice(0, 3));
  assert.throws(() => normalizeSongPool([IDS[0], IDS[0], IDS[1]], '图池'), /不能包含重复ID/);
});

test('requires initialization requests to match the stored pool', () => {
  assert.deepEqual(
    resolveConfiguredSongPool(IDS.slice(0, 3), [IDS[2], IDS[0], IDS[1]], '图池'),
    IDS.slice(0, 3)
  );
  assert.throws(
    () => resolveConfiguredSongPool(IDS.slice(0, 3), [IDS[0], IDS[1], IDS[3]], '图池'),
    /与已保存的比赛配置不一致/
  );
});

test('keeps the designated song outside the selectable final pool', () => {
  assert.doesNotThrow(() => assertFinalSongConfig(IDS.slice(0, 3), IDS[3]));
  assert.throws(() => assertFinalSongConfig(IDS.slice(0, 3), IDS[2]), /不能同时出现在/);
});

test('reads legacy final configuration and detects initialized finals separately', () => {
  const legacy = { stage4: { status: 'pending', songPool: IDS.slice(0, 3), designatedSongId: IDS[3] } };
  assert.equal(isStage4Initialized(legacy.stage4), false);
  assert.deepEqual(getStoredStage4Config(legacy).songPoolIds, IDS.slice(0, 3));
  assert.equal(isStage4Initialized({ status: 'p1_pick', p1: IDS[0] }), true);
});
