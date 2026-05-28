// ============================================================
// BeatmapCard — 谱面搜索双列网格结果卡（b1.7.11）
// 曲目封面作为底板，展示曲名/难度/BPM/谱师等信息
// ============================================================

import { useState } from 'react';
import OsuStarBadge from './OsuStarBadge';
import OsuBeatmapStatusBadge from './OsuBeatmapStatusBadge';

export default function BeatmapCard({ beatmapset, onClick, onSelectDifficulty }) {
  const [imgError, setImgError] = useState(false);

  const coverUrl = beatmapset.covers?.card || beatmapset.covers?.list || '';
  const difficulties = beatmapset.difficulties || beatmapset.beatmaps || [];
  const rankedDate = beatmapset.ranked_date || beatmapset.rankedDate;

  return (
    <div
      onClick={() => onClick?.(beatmapset)}
      className="relative group rounded-xl overflow-hidden border border-white/[0.05] bg-[#15151e]/60 cursor-pointer
        hover:border-pink-500/30 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.1)]"
    >
      {/* Cover background */}
      {coverUrl && !imgError ? (
        <div className="absolute inset-0">
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.35) saturate(0.8)' }}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/60 to-zinc-900/80" />
      )}

      {/* Content overlay */}
      <div className="relative z-10 p-4 min-h-[160px] flex flex-col justify-between">
        {/* Top: title + source */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-pink-300 transition-colors">
                {beatmapset.title}
              </h3>
              {beatmapset.artist && (
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{beatmapset.artist}</p>
              )}
            </div>
            <OsuBeatmapStatusBadge status={beatmapset.status} />
          </div>
          {beatmapset.source && (
            <span className="text-[10px] text-zinc-600 mt-1 block truncate">{beatmapset.source}</span>
          )}
        </div>

        {/* Bottom: difficulties + stats */}
        <div className="mt-3">
          {/* Difficulty list */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {difficulties.slice(0, 5).map((d, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); onSelectDifficulty?.(d.id || d.beatmap_id, d); }}
                className="flex items-center gap-1 bg-black/40 border border-white/[0.06] rounded px-1.5 py-0.5 hover:border-pink-500/40 transition-colors cursor-pointer"
                title={`模式 ${d.mode || ''} - ${d.version} (★${d.difficulty_rating})`}
              >
                <OsuStarBadge starRating={d.difficulty_rating} size="sm" />
                <span className="text-[10px] text-zinc-300 truncate max-w-[80px]">{d.version}</span>
              </div>
            ))}
            {difficulties.length > 5 && (
              <span className="text-[10px] text-zinc-600 self-center">+{difficulties.length - 5}</span>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
            <span>by {beatmapset.creator}</span>
            {beatmapset.bpm && <span>{beatmapset.bpm} BPM</span>}
            {rankedDate && (
              <span>{new Date(rankedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' })}</span>
            )}
            {beatmapset.play_count > 0 && (
              <span>{beatmapset.play_count.toLocaleString()} 次</span>
            )}
            {beatmapset.favourite_count > 0 && (
              <span>❤ {beatmapset.favourite_count.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
