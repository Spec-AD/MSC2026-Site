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

// 最近游玩时间格式化
function formatRecentTime(playedAt) {
  if (!playedAt) return '';
  const date = new Date(playedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (diffDays === 0) return `今天 ${timeStr}`;
  if (diffDays === 1) return `昨天 ${timeStr}`;
  if (diffDays < 7) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${days[date.getDay()]} ${timeStr}`;
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${timeStr}`;
}

export default function OsuScoreCard({ score, rank, onClick, compact = false, showTime = false }) {
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
      {/* 背景曲绘 — 对齐实际量测 1131×121（55.2% 覆盖率） */}
      {hasBg && (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#0c0c11]">
          {/* 图片容器：覆盖 55.2%，左边界 22.4% */}
          <div className="absolute top-0 bottom-0" style={{ left: '22.4%', width: '55.2%' }}>
            <img
              src={score.coverUrl}
              srcSet={bgSrcSet}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.55)', objectPosition: 'center center', imageRendering: 'auto' }}
              onError={() => setBgError(true)}
              draggable={false}
            />
          </div>
          {/* 底色梯度：渐入→常量→渐出 */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(12,12,17,1) 0%, rgba(12,12,17,1) 22.4%, rgba(12,12,17,0) 37.4%, rgba(12,12,17,0) 62.4%, rgba(12,12,17,1) 77.6%, rgba(12,12,17,1) 100%)',
          }} />
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
      {showTime && score.playedAt && (
        <div className="relative z-10 text-[9px] text-zinc-600 mt-0.5 ml-12">
          {formatRecentTime(score.playedAt)}
        </div>
      )}
    </motion.div>
  );
}
