// ============================================================
// raceStore.js — Zustand: 跑图阶段状态管理（阶段二 & 三）
// ============================================================
import { create } from 'zustand';
import * as api from '../api/msc2026Api';

export const useRaceStore = create((set, get) => ({
  // ---- 跑图核心状态 ----
  stage: null,                    // 'stage2' | 'stage3'
  status: null,                   // 'racing' | 'terminated' | 'done'
  mapConfig: null,                // { shape, layers, wallLabels }
  timeLimitMs: null,
  turnTimeLimitMs: null,
  totalTimeStartedAt: null,
  turnStartedAt: null,

  // 回合
  currentTurn: 0,
  currentPlayerIndex: -1,
  currentPlayerId: null,
  roundNumber: 1,
  roundPosition: 0,
  turnOrder: [],
  pendingJudgementCount: 0,

  // 选手
  players: [],                    // RacePlayerState[]
  finishOrder: [],

  // 地图
  itemsOnMap: [],
  wallsBroken: [],

  // 交互
  actionLog: [],
  challengeHistory: [],

  // 当前挑战（弹窗状态）
  activeChallenge: null,
  pendingJudgement: false,

  // 当前道具拾取/使用状态
  activeItemPickup: null,
  activeItemUse: null,

  // UI
  loading: false,
  error: null,

  // 倒计时（本地计算）
  turnRemainingMs: null,
  totalRemainingMs: null,

  // ==================== Actions ====================

  /** 加载跑图全量状态 */
  fetchRaceState: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getRaceState();
      const data = res.data.data;
      const now = Date.now();

      set({
        stage: data.stage,
        status: data.status,
        mapConfig: data.mapConfig,
        timeLimitMs: data.timeLimitMs,
        turnTimeLimitMs: data.turnTimeLimitMs,
        totalTimeStartedAt: data.totalTimeStartedAt,
        turnStartedAt: data.turnStartedAt,
        currentTurn: data.currentTurn,
        currentPlayerIndex: data.currentPlayerIndex,
        currentPlayerId: data.currentPlayerId,
        roundNumber: data.roundNumber || 1,
        roundPosition: data.roundPosition || 0,
        turnOrder: data.turnOrder || [],
        pendingJudgementCount: data.pendingJudgementCount || 0,
        players: data.players,
        finishOrder: data.finishOrder || [],
        actionLog: data.actionLog || [],
        totalRemainingMs: data.totalRemainingMs === undefined
          ? Math.max(0, (data.timeLimitMs || 0) - (now - (data.totalTimeStartedAt || now)))
          : data.totalRemainingMs,
        turnRemainingMs: data.turnRemainingMs === undefined
          ? Math.max(0, (data.turnTimeLimitMs || 0) - (now - (data.turnStartedAt || now)))
          : data.turnRemainingMs,
        loading: false,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.msg || '加载跑图状态失败';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  /** 获取地图增量数据（轻量轮询） */
  fetchRaceMap: async () => {
    try {
      const res = await api.getRaceMap();
      const data = res.data.data;
      set({
        players: data.players,
        itemsOnMap: data.itemsOnMap,
        wallsBroken: data.wallsBroken || [],
        currentTurn: data.currentTurn,
        currentPlayerIndex: data.currentPlayerIndex ?? get().currentPlayerIndex,
        currentPlayerId: data.currentPlayerId,
        roundNumber: data.roundNumber || get().roundNumber,
        roundPosition: data.roundPosition ?? get().roundPosition,
        turnOrder: data.turnOrder || get().turnOrder,
      });
      return data;
    } catch (err) {
      console.warn('[RaceMap] 地图轮询失败', err);
    }
  },

  /** 选手行动 */
  performAction: async (actionData) => {
    try {
      const res = await api.raceAction(actionData);
      const data = res.data.data;

      if (data.action === 'pickup') {
        set({ activeItemPickup: data.item, activeChallenge: null, status: data.raceStatus || get().status });
      }
      if (data.action === 'advance' && data.challenge) {
        if (data.raceStatus === 'adjudicating') {
          set({ activeChallenge: null, pendingJudgement: true, activeItemPickup: null, status: 'adjudicating' });
          await get().fetchChallenge();
        } else {
          set({
            activeChallenge: { ...data.challenge, pendingJudgement: false },
            pendingJudgement: false,
            activeItemPickup: null,
            status: data.raceStatus || get().status,
          });
        }
      }
      if (data.turnEnded && data.nextPlayerId) {
        set({ currentPlayerId: data.nextPlayerId });
      }
      return data;
    } catch (err) {
      throw err.response?.data || { msg: '行动失败' };
    }
  },

  /** 管理员核验席位后开始跑图 */
  startRace: async () => {
    try {
      const res = await api.startRace();
      await get().fetchRaceState();
      return res.data.data;
    } catch (err) {
      throw err.response?.data || { msg: '开始跑图失败' };
    }
  },

  /** 使用道具 */
  useItem: async (itemRef) => {
    try {
      const res = await api.useRaceItem(itemRef);
      set({ activeItemUse: res.data.data });
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '道具使用失败' };
    }
  },

  /** 获取当前挑战详情 */
  fetchChallenge: async () => {
    try {
      const res = await api.getRaceChallenge();
      set({
        activeChallenge: res.data.data,
        pendingJudgement: Boolean(res.data.data.pendingJudgement),
        status: res.data.data.raceStatus || get().status,
      });
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '获取挑战失败' };
    }
  },

  /** 裁判判定挑战结果 */
  submitChallengeResult: async (passed, resultSnapshot) => {
    try {
      const res = await api.submitChallengeResult(passed, resultSnapshot);
      const data = res.data.data;
      set({
        activeChallenge: null,
        pendingJudgement: false,
        status: data.raceStatus || get().status,
        pendingJudgementCount: data.remainingJudgements ?? get().pendingJudgementCount,
      });
      return data;
    } catch (err) {
      throw err.response?.data || { msg: '判定提交失败' };
    }
  },

  /** 手动跳过回合 */
  skipTurn: async () => {
    try {
      const res = await api.skipTurnManual();
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '跳过失败' };
    }
  },

  /** 获取持有道具 */
  fetchMyItems: async () => {
    try {
      const res = await api.getMyRaceItems();
      return res.data.data;
    } catch (err) {
      throw err.response?.data || { msg: '获取道具失败' };
    }
  },

  /** 获取指定选手持有道具 */
  fetchPlayerItems: async (playerId) => {
    try {
      const res = await api.getRacePlayerItems(playerId);
      return res.data.data;
    } catch (err) {
      throw err.response?.data || { msg: '获取选手道具失败' };
    }
  },

  /** 终止跑图 */
  terminate: async () => {
    try {
      const res = await api.terminateRace();
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '终止失败' };
    }
  },

  // ---- 本地 UI 状态 ----

  /** 关闭挑战弹窗 */
  dismissChallenge: () => set({ activeChallenge: null, pendingJudgement: false }),

  /** 关闭道具拾取弹窗 */
  dismissItemPickup: () => set({ activeItemPickup: null }),

  /** 关闭道具使用反馈 */
  dismissItemUse: () => set({ activeItemUse: null }),

  /** 本地倒计时流逝 */
  tickTimers: () => {
    const {
      status,
      timeLimitMs,
      turnTimeLimitMs,
      totalTimeStartedAt,
      turnStartedAt,
    } = get();
    if (status !== 'racing') return;

    const now = Date.now();
    const totalStart = totalTimeStartedAt ? new Date(totalTimeStartedAt).getTime() : null;
    const turnStart = turnStartedAt ? new Date(turnStartedAt).getTime() : null;

    set({
      totalRemainingMs: totalStart && timeLimitMs != null
        ? Math.max(0, timeLimitMs - (now - totalStart))
        : get().totalRemainingMs,
      turnRemainingMs: turnStart && turnTimeLimitMs != null
        ? Math.max(0, turnTimeLimitMs - (now - turnStart))
        : null,
    });
  },

  /** SSE 事件：更新回合 */
  sseTurnChange: (data) => {
    set({
      currentTurn: data.turn,
      currentPlayerId: data.currentPlayerId,
      turnStartedAt: data.turnStartedAt,
      turnRemainingMs: get().turnTimeLimitMs,
      roundNumber: data.roundNumber || get().roundNumber,
      status: 'racing',
    });
  },

  sseRoundStarted: (data) => set({
    status: 'racing',
    roundNumber: data.roundNumber || get().roundNumber,
    turnOrder: data.turnOrder || get().turnOrder,
    currentPlayerId: data.currentPlayerId,
    currentTurn: data.turn ?? get().currentTurn,
    roundPosition: 0,
    turnStartedAt: data.turnStartedAt,
    activeChallenge: null,
    pendingJudgement: false,
    pendingJudgementCount: 0,
  }),

  sseRoundAdjudication: (data) => set({
    status: 'adjudicating',
    roundNumber: data.roundNumber || get().roundNumber,
    currentPlayerId: data.currentPlayerId,
    turnStartedAt: null,
    turnRemainingMs: null,
    pendingJudgementCount: data.pendingCount || 0,
  }),

  /** SSE 事件：更新倒计时 */
  sseTimerTick: (data) => {
    set({
      turnRemainingMs: data.turnRemainingMs ?? get().turnRemainingMs,
      totalRemainingMs: data.totalRemainingMs ?? get().totalRemainingMs,
    });
  },

  /** SSE 事件：选手移动 */
  ssePlayerMoved: (data) => {
    set((s) => ({
      players: s.players.map((p) =>
        (p._id || p.userId) === data.playerId
          ? { ...p, currentLayer: data.toLayer }
          : p
      ),
    }));
  },

  /** SSE 事件：超时 */
  sseTurnTimeout: (data) => {
    set({
      currentPlayerId: data.nextPlayerId || get().currentPlayerId,
      turnRemainingMs: get().turnTimeLimitMs,
    });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      stage: null, status: null, mapConfig: null,
      timeLimitMs: null, turnTimeLimitMs: null,
      totalTimeStartedAt: null, turnStartedAt: null,
      currentTurn: 0, currentPlayerIndex: -1, currentPlayerId: null,
      roundNumber: 1, roundPosition: 0, turnOrder: [], pendingJudgementCount: 0,
      players: [], finishOrder: [], itemsOnMap: [], wallsBroken: [],
      actionLog: [], challengeHistory: [],
      activeChallenge: null, pendingJudgement: false,
      activeItemPickup: null, activeItemUse: null,
      loading: false, error: null,
      turnRemainingMs: null, totalRemainingMs: null,
    }),
}));
