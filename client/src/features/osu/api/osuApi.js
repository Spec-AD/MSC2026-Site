// ============================================================
// osu! 前端 API 封装 — b1.7（对齐琉璃字段表 v1.0）
// 所有 osu 相关请求统一走此模块
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截器自动注入 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器统一错误处理
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.msg || err.message || '网络错误';
    return Promise.reject({ ...err, userMessage: msg });
  }
);

// ----- 通用 -----

/** 获取 MODE_MAP（前端 ID → 后端 apiMode 映射） */
let modeMapCache = null;
export async function fetchModeMap() {
  if (modeMapCache) return modeMapCache;
  const { data } = await api.get('/osu/modes');
  modeMapCache = data;
  return data;
}

/** 清除 MODE_MAP 缓存 */
export function clearModeMapCache() {
  modeMapCache = null;
}

// ----- 现有端点 -----

/** OAuth 绑定 */
export function bindOsuAccount(code, redirectUri) {
  return api.post('/osu/bind', { code, redirect_uri: redirectUri });
}

/** 同步单模式数据（b1.7 新版：返回 stats + bp 字段） */
export function syncOsuScores(mode) {
  return api.post('/users/sync-osu', { mode });
}

/** b1.7 新增 — 一键全模式同步 */
export function syncAllOsuScores() {
  return api.post('/osu/sync-all');
}

// ----- 八大模块端点 -----

/** pass — 最近通过的成绩 */
export function getPass(mode) {
  return api.get('/osu/pass', { params: { mode } });
}

/** pass/all — 四模式最近通过 */
export function getPassAll() {
  return api.get('/osu/pass', { params: { all: true } });
}

/** recent — 最近所有成绩（含 F，可分页+日期筛选+强制刷新） */
export function getRecent(params) {
  return api.get('/osu/recent', { params });
}

/** score/:bid — 指定谱面最好成绩 */
export function getScore(bid, params = {}) {
  return api.get(`/osu/score/${bid}`, { params });
}

/** best — BP 列表（分页） */
export function getBest(params) {
  return api.get('/osu/best', { params });
}

/** todaybest — 今日最佳成绩 */
export function getTodayBest(mode) {
  return api.get('/osu/todaybest', { params: { mode } });
}

/** info — 玩家信息实时查询（用户名/UID） */
export function getOsuInfo(query) {
  return api.get('/osu/info', { params: { q: query } });
}

/** map/:bid — 谱面信息 */
export function getBeatmap(bid) {
  return api.get(`/osu/map/${bid}`);
}

/** leaderboard/:bid — 谱面全球排行榜 */
export function getLeaderboard(bid, params = {}) {
  return api.get(`/osu/leaderboard/${bid}`, { params });
}

// ----- 用户数据（现有） -----

// ----- b1.7.07 新增端点 -----

/** 轻量同步：只拉 recent scores（Pass/TodayBest 使用） */
export function refreshLight(mode) {
  return api.post('/osu/refresh-light', { mode });
}

/** 获取用户资料（含 osuScores） */
export function getUserProfile(username) {
  return api.get(`/users/${username}?t=${Date.now()}`);
}
