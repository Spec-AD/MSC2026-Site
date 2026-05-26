// ============================================================
// useLightSync — 轻量同步 hook（Pass / TodayBest）
// b1.7.07: 60s 冷却 + sessionStorage 持久化
// 调 POST /api/osu/refresh-light 而不是全量 sync-all
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { refreshLight } from '../api/osuApi';

const COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = 'osu_light_sync_cooldown';

/**
 * @param {string} mode - osu 模式（standard/taiko/catch/mania）
 * @returns {{ refresh: Function, refreshing: boolean, cooldown: number, lastRefreshTime: number|null }}
 */
export default function useLightSync(mode) {
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  // 初始化从 sessionStorage 读取冷却状态 + lastRefreshTime
  useEffect(() => {
    const stored = sessionStorage.getItem(`${COOLDOWN_KEY}_${mode}`);
    if (stored) {
      const ts = parseInt(stored, 10);
      const remaining = ts + COOLDOWN_MS - Date.now();
      if (remaining > 0) {
        setCooldown(remaining);
        setLastRefreshTime(ts);
      }
    }
  }, [mode]);

  // 倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const refresh = useCallback(async () => {
    if (cooldown > 0 || refreshing) return null;
    setRefreshing(true);
    try {
      const { data } = await refreshLight(mode);
      const now = Date.now();
      sessionStorage.setItem(`${COOLDOWN_KEY}_${mode}`, String(now));
      setCooldown(COOLDOWN_MS);
      setLastRefreshTime(now);
      return data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw { userMessage: 'osu! Token 已过期，请重新绑定' };
      if (status === 429) {
        // 限流时自动延长冷却
        const extended = Date.now();
        sessionStorage.setItem(`${COOLDOWN_KEY}_${mode}`, String(extended));
        setCooldown(COOLDOWN_MS);
        throw { userMessage: 'osu! API 繁忙，请稍后重试' };
      }
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, [mode, cooldown, refreshing]);

  return { refresh, refreshing, cooldown, lastRefreshTime };
}
