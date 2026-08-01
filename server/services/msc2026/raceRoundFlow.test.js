'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initRace, startRace, playerAction, skipTurn, _drawTask, _replenishEmptyItemZones } = require('./raceEngine');
const { CHALLENGE_TASKS } = require('./challengeDefinitions');

const PLAYER_IDS = Array.from({ length: 6 }, (_, index) => (index + 1).toString(16).padStart(24, '0'));

function createTournament() {
  return {
    status: 'stage2',
    stage2: null,
    qualifiedStage2: [],
    qualifiedStage3: [],
    saveCount: 0,
    async save() { this.saveCount += 1; },
  };
}

test('race initialization randomizes seats and order but waits for an explicit start', async () => {
  const tournament = createTournament();
  const race = await initRace(tournament, PLAYER_IDS);

  assert.equal(race.status, 'waiting');
  assert.equal(race.totalTimeStartedAt, null);
  assert.equal(race.turnStartedAt, null);
  assert.deepEqual([...race.players.map(player => player.startVertex)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([...race.turnOrder].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);

  await startRace(tournament);
  assert.equal(race.status, 'racing');
  assert.ok(race.totalTimeStartedAt instanceof Date);
  assert.ok(race.turnStartedAt instanceof Date);
});

test('a completed round reverses the complete action order for the next round', async () => {
  const tournament = createTournament();
  const race = await initRace(tournament, PLAYER_IDS);
  await startRace(tournament);
  const firstRoundOrder = [...race.turnOrder];

  for (let index = 0; index < PLAYER_IDS.length; index += 1) await skipTurn(tournament);

  assert.equal(race.roundNumber, 2);
  assert.equal(race.status, 'racing');
  assert.deepEqual(race.turnOrder, [...firstRoundOrder].reverse());
  assert.equal(race.currentPlayerIndex, race.turnOrder[0]);
});

test('wall challenges queue through the whole round before adjudication begins', async () => {
  const tournament = createTournament();
  const race = await initRace(tournament, PLAYER_IDS);
  await startRace(tournament);
  const firstPlayerId = race.players[race.currentPlayerIndex].userId.toString();

  const action = await playerAction(tournament, firstPlayerId, 'advance');
  assert.equal(action.queuedForRoundJudgement, true);
  assert.equal(race.status, 'racing');
  assert.equal(race.challengeHistory[0].passed, null);

  for (let index = 1; index < PLAYER_IDS.length; index += 1) await skipTurn(tournament);
  assert.equal(race.status, 'adjudicating');
  assert.equal(race.turnStartedAt, null);
});

test('pickup is allocated only after every player has acted', async () => {
  const tournament = createTournament();
  const race = await initRace(tournament, PLAYER_IDS);
  await startRace(tournament);
  const player = race.players[race.currentPlayerIndex];

  await playerAction(tournament, player.userId.toString(), 'pickup', player.startVertex);
  assert.equal(player.items.length, 0);

  for (let index = 1; index < PLAYER_IDS.length; index += 1) await skipTurn(tournament);
  assert.equal(player.items.length, 1);
  assert.equal(race.roundNumber, 2);
});

test('contested pickup is randomized at round settlement instead of favoring the first claimant', async () => {
  const tournament = createTournament();
  const race = await initRace(tournament, PLAYER_IDS);
  await startRace(tournament);

  const first = race.players[race.currentPlayerIndex];
  first.startVertex = 0;
  await playerAction(tournament, first.userId.toString(), 'pickup', 0);

  const second = race.players[race.currentPlayerIndex];
  second.startVertex = 0;
  await playerAction(tournament, second.userId.toString(), 'pickup', 0);

  let keptOne = false;
  race.itemsOnMap.forEach(item => {
    if (item.zoneIndex !== 0) return;
    if (!keptOne) keptOne = true;
    else item.collected = true;
  });
  assert.equal(keptOne, true);

  const originalRandom = Math.random;
  try {
    // Fisher-Yates with zero reverses the two claimants, so the later claimant wins.
    Math.random = () => 0;
    for (let index = 2; index < PLAYER_IDS.length; index += 1) await skipTurn(tournament);
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(first.items.length, 0);
  assert.equal(second.items.length, 1);
});

test('the 33-task pool avoids repeats per cycle and refills indefinitely', () => {
  const race = {
    taskPool: {
      used: [],
      remaining: CHALLENGE_TASKS.map(task => task.id),
      fallbackTasks: [],
      fallbackCount: 0,
      cycle: 1,
    },
  };
  const firstCycle = Array.from({ length: CHALLENGE_TASKS.length }, () => _drawTask(race, 'stage2', 0).taskId);
  assert.equal(new Set(firstCycle).size, CHALLENGE_TASKS.length);

  const next = _drawTask(race, 'stage2', 0);
  assert.ok(CHALLENGE_TASKS.some(task => task.id === next.taskId));
  assert.equal(race.taskPool.cycle, 2);
});

for (const [stageKey, zoneCount, minRef, maxRef] of [
  ['stage2', 6, 1, 10],
  ['stage3', 4, 11, 20],
]) {
  test(`${stageKey} replenishes every empty item zone indefinitely from its own pool`, () => {
    const race = { roundNumber: 1, itemsOnMap: [] };
    for (let cycle = 0; cycle < 30; cycle += 1) {
      race.itemsOnMap.forEach(item => { item.collected = true; });
      const replenished = _replenishEmptyItemZones(race, stageKey);
      assert.equal(replenished.length, zoneCount);
      for (let zoneIndex = 0; zoneIndex < zoneCount; zoneIndex += 1) {
        const stock = race.itemsOnMap.filter(item => item.zoneIndex === zoneIndex && !item.collected);
        assert.equal(stock.length, 1);
        assert.ok(stock[0].itemRef >= minRef && stock[0].itemRef <= maxRef);
        assert.equal(stock[0].source, 'replenished');
      }
      race.roundNumber += 1;
    }
  });
}
