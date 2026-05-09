// ============================================================
// OsuLeaderboard — 谱面全球排行榜（b1.7 第二轮优化）
// GET /api/osu/leaderboard/:bid?legacy=1&limit=50
// 响应结构：{ beatmap, scores, currentUserRank, userScore, availableTypes }
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import { getStarBgColor, getStarTextColor } from '../utils/osuColors';
import ScrollToTopButton from '../components/ScrollToTopButton';
import OsuLeaderboardRow from '../components/OsuLeaderboardRow';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import {
  FaSpinner, FaArrowLeft, FaGlobeAsia, FaMedal,
  FaSearch, FaStar, FaClock, FaMusic,
  FaBolt, FaDatabase
} from 'react-icons/fa';

function useOsuCache() {
  const [cache, setCache] = useState(() => ({
    leaderboardBid: sessionStorage.getItem('osu_leaderboard_bid') || '',
    leaderboardData: null,
    setLeaderboard(bid, data) {
      sessionStorage.setItem('osu_leaderboard_bid', bid);
      setCache(prev => ({ ...prev, leaderboardBid: bid, leaderboardData: data }));
    },
  }));
  return cache;
}

const modeIcons = {
  standard: '/osu-resources/RulesetOsu.png',
  taiko: '/osu-resources/RulesetTaiko.png',
  catch: '/osu-resources/RulesetCatch.png',
  mania: '/osu-resources/RulesetMania.png',
};

function ModeIcon({ mode }) {
  const src = modeIcons[mode] || modeIcons.standard;
  return <img src={src} alt="" className="w-3.5 h-3.5 inline-block" />;
}

// ----- 组件 -----

