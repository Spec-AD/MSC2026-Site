/**
 * MSC 2026 跑图引擎（阶段二 & 三共用）
 *
 * b1.7.11.patch-02
 *
 * 核心机制：
 * - 回合制行动（advance / pickup）
 * - 墙壁挑战（25任务库 + 纯函数读取 CHALLENGE_TASKS）
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
const { CHALLENGE_TASKS } = require('./challengeDefinitions');
const { getItemPool, getItem, applyItemEffects } = require('./itemDefinitions');
const { broadcast } = require('./ssePool');
const { syncToOldTournament } = require('./oldTournamentSync');

// ── 阶段配置映射 ──
const RACE_CONFIGS = {
  stage2: {
    shape: 'hexagon',
    layers: 3,
    wallLabels: ['密锁之墙', '准锁之墙'],
    itemPoolRefs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    zoneCount: 6,
    timeLimitMs: 45 * 60 * 1000,      // 45min（赛制规定）
    turnTimeLimitMs: 45 * 1000,         // 45s
    advanceCount: 4
  },
  stage3: {
    shape: 'square',
    layers: 2,
    wallLabels: ['叹息之墙'],
    itemPoolRefs: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    zoneCount: 4,
    timeLimitMs: 25 * 60 * 1000,       // 25min（赛制规定）
    turnTimeLimitMs: 45 * 1000,          // 45s
    advanceCount: 2
  }
};

// ── 辅助：从 CHALLENGE_TASKS 读取原始任务 ──
function getTaskById(taskId) {
  // 先查 1-25 的常量任务
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
    finishTimestamp: null
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

  // 随机先手位
  const firstPlayer = Math.floor(Math.random() * players.length);

  const raceState = {
    mapConfig: {
      shape: config.shape,
      layers: config.layers,
      wallLabels: config.wallLabels
    },
    timeLimitMs: config.timeLimitMs,
    turnTimeLimitMs: config.turnTimeLimitMs,
    totalTimeStartedAt: new Date(),
    turnStartedAt: new Date(),                    // P1-1: 首回合立即开始计时
    currentPlayerIndex: firstPlayer,
    currentTurn: 0,
    players,
    actionLog: [],
    challengeHistory: [],
    itemsOnMap: shuffledItems,
    taskPool: {
      used: [],
      remaining: [...allTaskIds],
      fallbackCount: 0,
      fallbackTasks: []
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

  // 推送首个回合
  broadcast('turn_change', {
    turn: 0,
    currentPlayerId: players[firstPlayer].userId.toString(),
    turnStartedAt: raceState.turnStartedAt
  });

  return raceState;
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

  // 超时检测
  await _checkMapTimeout(tournament, race, stageKey);
  if (race.terminated) throw new Error('地图已终止');
  if (hasPendingChallenge(race)) throw new Error('当前有待判定挑战，请先由裁判判定成功或失败');

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
  if (race.terminated) throw new Error('地图已终止');
  if (hasPendingChallenge(race)) throw new Error('当前有待判定挑战，判定前不可使用道具');

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
      return { itemRef, name: itemDef.name, effect: '预览最近墙壁挑战', challenge, success: true };
    } else if (itemRef === 19) { // 白色红心：40% 成功
      const success = Math.random() < 0.40;
      if (success) {
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
        return { itemRef, name: itemDef.name, effect: '40%概率预览墙壁挑战', challenge, success: true };
      } else {
        race.actionLog.push({
          playerId: player.userId,
          turn: race.currentTurn,
          actionType: 'use_item',
          detail: { itemRef, success: false },
          timestamp: new Date()
        });
        await tournament.save();
        broadcast('item_used', { playerId: userId.toString(), itemRef, itemName: itemDef.name, effect: '未生效（60%概率）' });
        return { itemRef, name: itemDef.name, effect: '40%概率未命中，本次未能预览墙壁挑战', success: false };
      }
    }
  }

  // 全局效果型道具（鬼面人心类）
  if (itemDef.globalEffect) {
    // 全局效果已使用就立即消耗
    itemEntry.status = 'consumed';
    const duration = itemDef.globalDuration || 1;
    // P0-2: 持久化为纯数据（不含 apply 函数）
    race.globalEffect = {
      sourceItemRef: itemRef,
      startsAtTurn: race.currentTurn,
      endsAtTurn: race.currentTurn + duration
    };
    race.actionLog.push({
      playerId: player.userId,
      turn: race.currentTurn,
      actionType: 'use_item',
      detail: { itemRef, globalEffect: true, duration },
      timestamp: new Date()
    });
    await tournament.save();
    broadcast('item_used', {
      playerId: userId.toString(),
      itemRef,
      itemName: itemDef.name,
      effect: `全体玩家效力，持续${duration}回合`,
      globalEffect: true
    });
    return { itemRef, name: itemDef.name, effect: `全体玩家效力，持续${duration}回合`, globalEffect: true };
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

  return { itemRef, name: itemDef.name, effect: itemDef.description, type: itemDef.type };
}

// ── 内部实现 ──

/**
 * 从任务池中取一个任务（纯函数方式：CHALLENGE_TASKS + fallbackTasks）
 */
