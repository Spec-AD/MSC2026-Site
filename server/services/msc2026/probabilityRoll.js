'use strict';

const { randomInt } = require('node:crypto');

const SCALE = 1_000_000;

function rollProbability(probability, randomIntSource = randomInt) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error('概率必须在 0 到 1 之间');
  }
  const raw = randomIntSource(SCALE);
  if (!Number.isInteger(raw) || raw < 0 || raw >= SCALE) {
    throw new Error('随机源返回了非法结果');
  }
  const roll = raw / SCALE;
  return { probability, roll, success: roll < probability };
}

module.exports = { rollProbability, SCALE };
