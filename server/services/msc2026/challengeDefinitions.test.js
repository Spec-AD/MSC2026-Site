'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CHALLENGE_TASKS, FIXED_WALL_CHALLENGES } = require('./challengeDefinitions');

test('all 33 pool challenges have a visible and judgeable condition', () => {
  assert.equal(CHALLENGE_TASKS.length, 33);
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

test('each race stage has a fixed second-wall challenge', () => {
  assert.equal(FIXED_WALL_CHALLENGES.stage2.songTitle, '最強 STRONGER');
  assert.equal(FIXED_WALL_CHALLENGES.stage2.dxRequirement, 4);
  assert.equal(FIXED_WALL_CHALLENGES.stage3.songTitle, '氷滅の135小節');
  assert.equal(FIXED_WALL_CHALLENGES.stage3.evalRequirement, 'AP');
});
