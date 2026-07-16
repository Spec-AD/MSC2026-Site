'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { snapshotChallenge } = require('./challengePresentation');

test('preserves original and adjusted values including zero', () => {
  const snapshot = snapshotChallenge({
    id: 1,
    name: 'Challenge',
    threshold: 0,
    _achievementBonus: 0.2,
    _greatCancel: 2
  });
  assert.equal(snapshot.taskName, 'Challenge');
  assert.equal(snapshot.threshold, 0);
  assert.equal(snapshot.achievementBonus, 0.2);
  assert.equal(snapshot.greatCancel, 2);
});
