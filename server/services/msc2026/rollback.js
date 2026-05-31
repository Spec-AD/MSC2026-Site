/**
 * MSC 2026 — 回退服务
 * b1.7.11.patch-02
 *
 * 每个可逆操作提供对应的撤销逆操作（reverse action）。
 * 所有函数直接操作 tournament 文档，调用方负责 tournament.save()。
 */

const { broadcast } = require('./ssePool');
const { getItem } = require('./itemDefinitions');
const { syncToOldTournament } = require('./oldTournamentSync');

// ═══════════════════════════════════════════════
// 阶段一 回退
// ═══════════════════════════════════════════════

/** R1.1 撤销最后选曲 */
function undoStage1LastSong(tournament) {
  const s1 = tournament.stage1;
  if (!s1) throw new Error('阶段一未初始化');
  const group = s1.groups[s1.currentGroupIndex];
  if (!group) throw new Error('无进行中的组');
  const lastSong = group.songs[group.songs.length - 1];
  if (!lastSong) throw new Error('无选曲可撤销');

  // 有成绩时拒绝（必须先撤销成绩）
  if (lastSong.p1Score || lastSong.p2Score) {
    throw new Error('该曲目已有成绩，请先撤销成绩');
  }

  group.songs.pop();

  // 恢复选曲阶段
  if (lastSong.pickType === 'p1_pick') group.status = 'p1_pick';
  else if (lastSong.pickType === 'p2_pick') group.status = 'p2_pick';
  else group.status = 'playing';
}

/** R1.2 撤销最后成绩（P0） */
function undoStage1LastScore(tournament, player = 'both') {
  const s1 = tournament.stage1;
  if (!s1) throw new Error('阶段一未初始化');
  const group = s1.groups[s1.currentGroupIndex];
  if (!group) throw new Error('无进行中的组');
  const lastSong = group.songs[group.songs.length - 1];
  if (!lastSong) throw new Error('无成绩可撤销');

  if (player === 'p1' || player === 'both') lastSong.p1Score = null;
  if (player === 'p2' || player === 'both') lastSong.p2Score = null;

  // 回到 playing 状态，重新等裁判录入
  group.status = 'playing';
}

/** R1.3 回退到指定组 */
function revertStage1Group(tournament, groupIdx) {
  const s1 = tournament.stage1;
  if (!s1) throw new Error('阶段一未初始化');
  if (groupIdx < 0 || groupIdx >= s1.groups.length) throw new Error('无效的组序号');

  const targetGroup = s1.groups[groupIdx];
  targetGroup.status = 'playing';
  targetGroup.winner = null;
  targetGroup.forfait = null;
  targetGroup.needTiebreak = false;
  s1.currentGroupIndex = groupIdx;
  s1.status = 'playing';
}

/** R1.4 重置阶段一 */
function resetStage1(tournament) {
  tournament.stage1 = null;
  // qualifiedStage1 保留（从预选赛来的晋级选手不变）
}

// ═══════════════════════════════════════════════
// 跑图阶段 回退
// ═══════════════════════════════════════════════

