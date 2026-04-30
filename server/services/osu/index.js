/**
 * osu! 服务层统一导出
 */

const osuApi   = require('./api');
const sync     = require('./sync');
const pass     = require('./pass');
const recent   = require('./recent');
const score    = require('./score');
const best     = require('./best');
const todaybest = require('./todaybest');
const info     = require('./info');
const map      = require('./map');
const leaderboard = require('./leaderboard');

module.exports = {
  api: osuApi,
  sync,
  pass,
  recent,
  score,
  best,
  todaybest,
  info,
  map,
  leaderboard,
};
