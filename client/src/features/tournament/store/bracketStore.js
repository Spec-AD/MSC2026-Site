// ============================================================
// bracketStore.js — Zustand: 对阵表状态 + 动画队列管理
// 依据：Tournament_API_Contract.md §三 (event→store 映射)
// ============================================================
import { create } from 'zustand';
import * as api from '../api/tournamentApi';

export const useBracketStore = create((set, get) => ({
  // ---- State ----
  matches: [],
  rounds: [],
  byePositions: [],
  totalRounds: 0,
  byeCount: 0,
  bracketGenerated: false,
  animationQueue: [], // SSE 推送的 matchResult 逐条播放
  isAnimating: false,
  loading: false,
  error: null,

  // ---- Actions ----

  /** 加载对阵表 */
  fetchBracket: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getBracket(id);
      const { matches, rounds, byePositions, totalRounds, byeCount } = res.data;
      set({
        matches: matches || [],
        rounds: rounds || [],
        byePositions: byePositions || [],
        totalRounds: totalRounds || rounds?.length || 0,
        byeCount: byeCount || 0,
        bracketGenerated: true,
        loading: false,
      });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.msg || '加载对阵表失败', loading: false });
      throw err;
    }
  },

  /** 生成对阵表 */
  generate: async (id, seeding = 'qualifier') => {
    try {
      const res = await api.generateBracket(id, seeding);
      const { matches, totalRounds, byeCount } = res.data.data;
      set({ matches, totalRounds, byeCount, bracketGenerated: true });
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '对阵表生成失败' };
    }
  },

  /** 录入比赛成绩 */
  updateMatch: async (tournamentId, matchId, data) => {
    try {
      const res = await api.updateMatch(tournamentId, matchId, data);
      const { match, nextMatchUpdate } = res.data.data;

      // 更新本地 matches 中对应 match
      set((state) => ({
        matches: state.matches.map((m) =>
          m.bracketPosition === match.bracketPosition ? { ...m, ...match } : m
        ),
      }));

      // 如果推进到下一轮，更新下一轮对阵（兼容 matchIndex / bracketPosition）
      if (nextMatchUpdate) {
        const nextPos = nextMatchUpdate.bracketPosition ?? nextMatchUpdate.matchIndex;
        if (nextPos !== undefined) {
          set((state) => ({
            matches: state.matches.map((m) =>
              m.bracketPosition === nextPos
                ? { ...m, ...nextMatchUpdate }
                : m
            ),
          }));
        }
      }

      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '成绩录入失败' };
    }
  },

  // ---- animationQueue 管理 ----

  /** SSE: 将 matchResult 事件压入动画队列 */
  enqueueAnimation: (event) => {
    const id = `anim_${event.matchId}_${Date.now()}`;
    set((state) => ({
      animationQueue: [
        ...state.animationQueue,
        { id, event, played: false, timestamp: Date.now() },
      ],
    }));
    // 触发播放
    get().playNext();
  },

  /** 逐条播放动画队列（延迟 800ms/条） */
  playNext: () => {
    const { animationQueue, isAnimating } = get();
    if (isAnimating) return;

    const next = animationQueue.find((item) => !item.played);
    if (!next) {
      set({ isAnimating: false });
      return;
    }

    set({ isAnimating: true });

    // 标记为 played
    set((state) => ({
      animationQueue: state.animationQueue.map((item) =>
        item.id === next.id ? { ...item, played: true } : item
      ),
    }));

    // 更新本地 match 数据
    set((state) => ({
      matches: state.matches.map((m) => {
        if (m._id === next.event.matchId || m.bracketPosition === next.event.matchId) {
          return {
            ...m,
            status: 'FINISHED',
            winner: next.event.winnerId,
            scoreA: next.event.scoreA,
            scoreB: next.event.scoreB,
          };
        }
        // 如果下一轮对阵被更新（SSE 用 matchIndex，API 响应用 bracketPosition）
        if (next.event.nextMatchUpdate) {
          const nextPos = next.event.nextMatchUpdate.bracketPosition ?? next.event.nextMatchUpdate.matchIndex;
          if (m.bracketPosition === nextPos) {
            return { ...m, ...next.event.nextMatchUpdate };
          }
        }
        return m;
      }),
    }));

    // 800ms 后清理并播放下一条
    setTimeout(() => {
      set((state) => ({
        animationQueue: state.animationQueue.filter((item) => item.id !== next.id),
        isAnimating: false,
      }));
      get().playNext();
    }, 800);
  },

  /** 直接设置 matches（从 SSE 或外部更新） */
  setMatches: (matches) => set({ matches }),

  /** 重置 store */
  reset: () =>
    set({
      matches: [],
      rounds: [],
      byePositions: [],
      totalRounds: 0,
      byeCount: 0,
      bracketGenerated: false,
      animationQueue: [],
      isAnimating: false,
      loading: false,
      error: null,
    }),
}));

// ---- Selectors ----

/** 按轮次分组的 matches，方便分列渲染 */
export const selectMatchesByRound = (state) => {
  const byRound = {};
  state.matches.forEach((m) => {
    const key = m.roundName || m.round || 'Unknown';
    if (!byRound[key]) byRound[key] = [];
    byRound[key].push(m);
  });
  return byRound;
};

/** 获取动画队列长度 */
export const selectAnimationQueueLength = (state) => state.animationQueue.length;

/** 是否有待播放动画 */
export const selectHasPendingAnimations = (state) =>
  state.animationQueue.some((item) => !item.played);
