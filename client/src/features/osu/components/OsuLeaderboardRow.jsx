// ============================================================
// OsuLeaderboardRow — 通用排行榜行组件
// 供排行榜 / BP / Recent / Pass / TodayBest 复用
// 支持 Banner 背景 / 国旗 / Grade / 判定详情 / MOD 占位
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaMedal, FaUser, FaCircle } from 'react-icons/fa';
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

// 判定颜色映射（支持新旧两种字段名）
const JUDGE_STYLES = {
  countPerf: 'text-yellow-300',
  countGreat: 'text-emerald-400',
  count300: 'text-emerald-400',
  countGood: 'text-green-400',
  countOk: 'text-blue-400',
  count100: 'text-blue-400',
  countMeh: 'text-amber-400',
  count50: 'text-amber-400',
  countLDrp: 'text-cyan-400',
  countSDrpMiss: 'text-amber-400',
  countMiss: 'text-red-400',
};

// 判定新→旧 fallback 映射
const JUDGE_FALLBACK = {
  countGreat: 'count300',
  countGood: null,
  countOk: 'count100',
  countMeh: 'count50',
  countLDrp: 'count100',
  countSDrpMiss: 'count50',
};

/** 读取判定值，优先新字段，回退旧字段 */
function getJudgeVal(entry, key) {
  const val = entry[key];
  if (val != null) return val;
  const fallbackKey = JUDGE_FALLBACK[key];
  if (fallbackKey) return entry[fallbackKey];
  return null;
}

export default function OsuLeaderboardRow({
  rank,
  entry,
  onClick,
  showDetails = true,
  showCover = true,
  compact = false,
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleUsernameClick = (e) => {
    e.stopPropagation();
    if (entry.username || entry.osuUsername) {
      navigate(`/osu/info?q=${encodeURIComponent(entry.username || entry.osuUsername)}`);
    }
  };

  // 判定数组 — 按模式自动排序
  // Mania：Perf → Great → Good → Ok → Meh → Miss
  // Standard/Taiko/Catch：Great → Ok → Meh → Miss（无 Perf）
  const hasPerf = getJudgeVal(entry, 'countPerf') != null;
  const allJudgeKeys = hasPerf
    ? ['countPerf', 'countGreat', 'countGood', 'countOk', 'countMeh', 'countMiss', 'countLDrp', 'countSDrpMiss']
    : ['countGreat', 'countOk', 'countMeh', 'countMiss', 'countLDrp', 'countSDrpMiss'];
  const judgeSets = allJudgeKeys
    .filter(k => getJudgeVal(entry, k) != null);
  // 去重：如果 countPerf 存在且 countGreat 存在，两者都显示
  // 简单做法：取实际有值的优先判定
  const judges = judgeSets.map(k => ({ key: k, value: getJudgeVal(entry, k), style: JUDGE_STYLES[k] || 'text-zinc-300' }));

  // MODs 显示
  const modsStr = entry.mods?.length > 0 ? `+${entry.mods.join('')}` : '';

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

        {/* 分数 */}
        <div className="text-right shrink-0">
          <span className={`font-bold text-zinc-100 ${compact ? 'text-xs' : 'text-sm'}`}>
            {entry.score?.toLocaleString() || Math.round(entry.pp || 0).toLocaleString()}
          </span>
          {!compact && entry.accuracy != null && (
            <div className="text-[10px] text-amber-400 font-medium">{entry.accuracy}%</div>
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
          <div className="flex items-center gap-1.5 text-xs" style={{ paddingLeft: showCover ? '3rem' : '2.5rem' }}>
            {judges.map((j, i) => (
              <span key={j.key} className={`${j.style} font-bold`}>
                {j.value.toLocaleString()}
                {i < judges.length - 1 && <span className="text-zinc-700 ml-1">/</span>}
              </span>
            ))}
          </div>

          {/* MODs */}
          {modsStr && (
            <span className="text-[10px] font-bold text-rose-400 tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded">
              {modsStr}
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
