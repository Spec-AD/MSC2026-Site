// ============================================================
// OsuBeatmapStatusBadge — 谱面状态标签（可复用）
// 显示在 ScoreCard / PassItem / LeaderboardEntry 的版本号右侧
// ============================================================

const STATUS_CONFIG = {
  ranked:    { label: 'Ranked',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  loved:     { label: 'Loved',     color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  qualified: { label: 'Qualified', color: 'text-blue-400',    bg: 'bg-blue-500/10',     border: 'border-blue-500/20' },
  pending:   { label: 'Pending',   color: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/20' },
  wip:       { label: 'WIP',       color: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/20' },
  graveyard: { label: 'Graveyard', color: 'text-purple-400',  bg: 'bg-purple-500/10',    border: 'border-purple-500/20' },
};

export default function OsuBeatmapStatusBadge({ status, className = '' }) {
  if (!status || status === 'ranked') return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={`
        inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded
        ${config.color} ${config.bg} ${config.border} border
        ${className}
      `}
    >
      {config.label}
    </span>
  );
}
