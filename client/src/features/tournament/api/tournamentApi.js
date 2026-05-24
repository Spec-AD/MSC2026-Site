// ============================================================
// tournamentApi.js — PureBeat 赛事 API 调用封装
// 依据：Tournament_API_Contract.md §一
// ============================================================
import axios from 'axios';

const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const BASE = '/api/tournaments';

// ==================== 状态机 ====================

/** 推进赛事到下一状态（自动校验） */
export const transitionTournament = (id, targetStatus) =>
  axios.post(`${BASE}/${id}/transition`, { targetStatus }, { headers: authHeaders() });

/** 撤回赛事到上一状态（ADM only，级联清空） */
export const rollbackTournament = (id, targetStatus) =>
  axios.post(`${BASE}/${id}/rollback`, { targetStatus }, { headers: authHeaders() });

// ==================== 预选赛 ====================

/** 获取预选排名（可选 ?cutoff=N 标注晋级线） */
export const getQualifierRankings = (id, cutoff) =>
  axios.get(`${BASE}/${id}/qualifier/rankings`, { params: cutoff ? { cutoff } : {} });

/** 确认晋级名单并推进到 ONGOING */
export const advanceQualifier = (id, { qualifiedUserIds, overrideCutoff } = {}) =>
  axios.post(`${BASE}/${id}/qualifier/advance`, { qualifiedUserIds, overrideCutoff }, { headers: authHeaders() });

/** 导出预选成绩 CSV */
export const exportQualifierCSV = (id) =>
  axios.get(`${BASE}/${id}/qualifier/export`, { headers: authHeaders(), responseType: 'blob' });

/** 批量录入预选赛成绩 */
export const submitQualifierScores = (id, scores) =>
  axios.post(`${BASE}/${id}/qualifier/scores`, { scores }, { headers: authHeaders() });

/** 回退单条成绩（Ctrl+Z） */
export const rollbackQualifierScore = (id, userId, songName) =>
  axios.post(`${BASE}/${id}/qualifier/rollback`, { userId, songName }, { headers: authHeaders() });

/** 获取全量成绩矩阵（所有选手 × 所有曲目） */
export const getQualifierMatrix = (id) =>
  axios.get(`${BASE}/${id}/qualifier/matrix`, { headers: authHeaders() });

/** 获取指定选手的已提交预选成绩（回填用） */
export const getPlayerScores = (id, userId) =>
  axios.get(`/api/tournaments/detail/${id}/qualifier-scores`, {
    params: { userId },
    headers: authHeaders(),
  });

// ==================== 报名查看/修改 ====================

/** 获取当前用户的报名信息 */
export const getMyRegistration = (id) =>
  axios.get(`${BASE}/detail/${id}/my-registration`, { headers: authHeaders() });

/** 修改报名信息（最多 1 次） */
export const updateMyRegistration = (id, formData) =>
  axios.put(`${BASE}/detail/${id}/my-registration`, { formData }, { headers: authHeaders() });

// ==================== 审计日志 ====================

/** 获取审计日志（赛后公开/赛前仅管理） */
export const getAuditLog = (id) =>
  axios.get(`${BASE}/detail/${id}/audit-log`, { headers: authHeaders() });

// ==================== 正赛 ====================

/** 生成对阵表（基于种子分配） */
export const generateBracket = (id, seeding = 'qualifier') =>
  axios.post(`${BASE}/${id}/bracket/generate`, { seeding }, { headers: authHeaders() });

/** 重置对阵表（QUALIFYING 状态下可重新生成） */
export const resetBracket = (id) =>
  axios.post(`${BASE}/${id}/bracket/reset`, {}, { headers: authHeaders() });

/** 获取当前对阵表 */
export const getBracket = (id) =>
  axios.get(`${BASE}/${id}/bracket`);

/** 录入比赛成绩（触发自动推进） */
export const updateMatch = (id, matchId, data) =>
  axios.put(`${BASE}/${id}/matches/${matchId}`, data, { headers: authHeaders() });

// ==================== 结果与奖励 ====================

/** 获取最终排名 */
export const getResults = (id) =>
  axios.get(`${BASE}/${id}/results`);

/** 发放奖励（XP/徽章，ADM only） */
export const distributeRewards = (id, rewardTypes = ['xp']) =>
  axios.post(`${BASE}/${id}/rewards/distribute`, { rewardTypes }, { headers: authHeaders() });

/** 归档赛事（FINISHED → ARCHIVED，ADM only，不可逆） */
export const archiveTournament = (id) =>
  axios.post(`${BASE}/${id}/archive`, {}, { headers: authHeaders() });

