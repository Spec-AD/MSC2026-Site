/**
 * MSC 2026 — 旧赛事结果投影服务
 * b1.7.11.patch-03
 *
 * 在各阶段完成时，将 MSC2026Tournament 的「结果/排名」投影回权威 Tournament 文档，
 * 使得正式赛事记录在 matches 适配层被移除后仍然完整。
 *
 * ⚠️ 设计约束（patch-03）：matches/MSC 仅是 tournament 的临时展示适配层，
 *   绝不能写入 tournament 的权威 status/阶段。本服务只投影 groups/matches/results，
 *   永不修改 oldT.status —— 阶段推进由组织者在 tournament 端显式控制。
 * - 全部回写操作静默执行，失败只 log 不抛错（不影响主流程）
 */

const Tournament = require('../../models/Tournament');

/**
 * 结果投影到权威赛事（绝不写 status）
 * @param {object} mscTournament - MSC2026Tournament 文档
 * @param {string} eventType - 'stage1_complete' | 'stage2_complete' | 'stage3_complete' | 'stage4_complete'
 * @param {object} data - 事件数据
 */
async function syncToOldTournament(mscTournament, eventType, data = {}) {
  try {
    if (!mscTournament.oldTournamentId) return;

    const oldT = await Tournament.findById(mscTournament.oldTournamentId);
    if (!oldT) return;

    let note = '';

    switch (eventType) {

      case 'stage1_complete': {
        // 写入 6 组对阵结果到 oldT.groups / oldT.matches
        const groups = data.groups || [];
        oldT.groups = groups.map(g => ({
          name: `组${(g.order || 0) + 1}`,
          players: [g.p1, g.p2].filter(Boolean)
        }));
        oldT.matches = groups.map((g, i) => ({
          round: '12进6',
          roundName: `Round 1 - Group ${i + 1}`,
          bracketPosition: i,
          nextMatchIndex: -1,
          playerA: g.p1,
          playerB: g.p2,
          winner: g.winner || null,
          status: 'FINISHED',
          finishedAt: new Date()
        }));
        note = `阶段一完成：${groups.filter(g => g.winner).length} 名晋级`;
        break;
      }

      case 'stage2_complete': {
        // 追加跑图排名 matches
        const rankings = data.rankings || [];
        const qualified = data.qualifiedIds || [];
        const matchBaseIdx = (oldT.matches || []).length;
        rankings.forEach((r, i) => {
          oldT.matches.push({
            round: '6进4',
            roundName: `Stage 2 - Race Player ${i + 1}`,
            bracketPosition: matchBaseIdx + i,
            nextMatchIndex: -1,
            playerA: r.userId,
            winner: qualified.includes(String(r.userId)) ? r.userId : null,
            status: 'FINISHED',
            finishedAt: new Date()
          });
        });
        note = `阶段二完成：${qualified.length} 名晋级阶段三`;
        break;
      }

      case 'stage3_complete': {
        const rankings = data.rankings || [];
        const qualified = data.qualifiedIds || [];
        const matchBaseIdx = (oldT.matches || []).length;
        rankings.forEach((r, i) => {
          oldT.matches.push({
            round: '4进2',
            roundName: `Stage 3 - Race Player ${i + 1}`,
            bracketPosition: matchBaseIdx + i,
            nextMatchIndex: -1,
            playerA: r.userId,
            winner: qualified.includes(String(r.userId)) ? r.userId : null,
            status: 'FINISHED',
            finishedAt: new Date()
          });
        });
        note = `阶段三完成：${qualified.length} 名晋级决赛`;
        break;
      }

      case 'stage4_complete': {
        // 写入最终排名 results
        oldT.results = [];
        if (data.winner) {
          oldT.results.push({ rank: 1, userId: data.winner, note: 'MSC 2026 冠军' });
        }
        if (data.runnerUp) {
          oldT.results.push({ rank: 2, userId: data.runnerUp, note: 'MSC 2026 亚军' });
        }
        // 如有三四名也在 qualifiedStage2/3 中
        if (data.semiFinalists) {
          data.semiFinalists.forEach((uid, i) => {
            oldT.results.push({ rank: 3 + i, userId: uid, note: 'MSC 2026 四强' });
          });
        }
        // patch-03: 不再写 oldT.status —— 由组织者在 tournament 端显式收尾。
        note = `决赛完成：冠军 ${data.winner || '?'}`;
        break;
      }

      default:
        return;
    }

    // 写入操作日志
    if (!oldT.operationLogs) oldT.operationLogs = [];
    oldT.operationLogs.push({
      action: `msc2026_${eventType}`,
      operatedBy: data.operatedBy,
      operatedAt: new Date(),
      note
    });

    await oldT.save();
    console.log(`[syncToOldTournament] ${eventType}: ${note}`);
  } catch (err) {
    // 回写失败不应影响新赛事主流程
    console.error(`[syncToOldTournament] ${eventType} 失败（非阻塞）:`, err.message);
  }
}

module.exports = { syncToOldTournament };
