const MSC2026Tournament = require('../../models/MSC2026Tournament');
const Tournament = require('../../models/Tournament');
const User = require('../../models/User');
const { calculateRaceRankings, determineWinner } = require('./utils');

const WITHDRAWN_USERNAME = '7XDawn';
const SUBSTITUTE_USERNAME = 'CTSs2317';
const DOWNSTREAM_STAGES = new Set(['stage3', 'stage4']);
const SONG_FIELDS = 'id title type basic_info.artist basic_info.bpm ds level aliases charts';

const idOf = value => String(value?._id || value?.userId || value || '');
const round4 = value => Number(Number(value || 0).toFixed(4));
const sum = values => values.reduce((total, value) => total + Number(value || 0), 0);

function publicPlayer(value) {
  if (!value) return null;
  return {
    userId: idOf(value),
    username: value.username || '未知选手',
    avatarUrl: value.avatarUrl || '/assets/logos.png'
  };
}

function publicSong(song, difficultyIndex = 3) {
  if (!song) return null;
  const index = Number.isInteger(Number(difficultyIndex)) ? Number(difficultyIndex) : 3;
  return {
    songId: idOf(song),
    catalogId: song.id == null ? null : String(song.id),
    title: song.title || '未知曲目',
    artist: song.basic_info?.artist || '',
    difficultyIndex: index,
    difficultyName: ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'][index] || 'MASTER',
    level: song.level?.[index] || null,
    constant: song.ds?.[index] ?? null
  };
}

function scoreTotals(scores) {
  const present = scores.filter(Boolean);
  return {
    plays: present.length,
    averageAchievement: present.length ? round4(sum(present.map(score => score.achievement)) / present.length) : null,
    totalAchievement: round4(sum(present.map(score => score.achievement))),
    totalDxScore: sum(present.map(score => score.dxScore)),
    perfectBreak: sum(present.map(score => score.perfectBreak))
  };
}

function compareSong(p1Score, p2Score) {
  if (!p1Score || !p2Score) return null;
  if (p1Score.achievement !== p2Score.achievement) return p1Score.achievement > p2Score.achievement ? 'p1' : 'p2';
  if (p1Score.dxScore !== p2Score.dxScore) return p1Score.dxScore > p2Score.dxScore ? 'p1' : 'p2';
  if ((p1Score.perfectBreak || 0) !== (p2Score.perfectBreak || 0)) {
    return (p1Score.perfectBreak || 0) > (p2Score.perfectBreak || 0) ? 'p1' : 'p2';
  }
  return 'tie';
}

function createResolver(withdrawn, substitute) {
  return (value, stage) => {
    if (DOWNSTREAM_STAGES.has(stage) && withdrawn && substitute && idOf(value) === idOf(withdrawn)) return substitute;
    return value;
  };
}

function serializeSongPlay(play, p1, p2, resolvePlayer, stage) {
  const winnerSide = compareSong(play.p1Score, play.p2Score);
  return {
    order: Number(play.order || 0) + 1,
    song: publicSong(play.songId, play.difficultyIndex),
    pickType: play.pickType,
    pickedBy: publicPlayer(resolvePlayer(play.pickedBy, stage)),
    p1Score: play.p1Score ? {
      achievement: play.p1Score.achievement,
      dxScore: play.p1Score.dxScore,
      perfectBreak: play.p1Score.perfectBreak || 0
    } : null,
    p2Score: play.p2Score ? {
      achievement: play.p2Score.achievement,
      dxScore: play.p2Score.dxScore,
      perfectBreak: play.p2Score.perfectBreak || 0
    } : null,
    winner: winnerSide === 'p1' ? publicPlayer(p1) : winnerSide === 'p2' ? publicPlayer(p2) : null,
    winnerSide
  };
}

function buildStage1(stage, resolvePlayer) {
  const groups = (stage?.groups || []).map((group, index) => {
    const p1 = resolvePlayer(group.p1, 'stage1');
    const p2 = resolvePlayer(group.p2, 'stage1');
    const songs = (group.songs || []).map(play => serializeSongPlay(play, p1, p2, resolvePlayer, 'stage1'));
    return {
      group: index + 1,
      status: group.status,
      p1: publicPlayer(p1),
      p2: publicPlayer(p2),
      winner: publicPlayer(resolvePlayer(group.winner, 'stage1')),
      forfeitedBy: publicPlayer(resolvePlayer(group.forfait, 'stage1')),
      p1Totals: scoreTotals((group.songs || []).map(song => song.p1Score)),
      p2Totals: scoreTotals((group.songs || []).map(song => song.p2Score)),
      songs
    };
  });
  return { key: 'stage1', label: '12 进 6', format: '六组双人三曲对决', groups };
}

