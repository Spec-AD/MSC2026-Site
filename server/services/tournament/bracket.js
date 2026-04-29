/**
 * 🏆 对阵表生成 & 晋级推进 (单败淘汰制)
 *
 * spec §3.4:
 * - 确定总人数 N，补齐到 2^k
 * - 按预选排名 Snake 种子分配
 * - 轮空 (bye) 自动晋级
 * - 生成完整 match 数组
 */

const { snakeSeed, nextPowerOfTwo } = require('./seeding');

// ── 轮次命名 ─────────────────────────────────────────
const ROUND_NAMES = {
  8:  'Quarter-Final',
  4:  'Semi-Final',
  2:  'Final',
};

function getRoundName(roundSize) {
  return ROUND_NAMES[roundSize] || `Round of ${roundSize}`;
}

// ── 对阵生成 ─────────────────────────────────────────

/**
 * 生成单败淘汰对阵表
 *
 * @param {Array<string>} playerIds — 按种子顺序排列的选手 ID 列表
 * @returns {{ matches: Array, totalRounds: number, byeCount: number }}
 */
function generateSingleElimination(playerIds) {
  const n = playerIds.length;
  if (n < 2) {
    return { matches: [], totalRounds: 0, byeCount: 0 };
  }

  const size = nextPowerOfTwo(n);
  const totalRounds = Math.log2(size);
  const byeCount = size - n;

  // ── 生成种子排布 ──
  // 构造排名对象供 snakeSeed 使用
  const rankedPlayers = playerIds.map((id, i) => ({ userId: id, rank: i + 1 }));
  // 按 rank 升序排序（蛇形填充要求递增输入）
  rankedPlayers.sort((a, b) => a.rank - b.rank);
  // snakeSeed 需要排序后的选手
  const seeds = snakeSeed(rankedPlayers, size);

  // ── 逐轮生成 matches ──
  const matches = [];
  // 首轮 match 数 = size / 2
  const firstRoundMatchCount = size / 2;

  // 首轮
  for (let i = 0; i < firstRoundMatchCount; i++) {
    const pA = seeds[i] ?? null;                    // left side
    const pB = seeds[size - 1 - i] ?? null;          // right side

    // 轮空判定
    const isBye = !pA || !pB;
    matches.push({
      round: 1,
      roundName: getRoundName(firstRoundMatchCount * 2),
      bracketPosition: i,
      nextMatchIndex: firstRoundMatchCount + Math.floor(i / 2),
      playerA: pA || null,
      playerB: pB || null,
      scoreA: 0,
      scoreB: 0,
      winner: isBye ? (pA || pB || null) : null,
      songs: [],
      status: isBye ? 'FINISHED' : 'PENDING',
      scheduledAt: null,
      timeoutMinutes: 30,
      forfeited: false,
      forfeitReason: '',
      finishedAt: isBye ? new Date() : null,
    });
  }

  // 后续轮次 (从 Round 2 开始)
  let matchIndex = firstRoundMatchCount;
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = Math.pow(2, totalRounds - r);
    const playerCount = matchesInRound * 2;
    for (let i = 0; i < matchesInRound; i++) {
      const isFinal = matchesInRound === 1;
      matches.push({
        round: r,
        roundName: getRoundName(playerCount),
        bracketPosition: matchIndex,
        nextMatchIndex: isFinal ? -1 : matchIndex + matchesInRound + Math.floor(i / 2),
        playerA: null,      // 由上级 match 胜者填入
        playerB: null,
        scoreA: 0,
        scoreB: 0,
        winner: null,
        songs: [],
        status: 'PENDING',  // 需要等待双方胜者产生
        scheduledAt: null,
        timeoutMinutes: 30,
        forfeited: false,
        forfeitReason: '',
        finishedAt: null,
      });
      matchIndex++;
    }
  }

  return {
    matches,
    totalRounds,
    byeCount,
  };
}

// ── 晋级推进逻辑 ──────────────────────────────────────

/**
 * 当一场 match 结束时，推进 winner 到下一轮对阵。
 *
 * @param {Array} matches — 当前完整 matches 数组
 * @param {number} finishedMatchIdx — 刚结束的 match 在数组中的索引
 * @param {string} winnerId — 胜者 userId
 * @returns {{ updatedMatches: Array, nextMatchUpdate: Object|null }} — 更新后的 matches + 下一轮对阵变更
 */
function advanceWinner(matches, finishedMatchIdx, winnerId) {
  const updatedMatches = matches.map(m => ({ ...m }));
  const finished = updatedMatches[finishedMatchIdx];
  if (!finished) return { updatedMatches, nextMatchUpdate: null };

  // 更新 winner
  finished.winner = winnerId;
  finished.status = 'FINISHED';
  finished.finishedAt = new Date();

  let nextMatchUpdate = null;
  const nextIdx = finished.nextMatchIndex;
  if (nextIdx >= 0 && nextIdx < updatedMatches.length) {
    const next = { ...updatedMatches[nextIdx] };

    // 判断填入 playerA 还是 playerB
    const isLeft = finished.bracketPosition % 2 === 0; // left slot 填入 playerA
    if (!next.playerA && isLeft) {
      next.playerA = winnerId;
    } else if (!next.playerB && !isLeft) {
      next.playerB = winnerId;
    } else {
      // 另一个位置也允许填入（防 bracket 索引不对称的容错）
      if (!next.playerA) next.playerA = winnerId;
      else if (!next.playerB) next.playerB = winnerId;
    }

    // 如果双方都已确定 → 状态 PENDING
    if (next.playerA && next.playerB) {
      next.status = 'PENDING';
    }

    updatedMatches[nextIdx] = next;
    nextMatchUpdate = {
      matchIndex: nextIdx,
      match: next,
    };
  }

  return { updatedMatches, nextMatchUpdate };
}

/**
 * 检查所有 match 是否已完成
 */
function allMatchesFinished(matches) {
  return matches.length > 0 && matches.every(m => m.status === 'FINISHED');
}

module.exports = {
  generateSingleElimination,
  advanceWinner,
  allMatchesFinished,
  getRoundName,
};