/** R2.1 撤销最后跑图行动（P0） */
function undoRaceLastAction(race) {
  const lastLog = race.actionLog[race.actionLog.length - 1];
  if (!lastLog) throw new Error('无行动可撤销');

  const player = race.players.find(p => p.userId.toString() === lastLog.playerId.toString());
  if (!player) throw new Error('选手数据异常');

  switch (lastLog.actionType) {

    case 'advance': {
      // 移除最后一条挑战记录
      const lastChallenge = race.challengeHistory.pop();
      if (!lastChallenge) throw new Error('无挑战记录可撤销');

      // 恢复任务到池中
      race.taskPool.remaining.push(lastChallenge.taskId);
      const usedIdx = race.taskPool.used.indexOf(lastChallenge.taskId);
      if (usedIdx >= 0) race.taskPool.used.splice(usedIdx, 1);

      // 如果已判定为通过，回退层数
      if (lastChallenge.passed === true) {
        player.currentLayer = Math.max(0, player.currentLayer - 1);
      }

      // 恢复 armed 道具为未使用状态
      for (const ref of (lastChallenge.usedItemRefs || [])) {
        const item = player.items.find(i => i.itemRef === ref && i.status === 'consumed');
        if (item) item.status = 'unused';
      }
      break;
    }

    case 'pickup': {
      const detail = lastLog.detail || {};
      // 从选手背包移除该道具
      const itemIdx = player.items.findIndex(i => i.itemRef === detail.itemRef && i.status === 'unused');
      if (itemIdx >= 0) player.items.splice(itemIdx, 1);
      else {
        // 如果已 armed/consumed，只回 status
        const item = player.items.find(i => i.itemRef === detail.itemRef);
        if (item) item.status = 'unused';
      }
      // 放回地图
      const mapItem = race.itemsOnMap.find(
        i => i.itemRef === detail.itemRef && i.zoneIndex === detail.zoneIndex && i.collected
      );
      if (mapItem) mapItem.collected = false;
      break;
    }

    case 'challenge_passed':
    case 'challenge_failed':
      undoRaceLastChallengeResult(race);
      // 上面的函数已经 pop 了 actionLog，这里无需再处理
      return;

    case 'skip_timeout':
    case 'skip_manual':
      // 超时/手动跳过 → 只能回退回合指针
      break;

    default:
      throw new Error(`不支持撤销的操作: ${lastLog.actionType}`);
  }

  race.actionLog.pop();

  // 回退回合指针
  race.currentPlayerIndex = (race.currentPlayerIndex - 1 + race.players.length) % race.players.length;
  race.currentTurn = Math.max(0, race.currentTurn - 1);
  race.turnStartedAt = new Date();
}

/** R2.2 撤销道具使用 */
function undoRaceItemUse(race, itemRef) {
  const player = race.players[race.currentPlayerIndex];
  if (!player) throw new Error('无当前选手');

  const item = player.items.find(i => i.itemRef === itemRef);
  if (!item) throw new Error('选手未持有该道具');

  if (item.status === 'armed' || item.status === 'consumed') {
    item.status = 'unused';
  } else {
    throw new Error('该道具未被使用');
  }

  // 如果道具触发了 globalEffect，清除
  if (race.globalEffect && race.globalEffect.sourceItemRef === itemRef) {
    race.globalEffect = { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null };
  }
}

/** R2.3 翻转挑战判定（P0） */
function undoRaceLastChallengeResult(race) {
  const lastChallenge = [...race.challengeHistory].reverse().find(ch => ch.passed !== null);
  if (!lastChallenge) throw new Error('无已判定的挑战');

  const player = race.players.find(p => p.userId.toString() === lastChallenge.playerId.toString());
  if (!player) throw new Error('选手数据异常');

  // 翻转判定
  const wasPassed = lastChallenge.passed;

  if (wasPassed) {
    // true→false: 选手弹回
    player.currentLayer = Math.max(0, player.currentLayer - 1);
    // 应用双面道具惩罚
    for (const ref of (lastChallenge.usedItemRefs || [])) {
      const def = getItem(ref);
      if (def && def.penalty) {
        const p = def.penalty;
        if (p.silentTurns) player.silentUntilTurn = Math.max(player.silentUntilTurn || 0, race.currentTurn + p.silentTurns);
        if (p.disableItemsTurns) player.disableItemsUntilTurn = Math.max(player.disableItemsUntilTurn || 0, race.currentTurn + p.disableItemsTurns);
        if (p.backToLayer0) player.currentLayer = 0;
      }
    }
  } else {
    // false→true: 移除惩罚（恢复 silent/disable 到原来状态），前进一层
    player.silentUntilTurn = null;
    player.disableItemsUntilTurn = null;
    player.currentLayer++;
  }

  // 从 challengeHistory 移除最后一条 actionLog 记录
  const relatedLogIdx = race.actionLog.findLastIndex(
    log => log.playerId.toString() === lastChallenge.playerId.toString() &&
           (log.actionType === 'challenge_passed' || log.actionType === 'challenge_failed')
  );
  if (relatedLogIdx >= 0) race.actionLog.splice(relatedLogIdx, 1);

  // 重置挑战状态为待判定
  lastChallenge.passed = null;
  lastChallenge.judgedBy = null;
  lastChallenge.judgedAt = null;

  // 清除 finishOrder（如果到达终点被撤回）
  const finishIdx = race.finishOrder.findIndex(
    f => f.userId.toString() === player.userId.toString()
  );
  if (finishIdx >= 0 && wasPassed) {
    race.finishOrder.splice(finishIdx, 1);
    player.finishOrder = null;
    player.finishTimestamp = null;
  }

  // 终止标记清除
  if (race.terminated && race.terminatedReason === 'all_qualified') {
    race.terminated = false;
    race.terminatedReason = null;
  }
}

