'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getGlobalEffectTurnRange } = require('./itemLifecycle');

test('covers every player once for a one-round global effect', () => {
  assert.deepEqual(getGlobalEffectTurnRange(7, 1, 6), {
    startsAtTurn: 7,
    endsAtTurn: 12,
    durationTurns: 6
  });
});

test('covers every player twice for a two-round global effect', () => {
  assert.equal(getGlobalEffectTurnRange(3, 2, 4).durationTurns, 8);
});
