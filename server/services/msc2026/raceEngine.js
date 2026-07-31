/**
 * MSC 2026 跑图引擎（阶段二 & 三共用）
 *
 * b1.7.11.patch-02
 *
 * 核心机制：
 * - 回合制行动（advance / pickup）
 * - 墙壁挑战（33 任务随机池 + 各阶段固定第二墙）
 * - 道具系统（unused → armed → consumed 生命周期）
 * - 超时机制（回合45s / 地图总限时）
 * - 鬼面人心全局效果（持久化为纯数据）
 *
 * patch-02 修复：
 * - P0-1: 移除 _taskMap 运行时字段，改用 CHALLENGE_TASKS + fallbackTasks 纯函数读取
 * - P0-2: globalEffect 持久化为 schema 字段 + 动态 getItem().apply()
 * - P1-1: 首回合 turnStartedAt 初始化为当前时间
 * - P1-4: challengeHistory 保存 resolvedChallenge 快照
 * - P1-5: 道具使用生命周期 unused → armed → consumed（按次消耗，非永久）
 * - P1-6: 双面道具惩罚仅对本次挑战绑定的 armed 道具触发
 */

const { shuffle, calculateRaceRankings, assertObjectIdList } = require('./utils');
const { CHALLENGE_TASKS, FIXED_WALL_CHALLENGES } = require('./challengeDefinitions');
const { getItemPool, getItem, applyItemEffectsDetailed } = require('./itemDefinitions');
const { broadcast } = require('./ssePool');
const { syncToOldTournament } = require('./oldTournamentSync');
const { getRaceTimerDecision } = require('./raceTimerDecision');
const { rollProbability } = require('./probabilityRoll');
const { snapshotChallenge } = require('./challengePresentation');
const { getGlobalEffectTurnRange } = require('./itemLifecycle');

// ── 阶段配置映射 ──
const RACE_CONFIGS = {
  stage2: {
    shape: 'hexagon',
    layers: 3,
    wallLabels: ['密锁之墙', '准锁之墙'],
    itemPoolRefs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    zoneCount: 6,
    timeLimitMs: 60 * 60 * 1000,
    turnTimeLimitMs: 45 * 1000,         // 45s
    advanceCount: 4
  },
  stage3: {
    shape: 'square',
    layers: 3,
    wallLabels: ['叹息之墙', '终局之墙'],
    itemPoolRefs: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    zoneCount: 4,
    timeLimitMs: 45 * 60 * 1000,
    turnTimeLimitMs: 45 * 1000,          // 45s
    advanceCount: 2
  }
};

// ── 辅助：从 CHALLENGE_TASKS 读取原始任务 ──
function getTaskById(taskId) {
  const fixedTask = Object.values(FIXED_WALL_CHALLENGES).find(task => task.id === taskId);
  if (fixedTask) return { ...fixedTask };
  const staticTask = CHALLENGE_TASKS.find(t => t.id === taskId);
  if (staticTask) return { ...staticTask };
  return null; // fallback 任务不从这查
}

// ── 辅助：从 fallbackTasks 查补充任务 ──
function getFallbackTask(taskId, fallbackTasks) {
  return fallbackTasks ? fallbackTasks.find(t => t.id === taskId) || null : null;
}

function hasPendingChallenge(race) {
  return !!race.challengeHistory?.some(ch => ch.passed === null);
}

/**
 * 初始化跑图
 */
async function initRace(tournament, playerIds) {
  const stageKey = tournament.status; // 'stage2' | 'stage3'
  const config = RACE_CONFIGS[stageKey];
  if (!config) throw new Error(`无效的跑图阶段: ${stageKey}`);

  const expectedCount = stageKey === 'stage2' ? 6 : 4;
  playerIds = assertObjectIdList(playerIds || [], expectedCount, `${stageKey}跑图选手`);

  // 随机分配起点顶点
  const shuffled = shuffle(playerIds);
  const players = shuffled.map((uid, i) => ({
    userId: uid,
    startVertex: i,
    currentLayer: 0,
    items: [],
    silentUntilTurn: null,
    disableItemsUntilTurn: null,
    finishOrder: null,
    finishTimestamp: null,
    challengeFailureCount: 0,
    successfulChallengeAchievementTotal: 0,
    successfulChallengeCount: 0,
    cumulativeDxScore: 0
  }));

  // 道具生成：均匀分布到每个三角区域
  const itemsOnMap = [];
  const itemPool = getItemPool(stageKey);
  const itemRefs = config.itemPoolRefs;

  // 每个区域放若干道具（让分布均衡）
  let itemCounter = 0;
  for (const ref of itemRefs) {
    if (itemPool[ref]) {
      const zoneIdx = itemCounter % config.zoneCount;
      itemsOnMap.push({ itemRef: ref, zoneIndex: zoneIdx, collected: false });
      itemCounter++;
    }
  }
  // 如果道具少于区域数，补充随机分布
  const shuffledItems = shuffle(itemsOnMap);

  // 任务池初始化（只持久化 ID，任务定义从 CHALLENGE_TASKS 常量读取）
  const allTaskIds = CHALLENGE_TASKS.map(t => t.id);
  // Fisher-Yates shuffle
  for (let i = allTaskIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTaskIds[i], allTaskIds[j]] = [allTaskIds[j], allTaskIds[i]];
  }

  // 行动顺序与顶点分配独立随机；后续每圈严格倒序。
  const turnOrder = shuffle(players.map((_, index) => index));
  const firstPlayer = turnOrder[0];

  const raceState = {
    status: 'waiting',
    mapConfig: {
      shape: config.shape,
      layers: config.layers,
      wallLabels: config.wallLabels
    },
    timeLimitMs: config.timeLimitMs,
    turnTimeLimitMs: config.turnTimeLimitMs,
    totalTimeStartedAt: null,
    turnStartedAt: null,
    currentPlayerIndex: firstPlayer,
    currentTurn: 0,
    roundNumber: 1,
    roundPosition: 0,
    turnOrder,
    pendingRoundActions: [],
    players,
    actionLog: [],
    challengeHistory: [],
    itemsOnMap: shuffledItems,
    taskPool: {
      used: [],
      remaining: [...allTaskIds],
      fallbackCount: 0,
      fallbackTasks: [],
      cycle: 1
    },
    globalEffect: {                               // P0-2: schema 化，不含函数
      sourceItemRef: null,
      startsAtTurn: null,
      endsAtTurn: null
    },
    finishOrder: [],
    terminated: false,
    terminatedReason: null
  };

  tournament[stageKey] = raceState;
  await tournament.save();

  broadcast('stage_advanced', {
    stage: stageKey,
    phase: 'race_init',
    shape: config.shape,
    layers: config.layers,
    playerCount: players.length
  });

  return raceState;
}