function buildRaceStage(stage, stageKey, resolvePlayer) {
  const rankings = calculateRaceRankings(stage?.players || []);
  const qualifiedCount = stageKey === 'stage2' ? 4 : 2;
  const challengesByPlayer = new Map();
  for (const challenge of stage?.challengeHistory || []) {
    const resolved = resolvePlayer(challenge.playerId, stageKey);
    const playerId = idOf(resolved);
    if (!challengesByPlayer.has(playerId)) challengesByPlayer.set(playerId, []);
    challengesByPlayer.get(playerId).push(challenge);
  }

  return {
    key: stageKey,
    label: stageKey === 'stage2' ? '6 进 4' : '4 进 2',
    format: stageKey === 'stage2' ? '六边形跑图' : '正方形跑图',
    terminatedReason: stage?.terminatedReason || null,
    perfectBreakRecorded: false,
    rankings: rankings.map((entry, index) => {
      const original = (stage?.players || []).find(player => idOf(player.userId) === idOf(entry.userId));
      const resolvedPlayer = resolvePlayer(original?.userId || entry.userId, stageKey);
      const challenges = challengesByPlayer.get(idOf(resolvedPlayer)) || [];
      return {
        rank: index + 1,
        player: publicPlayer(resolvedPlayer),
        qualified: index < qualifiedCount,
        finishOrder: entry.finishOrder || null,
        finishTimestamp: entry.finishTimestamp || null,
        currentLayer: entry.currentLayer || 0,
        attempts: challenges.length,
        clears: challenges.filter(challenge => challenge.passed || challenge.breakthroughGranted).length,
        failures: challenges.filter(challenge => challenge.passed === false && !challenge.breakthroughGranted).length,
        averageAchievement: entry.successfulChallengeAverage ? round4(entry.successfulChallengeAverage) : null,
        totalDxScore: Number(entry.cumulativeDxScore || 0),
        perfectBreak: null,
        itemUses: (stage?.actionLog || []).filter(log => idOf(resolvePlayer(log.playerId, stageKey)) === idOf(resolvedPlayer) && log.actionType === 'use_item').length,
        challenges: challenges.map(challenge => ({
          wallIndex: challenge.wallIndex,
          taskName: challenge.resolvedChallenge?.taskName || challenge.originalChallenge?.taskName || '现场挑战',
          songTitle: challenge.resolvedChallenge?.songTitle || challenge.originalChallenge?.songTitle || null,
          passed: Boolean(challenge.passed || challenge.breakthroughGranted),
          breakthroughGranted: Boolean(challenge.breakthroughGranted),
          achievement: Number.isFinite(challenge.resultSnapshot?.achievement) ? challenge.resultSnapshot.achievement : null,
          dxScore: Number.isFinite(challenge.resultSnapshot?.dxScore) ? challenge.resultSnapshot.dxScore : null,
          perfectBreak: null,
          itemEffects: challenge.activeItemEffects || []
        }))
      };
    })
  };
}

function buildFinal(stage, resolvePlayer) {
  const p1 = resolvePlayer(stage?.p1, 'stage4');
  const p2 = resolvePlayer(stage?.p2, 'stage4');
  const songs = (stage?.songs || []).map(play => serializeSongPlay(play, p1, p2, resolvePlayer, 'stage4'));
  const p1Totals = scoreTotals((stage?.songs || []).map(song => song.p1Score));
  const p2Totals = scoreTotals((stage?.songs || []).map(song => song.p2Score));
  return {
    key: 'stage4',
    label: '决赛',
    format: '双方选曲、随机曲与表里课题曲',
    p1: publicPlayer(p1),
    p2: publicPlayer(p2),
    winner: publicPlayer(resolvePlayer(stage?.winner, 'stage4')),
    p1Totals,
    p2Totals,
    decision: determineWinner((stage?.songs || []).map(song => song.p1Score), (stage?.songs || []).map(song => song.p2Score)),
    songs
  };
}

