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

const { shuffle, validateScore, determineWinner } = require('./utils');
const { broadcast } = require('./ssePool');
const { syncToOldTournament } = require('./oldTournamentSync');

/**
 * 初始化决赛
 */
async function initStage4(tournament, playerIds, songPoolIds, designatedSongId) {
  if (!playerIds || playerIds.length !== 2) {
    throw new Error('决赛需要恰好 2 名选手');
  }
  if (!songPoolIds || songPoolIds.length < 3) {
    throw new Error('决赛图池至少需要 3 首歌');
  }
  if (!designatedSongId) {
    throw new Error('需要指定课题曲');
  }

  // 随机抽签 P1/P2
  const shuffled = shuffle(playerIds);

  tournament.stage4 = {
    p1: shuffled[0],
    p2: shuffled[1],
    songPool: songPoolIds,
    designatedSongId,
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
async function selectSong(tournament, userId, songId) {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');

  const userIdStr = userId.toString();

  if (s4.status === 'p1_pick') {
    if (s4.p1.toString() !== userIdStr) throw new Error('当前是 P1 的选曲回合');
    if (!s4.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (s4.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被选择');
    }

    s4.songs.push({
      songId,
      pickType: 'p1_pick',
      pickedBy: userId,
      p1Score: null,
      p2Score: null,
      order: s4.songs.length
    });
    s4.status = 'playing';
  } else if (s4.status === 'p2_pick') {
    if (s4.p2.toString() !== userIdStr) throw new Error('当前是 P2 的选曲回合');
    if (!s4.songPool.some(s => s.toString() === songId.toString())) {
      throw new Error('该曲目不在图池中');
    }
    if (s4.songs.some(s => s.songId.toString() === songId.toString())) {
      throw new Error('该曲目已被选择');
    }

    s4.songs.push({
      songId,
      pickType: 'p2_pick',
      pickedBy: userId,
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

  // P0-3: 检查P1/P2成绩均存在
  if (!lastSong.p1Score || !lastSong.p2Score) {
    await tournament.save();
    return { stage4: s4, nextStep: 'waiting_more_scores' };
  }

  broadcast('score_updated', {
    stage: 'stage4',
    songIndex: lastSong.order,
    p1Score: lastSong.p1Score,
    p2Score: lastSong.p2Score
  });

  await tournament.save();

  return { stage4: s4, nextStep: 'advance' };
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

  if (songCount === 2 && s4.songs[1].pickType === 'p2_pick') {
    // P2选曲成绩录入完毕 → 系统随机
    await _systemRandomPick(tournament, s4);
    s4.status = 'playing';
    await tournament.save();

    broadcast('turn_change', {
      stage: 'stage4',
      phase: 'random_pick'
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

    const result = determineWinner(p1Scores, p2Scores);

    let winner = null;
    if (result === 'p1') winner = s4.p1;
    else if (result === 'p2') winner = s4.p2;
    else s4.needTiebreak = true;

    s4.winner = winner;
    s4.status = 'done';

    // P1-8: 设置赛事状态为 finished
    tournament.status = 'finished';

    await tournament.save();

    // 旧赛事同步：回写 results + status=finished
    const runnerUp = winner ? (String(winner) === String(s4.p1) ? s4.p2 : s4.p1) : null;
    await syncToOldTournament(tournament, 'stage4_complete', {
      winner: winner ? String(winner) : null,
      runnerUp: runnerUp ? String(runnerUp) : null,
      operatedBy: null
    });

    broadcast('match_finished', {
      type: 'final',
      winnerId: winner ? winner.toString() : null,
      needTiebreak: s4.needTiebreak,
      p1Total: p1Scores.reduce((a, s) => a + (s ? s.achievement : 0), 0),
      p2Total: p2Scores.reduce((a, s) => a + (s ? s.achievement : 0), 0)
    });

    broadcast('stage_advanced', {
      from: 'stage4',
      to: 'finished',
      timestamp: Date.now()
    });

    return {
      nextStep: 'match_done',
      winner: winner ? winner.toString() : null,
      p1Total: p1Scores.reduce((a, s) => a + (s ? s.achievement : 0), 0).toFixed(4),
      p2Total: p2Scores.reduce((a, s) => a + (s ? s.achievement : 0), 0).toFixed(4)
    };
  }

  throw new Error('无法识别的推进状态');
}

async function _systemRandomPick(tournament, s4) {
  const pickedIds = s4.songs.map(s => s.songId.toString());
  // 课题曲不在可选范围内
  const available = s4.songPool.filter(
    s => !pickedIds.includes(s.toString()) && s.toString() !== s4.designatedSongId.toString()
  );
  if (available.length === 0) throw new Error('图池无可用曲目');

  const randomSong = available[Math.floor(Math.random() * available.length)];

  s4.songs.push({
    songId: randomSong,
    pickType: 'random',
    pickedBy: null,
    p1Score: null,
    p2Score: null,
    order: 2
  });
}

module.exports = {
  initStage4,
  selectSong,
  submitScore,
  advance
};
