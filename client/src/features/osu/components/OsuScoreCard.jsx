// ============================================================
// OsuScoreCard — 单条成绩卡片（可复用，支持点击展开详情）
// b1.7 R3: 添加背景曲绘渐变渲染
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import OsuGrade from './OsuGrade';
import OsuCoverImage from './OsuCoverImage';
import OsuBeatmapStatusBadge from './OsuBeatmapStatusBadge';
import OsuStarBadge from './OsuStarBadge';

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
      {/* 背景曲绘 — 全幅居中 · 降亮度 · 渐变融合 */}
      {hasBg && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={score.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-10"
            style={{ filter: 'brightness(0.35) blur(6px)' }}
            onError={() => setBgError(true)}
          />
          {/* 径向渐变暗角 — 中心微透曲绘，四角深暗融合背景 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 25%, rgba(12,12,17,0.7) 60%, rgba(12,12,17,0.92) 100%)',
            }}
          />
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
            {score.titleOriginal || score.title}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {score.starRating != null && (
              <OsuStarBadge starRating={score.starRating} size="sm" />
            )}
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
