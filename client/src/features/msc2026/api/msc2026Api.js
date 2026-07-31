// ============================================================
// msc2026Api.js — MSC 2026 赛事 API 调用封装
// 依据：琉璃 API 端点表 v1.0
// ============================================================
import axios from 'axios';

const BASE = '/api/msc2026';

const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ==================== 全局 ====================

/** 获取赛事全局状态 */
export const getStatus = () =>
  axios.get(`${BASE}/status`);

/** 获取赛事配置（管理员） */
export const getConfig = () =>
  axios.get(`${BASE}/config`, { headers: authHeaders() });

/** 更新赛事配置（图池/课题曲） */
export const updateConfig = (data) =>
  axios.put(`${BASE}/config`, data, { headers: authHeaders() });

/** 曲库搜索 */
export const searchSongs = (q, limit = 30) =>
  axios.get(`${BASE}/songs/search`, { params: { q, limit }, headers: authHeaders() });

/** 获取赛事选手列表 */
export const getPlayers = () =>
  axios.get(`${BASE}/players`);

// ==================== 阶段一：12进6 ====================

/** 初始化分组排位 */
export const initStage1 = (data) =>
  axios.post(`${BASE}/stage1/init`, data, { headers: authHeaders() });

/** 获取阶段一完整状态 */
export const getStage1State = () =>
  axios.get(`${BASE}/stage1/state`);

/** 获取单组详情 */
export const getStage1Group = (groupId) =>
  axios.get(`${BASE}/stage1/group/${groupId}`);

/** 选手选曲 */
export const selectStage1Song = (songId) =>
  axios.post(`${BASE}/stage1/select-song`, { songId }, { headers: authHeaders() });

/** 裁判提交成绩 */
export const submitStage1Score = (data) =>
  axios.post(`${BASE}/stage1/submit-score`, data, { headers: authHeaders() });

/** 推进回合/阶段 */
export const advanceStage1 = () =>
  axios.post(`${BASE}/stage1/advance`, {}, { headers: authHeaders() });

/** 完成当前组约 7 秒的抽签揭晓演出 */
export const completeStage1Reveal = () =>
  axios.post(`${BASE}/stage1/complete-reveal`, {}, { headers: authHeaders() });

/** 标记弃权 */
export const forfaitStage1 = (playerId) =>
  axios.post(`${BASE}/stage1/forfait`, { playerId }, { headers: authHeaders() });

/** 录入阶段一线下加赛胜者 */
export const resolveStage1Tie = (groupIndex, winnerId) =>
  axios.post(`${BASE}/stage1/resolve-tie`, { groupIndex, winnerId }, { headers: authHeaders() });

// ==================== 跑图（阶段二 & 三） ====================

/** 初始化跑图 */
export const initRace = (data) =>
  axios.post(`${BASE}/race/init`, data, { headers: authHeaders() });

/** 核验席位后显式开始跑图 */
export const startRace = () =>
  axios.post(`${BASE}/race/start`, {}, { headers: authHeaders() });

/** 获取跑图全量状态 */
export const getRaceState = () =>
  axios.get(`${BASE}/race/state`);

/** 获取地图增量数据（适合轮询） */
export const getRaceMap = () =>
  axios.get(`${BASE}/race/map`);

/** 选手回合行动 */
export const raceAction = (data) =>
  axios.post(`${BASE}/race/action`, data, { headers: authHeaders() });

/** 使用道具（不占行动） */
export const useRaceItem = (itemRef) =>
  axios.post(`${BASE}/race/use-item`, { itemRef }, { headers: authHeaders() });

/** 获取当前挑战详情 */
export const getRaceChallenge = () =>
  axios.get(`${BASE}/race/challenge`, { headers: authHeaders() });

/** 裁判判定挑战结果 */
export const submitChallengeResult = (passed, resultSnapshot) =>
  axios.post(`${BASE}/race/challenge-result`, { passed, resultSnapshot }, { headers: authHeaders() });

/** 裁判手动跳过回合 */
export const skipTurnManual = () =>
  axios.post(`${BASE}/race/skip-turn/manual`, {}, { headers: authHeaders() });

/** 选手查看持有道具 */
export const getMyRaceItems = () =>
  axios.get(`${BASE}/race/my-items`, { headers: authHeaders() });

/** 查看指定选手持有道具 */
export const getRacePlayerItems = (playerId) =>
  axios.get(`${BASE}/race/player/${playerId}/items`);

/** 强制终止跑图 */
export const terminateRace = () =>
  axios.post(`${BASE}/race/terminate`, {}, { headers: authHeaders() });

/** 阶段二推进到阶段三 */
export const advanceToStage3 = (data) =>
  axios.post(`${BASE}/stage2/advance-to-stage3`, data, { headers: authHeaders() });

/** 获取挑战历史 */
export const getChallengeHistory = () =>
  axios.get(`${BASE}/race/challenge-history`);

