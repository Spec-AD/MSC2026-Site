// ============================================================
// useOsuSync — 一键全模式同步状态管理
// 支持 4 模式串行同步 + 进度状态追踪 + token 过期检测
// 后端返回 { error: 'token_expired' } → 触发重新绑定提示
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { syncOsuScores } from '../api/osuApi';

const MODES = ['standard', 'taiko', 'catch', 'mania'];

const INITIAL_STATE = {
  standard: 'idle',
  taiko: 'idle',
  catch: 'idle',
  mania: 'idle',
};

export default function useOsuSync() {
  const [syncState, setSyncState] = useState({ ...INITIAL_STATE });
  const [currentMode, setCurrentMode] = useState(null);
  const [authError, setAuthError] = useState(false);
  const abortRef = useRef(false);

  /** 同步单个模式 */
  const syncMode = useCallback(async (mode) => {
    setSyncState(prev => ({ ...prev, [mode]: 'syncing' }));
    setCurrentMode(mode);

    try {
      await syncOsuScores(mode);
      if (!abortRef.current) {
        setSyncState(prev => ({ ...prev, [mode]: 'done' }));
      }
      return true;
    } catch (err) {
      if (!abortRef.current) {
        // 检测 token 过期
        if (err.response?.data?.error === 'token_expired') {
          setAuthError(true);
        }
        setSyncState(prev => ({ ...prev, [mode]: 'error' }));
      }
      return false;
    }
  }, []);

  /** 一键同步全部 4 模式 */
  const syncAll = useCallback(async () => {
    abortRef.current = false;
    setAuthError(false);
    setSyncState({ ...INITIAL_STATE });

    for (const mode of MODES) {
      if (abortRef.current) break;
      await syncMode(mode);
    }

    setCurrentMode(null);
    // 同步完成后短暂显示 done 状态，然后重置
    setTimeout(() => {
      if (!abortRef.current) {
        setSyncState({ ...INITIAL_STATE });
      }
    }, 3000);
  }, [syncMode]);

  /** 中止同步 */
  const abortSync = useCallback(() => {
    abortRef.current = true;
    setSyncState({ ...INITIAL_STATE });
    setCurrentMode(null);
  }, []);

  /** 重置所有状态 */
  const reset = useCallback(() => {
    abortRef.current = true;
    setSyncState({ ...INITIAL_STATE });
    setCurrentMode(null);
  }, []);

  /** 清除 authError（用户重新绑定后调用） */
  const clearAuthError = useCallback(() => {
    setAuthError(false);
  }, []);

  const isSyncing = Object.values(syncState).some(s => s === 'syncing');
  const syncProgress = {
    total: MODES.length,
    completed: Object.values(syncState).filter(s => s === 'done').length,
    failed: Object.values(syncState).filter(s => s === 'error').length,
  };

  return {
    syncState,
    currentMode,
    isSyncing,
    syncProgress,
    syncAll,
    syncMode,
    abortSync,
    reset,
    authError,
    clearAuthError,
  };
}