function addPlayerStat(map, player, stage, score = null, extras = {}) {
  const key = idOf(player);
  if (!key) return;
  if (!map.has(key)) {
    map.set(key, {
      player: publicPlayer(player), stages: new Set(), scores: [], raceAttempts: 0,
      raceClears: 0, totalDxScore: 0, perfectBreak: 0, finalRank: null
    });
  }
  const record = map.get(key);
  record.stages.add(stage);
  if (score) {
    record.scores.push(score);
    record.totalDxScore += Number(score.dxScore || 0);
    record.perfectBreak += Number(score.perfectBreak || 0);
  }
  record.raceAttempts += Number(extras.raceAttempts || 0);
  record.raceClears += Number(extras.raceClears || 0);
  record.totalDxScore += Number(extras.raceDxScore || 0);
}

function buildPlayerArchives(stages, placements) {
  const map = new Map();
  for (const group of stages.stage1.groups) {
    for (const [side, totalsKey] of [['p1', 'p1Totals'], ['p2', 'p2Totals']]) {
      const player = group[side];
      const rawSongs = group.songs.map(song => side === 'p1' ? song.p1Score : song.p2Score).filter(Boolean);
      rawSongs.forEach(score => addPlayerStat(map, player, '12进6', score));
      if (!rawSongs.length && group[totalsKey]) addPlayerStat(map, player, '12进6');
    }
  }
  for (const race of [stages.stage2, stages.stage3]) {
    race.rankings.forEach(entry => addPlayerStat(map, entry.player, race.label, null, {
      raceAttempts: entry.attempts,
      raceClears: entry.clears,
      raceDxScore: entry.totalDxScore
    }));
  }
  for (const side of ['p1', 'p2']) {
    const player = stages.stage4[side];
    stages.stage4.songs.map(song => song[`${side}Score`]).filter(Boolean)
      .forEach(score => addPlayerStat(map, player, '决赛', score));
  }
  placements.forEach(place => {
    const record = map.get(idOf(place.player));
    if (record) record.finalRank = place.rank;
  });

  const maxStage = record => record.finalRank === 1 ? 100 : record.finalRank === 2 ? 96 :
    record.stages.has('4进2') ? (record.finalRank ? 90 - (record.finalRank - 3) * 4 : 84) :
      record.stages.has('6进4') ? 78 : 68;

  return Array.from(map.values()).map(record => {
    const achievements = record.scores.map(score => score.achievement).filter(Number.isFinite);
    const strengthIndex = Math.max(0, Math.min(100, maxStage(record)));
    return {
      player: record.player,
      stages: Array.from(record.stages),
      finalRank: record.finalRank,
      strengthIndex,
      strengthTier: strengthIndex >= 98 ? 'S+' : strengthIndex >= 92 ? 'S' : strengthIndex >= 84 ? 'A+' : strengthIndex >= 74 ? 'A' : 'B+',
      songsPlayed: record.scores.length,
      averageAchievement: achievements.length ? round4(sum(achievements) / achievements.length) : null,
      totalDxScore: record.totalDxScore,
      perfectBreak: record.perfectBreak,
      raceAttempts: record.raceAttempts,
      raceClears: record.raceClears
    };
  }).sort((a, b) => b.strengthIndex - a.strengthIndex || (b.averageAchievement || 0) - (a.averageAchievement || 0));
}

function buildHighlights(stages) {
  const performances = [];
  const collect = (stageLabel, songs, p1, p2) => songs.forEach(song => {
    if (song.p1Score) performances.push({ stage: stageLabel, player: p1, song: song.song, score: song.p1Score });
    if (song.p2Score) performances.push({ stage: stageLabel, player: p2, song: song.song, score: song.p2Score });
  });
  stages.stage1.groups.forEach(group => collect('12进6', group.songs, group.p1, group.p2));
  collect('决赛', stages.stage4.songs, stages.stage4.p1, stages.stage4.p2);
  const best = key => [...performances].sort((a, b) => Number(b.score[key] || 0) - Number(a.score[key] || 0))[0] || null;
  return {
    highestAchievement: best('achievement'),
    highestDxScore: best('dxScore'),
    mostPerfectBreak: best('perfectBreak'),
    finalDecider: stages.stage4.songs[stages.stage4.songs.length - 1] || null
  };
}

