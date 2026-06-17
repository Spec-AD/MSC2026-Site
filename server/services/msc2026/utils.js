/**
 * MSC 2026 工具函数
 * b1.7.11.patch-02
 */

const MSC2026Tournament = require('../../models/MSC2026Tournament');
const User = require('../../models/User');
const mongoose = require('mongoose');

// ── Fisher-Yates Shuffle ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toIdString(value) {
  if (value == null) return '';
  return String(value._id || value);
}

function assertObjectIdList(ids, expectedCount, label = 'ID列表') {
  if (!Array.isArray(ids)) throw new Error(`${label}必须是数组`);
  if (expectedCount != null && ids.length !== expectedCount) {
    throw new Error(`${label}需要恰好 ${expectedCount} 项，收到 ${ids.length} 项`);
  }
  const normalized = ids.map(toIdString);
  if (normalized.some(id => !mongoose.Types.ObjectId.isValid(id))) {
    throw new Error(`${label}包含非法ID`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${label}不能包含重复ID`);
  }
  return normalized;
}

function normalizeScoreInput(score) {
  if (!score || typeof score !== 'object') return score;
  const normalized = { ...score };
  ['achievement', 'perfectRate'].forEach((key) => {
    if (typeof normalized[key] === 'string' && normalized[key].trim() !== '') {
      normalized[key] = Number(normalized[key]);
    }
  });
  if (typeof normalized.dxScore === 'string' && normalized.dxScore.trim() !== '') {
    normalized.dxScore = Number(normalized.dxScore);
  }
  return normalized;
}

// ── 加载赛事或 404 ──
async function loadTournament(res) {
  const t = await MSC2026Tournament.findOne();
  if (!t) {
    res && res.status(404).json({ msg: 'MSC 2026 赛事不存在' });
    return null;
  }
  return t;
}

// ── 权限校验 ──
/**
 * @param {object} user - req.user (含 id, role)
 * @param {object} tournament - 赛事文档
 * @param {string} required - 'admin' | 'referee' | 'player' | 'any'
 * @returns {{ allowed: boolean, msg?: string }}
 */
async function checkPermission(user, tournament, required) {
  if (!user) return { allowed: false, msg: '未登录' };

  const u = await User.findById(user.id);
  if (!u) return { allowed: false, msg: '用户不存在' };
  if (u.role === 'ADM') return { allowed: true };

  if (required === 'admin') return { allowed: false, msg: '仅管理员可操作' };

  if (required === 'player') {
    // 选手总归是自己，具体操作由路由层再校验
    return { allowed: true };
  }

  if (required === 'referee') {
    if (u.role === 'CHM') return { allowed: true };
    if (u.role === 'TO') return { allowed: true };
    return { allowed: false, msg: '仅裁判/管理员可操作' };
  }

  return { allowed: true };
}

// ── 数据校验 ──
// patch-02: 修复 P2-1 perfectRate 小数位校验、P2-2 0值跳过校验
function validateScore(score) {
  score = normalizeScoreInput(score);
  const errors = [];
  if (!Number.isFinite(score?.achievement) || score.achievement < 0 || score.achievement > 101) {
    errors.push('完成率须为 0-101 的数字');
  }
  // 精度校验：最多4位小数（patch-02: 用 != null 避免 0 被跳过）
  if (score.achievement != null && !/^\d{1,3}(\.\d{1,4})?$/.test(String(score.achievement))) {
    errors.push('完成率最多4位小数');
  }
  if (!Number.isFinite(score?.dxScore) || score.dxScore < 0 || !Number.isInteger(score.dxScore)) {
    errors.push('DX分数须为非负整数');
  }
  // patch-02: perfectRate 校验最多2位小数
  if (!Number.isFinite(score?.perfectRate) || score.perfectRate < 0 || score.perfectRate > 100) {
    errors.push('大P率须为 0-100 的数字');
  } else if (score.perfectRate != null && !/^\d{1,3}(\.\d{1,2})?$/.test(String(score.perfectRate))) {
    errors.push('大P率最多2位小数');
  }
  return errors;
}

// ── 晋级判定（阶段1/4 逐级比较） ──
function determineWinner(scores1, scores2) {
  const total1 = scores1.reduce((s, sc) => s + (sc ? sc.achievement : 0), 0);
  const total2 = scores2.reduce((s, sc) => s + (sc ? sc.achievement : 0), 0);

  if (total1 !== total2) return total1 > total2 ? 'p1' : 'p2';

  const dx1 = scores1.reduce((s, sc) => s + (sc ? sc.dxScore : 0), 0);
  const dx2 = scores2.reduce((s, sc) => s + (sc ? sc.dxScore : 0), 0);
  if (dx1 !== dx2) return dx1 > dx2 ? 'p1' : 'p2';

  const pr1 = scores1.reduce((s, sc) => s + (sc ? sc.perfectRate : 0), 0);
  const pr2 = scores2.reduce((s, sc) => s + (sc ? sc.perfectRate : 0), 0);
  if (pr1 !== pr2) return pr1 > pr2 ? 'p1' : 'p2';

  return 'tie';
}

// ── 跑图排名计算 ──
function calculateRaceRankings(players) {
  const ranked = [...players].map(p => ({
    userId: p.userId,
    finishOrder: p.finishOrder,
    finishTimestamp: p.finishTimestamp,
    currentLayer: p.currentLayer || 0,
    startVertex: p.startVertex ?? 999
  }));

  // 先按到达终点排序（到达者在前），同到达按时间戳
  // 未到达者按 currentLayer 降序
  ranked.sort((a, b) => {
    if (a.finishOrder != null && b.finishOrder != null) return a.finishOrder - b.finishOrder;
    if (a.finishOrder != null) return -1;
    if (b.finishOrder != null) return 1;
    if (b.currentLayer !== a.currentLayer) return b.currentLayer - a.currentLayer;
    return a.startVertex - b.startVertex;
  });

  ranked.forEach((r, i) => { r.rank = i + 1; });
  return ranked;
}

module.exports = {
  shuffle,
  loadTournament,
  checkPermission,
  validateScore,
  normalizeScoreInput,
  assertObjectIdList,
  toIdString,
  determineWinner,
  calculateRaceRankings
};
