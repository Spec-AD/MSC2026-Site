'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rollProbability, SCALE } = require('./probabilityRoll');

test('records an auditable probability hit and miss', () => {
  const hit = rollProbability(0.40, () => 399_999);
  const miss = rollProbability(0.40, () => 400_000);
  assert.equal(hit.success, true);
  assert.equal(hit.roll, 0.399999);
  assert.equal(miss.success, false);
  assert.equal(miss.roll, 0.4);
  assert.equal(SCALE, 1_000_000);
});

test('rejects invalid probabilities and random values', () => {
  assert.throws(() => rollProbability(1.1, () => 0), /概率必须/);
  assert.throws(() => rollProbability(0.5, () => -1), /随机源/);
});