/** 初始化后由管理员显式开始；开始前地图和席位可供现场核验。 */
async function startRace(tournament) {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race || (stageKey !== 'stage2' && stageKey !== 'stage3')) throw new Error('跑图尚未初始化');
  if (race.terminated || race.status === 'terminated') throw new Error('地图已终止');
  if (race.status && race.status !== 'waiting') throw new Error('跑图已经开始');
  if (!Array.isArray(race.players) || race.players.length === 0) throw new Error('跑图选手为空');

  if (!Array.isArray(race.turnOrder) || race.turnOrder.length !== race.players.length) {
    race.turnOrder = shuffle(race.players.map((_, index) => index));
  }
  race.status = 'racing';
  race.roundNumber = Math.max(1, Number(race.roundNumber) || 1);
  race.roundPosition = 0;
  race.currentPlayerIndex = race.turnOrder[0];
  race.currentTurn = Math.max(0, Number(race.currentTurn) || 0);
  race.totalTimeStartedAt = new Date();
  race.turnStartedAt = new Date();
  await tournament.save();

  const payload = {
    stage: stageKey,
    roundNumber: race.roundNumber,
    turn: race.currentTurn,
    currentPlayerId: race.players[race.currentPlayerIndex].userId.toString(),
    turnStartedAt: race.turnStartedAt,
    turnOrder: race.turnOrder.map(index => race.players[index].userId.toString())
  };
  broadcast('race_started', payload);
  broadcast('round_started', payload);
  broadcast('turn_change', payload);
  return payload;
}

/**
 * 获取当前进行中的跑图状态
 */
function currentRace(tournament) {
  const stageKey = tournament.status;
  if (stageKey !== 'stage2' && stageKey !== 'stage3') return null;
  return tournament[stageKey];
}

/**
 * 选手行动（裁判代理）
 * @param {string} targetPlayerId - 目标选手 ID（裁判指定）
 */
async function playerAction(tournament, targetPlayerId, actionType, zoneIndex) {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race) throw new Error('不在跑图阶段');
  _ensureRoundState(race);
  if (race.status === 'waiting') throw new Error('地图已初始化，等待管理员开始');
  if (race.status === 'adjudicating') throw new Error('本圈行动已结束，请先完成统一判定');
  if (race.status !== 'racing') throw new Error('跑图当前不可操作');

  // 超时检测
  await _checkMapTimeout(tournament, race, stageKey);
  if (race.terminated) throw new Error('地图已终止');

  const targetId = targetPlayerId.toString();

  // 查找选手
  const player = race.players.find(p => p.userId.toString() === targetId);
  if (!player) throw new Error('选手不在比赛中');

  // 校验回合：只能代当前回合选手操作
  const currentPlayer = race.players[race.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.userId.toString() !== targetId) {
    throw new Error('当前不是该选手的回合');
  }

  if (player.currentLayer >= race.mapConfig.layers) {
    throw new Error('该选手已到达终点');
  }

  // 检查回合超时
  if (race.turnStartedAt) {
    const elapsed = Date.now() - new Date(race.turnStartedAt).getTime();
    if (elapsed > race.turnTimeLimitMs) {
      await _skipTurn(tournament, race, 'skip_timeout', targetPlayerId);
      throw new Error('回合已超时，已自动跳过');
    }
  }

  // 处理静默
  if (player.silentUntilTurn != null && race.currentTurn <= player.silentUntilTurn) {
    await _advanceTurn(tournament, race, true);
    throw new Error('该选手处于静默状态，回合已跳过');
  }

  // 处理行动
  if (actionType === 'advance') {
    return await _handleAdvance(tournament, race, player, targetPlayerId);
  } else if (actionType === 'pickup') {
    return await _handlePickup(tournament, race, player, zoneIndex);
  } else {
    throw new Error('无效的行动类型');
  }
}

/**
 * 使用道具（裁判代理，不占行动）
 */
