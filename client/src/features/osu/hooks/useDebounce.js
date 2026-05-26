// ============================================================
// useDebounce — 通用防抖 hook
// b1.7.07: 使用 JSON.stringify 做值比较，避免对象引用问题
// ============================================================

import { useState, useEffect, useRef } from 'react';

/**
 * 对 value 进行防抖，delay ms 内值不变时才返回最新值
 * 使用 JSON.stringify 深度比较，避免对象引用不一致导致重复触发
 * @param {any} value - 需要防抖的值
 * @param {number} delay - 防抖延迟（ms），默认 500
 * @returns {any} 防抖后的值
 */
export default function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  const lastValueRef = useRef(value);

  useEffect(() => {
    // 深度比较：仅当值实际变化时才重置 timer
    if (JSON.stringify(value) === JSON.stringify(lastValueRef.current)) return;
    lastValueRef.current = value;

    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), delay]);

  return debounced;
}