function buildArchiveSummary(tournament, withdrawn, substitute) {
  const resolvePlayer = createResolver(withdrawn, substitute);
  const stage1 = buildStage1(tournament.stage1, resolvePlayer);
  const stage2 = buildRaceStage(tournament.stage2, 'stage2', resolvePlayer);
  const stage3 = buildRaceStage(tournament.stage3, 'stage3', resolvePlayer);
  const stage4 = buildFinal(tournament.stage4, resolvePlayer);
  const stage3Others = stage3.rankings.map(entry => entry.player)
    .filter(player => player && ![idOf(stage4.p1), idOf(stage4.p2)].includes(idOf(player)));
  const placements = [
    { rank: 1, player: stage4.winner, label: '冠军' },
    { rank: 2, player: idOf(stage4.winner) === idOf(stage4.p1) ? stage4.p2 : stage4.p1, label: '亚军' },
    ...stage3Others.slice(0, 2).map((player, index) => ({ rank: index + 3, player, label: '四强' }))
  ].filter(place => place.player);
  const stages = { stage1, stage2, stage3, stage4 };

  return {
    status: tournament.status,
    archived: Boolean(tournament.archive?.locked || tournament.status === 'finished'),
    oldTournamentId: idOf(tournament.oldTournamentId),
    correction: {
      withdrawn: publicPlayer(withdrawn),
      substitute: publicPlayer(substitute),
      effectiveFrom: '4进2',
      note: '7XDawn 在 6 进 4 晋级后因个人原因弃权；自 4 进 2 起，其席位与后续成绩统一归档为 CTSs2317。'
    },
    placements,
    stages,
    highlights: buildHighlights(stages),
    players: buildPlayerArchives(stages, placements),
    dataNotes: [
      '完成率保留四位小数；DX 分与完美 BREAK 依照现场录入原值统计。',
      '跑图阶段现场系统未录入完美 BREAK，档案中以“未记录”展示，不作推算。',
      '实力分级仅反映本届 MSC 2026 的晋级深度与赛场表现，不代表玩家常规 Rating。'
    ]
  };
}

async function loadArchiveSummary() {
  const tournament = await MSC2026Tournament.findOne()
    .populate('oldTournamentId', '_id title status')
    .populate('stage1.groups.p1', 'username avatarUrl')
    .populate('stage1.groups.p2', 'username avatarUrl')
    .populate('stage1.groups.winner', 'username avatarUrl')
    .populate('stage1.groups.forfait', 'username avatarUrl')
    .populate('stage1.groups.songs.pickedBy', 'username avatarUrl')
    .populate('stage1.groups.songs.songId', SONG_FIELDS)
    .populate('stage2.players.userId', 'username avatarUrl')
    .populate('stage3.players.userId', 'username avatarUrl')
    .populate('stage4.p1', 'username avatarUrl')
    .populate('stage4.p2', 'username avatarUrl')
    .populate('stage4.winner', 'username avatarUrl')
    .populate('stage4.songs.pickedBy', 'username avatarUrl')
    .populate('stage4.songs.songId', SONG_FIELDS);
  if (!tournament) return null;
  const [withdrawn, substitute] = await Promise.all([
    User.findOne({ username: WITHDRAWN_USERNAME }).select('username avatarUrl'),
    User.findOne({ username: SUBSTITUTE_USERNAME }).select('username avatarUrl')
  ]);
  return buildArchiveSummary(tournament, withdrawn, substitute);
}

function replaceId(value, fromId, toId) {
  return idOf(value) === fromId ? toId : value;
}

