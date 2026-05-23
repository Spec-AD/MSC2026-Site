/**
 * 🏆 赛事状态机 & 校验规则
 *
 * 负责状态流转合法性校验、阶段进入条件验证、回退级联清空策略。
 * 所有状态变更必须经由本模块的 canTransition / validateTransition。
 */

// ── 状态转移矩阵 ────────────────────────────────────
const TRANSITIONS = {
  DRAFT:        ['REGISTRATION'],
  REGISTRATION: ['DRAFT', 'QUALIFYING'],
  QUALIFYING:   ['ONGOING'],
  ONGOING:      ['FINISHED'],
  FINISHED:     ['ONGOING', 'ARCHIVED'],
  ARCHIVED:     [],
};

/** 检查源状态到目标状态是否合法 */
function canTransition(currentStatus, targetStatus) {
  return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

// ── 状态变更校验链 ───────────────────────────────────

/**
 * 全量校验：返回 { valid, errors }
 * @param {Object} tournament — Tournament document
 * @param {string} targetStatus
 */
function validateTransition(tournament, targetStatus) {
  const errors = [];
  const t = tournament;

  // 通用校验
  if (!t.title) errors.push('赛事标题不能为空');
  if (!canTransition(t.status, targetStatus)) {
    errors.push(`不能从 ${t.status} 直接切换至 ${targetStatus}`);
  }

  // ── 进入 REGISTRATION 前 ──
  if (targetStatus === 'REGISTRATION') {
    if (!t.timeApproved) errors.push('赛事时间未获管理员审核');
    if (!t.registrationStart || !t.registrationEnd) errors.push('必须设置报名起止时间');
    if (t.registrationStart && t.registrationEnd && t.registrationStart >= t.registrationEnd) {
      errors.push('报名开始时间必须早于结束时间');
    }
    if (t.startTime && t.registrationEnd && t.registrationEnd >= t.startTime) {
      errors.push('报名结束时间必须早于比赛开始时间');
    }
    if (!t.rules || t.rules.trim().length === 0) errors.push('请填写比赛规则');
    if (!t.registrationForm || t.registrationForm.length === 0) errors.push('请设置报名表');
  }

  // ── 进入 QUALIFYING 前 ──
  // 注意：不再校验 registrationEnd 已到。窗口独立于阶段存在，
  // 管理员可在报名窗口仍开放时手动推进至 QUALIFYING。
  // 报名人数和预选曲目的校验保留。
  if (targetStatus === 'QUALIFYING') {
    const regCount = t.registrations?.length ?? 0;
    if (regCount < 2) errors.push(`报名人数不足（当前 ${regCount}，需至少 2 人）`);
    if (!t.qualifierSongs || t.qualifierSongs.length === 0) errors.push('必须设置至少一首预选赛曲目');
  }

  // ── 进入 ONGOING 前 ──
  if (targetStatus === 'ONGOING') {
    const qualified = t.advanceCount ?? 0;
    if (qualified < 2) errors.push('晋级人数不足，无法进入正赛');
    if (!t.qualifierScores || t.qualifierScores.length === 0) {
      errors.push('未录入预选赛成绩');
    }
  }

  // ── 进入 FINISHED 前 ──
  if (targetStatus === 'FINISHED') {
    if (!t.matches || t.matches.length === 0) errors.push('未创建正赛对局');
    const unfinished = t.matches?.filter(m => m.status !== 'FINISHED') ?? [];
    if (unfinished.length > 0) errors.push(`还有 ${unfinished.length} 场比赛未结束`);
  }

  // ── 进入 ARCHIVED ──
  if (targetStatus === 'ARCHIVED') {
    if (t.status !== 'FINISHED') errors.push('只有已结束的赛事才能归档');
    if (!t.results || t.results.length === 0) errors.push('未设置比赛结果');
  }

  return { valid: errors.length === 0, errors };
}

// ── 回退级联清空策略 ─────────────────────────────────

/**
 * 回退时执行级联数据清空。
 * 返回需要 $unset 的字段对象，由调用方通过 mongoose update 执行。
 *
 * 细则（来自 spec §十二建议一）：
 * - FINISHED → ONGOING: 保留 matches（重置为 PENDING），清空 results / resultAnnouncement
 * - ONGOING → QUALIFYING: 清空 matches / bracketGenerated / bracketGeneratedAt / groups
 * - QUALIFYING → REGISTRATION: 清空 qualifierScores / advanceCount（保留 qualifierSongs）
 * - REGISTRATION → DRAFT: 清空 registrations
 */
function getRollbackUnset(currentStatus, targetStatus) {
  const unset = {};

  if (currentStatus === 'FINISHED' && targetStatus === 'ONGOING') {
    unset.results = 1;
    unset.resultAnnouncement = 1;
    // matches 保留但通过 update 批量重置为 PENDING（不在 unset 里处理）
  }
  if (currentStatus === 'ONGOING' && targetStatus === 'QUALIFYING') {
    unset.matches = 1;
    unset.bracketGenerated = 1;
    unset.bracketGeneratedAt = 1;
    unset.groups = 1;
  }
  if (currentStatus === 'QUALIFYING' && targetStatus === 'REGISTRATION') {
    unset.qualifierScores = 1;
    unset.advanceCount = 1;
  }
  if (currentStatus === 'REGISTRATION' && targetStatus === 'DRAFT') {
    unset.registrations = 1;
  }

  return unset;
}

/**
 * 回退后需要额外执行的 patch 逻辑（由调用方执行）
 */
function getRollbackPatch(currentStatus, targetStatus) {
  const setFields = {};

  // FINISHED → ONGOING: 所有 match 重置为 PENDING
  if (currentStatus === 'FINISHED' && targetStatus === 'ONGOING') {
    setFields['matches.$[].status'] = 'PENDING';
    setFields['matches.$[].winner'] = null;
    setFields['matches.$[].scoreA'] = 0;
    setFields['matches.$[].scoreB'] = 0;
    setFields['matches.$[].finishedAt'] = null;
  }

  return setFields;
}

// ── 自动推进检查 ──────────────────────────────────────

/**
 * 检查是否有自动推进的条件达成。
 * 返回 { shouldAdvance, targetStatus, reason }
 */
function checkAutoAdvance(tournament) {
  const now = new Date();

  // 窗口与阶段解耦后，REGISTRATION 不再自动推进到 QUALIFYING
  // 由管理员手动控制推进时机
  // checkStageAutoAdvance 定时任务中保留 registrationEnd 到后的通知提醒

  if (tournament.status === 'ONGOING') {
    if (tournament.matches?.length > 0) {
      const allFinished = tournament.matches.every(m => m.status === 'FINISHED');
      if (allFinished) {
        return { shouldAdvance: true, targetStatus: 'FINISHED', reason: '所有比赛已结束' };
      }
    }
  }

  return { shouldAdvance: false, targetStatus: null, reason: null };
}

module.exports = {
  TRANSITIONS,
  canTransition,
  validateTransition,
  getRollbackUnset,
  getRollbackPatch,
};
