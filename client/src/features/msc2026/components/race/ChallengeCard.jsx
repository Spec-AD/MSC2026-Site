// ============================================================
// ChallengeCard.jsx — 挑战任务卡片（Overlay）
// ============================================================
import { motion } from 'framer-motion';
import { FaShieldAlt, FaCheck, FaTimes, FaMusic, FaQuestion } from 'react-icons/fa';
import { CHALLENGE_TYPE_LABELS } from '../../constants/gameData';

export default function ChallengeCard({ challenge, pendingJudgement, isJudge = false, onPass, onFail, onDismiss }) {
  if (!challenge) return null;

  const task = challenge;
  const typeLabel = CHALLENGE_TYPE_LABELS[task.type] || '未知';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl shadow-amber-500/5"
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <FaShieldAlt className="text-amber-400 text-lg" />
          </div>
          <div>
            <span className="text-[10px] text-amber-400/70 uppercase tracking-wider">⚔️ 挑战任务</span>
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
              {task.taskName}
            </h3>
          </div>
        </div>

        {/* 详情 */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/5">
            <FaMusic className="text-zinc-500 text-xs" />
            <span className="text-sm text-white font-medium">{task.songTitle}</span>
            {task.difficulty && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                {task.difficulty}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-lg bg-zinc-800/30 border border-white/5">
              <p className="text-[10px] text-zinc-500">类型</p>
              <p className="text-sm text-white">{typeLabel}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-zinc-800/30 border border-white/5">
              <p className="text-[10px] text-zinc-500">条件</p>
              <p className="text-sm text-white font-mono">
                {task.type === 'eval' && `${task.evalRequirement}`}
                {task.type === 'achievement' && `${task.threshold}%`}
                {task.type === 'precision' && `DX ${task.dxRequirement} 星`}
                {task.type === 'tolerance' && `≤ ${task.toleranceLimit}`}
              </p>
            </div>
          </div>

          {/* 道具修改提示 */}
          {task.modifiedConditions && Object.keys(task.modifiedConditions).length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-[10px] text-purple-400/70">道具效果生效中</p>
              <div className="text-xs text-purple-300 mt-0.5">
                {task.activeItemEffects?.map((e, i) => (
                  <span key={i} className="block">{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {pendingJudgement && isJudge ? (
          <div className="flex gap-3">
            <button
              onClick={onPass}
              className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <FaCheck className="text-xs" /> 通过
            </button>
            <button
              onClick={onFail}
              className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <FaTimes className="text-xs" /> 不通过
            </button>
          </div>
        ) : pendingJudgement ? (
          <div className="text-center py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <p className="text-xs text-amber-400/70">⏳ 等待裁判判定...</p>
          </div>
        ) : (
          <p className="text-center text-xs text-zinc-500">挑战已结束</p>
        )}
      </motion.div>
    </motion.div>
  );
}
