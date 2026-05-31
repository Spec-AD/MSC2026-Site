/**
 * MSC 2026 阶段一：12进6
 * 随机分组 → 回合制选曲 → 裁判成绩录入 → 晋级判定
 *
 * b1.7.11.patch-02
 * - P0-3: 强制P1/P2成绩均完整后才推进
 * - P1-8: 阶段完成自动推进 status → stage2
 * - 旧赛事同步：全部组完成时回写 groups/matches
 */

const { shuffle, validateScore, determineWinner } = require('./utils');
const { broadcast } = require('./ssePool');
const { syncToOldTournament } = require('./oldTournamentSync');

/**
 * 初始化12进6分组
 */
async function initStage1(tournament, playerIds, songPoolIds) {
  if (!playerIds || playerIds.length !== 12) {
    throw new Error('需要恰好12名选手');
  }
  if (!songPoolIds || songPoolIds.length < 3) {
    throw new Error('图池至少需要3首歌');
  }

  const shuffled = shuffle(playerIds);
  const groups = [];

  // 两两配对
  for (let i = 0; i < 6; i++) {
    const p1 = shuffled[i * 2];
    const p2 = shuffled[i * 2 + 1];
    // 随机分配 P1/P2
    const swap = Math.random() < 0.5;
    groups.push({
      order: i,
      p1: swap ? p2 : p1,
      p2: swap ? p1 : p2,
      songs: [],
      status: 'pending',
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
  group.status = 'p1_pick';

  await tournament.save();

  broadcast('turn_change', {
    stage: 'stage1',
    groupIndex: 0,
    phase: 'p1_pick',
    currentPicker: group.p1.toString()
  });
}

/**
 * 选手选曲
 */
async function selectSong(tournament, userId, songId) {
  const stage1 = tournament.stage1;
  if (stage1.status !== 'playing') {
    throw new Error('当前不在比赛阶段');
  }

  const group = stage1.groups[stage1.currentGroupIndex];
  if (!group) throw new Error('无效的组索引');

  const userIdStr = userId.toString();

  // 确定当前选曲阶段和选曲者
  if (group.status === 'p1_pick') {
    if (group.p1.toString() !== userIdStr) throw new Error('当前是 P1 的选曲回合');
    // 校验曲目在图池中且未在当前组被选过
    if (!stage1.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (group.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被本轮选择');
    }

    group.songs.push({
      songId,
      pickType: 'p1_pick',
      pickedBy: userId,
      p1Score: null,
      p2Score: null,
      order: group.songs.length
    });
    group.status = 'playing';
  } else if (group.status === 'p2_pick') {
    if (group.p2.toString() !== userIdStr) throw new Error('当前是 P2 的选曲回合');
    if (!stage1.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (group.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被本轮选择');
    }

    group.songs.push({
      songId,
      pickType: 'p2_pick',
      pickedBy: userId,
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

  // 校验并写入成绩
  if (body.p1Score) {
    const errs = validateScore(body.p1Score);
    if (errs.length) throw new Error(`P1成绩校验失败: ${errs.join('; ')}`);
    lastSong.p1Score = {
      achievement: body.p1Score.achievement,
      dxScore: body.p1Score.dxScore,
      perfectRate: body.p1Score.perfectRate,
      recordedBy: userId,
      recordedAt: new Date(),
      locked: true
    };
  }
  if (body.p2Score) {
    const errs = validateScore(body.p2Score);
    if (errs.length) throw new Error(`P2成绩校验失败: ${errs.join('; ')}`);
    lastSong.p2Score = {
      achievement: body.p2Score.achievement,
      dxScore: body.p2Score.dxScore,
      perfectRate: body.p2Score.perfectRate,
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
    // P2 选曲成绩录入完毕 → 系统随机选曲
    await _systemRandomPick(tournament, group, stage1);
    group.status = 'playing'; // 等待记录成绩
  } else if (songCount === 3 && lastSong.pickType === 'random') {
    // 随机曲成绩录入完毕 → 判定胜负 → 组结束
    await _determineGroupWinner(group);
    group.status = 'done';
  }

  await tournament.save();

  broadcast('score_updated', {
    stage: 'stage1',
    groupIndex: stage1.currentGroupIndex,
    songIndex: lastSong.order,
    groupStatus: group.status
  });

  return { group, nextStep: group.status };
}

/**
 * 系统随机选曲
 */
async function _systemRandomPick(tournament, group, stage1) {
  const pickedIds = group.songs.map(s => s.songId.toString());
  const available = stage1.songPool.filter(s => !pickedIds.includes(s.toString()));
  if (available.length === 0) throw new Error('图池已无可用曲目');

  const randomSong = available[Math.floor(Math.random() * available.length)];

  group.songs.push({
    songId: randomSong,
    pickType: 'random',
    pickedBy: null,
    p1Score: null,
    p2Score: null,
    order: group.songs.length
  });
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
 * 推进：到下一选曲阶段 / 下一组 / 阶段结束
 */
async function advance(tournament) {
  const stage1 = tournament.stage1;
  const group = stage1.groups[stage1.currentGroupIndex];

  if (!group) throw new Error('无进行中的组');

  // 如果当前组未结束但需要推进（裁判手动推进随机选曲等）
  if (group.status !== 'done') {
    // P0-3: advance 也必须校验上一曲成绩完整
  if (group.status === 'playing' && group.songs.length > 0) {
    const lastSong = group.songs[group.songs.length - 1];
    if (!lastSong.p1Score || !lastSong.p2Score) {
      throw new Error('当前歌曲成绩未完整录入（需P1+P2均存在）');
    }
  }
  // 自动处理推进逻辑
  if (group.status === 'playing' && group.songs.length === 2) {
    await _systemRandomPick(tournament, group, stage1);
    await tournament.save();
    return { nextStep: 'random_pick', groupIndex: stage1.currentGroupIndex };
  }
    throw new Error('当前组尚未完成');
  }

  // 当前组完成，推进到下一组
  const nextIdx = stage1.currentGroupIndex + 1;

  if (nextIdx >= 6) {
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

  // 推进到下一组
  stage1.currentGroupIndex = nextIdx;
  const nextGroup = stage1.groups[nextIdx];
  nextGroup.status = 'p1_pick';

  await tournament.save();

  broadcast('turn_change', {
    stage: 'stage1',
    groupIndex: nextIdx,
    phase: 'p1_pick',
    currentPicker: nextGroup.p1.toString()
  });

  return { nextStep: 'next_group', groupIndex: nextIdx };
}

/**
 * 选手弃权
 */
async function forfeitPlayer(tournament, playerId) {
  const stage1 = tournament.stage1;
  const group = stage1.groups[stage1.currentGroupIndex];
  if (!group) throw new Error('无进行中的组');

  const pidStr = playerId.toString();
  if (group.p1.toString() !== pidStr && group.p2.toString() !== pidStr) {
    throw new Error('该选手不在当前组');
  }

  group.forfait = group.p1.toString() === pidStr ? group.p1 : group.p2;
  group.winner = group.p1.toString() === pidStr ? group.p2 : group.p1;
  group.status = 'done';

  await tournament.save();

  broadcast('match_finished', {
    type: 'group',
    groupIndex: stage1.currentGroupIndex,
    winnerId: group.winner.toString(),
    forfaitBy: pidStr
  });

  return group;
}

module.exports = {
  initStage1,
  startFirstGroup,
  selectSong,
  submitScore,
  advance,
  forfeitPlayer
};
