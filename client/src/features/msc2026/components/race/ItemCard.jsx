// ============================================================
// ItemCard.jsx — 道具卡片（拾取/使用确认）
// ============================================================
import { FaGift, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import MotionButton from '../live/MotionButton';
import { MOTION_TRANSITIONS } from '../../utils/motion';

export default function ItemCard({ item, variant = 'pickup', onUse, onDismiss }) {
  const reduceMotion = useReducedMotion();
  if (!item) return null;

  const def = item;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MOTION_TRANSITIONS.quick}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm md:p-7"
      onClick={onDismiss}
    >
      <Motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.98 }}
        transition={MOTION_TRANSITIONS.spring}
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full max-w-3xl border-t-4 bg-[#070a0d]/95 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.6)] md:p-10
          ${def.type === 'double'
            ? 'border border-t-red-300 border-red-300/30'
            : 'border border-t-cyan-300 border-cyan-300/30'
          }`}
      >
        <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs font-black text-zinc-500 md:text-sm">
          <span>MSC26 / ITEM RECORD</span>
          <span>{variant === 'pickup' ? 'PICKUP COMPLETE' : 'INVENTORY'}</span>
        </div>
        <div className="grid gap-5 md:grid-cols-[96px_minmax(0,1fr)] md:items-start">
          <div className={`flex h-24 w-24 items-center justify-center border
            ${def.type === 'double'
              ? 'border-red-300/45 bg-red-300 text-black'
              : 'border-cyan-300/45 bg-cyan-300 text-black'
            }`}>
            <FaGift className="text-4xl" />
          </div>
          <div className="min-w-0">
            <span className={`inline-block border px-3 py-1 font-mono text-sm font-black
              ${def.type === 'buff' ? 'border-cyan-300/35 text-cyan-200' : 'border-red-300/35 text-red-200'}`}>
              {def.type === 'buff' ? '增益道具 / BUFF' : '双面道具 / DOUBLE-EDGE'}
            </span>
            <h3 className="mt-3 break-words text-4xl font-black leading-tight text-white md:text-6xl" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
              {def.name}
            </h3>
          </div>
        </div>

        {/* 效果 */}
        <p className="mt-7 border-l-4 border-l-cyan-300 bg-white/[0.035] px-5 py-5 text-xl font-bold leading-relaxed text-zinc-200 md:text-2xl">
          {def.effect || def.description}
        </p>

        {/* 概率提示 */}
        {def.probability != null && (
          <p className="mt-4 font-mono text-lg font-black text-amber-200">
            触发概率 / {(def.probability * 100).toFixed(0)}%
          </p>
        )}

        {/* 惩罚警告 */}
        {def.penalty && (
          <div className="mt-5 flex items-start gap-3 border border-red-300/30 bg-red-500/10 px-5 py-5">
            <FaExclamationTriangle className="text-red-300 text-xl mt-1 flex-shrink-0" />
            <p className="text-lg text-red-200">{typeof def.penalty === 'string' ? def.penalty : '失败将触发双面惩罚'}</p>
          </div>
        )}

        {/* 操作按钮 */}
        {variant === 'pickup' ? (
          <div className="mt-7 border border-emerald-300/30 bg-emerald-300/10 py-5 text-center">
            <FaCheck className="text-emerald-300 inline mr-2 text-xl" />
            <span className="text-2xl font-black text-emerald-200">已拾取</span>
          </div>
        ) : variant === 'inventory' && onUse ? (
          <MotionButton
            onClick={onUse}
            className="mt-7 w-full border border-amber-300 bg-amber-300 py-5 text-2xl font-black text-black transition-colors hover:bg-amber-200"
          >
            使用道具
          </MotionButton>
        ) : null}

        {onDismiss && (
          <MotionButton
            onClick={onDismiss}
            className="mt-4 w-full border border-white/15 py-4 text-lg font-black text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            关闭
          </MotionButton>
        )}
      </Motion.div>
    </Motion.div>
  );
}