async function useItem(tournament, targetPlayerId, itemRef) {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race) throw new Error('不在跑图阶段');
  _ensureRoundState(race);
  if (race.terminated) throw new Error('地图已终止');
  if (race.status !== 'racing') throw new Error('仅可在行动阶段使用道具');

  const targetId = targetPlayerId.toString();
  itemRef = Number(itemRef);
  if (!Number.isInteger(itemRef)) throw new Error('道具编号非法');
  // 修复 #1：此前 useItem 内的 broadcast 误用了未定义的 userId（函数形参是 targetPlayerId）
  const userId = targetPlayerId;
  const player = race.players[race.currentPlayerIndex];
  if (!player || player.userId.toString() !== targetId) {
    throw new Error('当前不是该选手的回合');
  }

  // 检查禁用道具
  if (player.disableItemsUntilTurn != null && race.currentTurn <= player.disableItemsUntilTurn) {
    throw new Error('该选手已被禁用道具');
  }

  // 查找未使用的道具（P1-5: 只能 status === 'unused' 的道具被使用）
  const itemEntry = player.items.find(i => i.itemRef === itemRef && i.status === 'unused');
  if (!itemEntry) throw new Error('你未持有该道具或已使用');

  const itemDef = getItem(itemRef);
  if (!itemDef) throw new Error('未知道具');

  // P1-5: 标记为 armed（待消耗），不等同于已永久生效
  itemEntry.status = 'armed';

  // 情报型道具（红心/白色红心）特殊处理：立即消耗
  if (itemDef.isIntel) {
    itemEntry.status = 'consumed';

    if (itemRef === 9) { // 红心：100% 成功
      const challenge = await _peekChallenge(race, player);
      race.actionLog.push({
        playerId: player.userId,
        turn: race.currentTurn,
        actionType: 'use_item',
        detail: { itemRef, success: true, taskId: challenge?.taskId },
        timestamp: new Date()
      });
      await tournament.save();
      broadcast('item_used', { playerId: userId.toString(), itemRef, itemName: itemDef.name });
      return { itemRef, name: itemDef.name, effect: '已显示最近墙壁的原始挑战', challenge, success: true, status: 'applied' };
    } else if (itemRef === 19) { // 白色红心：40% 成功
      const outcome = rollProbability(0.40);
      const { success, probability, roll } = outcome;
      if (success) {
        const challenge = await _peekChallenge(race, player);
        race.actionLog.push({
          playerId: player.userId,
          turn: race.currentTurn,
          actionType: 'use_item',
          detail: { itemRef, success: true, probability, roll, taskId: challenge?.taskId },
          timestamp: new Date()
        });
        await tournament.save();
        broadcast('item_used', { playerId: userId.toString(), itemRef, itemName: itemDef.name });
        return {
          itemRef,
          name: itemDef.name,
          effect: `概率判定命中：掷值 ${(roll * 100).toFixed(2)}%，已显示原始挑战`,
          challenge,
          success: true,
          status: 'applied',
          probability,
          roll
        };
      } else {
        race.actionLog.push({
          playerId: player.userId,
          turn: race.currentTurn,
          actionType: 'use_item',
          detail: { itemRef, success: false, probability, roll },
          timestamp: new Date()
        });
        await tournament.save();
        broadcast('item_used', { playerId: userId.toString(), itemRef, itemName: itemDef.name, effect: '未生效（60%概率）' });
        return {
          itemRef,
          name: itemDef.name,
          effect: `概率判定未命中：掷值 ${(roll * 100).toFixed(2)}%，需低于 40%`,
          success: false,
          status: 'missed',
          probability,
          roll
        };
      }
    }
  }

  // 全局效果型道具（鬼面人心类）
  if (itemDef.globalEffect) {
    // 全局效果已使用就立即消耗
    itemEntry.status = 'consumed';
    const duration = itemDef.globalDuration || 1;
    const effectWindow = getGlobalEffectTurnRange(race.currentTurn, duration, race.players.length);
    const { durationTurns } = effectWindow;
    // P0-2: 持久化为纯数据（不含 apply 函数）
    race.globalEffect = {
      sourceItemRef: itemRef,
      startsAtTurn: effectWindow.startsAtTurn,
      endsAtTurn: effectWindow.endsAtTurn
    };
    race.actionLog.push({
      playerId: player.userId,
      turn: race.currentTurn,
      actionType: 'use_item',
      detail: { itemRef, globalEffect: true, durationRounds: duration, durationTurns },
      timestamp: new Date()
    });
    await tournament.save();
    broadcast('item_used', {
      playerId: userId.toString(),
      itemRef,
      itemName: itemDef.name,
      effect: `全体选手各 ${duration} 回合，共覆盖 ${durationTurns} 个行动回合`,
      globalEffect: true
    });
    return {
      itemRef,
      name: itemDef.name,
      effect: `全体选手各 ${duration} 回合，共覆盖 ${durationTurns} 个行动回合`,
      globalEffect: true,
      status: 'applied',
      durationRounds: duration,
      durationTurns
    };
  }

  // 普通增益/双面道具：标记 armed，等待挑战时消耗
  race.actionLog.push({
    playerId: player.userId,
    turn: race.currentTurn,
    actionType: 'use_item',
    detail: { itemRef, armed: true },
    timestamp: new Date()
  });
  await tournament.save();

  broadcast('item_armed', {
    playerId: userId.toString(),
    itemRef,
    itemName: itemDef.name
  });

  return {
    itemRef,
    name: itemDef.name,
    effect: '已激活；进入下一次挑战后将明确显示生效结果或不适用原因',
    intendedEffect: itemDef.description,
    type: itemDef.type,
    status: 'armed'
  };
}

// ── 内部实现 ──

function _ensureRoundState(race) {
  if (!race.status) {
    race.status = race.terminated
      ? 'terminated'
      : race.totalTimeStartedAt
        ? (hasPendingChallenge(race) ? 'adjudicating' : 'racing')
        : 'waiting';
  }
  if (!Number.isInteger(race.roundNumber) || race.roundNumber < 1) race.roundNumber = 1;
  if (!Array.isArray(race.turnOrder) || race.turnOrder.length !== race.players.length) {
    race.turnOrder = race.players.map((_, index) => index);
  }
  if (!Number.isInteger(race.roundPosition) || race.roundPosition < 0) {
    const position = race.turnOrder.indexOf(race.currentPlayerIndex);
    race.roundPosition = position >= 0 ? position : 0;
  }
  if (!Array.isArray(race.pendingRoundActions)) race.pendingRoundActions = [];
  if (!race.taskPool) race.taskPool = { used: [], remaining: [], fallbackTasks: [], fallbackCount: 0, cycle: 1 };
  if (!Number.isInteger(race.taskPool.cycle) || race.taskPool.cycle < 1) race.taskPool.cycle = 1;
}

function _refillTaskPool(race) {
  const taskIds = shuffle(CHALLENGE_TASKS.map(task => task.id));
  const lastDrawn = race.taskPool.used?.[race.taskPool.used.length - 1];
  if (taskIds.length > 1 && taskIds[taskIds.length - 1] === lastDrawn) {
    [taskIds[0], taskIds[taskIds.length - 1]] = [taskIds[taskIds.length - 1], taskIds[0]];
  }
  race.taskPool.remaining = taskIds;
  race.taskPool.used = [];
  race.taskPool.cycle = (Number(race.taskPool.cycle) || 1) + 1;
}

/**
 * 从任务池中取一个任务（纯函数方式：CHALLENGE_TASKS + fallbackTasks）
 */
function _drawTask(race, stageKey, wallIndex) {
  if (wallIndex === 1) {
    const task = FIXED_WALL_CHALLENGES[stageKey];
    if (!task) throw new Error('固定墙壁挑战未配置');
    return { taskId: task.id, task: { ...task } };
  }
  if (race.taskPool.remaining.length === 0) {
    _refillTaskPool(race);
  }

  const taskId = race.taskPool.remaining.pop();
  if (taskId == null) throw new Error('任务池为空且无法补充任务');
  race.taskPool.used.push(taskId);

  // P0-1: 纯函数读取任务定义
  let task = getTaskById(taskId);
  if (!task) {
    // 可能是补充任务，从 fallbackTasks 查
    task = getFallbackTask(taskId, race.taskPool.fallbackTasks);
  }

  return { taskId, task };
}