function _drawTask(race) {
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
  const { taskId, task: rawChallenge } = _drawTask(race);

  if (!rawChallenge) throw new Error('任务数据丢失');

  // P1-5: 挑出当前回合 armed 的道具（不是所有历史 used 道具）
  const armedItemRefs = player.items.filter(i => i.status === 'armed').map(i => i.itemRef);

  // 构建可应用的挑战对象（含道具修改）
  let challenge = { ...rawChallenge, _achievementBonus: 0, _dxBonus: 0, _greatCancel: 0, _modifiedBy: [] };

  // 应用当前回合 armed 的道具效果
  challenge = applyItemEffects(challenge, armedItemRefs, { playerId: userId, tournament, stage: race });

  // 检查全局效果（鬼面人心）— P0-2: 从 schema 字段读取，动态调用 getItem().apply
  if (race.globalEffect && race.globalEffect.sourceItemRef != null && race.currentTurn <= race.globalEffect.endsAtTurn) {
    const globalItem = getItem(race.globalEffect.sourceItemRef);
    if (globalItem && globalItem.apply) {
      challenge = globalItem.apply(challenge, {});
    }
  }

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
    resolvedChallenge: {
      taskId: challenge.id || taskId,
      taskName: challenge.name,
      description: challenge.description,
      type: challenge.type,
      evalRequirement: challenge.evalRequirement || null,
      threshold: challenge.threshold || null,
      dxRequirement: challenge.dxRequirement || null,
      toleranceType: challenge.toleranceType || null,
      toleranceLimit: challenge.toleranceLimit || null,
      greatMax: challenge.greatMax || null,
      difficulty: challenge.difficulty,
      songTitle: challenge.songTitle,
      achievementBonus: challenge._achievementBonus || 0,
      dxBonus: challenge._dxBonus || 0,
      greatCancel: challenge._greatCancel || 0
    },
    activeItemEffects: challenge._modifiedBy || []
  });

  // 记录行动日志
  race.actionLog.push({
    playerId: userId,
    turn: race.currentTurn,
    actionType: 'advance',
    detail: { taskId, wallIndex },
    timestamp: new Date()
  });

  // turnStartedAt 设为 null，等待裁判判定
  race.turnStartedAt = null;

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
      taskId: challenge.id || taskId,
      taskName: challenge.name,
      description: challenge.description,
      type: challenge.type,
      evalRequirement: challenge.evalRequirement || null,
      threshold: challenge.threshold || null,
      dxRequirement: challenge.dxRequirement || null,
      toleranceType: challenge.toleranceType || null,
      toleranceLimit: challenge.toleranceLimit || null,
      greatMax: challenge.greatMax || null,
      difficulty: challenge.difficulty,
      songTitle: challenge.songTitle,
      wallLabel,
      wallIndex,
      activeItemEffects: challenge._modifiedBy || [],
      achievementBonus: challenge._achievementBonus || 0,
      dxBonus: challenge._dxBonus || 0,
      greatCancel: challenge._greatCancel || 0
    },
    turnEnded: false
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

  // 查找未收集道具
  const availableItem = race.itemsOnMap.find(
    i => i.zoneIndex === zoneIndex && !i.collected
  );
  if (!availableItem) throw new Error('该区域无可用道具');

  availableItem.collected = true;

  const itemDef = getItem(availableItem.itemRef);

  // P1-5: 拾取时 status 统一为 'unused'
  player.items.push({ itemRef: availableItem.itemRef, status: 'unused' });

  // 记录日志
  race.actionLog.push({
    playerId: player.userId,
    turn: race.currentTurn,
    actionType: 'pickup',
    detail: { itemRef: availableItem.itemRef, zoneIndex },
    timestamp: new Date()
  });

  // 推进回合
  await _advanceTurn(tournament, race);

  await tournament.save();

  broadcast('item_collected', {
    playerId: player.userId.toString(),
    itemRef: availableItem.itemRef,
    itemName: itemDef ? itemDef.name : '???',
    zoneIndex
  });

  return {
    action: 'pickup',
    item: {
      itemRef: availableItem.itemRef,
      name: itemDef ? itemDef.name : '???',
      type: itemDef ? itemDef.type : '???',
      description: itemDef ? itemDef.description : ''
    },
    zoneIndex,
    turnEnded: true,
    nextPlayerId: race.players[race.currentPlayerIndex].userId.toString()
  };
}