// ==================== 阶段四：决赛 ====================

/** 初始化决赛 */
export const initStage4 = (data) =>
  axios.post(`${BASE}/stage4/init`, data, { headers: authHeaders() });

/** 获取决赛状态 */
export const getStage4State = () =>
  axios.get(`${BASE}/stage4/state`);

/** 选手选曲 */
export const selectStage4Song = (songId) =>
  axios.post(`${BASE}/stage4/select-song`, { songId }, { headers: authHeaders() });

/** 裁判提交成绩 */
export const submitStage4Score = (data) =>
  axios.post(`${BASE}/stage4/submit-score`, data, { headers: authHeaders() });

/** 推进回合/结束 */
export const advanceStage4 = () =>
  axios.post(`${BASE}/stage4/advance`, {}, { headers: authHeaders() });

/** 录入决赛线下加赛胜者 */
export const resolveStage4Tie = (winnerId) =>
  axios.post(`${BASE}/stage4/resolve-tie`, { winnerId }, { headers: authHeaders() });

// ==================== SSE ====================

/** 创建 SSE 连接（供组件中使用 EventSource） */
export const createSSEUrl = (since) => {
  let url = `${BASE}/events`;
  if (since) url += `?since=${since}`;
  return url;
};

// ==================== 旧赛事数据 ====================

/** 获取旧赛事报名列表 + 预选赛成绩 */
export const getOldRegistrations = () =>
  axios.get(`${BASE}/old/registrations`, { headers: authHeaders() });

/** 补齐报名选手三位数代号 */
export const backfillRegistrationTokens = () =>
  axios.post(`${BASE}/old/registrations/backfill-tokens`, {}, { headers: authHeaders() });

/** 获取预选赛排名 */
export const getQualifierRankings = () =>
  axios.get(`${BASE}/old/qualifier-rankings`, { headers: authHeaders() });

/** 读取预选赛前 12 名现场签到状态 */
export const getPreMatchCheckIns = () =>
  axios.get(`${BASE}/pre-match/check-ins`, { headers: authHeaders() });

/** 签到或撤销签到 */
export const setPreMatchCheckIn = (playerId, checkedIn) =>
  axios.put(`${BASE}/pre-match/check-ins/${playerId}`, { checkedIn }, { headers: authHeaders() });

// ==================== 新初始化方式 ====================

/** 从预选赛自动初始化阶段一 */
export const initStage1FromQualifier = (data) =>
  axios.post(`${BASE}/stage1/init-from-qualifier`, data, { headers: authHeaders() });

// ==================== 撤销操作（全部 admin） ====================

/** 撤销阶段一最后选曲 */
export const undoStage1LastSong = () =>
  axios.post(`${BASE}/stage1/undo-last-song`, {}, { headers: authHeaders() });

/** 撤销阶段一最后成绩 */
export const undoStage1LastScore = (player) =>
  axios.post(`${BASE}/stage1/undo-last-score`, { player: player || 'both' }, { headers: authHeaders() });

/** 回退阶段一到指定组 */
export const revertStage1Group = (groupId) =>
  axios.post(`${BASE}/stage1/revert-group`, { groupId }, { headers: authHeaders() });

/** 重置阶段一 */
export const resetStage1 = () =>
  axios.post(`${BASE}/stage1/reset`, {}, { headers: authHeaders() });

/** 撤销最后跑图行动 */
export const undoRaceLastAction = () =>
  axios.post(`${BASE}/race/undo-last-action`, {}, { headers: authHeaders() });

/** 撤销道具使用 */
export const undoRaceItemUse = (itemRef) =>
  axios.post(`${BASE}/race/undo-item-use`, { itemRef }, { headers: authHeaders() });

/** 撤回最近一次挑战判定 */
export const revertChallengeResult = () =>
  axios.post(`${BASE}/race/revert-challenge`, {}, { headers: authHeaders() });

/** 重置跑图 */
export const resetRace = () =>
  axios.post(`${BASE}/race/reset`, {}, { headers: authHeaders() });

/** 撤销决赛选曲 */
export const undoStage4LastSong = () =>
  axios.post(`${BASE}/stage4/undo-last-song`, {}, { headers: authHeaders() });

/** 撤销决赛成绩 */
export const undoStage4LastScore = (player) =>
  axios.post(`${BASE}/stage4/undo-last-score`, { player: player || 'both' }, { headers: authHeaders() });

/** 重置决赛 */
export const resetStage4 = () =>
  axios.post(`${BASE}/stage4/reset`, {}, { headers: authHeaders() });

/** 全局回退阶段 */
export const revertStage = () =>
  axios.post(`${BASE}/revert-stage`, {}, { headers: authHeaders() });

/** 完全重置 */
export const resetAll = () =>
  axios.post(`${BASE}/reset`, {}, { headers: authHeaders() });
