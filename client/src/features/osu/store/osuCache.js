// ============================================================
// osuCache — 搜索/排行榜状态缓存 (Zustand)
// 当前 session 内有效，刷新页面后清除
// ============================================================

import { create } from 'zustand';

const useOsuCache = create((set) => ({
  // --- 排行榜搜索 ---
  leaderboardBid: '',
  leaderboardData: null,
  setLeaderboard: (bid, data) => set({ leaderboardBid: bid, leaderboardData: data }),

  // --- 玩家查询 ---
  infoQuery: '',
  infoData: null,
  setInfo: (query, data) => set({ infoQuery: query, infoData: data }),

  // --- 谱面查询 ---
  mapQuery: '',
  mapData: null,
  setMap: (query, data) => set({ mapQuery: query, mapData: data }),

  // --- 清除全部 ---
  clearAll: () => set({
    leaderboardBid: '', leaderboardData: null,
    infoQuery: '', infoData: null,
    mapQuery: '', mapData: null,
  }),
}));

export default useOsuCache;
