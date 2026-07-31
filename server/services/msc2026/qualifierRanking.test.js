const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQualifierRankings } = require('./qualifierRanking');

test('qualifier ranking ignores scores from users who are not registered', () => {
  const rankings = buildQualifierRankings({
    registrations: [
      { userId: { _id: 'registered-a', username: 'A' }, token: '007', registeredAt: '2026-01-01' },
      { userId: { _id: 'registered-b', username: 'B' }, token: '008', registeredAt: '2026-01-02' },
    ],
    qualifierScores: [
      { userId: 'registered-a', achievement: 100, dxScore: 1000 },
      { userId: 'not-registered', achievement: 999, dxScore: 9999 },
    ],
  }, 1);

  assert.deepEqual(rankings.map(entry => entry.userId), ['registered-a', 'registered-b']);
  assert.equal(rankings[0].token, '007');
  assert.equal(rankings[0].qualified, true);
  assert.equal(rankings[1].qualified, false);
});

test('qualifier ranking keeps no-score registrations and resolves ties by registration time', () => {
  const rankings = buildQualifierRankings({
    registrations: [
      { userId: { _id: 'later', username: 'Later' }, registeredAt: '2026-02-02' },
      { userId: { _id: 'earlier', username: 'Earlier' }, registeredAt: '2026-02-01' },
    ],
    qualifierScores: [],
  }, 12);

  assert.deepEqual(rankings.map(entry => entry.userId), ['earlier', 'later']);
  assert.ok(rankings.every(entry => entry.qualifierCount === 0));
});