export default function OsuLeaderboard() {
  const { bid } = useParams();
  const navigate = useNavigate();
  const cache = useOsuCache();
  const [bidInput, setBidInput] = useState(bid || cache.leaderboardBid || '');
  const [data, setData] = useState(bid ? null : cache.leaderboardData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // 过滤后的成绩
  const filteredScores = useMemo(() => {
    if (!data?.scores?.length) return [];
    return data.scores.filter(entry => {
      if (filterType === 'all') return true;
      if (filterType === 'lazer') return entry.isLazer === true;
      if (filterType === 'stable') return entry.isLazer === false;
      return true;
    });
  }, [data, filterType]);

  const effectiveBid = bid || bidInput;

  const fetchLeaderboard = async () => {
    if (!effectiveBid || isNaN(Number(effectiveBid))) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await getLeaderboard(effectiveBid, { limit: 50 });
      setData(res);
      cache.setLeaderboard(effectiveBid, res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || '拉取排行榜失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!bidInput) return;
    if (bidInput === effectiveBid) {
      fetchLeaderboard();
    } else {
      navigate(`/leaderboard/${bidInput}`, { replace: true });
    }
  };

  // 路由 bid 变化时自动拉取
  useEffect(() => {
    if (bid && bid !== cache.leaderboardBid) {
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid]);

  // 谱面信息
  const beatmap = data?.beatmap;
  const beatmapMode = beatmap?.mode || 'standard';
  const starRating = beatmap?.difficulty_rating || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 返回 & 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/osu')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold text-zinc-200">全球排行榜</h1>
        <span className="text-[10px] text-zinc-600 tracking-wider bg-zinc-800/50 px-2 py-0.5 rounded">BETA</span>
      </div>

      {/* 谱面搜索栏 */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs" />
          <input
            type="text"
            value={bidInput}
            onChange={e => setBidInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="输入谱面 ID 或 URL..."
            className="w-full pl-9 pr-3 py-2 bg-[#15151e] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-600 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white text-sm font-bold rounded-lg transition-colors"
        >
          {loading ? <FaSpinner className="animate-spin" /> : '搜索'}
        </button>
      </div>

      {/* 谱面信息卡 — b1.7 R3 修复：使用扁平字段 + 图标 + 进度条 */}
      {beatmap && (
        <div className="relative mb-6 rounded-xl overflow-hidden border border-white/[0.05]">
          <img
            src={beatmap.coverUrl || ''}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14141e] via-[#14141e]/92 to-transparent" />
          <div className="relative z-10 p-4 sm:p-6 flex items-start gap-4 sm:gap-6">
            {/* 谱面封面 */}
            <img
              src={beatmap.coverUrl || ''}
              alt={beatmap.title || ''}
              className="w-20 sm:w-28 rounded-lg shadow-lg shrink-0 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {/* 谱面信息 */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 truncate">{beatmap.titleUnicode || beatmap.title || 'Unknown'}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{beatmap.artist || 'Unknown'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300">{beatmap.version || '-'}</span>
                {beatmap.status != null && <OsuBeatmapStatusBadge status={beatmap.status} />}
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <ModeIcon mode={beatmapMode} />
                  {beatmapMode}
                </span>
              </div>
              {/* 字段图标 + 数值（圆/条/转盘/时长/BPM/cbx） */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                {starRating > 0 && (
                  <span className="flex items-center gap-1">
                    <FaStar className={`w-3 h-3 ${getStarTextColor(starRating)}`} />
                    <span className={`font-bold tabular-nums ${getStarTextColor(starRating)}`}>{starRating.toFixed(2)}★</span>
                  </span>
                )}
                {beatmap.bpm > 0 && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <img src="/osu-resources/bpm.png" className="w-3.5 h-3.5" />
                    {beatmap.bpm} BPM
                  </span>
                )}
                {beatmap.totalLength > 0 && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <img src="/osu-resources/clock.png" className="w-3.5 h-3.5" />
                    {Math.floor(beatmap.totalLength / 60)}:{String(beatmap.totalLength % 60).padStart(2, '0')}
                  </span>
                )}
                {beatmap.circles > 0 && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <img src="/osu-resources/circles.png" className="w-3.5 h-3.5" />
                    {beatmap.circles.toLocaleString()}
                  </span>
                )}
                {beatmap.sliders > 0 && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <img src="/osu-resources/sliders.png" className="w-3.5 h-3.5" />
                    {beatmap.sliders.toLocaleString()}
                  </span>
                )}
                {beatmap.maxCombo > 0 && (
                  <span className="text-zinc-500 font-medium tabular-nums">{beatmap.maxCombo.toLocaleString()}x</span>
                )}
              </div>
              {/* HP/OD 难度进度条 */}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 max-w-xs">
                {(beatmapMode === 'mania'
                  ? [
                      { label: 'OD', value: beatmap.od },
                      { label: 'HP', value: beatmap.hp },
                      { label: 'Keys', value: beatmap.maniaKeys ?? beatmap.cs },
                    ]
                  : [
                      { label: 'CS', value: beatmap.cs },
                      { label: 'AR', value: beatmap.ar },
                      { label: 'OD', value: beatmap.od },
                      { label: 'HP', value: beatmap.hp },
                    ]
                ).map(({ label, value }) => {
                  const val = value != null ? Math.min(Math.max(value, 0), 10) : 0;
                  const pct = Math.max((val / 10) * 100, 1);
                  const display = label === 'Keys' ? String(Math.round(val)) : val.toFixed(1);
                  return (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 w-6 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 w-6 text-right">{display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 已缓存的老数据提示 */}
      {data && !bid && (
        <div className="mb-4 flex items-center gap-2 text-xs text-zinc-600 bg-zinc-800/30 px-3 py-2 rounded-lg border border-zinc-800">
          <FaClock className="shrink-0" />
          显示缓存的排行榜数据
        </div>
      )}

      {/* 模式筛选（availableTypes） */}
      {data?.availableTypes?.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {data.availableTypes.map(t => (
            <button
              key={t}
              onClick={() => {
                setBidInput('');
                navigate(`/leaderboard/${bid}?type=${t}`, { replace: true });
              }}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all
                border-zinc-800 text-zinc-500 hover:border-pink-600/40 hover:text-pink-400"
            >
              <ModeIcon mode={t} />
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 未上榜用户成绩 */}
      {data?.userScore && !data?.currentUserRank && (
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/[0.06] to-transparent border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <FaMusic className="text-amber-400 text-xs" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">你的成绩</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 text-center shrink-0">
              <span className="text-xs text-zinc-600">--</span>
            </div>
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <OsuGrade grade={data.userScore.grade} size="sm" />
              <span className="text-sm font-bold text-zinc-200">{data.userScore.score?.toLocaleString()}</span>
              <span className="text-xs text-zinc-400">{data.userScore.accuracy?.toFixed(2)}%</span>
              {data.userScore.pp != null && (
                <span className="text-xs font-bold text-pink-400">{Math.round(data.userScore.pp)}pp</span>
              )}
              {data.userScore.mods?.length > 0 && (
                <span className="text-[10px] font-bold text-rose-400">{data.userScore.mods.join('')}</span>
              )}
              {data.userScore.maxCombo != null && (
                <span className="text-xs text-zinc-500">{data.userScore.maxCombo}x</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 我的排名横幅（上榜时）*/}
      {data?.currentUserRank && (
        <div className="mb-4 p-3 bg-gradient-to-r from-pink-500/[0.08] to-transparent border border-pink-500/20 rounded-lg flex items-center gap-3">
          <FaMedal className="text-pink-400 text-lg" />
          <span className="text-sm text-zinc-200 font-bold">
            你的排名：<span className="text-pink-400">#{data.currentUserRank.rank}</span>
          </span>
          {data.currentUserRank.highlight && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              在榜单中
            </span>
          )}
        </div>
      )}

      {/* Stable / Lazer 筛选器 */}
      {data?.scores?.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex bg-[#15151e]/60 rounded-lg border border-white/[0.05] p-0.5">
            {[
              { key: 'all', label: '全部', icon: null },
              { key: 'lazer', label: 'LAZER', icon: FaBolt },
              { key: 'stable', label: 'STABLE', icon: FaDatabase },
            ].map(opt => (
              <button key={opt.key} onClick={() => setFilterType(opt.key)}
                className={`text-xs font-bold rounded-md transition-all flex items-center gap-1 px-3 py-1.5 ${
                  filterType === opt.key
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {opt.icon && <opt.icon className="w-3 h-3" />}
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-zinc-600">
            {filteredScores.length} / {data.scores.length} 条
          </span>
        </div>
      )}

      {/* 排行榜列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><FaSpinner className="animate-spin text-2xl text-pink-500/50" /></div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">{error}</div>
      ) : filteredScores.length > 0 ? (
        <>
          <div className="bg-[#15151e]/40 rounded-xl border border-white/[0.05] overflow-hidden">
            {/* 表头 */}
            <div className="hidden sm:flex items-center px-4 py-2 text-xs text-zinc-500 font-bold uppercase tracking-wider border-b border-white/[0.05] bg-[#15151e]/95">
              <span className="w-12 text-center">#</span>
              <span className="w-8" />
              <span className="flex-1 min-w-0">玩家</span>
              <span className="w-12 text-center">评级</span>
              <span className="w-24 text-right">分数</span>
              <span className="w-16 text-right">Acc</span>
              <span className="w-14 text-right">PP</span>
            </div>

            {filteredScores.map((entry, i) => {
              const rankNum = i + 1;
              const isHighlighted = data.currentUserRank?.highlight && rankNum === data.currentUserRank.rank;

              return (
                <div key={entry.userId + '-' + rankNum} className={isHighlighted ? 'relative' : ''}>
                  {isHighlighted && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-pink-500 z-10" />
                  )}
                  <OsuLeaderboardRow
                    rank={rankNum}
                    entry={{
                      ...entry,
                      countryCode: entry.countryCode,
                      avatarUrl: entry.avatarUrl,
                      coverUrl: entry.coverUrl,
                    }}
                    showDetails={true}
                    showCover={false}
                    compact={false}
                    mode={beatmapMode}
                  />
                </div>
              );
            })}
          </div>

          {/* 排行榜总数 */}
          {data.totalEntries > 50 && (
            <div className="mt-3 text-xs text-center text-zinc-600">
              共 {data.totalEntries} 条记录（仅显示前 50 条）
            </div>
          )}
        </>
      ) : data?.scores?.length > 0 && filteredScores.length === 0 ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaBolt className="mx-auto text-2xl text-zinc-700 mb-3" />
          无匹配的 {filterType === 'lazer' ? 'LAZER' : 'STABLE'} 成绩
        </div>
      ) : bid || bidInput ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaGlobeAsia className="mx-auto text-2xl text-zinc-700 mb-3" />
          该谱面暂无排行榜数据
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-600">
          <FaGlobeAsia className="mx-auto text-3xl text-zinc-700 mb-4" />
          输入谱面 ID 查看全球排行榜
        </div>
      )}

      {/* 回到顶部按钮 */}
      <ScrollToTopButton />
    </div>
  );
}
