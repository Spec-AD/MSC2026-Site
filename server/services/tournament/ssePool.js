/**
 * 🏆 SSE 连接池（共享模块）
 *
 * 按 tournamentId 分桶管理 SSE 客户端连接。
 * 路由层和定时任务层均可使用。
 */

const sseClients = new Map(); // tournamentId -> Set<res>

function addSSEClient(tournamentId, res) {
  if (!sseClients.has(tournamentId)) sseClients.set(tournamentId, new Set());
  sseClients.get(tournamentId).add(res);
}

function removeSSEClient(tournamentId, res) {
  const clients = sseClients.get(tournamentId);
  if (clients) clients.delete(res);
}

function pushSSE(tournamentId, event, data) {
  const clients = sseClients.get(tournamentId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try { client.write(payload); } catch (_) { clients.delete(client); }
  });
}

module.exports = { addSSEClient, removeSSEClient, pushSSE };
