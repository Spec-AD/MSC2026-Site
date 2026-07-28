/**
 * MSC 2026 — 回退服务
 * b1.7.11.patch-02
 *
 * 每个可逆操作提供对应的撤销逆操作（reverse action）。
 * 所有函数直接操作 tournament 文档，调用方负责 tournament.save()。
 */

const { broadcast } = require('./ssePool');
const { getItem } = require('./itemDefinitions');
const { FIXED_WALL_CHALLENGES } = require('./challengeDefinitions');
// patch-03: 回退服务不再回写 tournament.status —— matches/MSC 是临时适配层，
// 权威阶段由组织者在 tournament 端控制，回退只清理本适配层自身的数据。

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
  else if (lastSong.pickType === 'random') group.status = 'random_pick';
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
  groupIdx = Number(groupIdx);
  if (!Number.isInteger(groupIdx)) throw new Error('无效的组序号');
  if (groupIdx < 0 || groupIdx >= s1.groups.length) throw new Error('无效的组序号');

  const targetGroup = s1.groups[groupIdx];
  if (!targetGroup.songs || targetGroup.songs.length === 0) targetGroup.status = 'p1_pick';
  else if (targetGroup.songs.length === 1 && targetGroup.songs[0].p1Score && targetGroup.songs[0].p2Score) targetGroup.status = 'p2_pick';
  else if (targetGroup.songs.length === 2 && targetGroup.songs.every(song => song.p1Score && song.p2Score)) {
    targetGroup.status = 'random_pick';
  } else targetGroup.status = 'playing';
  targetGroup.winner = null;
  targetGroup.forfait = null;
  targetGroup.needTiebreak = false;
  targetGroup.revealStartedAt = null;
  targetGroup.revealEndsAt = null;
  for (let index = groupIdx + 1; index < s1.groups.length; index++) {
    const group = s1.groups[index];
    group.songs = [];
    group.status = 'pending';
    group.winner = null;
    group.forfait = null;
    group.needTiebreak = false;
    group.revealStartedAt = null;
    group.revealEndsAt = null;
  }
  s1.currentGroupIndex = groupIdx;
  s1.status = 'playing';
  tournament.status = 'stage1';
  tournament.qualifiedStage1 = [];
  tournament.qualifiedStage2 = [];
  tournament.qualifiedStage3 = [];
  tournament.stage2 = null;
  tournament.stage3 = null;
  tournament.stage4 = null;
}

/** R1.4 重置阶段一 */
function resetStage1(tournament) {
  tournament.stage1 = null;
  tournament.stage2 = null;
  tournament.stage3 = null;
  tournament.stage4 = null;
  tournament.qualifiedStage1 = [];
  tournament.qualifiedStage2 = [];
  tournament.qualifiedStage3 = [];
  tournament.qualifierRankings = [];
  tournament.status = 'pending';
}

// ═══════════════════════════════════════════════
// 跑图阶段 回退
// ═══════════════════════════════════════════════

