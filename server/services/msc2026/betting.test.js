const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateOdds, allocatePayouts, effectiveStatus, isStakeAllowed } = require('./betting');

test('彩池赔率随所选一方占比上升而下降', () => {
  assert.equal(calculateOdds(5000, 1000), 5);
  assert.equal(calculateOdds(5000, 4000), 1.25);
  assert.equal(calculateOdds(0, 0), null);
});

test('派奖采用最大余数法且总额不增不减', () => {
  const bets = [
    { _id: 'a', stake: 1000 },
    { _id: 'b', stake: 2000 }
  ];
  const payouts = allocatePayouts(bets, 7001, 3000);
  assert.equal(payouts.reduce((sum, item) => sum + item.payout, 0), 7001);
  assert.deepEqual(payouts.map(item => item.payout).sort((a, b) => a - b), [2334, 4667]);
});

test('市场按服务器时间自动从预告切换到开放和封盘', () => {
  const market = { status: 'scheduled', opensAt: new Date(1000), closesAt: new Date(121000) };
  assert.equal(effectiveStatus(market, 999), 'scheduled');
  assert.equal(effectiveStatus(market, 1000), 'open');
  assert.equal(effectiveStatus(market, 121000), 'locked');
});

test('余额低于门槛时只接受完整 ALL IN', () => {
  assert.equal(isStakeAllowed(999, 1000, 999), true);
  assert.equal(isStakeAllowed(998, 1000, 999), false);
  assert.equal(isStakeAllowed(1000, 1000, 5000), true);
  assert.equal(isStakeAllowed(5001, 1000, 5000), false);
  assert.equal(isStakeAllowed(5000, 10000, 5000), true);
});
