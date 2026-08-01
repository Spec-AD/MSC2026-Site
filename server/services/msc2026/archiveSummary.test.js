const test = require('node:test');
const assert = require('node:assert/strict');
const { buildArchiveSummary } = require('./archiveSummary');

const user = (id, username) => ({ _id: id, username, avatarUrl: `/${username}.png` });
const score = (achievement, dxScore, perfectBreak) => ({ achievement, dxScore, perfectBreak });
const song = (id, title) => ({ _id: id, id, title, level: ['1', '2', '3', '14'], ds: [1, 2, 3, 14], basic_info: { artist: 'artist' } });

test('archive keeps 7XDawn in 6-to-4 and assigns all later records to CTSs2317', () => {
  const dawn = user('dawn', '7XDawn');
  const substitute = user('ctss', 'CTSs2317');
  const champion = user('champ', '蕾米');
  const third = user('third', '2762133963');
  const fourth = user('fourth', '小陈不干坏事');
  const opponent = user('opponent', 'Stage1 Opponent');
  const playedSong = song('song-1', 'Final Song');

  const tournament = {
    status: 'finished', oldTournamentId: 'old-tournament', archive: { locked: true },
    stage1: {
      groups: [{
        p1: dawn, p2: opponent, winner: dawn, status: 'done', songs: [{
          songId: playedSong, difficultyIndex: 3, pickType: 'p1_pick', pickedBy: dawn, order: 0,
          p1Score: score(100.5, 2900, 20), p2Score: score(100.1, 2800, 10)
        }]
      }]
    },
    stage2: {
      players: [
        { userId: dawn, finishOrder: 1, currentLayer: 3, successfulChallengeCount: 1, successfulChallengeAchievementTotal: 100.5, cumulativeDxScore: 2900 },
        { userId: champion, finishOrder: 2, currentLayer: 3 },
      ],
      challengeHistory: [{ playerId: dawn, passed: true, wallIndex: 0, resultSnapshot: { achievement: 100.5, dxScore: 2900 } }],
      actionLog: []
    },
    stage3: {
      players: [
        { userId: dawn, finishOrder: 1, currentLayer: 3 },
        { userId: champion, finishOrder: 2, currentLayer: 3 },
        { userId: third, finishOrder: null, currentLayer: 2 },
        { userId: fourth, finishOrder: null, currentLayer: 1 },
      ],
      challengeHistory: [{ playerId: dawn, passed: true, wallIndex: 1, resultSnapshot: { achievement: 100.7, dxScore: 3000 } }],
      actionLog: []
    },
    stage4: {
      p1: dawn, p2: champion, winner: champion,
      songs: [{
        songId: playedSong, difficultyIndex: 3, pickType: 'secret_designated', pickedBy: null, order: 0,
        p1Score: score(100.2, 2850, 18), p2Score: score(100.8, 2950, 24)
      }]
    }
  };

  const archive = buildArchiveSummary(tournament, dawn, substitute);

  assert.equal(archive.stages.stage2.rankings[0].player.username, '7XDawn');
  assert.equal(archive.stages.stage3.rankings[0].player.username, 'CTSs2317');
  assert.equal(archive.stages.stage4.p1.username, 'CTSs2317');
  assert.equal(archive.placements[0].player.username, '蕾米');
  assert.equal(archive.placements[1].player.username, 'CTSs2317');
  assert.equal(archive.stages.stage1.groups[0].p1Totals.averageAchievement, 100.5);
  assert.equal(archive.stages.stage1.groups[0].p1Totals.totalDxScore, 2900);
  assert.equal(archive.stages.stage1.groups[0].p1Totals.perfectBreak, 20);
  assert.equal(archive.stages.stage2.rankings[0].perfectBreak, null);
});