/**
 * 前进挑战墙壁
 */
async function _handleAdvance(tournament, race, player, userId) {
  // 目标墙壁
  const wallIndex = player.currentLayer;
  const wallLabel = race.mapConfig.wallLabels[wallIndex];
  if (!wallLabel) throw new Error('该坐标没有可挑战墙壁');

  // 从任务池中取一个任务（P0-1: 纯函数读取）
  const { taskId, task: rawChallenge } = _drawTask(race, tournament.status, wallIndex);

  if (!rawChallenge) throw new Error('任务数据丢失');

  // P1-5: 挑出当前回合 armed 的道具（不是所有历史 used 道具）
  const armedItemRefs = player.items.filter(i => i.status === 'armed').map(i => i.itemRef);

  const originalChallenge = snapshotChallenge(rawChallenge, taskId);

  // 构建可应用的挑战对象（含道具修改）
  let challenge = { ...rawChallenge, _achievementBonus: 0, _dxBonus: 0, _greatCancel: 0, _modifiedBy: [] };
  let itemEffectResults = [];

  // 应用当前回合 armed 的道具效果
  const personalEffects = applyItemEffectsDetailed(challenge, armedItemRefs, {
    playerId: userId,
    tournament,
    stage: race,
    source: 'personal'
  });
  challenge = personalEffects.challenge;
  itemEffectResults.push(...personalEffects.effects);

  // 检查全局效果（鬼面人心）— P0-2: 从 schema 字段读取，动态调用 getItem().apply
  if (
    race.globalEffect &&
    race.globalEffect.sourceItemRef != null &&
    race.currentTurn >= race.globalEffect.startsAtTurn &&
    race.currentTurn <= race.globalEffect.endsAtTurn
  ) {
    const globalItem = getItem(race.globalEffect.sourceItemRef);
    if (globalItem && globalItem.apply) {
      const globalEffects = applyItemEffectsDetailed(challenge, [globalItem.ref], {
        playerId: userId,
        tournament,
        stage: race,
        source: 'global'
      });
      challenge = globalEffects.challenge;
      itemEffectResults.push(...globalEffects.effects);
    }
  }

  const resolvedChallenge = snapshotChallenge(challenge, taskId);
  const activeItemEffects = itemEffectResults.map(effect => `${effect.itemName}：${effect.summary}`);

  // P1-5: 消耗已 armed 的道具（改为 consumed）
  for (const item of player.items) {
    if (item.status === 'armed') {
      item.status = 'consumed';
    }
  }

  // 记录挑战历史（P1-4: 保存 resolvedChallenge 快照；P1-R1: 绑定 usedItemRefs 精准惩罚）
  race.challengeHistory.push({
    wallIndex,
    taskId,
    playerId: userId,
    passed: null, // 待裁判判定
    judgedBy: null,
    judgedAt: null,
    usedItemRefs: armedItemRefs,
    originalChallenge,
    resolvedChallenge,
    activeItemEffects,
    itemEffectResults,
    roundNumber: race.roundNumber,
    sequence: race.pendingRoundActions.length
  });

  race.pendingRoundActions.push({
    playerId: userId.toString(),
    actionType: 'advance',
    turn: race.currentTurn,
    roundNumber: race.roundNumber,
    taskId,
    wallIndex
  });

  // 记录行动日志
  race.actionLog.push({
    playerId: userId,
    turn: race.currentTurn,
    actionType: 'advance',
    detail: {
      taskId,
      wallIndex,
      itemEffects: itemEffectResults.map(effect => ({
        itemRef: effect.itemRef,
        status: effect.status,
        summary: effect.summary
      }))
    },
    timestamp: new Date()
  });

  await _advanceTurn(tournament, race);

  await tournament.save();

  broadcast('challenge_revealed', {
    playerId: userId.toString(),
    taskId,
    taskName: rawChallenge.name,
    type: rawChallenge.type,
    difficulty: rawChallenge.difficulty,
    songTitle: rawChallenge.songTitle,
    wallLabel,
    wallIndex
  });

  return {
    action: 'advance',
    challenge: {
      ...resolvedChallenge,
      wallLabel,
      wallIndex,
      originalChallenge,
      effectiveChallenge: resolvedChallenge,
      activeItemEffects,
      itemEffectResults
    },
    turnEnded: true,
    queuedForRoundJudgement: true,
    raceStatus: race.status,
    roundNumber: race.roundNumber,
    nextPlayerId: race.status === 'racing'
      ? race.players[race.currentPlayerIndex].userId.toString()
      : null
  };
}

/**
 * 拾取道具
 */
async function _handlePickup(tournament, race, player, zoneIndex) {
  if (zoneIndex == null) throw new Error('需指定目标区域 (zoneIndex)');
  zoneIndex = Number(zoneIndex);
  if (!Number.isInteger(zoneIndex)) throw new Error('目标区域非法');

  // 验证相邻区域
  const config = RACE_CONFIGS[tournament.status];
  const zoneCount = config.zoneCount;
  if (zoneIndex < 0 || zoneIndex >= zoneCount) throw new Error('目标区域越界');
  const isValidZone = _isAdjacentZone(player, zoneIndex, zoneCount);
  if (!isValidZone) throw new Error('该区域不可达');

  const availableCount = race.itemsOnMap.filter(i => i.zoneIndex === zoneIndex && !i.collected).length;
  if (availableCount === 0) throw new Error('该区域无可用道具');

  race.pendingRoundActions.push({
    playerId: player.userId.toString(),
    actionType: 'pickup',
    zoneIndex,
    turn: race.currentTurn,
    roundNumber: race.roundNumber,
    resolved: false
  });

  // 记录日志
  race.actionLog.push({
    playerId: player.userId,
    turn: race.currentTurn,
    actionType: 'pickup',
    detail: { zoneIndex, pendingRoundSettlement: true },
    timestamp: new Date()
  });

  // 推进回合
  await _advanceTurn(tournament, race);

  await tournament.save();

  broadcast('item_pickup_queued', {
    playerId: player.userId.toString(),
    zoneIndex,
    roundNumber: race.roundNumber
  });

  return {
    action: 'pickup',
    item: {
      hidden: true,
      name: '拾取申请已登记',
      type: 'hidden',
      description: '本圈全部行动结束后统一随机发放，道具内容仅对持有选手可见'
    },
    zoneIndex,
    turnEnded: true,
    raceStatus: race.status,
    roundNumber: race.roundNumber,
    nextPlayerId: race.status === 'racing' ? race.players[race.currentPlayerIndex].userId.toString() : null
  };
}

