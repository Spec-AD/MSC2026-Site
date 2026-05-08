// ============================================================
// OsuLeaderboardRow — 通用排行榜行组件
// 供排行榜 / BP / Recent / Pass / TodayBest 复用
// 支持 Banner 背景 / 国旗 / Grade / 判定详情 / MOD 占位
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaMedal, FaUser, FaCircle, FaBolt, FaDatabase } from 'react-icons/fa';
import OsuGrade from './OsuGrade';
import OsuCoverImage from './OsuCoverImage';
import CountryFlag from './CountryFlag';

const COUNTRY_NAMES = new Intl.DisplayNames(['zh'], { type: 'region' });

// 排名奖牌色
const RANK_COLORS = {
  1: 'text-yellow-400',
  2: 'text-zinc-300',
  3: 'text-amber-600',
};

// ====== 各模式判定配置（字段 key + 显示标签 + 颜色） ======
const MODE_JUDGES = {
  // osu!standard: 300 / 100 / 50 / Miss
  standard: [
    { key: 'count300', label: '300', color: 'text-emerald-400' },
    { key: 'count100', label: '100', color: 'text-blue-400' },
    { key: 'count50',  label: '50',  color: 'text-amber-400' },
    { key: 'countMiss',label: 'Miss',color: 'text-red-400' },
  ],
  // osu!taiko: Great / OK / Miss
  taiko: [
    { key: 'count300', label: 'Great', color: 'text-emerald-400' },
    { key: 'count100', label: 'OK',    color: 'text-blue-400' },
    { key: 'countMiss',label: 'Miss',  color: 'text-red-400' },
  ],
  // osu!catch: Fruit / Juice / Droplet / Miss
  catch: [
    { key: 'count300', label: 'Fruit',  color: 'text-emerald-400' },
    { key: 'count100', label: 'Juice',  color: 'text-blue-400' },
    { key: 'count50',  label: 'Droplet',color: 'text-amber-400' },
    { key: 'countMiss',label: 'Miss',   color: 'text-red-400' },
  ],
  // osu!mania: PERF / GREAT / GOOD / OK / MEH / Miss
  mania: [
    { key: 'countGeki', label: 'PERF', color: 'text-yellow-200' },
    { key: 'count300',  label: 'GREAT',color: 'text-yellow-400' },
    { key: 'countKatu', label: 'GOOD', color: 'text-lime-400' },
    { key: 'count100',  label: 'OK',   color: 'text-green-400' },
    { key: 'count50',   label: 'MEH',  color: 'text-orange-400' },
    { key: 'countMiss', label: 'Miss', color: 'text-red-400' },
  ],
};

/** 读取判定值 — 兼容 PPY 各分支 API 字段命名差异 */
function readJudgeVal(entry, key) {
  const stats = entry.statistics;
  // 1. 顶层 camelCase: entry.count300
  if (entry[key] != null) return entry[key];
  // 2. 嵌套 camelCase: entry.statistics.count300
  if (stats?.[key] != null) return stats[key];
  // 3. 顶层 snake_case: entry.count_300
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (entry[snake] != null) return entry[snake];
  // 4. 嵌套 snake_case: entry.statistics.count_300
  if (stats?.[snake] != null) return stats[snake];
  // 5. 全小写变体: countmiss, countgeki, countkatu
  const lower = key.toLowerCase();
  if (entry[lower] != null) return entry[lower];
  // 6. 嵌套全小写
  if (stats?.[lower] != null) return stats[lower];
  // 7. PPY n-前缀变体: n300, n100, n50, nmiss, ngeki, nkatu
  const nKey = 'n' + key.replace(/^count/i, '').toLowerCase();
  if (entry[nKey] != null) return entry[nKey];
  // 8. statistics 中的 n-前缀
  if (stats?.[nKey] != null) return stats[nKey];
  return null;
}

/** 根据模式获取实际有值的判定数组 */
function getJudges(entry, mode) {
  const config = MODE_JUDGES[mode] || MODE_JUDGES.standard;
  return config
    .map(j => ({ ...j, value: readJudgeVal(entry, j.key) }))
    .filter(j => j.value != null);
}

