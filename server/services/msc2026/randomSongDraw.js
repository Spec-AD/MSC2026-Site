'use strict';

const { randomInt } = require('node:crypto');

function toId(value) {
  return String(value?._id || value);
}

function drawRandomSong(songPool, excludedIds = [], randomIndex = randomInt) {
  const excluded = new Set(excludedIds.map(toId));
  const available = (songPool || []).filter(song => !excluded.has(toId(song)));
  if (available.length === 0) throw new Error('图池已无可用曲目');
  return available[randomIndex(available.length)];
}

module.exports = { drawRandomSong };
