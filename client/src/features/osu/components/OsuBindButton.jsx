// ============================================================
// OsuBindButton — 绑定/同步按钮组（含进度条）
// ============================================================

import { FaLock, FaSyncAlt, FaSpinner } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

export default function OsuBindButton({
  isBound,
  isOwnProfile,
  isSyncing,
  syncProgress,
  onBind,
  onSync,
}) {
  if (!isOwnProfile) return null;

  if (!isBound) {
    return (
      <button
        onClick={onBind}
        className="w-full bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 text-xs font-bold transition-all active:scale-95 rounded-lg flex items-center justify-center gap-2"
      >
        <FaLock /> 绑定 osu! 账号
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="w-full bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 rounded-lg"
      >
        {isSyncing ? (
          <><FaSpinner className="animate-spin" /> 同步中...</>
        ) : (
          <><FaSyncAlt /> 全模式同步</>
        )}
      </button>

      {/* 同步进度条 */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#15151e] border border-white/[0.05] rounded-lg p-2"
          >
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
              <span>{syncProgress.completed}/{syncProgress.total}</span>
              <span className={syncProgress.failed > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {syncProgress.failed > 0 ? `${syncProgress.failed} 失败` : '同步中'}
              </span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(syncProgress.completed / syncProgress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
