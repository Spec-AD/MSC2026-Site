/**
 * MSC 2026 阶段一：12进6
 * 随机分组 → 回合制选曲 → 裁判成绩录入 → 晋级判定
 *
 * b1.7.11.patch-02
 * - P0-3: 强制P1/P2成绩均完整后才推进
 * - P1-8: 阶段完成自动推进 status → stage2
 * - 旧赛事同步：全部组完成时回写 groups/matches
 */

const { shuffle, validateScore, normalizeScoreInput, determineWinner, assertObjectIdList } = require('./utils');
const { broadcast } = require('./ssePool');
const { syncToOldTournament } = require('./oldTournamentSync');
const { assertScoreTarget } = require('./scoreTarget');
const { drawRandomSong } = require('./randomSongDraw');

/**
 * 初始化12进6分组
 */
async function initStage1(tournament, playerIds, songPoolIds, difficultyIndexes = {}) {
  playerIds = assertObjectIdList(playerIds, 12, '阶段一选手');
  songPoolIds = assertObjectIdList(songPoolIds || [], null, '阶段一图池');
  if (songPoolIds.length < 3) {
    throw new Error('图池至少需要3首歌');
  }

  const firstSeedPot = shuffle(playerIds.slice(0, 6));
  const secondSeedPot = shuffle(playerIds.slice(6, 12));
  const groups = [];

  // 预选赛 1-6 名与 7-12 名分档，每组各抽一人。
  for (let i = 0; i < 6; i++) {
    const p1 = firstSeedPot[i];
    const p2 = secondSeedPot[i];
    // 随机分配 P1/P2
    const swap = Math.random() < 0.5;
    groups.push({
      order: i,
      p1: swap ? p2 : p1,
      p2: swap ? p1 : p2,
      songs: [],
      status: 'pending',
      revealStartedAt: null,
      revealEndsAt: null,
      winner: null,
      forfait: null,
      needTiebreak: false
    });
  }

  // 随机出场顺序
  const shuffledGroups = shuffle(groups);
  shuffledGroups.forEach((g, i) => { g.order = i; });

  tournament.stage1 = {
    songPool: songPoolIds,
    difficultyIndexes: { ...difficultyIndexes },
    groups: shuffledGroups,
    status: 'pending',
    currentGroupIndex: -1
  };

  await tournament.save();

  broadcast('stage_advanced', {
    from: tournament.status,
    to: 'stage1',
    timestamp: Date.now()
  });

  return tournament.stage1;
}

/**
 * 开始第一组比赛（裁判调用 advance 自动触发）
 */
async function startFirstGroup(tournament) {
  if (tournament.stage1.currentGroupIndex !== -1) return;

  tournament.stage1.currentGroupIndex = 0;
  tournament.stage1.status = 'playing';

  const group = tournament.stage1.groups[0];
  _startGroupReveal(group);

  await tournament.save();

  broadcast('group_reveal_started', {
    stage: 'stage1',
    groupIndex: 0,
    revealEndsAt: group.revealEndsAt,
    p1: group.p1.toString(),
    p2: group.p2.toString()
  });
}

const GROUP_REVEAL_MS = 7000;

function _startGroupReveal(group, now = Date.now()) {
  group.status = 'revealing';
  group.revealStartedAt = new Date(now);
  group.revealEndsAt = new Date(now + GROUP_REVEAL_MS);
}

async function completeGroupReveal(tournament, now = Date.now()) {
  const stage1 = tournament.stage1;
  const group = stage1?.groups?.[stage1.currentGroupIndex];
  if (!group) throw new Error('无进行中的组');
  if (group.status === 'p1_pick') return group;
  if (group.status !== 'revealing') throw new Error('当前组不在抽签揭晓阶段');
  if (group.revealEndsAt && now < new Date(group.revealEndsAt).getTime()) {
    throw new Error('抽签动画尚未结束');
  }
  group.status = 'p1_pick';
  await tournament.save();
  broadcast('turn_change', {
    stage: 'stage1',
    groupIndex: stage1.currentGroupIndex,
    phase: 'p1_pick',
    currentPicker: group.p1.toString()
  });
  return group;
}

function getConfiguredDifficulty(stage, songId) {
  const value = Number(stage?.difficultyIndexes?.[String(songId)] ?? 3);
  return Number.isInteger(value) && value >= 0 && value <= 4 ? value : 3;
}

/**
 * 选手选曲（裁判代理）
 * @param {object} tournament
 * @param {string} targetPlayerId - 已废弃，仅保留兼容；选曲归属由当前阶段自动确定
 * @param {string} songId
 */
