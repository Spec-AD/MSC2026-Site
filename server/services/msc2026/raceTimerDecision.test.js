'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getRaceTimerDecision } = require('./raceTimerDecision');

const NOW = Date.parse('2026-07-16T10:00:00.000Z');

function race(overrides = {}) {
  return {
    terminated: false,
    totalTimeStartedAt: new Date(NOW - 60_000),
    timeLimitMs: 45 * 60_000,
    turnStartedAt: new Date(NOW - 10_000),
    turnTimeLimitMs: 45_000,
    challengeHistory: [],
    ...overrides
  };
}

test('expires the map before considering the turn timer', () => {
  const decision = getRaceTimerDecision(race({
    totalTimeStartedAt: new Date(NOW - 45 * 60_000),
    turnStartedAt: new Date(NOW - 50_000)
  }), NOW);
  assert.equal(decision.type, 'map_timeout');
});

test('expires a turn after 45 seconds', () => {
  const decision = getRaceTimerDecision(race({ turnStartedAt: new Date(NOW - 45_000) }), NOW);
  assert.equal(decision.type, 'turn_timeout');
});

test('pauses only the turn timer while a challenge is pending', () => {
  const decision = getRaceTimerDecision(race({
    turnStartedAt: null,
    challengeHistory: [{ passed: null }]
  }), NOW);
  assert.equal(decision.type, 'turn_paused');
});

test('keeps the next player timer running while challenges queue during a round', () => {
  const decision = getRaceTimerDecision(race({
    status: 'racing',
    turnStartedAt: new Date(NOW - 45_000),
    challengeHistory: [{ passed: null }]
  }), NOW);
  assert.equal(decision.type, 'turn_timeout');
});

test('does nothing while both timers are within their limits', () => {
  assert.equal(getRaceTimerDecision(race(), NOW).type, 'none');
});

test('global pause takes priority over map and turn expiry', () => {
  const decision = getRaceTimerDecision(race({
    paused: true,
    pausedAt: new Date(NOW - 60_000),
    totalTimeStartedAt: new Date(NOW - 60 * 60_000),
    turnStartedAt: new Date(NOW - 60_000),
  }), NOW);
  assert.equal(decision.type, 'globally_paused');
});
