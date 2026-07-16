'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyItemEffectsDetailed, getItem } = require('./itemDefinitions');

const fullChallenge = {
  id: 6,
  name: '复合挑战',
  type: 'combined',
  evalRequirement: 'AP',
  threshold: 100.9,
  dxRequirement: 5,
  toleranceType: 'great',
  toleranceLimit: 5,
  greatMax: 3,
  difficulty: 'Re:MASTER',
  songTitle: 'Test Song'
};

test('all 18 challenge-affecting items produce a real change on an applicable challenge', () => {
  const challengeItemRefs = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20];
  for (const ref of challengeItemRefs) {
    const result = applyItemEffectsDetailed(fullChallenge, [ref], {
      rollProbability: probability => ({ probability, roll: 0.1, success: true })
    });
    assert.equal(result.effects[0].status, 'applied', `item ${ref} should apply`);
    assert.ok(result.effects[0].changes.length > 0, `item ${ref} should report a concrete change`);
  }
});

test('reports incompatible challenge types without pretending the item applied', () => {
  const incompatibleRefs = [1, 2, 4, 5, 8, 11, 12, 14, 15];
  for (const ref of incompatibleRefs) {
    const result = applyItemEffectsDetailed({ type: 'unknown', difficulty: 'MASTER' }, [ref]);
    assert.equal(result.effects[0].status, 'not_applicable', `item ${ref} should be inapplicable`);
    assert.match(result.effects[0].summary, /当前挑战不适用/);
  }

  const deepHeart = applyItemEffectsDetailed({ type: 'eval', difficulty: 'MASTER', evalRequirement: 'AP' }, [20]);
  assert.equal(deepHeart.effects[0].status, 'not_applicable');
});

test('records the 70 percent item roll when it misses', () => {
  const result = applyItemEffectsDetailed(fullChallenge, [11], {
    rollProbability: probability => ({ probability, roll: 0.72, success: false })
  });
  assert.equal(result.effects[0].status, 'missed');
  assert.equal(result.effects[0].probability, 0.7);
  assert.equal(result.effects[0].roll, 0.72);
  assert.equal(result.challenge.evalRequirement, 'AP');
});

test('universal keys remove every previous condition before replacing it', () => {
  for (const ref of [6, 16]) {
    const result = applyItemEffectsDetailed({ ...fullChallenge, extraRequirement: { type: 'precision', dxRequirement: 5 } }, [ref]);
    assert.equal(result.challenge.type, 'eval');
    assert.equal(result.challenge.threshold, undefined);
    assert.equal(result.challenge.dxRequirement, undefined);
    assert.equal(result.challenge.toleranceLimit, undefined);
    assert.equal(result.challenge.greatMax, undefined);
    assert.equal(result.challenge.extraRequirement, undefined);
  }
});

test('intel items expose their immediate-use probability metadata', () => {
  assert.equal(getItem(9).isIntel, true);
  assert.equal(getItem(19).isIntel, true);
  assert.equal(getItem(19).probability, 0.4);
});
