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
      ds: [10, 11, 12, 14.3],
      level: ['10', '11', '12', '14+'],
      aliases: ['RSG'],
      charts: [null, null, null, { charter: 'Chart Author', notes: [100, 20, 30, 10, 5] }]
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
  assert.equal(result.song.coverUrl, '/api/msc2026/media/covers/00123.png');
  assert.equal(result.song.difficultyName, 'MASTER');
  assert.equal(result.song.chartConstant, 14.3);
  assert.equal(result.song.charter, 'Chart Author');
  assert.equal(result.song.totalNotes, 165);
  assert.equal(result.song.noteCounts.break, 5);
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
