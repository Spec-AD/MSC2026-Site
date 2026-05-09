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

function toRetinaCover(url = '') {
  if (!url) return '';
  const keys = ['cover', 'card', 'list', 'slim_cover', 'slimcover'];
  for (const key of keys) {
    if (url.includes(`${key}@2x.`)) return url;
    if (url.includes(`${key}.`)) return url.replace(`${key}.`, `${key}@2x.`);
  }
  return url;
}

export default function OsuScoreCard({ score, rank, onClick, compact = false }) {
  const [bgError, setBgError] = useState(false);
  const modsStr = score.mods?.length > 0 ? `+${score.mods.join('')}` : '';
  const accuracy = typeof score.accuracy === 'number'
    ? score.accuracy.toFixed(2)
    : score.accuracy;

  const hasBg = !!score.coverUrl && !bgError;
  const retinaCoverUrl = toRetinaCover(score.coverUrl);
  const bgSrcSet = retinaCoverUrl && retinaCoverUrl !== score.coverUrl
    ? `${retinaCoverUrl} 2x, ${score.coverUrl} 1x`
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => onClick?.(score)}
      className={`
        relative flex items-center gap-2 px-3 py-3.5 min-h-[76px] border-b border-white/[0.03]
        hover:bg-white/[0.02] transition-colors group overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* 背景曲绘 — 仅提升清晰度，透明度逻辑保持不变 */}
      {hasBg && (
        <div className="absolute inset-0 z-0 bg-[#0c0c11]">
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 35%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 65%, rgba(0,0,0,0.2) 80%, transparent 80%, transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, transparent 35%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 65%, rgba(0,0,0,0.2) 80%, transparent 80%, transparent 100%)',
            }}
          >
            <img
              src={score.coverUrl}
              srcSet={bgSrcSet}
              alt=""
              className="absolute left-[35%] w-[30%] max-w-none h-auto top-1/2 -translate-y-1/2"
              style={{ imageRendering: 'auto' }}
              onError={() => setBgError(true)}
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        </div>
      )}

      {/* 内容 */}
      <div className="relative z-10 flex items-center gap-2 w-full">
        {/* 排名 */}
        <span className="w-10 text-center text-sm font-mono text-zinc-600 shrink-0">
          #{rank}
        </span>

        {/* 封面 */}
        <div className="w-14 h-10 shrink-0 rounded overflow-hidden">
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
            {(score.starRating ?? 0) > 0 && (
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