/**
 * 裁判判定挑战结果
 */
async function challengeResult(tournament, judgeId, passed, resultSnapshot = null) {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race) throw new Error('不在跑图阶段');
  _ensureRoundState(race);

  await _checkMapTimeout(tournament, race, stageKey);
  if (race.terminated) throw new Error('地图已终止');
  if (race.status !== 'adjudicating') throw new Error('尚未进入本圈统一判定阶段');
  if (typeof passed !== 'boolean') throw new Error('passed 必须是布尔值');

  // 按本圈行动顺序逐一录入，但直到全部录入完成才开启下一圈。
  const lastChallenge = _nextPendingChallenge(race);

  if (!lastChallenge) throw new Error('无待判定的挑战');

  lastChallenge.passed = passed;
  lastChallenge.judgedBy = judgeId;
  lastChallenge.judgedAt = new Date();
  lastChallenge.resultSnapshot = resultSnapshot && typeof resultSnapshot === 'object' ? resultSnapshot : null;

  const playerIdx = race.players.findIndex(
    p => p.userId.toString() === lastChallenge.playerId.toString()
  );
  if (playerIdx < 0) throw new Error('选手不在比赛中');

  const player = race.players[playerIdx];
  lastChallenge.rollbackSnapshot = {
    player: {
      currentLayer: player.currentLayer,
      silentUntilTurn: player.silentUntilTurn,
      disableItemsUntilTurn: player.disableItemsUntilTurn,
       finishOrder: player.finishOrder,
       finishTimestamp: player.finishTimestamp,
       finishedRound: player.finishedRound,
       challengeFailureCount: player.challengeFailureCount,
      successfulChallengeAchievementTotal: player.successfulChallengeAchievementTotal,
      successfulChallengeCount: player.successfulChallengeCount,
      cumulativeDxScore: player.cumulativeDxScore
    },
    race: {
      currentPlayerIndex: race.currentPlayerIndex,
      currentTurn: race.currentTurn,
      turnStartedAt: race.turnStartedAt,
      terminated: race.terminated,
      terminatedReason: race.terminatedReason,
      finishOrder: race.finishOrder.map(entry => entry.toObject ? entry.toObject() : { ...entry }),
       globalEffect: race.globalEffect?.toObject ? race.globalEffect.toObject() : { ...race.globalEffect },
       actionLogLength: race.actionLog.length,
       status: race.status,
       roundNumber: race.roundNumber,
       roundPosition: race.roundPosition,
       turnOrder: [...race.turnOrder],
       pendingRoundActions: race.pendingRoundActions.map(action => action?.toObject ? action.toObject() : { ...action })
    },
    qualifiedIds: stageKey === 'stage2'
      ? (tournament.qualifiedStage2 || []).map(String)
      : (tournament.qualifiedStage3 || []).map(String)
  };
  const penaltiesApplied = [];
  const resultDxScore = Number(resultSnapshot?.dxScore);
  if (Number.isInteger(resultDxScore) && resultDxScore >= 0) player.cumulativeDxScore += resultDxScore;

  if (passed) {
    const achievement = Number(resultSnapshot?.achievement);
    if (Number.isFinite(achievement) && achievement >= 0 && achievement <= 101) {
      player.successfulChallengeAchievementTotal += achievement;
      player.successfulChallengeCount += 1;
    }
    // 挑战成功：进入下一层
    player.currentLayer++;
    const wallLabel = race.mapConfig.wallLabels[player.currentLayer - 1];

    race.actionLog.push({
      playerId: lastChallenge.playerId,
      turn: race.currentTurn,
      actionType: 'challenge_passed',
      detail: { taskId: lastChallenge.taskId, newLayer: player.currentLayer },
      timestamp: new Date()
    });

    broadcast('challenge_resolved', {
      playerId: lastChallenge.playerId.toString(),
      taskId: lastChallenge.taskId,
      passed: true,
      wallBreached: true
    });

    broadcast('wall_broken', {
      wallIndex: player.currentLayer - 1,
      wallLabel,
      playerId: lastChallenge.playerId.toString()
    });

    // 检查是否到达终点
    // 设计 D3：通过「最后一堵墙」后，最后一步（坐标 2→3 / 1→2，到中心）自动判定成功，无需再挑战。
    // 即挑战次数 = 墙壁数（stage2 两堵、stage3 一堵），不再多产生一次无对应墙体的幽灵挑战。
    const wallCount = race.mapConfig.wallLabels.length;
    if (player.currentLayer >= wallCount) {
      const breachedWallIndex = wallCount - 1;
      // 自动推进到中心坐标（stage2 → 3，stage3 → 2）
      player.currentLayer = race.mapConfig.layers;
      player.finishedRound = race.roundNumber;
      player.finishTimestamp = Number.isFinite(Number(resultSnapshot?.completionMs))
        ? Number(resultSnapshot.completionMs)
        : null;
    } else {
      broadcast('player_moved', {
        playerId: lastChallenge.playerId.toString(),
        fromLayer: player.currentLayer - 1,
        toLayer: player.currentLayer,
        wallIndex: player.currentLayer - 1,
        wallLabel
      });
    }
  } else {
    player.challengeFailureCount += 1;
    // 挑战失败：弹回该层起点（currentLayer 不变）

    // P1-R1: 精准惩罚——仅对本次挑战绑定的道具（lastChallenge.usedItemRefs）触发双面惩罚
    // 不再扫描玩家所有 consumed 道具，避免历史道具惩罚重复触发
    const boundRefs = lastChallenge.usedItemRefs || [];
    for (const ref of boundRefs) {
      const itemDef = getItem(ref);
      if (itemDef && itemDef.penalty) {
        const penalty = itemDef.penalty;
        // 修复 #5：currentTurn 是"逐人回合"全局计数，某选手下次行动在 playerCount 个回合后，
        // 故惩罚回合需 × playerCount，否则 1~2 回合的静默/禁用在轮到本人前就已过期 = 完全失效。
        const turnSpan = race.players.length;
        if (penalty.silentTurns) {
          player.silentUntilTurn = Math.max(
            player.silentUntilTurn || 0,
            race.currentTurn + penalty.silentTurns * turnSpan
          );
        }
        if (penalty.disableItemsTurns) {
          player.disableItemsUntilTurn = Math.max(
            player.disableItemsUntilTurn || 0,
            race.currentTurn + penalty.disableItemsTurns * turnSpan
          );
        }
        if (penalty.backToLayer0) {
          player.currentLayer = 0;
        }
        const parts = [];
        if (penalty.backToLayer0) parts.push('回到起点');
        if (penalty.silentTurns) parts.push(`静默 ${penalty.silentTurns} 回合`);
        if (penalty.disableItemsTurns) parts.push(`禁用道具 ${penalty.disableItemsTurns} 回合`);
        penaltiesApplied.push({
          itemRef: itemDef.ref,
          itemName: itemDef.name,
          summary: parts.join('、'),
          backToLayer0: !!penalty.backToLayer0,
          silentTurns: penalty.silentTurns || 0,
          disableItemsTurns: penalty.disableItemsTurns || 0,
          silentUntilTurn: player.silentUntilTurn,
          disableItemsUntilTurn: player.disableItemsUntilTurn
        });
      }
    }

    race.actionLog.push({
      playerId: lastChallenge.playerId,
      turn: race.currentTurn,
      actionType: 'challenge_failed',
      detail: { taskId: lastChallenge.taskId, penaltiesApplied },
      timestamp: new Date()
    });

    broadcast('challenge_resolved', {
      playerId: lastChallenge.playerId.toString(),
      taskId: lastChallenge.taskId,
      passed: false,
      wallBreached: false,
      penaltiesApplied
    });

    broadcast('player_bounced', {
      playerId: lastChallenge.playerId.toString(),
      wallIndex: player.currentLayer,
      wallLabel: race.mapConfig.wallLabels[player.currentLayer] || '???'
    });
  }

  const remainingChallenge = _activatePendingChallenge(race);
  let raceTerminated = false;
  if (!remainingChallenge) {
    raceTerminated = await _settleRoundAndContinue(tournament, race, stageKey);
  } else {
    broadcast('challenge_queue_advanced', {
      roundNumber: race.roundNumber,
      currentPlayerId: remainingChallenge.playerId.toString(),
      remainingCount: race.challengeHistory.filter(ch => ch.passed === null && Number(ch.roundNumber || 1) === race.roundNumber).length
    });
  }

  await tournament.save();

  return {
    passed,
    wallLabel: race.mapConfig.wallLabels[player.currentLayer] || '???',
    wallBreached: passed,
    newLayer: player.currentLayer,
    bounceBack: !passed,
    penaltiesApplied,
    nextPlayerId: raceTerminated ? null : race.players[race.currentPlayerIndex]?.userId?.toString(),
    nextTurn: race.currentTurn,
    roundNumber: race.roundNumber,
    raceStatus: race.status,
    raceTerminated,
    remainingJudgements: race.challengeHistory.filter(ch => ch.passed === null && Number(ch.roundNumber || 1) === race.roundNumber).length
  };
}

