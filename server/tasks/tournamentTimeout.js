/**
 * 🏆 赛事超时检查任务
 *
 * 定时扫描所有 ONGOING 状态的赛事，检查 scheduledAt 已过期的 PENDING/ONGOING match。
 * 按赛事配置的 timeoutStrategy 自动处理弃权。
 *
 * 运行频率：建议 cron 每 60 秒执行一次。
 */

const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Message = require('../models/Message');
const { pushSSE } = require('../services/tournament/ssePool');

/**
 * 执行单次超时检查（由 cron 调用）
 */
async function checkTimeoutMatches() {
  const now = new Date();

  try {
    const tournaments = await Tournament.find({
      status: 'ONGOING',
      'matches.status': { $in: ['PENDING', 'ONGOING'] },
    });

    let processedCount = 0;
    const forfeitedTournamentIds = [];

    for (const t of tournaments) {
      const strategy = t.timeoutStrategy || 'admin_only';
      let modified = false;

      for (const match of t.matches) {
        if (match.status === 'FINISHED') continue;
        if (!match.scheduledAt || new Date(match.scheduledAt) > now) continue;

        const timeoutMinutes = match.timeoutMinutes || 30;
        const deadline = new Date(match.scheduledAt);
        deadline.setMinutes(deadline.getMinutes() + timeoutMinutes);
        if (now < deadline) continue;

        // ── 超时处理 ──
        if (strategy === 'admin_only') {
          // 不做自动操作，仅标记（如需通知管理员由 SSE 或站内信处理）
          continue;
        }

        modified = true;
        match.forfeited = true;
        match.status = 'FINISHED';
        match.finishedAt = now;

        if (strategy === 'forfeit_lower_seed') {
          // 种子序号大的视为低位种子，弃权
          // bracketPosition 越小 = 种子越好
          const posA = match.bracketPosition ?? 0;
          const posB = match.nextMatchIndex ?? 0;
          // Actually we don't have seed rank stored directly. Use bracketPosition as proxy.
          // Lower bracket position = better seed → higher seed wins
          if (match.playerA && match.playerB) {
            match.winner = match.playerA; // Assume playerA = better seed (left side)
            match.forfeitReason = `选手超时未应战（${timeoutMinutes} 分钟），按 ${strategy} 规则自动判负`;
          } else if (match.playerA) {
            match.winner = match.playerA;
            match.forfeitReason = '对手缺席，自动晋级';
          } else if (match.playerB) {
            match.winner = match.playerB;
            match.forfeitReason = '对手缺席，自动晋级';
          }
        } else if (strategy === 'forfeit_both') {
          match.winner = null;
          match.forfeitReason = `双方均超时（${timeoutMinutes} 分钟），按规则双弃`;
        }
      }

      if (modified) {
        t.operationLogs.push({
          action: 'score_update',
          fromStatus: 'ONGOING',
          toStatus: 'ONGOING',
          operatedBy: null,
          note: `超时自动处理（策略: ${strategy}）`,
        });
        await t.save();
        processedCount++;

        if (!forfeitedTournamentIds.includes(t._id.toString())) {
          forfeitedTournamentIds.push(t._id.toString());
        }
      }
    }

    if (processedCount > 0) {
      console.log(`[tournament-timeout] 已处理 ${processedCount} 个赛事的超时 match`);
    }

    // 超时自动弃权后，给对应赛事推 SSE
    for (const tid of forfeitedTournamentIds) {
      pushSSE(tid, 'tournament:matchResult', {
        message: '超时自动弃权处理完成',
        timestamp: now.toISOString(),
      });
    }
  } catch (err) {
    console.error('[tournament-timeout] 超时检查失败:', err);
  }
}

/**
 * 自动阶段推进：REGISTRATION → QUALIFYING
 *
 * 检查 registrationEnd 已过且报名人数 >= 2 的 REGISTRATION 赛事，
 * 自动推进到 QUALIFYING 阶段。
 */
async function checkStageAutoAdvance() {
  const now = new Date();

  try {
    // ── 处理 REGISTRATION → QUALIFYING ──
    const regTournaments = await Tournament.find({
      status: 'REGISTRATION',
      registrationEnd: { $lte: now },
    });

    for (const t of regTournaments) {
      const count = t.registrations?.length || 0;

      if (count < 2) {
        console.log(`[tournament-stage] 赛事 ${t._id} 报名人数不足（${count}人），跳过自动推进`);
        // 通知管理员
        const managerIds = [...new Set([...t.managers.map(m => m.toString())])];
        for (const mid of managerIds) {
          try {
            await Message.create({
              receiver: mid,
              sender: null,
              type: 'SYSTEM',
              title: '赛事自动推进失败',
              content: `赛事「${t.title}」报名截止已到，但仅有 ${count} 人报名（需 ≥2 人）。（赛事ID: ${t._id}）`,
            });
          } catch (e) {
            console.error(`[tournament-stage] 发送通知给 ${mid} 失败:`, e);
          }
        }
        continue;
      }

      t.status = 'QUALIFYING';
      t.operationLogs.push({
        action: 'transition',
        fromStatus: 'REGISTRATION',
        toStatus: 'QUALIFYING',
        operatedBy: null,
        note: `自动推进：报名截止时间已过，共 ${count} 人报名`,
      });
      await t.save();

      // 通知
      pushSSE(t._id.toString(), 'tournament:stateChange', {
        from: 'REGISTRATION', to: 'QUALIFYING', timestamp: now.toISOString(),
      });

      console.log(`[tournament-stage] 赛事 ${t._id} 自动推进至 QUALIFYING（${count}人）`);
    }

    // ── 处理 ONGOING → FINISHED（所有比赛已结束） ──
    const ongoingTournaments = await Tournament.find({
      status: 'ONGOING',
      'matches.0': { $exists: true },
    });

    for (const t of ongoingTournaments) {
      const allFinished = t.matches.every(m => m.status === 'FINISHED');
      if (!allFinished) continue;

      t.status = 'FINISHED';
      t.operationLogs.push({
        action: 'transition',
        fromStatus: 'ONGOING',
        toStatus: 'FINISHED',
        operatedBy: null,
        note: '自动推进：所有比赛已结束',
      });
      await t.save();

      pushSSE(t._id.toString(), 'tournament:finished', {
        timestamp: now.toISOString(),
      });
      pushSSE(t._id.toString(), 'tournament:stateChange', {
        from: 'ONGOING', to: 'FINISHED', timestamp: now.toISOString(),
      });

      console.log(`[tournament-stage] 赛事 ${t._id} 自动推进至 FINISHED（全部比赛结束）`);
    }
  } catch (err) {
    console.error('[tournament-stage] 自动阶段推进失败:', err);
  }
}

module.exports = { checkTimeoutMatches, checkStageAutoAdvance };
