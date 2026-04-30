// ============================================================
// qualifierStore.js — Zustand: 预选赛成绩 & 排名管理
// 依据：Tournament_API_Contract.md §三 (event→store 映射)
// ============================================================
import { create } from 'zustand';
import * as api from '../api/tournamentApi';

export const useQualifierStore = create((set, get) => ({
  // ---- State ----
  songs: [], // 预选曲目
  scores: [], // 成绩录入缓存（本地草稿）
  rankings: [], // 总榜数据
  songBreakdown: [], // 单曲排行（每曲独立排名）
  cutoff: 0, // 晋级人数
  cutoffScore: 0, // 晋级分数线
  loading: false,
  error: null,

  // ---- Actions ----

  /** 设置预选曲目 */
  setSongs: (songs) => set({ songs }),

  /** 加载预选排名 */
  fetchRankings: async (id, cutoff) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getQualifierRankings(id, cutoff);
      const { rankings, cutoff: c, cutoffScore, songBreakdown } = res.data;
      set({
        rankings: rankings || [],
        songBreakdown: songBreakdown || [],
        cutoff: c || 0,
        cutoffScore: cutoffScore || 0,
        loading: false,
      });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.msg || '加载排名失败', loading: false });
      throw err;
    }
  },

  /** 批量提交预选赛成绩 */
  submitScores: async (id, scores) => {
    try {
      const res = await api.submitQualifierScores(id, scores);
      set({ scores: [] }); // 清空本地缓存
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '成绩提交失败' };
    }
  },

  /** 确认晋级名单 */
  advance: async (id, { qualifiedUserIds, overrideCutoff } = {}) => {
    try {
      const res = await api.advanceQualifier(id, { qualifiedUserIds, overrideCutoff });
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '晋级推进失败' };
    }
  },

  /** 导出预选成绩 CSV */
  exportCSV: async (id) => {
    try {
      const res = await api.exportQualifierCSV(id);
      // 触发浏览器下载
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `qualifier_scores_${id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw err.response?.data || { msg: '导出失败' };
    }
  },

  /** 本地缓存成绩草稿（未提交前） */
  cacheScore: (entry) => {
    set((state) => {
      // 覆盖同一选手+同一曲目
      const filtered = state.scores.filter(
        (s) => !(s.userId === entry.userId && s.songName === entry.songName)
      );
      return { scores: [...filtered, entry] };
    });
  },

  /** 移除缓存的成绩 */
  removeCachedScore: (userId, songName) => {
    set((state) => ({
      scores: state.scores.filter(
        (s) => !(s.userId === userId && s.songName === songName)
      ),
    }));
  },

  /** 清空成绩缓存 */
  clearCachedScores: () => set({ scores: [] }),

  /** SSE: 处理排名更新事件 */
  handleQualifierUpdate: (event) => {
    set((state) => ({
      rankings: state.rankings.map((r) =>
        r.userId === event.userId ? { ...r, rank: event.newRank } : r
      ),
    }));
    // highlight 变化行 → 由组件消费 animatedRankChange 标记
  },

  /** 重置 store */
  reset: () =>
    set({
      songs: [],
      scores: [],
      rankings: [],
      songBreakdown: [],
      cutoff: 0,
      cutoffScore: 0,
      loading: false,
      error: null,
    }),
}));

// ---- Selectors ----

/** 获取指定选手在排名中的位置 */
export const selectPlayerRank = (state, userId) =>
  state.rankings.find((r) => r.userId === userId);

/** 判断选手是否晋级（排名 <= cutoff） */
export const selectIsQualified = (state, userId) => {
  const rank = state.rankings.find((r) => r.userId === userId);
  return rank ? rank.rank <= state.cutoff : false;
};

/** 获取晋级线以上的选手 */
export const selectQualifiedPlayers = (state) =>
  state.rankings.filter((r) => r.rank <= state.cutoff);

/** 获取未提交的缓存成绩数量 */
export const selectCachedScoreCount = (state) => state.scores.length;
