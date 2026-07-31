// ============================================================
// msc2026Store.js — Zustand: MSC 2026 全局赛事状态管理
// ============================================================
import { create } from 'zustand';
import * as api from '../api/msc2026Api';
import { STAGE_CONFIG } from '../constants/publicGameData';
import { collectSongs, warmSongCache } from '../utils/songCache';

export const useMSC2026Store = create((set, get) => ({
  // ---- 全局状态 ----
  status: 'pending',          // pending | stage1 | stage2 | stage3 | stage4 | finished
  currentStage: null,
  loading: false,
  error: null,

  // ---- 阶段一 ----
  stage1: {
    status: 'pending',
    totalGroups: 6,
    completedGroups: 0,
    currentGroupIndex: -1,
    songPool: [],
    groups: [],
    currentTurn: null,
    loading: false,
  },

  // ---- 阶段四 ----
  stage4: {
    status: 'pending',
    p1: null,
    p2: null,
    songPool: [],
    designatedSong: null,
    secretRevealed: false,
    songs: [],
    currentTurn: null,
    winner: null,
    loading: false,
  },

  // ---- 汇总 ----
  summary: {
    stage1: null,
    stage2: null,
    stage3: null,
    stage4: null,
  },

  // ---- 选手 ----
  players: [],
  playersLoading: false,

  // ==================== 全局 Actions ====================

  /** 拉取赛事全局状态 */
  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getStatus();
      const data = res.data.data;
      set({
        status: data.status,
        summary: {
          stage1: data.stage1 || null,
          stage2: data.stage2 || null,
          stage3: data.stage3 || null,
          stage4: data.stage4 || null,
        },
        loading: false,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.msg || '加载赛事状态失败';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  /** 获取当前阶段的配置信息 */
  getCurrentStageConfig: () => {
    const { status } = get();
    return STAGE_CONFIG[status] || null;
  },

  // ==================== 阶段一 Actions ====================

  fetchStage1State: async () => {
    set((s) => ({ stage1: { ...s.stage1, loading: true } }));
    try {
      const res = await api.getStage1State();
      const data = res.data.data;
      set((s) => ({
        stage1: {
          ...s.stage1,
          ...data,
          loading: false,
        },
      }));
      warmSongCache(collectSongs(data.songPool, data.groups?.flatMap(group => group.songs || []))).catch(() => {});
      return data;
    } catch (err) {
      console.error('[MSC2026] fetchStage1State failed', err);
      set((s) => ({ stage1: { ...s.stage1, loading: false } }));
      throw err;
    }
  },

  initStage1: async (data) => {
    try {
      const res = await api.initStage1(data);
      set((s) => ({
        stage1: { ...s.stage1, ...res.data.data, status: 'playing' },
      }));
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '初始化阶段一失败' };
    }
  },

  selectStage1Song: async (songId) => {
    try {
      const res = await api.selectStage1Song(songId);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '选曲失败' };
    }
  },

  submitStage1Score: async (data) => {
    try {
      const res = await api.submitStage1Score(data);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '成绩提交失败' };
    }
  },

  advanceStage1: async () => {
    try {
      const res = await api.advanceStage1();
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '推进失败' };
    }
  },

  completeStage1Reveal: async () => {
    try {
      const res = await api.completeStage1Reveal();
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '抽签揭晓确认失败' };
    }
  },

  forfaitStage1: async (playerId) => {
    try {
      const res = await api.forfaitStage1(playerId);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '弃权标记失败' };
    }
  },

  resolveStage1Tie: async (groupIndex, winnerId) => {
    try {
      const res = await api.resolveStage1Tie(groupIndex, winnerId);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '加赛结果提交失败' };
    }
  },

  // ==================== 阶段四 Actions ====================

  fetchStage4State: async () => {
    set((s) => ({ stage4: { ...s.stage4, loading: true } }));
    try {
      const res = await api.getStage4State();
      const data = res.data.data;
      set((s) => ({
        stage4: {
          ...s.stage4,
          ...data,
          loading: false,
        },
      }));
      warmSongCache(collectSongs(data.songPool, data.designatedSong, data.songs)).catch(() => {});
      return data;
    } catch (err) {
      set((s) => ({ stage4: { ...s.stage4, loading: false } }));
      throw err;
    }
  },

  initStage4: async (data) => {
    try {
      const res = await api.initStage4(data);
      set((s) => ({
        stage4: { ...s.stage4, ...res.data.data, status: res.data.data.status || 'p1_pick' },
      }));
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '初始化决赛失败' };
    }
  },

  selectStage4Song: async (songId) => {
    try {
      const res = await api.selectStage4Song(songId);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '选曲失败' };
    }
  },

  submitStage4Score: async (data) => {
    try {
      const res = await api.submitStage4Score(data);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '成绩提交失败' };
    }
  },

  advanceStage4: async () => {
    try {
      const res = await api.advanceStage4();
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '推进失败' };
    }
  },

  resolveStage4Tie: async (winnerId) => {
    try {
      const res = await api.resolveStage4Tie(winnerId);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '加赛结果提交失败' };
    }
  },

  // ==================== 工具 ====================

  /** 获取赛事选手列表 */
  fetchPlayers: async () => {
    set({ playersLoading: true });
    try {
      const res = await api.getPlayers();
      set({ players: res.data.data?.players || [], playersLoading: false });
      return res.data.data;
    } catch (err) {
      console.error('[MSC2026] fetchPlayers failed', err);
      set({ playersLoading: false });
      throw err;
    }
  },

  /** 清除错误 */
  clearError: () => set({ error: null }),

  /** 重置全部状态 */
  reset: () =>
    set({
      status: 'pending',
      loading: false,
      error: null,
      players: [],
      stage1: { status: 'pending', totalGroups: 6, completedGroups: 0, currentGroupIndex: -1, songPool: [], groups: [], currentTurn: null, loading: false },
      stage4: { status: 'pending', p1: null, p2: null, songPool: [], designatedSong: null, secretRevealed: false, songs: [], currentTurn: null, winner: null, loading: false },
    }),
}));
