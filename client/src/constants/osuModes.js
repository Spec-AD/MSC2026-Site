/**
 * osu! 模式定义 — 动态数据源（b1.7）
 *
 * 运行时从 GET /api/osu/modes 获取实际映射关系，
 * 不再与后端双维护。
 *
 * MODE_LABELS 作为同步 fallback，适用于页面首次渲染。
 */

import { fetchModeMap } from '../features/osu/api/osuApi';

/** 同步 fallback 标签 — 仅用于首次渲染占位 */
export const MODE_LABELS = {
  standard: 'Standard',
  taiko: 'Taiko',
  fruits: 'Catch',
  mania: 'Mania',
};

/** 异步获取完整模式列表（含 id / apiMode / label） */
export async function getModes() {
  const modeMap = await fetchModeMap();
  return Object.entries(modeMap).map(([id, apiMode]) => ({
    id,
    apiMode,
    label: MODE_LABELS[id] || id,
  }));
}

/** 异步获取前端→后端的 mode 映射对象 */
export async function getModeMap() {
  return fetchModeMap();
}

/** 根据 frontendId 获取 apiMode（异步，带缓存） */
export async function getApiMode(id) {
  const modeMap = await fetchModeMap();
  return modeMap[id] || 'osu';
}

/** 同步 fallback：根据硬编码映射获取 apiMode（用于无法 await 的场景） */
const FALLBACK_MAP = {
  standard: 'osu',
  taiko: 'taiko',
  catch: 'fruits',
  mania: 'mania',
};

export function getApiModeSync(id) {
  return FALLBACK_MAP[id] || 'osu';
}

// ====== Ruleset 图标路径映射（b1.7.09） ======

const RULESET_ICON_MAP = {
  standard: 'RulesetOsu',
  taiko: 'RulesetTaiko',
  catch: 'RulesetCatch',
  mania: 'RulesetMania',
};

/**
 * 根据 mode id 获取 Ruleset 图标路径
 * @param {string} mode - standard | taiko | catch | mania
 * @returns {string|null} 图片路径或 null
 */
export function getRulesetIconPath(mode) {
  const name = RULESET_ICON_MAP[mode];
  return name ? `/osu-resources/${name}.png` : null;
}