function _roundFinisherComparator(a, b) {
  const aTime = Number.isFinite(Number(a.finishTimestamp)) ? Number(a.finishTimestamp) : Number.POSITIVE_INFINITY;
  const bTime = Number.isFinite(Number(b.finishTimestamp)) ? Number(b.finishTimestamp) : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  if ((a.challengeFailureCount || 0) !== (b.challengeFailureCount || 0)) {
    return (a.challengeFailureCount || 0) - (b.challengeFailureCount || 0);
  }
  const aAverage = a.successfulChallengeCount ? a.successfulChallengeAchievementTotal / a.successfulChallengeCount : 0;
  const bAverage = b.successfulChallengeCount ? b.successfulChallengeAchievementTotal / b.successfulChallengeCount : 0;
  if (aAverage !== bAverage) return bAverage - aAverage;
  if ((a.cumulativeDxScore || 0) !== (b.cumulativeDxScore || 0)) return (b.cumulativeDxScore || 0) - (a.cumulativeDxScore || 0);
  return (a.startVertex || 0) - (b.startVertex || 0);
}

async function _settleRoundAndContinue(tournament, race, stageKey) {
  const finishers = race.players
    .filter(player => player.finishOrder == null && Number(player.finishedRound) === race.roundNumber)
    .sort(_roundFinisherComparator);

  for (const player of finishers) {
    const order = race.finishOrder.length + 1;
    player.finishOrder = order;
    race.finishOrder.push({ userId: player.userId, finishTimestamp: player.finishTimestamp ?? Date.now(), order });
    broadcast('player_moved', {
      playerId: player.userId.toString(),
      toLayer: player.currentLayer,
      reachedEnd: true,
      finishOrder: order,
      roundNumber: race.roundNumber
    });
  }

  const config = RACE_CONFIGS[stageKey];
  if (race.finishOrder.length >= config.advanceCount) {
    await _terminateRace(tournament, race, stageKey, 'all_qualified');
    return true;
  }
  await _startNextRound(tournament, race);
  return false;
}

/**
 * 跳过回合（超时或手动）
 */
async function skipTurn(tournament, reason = 'skip_manual') {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race) throw new Error('不在跑图阶段');
  _ensureRoundState(race);
  if (race.terminated) throw new Error('地图已终止');
  if (race.status !== 'racing') throw new Error('当前不在行动阶段');

  return await _skipTurn(tournament, race, reason, race.players[race.currentPlayerIndex].userId);
}

async function _skipTurn(tournament, race, reason, userId) {
  const currentPlayer = race.players[race.currentPlayerIndex];
  const skippedTurn = race.currentTurn;

  race.pendingRoundActions.push({
    playerId: currentPlayer.userId.toString(),
    actionType: 'skip',
    reason,
    turn: race.currentTurn,
    roundNumber: race.roundNumber
  });

  race.actionLog.push({
    playerId: currentPlayer.userId,
    turn: race.currentTurn,
    actionType: reason,
    detail: {},
    timestamp: new Date()
  });

  await _advanceTurn(tournament, race);
  await tournament.save();

  broadcast('turn_timeout', {
    playerId: userId.toString(),
    turn: skippedTurn,
    nextTurn: race.currentTurn,
    nextPlayerId: race.status === 'racing' ? race.players[race.currentPlayerIndex].userId.toString() : null,
    reason
  });

  return {
    nextPlayerId: race.status === 'racing' ? race.players[race.currentPlayerIndex].userId.toString() : null,
    turn: race.currentTurn,
    roundNumber: race.roundNumber,
    raceStatus: race.status
  };
}

