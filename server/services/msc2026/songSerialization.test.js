'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeSongPlay } = require('./songSerialization');

test('serializes a populated song play with a stable frontend shape', () => {
  const result = serializeSongPlay({
    songId: {
      _id: '507f1f77bcf86cd799439011',
      id: '123',
      title: 'Random Song',
      basic_info: { artist: 'Artist', bpm: 180 },
      ds: [12.7],
      level: ['12+']
    },
    pickType: 'random',
    pickedBy: null,
    p1Score: { achievement: 100.1234 },
    p2Score: null,
    order: 2
  });

  assert.equal(result.songId, '507f1f77bcf86cd799439011');
  assert.equal(result.song.title, 'Random Song');
  assert.equal(result.song.artist, 'Artist');
  assert.equal(result.song.bpm, 180);
  assert.equal(result.song.coverUrl, 'https://www.diving-fish.com/covers/00123.png');
  assert.equal(result.pickType, 'random');
  assert.equal(result.order, 2);
});

test('keeps an unpopulated song id without inventing song metadata', () => {
  const result = serializeSongPlay({
    songId: '507f1f77bcf86cd799439011',
    pickType: 'p1_pick',
    order: 0
  });

  assert.equal(result.songId, '507f1f77bcf86cd799439011');
  assert.equal(result.song, null);
});
