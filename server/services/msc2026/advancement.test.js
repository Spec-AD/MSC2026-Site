'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getQualifiedIdsForStage, assertRequestedIdsMatch } = require('./advancement');

const ids = Array.from({ length: 6 }, (_, i) => `507f1f77bcf86cd7994390${String(i + 10).slice(-2)}`);

test('uses the previous stage qualified list as the next stage source', () => {
  const tournament = { qualifiedStage1: ids };
  assert.deepEqual(getQualifiedIdsForStage(tournament, 'stage2'), ids);
});

test('rejects incomplete qualified data', () => {
  assert.throws(() => getQualifiedIdsForStage({ qualifiedStage2: ids.slice(0, 3) }, 'stage3'), /应为 4 人/);
});

test('accepts the same requested ids regardless of order', () => {
  assert.doesNotThrow(() => assertRequestedIdsMatch([...ids].reverse(), ids, '名单'));
});

test('rejects a requested list containing an eliminated player', () => {
  const requested = [...ids.slice(0, 5), '507f191e810c19729de860ea'];
  assert.throws(() => assertRequestedIdsMatch(requested, ids, '名单'), /不一致/);
});
