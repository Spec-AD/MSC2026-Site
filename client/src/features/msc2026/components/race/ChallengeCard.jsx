// ============================================================
// ChallengeCard.jsx — 挑战任务卡片（Overlay）
// ============================================================
import { FaShieldAlt, FaCheck, FaTimes, FaMusic } from 'react-icons/fa';
import { CHALLENGE_TYPE_LABELS } from '../../constants/gameData';

export default function ChallengeCard({ challenge, pendingJudgement, isJudge = false, onPass, onFail, onDismiss }) {
  if (!challenge) return null;

  const task = challenge;
  const typeLabel = CHALLENGE_TYPE_LABELS[task.type] || '未知';
  const conditionText =
    task.type === 'eval' ? `${task.evalRequirement}` :
    task.type === 'achievement' ? `${task.threshold}%` :
    task.type === 'precision' ? `DX ${task.dxRequirement} 星` :
    task.type === 'tolerance' ? `≤ ${task.toleranceLimit}` :
    '待确认';
  const activeEffects = task.activeItemEffects || [];

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-5"
      onClick={() => {
        if (!pendingJudgement) onDismiss?.();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#090d14] border border-amber-400/25 rounded-2xl p-7 md:p-9 max-w-4xl w-full shadow-2xl shadow-amber-500/10"
      >
        {/* 头部 */}
        <div className="flex items-start gap-5 mb-7">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/12 flex items-center justify-center border border-amber-400/20">
            <FaShieldAlt className="text-amber-300 text-2xl" />
          </div>
          <div className="min-w-0">
            <span className="text-sm text-amber-300/80 uppercase tracking-[0.18em]">挑战任务 · {task.wallLabel || '墙壁'}</span>
            <h3 className="text-3xl md:text-5xl font-bold text-white mt-1 leading-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
              {task.taskName}
            </h3>
          </div>
        </div>

        {/* 详情 */}
        <div className="space-y-4 mb-7">
          <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.045] border border-white/10">
            <FaMusic className="text-zinc-400 text-xl" />
            <span className="text-2xl text-white font-bold truncate">{task.songTitle}</span>
            {task.difficulty && (
              <span className="ml-auto shrink-0 text-base px-3 py-1 rounded-lg bg-white/[0.06] text-zinc-300 border border-white/10">
                {task.difficulty}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="px-5 py-4 rounded-xl bg-white/[0.035] border border-white/10">
              <p className="text-sm text-zinc-500 uppercase tracking-[0.14em]">类型</p>
              <p className="text-3xl font-bold text-white mt-1">{typeLabel}</p>
            </div>
            <div className="px-5 py-4 rounded-xl bg-amber-500/[0.07] border border-amber-400/20">
              <p className="text-sm text-amber-300/70 uppercase tracking-[0.14em]">成功条件</p>
              <p className="text-4xl md:text-5xl text-amber-200 font-black font-mono mt-1">
                {conditionText}
              </p>
            </div>
          </div>

          {/* 道具修改提示 */}
          {activeEffects.length > 0 && (
            <div className="px-5 py-4 rounded-xl bg-sky-500/10 border border-sky-400/20">
              <p className="text-sm text-sky-300/80 uppercase tracking-[0.14em]">道具效果生效中</p>
              <div className="text-lg text-sky-100 mt-2 grid gap-1">
                {activeEffects.map((e, i) => (
                  <span key={i} className="block">{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {pendingJudgement && isJudge ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onPass}
              className="py-5 rounded-xl bg-emerald-500/18 text-emerald-200 border border-emerald-400/35 hover:bg-emerald-500/25 transition-all text-2xl font-black flex items-center justify-center gap-3"
            >
              <FaCheck /> 通过
            </button>
            <button
              onClick={onFail}
              className="py-5 rounded-xl bg-red-500/18 text-red-200 border border-red-400/35 hover:bg-red-500/25 transition-all text-2xl font-black flex items-center justify-center gap-3"
            >
              <FaTimes /> 失败
            </button>
          </div>
        ) : pendingJudgement ? (
          <div className="text-center py-5 rounded-xl bg-amber-500/10 border border-amber-400/20">
            <p className="text-2xl font-bold text-amber-200">等待裁判判定</p>
          </div>
        ) : (
          <p className="text-center text-lg text-zinc-500">挑战已结束</p>
        )}
      </div>
    </div>
  );
}