/**
 * 裁判判定挑战结果
 */
async function challengeResult(tournament, judgeId, passed) {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race) throw new Error('不在跑图阶段');

  await _checkMapTimeout(tournament, race, stageKey);
  if (race.terminated) throw new Error('地图已终止');
  if (typeof passed !== 'boolean') throw new Error('passed 必须是布尔值');

  // 找最后一个待判定的挑战（数组末尾即为最近插入）
  const pendingChallenges = race.challengeHistory.filter(ch => ch.passed === null);
  const lastChallenge = pendingChallenges[pendingChallenges.length - 1];

  if (!lastChallenge) throw new Error('无待判定的挑战');

  lastChallenge.passed = passed;
  lastChallenge.judgedBy = judgeId;
  lastChallenge.judgedAt = new Date();

  const playerIdx = race.players.findIndex(
    p => p.userId.toString() === lastChallenge.playerId.toString()
  );
  if (playerIdx < 0) throw new Error('选手不在比赛中');

  const player = race.players[playerIdx];

  if (passed) {
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
      const order = race.finishOrder.length + 1;
      player.finishOrder = order;
      player.finishTimestamp = Date.now();
      race.finishOrder.push({
        userId: player.userId,
        finishTimestamp: player.finishTimestamp,
        order
      });

      broadcast('player_moved', {
        playerId: lastChallenge.playerId.toString(),
        fromLayer: breachedWallIndex,
        toLayer: player.currentLayer,
        wallIndex: breachedWallIndex,
        wallLabel,
        reachedEnd: true,
        finishOrder: order
      });

      // 检查是否足够晋级
      const config = RACE_CONFIGS[stageKey];
      if (race.finishOrder.length >= config.advanceCount) {
        await _terminateRace(tournament, race, stageKey, 'all_qualified');
        return {
          passed: true,
          wallLabel,
          wallBreached: true,
          newLayer: player.currentLayer,
          reachedEnd: true,
          finishOrder: order,
          raceTerminated: true,
          qualifiedIds: race.finishOrder.map(f => f.userId.toString())
        };
      }
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
      }
    }

    race.actionLog.push({
      playerId: lastChallenge.playerId,
      turn: race.currentTurn,
      actionType: 'challenge_failed',
      detail: { taskId: lastChallenge.taskId },
      timestamp: new Date()
    });

    broadcast('challenge_resolved', {
      playerId: lastChallenge.playerId.toString(),
      taskId: lastChallenge.taskId,
      passed: false,
      wallBreached: false
    });

    broadcast('player_bounced', {
      playerId: lastChallenge.playerId.toString(),
      wallIndex: player.currentLayer,
      wallLabel: race.mapConfig.wallLabels[player.currentLayer] || '???'
    });
  }

  // 推进回合
  await _advanceTurn(tournament, race);

  await tournament.save();

  return {
    passed,
    wallLabel: race.mapConfig.wallLabels[player.currentLayer] || '???',
    wallBreached: passed,
    newLayer: player.currentLayer,
    bounceBack: !passed,
    nextPlayerId: race.players[race.currentPlayerIndex].userId.toString(),
    nextTurn: race.currentTurn
  };
}

/**
 * 跳过回合（超时或手动）
 */
async function skipTurn(tournament, reason = 'skip_manual') {
  const stageKey = tournament.status;
  const race = tournament[stageKey];
  if (!race) throw new Error('不在跑图阶段');
  if (race.terminated) throw new Error('地图已终止');
  if (hasPendingChallenge(race)) throw new Error('当前有待判定挑战，不能跳过回合');

  return await _skipTurn(tournament, race, reason, race.players[race.currentPlayerIndex].userId);
}

