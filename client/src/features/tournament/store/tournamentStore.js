// ============================================================
// tournamentStore.js — Zustand: 赛事核心状态管理
// 依据：Tournament_API_Contract.md §三 (event→store 映射)
// ============================================================
import { create } from 'zustand';
import * as api from '../api/tournamentApi';

const STATUS_LABELS = {
  DRAFT: '草稿',
  REGISTRATION: '报名中',
  QUALIFYING: '预选赛中',
  ONGOING: '正赛进行中',
  FINISHED: '已结束',
  ARCHIVED: '已归档',
};

const STATUS_COLORS = {
  DRAFT: 'bg-zinc-800/50 text-zinc-400 border-white/10',
  REGISTRATION: 'bg-green-500/20 text-green-400 border-green-500/30',
  QUALIFYING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ONGOING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  FINISHED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  ARCHIVED: 'bg-zinc-900/80 text-zinc-600 border-white/5',
};

export const useTournamentStore = create((set, get) => ({
  // ---- State ----
  tournament: null,
  loading: false,
  error: null,

  // ---- Actions ----

  /** 加载赛事详情 */
  fetchTournament: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getTournamentDetail(id);
      set({ tournament: res.data, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.msg || '加载赛事失败';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  /** 加载赛事列表 */
  fetchList: async () => {
    set({ loading: true });
    try {
      const res = await api.getTournamentList();
      set({ loading: false });
      return res.data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  /** 推进赛事状态 */
  transition: async (id, targetStatus) => {
    try {
      const res = await api.transitionTournament(id, targetStatus);
      const { from, to, tournament } = res.data.data;
      set({ tournament });
      return { from, to, tournament };
    } catch (err) {
      throw err.response?.data || { msg: '状态切换失败' };
    }
  },

  /** 撤回赛事状态 (ADM only) */
  rollback: async (id, targetStatus) => {
    try {
      const res = await api.rollbackTournament(id, targetStatus);
      const { from, to, tournament } = res.data.data;
      set({ tournament });
      return { from, to, tournament };
    } catch (err) {
      throw err.response?.data || { msg: '状态回退失败' };
    }
  },

  /** 创建赛事 */
  create: async (data) => {
    try {
      const res = await api.createTournament(data);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '创建失败' };
    }
  },

  /** 更新赛事基本信息 */
  update: async (id, data) => {
    try {
      const res = await api.updateTournament(id, data);
      set({ tournament: res.data?.data || res.data });
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '更新失败' };
    }
  },

  /** 选手报名 */
  register: async (id, formData) => {
    try {
      const res = await api.registerForTournament(id, formData);
      // 报名成功后刷新赛事
      await get().fetchTournament(id);
      return res.data;
    } catch (err) {
      throw err.response?.data || { msg: '报名失败' };
    }
  },

  /** SSE: 处理状态变更事件 */
  handleStateChange: (event) => {
    const { tournament } = get();
    if (!tournament) return;
    set({
      tournament: {
        ...tournament,
        status: event.to,
      },
    });
  },

  /** SSE: 处理赛事结束事件 */
  handleFinished: (event) => {
    const { tournament } = get();
    if (!tournament) return;
    set({
      tournament: {
        ...tournament,
        status: 'FINISHED',
      },
    });
    // 触发庆祝动画逻辑由组件消费此状态
  },

  /** 直接设置 tournament（用于 SSE 推送后覆盖） */
  setTournament: (tournament) => set({ tournament }),

  /** 重置 store */
  reset: () => set({ tournament: null, loading: false, error: null }),
}));

// ---- Selectors ----

export const selectStatusLabel = (status) => STATUS_LABELS[status] || status;
export const selectStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
export const selectIsManageable = (user) =>
  user && ['ADM', 'CHM', 'TO'].includes(user.role);
export const selectCanTransition = (user, tournament, targetStatus) => {
  if (!user || !tournament) return false;
  // ADM 全部操作
  if (user.role === 'ADM') return true;
  // CHM 仅限本赛事
  if (user.role === 'CHM') {
    // TODO: 检查 user._id 是否在 tournament.managers 中
    return true; // 暂时放行，等后端二次校验
  }
  return false;
};
