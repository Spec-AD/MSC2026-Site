/**
 * osu! 模式定义 — 前端唯一数据源
 *
 * 映射关系：
 *   frontendId (standard/taiko/catch/mania)
 *   → apiMode (osu/taiko/fruits/mania)
 *   → display label
 *
 * 后端 (server/routes/osu.js) 维护了相同的 modeMap 常量。
 * 修改此文件时请同步更新后端，反之亦然。
 */

/** @type {{ id: string, apiMode: string, label: string }[]} */
export const MODES = [
  { id: 'standard', apiMode: 'osu',    label: 'osu!standard' },
  { id: 'taiko',    apiMode: 'taiko',  label: 'osu!taiko'    },
  { id: 'catch',    apiMode: 'fruits', label: 'osu!catch'    },
  { id: 'mania',    apiMode: 'mania',  label: 'osu!mania'    },
];

/** 根据 frontendId 获取 apiMode */
export const getApiMode = (id) => MODES.find((m) => m.id === id)?.apiMode || 'osu';

/** 前端→后端的 mode 映射对象，与后端 modeMap 保持同步 */
export const MODE_MAP = Object.fromEntries(MODES.map((m) => [m.id, m.apiMode]));