/** 从 bracket 自动生成最终排名（FINISHED 后调用） */
export const generateResults = (id) =>
  axios.post(`${BASE}/${id}/results/generate`, {}, { headers: authHeaders() });

/** 自动生成结果公告模板 */
export const announceResults = (id) =>
  axios.post(`${BASE}/${id}/results/announce`, {}, { headers: authHeaders() });

// ==================== 基础 CRUD (兼容现有) ====================

/** 获取赛事列表 */
export const getTournamentList = () =>
  axios.get('/api/tournaments/list');

/** 获取赛事详情 */
export const getTournamentDetail = (id) =>
  axios.get(`/api/tournaments/detail/${id}`);

/** 创建赛事 */
export const createTournament = (data) =>
  axios.post('/api/tournaments/create', data, { headers: authHeaders() });

/** 更新赛事信息 */
export const updateTournament = (id, data) =>
  axios.put(`/api/tournaments/detail/${id}`, data, { headers: authHeaders() });

/** 保存阶段时间窗口（独立端点） */
export const saveStageTimes = (id, times) =>
  axios.put(`/api/tournaments/detail/${id}/stage-times`, times, { headers: authHeaders() });

/** 选手报名 */
export const registerForTournament = (id, formData) =>
  axios.post(`/api/tournaments/detail/${id}/register`, { formData }, { headers: authHeaders() });

/** 选手自行取消报名 */
export const unregisterFromTournament = (id) =>
  axios.delete(`/api/tournaments/detail/${id}/register`, { headers: authHeaders() });

/** 管理员移除某选手报名 */
export const removeRegistration = (id, targetUserId) =>
  axios.delete(`/api/tournaments/detail/${id}/registrations/${targetUserId}`, { headers: authHeaders() });

/** 导出报名表 CSV */
export const exportRegistrationsCSV = (id) =>
  axios.get(`/api/tournaments/detail/${id}/registrations/export`, { headers: authHeaders(), responseType: 'blob' });

// ==================== 曲库搜索 ====================

/**
 * 搜索曲库（统一端点）
 * 使用琉璃专用端点：GET /api/tournaments/songs/search?q=xxx
 * 响应：{ data: [{ _id, game, title, artist, ds, level, coverUrl, aliases }] }
 */
export const searchSongs = async (query = '') => {
  if (!query || query.length < 1) return [];
  try {
    const res = await axios.get('/api/tournaments/songs/search', { params: { q: query } });
    return res.data?.data || [];
  } catch {
    return [];
  }
};

// ==================== SSE（带指数退避重连） ====================

/**
 * 创建 SSE 连接，带指数退避重连
 * 策略：3s 起步 → 每次 +3s → 最大 30s → 成功连接后重置为 3s
 * 返回带 close() 方法的对象（与原生 EventSource 接口兼容）
 */
export const createEventSource = (id) => {
  let es = null;
  let closed = false;
  let retryDelay = 3000;
  let retryTimer = null;

  // 事件处理函数存储
  const listeners = {};
  const onErrorCallbacks = [];

  function connect() {
    if (closed) return;
    if (es) es.close();

    es = new EventSource(`${BASE}/${id}/events`);

    // 转发注册的事件
    Object.entries(listeners).forEach(([event, cbs]) => {
      cbs.forEach(cb => es.addEventListener(event, cb));
    });

    // 连接成功时重置退避
    es.onopen = () => {
      retryDelay = 3000;
    };

    es.onerror = () => {
      // 如果已经 closed 则不重连
      if (closed) return;

      es.close();
      es = null;

      // 指数增量，不超过 30s
      const delay = retryDelay;
      retryDelay = Math.min(retryDelay + 3000, 30000);

      if (!closed) {
        retryTimer = setTimeout(connect, delay);
      }

      onErrorCallbacks.forEach(cb => cb({ delay }));
    };
  }

  // 启动首次连接
  connect();

  return {
    /** 注册事件监听（兼容原生 addEventListener 签名） */
    addEventListener: (event, callback) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      // 如果已连接，即时注册到当前 EventSource
      if (es) es.addEventListener(event, callback);
    },

    /** 移除事件监听 */
    removeEventListener: (event, callback) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
      if (es) es.removeEventListener(event, callback);
    },

    /** 注册错误回调（参数: { delay } 重连等待时长） */
    onError: (callback) => {
      onErrorCallbacks.push(callback);
    },

    /** 关闭连接 */
    close: () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (es) es.close();
      es = null;
    },
  };
};
