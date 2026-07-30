'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const stage1Service = require('./stage1');
const stage4Service = require('./stage4');
const { undoStage1LastSong, undoStage4LastSong } = require('./rollback');

const SCORE = { achievement: 100, dxScore: 1000, perfectBreak: 8 };

function song(songId, order, pickType, scored = true) {
  return {
    songId,
    order,
    pickType,
    p1Score: scored ? { ...SCORE } : null,
    p2Score: scored ? { ...SCORE } : null
  };
}

function scoreBody(songId, songIndex) {
  return {
    songId,
    songIndex,
    p1Score: { ...SCORE },
    p2Score: { ...SCORE }
  };
}

test('stage1 waits for a manual draw after the second score', async () => {
  const tournament = {
    stage1: {
      status: 'playing',
      currentGroupIndex: 0,
      songPool: ['song-1', 'song-2', 'song-3'],
      groups: [{
        status: 'playing',
        songs: [
          song('song-1', 0, 'p1_pick'),
          song('song-2', 1, 'p2_pick', false)
        ]
      }]
    },
    operationLogs: [],
    save: async () => {}
  };

  const submitted = await stage1Service.submitScore(
    tournament,
    'referee',
    scoreBody('song-2', 1)
  );

  assert.equal(submitted.nextStep, 'manual_random_pick');
  assert.equal(tournament.stage1.groups[0].status, 'random_pick');
  assert.equal(tournament.stage1.groups[0].songs.length, 2);

  const drawn = await stage1Service.advance(tournament);
  assert.equal(drawn.nextStep, 'random_pick');
  assert.equal(drawn.songId, 'song-3');
  assert.equal(tournament.stage1.groups[0].status, 'playing');
  assert.equal(tournament.stage1.groups[0].songs[2].pickType, 'random');

  undoStage1LastSong(tournament);
  assert.equal(tournament.stage1.groups[0].status, 'random_pick');
  assert.equal(tournament.stage1.groups[0].songs.length, 2);
});

test('stage4 waits for a manual draw after the second score', async () => {
  const tournament = {
    stage4: {
      status: 'playing',
      p1: 'player-1',
      p2: 'player-2',
      designatedSongId: 'designated-song',
      secretDesignatedSongId: 'secret-song',
      songPool: ['song-1', 'song-2', 'song-3'],
      songs: [
        song('song-1', 0, 'p1_pick'),
        song('song-2', 1, 'p2_pick', false)
      ]
    },
    operationLogs: [],
    save: async () => {}
  };

  const submitted = await stage4Service.submitScore(
    tournament,
    'referee',
    scoreBody('song-2', 1)
  );

  assert.equal(submitted.nextStep, 'manual_random_pick');
  assert.equal(tournament.stage4.status, 'random_pick');
  assert.equal(tournament.stage4.songs.length, 2);

  const drawn = await stage4Service.advance(tournament);
  assert.equal(drawn.nextStep, 'random_pick');
  assert.equal(String(drawn.song.songId), 'song-3');
  assert.equal(tournament.stage4.status, 'playing');
  assert.equal(tournament.stage4.songs[2].pickType, 'random');

  undoStage4LastSong(tournament);
  assert.equal(tournament.stage4.status, 'random_pick');
  assert.equal(tournament.stage4.songs.length, 2);
});

test('stage4 reveals the secret challenge only after the fourth score', async () => {
  const tournament = {
    stage4: {
      status: 'playing',
      p1: 'player-1',
      p2: 'player-2',
      designatedSongId: 'designated-song',
      designatedDifficultyIndex: 3,
      secretDesignatedSongId: 'secret-song',
      secretDesignatedDifficultyIndex: 4,
      secretRevealedAt: null,
      songPool: ['song-1', 'song-2', 'song-3'],
      songs: [
        song('song-1', 0, 'p1_pick'),
        song('song-2', 1, 'p2_pick'),
        song('song-3', 2, 'random'),
        song('designated-song', 3, 'designated'),
      ],
      winner: null,
      needTiebreak: false,
    },
    operationLogs: [],
    save: async () => {},
  };

  const revealed = await stage4Service.advance(tournament);
  assert.equal(revealed.nextStep, 'final_challenge');
  assert.equal(revealed.secretDesignatedSongId, 'secret-song');
  assert.equal(tournament.stage4.songs.length, 5);
  assert.equal(tournament.stage4.songs[4].pickType, 'secret_designated');
  assert.equal(tournament.stage4.songs[4].difficultyIndex, 4);
  assert.ok(tournament.stage4.secretRevealedAt);
  await assert.rejects(stage4Service.advance(tournament), /成绩未完整录入/);

  undoStage4LastSong(tournament);
  assert.equal(tournament.stage4.songs.length, 4);
  assert.equal(tournament.stage4.secretRevealedAt, null);

  await stage4Service.advance(tournament);
  tournament.stage4.songs[4].p1Score = { ...SCORE };
  tournament.stage4.songs[4].p2Score = { ...SCORE };
  const finished = await stage4Service.advance(tournament);
  assert.equal(finished.nextStep, 'need_tiebreak');
  assert.equal(tournament.stage4.status, 'done');
});
