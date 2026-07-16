'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CHALLENGE_TASKS } = require('./challengeDefinitions');

test('all 25 challenge definitions have a visible and judgeable condition', () => {
  assert.equal(CHALLENGE_TASKS.length, 25);
  const ids = new Set();
  for (const challenge of CHALLENGE_TASKS) {
    assert.ok(challenge.id, 'challenge id is required');
    assert.equal(ids.has(challenge.id), false, `duplicate challenge id ${challenge.id}`);
    ids.add(challenge.id);
    assert.ok(challenge.name, `challenge ${challenge.id} requires a name`);
    assert.ok(challenge.songTitle, `challenge ${challenge.id} requires a song`);
    assert.ok(challenge.difficulty, `challenge ${challenge.id} requires a difficulty`);
    assert.ok(
      [
        challenge.evalRequirement,
        challenge.threshold,
        challenge.dxRequirement,
        challenge.toleranceLimit,
        challenge.greatMax
      ].some(value => value != null),
      `challenge ${challenge.id} requires at least one judgeable condition`
    );
  }
});