/**
 * 圈末统一发放道具。同一区域按服务端随机顺序匹配，结果写回行动日志。
 */
function _resolveRoundPickups(race) {
  const intents = race.pendingRoundActions.filter(action => action.actionType === 'pickup' && !action.resolved);
  const events = [];
  const zones = [...new Set(intents.map(action => action.zoneIndex))];

  for (const zoneIndex of zones) {
    const claimants = shuffle(intents.filter(action => action.zoneIndex === zoneIndex));
    const availableItems = shuffle(race.itemsOnMap.filter(item => item.zoneIndex === zoneIndex && !item.collected));
    claimants.forEach((claim, index) => {
      claim.resolved = true;
      const item = availableItems[index];
      const player = race.players.find(entry => entry.userId.toString() === String(claim.playerId));
      const log = [...race.actionLog].reverse().find(entry =>
        entry.actionType === 'pickup' &&
        entry.turn === claim.turn &&
        entry.playerId.toString() === String(claim.playerId)
      );
      if (!item || !player) {
        claim.allocated = false;
        if (log) log.detail = { zoneIndex, allocated: false };
        return;
      }
      item.collected = true;
      player.items.push({ itemRef: item.itemRef, status: 'unused' });
      claim.allocated = true;
      claim.itemRef = item.itemRef;
      if (log) log.detail = { zoneIndex, itemRef: item.itemRef, allocated: true };
      events.push({ playerId: player.userId.toString(), zoneIndex });
    });
  }
  return events;
}

function _nextPendingChallenge(race) {
  return race.challengeHistory.find(challenge =>
    challenge.passed === null && Number(challenge.roundNumber || 1) === Number(race.roundNumber || 1)
  ) || null;
}

function _activatePendingChallenge(race) {
  const pending = _nextPendingChallenge(race);
  if (!pending) return null;
  const playerIndex = race.players.findIndex(player => player.userId.toString() === pending.playerId.toString());
  if (playerIndex >= 0) race.currentPlayerIndex = playerIndex;
  race.status = 'adjudicating';
  race.turnStartedAt = null;
  return pending;
}

async function _closeRound(tournament, race) {
  const pickupEvents = _resolveRoundPickups(race);
  pickupEvents.forEach(event => broadcast('item_collected', { ...event, roundNumber: race.roundNumber }));

  const pending = _activatePendingChallenge(race);
  if (pending) {
    broadcast('round_adjudication', {
      roundNumber: race.roundNumber,
      pendingCount: race.challengeHistory.filter(ch => ch.passed === null && Number(ch.roundNumber || 1) === race.roundNumber).length,
      currentPlayerId: pending.playerId.toString()
    });
    return;
  }
  await _startNextRound(tournament, race);
}

function _isPlayerAvailable(race, player) {
  const finishLayer = Number(race.mapConfig?.layers ?? Number.POSITIVE_INFINITY);
  return player && player.finishOrder == null && Number(player.currentLayer || 0) < finishLayer;
}

async function _startNextRound(tournament, race) {
  const activePlayers = race.players.filter(player => _isPlayerAvailable(race, player));
  if (activePlayers.length === 0) {
    await _terminateRace(tournament, race, tournament.status, 'no_active_players');
    return;
  }

  race.roundNumber += 1;
  race.turnOrder = [...race.turnOrder].reverse();
  race.roundPosition = 0;
  race.pendingRoundActions = [];
  race.status = 'racing';

  while (race.roundPosition < race.turnOrder.length) {
    const playerIndex = race.turnOrder[race.roundPosition];
    const player = race.players[playerIndex];
    if (!_isPlayerAvailable(race, player)) {
      race.roundPosition += 1;
      continue;
    }
    if (player.silentUntilTurn != null && race.currentTurn <= player.silentUntilTurn) {
      race.actionLog.push({
        playerId: player.userId,
        turn: race.currentTurn,
        actionType: 'skip_timeout',
        detail: { reason: 'silent' },
        timestamp: new Date()
      });
      race.pendingRoundActions.push({
        playerId: player.userId.toString(), actionType: 'skip', reason: 'silent',
        turn: race.currentTurn, roundNumber: race.roundNumber
      });
      race.currentTurn += 1;
      race.roundPosition += 1;
      continue;
    }
    race.currentPlayerIndex = playerIndex;
    race.turnStartedAt = new Date();
    break;
  }

  if (race.roundPosition >= race.turnOrder.length) {
    await _closeRound(tournament, race);
    return;
  }

  if (race.globalEffect && race.globalEffect.sourceItemRef != null && race.currentTurn > race.globalEffect.endsAtTurn) {
    race.globalEffect = { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null };
  }

  const payload = {
    roundNumber: race.roundNumber,
    turn: race.currentTurn,
    currentPlayerId: race.players[race.currentPlayerIndex].userId.toString(),
    turnStartedAt: race.turnStartedAt,
    turnOrder: race.turnOrder.map(index => race.players[index].userId.toString())
  };
  broadcast('round_started', payload);
  broadcast('turn_change', payload);
}

/** 推进当前圈；圈末进入统一结算，下一圈使用本圈完整倒序。 */
async function _advanceTurn(tournament, race) {
  if (!Array.isArray(race.turnOrder) || race.turnOrder.length === 0) throw new Error('跑图行动顺序为空');
  race.currentTurn += 1;
  race.roundPosition += 1;

  while (race.roundPosition < race.turnOrder.length) {
    const playerIndex = race.turnOrder[race.roundPosition];
    const nextPlayer = race.players[playerIndex];
    if (!_isPlayerAvailable(race, nextPlayer)) {
      race.roundPosition += 1;
      continue;
    }
    if (nextPlayer.silentUntilTurn != null && race.currentTurn <= nextPlayer.silentUntilTurn) {
      race.actionLog.push({
        playerId: nextPlayer.userId,
        turn: race.currentTurn,
        actionType: 'skip_timeout',
        detail: { reason: 'silent' },
        timestamp: new Date()
      });
      race.pendingRoundActions.push({
        playerId: nextPlayer.userId.toString(), actionType: 'skip', reason: 'silent',
        turn: race.currentTurn, roundNumber: race.roundNumber
      });
      race.currentTurn += 1;
      race.roundPosition += 1;
      continue;
    }
    race.currentPlayerIndex = playerIndex;
    race.turnStartedAt = new Date();
    broadcast('turn_change', {
      roundNumber: race.roundNumber,
      turn: race.currentTurn,
      currentPlayerId: nextPlayer.userId.toString(),
      turnStartedAt: race.turnStartedAt
    });
    return;
  }

  race.turnStartedAt = null;
  await _closeRound(tournament, race);
}

