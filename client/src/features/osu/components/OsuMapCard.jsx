// ============================================================
// OsuMapCard — 谱面信息卡片
// 用于 score 详情 / map 页面 / BP 详情面板
// ============================================================

import { FaStar, FaMusic, FaUser, FaClock, FaPlay } from 'react-icons/fa';
import OsuCoverImage from './OsuCoverImage';

export default function OsuMapCard({ beatmap, onViewLeaderboard, compact = false }) {
  if (!beatmap) {
    return (
      <div className="bg-[#15151e] border border-white/[0.05] rounded-lg p-6 text-center text-zinc-600">
        谱面信息加载中...
      </div>
    );
  }

  const difficultyParams = [
    { label: 'CS', value: beatmap.cs },
    { label: 'AR', value: beatmap.ar },
    { label: 'OD', value: beatmap.od },
    { label: 'HP', value: beatmap.hp },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[#15151e] border border-white/[0.05] rounded-lg p-3">
        <div className="w-14 h-10 shrink-0 rounded overflow-hidden">
          <OsuCoverImage src={beatmap.covers?.cover} alt={beatmap.title} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-200 truncate">{beatmap.title}</div>
          <div className="text-xs text-zinc-500 truncate">{beatmap.artist} — {beatmap.version}</div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 text-sm shrink-0">
          <FaStar className="text-[10px]" />
          <span className="font-bold">{beatmap.starRating?.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#15151e] border border-white/[0.05] rounded-lg overflow-hidden">
      {/* 封面封面 */}
      <div className="relative h-40 md:h-48">
        <OsuCoverImage src={beatmap.covers?.cover} alt={beatmap.title} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15151e] via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-bold text-white truncate">{beatmap.title}</h3>
          <p className="text-sm text-zinc-400 truncate">{beatmap.artist}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 谱师 + 难度名 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <FaUser className="text-[10px]" />
            <span>{beatmap.creator}</span>
            <span className="text-zinc-600">—</span>
            <span className="text-yellow-500/80 font-bold">{beatmap.version}</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-400">
            <FaStar className="text-xs" />
            <span className="font-bold">{beatmap.starRating?.toFixed(2)}</span>
            <span className="text-zinc-600 text-xs">★</span>
          </div>
        </div>

        {/* 难度参数 */}
        <div className="grid grid-cols-4 gap-2">
          {difficultyParams.map(p => (
            <div key={p.label} className="text-center bg-black/20 rounded p-2">
              <div className="text-[10px] text-zinc-600 font-bold uppercase">{p.label}</div>
              <div className="text-sm font-bold text-zinc-200">{p.value?.toFixed(1) || '-'}</div>
            </div>
          ))}
        </div>

        {/* BPM / 长度 / 模式 */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <FaMusic className="text-[10px]" />
            <span>{beatmap.bpm} BPM</span>
          </div>
          <div className="flex items-center gap-1">
            <FaClock className="text-[10px]" />
            <span>{formatLength(beatmap.length)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaPlay className="text-[10px]" />
            <span className="capitalize">{beatmap.mode || 'standard'}</span>
          </div>
          {beatmap.maxCombo && (
            <span className="text-zinc-600">{beatmap.maxCombo}x</span>
          )}
        </div>

        {/* 排行榜入口 */}
        {onViewLeaderboard && (
          <button
            onClick={() => onViewLeaderboard(beatmap.beatmapId)}
            className="w-full py-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-xs font-bold rounded-lg transition-colors"
          >
            查看排行榜
          </button>
        )}
      </div>
    </div>
  );
}

function formatLength(seconds) {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