async function selectSong(tournament, targetPlayerId, songId) {
  const stage1 = tournament.stage1;
  if (stage1.status !== 'playing') {
    throw new Error('当前不在比赛阶段');
  }

  const group = stage1.groups[stage1.currentGroupIndex];
  if (!group) throw new Error('无效的组索引');

  // 确定当前选曲阶段和选曲者。MSC 现场由 ADM/TO/CHM 代理操作，
  // 因此不再信任请求体里的 playerId，避免代理误传导致流程卡死。
  if (group.status === 'p1_pick') {
    // 校验曲目在图池中且未在当前组被选过
    if (!stage1.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (group.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被本轮选择');
    }

    group.songs.push({
      songId,
      difficultyIndex: getConfiguredDifficulty(stage1, songId),
      pickType: 'p1_pick',
      pickedBy: group.p1,
      p1Score: null,
      p2Score: null,
      order: group.songs.length
    });
    group.status = 'playing';
  } else if (group.status === 'p2_pick') {
    if (!stage1.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (group.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被本轮选择');
    }

    group.songs.push({
      songId,
      difficultyIndex: getConfiguredDifficulty(stage1, songId),
      pickType: 'p2_pick',
      pickedBy: group.p2,
      p1Score: null,
      p2Score: null,
      order: group.songs.length
    });
    group.status = 'playing';
  } else {
    throw new Error('当前不是选曲阶段');
  }

  await tournament.save();

  broadcast('score_updated', {
    stage: 'stage1',
    groupIndex: stage1.currentGroupIndex,
    phase: 'song_picked',
    pickType: group.songs[group.songs.length - 1].pickType
  });

  return { group, nextStep: 'waiting_play_result' };
}

/**
 * 裁判提交成绩
 * P0-3: 仅录入请求中包含的分数；推进前必须校验P1/P2均完整
 */
async function submitScore(tournament, userId, body) {
  const stage1 = tournament.stage1;
  const group = stage1.groups[stage1.currentGroupIndex];
  if (!group) throw new Error('无进行中的组');
  if (group.status !== 'playing') throw new Error('当前组未在等待成绩录入');

  const lastSong = group.songs[group.songs.length - 1];
  if (!lastSong) throw new Error('未找到待录入的曲目');
  assertScoreTarget(body, lastSong);

  // 校验并写入成绩
  if (body.p1Score) {
    const p1Score = normalizeScoreInput(body.p1Score);
    const errs = validateScore(p1Score);
    if (errs.length) throw new Error(`P1成绩校验失败: ${errs.join('; ')}`);
    lastSong.p1Score = {
      achievement: p1Score.achievement,
      dxScore: p1Score.dxScore,
      perfectBreak: p1Score.perfectBreak,
      recordedBy: userId,
      recordedAt: new Date(),
      locked: true
    };
  }
  if (body.p2Score) {
    const p2Score = normalizeScoreInput(body.p2Score);
    const errs = validateScore(p2Score);
    if (errs.length) throw new Error(`P2成绩校验失败: ${errs.join('; ')}`);
    lastSong.p2Score = {
      achievement: p2Score.achievement,
      dxScore: p2Score.dxScore,
      perfectBreak: p2Score.perfectBreak,
      recordedBy: userId,
      recordedAt: new Date(),
      locked: true
    };
  }

  // P0-3: 检查P1/P2成绩均存在后，才推进状态
  if (!lastSong.p1Score || !lastSong.p2Score) {
    await tournament.save();
    return { group, nextStep: 'waiting_more_scores' };
  }

  // 推进状态
  const songCount = group.songs.length;
  if (songCount === 1) {
    // P1 选曲成绩录入完毕 → P2 选曲
    group.status = 'p2_pick';
  } else if (songCount === 2) {
    // P2 选曲成绩录入完毕 → 等待裁判手动触发随机选曲
    group.status = 'random_pick';
  } else if (songCount === 3 && lastSong.pickType === 'random') {
    // 随机曲成绩录入完毕 → 判定胜负 → 停留在赛后总结，等待主办方手动开下一组
    await _determineGroupWinner(group);
    group.status = 'done';
    await tournament.save();
    broadcast('score_updated', {
      stage: 'stage1',
      groupIndex: stage1.currentGroupIndex,
      songIndex: lastSong.order,
      groupStatus: group.status
    });
    broadcast('match_finished', {
      type: 'group',
      groupIndex: stage1.currentGroupIndex,
      winnerId: group.winner ? group.winner.toString() : null,
      needTiebreak: !!group.needTiebreak,
      awaitingNextGroup: true
    });
    return {
      group,
      nextStep: group.needTiebreak ? 'group_done_need_tiebreak' : 'group_complete_waiting',
      groupIndex: stage1.currentGroupIndex,
      winnerId: group.winner ? group.winner.toString() : null
    };
  }

  await tournament.save();

  broadcast('score_updated', {
    stage: 'stage1',
    groupIndex: stage1.currentGroupIndex,
    songIndex: lastSong.order,
    groupStatus: group.status
  });

  return {
    group,
    nextStep: group.status === 'random_pick' ? 'manual_random_pick' : group.status
  };
}

/**
 * 系统随机选曲
 */
async function _systemRandomPick(tournament, group, stage1) {
  const pickedIds = group.songs.map(s => s.songId.toString());
  const randomSong = drawRandomSong(stage1.songPool, pickedIds);

  group.songs.push({
    songId: randomSong,
    difficultyIndex: getConfiguredDifficulty(stage1, randomSong),
    pickType: 'random',
    pickedBy: null,
    p1Score: null,
    p2Score: null,
    order: group.songs.length
  });

  tournament.operationLogs.push({
    action: 'random_song_drawn',
    stage: 'stage1',
    detail: {
      groupIndex: stage1.currentGroupIndex,
      songId: randomSong.toString(),
      excludedSongIds: pickedIds
    },
    operatedAt: new Date()
  });

  return randomSong;
}

/**
 * 判定组内胜负
 */
async function _determineGroupWinner(group) {
  const p1Scores = group.songs.map(s => s.p1Score);
  const p2Scores = group.songs.map(s => s.p2Score);

  const result = determineWinner(p1Scores, p2Scores);

  if (result === 'p1') {
    group.winner = group.p1;
    group.needTiebreak = false;
  } else if (result === 'p2') {
    group.winner = group.p2;
    group.needTiebreak = false;
  } else {
    group.needTiebreak = true;
    group.winner = null;
  }
}

/**
 * 当前组已结束后，自动打开下一组；最后一组结束时完成阶段一。
 * 这样前端无需额外点击“推进”，避免 currentGroupIndex 停留在已完成组导致后续组灰置。
 */
async function _advanceCompletedGroup(tournament, stage1) {
  const currentIdx = stage1.currentGroupIndex;
  const group = stage1.groups[currentIdx];
  if (!group) throw new Error('无进行中的组');
  if (group.status !== 'done') throw new Error('当前组尚未完成');

  const nextIdx = currentIdx + 1;

  if (nextIdx >= stage1.groups.length) {
    const unresolved = stage1.groups
      .map((g, i) => ({ i, ok: !!g.winner }))
      .filter(x => !x.ok);

    if (unresolved.length > 0) {
      await tournament.save();
      broadcast('match_finished', {
        type: 'group',
        groupIndex: currentIdx,
        winnerId: group.winner ? group.winner.toString() : null,
        needTiebreak: !!group.needTiebreak,
        unresolvedGroups: unresolved.map(x => x.i)
      });
      return {
        nextStep: 'group_done_need_tiebreak',
        groupIndex: currentIdx,
        unresolvedGroups: unresolved.map(x => x.i)
      };
    }

    return _completeStage1(tournament, stage1);
  }

  stage1.currentGroupIndex = nextIdx;
  const nextGroup = stage1.groups[nextIdx];
  if (nextGroup.status === 'pending') _startGroupReveal(nextGroup);

  await tournament.save();

  broadcast('match_finished', {
    type: 'group',
    groupIndex: currentIdx,
    winnerId: group.winner ? group.winner.toString() : null,
    needTiebreak: !!group.needTiebreak,
    nextGroupIndex: nextIdx
  });

  broadcast('group_reveal_started', {
    stage: 'stage1',
    groupIndex: nextIdx,
    revealEndsAt: nextGroup.revealEndsAt,
    p1: nextGroup.p1.toString(),
    p2: nextGroup.p2.toString()
  });

  return { nextStep: 'next_group', groupIndex: nextIdx };
}

async function _completeStage1(tournament, stage1) {
  // 所有组完成
  stage1.status = 'done';

  // 收集晋级者
  const qualifiers = stage1.groups.map(g => g.winner).filter(Boolean);

  tournament.qualifiedStage1 = qualifiers;
  // P1-8: 阶段一完成后自动推进到 stage2
  tournament.status = 'stage2';

  await tournament.save();

  // 旧赛事同步：回写 groups + matches
  await syncToOldTournament(tournament, 'stage1_complete', {
    groups: stage1.groups.map(g => ({
      order: g.order,
      p1: g.p1,
      p2: g.p2,
      winner: g.winner
    })),
    operatedBy: null
  });

  broadcast('stage_advanced', {
    stage: 'stage1',
    phase: 'completed',
    qualifiedIds: qualifiers.map(q => q.toString()),
    nextStage: 'stage2'
  });

  return { nextStep: 'stage_done', qualifiedIds: qualifiers };
}

/**
 * 推进：到下一选曲阶段 / 下一组 / 阶段结束
 */
async function advance(tournament) {
  const stage1 = tournament.stage1;
  const group = stage1.groups[stage1.currentGroupIndex];

  if (!group) throw new Error('无进行中的组');

  // 如果当前组未结束但需要推进（裁判手动推进随机选曲等）
  if (group.status !== 'done') {
    // P0-3: advance 也必须校验上一曲成绩完整
    if (group.songs.length > 0) {
      const lastSong = group.songs[group.songs.length - 1];
      if (!lastSong.p1Score || !lastSong.p2Score) {
        throw new Error('当前歌曲成绩未完整录入（需P1+P2均存在）');
      }
    }

    if (group.status === 'random_pick' && group.songs.length === 2) {
      const randomSong = await _systemRandomPick(tournament, group, stage1);
      group.status = 'playing';
      await tournament.save();
      broadcast('song_drawn', {
        stage: 'stage1',
        groupIndex: stage1.currentGroupIndex,
        songId: randomSong.toString(),
        pickType: 'random'
      });
      return {
        nextStep: 'random_pick',
        groupIndex: stage1.currentGroupIndex,
        songId: randomSong.toString(),
        difficultyIndex: getConfiguredDifficulty(stage1, randomSong)
      };
    }

    throw new Error('当前组尚未完成');
  }

  return _advanceCompletedGroup(tournament, stage1);
}

/**
 * 选手弃权
 */
async function forfeitPlayer(tournament, playerId) {
  const stage1 = tournament.stage1;
  const group = stage1.groups[stage1.currentGroupIndex];
  if (!group) throw new Error('无进行中的组');
  if (group.status === 'done') throw new Error('当前组已结束，不能再标记弃权');
  if (!playerId) throw new Error('需指定弃权选手');

  const pidStr = playerId.toString();
  if (group.p1.toString() !== pidStr && group.p2.toString() !== pidStr) {
    throw new Error('该选手不在当前组');
  }

  group.forfait = group.p1.toString() === pidStr ? group.p1 : group.p2;
  group.winner = group.p1.toString() === pidStr ? group.p2 : group.p1;
  group.status = 'done';
  group.needTiebreak = false;
  await tournament.save();
  broadcast('match_finished', {
    type: 'group',
    groupIndex: stage1.currentGroupIndex,
    winnerId: group.winner.toString(),
    forfaitBy: pidStr,
    awaitingNextGroup: true
  });

  const result = { nextStep: 'group_complete_waiting', groupIndex: stage1.currentGroupIndex };

  return { group, result, forfaitBy: pidStr };
}

/**
 * 修复 #4：裁判加赛判定 —— 解决三项全平的组
 * 线下进行加赛后，由裁判录入胜者；对池耗尽 / 反复平局等情况均稳健。
 * @param {object} tournament
 * @param {number} groupIndex
 * @param {string} winnerId - 必须是该组 p1 或 p2
 */
async function resolveGroupTie(tournament, groupIndex, winnerId) {
  const stage1 = tournament.stage1;
  if (!stage1) throw new Error('阶段一未初始化');
  const group = stage1.groups[groupIndex];
  if (!group) throw new Error('无效的组索引');
  if (group.winner) throw new Error('该组已决出胜者，无需加赛');
  if (!group.needTiebreak || group.status !== 'done') throw new Error('该组当前不处于加赛判定状态');

  const wid = String(winnerId);
  const p1 = String(group.p1);
  const p2 = String(group.p2);
  if (wid !== p1 && wid !== p2) throw new Error('加赛胜者必须是该组双方之一');

  group.winner = wid === p1 ? group.p1 : group.p2;
  group.needTiebreak = false;
  group.status = 'done';

  await tournament.save();
  broadcast('match_finished', {
    type: 'group',
    groupIndex,
    winnerId: String(group.winner),
    resolvedByTiebreak: true,
    awaitingNextGroup: groupIndex === stage1.currentGroupIndex
  });

  return group;
}

module.exports = {
  initStage1,
  startFirstGroup,
  selectSong,
  submitScore,
  advance,
  forfeitPlayer,
  resolveGroupTie,
  completeGroupReveal
};