/** R2.4 重置跑图 */
function resetRace(race) {
  // 清空 race 的所有动态数据，保留 mapConfig
  Object.assign(race, {
    totalTimeStartedAt: null,
    turnStartedAt: null,
    currentPlayerIndex: 0,
    currentTurn: 0,
    players: [],
    actionLog: [],
    challengeHistory: [],
    itemsOnMap: [],
    taskPool: { used: [], remaining: [], fallbackCount: 0, fallbackTasks: [] },
    globalEffect: { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null },
    finishOrder: [],
    terminated: false,
    terminatedReason: null
  });
}

// ═══════════════════════════════════════════════
// 阶段四 回退
// ═══════════════════════════════════════════════

/** R4.1 撤销决赛选曲 */
function undoStage4LastSong(tournament) {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');
  const lastSong = s4.songs[s4.songs.length - 1];
  if (!lastSong) throw new Error('无选曲可撤销');

  if (lastSong.p1Score || lastSong.p2Score) {
    throw new Error('该曲目已有成绩，请先撤销成绩');
  }

  s4.songs.pop();
  if (lastSong.pickType === 'p1_pick') s4.status = 'p1_pick';
  else if (lastSong.pickType === 'p2_pick') s4.status = 'p2_pick';
  else s4.status = 'playing';
}

/** R4.2 撤销决赛成绩 */
function undoStage4LastScore(tournament, player = 'both') {
  const s4 = tournament.stage4;
  if (!s4) throw new Error('决赛未初始化');
  const lastSong = s4.songs[s4.songs.length - 1];
  if (!lastSong) throw new Error('无成绩可撤销');

  if (player === 'p1' || player === 'both') lastSong.p1Score = null;
  if (player === 'p2' || player === 'both') lastSong.p2Score = null;
  s4.status = 'playing';
}

/** R4.3 重置决赛 */
function resetStage4(tournament) {
  tournament.stage4 = null;
  // 保留 songPool/designatedSongId 在图池配置中
}

// ═══════════════════════════════════════════════
// 全局回退
// ═══════════════════════════════════════════════

/** R5.1 回退到上一阶段 */
async function revertStage(tournament) {
  const currentStatus = tournament.status;

  switch (currentStatus) {
    case 'stage1':
      tournament.stage1 = null;
      tournament.qualifiedStage1 = [];
      tournament.status = 'pending';
      break;
    case 'stage2':
      tournament.stage2 = null;
      tournament.qualifiedStage2 = [];
      tournament.status = 'stage1';
      break;
    case 'stage3':
      tournament.stage3 = null;
      tournament.qualifiedStage3 = [];
      tournament.status = 'stage2';
      break;
    case 'stage4':
      tournament.stage4 = null;
      tournament.status = 'stage3';
      break;
    case 'finished':
      if (tournament.stage4) {
        tournament.stage4.status = 'playing';
        tournament.stage4.winner = null;
      }
      tournament.status = 'stage4';
      break;
    default:
      throw new Error('当前状态无可回退目标');
  }

  await syncToOldTournament(tournament, 'status_sync', { newStatus: tournament.status });
}

/** R5.2 完全重置 */
async function resetAll(tournament) {
  tournament.stage1 = null;
  tournament.stage2 = null;
  tournament.stage3 = null;
  tournament.stage4 = null;
  tournament.qualifiedStage1 = [];
  tournament.qualifiedStage2 = [];
  tournament.qualifiedStage3 = [];
  tournament.qualifierRankings = [];
  tournament.status = 'pending';
  // 不重置 oldTournamentId（关联保留）

  await syncToOldTournament(tournament, 'status_sync', { newStatus: 'pending' });
}

module.exports = {
  undoStage1LastSong,
  undoStage1LastScore,
  revertStage1Group,
  resetStage1,
  undoRaceLastAction,
  undoRaceItemUse,
  undoRaceLastChallengeResult,
  resetRace,
  undoStage4LastSong,
  undoStage4LastScore,
  resetStage4,
  revertStage,
  resetAll,
};
