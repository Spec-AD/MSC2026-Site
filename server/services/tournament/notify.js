/**
 * 🏆 站内信通知工具
 *
 * 封装批量向赛事相关用户发送系统站内信的逻辑。
 * 所有消息以系统身份发送（sender=null, type='SYSTEM'）。
 */

const Message = require('../../models/Message');

/**
 * 批量发送系统站内信
 *
 * @param {string[]} receiverIds — 接收者 userId 数组
 * @param {string} title
 * @param {string} content
 * @param {Object} [actionData] — 可选附加数据
 * @returns {Promise<{ sent: number, errors: number }>}
 */
async function sendBulkSystemMessage(receiverIds, title, content, actionData = null) {
  let sent = 0;
  let errors = 0;

  const messages = receiverIds.map(receiver => ({
    receiver,
    sender: null,
    type: 'SYSTEM',
    title,
    content,
    ...(actionData ? { actionData } : {}),
  }));

  try {
    await Message.insertMany(messages, { ordered: false });
    sent = messages.length;
  } catch (err) {
    // insertMany with ordered:false 会跳过错误，err.result 含成功数
    sent = err.result?.nInserted ?? 0;
    errors = messages.length - sent;
    console.error('[notify] 批量发送站内信部分失败:', err.message);
  }

  return { sent, errors };
}

/**
 * 赛事状态变更通知
 */
async function notifyStateChange(tournament, fromStatus, toStatus) {
  const participantIds = (tournament.registrations || []).map(r => r.userId?.toString()).filter(Boolean);
  const managerIds = (tournament.managers || []).map(m => m?.toString()).filter(Boolean);
  const allIds = [...new Set([...participantIds, ...managerIds])];
  if (allIds.length === 0) return;

  const statusLabel = {
    REGISTRATION: '📋 报名开放',
    QUALIFYING: '🎵 预选赛进行中',
    ONGOING: '🏆 正赛开始',
    FINISHED: '🎉 赛事结束',
    ARCHIVED: '📦 赛事已归档',
  };

  const title = `[${tournament.title}] 赛事状态更新：${statusLabel[toStatus] || toStatus}`;
  const content = `赛事「${tournament.title}」已从 ${fromStatus} 状态变更为 ${toStatus}。\n\n请前往赛事页面查看最新进展。`;

  await sendBulkSystemMessage(allIds, title, content, {
    tournamentId: tournament._id.toString(),
    fromStatus, toStatus,
  });
}

/**
 * 预选赛结果通知（晋级/淘汰）
 */
async function notifyQualifierResult(tournament, qualifiedIds) {
  const allRegistered = (tournament.registrations || []).map(r => r.userId?.toString()).filter(Boolean);
  const qualifiedSet = new Set(qualifiedIds.map(id => id.toString()));

  const qualifiedMsg = { ids: [], title: `[${tournament.title}] 🎉 恭喜！您已晋级正赛`, content: `您已通过「${tournament.title}」预选赛，成功晋级正赛阶段！请关注赛事页面了解对阵安排。` };
  const eliminatedMsg = { ids: [], title: `[${tournament.title}] 预选赛结果通知`, content: `感谢您参与「${tournament.title}」预选赛！本次很遗憾未能晋级，欢迎关注后续赛事。` };

  allRegistered.forEach(id => {
    if (qualifiedSet.has(id)) qualifiedMsg.ids.push(id);
    else eliminatedMsg.ids.push(id);
  });

  await Promise.all([
    qualifiedMsg.ids.length > 0 && sendBulkSystemMessage(qualifiedMsg.ids, qualifiedMsg.title, qualifiedMsg.content, { tournamentId: tournament._id.toString(), result: 'qualified' }),
    eliminatedMsg.ids.length > 0 && sendBulkSystemMessage(eliminatedMsg.ids, eliminatedMsg.title, eliminatedMsg.content, { tournamentId: tournament._id.toString(), result: 'eliminated' }),
  ]);
}

/**
 * 赛事最终结果通知（发奖后调用）
 */
async function notifyFinalResults(tournament) {
  const allRegistered = (tournament.registrations || []).map(r => r.userId?.toString()).filter(Boolean);
  if (allRegistered.length === 0) return;

  const champion = tournament.results?.find(r => r.rank === 1);
  const championName = champion?.userId?.username || '（待公布）';

  const title = `[${tournament.title}] 🏆 最终结果公布`;
  const content = `「${tournament.title}」赛事已圆满落幕！\n\n🥇 冠军：${championName}\n\n感谢所有参赛选手的精彩表现！完整结果请前往赛事页面查看。`;

  await sendBulkSystemMessage(allRegistered, title, content, {
    tournamentId: tournament._id.toString(),
  });
}

module.exports = {
  sendBulkSystemMessage,
  notifyStateChange,
  notifyQualifierResult,
  notifyFinalResults,
};