export default function OsuLeaderboardRow({
  rank,
  entry,
  onClick,
  showDetails = true,
  showCover = true,
  compact = false,
  mode = 'standard',
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleUsernameClick = (e) => {
    e.stopPropagation();
    if (entry.username || entry.osuUsername) {
      navigate(`/osu/info?q=${encodeURIComponent(entry.username || entry.osuUsername)}`);
    }
  };

  const judges = getJudges(entry, mode);

  // MODs 显示
  const modsStr = entry.mods?.length > 0 ? `+${entry.mods.join('')}` : '';

  // Lazer / Stable 标签
  const lazerBadge = entry.isLazer === true
    ? { label: 'LAZER', icon: FaBolt, cls: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
    : entry.isLazer === false
      ? { label: 'STABLE', icon: FaDatabase, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
      : null;

  // 排名
  const rankNum = rank;
  const showMedal = rankNum <= 3;

  // Banner 背景
  const hasBanner = entry.coverUrl && !imgError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={`
        relative px-3 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer
        overflow-hidden group
      `}
    >
      {/* Banner 背景 */}
      {hasBanner && (
        <div className="absolute inset-0 z-0">
          <img
            src={entry.coverUrl}
            alt=""
            className="w-full h-full object-cover opacity-20"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c11]/90 via-[#0c0c11]/80 to-[#0c0c11]/95" />
        </div>
      )}

      {/* 内容 */}
      <div className={`relative z-10 flex items-center gap-2 ${compact ? 'gap-1.5' : ''}`}>
        {/* 排名 */}
        <div className={`text-center shrink-0 ${compact ? 'w-8' : 'w-10'}`}>
          {showMedal ? (
            <FaMedal className={`mx-auto text-sm ${RANK_COLORS[rankNum] || 'text-zinc-500'}`} />
          ) : (
            <span className="text-sm font-mono text-zinc-600">#{rankNum}</span>
          )}
        </div>

        {/* 封面 */}
        {showCover && (
          <div className="w-10 h-8 rounded overflow-hidden shrink-0 bg-zinc-800">
            <OsuCoverImage src={entry.coverUrl || entry.beatmapCoverUrl} alt="" className="w-full h-full" />
          </div>
        )}

        {/* 头像 */}
        <div className={`rounded-full overflow-hidden bg-zinc-800 shrink-0 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <FaUser className="w-full h-full p-1.5 text-zinc-600" />
          )}
        </div>

        {/* 用户名 + 国旗 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              onClick={handleUsernameClick}
              className={`font-bold text-zinc-200 hover:text-pink-400 transition-colors truncate cursor-pointer ${compact ? 'text-xs' : 'text-sm'}`}
            >
              {entry.username || entry.osuUsername}
            </span>
            {entry.countryCode && (
              <span className="shrink-0 inline-flex items-center gap-1 ms-1" title={entry.countryName || ''}>
                <CountryFlag code={entry.countryCode} size="sm" />
                <span className="text-[10px] text-zinc-500">{COUNTRY_NAMES.of(entry.countryCode) || entry.countryCode}</span>
              </span>
            )}
          </div>
        </div>

        {/* Grade */}
        <div className="shrink-0">
          <OsuGrade grade={entry.grade} size={compact ? 'xs' : 'sm'} />
        </div>

        {/* 分数 + Acc + PP 行 */}
        <div className="text-right shrink-0">
          <span className={`font-bold text-zinc-100 ${compact ? 'text-xs' : 'text-sm'}`}>
            {entry.score?.toLocaleString() || Math.round(entry.pp || 0).toLocaleString()}
          </span>
          {!compact && entry.accuracy != null && (
            <div className="text-[10px] text-amber-400 font-medium">{Number(entry.accuracy).toFixed(4)}%</div>
          )}
        </div>

        {/* PP */}
        {entry.pp != null && (
          <div className={`text-right shrink-0 ${compact ? 'w-12' : 'w-16'}`}>
            <span className={`font-bold text-pink-400 ${compact ? 'text-xs' : 'text-sm'}`}>
              {Math.round(entry.pp)}
            </span>
            <span className="text-[9px] text-pink-500/60 ml-0.5">pp</span>
          </div>
        )}
      </div>

      {/* 第二行：判定详情 + MODs */}
      {showDetails && judges.length > 0 && (
        <div className="relative z-10 flex items-center gap-2 mt-1 ml-12">
          <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ paddingLeft: showCover ? '3rem' : '2.5rem' }}>
            {judges.map((j, i) => (
              <span key={j.key} className="inline-flex items-center gap-1">
                <span className="text-[10px] text-zinc-500 font-medium">{j.label}</span>
                <span className={`${j.color} font-bold tabular-nums`}>
                  {j.value.toLocaleString()}
                </span>
                {i < judges.length - 1 && <span className="text-zinc-700">|</span>}
              </span>
            ))}
          </div>

          {/* MODs */}
          {modsStr && (
            <span className="text-[10px] font-bold text-rose-400 tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">
              {modsStr}
            </span>
          )}

          {/* Lazer / Stable 标签 */}
          {lazerBadge && (
            <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 border ${lazerBadge.cls}`}>
              <lazerBadge.icon className="inline-block w-2.5 h-2.5 mr-0.5 -mt-0.5" />
              {lazerBadge.label}
            </span>
          )}
        </div>
      )}

      {/* 曲名（BP/Recent 模式，无封面时）*/}
      {!showCover && entry.title && (
        <div className="relative z-10 mt-0.5 ml-12">
          <span className="text-xs text-zinc-400 truncate block">{entry.title}</span>
        </div>
      )}
    </motion.div>
  );
}
