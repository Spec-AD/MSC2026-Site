'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertScoreTarget } = require('./scoreTarget');

const currentSong = {
  songId: '507f1f77bcf86cd799439011',
  order: 2
};

test('accepts a score bound to the current song and index', () => {
  assert.doesNotThrow(() => assertScoreTarget({
    songId: currentSong.songId,
    songIndex: 2
  }, currentSong));
});

test('rejects a stale song id', () => {
  assert.throws(() => assertScoreTarget({
    songId: '507f191e810c19729de860ea',
    songIndex: 2
  }, currentSong), /当前曲目已发生变化/);
});

test('rejects a stale song index', () => {
  assert.throws(() => assertScoreTarget({
    songId: currentSong.songId,
    songIndex: 1
  }, currentSong), /当前曲目已发生变化/);
});

test('rejects submissions without a song binding', () => {
  assert.throws(() => assertScoreTarget({ songIndex: 2 }, currentSong), /缺少 songId/);
  assert.throws(() => assertScoreTarget({ songId: currentSong.songId }, currentSong), /songIndex/);
});