async function _skipTurn(tournament, race, reason, userId) {
  const currentPlayer = race.players[race.currentPlayerIndex];

  race.actionLog.push({
    playerId: currentPlayer.userId,
    turn: race.currentTurn,
    actionType: reason,
    detail: {},
    timestamp: new Date()
  });

  await _advanceTurn(tournament, race);
  await tournament.save();

  broadcast('turn_timeout', { playerId: userId.toString(), turn: race.currentTurn, reason });

  return { nextPlayerId: race.players[race.currentPlayerIndex].userId.toString(), turn: race.currentTurn };
}

/**
 * 推进到下一玩家回合
 */
async function _advanceTurn(tournament, race, skipAllFinished = false) {
  const playerCount = race.players.length;
  if (playerCount <= 0) throw new Error('跑图选手为空');
  let attempts = 0;

  do {
    race.currentPlayerIndex = (race.currentPlayerIndex + 1) % playerCount;
    race.currentTurn++;
    attempts++;

    const nextPlayer = race.players[race.currentPlayerIndex];

    // 跳过已到终点的
    if (nextPlayer.finishOrder != null) continue;

    // 跳过被静默的
    if (nextPlayer.silentUntilTurn != null && race.currentTurn <= nextPlayer.silentUntilTurn) {
      race.actionLog.push({
        playerId: nextPlayer.userId,
        turn: race.currentTurn,
        actionType: 'skip_timeout',
        detail: { reason: 'silent' },
        timestamp: new Date()
      });
      continue;
    }

    race.turnStartedAt = new Date();
    break;
  } while (attempts < playerCount * 2);

  // 所有人都到达终点或全部被静默 → 终止
  const activePlayers = race.players.filter(
    p => p.finishOrder == null && !(p.silentUntilTurn != null && race.currentTurn <= p.silentUntilTurn)
  );
  if (activePlayers.length === 0) {
    await _terminateRace(tournament, race, tournament.status, 'no_active_players');
    return;
  }

  // P0-2: 清除过期的全局效果
  if (race.globalEffect && race.globalEffect.sourceItemRef != null && race.currentTurn > race.globalEffect.endsAtTurn) {
    race.globalEffect = { sourceItemRef: null, startsAtTurn: null, endsAtTurn: null };
  }

  broadcast('turn_change', {
    turn: race.currentTurn,
    currentPlayerId: race.players[race.currentPlayerIndex].userId.toString(),
    turnStartedAt: race.turnStartedAt
  });
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

/**
 * 终止跑图
 */
async function _terminateRace(tournament, race, stageKey, reason) {
  race.terminated = true;
  race.terminatedReason = reason;

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
}

/**
 * 任务库补充机制（P0-1: 持久化到 fallbackTasks）
 */
function _refillTaskPool(race) {
  if (!race.taskPool.used.length) return;
  race.taskPool.fallbackCount++;
  // 从已使用的任务中随机挑选一条
  const srcId = race.taskPool.used[Math.floor(Math.random() * race.taskPool.used.length)];
  const originalTask = getTaskById(srcId);
  if (!originalTask) return;

  // 复制任务结构，保留条件不变（P0-1: 存入 fallbackTasks 以持久化）
  const newId = 1000 + race.taskPool.fallbackCount; // 虚拟ID
  const fallbackTask = {
    ...originalTask,
    id: newId,
    name: `${originalTask.name}（补充）`
  };

  race.taskPool.fallbackTasks.push(fallbackTask);
  race.taskPool.remaining.push(newId);
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
    taskId: rawChallenge.id,
    taskName: rawChallenge.name,
    description: rawChallenge.description,
    type: rawChallenge.type,
    evalRequirement: rawChallenge.evalRequirement || null,
    threshold: rawChallenge.threshold || null,
    dxRequirement: rawChallenge.dxRequirement || null,
    toleranceType: rawChallenge.toleranceType || null,
    toleranceLimit: rawChallenge.toleranceLimit || null,
    greatMax: rawChallenge.greatMax || null,
    difficulty: rawChallenge.difficulty,
    songTitle: rawChallenge.songTitle,
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
  currentRace,
  playerAction,
  useItem,
  challengeResult,
  skipTurn,
  getRaceConfig,
  RACE_CONFIGS,
  // 内部导出以支持测试
  getTaskById,
  getFallbackTask
};