async function reconcileMSC2026Archive() {
  const tournament = await MSC2026Tournament.findOne();
  if (!tournament || tournament.status !== 'finished' || !tournament.oldTournamentId) return { reconciled: false };
  const [withdrawn, substitute] = await Promise.all([
    User.findOne({ username: WITHDRAWN_USERNAME }).select('_id username avatarUrl'),
    User.findOne({ username: SUBSTITUTE_USERNAME }).select('_id username avatarUrl')
  ]);
  if (!withdrawn || !substitute) return { reconciled: false, reason: 'replacement_players_missing' };
  const fromId = idOf(withdrawn);
  const toId = idOf(substitute);

  // 保留 7XDawn 的 6进4 战果；从 4进2 起修正为替补 CTSs2317。
  for (const player of tournament.stage3?.players || []) player.userId = replaceId(player.userId, fromId, substitute._id);
  for (const finish of tournament.stage3?.finishOrder || []) finish.userId = replaceId(finish.userId, fromId, substitute._id);
  for (const log of tournament.stage3?.actionLog || []) log.playerId = replaceId(log.playerId, fromId, substitute._id);
  for (const challenge of tournament.stage3?.challengeHistory || []) challenge.playerId = replaceId(challenge.playerId, fromId, substitute._id);
  tournament.qualifiedStage3 = (tournament.qualifiedStage3 || []).map(value => replaceId(value, fromId, substitute._id));
  if (tournament.stage4) {
    tournament.stage4.p1 = replaceId(tournament.stage4.p1, fromId, substitute._id);
    tournament.stage4.p2 = replaceId(tournament.stage4.p2, fromId, substitute._id);
    tournament.stage4.winner = replaceId(tournament.stage4.winner, fromId, substitute._id);
    for (const song of tournament.stage4.songs || []) song.pickedBy = replaceId(song.pickedBy, fromId, substitute._id);
  }
  tournament.archive = {
    locked: true,
    lockedAt: tournament.archive?.lockedAt || new Date(),
    summaryVersion: 1,
    substitutions: [{
      fromUser: withdrawn._id,
      toUser: substitute._id,
      effectiveFrom: 'stage3',
      reason: '7XDawn 在 6进4 晋级后因个人原因弃权，由 CTSs2317 替补参加 4进2 及后续比赛。'
    }]
  };
  await tournament.save();

  const hydrated = await MSC2026Tournament.findById(tournament._id)
    .populate('stage1.groups.p1 stage1.groups.p2 stage1.groups.winner', 'username avatarUrl')
    .populate('stage1.groups.songs.songId', SONG_FIELDS)
    .populate('stage2.players.userId stage3.players.userId stage4.p1 stage4.p2 stage4.winner', 'username avatarUrl')
    .populate('stage4.songs.songId', SONG_FIELDS);
  const summary = buildArchiveSummary(hydrated, withdrawn, substitute);
  const oldT = await Tournament.findById(tournament.oldTournamentId);
  if (oldT) {
    const previousStatus = oldT.status;
    oldT.qualifierLocked = true;
    oldT.status = 'ARCHIVED';
    oldT.results = summary.placements.map(place => ({
      rank: place.rank,
      userId: place.player.userId,
      note: place.rank === 1 ? 'MSC 2026 冠军' : place.rank === 2 ? 'MSC 2026 亚军（替补参赛）' : 'MSC 2026 四强'
    }));
    oldT.resultAnnouncement = [
      'MSC 2026 最终战果',
      ...summary.placements.map(place => `${place.rank}. ${place.player.username} — ${place.label}`),
      '',
      '席位说明：7XDawn 在 6进4 晋级后弃权，自 4进2 起由 CTSs2317 替补，后续成绩归 CTSs2317。'
    ].join('\n');
    for (const match of oldT.matches || []) {
      if (match.round !== '4进2') continue;
      match.playerA = replaceId(match.playerA, fromId, substitute._id);
      match.playerB = replaceId(match.playerB, fromId, substitute._id);
      match.winner = replaceId(match.winner, fromId, substitute._id);
    }
    const finalExists = (oldT.matches || []).some(match => match.round === '决赛');
    if (!finalExists) {
      const final = summary.stages.stage4;
      oldT.matches.push({
        round: '决赛', roundName: 'MSC 2026 Grand Final', bracketPosition: oldT.matches.length,
        nextMatchIndex: -1, playerA: final.p1.userId, playerB: final.p2.userId,
        scoreA: idOf(final.winner) === idOf(final.p1) ? 1 : 0,
        scoreB: idOf(final.winner) === idOf(final.p2) ? 1 : 0,
        winner: final.winner.userId, status: 'FINISHED', finishedAt: new Date()
      });
    }
    if (!(oldT.operationLogs || []).some(log => log.action === 'msc2026_archive_reconciled')) {
      oldT.operationLogs.push({
        action: 'msc2026_archive_reconciled', fromStatus: previousStatus, toStatus: 'ARCHIVED',
        operatedAt: new Date(), note: '写入 MSC 2026 最终战果、替补归属并锁定赛事档案'
      });
    }
    await oldT.save();
  }
  return { reconciled: true, tournamentId: idOf(tournament), oldTournamentId: idOf(tournament.oldTournamentId) };
}

module.exports = {
  buildArchiveSummary,
  loadArchiveSummary,
  reconcileMSC2026Archive,
  WITHDRAWN_USERNAME,
  SUBSTITUTE_USERNAME
};
