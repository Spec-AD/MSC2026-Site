'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initStage1, startFirstGroup, completeGroupReveal } = require('./stage1');

const ids = Array.from({ length: 15 }, (_, index) => `507f1f77bcf86cd799439${String(index + 1).padStart(3, '0')}`);

function tournamentStub() {
  return {
    status: 'stage1',
    operationLogs: [],
    async save() {},
  };
}

test('stage1 draw pairs one top-six seed with one rank 7-12 player', async () => {
  const tournament = tournamentStub();
  await initStage1(tournament, ids.slice(0, 12), ids.slice(12, 15));
  const top = new Set(ids.slice(0, 6));
  const lower = new Set(ids.slice(6, 12));

  assert.equal(tournament.stage1.groups.length, 6);
  for (const group of tournament.stage1.groups) {
    const pair = [String(group.p1), String(group.p2)];
    assert.equal(pair.filter(id => top.has(id)).length, 1);
    assert.equal(pair.filter(id => lower.has(id)).length, 1);
  }
});

test('group reveal is persisted and cannot be completed before seven seconds', async () => {
  const tournament = tournamentStub();
  await initStage1(tournament, ids.slice(0, 12), ids.slice(12, 15));
  await startFirstGroup(tournament);
  const group = tournament.stage1.groups[0];

  assert.equal(group.status, 'revealing');
  assert.ok(group.revealStartedAt);
  assert.ok(group.revealEndsAt);
  await assert.rejects(() => completeGroupReveal(tournament, new Date(group.revealStartedAt).getTime() + 1000), /尚未结束/);
  await completeGroupReveal(tournament, new Date(group.revealEndsAt).getTime());
  assert.equal(group.status, 'p1_pick');
});
