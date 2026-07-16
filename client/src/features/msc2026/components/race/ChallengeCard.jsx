// ============================================================
// ChallengeCard.jsx — 挑战任务卡片（Overlay）
// ============================================================
import { FaShieldAlt, FaCheck, FaTimes, FaMusic } from 'react-icons/fa';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { CHALLENGE_TYPE_LABELS } from '../../constants/gameData';
import { formatChallengeCondition } from '../../utils/challengeFormat';
import MotionButton from '../live/MotionButton';
import { MOTION_TRANSITIONS } from '../../utils/motion';

export default function ChallengeCard({ challenge, pendingJudgement, isJudge = false, resolving, onPass, onFail, onDismiss }) {
  const reduceMotion = useReducedMotion();
  if (!challenge) return null;

  const task = challenge.effectiveChallenge || challenge;
  const originalTask = challenge.originalChallenge || task;
  const typeLabel = CHALLENGE_TYPE_LABELS[task.type] || '未知';
  const conditionText = formatChallengeCondition(task);
  const originalConditionText = formatChallengeCondition(originalTask);
  const effectResults = challenge.itemEffectResults || [];
  const legacyEffects = challenge.activeItemEffects || [];
  const hasEffects = effectResults.length > 0 || legacyEffects.length > 0;

  const statusConfig = {
    applied: { label: '生效', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25' },
    missed: { label: '概率未命中', className: 'bg-red-500/15 text-red-200 border-red-400/25' },
    not_applicable: { label: '不适用', className: 'bg-zinc-700/60 text-zinc-300 border-white/10' },
  };

  const formatPenalty = (penalty) => {
    if (!penalty) return null;
    const parts = [];
    if (penalty.backToLayer0) parts.push('回到起点');
    if (penalty.silentTurns) parts.push(`静默 ${penalty.silentTurns} 回合`);
    if (penalty.disableItemsTurns) parts.push(`禁用道具 ${penalty.disableItemsTurns} 回合`);
    return parts.length ? `挑战失败：${parts.join('、')}` : null;
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MOTION_TRANSITIONS.quick}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-5"
      onClick={() => {
        if (!pendingJudgement) onDismiss?.();
      }}
    >
      <Motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.965 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.985 }}
        transition={MOTION_TRANSITIONS.spring}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#090d14] border border-amber-400/25 rounded-2xl p-7 md:p-9 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-amber-500/10"
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

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2">
            <div className="px-5 py-4 rounded-xl bg-white/[0.035] border border-white/10">
              <p className="text-sm text-zinc-500 uppercase tracking-[0.14em]">类型</p>
              <p className="text-3xl font-bold text-white mt-1">{typeLabel}</p>
            </div>
            <div className="px-5 py-4 rounded-xl bg-amber-500/[0.07] border border-amber-400/20 min-w-0">
              <p className="text-sm text-amber-300/70 uppercase tracking-[0.14em]">最终判定条件</p>
              <p className="text-2xl md:text-3xl text-amber-200 font-black mt-1 break-words">
                {conditionText}
              </p>
            </div>
          </div>

          {hasEffects && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="px-5 py-4 rounded-xl bg-white/[0.03] border border-white/10 min-w-0">
                  <p className="text-sm text-zinc-500 uppercase tracking-[0.14em]">原始挑战</p>
                  <p className="text-base text-zinc-400 mt-1">{originalTask.difficulty || '未指定'}</p>
                  <p className="text-xl text-white font-bold mt-1 break-words">{originalConditionText}</p>
                </div>
                <div className="px-5 py-4 rounded-xl bg-sky-500/[0.07] border border-sky-400/20 min-w-0">
                  <p className="text-sm text-sky-300/80 uppercase tracking-[0.14em]">道具处理后</p>
                  <p className="text-base text-sky-200/70 mt-1">{task.difficulty || '未指定'}</p>
                  <p className="text-xl text-sky-100 font-bold mt-1 break-words">{conditionText}</p>
                </div>
              </div>

              {effectResults.length > 0 ? (
                <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
                  {effectResults.map((effect, index) => {
                    const status = statusConfig[effect.status] || statusConfig.not_applicable;
                    const penalty = formatPenalty(effect.penalty);
                    return (
                      <div key={`${effect.itemRef}-${index}`} className="px-5 py-4 bg-black/20">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg text-white font-bold">{effect.itemName}</p>
                          <span className={`text-xs px-2 py-1 rounded-lg border ${status.className}`}>{status.label}</span>
                          {effect.source === 'global' && (
                            <span className="text-xs px-2 py-1 rounded-lg border border-sky-400/20 bg-sky-500/10 text-sky-200">全局效果</span>
                          )}
                        </div>
                        <p className="text-base text-zinc-300 mt-1 break-words">{effect.summary}</p>
                        {penalty && <p className="text-sm text-red-300 mt-1">{penalty}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-4 rounded-xl bg-sky-500/10 border border-sky-400/20">
                  {legacyEffects.map((effect, index) => <p key={index} className="text-base text-sky-100">{effect}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {pendingJudgement && isJudge ? (
          <div className="grid grid-cols-2 gap-4">
            <MotionButton
              onClick={onPass}
              loading={resolving === 'pass'}
              disabled={Boolean(resolving)}
              className="py-5 rounded-xl bg-emerald-500/18 text-emerald-200 border border-emerald-400/35 hover:bg-emerald-500/25 transition-all text-2xl font-black flex items-center justify-center gap-3"
            >
              <FaCheck /> {resolving === 'pass' ? '判定中' : '通过'}
            </MotionButton>
            <MotionButton
              onClick={onFail}
              loading={resolving === 'fail'}
              disabled={Boolean(resolving)}
              className="py-5 rounded-xl bg-red-500/18 text-red-200 border border-red-400/35 hover:bg-red-500/25 transition-all text-2xl font-black flex items-center justify-center gap-3"
            >
              <FaTimes /> {resolving === 'fail' ? '判定中' : '失败'}
            </MotionButton>
          </div>
        ) : pendingJudgement ? (
          <div className="text-center py-5 rounded-xl bg-amber-500/10 border border-amber-400/20">
            <p className="text-2xl font-bold text-amber-200">等待裁判判定</p>
          </div>
        ) : (
          <p className="text-center text-lg text-zinc-500">挑战已结束</p>
        )}
      </Motion.div>
    </Motion.div>
  );
}