/** R2.1 撤销最后跑图行动（P0） */
function undoRaceLastAction(race, tournament = null, stageKey = null) {
  if (!race || !Array.isArray(race.players) || race.players.length === 0) throw new Error('跑图未初始化或选手为空');
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
      const fixedIds = new Set(Object.values(FIXED_WALL_CHALLENGES).map(task => task.id));
      if (!fixedIds.has(lastChallenge.taskId)) {
        race.taskPool.remaining.push(lastChallenge.taskId);
        const usedIdx = race.taskPool.used.indexOf(lastChallenge.taskId);
        if (usedIdx >= 0) race.taskPool.used.splice(usedIdx, 1);
      }

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
      undoRaceLastChallengeResult(race, tournament, stageKey);
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
  itemRef = Number(itemRef);
  if (!Number.isInteger(itemRef)) throw new Error('道具编号非法');
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

/** R2.3 撤回最近一次挑战判定，恢复为待裁判确认 */
function undoRaceLastChallengeResult(race, tournament = null, stageKey = null) {
  if (!race || !Array.isArray(race.players) || race.players.length === 0) throw new Error('跑图未初始化或选手为空');
  const resultLogIndex = race.actionLog.findLastIndex(
    log => ['challenge_passed', 'challenge_failed'].includes(log.actionType)
  );
  const trailingActions = resultLogIndex >= 0 ? race.actionLog.slice(resultLogIndex + 1) : [];
  const onlyAutomaticSilentSkips = trailingActions.every(
    log => log.actionType === 'skip_timeout' && log.detail?.reason === 'silent'
  );
  if (resultLogIndex < 0 || !onlyAutomaticSilentSkips) {
    throw new Error('只能撤回最近一次操作；挑战判定后已有其他行动');
  }
  const lastChallenge = [...race.challengeHistory].reverse().find(ch => ch.passed !== null);
  if (!lastChallenge) throw new Error('无已判定的挑战');

  const player = race.players.find(p => p.userId.toString() === lastChallenge.playerId.toString());
  if (!player) throw new Error('选手数据异常');

  const wasPassed = lastChallenge.passed;
  const snapshot = lastChallenge.rollbackSnapshot;
  if (snapshot?.player && snapshot?.race) {
    Object.assign(player, snapshot.player);
    race.currentPlayerIndex = snapshot.race.currentPlayerIndex;
    race.currentTurn = snapshot.race.currentTurn;
    race.turnStartedAt = snapshot.race.turnStartedAt;
    race.terminated = snapshot.race.terminated;
    race.terminatedReason = snapshot.race.terminatedReason;
    race.finishOrder = snapshot.race.finishOrder || [];
    race.globalEffect = snapshot.race.globalEffect || { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null };
    if (tournament && stageKey === 'stage2') tournament.qualifiedStage2 = snapshot.qualifiedIds || [];
    if (tournament && stageKey === 'stage3') tournament.qualifiedStage3 = snapshot.qualifiedIds || [];
  } else {
    const dxScore = Number(lastChallenge.resultSnapshot?.dxScore);
    if (Number.isFinite(dxScore)) player.cumulativeDxScore = Math.max(0, (player.cumulativeDxScore || 0) - dxScore);
    player.currentLayer = Math.max(0, lastChallenge.wallIndex || 0);
    if (wasPassed) {
      const achievement = Number(lastChallenge.resultSnapshot?.achievement);
      if (Number.isFinite(achievement)) {
        player.successfulChallengeAchievementTotal = Math.max(0, (player.successfulChallengeAchievementTotal || 0) - achievement);
        player.successfulChallengeCount = Math.max(0, (player.successfulChallengeCount || 0) - 1);
      }
    } else {
      player.silentUntilTurn = null;
      player.disableItemsUntilTurn = null;
      player.challengeFailureCount = Math.max(0, (player.challengeFailureCount || 0) - 1);
    }
    race.currentPlayerIndex = race.players.findIndex(p => p.userId.toString() === lastChallenge.playerId.toString());
    if (race.currentPlayerIndex < 0) race.currentPlayerIndex = 0;
    race.currentTurn = Math.max(0, race.currentTurn - 1);
    race.turnStartedAt = null;
  }

  race.actionLog.splice(resultLogIndex);

  // 重置挑战状态为待判定
  lastChallenge.passed = null;
  lastChallenge.judgedBy = null;
  lastChallenge.judgedAt = null;

  if (!snapshot && race.terminated && race.terminatedReason === 'all_qualified') {
    race.terminated = false;
    race.terminatedReason = null;
    if (tournament && stageKey === 'stage2') tournament.qualifiedStage2 = [];
    if (tournament && stageKey === 'stage3') tournament.qualifiedStage3 = [];
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
  else if (lastSong.pickType === 'random') s4.status = 'random_pick';
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
  s4.winner = null;
  s4.needTiebreak = false;
  if (tournament.status === 'finished') tournament.status = 'stage4';
}

/** R4.3 重置决赛 */
function resetStage4(tournament) {
  tournament.stage4 = null;
  tournament.status = 'stage3';
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
  // patch-03: 回退只作用于 MSC 适配层自身，绝不回写 tournament.status。
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
  // patch-03: 适配层完全重置也不回写 tournament.status。
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