/**
 * 地图超时检查
 */
async function _checkMapTimeout(tournament, race, stageKey) {
  if (race.terminated) return;
  if (!race.totalTimeStartedAt) return;
  const elapsed = Date.now() - new Date(race.totalTimeStartedAt).getTime();
  if (elapsed >= race.timeLimitMs) {
    // 修复 #3：超时不再只置内存标志，而是正式结算（算排名 + 写晋级 + 落库 + 广播），
    // 否则 terminated 永远不持久化，赛事会卡在"动一下就报错"的软死锁。
    await _terminateRace(tournament, race, stageKey || tournament.status, 'timeout');
  }
}

/** Called by the server scheduler while holding the race mutation lock. */
async function processRaceTimersUnlocked(tournament, now = Date.now()) {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race || (stageKey !== 'stage2' && stageKey !== 'stage3')) return { type: 'none' };
  _ensureRoundState(race);

  const decision = getRaceTimerDecision(race, now);
  if (decision.type === 'map_timeout') {
    const result = await _terminateRace(tournament, race, stageKey, 'timeout');
    return { type: 'map_timeout', ...result };
  }
  if (decision.type === 'turn_timeout') {
    const timedOutPlayerId = race.players[race.currentPlayerIndex]?.userId;
    const timedOutTurn = race.currentTurn;
    const result = await _skipTurn(tournament, race, 'skip_timeout', timedOutPlayerId);
    return { type: 'turn_timeout', timedOutPlayerId: String(timedOutPlayerId), timedOutTurn, ...result };
  }
  return decision;
}

/**
 * 终止跑图
 */
async function _terminateRace(tournament, race, stageKey, reason) {
  if (race.terminated) {
    return {
      reason: race.terminatedReason,
      rankings: calculateRaceRankings(race.players),
      qualifiedIds: stageKey === 'stage2'
        ? (tournament.qualifiedStage2 || []).map(String)
        : (tournament.qualifiedStage3 || []).map(String)
    };
  }
  race.terminated = true;
  race.terminatedReason = reason;
  race.status = 'terminated';
  race.turnStartedAt = null;

  const config = RACE_CONFIGS[stageKey];
  const rankings = calculateRaceRankings(race.players);
  const qualifiedIds = rankings.slice(0, config.advanceCount).map(r => r.userId.toString());

  if (stageKey === 'stage2') {
    tournament.qualifiedStage2 = qualifiedIds;
  } else if (stageKey === 'stage3') {
    tournament.qualifiedStage3 = qualifiedIds;
  }

  await tournament.save();

  // 旧赛事同步：回写跑图排名
  const eventType = stageKey === 'stage2' ? 'stage2_complete' : 'stage3_complete';
  await syncToOldTournament(tournament, eventType, {
    rankings: rankings.map(r => ({ userId: String(r.userId), rank: r.rank })),
    qualifiedIds
  });

  broadcast('map_timeout', {
    terminated: true,
    reason,
    rankings,
    qualifiedIds
  });

  return { reason, rankings, qualifiedIds };
}

async function terminateRace(tournament, reason = 'admin') {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race || (stageKey !== 'stage2' && stageKey !== 'stage3')) throw new Error('不在跑图阶段');
  return _terminateRace(tournament, race, stageKey, reason);
}

/**
 * 区域相邻检查
 */
function _isAdjacentZone(player, zoneIndex, zoneCount) {
  // 选手的当前位置（起点顶点）与相邻区域的关系
  // 六边形：起点顶点两侧的三角区域即可达（vertex i 邻接 zone i 和 zone i-1）
  // 四边形：类似逻辑
  if (zoneCount === 6) {
    return zoneIndex === player.startVertex ||
           zoneIndex === (player.startVertex + 5) % 6;
  }
  if (zoneCount === 4) {
    return zoneIndex === player.startVertex ||
           zoneIndex === (player.startVertex + 3) % 4;
  }
  return false;
}

/**
 * 预览最近墙壁挑战（红心/白色红心用）
 * P0-1: 从 CHALLENGE_TASKS / fallbackTasks 读取
 */
async function _peekChallenge(race, player) {
  const wallIndex = player.currentLayer;
  if (wallIndex === 1) {
    const stageKey = race.mapConfig?.shape === 'hexagon' ? 'stage2' : 'stage3';
    const fixed = FIXED_WALL_CHALLENGES[stageKey];
    return fixed ? { ...snapshotChallenge(fixed, fixed.id), wallLabel: race.mapConfig.wallLabels[wallIndex] } : null;
  }
  if (race.taskPool.remaining.length === 0) {
    _refillTaskPool(race);
  }
  const nextTaskId = race.taskPool.remaining[race.taskPool.remaining.length - 1];

  // 先查常量任务，再查补充任务
  let rawChallenge = getTaskById(nextTaskId);
  if (!rawChallenge) {
    rawChallenge = getFallbackTask(nextTaskId, race.taskPool.fallbackTasks);
  }

  if (!rawChallenge) return null;

  return {
    ...snapshotChallenge(rawChallenge, nextTaskId),
    wallLabel: race.mapConfig.wallLabels[wallIndex]
  };
}

/**
 * 获取跑图配置
 */
function getRaceConfig(stageKey) {
  return RACE_CONFIGS[stageKey] || null;
}

module.exports = {
  initRace,
  startRace,
  currentRace,
  playerAction,
  useItem,
  challengeResult,
  skipTurn,
  terminateRace,
  processRaceTimersUnlocked,
  getRaceConfig,
  RACE_CONFIGS,
  // 内部导出以支持测试
  getTaskById,
  getFallbackTask,
  _drawTask
};
