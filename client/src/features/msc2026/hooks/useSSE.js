// ============================================================
// useSSE.js — MSC 2026 SSE 连接管理 Hook
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { createSSEUrl } from '../api/msc2026Api';

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
  const handlersRef = useRef(handlers);
  const connectRef = useRef(null);

  // 保持 handlers 引用最新
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!enabled) return;

    const url = createSSEUrl(since);
    const es = new EventSource(url);

    es.onopen = () => {
      console.log('[MSC SSE] 已连接');
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
      console.warn('[MSC SSE] 连接断开，3s 后重连...');
      es.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => connectRef.current(), 3000);
    };

    eventSourceRef.current = es;
  }, [enabled, since]);

  useEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    connect();
    return () => {
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
