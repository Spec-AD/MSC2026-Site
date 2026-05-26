// ============================================================
// osuCache — 搜索/排行榜状态缓存 + 搜索历史 (Zustand)
// 当前 session 内有效，刷新页面后清除
// ============================================================

import { create } from 'zustand';

const MAX_HISTORY = 10;

const useOsuCache = create((set, get) => ({
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

  // --- BID 搜索历史 (max 10, 去重) ---
  leaderboardHistory: [],
  addLeaderboardHistory: (entry) => set((state) => {
    const filtered = state.leaderboardHistory.filter(e => e.bid !== entry.bid);
    return { leaderboardHistory: [entry, ...filtered].slice(0, MAX_HISTORY) };
  }),
  clearLeaderboardHistory: () => set({ leaderboardHistory: [] }),

  // --- 玩家搜索历史 (max 10, 去重) ---
  playerHistory: [],
  addPlayerHistory: (entry) => set((state) => {
    const filtered = state.playerHistory.filter(e => e.username !== entry.username);
    return { playerHistory: [entry, ...filtered].slice(0, MAX_HISTORY) };
  }),
  clearPlayerHistory: () => set({ playerHistory: [] }),

  // --- 谱面查询历史 (max 10, 去重) ---
  mapHistory: [],
  addMapHistory: (entry) => set((state) => {
    const filtered = state.mapHistory.filter(e => e.bid !== entry.bid);
    return { mapHistory: [entry, ...filtered].slice(0, MAX_HISTORY) };
  }),
  clearMapHistory: () => set({ mapHistory: [] }),

  // --- 清除全部 ---
  clearAll: () => set({
    leaderboardBid: '', leaderboardData: null,
    infoQuery: '', infoData: null,
    mapQuery: '', mapData: null,
    leaderboardHistory: [],
    playerHistory: [],
    mapHistory: [],
  }),
}));

export default useOsuCache;
