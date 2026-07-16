/**
 * MSC 2026 阶段四：决赛（2进1）
 * 回合制选曲 → 裁判成绩录入 → 总成绩判定
 *
 * b1.7.11.patch-02
 *
 * patch-02 修复：
 * - P0-3: 强制P1/P2成绩均完整后才推进
 * - P1-7: advance() 推进前验证上一曲成绩完整
 * - P1-8: 决赛结束后设置 tournament.status = 'finished'
 */

const { shuffle, validateScore, normalizeScoreInput, determineWinner, assertObjectIdList } = require('./utils');
const { broadcast } = require('./ssePool');
const { syncToOldTournament } = require('./oldTournamentSync');
const { assertScoreTarget } = require('./scoreTarget');
const { drawRandomSong } = require('./randomSongDraw');

/**
 * 初始化决赛
 */
async function initStage4(tournament, playerIds, songPoolIds, designatedSongId) {
  playerIds = assertObjectIdList(playerIds, 2, '决赛选手');
  songPoolIds = assertObjectIdList(songPoolIds || [], null, '决赛图池');
  if (songPoolIds.length < 3) {
    throw new Error('决赛图池至少需要 3 首歌');
  }
  if (!designatedSongId) {
    throw new Error('需要指定课题曲');
  }
  const [normalizedDesignatedSongId] = assertObjectIdList([designatedSongId], 1, '课题曲');
  if (songPoolIds.includes(normalizedDesignatedSongId)) {
    throw new Error('课题曲不能同时出现在决赛可选图池中');
  }

  // 随机抽签 P1/P2
  const shuffled = shuffle(playerIds);

  tournament.stage4 = {
    p1: shuffled[0],
    p2: shuffled[1],
    songPool: songPoolIds,
    designatedSongId: normalizedDesignatedSongId,
    songs: [],
    status: 'p1_pick',
    winner: null,
    needTiebreak: false
  };

  await tournament.save();

  broadcast('stage_advanced', {
    from: tournament.status,
    to: 'stage4',
    timestamp: Date.now()
  });

  broadcast('turn_change', {
    stage: 'stage4',
    phase: 'p1_pick',
    currentPicker: shuffled[0].toString()
  });

  return tournament.stage4;
}

/**
 * 选手选曲
 */
