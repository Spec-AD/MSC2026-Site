// ============================================================
// OsuScoreCard — 单条成绩卡片（可复用，支持点击展开详情）
// b1.7 R3: 添加背景曲绘渐变渲染
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import OsuGrade from './OsuGrade';
import OsuCoverImage from './OsuCoverImage';
import OsuBeatmapStatusBadge from './OsuBeatmapStatusBadge';

export default function OsuScoreCard({ score, rank, onClick, compact = false }) {
  const [bgError, setBgError] = useState(false);
  const modsStr = score.mods?.length > 0 ? `+${score.mods.join('')}` : '';
  const accuracy = typeof score.accuracy === 'number'
    ? score.accuracy.toFixed(2)
    : score.accuracy;

  const hasBg = score.coverUrl && !bgError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => onClick?.(score)}
      className={`
        relative flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.03]
        hover:bg-white/[0.02] transition-colors group overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* 背景曲绘渐变 — 左侧 1/3 曲绘渐变过渡到右侧纯色 */}
      {hasBg && (
        <div className="absolute inset-0 z-0">
          <img
            src={score.coverUrl}
            alt=""
            className="absolute inset-0 w-1/3 h-full object-cover opacity-20"
            onError={() => setBgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#14141d]/95 to-[#0c0c11]" />
        </div>
      )}

      {/* 内容 */}
      <div className="relative z-10 flex items-center gap-2 w-full">
        {/* 排名 */}
        <span className="w-10 text-center text-sm font-mono text-zinc-600 shrink-0">
          #{rank}
        </span>

        {/* 封面 */}
        <div className="w-12 h-9 shrink-0 rounded overflow-hidden">
          <OsuCoverImage src={score.coverUrl} alt={score.title} className="w-full h-full" />
        </div>

        {/* 评级 */}
        <div className="w-10 text-center shrink-0">
          <OsuGrade grade={score.grade} size="sm" />
        </div>

        {/* 曲名 + 版本 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-200 whitespace-normal break-words leading-tight group-hover:text-pink-300 transition-colors">
            {score.title}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded whitespace-normal break-words">
              {score.version}
            </span>
            <OsuBeatmapStatusBadge status={score.beatmapStatus} />
            {modsStr && (
              <span className="text-[9px] font-bold text-rose-400 tracking-widest bg-rose-500/10 px-1 py-0.5 rounded">
                {modsStr}
              </span>
            )}
          </div>
        </div>

        {/* PP */}
        <div className="w-24 text-right shrink-0">
          <span className="text-base font-bold text-pink-400">
            {Math.round(score.pp)}
          </span>
          <span className="text-[9px] text-pink-500/60 ml-0.5">pp</span>
        </div>

        {/* Acc — 非 compact 时显示 */}
        {!compact && (
          <div className="w-20 text-right shrink-0 hidden sm:block">
            <span className="text-xs text-zinc-400 font-medium">
              {accuracy}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
