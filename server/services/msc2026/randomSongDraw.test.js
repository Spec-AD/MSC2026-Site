'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { drawRandomSong } = require('./randomSongDraw');

test('draws only from songs that have not been used', () => {
  const song = drawRandomSong(['a', 'b', 'c'], ['a', 'c'], size => size - 1);
  assert.equal(song, 'b');
});

test('supports object ids and an injectable secure index source', () => {
  const pool = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
  const song = drawRandomSong(pool, ['b'], () => 1);
  assert.equal(song._id, 'c');
});

test('rejects a draw when the pool has no available song', () => {
  assert.throws(() => drawRandomSong(['a'], ['a']), /图池已无可用曲目/);
});
