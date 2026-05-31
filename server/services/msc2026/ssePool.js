/**
 * MSC 2026 SSE 推送池
 * 独立于现有 tournament/ssePool.js，为 MSC 2026 赛事专用
 *
 * patch-02 P2-4: 角色分级广播
 * - clients 存储 { id, res, role }
 * - broadcast() 支持 { minRole } 过滤
 * - 敏感事件（道具详情/挑战预览）仅对裁判+管理员广播
 */

/** @type {Array<{ id: string, res: import('http').ServerResponse, role: string }>} */
const clients = [];

// 角色权重（数字越大权限越高）
const ROLE_WEIGHT = { anon: 0, user: 1, CHM: 2, TO: 2, ADM: 3 };

// 心跳间隔 30s
const HEARTBEAT_MS = 30_000;
// 倒计时 tick 间隔 5s
const TIMER_TICK_MS = 5_000;

/**
 * @param {string} id - 用户ID或匿名标识
 * @param {import('http').ServerResponse} res
 * @param {string} role - 用户角色 (用于广播过滤)
 */
function addClient(id, res, role = 'anon') {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`:ok\n\n`);

  const entry = { id, res, role };
  clients.push(entry);

  // 心跳
  const heartbeat = setInterval(() => {
    try { res.write(`:heartbeat\n\n`); } catch { clear(); }
  }, HEARTBEAT_MS);

  function clear() {
    clearInterval(heartbeat);
    const idx = clients.indexOf(entry);
    if (idx >= 0) clients.splice(idx, 1);
  }

  res.on('close', clear);
  res.on('error', clear);

  return clear;
}

/**
 * 推送 SSE 事件
 * @param {string} event - 事件名
 * @param {object} data  - 数据对象
 * @param {{ minRole?: string }} [opts] - 过滤选项
 */
function broadcast(event, data, opts = {}) {
  const { minRole } = opts;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const minWeight = minRole ? (ROLE_WEIGHT[minRole] || 0) : 0;

  for (let i = clients.length - 1; i >= 0; i--) {
    const c = clients[i];
    const clientWeight = ROLE_WEIGHT[c.role] || 0;
    if (clientWeight < minWeight) continue; // P2-4: 角色过滤
    try { c.res.write(payload); } catch {
      clients.splice(i, 1);
    }
  }
}

/**
 * 获取当前在线观众数
 */
function clientCount() {
  return clients.length;
}

module.exports = { addClient, broadcast, clientCount, HEARTBEAT_MS, TIMER_TICK_MS, ROLE_WEIGHT };
