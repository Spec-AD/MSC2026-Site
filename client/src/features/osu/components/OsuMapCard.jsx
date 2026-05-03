// ============================================================
// OsuMapCard — 谱面信息卡片（b1.7 R3 头卡重构版）
// 曲绘大背景 + 进度条参数 + 圆条转盘 + 谱师/日期
// ============================================================

import { FaStar, FaMusic, FaUser, FaClock, FaPlay, FaCircle, FaSlidersH, FaCompactDisc } from 'react-icons/fa';
import OsuCoverImage from './OsuCoverImage';
import OsuStarBadge from './OsuStarBadge';

const MODE_NAMES = {
  0: 'Standard', 1: 'Taiko', 2: 'Catch', 3: 'Mania',
};

export default function OsuMapCard({ beatmap, onViewLeaderboard, compact = false }) {
  if (!beatmap) {
    return (
      <div className="bg-[#15151e] border border-white/[0.05] rounded-lg p-6 text-center text-zinc-600">
        谱面信息加载中...
      </div>
    );
  }

  const modeLabel = beatmap.modeInt != null
    ? (MODE_NAMES[beatmap.modeInt] || beatmap.mode || 'Standard')
    : (beatmap.mode || 'Standard');

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[#15151e] border border-white/[0.05] rounded-lg p-3">
        <div className="w-14 h-10 shrink-0 rounded overflow-hidden">
          <OsuCoverImage src={beatmap.covers?.cover} alt={beatmap.title} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-200 truncate">
            {beatmap.titleUnicode || beatmap.title}
          </div>
          <div className="text-xs text-zinc-500 truncate">
            {beatmap.artist} — {beatmap.version}
          </div>
        </div>
        <OsuStarBadge starRating={beatmap.starRating} size="sm" />
      </div>
    );
  }

  // 难度参数进度条（范围 0-10，至少 1% 可见）
  const diffBars = [
    { label: 'CS', value: beatmap.cs, icon: null },
    { label: 'AR', value: beatmap.ar, icon: null },
    { label: 'OD', value: beatmap.od, icon: null },
    { label: 'HP', value: beatmap.hp, icon: null },
  ];

  return (
    <div className="bg-[#15151e] border border-white/[0.05] rounded-lg overflow-hidden">
      {/* 曲绘大背景 */}
      <div className="relative h-48 md:h-56">
        <OsuCoverImage src={beatmap.covers?.cover} alt={beatmap.title} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15151e] via-[#15151e]/40 to-transparent" />

        {/* 标题 + 艺术家 */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg md:text-xl font-bold text-white truncate">
              {beatmap.titleUnicode || beatmap.title}
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900/70 px-2 py-0.5 rounded uppercase shrink-0">
              {modeLabel}
            </span>
          </div>
          <p className="text-sm text-zinc-400 truncate">{beatmap.artist}</p>
        </div>

        {/* 谱师 + 评级日期 */}
        <div className="absolute top-3 right-3">
          <OsuStarBadge starRating={beatmap.starRating} size="md" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 谱师 + 版本 + 日期 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <FaUser className="text-[10px]" />
            <span className="font-medium">{beatmap.mapperUsername || beatmap.creator}</span>
            <span className="text-zinc-600">—</span>
            <span className="text-yellow-500/80 font-bold">{beatmap.version}</span>
          </div>
          <span className="text-[10px] text-zinc-600">
            {beatmap.rankedDate
              ? `${new Date(beatmap.rankedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })} 上架`
              : beatmap.submittedDate
                ? `${new Date(beatmap.submittedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' })} 提交`
                : ''}
          </span>
        </div>

        {/* 圆/条/转盘计数 */}
        {(beatmap.circles > 0 || beatmap.sliders > 0 || beatmap.spinners > 0) && (
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {beatmap.circles > 0 && (
              <span className="flex items-center gap-1">
                <FaCircle className="text-[8px] text-blue-400" />
                <span>{beatmap.circles.toLocaleString()} 圆圈</span>
              </span>
            )}
            {beatmap.sliders > 0 && (
              <span className="flex items-center gap-1">
                <FaSlidersH className="text-[10px] text-emerald-400" />
                <span>{beatmap.sliders.toLocaleString()} 滑条</span>
              </span>
            )}
            {beatmap.spinners > 0 && (
              <span className="flex items-center gap-1">
                <FaCompactDisc className="text-[10px] text-amber-400" />
                <span>{beatmap.spinners.toLocaleString()} 转盘</span>
              </span>
            )}
          </div>
        )}

        {/* 难度参数进度条 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {diffBars.map(p => {
            const val = p.value != null ? Math.min(Math.max(p.value, 0), 10) : 0;
            const pct = Math.max(val / 10 * 100, 1);
            return (
              <div key={p.label} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase w-6 shrink-0">{p.label}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-zinc-400 w-6 text-right">{val.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* BPM / 长度 / 连击 */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <FaMusic className="text-[10px]" />
            <span className="font-medium">{beatmap.bpm} BPM</span>
          </div>
          <div className="flex items-center gap-1">
            <FaClock className="text-[10px]" />
            <span>{formatLength(beatmap.length)}</span>
          </div>
          {beatmap.maxCombo && (
            <span className="flex items-center gap-1 font-medium text-zinc-400">
              {beatmap.maxCombo}x
            </span>
          )}
        </div>

        {/* 排行榜入口 */}
        {onViewLeaderboard && (
          <button
            onClick={() => onViewLeaderboard(beatmap.beatmapId)}
            className="w-full py-2.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-xs font-bold rounded-lg transition-all active:scale-[0.98]"
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
