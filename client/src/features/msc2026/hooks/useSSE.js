// ============================================================
// useSSE.js — MSC 2026 SSE 连接管理 Hook
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { createSSEUrl } from '../api/msc2026Api';
import { resolveApiUrl } from '../../../lib/network';

/**
 * SSE 连接 Hook
 * @param {Object} handlers - 事件处理器映射 { eventName: callback(data) }
 * @param {Object} options
 * @param {boolean} options.enabled - 是否启用连接（默认 true）
 * @param {number} options.since - 断线重连的时间戳
 */
export function useMSCSSE(handlers, { enabled = true, since } = {}) {
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const retryDelayRef = useRef(2000);
  const disposedRef = useRef(false);
  const handlersRef = useRef(handlers);
  const connectRef = useRef(null);

  // 保持 handlers 引用最新
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!enabled || disposedRef.current || !navigator.onLine) return;

    eventSourceRef.current?.close();
    const url = resolveApiUrl(createSSEUrl(since));
    const es = new EventSource(url);

    es.onopen = () => {
      console.log('[MSC SSE] 已连接');
      retryDelayRef.current = 2000;
      window.dispatchEvent(new CustomEvent('purebeat:api-online'));
    };

    // 注册所有事件
    const eventNames = [
      'turn_change', 'turn_timeout', 'score_updated',
      'player_moved', 'item_collected', 'item_used',
      'challenge_revealed', 'challenge_resolved',
      'wall_broken', 'player_bounced', 'match_finished',
      'stage_advanced', 'map_timeout', 'timer_tick',
      'song_drawn', 'item_armed',
      'race_started', 'round_started', 'round_adjudication',
      'challenge_queue_advanced', 'item_pickup_queued',
      'betting_update', 'points_updated',
    ];

    eventNames.forEach((eventName) => {
      es.addEventListener(eventName, (e) => {
        try {
          const data = JSON.parse(e.data);
          const handler = handlersRef.current?.[eventName];
          if (handler) {
            handler(data);
          }
        } catch (err) {
          console.warn(`[MSC SSE] 解析事件 ${eventName} 失败`, err);
        }
      });
    });

    es.onerror = () => {
      if (disposedRef.current) return;
      es.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const baseDelay = retryDelayRef.current;
      const delay = baseDelay + Math.round(Math.random() * 800);
      retryDelayRef.current = Math.min(baseDelay * 2, 30_000);
      console.warn(`[MSC SSE] 连接断开，${Math.round(delay / 1000)}s 后重连...`);
      window.dispatchEvent(new CustomEvent('purebeat:api-offline'));
      reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
    };

    eventSourceRef.current = es;
  }, [enabled, since]);

  useEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    disposedRef.current = false;
    const handleOnline = () => {
      retryDelayRef.current = 2000;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      connectRef.current?.();
    };
    window.addEventListener('online', handleOnline);
    connect();
    return () => {
      disposedRef.current = true;
      window.removeEventListener('online', handleOnline);
      eventSourceRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  /**
   * 获取断线重连的 since 时间戳
   */
  const getReconnectSince = useCallback(() => Date.now(), []);

  return { getReconnectSince };
}