async function selectSong(tournament, targetPlayerId, songId) {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');

  // MSC 现场由 ADM/TO/CHM 代理操作，选曲归属由当前阶段自动确定。
  if (s4.status === 'p1_pick') {
    if (!s4.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (s4.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被选择');
    }

    s4.songs.push({
      songId,
      pickType: 'p1_pick',
      pickedBy: s4.p1,
      p1Score: null,
      p2Score: null,
      order: s4.songs.length
    });
    s4.status = 'playing';
  } else if (s4.status === 'p2_pick') {
    if (!s4.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (s4.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被选择');
    }

    s4.songs.push({
      songId,
      pickType: 'p2_pick',
      pickedBy: s4.p2,
      p1Score: null,
      p2Score: null,
      order: s4.songs.length
    });
    s4.status = 'playing';
  } else {
    throw new Error('当前不是选曲阶段');
  }

  await tournament.save();

  broadcast('score_updated', {
    stage: 'stage4',
    songIndex: s4.songs.length - 1,
    pickType: s4.songs[s4.songs.length - 1].pickType
  });

  return { stage4: s4, nextStep: 'waiting_play_result' };
}

/**
 * 裁判提交成绩
 * P0-3: 强制P1/P2成绩均完整后才推进
 */
async function submitScore(tournament, userId, body) {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');
  if (s4.status !== 'playing') throw new Error('当前不在等待成绩状态');

  const lastSong = s4.songs[s4.songs.length - 1];
  if (!lastSong) throw new Error('未找到待录入曲目');
  assertScoreTarget(body, lastSong);

  if (body.p1Score) {
    const p1Score = normalizeScoreInput(body.p1Score);
    const errs = validateScore(p1Score);
    if (errs.length) throw new Error(`P1成绩校验失败: ${errs.join('; ')}`);
    lastSong.p1Score = {
      achievement: p1Score.achievement,
      dxScore: p1Score.dxScore,
      perfectRate: p1Score.perfectRate,
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
      perfectRate: p2Score.perfectRate,
      recordedBy: userId,
      recordedAt: new Date(),
      locked: true
    };
  }

  // P0-3: 检查P1/P2成绩均存在
  if (!lastSong.p1Score || !lastSong.p2Score) {
    await tournament.save();
    return { stage4: s4, nextStep: 'waiting_more_scores' };
  }

  const waitingForManualRandom = s4.songs.length === 2 && lastSong.pickType === 'p2_pick';
  if (waitingForManualRandom) s4.status = 'random_pick';

  broadcast('score_updated', {
    stage: 'stage4',
    songIndex: lastSong.order,
    p1Score: lastSong.p1Score,
    p2Score: lastSong.p2Score,
    phase: waitingForManualRandom ? 'random_pick' : s4.status
  });

  await tournament.save();

  return {
    stage4: s4,
    nextStep: waitingForManualRandom ? 'manual_random_pick' : 'advance'
  };
}

/**
 * 推进：下一选曲阶段 / 系统随机 / 课题曲 / 结束
 * P1-7: 每个 advance 分支前校验上一曲成绩完整
 */
async function advance(tournament) {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');

  // P1-7: 校验上一曲成绩完整
  if (s4.songs.length > 0) {
    const lastSong = s4.songs[s4.songs.length - 1];
    if (!lastSong.p1Score || !lastSong.p2Score) {
      throw new Error('当前歌曲成绩未完整录入（需P1+P2均存在）');
    }
  }

  const songCount = s4.songs.length;

  if (songCount === 1 && s4.songs[0].pickType === 'p1_pick') {
    // P1选曲成绩录入完毕 → P2 选曲
    s4.status = 'p2_pick';
    await tournament.save();

    broadcast('turn_change', {
      stage: 'stage4',
      phase: 'p2_pick',
      currentPicker: s4.p2.toString()
    });

    return { nextStep: 'p2_pick', currentPicker: s4.p2.toString() };
  }

  if (songCount === 2 && s4.songs[1].pickType === 'p2_pick' && s4.status === 'random_pick') {
    // P2选曲成绩录入完毕 → 裁判手动触发系统随机
    const randomSong = await _systemRandomPick(tournament, s4);
    s4.status = 'playing';
    await tournament.save();

    broadcast('song_drawn', {
      stage: 'stage4',
      songId: randomSong.toString(),
      pickType: 'random'
    });
    broadcast('turn_change', {
      stage: 'stage4',
      phase: 'random_pick',
      songId: randomSong.toString()
    });

    return { nextStep: 'random_pick', song: s4.songs[2] };
  }

  if (songCount === 3 && s4.songs[2].pickType === 'random') {
    // 三首完成 → 课题曲
    s4.songs.push({
      songId: s4.designatedSongId,
      pickType: 'designated',
      pickedBy: null,
      p1Score: null,
      p2Score: null,
      order: 3
    });
    s4.status = 'playing';
    await tournament.save();

    broadcast('turn_change', {
      stage: 'stage4',
      phase: 'designated_pick'
    });

    return { nextStep: 'designated_pick', designatedSongId: s4.designatedSongId.toString() };
  }

  if (songCount === 4 && s4.songs[3].pickType === 'designated') {
    // 四首全部完成 → 判定胜负
    const p1Scores = s4.songs.map(s => s.p1Score);
    const p2Scores = s4.songs.map(s => s.p2Score);
    const p1Total = p1Scores.reduce((a, s) => a + (s ? s.achievement : 0), 0);
    const p2Total = p2Scores.reduce((a, s) => a + (s ? s.achievement : 0), 0);

    const result = determineWinner(p1Scores, p2Scores);

    // 修复 #4：平局绝不能直接 finished + 写空冠军，应保留可加赛状态等待裁判 resolveTie。
    if (result === 'tie') {
      s4.needTiebreak = true;
      s4.winner = null;
      s4.status = 'done';
      await tournament.save();

      broadcast('match_finished', {
        type: 'final',
        winnerId: null,
        needTiebreak: true,
        p1Total,
        p2Total
      });

      return {
        nextStep: 'need_tiebreak',
        needTiebreak: true,
        p1Total: p1Total.toFixed(4),
        p2Total: p2Total.toFixed(4)
      };
    }

    const winner = result === 'p1' ? s4.p1 : s4.p2;
    await _finalizeFinal(tournament, s4, winner);

    return {
      nextStep: 'match_done',
      winner: String(winner),
      p1Total: p1Total.toFixed(4),
      p2Total: p2Total.toFixed(4)
    };
  }

  throw new Error('无法识别的推进状态');
}

/**
 * 修复 #4/#8：决赛收尾 —— 设冠军 + 赛事 finished + 回写旧赛事（含三四名）
 */
async function _finalizeFinal(tournament, s4, winner) {
  s4.winner = winner;
  s4.needTiebreak = false;
  s4.status = 'done';
  tournament.status = 'finished';
  await tournament.save();

  const runnerUp = String(winner) === String(s4.p1) ? s4.p2 : s4.p1;

  // 修复 #8：三四名 = 阶段三未晋级决赛的两位（按跑图排名取前二）
  let semiFinalists = [];
  try {
    if (tournament.stage3 && Array.isArray(tournament.stage3.players) && tournament.stage3.players.length) {
      const { calculateRaceRankings } = require('./utils');
      const finalists = new Set([String(s4.p1), String(s4.p2)]);
      semiFinalists = calculateRaceRankings(tournament.stage3.players)
        .map(r => String(r.userId))
        .filter(uid => !finalists.has(uid))
        .slice(0, 2);
    }
  } catch { /* 三四名计算失败不阻塞收尾 */ }

  await syncToOldTournament(tournament, 'stage4_complete', {
    winner: String(winner),
    runnerUp: runnerUp ? String(runnerUp) : null,
    semiFinalists,
    operatedBy: null
  });

  broadcast('match_finished', { type: 'final', winnerId: String(winner), needTiebreak: false });
  broadcast('stage_advanced', { from: 'stage4', to: 'finished', timestamp: Date.now() });
}

/**
 * 修复 #4：裁判加赛判定 —— 决赛四曲全平后，线下加赛由裁判录入胜者
 */
async function resolveTie(tournament, winnerId) {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');
  if (!s4.needTiebreak) throw new Error('决赛当前无需加赛');

  const wid = String(winnerId);
  if (wid !== String(s4.p1) && wid !== String(s4.p2)) {
    throw new Error('加赛胜者必须是决赛双方之一');
  }
  const winner = wid === String(s4.p1) ? s4.p1 : s4.p2;
  await _finalizeFinal(tournament, s4, winner);
  return { winner: String(winner) };
}

async function _systemRandomPick(tournament, s4) {
  const pickedIds = s4.songs.map(s => s.songId.toString());
  const excludedSongIds = [...pickedIds, s4.designatedSongId.toString()];
  const randomSong = drawRandomSong(s4.songPool, excludedSongIds);

  s4.songs.push({
    songId: randomSong,
    pickType: 'random',
    pickedBy: null,
    p1Score: null,
    p2Score: null,
    order: 2
  });

  tournament.operationLogs.push({
    action: 'random_song_drawn',
    stage: 'stage4',
    detail: {
      songId: randomSong.toString(),
      excludedSongIds
    },
    operatedAt: new Date()
  });

  return randomSong;
}

module.exports = {
  initStage4,
  selectSong,
  submitScore,
  advance,
  resolveTie
};
