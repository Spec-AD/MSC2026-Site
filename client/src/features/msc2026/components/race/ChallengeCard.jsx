// ============================================================
// ChallengeCard.jsx — 挑战任务卡片（Overlay）
// ============================================================
import { FaShieldAlt, FaCheck, FaTimes, FaMusic } from 'react-icons/fa';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { CHALLENGE_TYPE_LABELS } from '../../constants/publicGameData';
import { formatChallengeCondition } from '../../utils/challengeFormat';
import MotionButton from '../live/MotionButton';
import { MOTION_TRANSITIONS } from '../../utils/motion';
import { useState } from 'react';

export default function ChallengeCard({ challenge, pendingJudgement, isJudge = false, resolving, onPass, onFail, onDismiss }) {
  const reduceMotion = useReducedMotion();
  const [rawAchievement, setRawAchievement] = useState('');
  const [rawDxScore, setRawDxScore] = useState('');
  const [rawCompletionSeconds, setRawCompletionSeconds] = useState('');
  if (!challenge) return null;

  const task = challenge.effectiveChallenge || challenge;
  const originalTask = challenge.originalChallenge || task;
  const typeLabel = CHALLENGE_TYPE_LABELS[task.type] || '未知';
  const conditionText = formatChallengeCondition(task);
  const originalConditionText = formatChallengeCondition(originalTask);
  const effectResults = challenge.itemEffectResults || [];
  const legacyEffects = challenge.activeItemEffects || [];
  const hasEffects = effectResults.length > 0 || legacyEffects.length > 0;
  const resultSnapshot = {
    ...(rawAchievement !== '' ? { achievement: Number(rawAchievement) } : {}),
    ...(rawDxScore !== '' ? { dxScore: Number(rawDxScore) } : {}),
    ...(rawCompletionSeconds !== '' ? { completionMs: Math.round(Number(rawCompletionSeconds) * 1000) } : {}),
  };

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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm md:p-7"
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
        className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto border border-amber-300/35 border-t-4 border-t-amber-300 bg-[#070a0d]/95 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.6)] md:p-9"
      >
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs font-black text-zinc-500 md:text-sm">
          <span>MSC26 / WALL CHALLENGE</span>
          <span>MANUAL ADJUDICATION</span>
        </div>
        {/* 头部 */}
        <div className="mb-7 grid gap-5 border-b border-white/10 pb-7 md:grid-cols-[88px_minmax(0,1fr)] md:items-center">
          <div className="flex h-20 w-20 items-center justify-center border border-amber-300/35 bg-amber-300 text-black md:h-22 md:w-22">
            <FaShieldAlt className="text-3xl" />
          </div>
          <div className="min-w-0">
            <span className="font-mono text-sm font-black text-amber-300">挑战任务 / {task.wallLabel || '墙壁'}</span>
            <h3 className="mt-2 break-words text-4xl font-black leading-tight text-white md:text-7xl" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
              {task.taskName}
            </h3>
          </div>
        </div>

        {/* 详情 */}
        <div className="space-y-4 mb-7">
          <div className="grid gap-3 border-l-4 border-l-cyan-300 border-y border-r border-white/10 bg-white/[0.035] px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <FaMusic className="text-xl text-cyan-200" />
            <span className="truncate text-2xl font-black text-white md:text-4xl">{task.songTitle}</span>
            {task.difficulty && (
              <span className="shrink-0 border border-white/15 bg-white/[0.06] px-3 py-2 font-mono text-base font-black text-zinc-200 md:text-xl">
                {task.difficulty}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2">
            <div className="border border-white/10 bg-white/[0.025] px-5 py-5">
              <p className="font-mono text-xs font-black text-zinc-500">TYPE</p>
              <p className="mt-2 text-3xl font-black text-white md:text-4xl">{typeLabel}</p>
            </div>
            <div className="min-w-0 border border-amber-300/25 bg-amber-300/[0.06] px-5 py-5">
              <p className="font-mono text-xs font-black text-amber-300/70">FINAL CONDITION</p>
              <p className="mt-2 break-words text-2xl font-black text-amber-100 md:text-4xl">
                {conditionText}
              </p>
            </div>
          </div>

          {hasEffects && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="min-w-0 border border-white/10 bg-white/[0.025] px-5 py-4">
                  <p className="font-mono text-xs font-black text-zinc-500">ORIGINAL</p>
                  <p className="text-base text-zinc-400 mt-1">{originalTask.difficulty || '未指定'}</p>
                  <p className="text-xl text-white font-bold mt-1 break-words">{originalConditionText}</p>
                </div>
                <div className="min-w-0 border border-sky-300/25 bg-sky-300/[0.06] px-5 py-4">
                  <p className="font-mono text-xs font-black text-sky-300/80">AFTER ITEM</p>
                  <p className="text-base text-sky-200/70 mt-1">{task.difficulty || '未指定'}</p>
                  <p className="text-xl text-sky-100 font-bold mt-1 break-words">{conditionText}</p>
                </div>
              </div>

              {effectResults.length > 0 ? (
                <div className="divide-y divide-white/10 overflow-hidden border border-white/10">
                  {effectResults.map((effect, index) => {
                    const status = statusConfig[effect.status] || statusConfig.not_applicable;
                    const penalty = formatPenalty(effect.penalty);
                    return (
                      <div key={`${effect.itemRef}-${index}`} className="px-5 py-4 bg-black/20">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg text-white font-bold">{effect.itemName}</p>
                          <span className={`border px-2 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                          {effect.source === 'global' && (
                            <span className="border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-xs font-black text-sky-200">全局效果</span>
                          )}
                        </div>
                        <p className="text-base text-zinc-300 mt-1 break-words">{effect.summary}</p>
                        {penalty && <p className="text-sm text-red-300 mt-1">{penalty}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-sky-400/20 bg-sky-500/10 px-5 py-4">
                  {legacyEffects.map((effect, index) => <p key={index} className="text-base text-sky-100">{effect}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {pendingJudgement && isJudge && (
          <div className="mb-7 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold text-zinc-400">原始完成率（超时排名记录）</span>
              <input type="number" min="0" max="101" step="0.0001" value={rawAchievement} onChange={(event) => setRawAchievement(event.target.value)} placeholder="可选" className="mt-2 w-full border border-white/15 bg-black/35 px-4 py-3 font-mono text-2xl text-white outline-none focus:border-amber-300/50" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-zinc-400">原始 DX 分（超时排名记录）</span>
              <input type="number" min="0" step="1" value={rawDxScore} onChange={(event) => setRawDxScore(event.target.value)} placeholder="可选" className="mt-2 w-full border border-white/15 bg-black/35 px-4 py-3 font-mono text-2xl text-white outline-none focus:border-amber-300/50" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-zinc-400">完成用时（秒，同圈排序）</span>
              <input type="number" min="0" step="0.001" value={rawCompletionSeconds} onChange={(event) => setRawCompletionSeconds(event.target.value)} placeholder="可选" className="mt-2 w-full border border-white/15 bg-black/35 px-4 py-3 font-mono text-2xl text-white outline-none focus:border-amber-300/50" />
            </label>
            <p className="md:col-span-3 text-sm text-zinc-500">成功或失败仍由裁判人工确认；完成用时仅在多人同圈抵达中心时优先排序，其后依次比较失败次数、成功挑战平均完成率与累计 DX 分。</p>
          </div>
        )}

        {/* 操作按钮 */}
        {pendingJudgement && isJudge ? (
          <div className="grid grid-cols-2 gap-4">
            <MotionButton
              onClick={() => onPass?.(resultSnapshot)}
              loading={resolving === 'pass'}
              disabled={Boolean(resolving)}
              className="flex min-h-20 items-center justify-center gap-3 border border-emerald-300/45 bg-emerald-300 text-2xl font-black text-black transition-colors hover:bg-emerald-200"
            >
              <FaCheck /> {resolving === 'pass' ? '判定中' : '通过'}
            </MotionButton>
            <MotionButton
              onClick={() => onFail?.(resultSnapshot)}
              loading={resolving === 'fail'}
              disabled={Boolean(resolving)}
              className="flex min-h-20 items-center justify-center gap-3 border border-red-300/50 bg-red-500/20 text-2xl font-black text-red-100 transition-colors hover:bg-red-500/30"
            >
              <FaTimes /> {resolving === 'fail' ? '判定中' : '失败'}
            </MotionButton>
          </div>
        ) : pendingJudgement ? (
          <div className="border border-amber-300/25 bg-amber-300/10 py-6 text-center">
            <p className="text-2xl font-black text-amber-200">等待裁判判定</p>
          </div>
        ) : (
          <button type="button" onClick={onDismiss} className="w-full border border-white/15 bg-white/[0.04] py-4 text-xl font-black text-zinc-200 hover:bg-white/[0.08]">
            已登记，继续本圈
          </button>
        )}
      </Motion.div>
    </Motion.div>
  );
}
