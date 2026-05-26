// ============================================================
// useDebounce — 通用防抖 hook
// b1.7.07: 用于 OsuRecent 筛选条件变更后的自动刷新
// ============================================================

import { useState, useEffect } from 'react';

/**
 * 对 value 进行防抖，delay ms 内值不变时才返回最新值
 * @param {any} value - 需要防抖的值
 * @param {number} delay - 防抖延迟（ms），默认 500
 * @returns {any} 防抖后的值
 */
export default function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
