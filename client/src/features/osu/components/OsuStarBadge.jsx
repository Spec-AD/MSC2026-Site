// ============================================================
// OsuStarBadge — 星级底框徽章 (清音 §14.2)
// 背景色随星级渐变 + overall-difficulty.png 图标 + 数值
// ============================================================

import { getStarBgColor, getStarTextColor } from '../utils/osuColors';

export default function OsuStarBadge({ starRating, size = 'sm' }) {
  const sr = starRating ?? 0;
  const bg = getStarBgColor(sr);
  const tc = getStarTextColor(bg);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  };

  const imgSizes = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-4 h-4' };

  return (
    <span
      className={`inline-flex items-center rounded font-bold ${sizeClasses[size]}`}
      style={{ backgroundColor: bg }}
    >
      <img
        src="/osu-resources/overall-difficulty.png"
        alt=""
        className={`${imgSizes[size]} shrink-0`}
        style={{ filter: tc === 'text-black' ? 'brightness(0)' : 'brightness(10)' }}
      />
      <span style={{ color: tc === 'text-black' ? '#000' : '#fff' }}>
        {sr.toFixed(2)}
      </span>
    </span>
  );
}
