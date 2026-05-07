// ============================================================
// OsuLeaderboard — 谱面全球排行榜（b1.7 第二轮优化）
// GET /api/osu/leaderboard/:bid?legacy=1&limit=50
// 响应结构：{ beatmap, scores, currentUserRank, userScore, availableTypes }
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import { getStarBgColor, getStarTextColor } from '../utils/osuColors';
import ScrollToTopButton from '../components/ScrollToTopButton';
import OsuLeaderboardRow from '../components/OsuLeaderboardRow';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import CountryFlag from '../components/CountryFlag';
import {
  FaSpinner, FaArrowLeft, FaGlobeAsia, FaMedal,
  FaSearch, FaStar, FaClock, FaMusic, FaCircle, FaSlidersH
} from 'react-icons/fa';
import useOsuCache from '../store/osuCache';
import OsuSearchHistory from '../components/OsuSearchHistory';
import OsuStarBadge from '../components/OsuStarBadge';

// ----- mode 标签映射 -----

const MODE_BADGE = {
  standard: { label: 'S', color: 'bg-pink-500/15 text-pink-400 border-pink-500/20' },
  taiko:    { label: 'T', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  catch:    { label: 'C', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  mania:    { label: 'M', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
};

const MODE_FULL = {
  standard: 'osu!standard',
  taiko:    'osu!taiko',
  catch:    'osu!catch',
  mania:    'osu!mania',
};

// ----- 工具函数 -----

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 模式图标 — osu-resources PNG */
function ModeIcon({ mode }) {
  const icons = {
    standard: '/osu-resources/RulesetOsu.png',
    taiko: '/osu-resources/RulesetTaiko.png',
    catch: '/osu-resources/RulesetCatch.png',
    mania: '/osu-resources/RulesetMania.png',
  };
  const src = icons[mode] || icons.standard;
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
      setError(err.userMessage || '加载排行榜失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bid) fetchLeaderboard();
  }, [bid]);

  const handleSearch = () => {
    if (!bidInput || isNaN(Number(bidInput))) return;
    navigate(`/osu/leaderboard/${bidInput}`, { replace: true });
    fetchLeaderboard();
  };

  const handleUsernameClick = (username, e) => {
    e.stopPropagation();
    navigate(`/osu/info?q=${encodeURIComponent(username)}`);
  };

  // 数据加载成功后记录 BID 搜索历史
  useEffect(() => {
    if (!data?.beatmap || !effectiveBid) return;
    const bm = data.beatmap;
    const modeIcons = { standard: '/osu-resources/RulesetOsu.png', taiko: '/osu-resources/RulesetTaiko.png', catch: '/osu-resources/RulesetCatch.png', mania: '/osu-resources/RulesetMania.png' };
    cache.addLeaderboardHistory({
      bid: effectiveBid,
      coverUrl: bm.coverUrl || bm.covers?.cover,
      title: bm.titleUnicode || bm.title,
      version: bm.version,
      mode: bm.mode || 'standard',
      modeIcon: modeIcons[bm.mode] || modeIcons.standard,
    });
  }, [data?.beatmap]);

  // 当前谱面的模式（用于 mode 标签）
  const beatmapMode = data?.beatmap?.mode || 'standard';
  const modeBadge = MODE_BADGE[beatmapMode] || MODE_BADGE.standard;

  return (
    <div>
      {/* 返回按钮 */}
      {bid && (
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm mb-6 w-fit">
          <FaArrowLeft /> 返回
        </button>
      )}

      {/* 搜索栏 — 始终保持可见 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight whitespace-nowrap">排行榜</h2>
        <div className="flex items-center gap-2 flex-1">
          <input type="text" value={bidInput} onChange={(e) => setBidInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="谱面 ID..." className="bg-[#15151e] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 w-full" />
          <button onClick={handleSearch} disabled={loading}
            className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors">
            {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
          </button>
        </div>
      </div>

      {/* 搜索历史 */}
      {!effectiveBid && cache.leaderboardHistory?.length > 0 && (
        <OsuSearchHistory
          items={cache.leaderboardHistory}
          type="bid"
          onSelect={(entry) => navigate(`/osu/leaderboard/${entry.bid}`)}
          onClear={() => cache.clearAll()}
        />
      )}

      {/* 谱面头部信息 — b1.7 R3 重构版 */}
      {data?.beatmap && (
        <div className="mb-4 relative overflow-hidden rounded-xl">
          {/* 背景曲绘 */}
          <div className="absolute inset-0">
            <OsuCoverImage src={data.beatmap.coverUrl || data.beatmap.covers?.cover} alt="" className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#15151e]/95 via-[#15151e]/85 to-[#15151e]/70" />
          </div>

          <div className="relative z-10 p-4">
            {/* 第一行：封面 + 标题 + 星级 */}
            <div className="flex items-start gap-4">
              {/* 封面 */}
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 shadow-lg">
                <OsuCoverImage src={data.beatmap.coverUrl || data.beatmap.covers?.cover} alt="" className="w-full h-full" />
              </div>

              {/* 信息区 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-zinc-100 truncate max-w-[300px]">{data.beatmap.titleUnicode || data.beatmap.title}</span>
                  {/* mode 标签 — 全称+图标 */}
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border flex items-center gap-1 ${modeBadge.color}`}>
                    <ModeIcon mode={beatmapMode} />
                    {MODE_FULL[beatmapMode] || beatmapMode}
                  </span>
                  <OsuBeatmapStatusBadge status={data.beatmap.status} />
                </div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">
                  {data.beatmap.artist} — {data.beatmap.version}
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {data.beatmap.mapperUsername || data.beatmap.creator}
                </div>
              </div>

              {/* 星级 (底框色 + overall-difficulty.png) */}
              <OsuStarBadge starRating={data.beatmap.starRating} size="md" />
            </div>

            {/* 谱面参数 — PNG 图标+数值 */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.08] text-[11px] text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1">
                <img src="/osu-resources/clock.png" alt="" className="w-3 h-3 opacity-60" />
                {formatDuration(data.beatmap.totalLength || data.beatmap.length)}
              </span>
              <span className="flex items-center gap-1">
                <img src="/osu-resources/bpm.png" alt="" className="w-3 h-3 opacity-60" />
                {data.beatmap.bpm} BPM
              </span>
              {(data.beatmap.circles != null && data.beatmap.circles > 0) && (
                <span className="flex items-center gap-1">
                  <img src="/osu-resources/circles.png" alt="" className="w-3 h-3 opacity-60" />
                  {data.beatmap.circles?.toLocaleString()}
                </span>
              )}
              {(data.beatmap.sliders != null && data.beatmap.sliders > 0) && (
                <span className="flex items-center gap-1">
                  <img src="/osu-resources/sliders.png" alt="" className="w-3 h-3 opacity-60" />
                  {data.beatmap.sliders?.toLocaleString()}
                </span>
              )}
              {data.beatmap.maxCombo != null && (
                <span className="flex items-center gap-1">{data.beatmap.maxCombo}x</span>
              )}
            </div>

            {/* 难度参数进度条 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-white/[0.05]">
              {[
                { label: 'OD', value: data.beatmap.od },
                { label: 'CS', value: data.beatmap.cs },
                { label: 'AR', value: data.beatmap.ar },
                { label: 'HP', value: data.beatmap.hp },
              ].map(p => {
                const val = p.value != null ? Math.min(Math.max(Number(p.value), 0), 10) : 0;
                const pct = Math.max(val / 10 * 100, 1);
                return (
                  <div key={p.label} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase w-6 shrink-0">{p.label}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #ec4899, #a855f7)' }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 w-5 text-right">{val.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* 加载中 */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><FaSpinner className="animate-spin text-2xl text-pink-500/50" /></div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">{error}</div>
      ) : data?.scores?.length > 0 ? (
        <>
          {/* 排行榜列表 */}
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

            {data.scores.map((entry, i) => {
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
      ) : bid || bidInput ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaGlobeAsia className="mx-auto text-2xl text-zinc-700 mb-3" />该谱面暂无排行榜数据
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-600">
          <FaGlobeAsia className="mx-auto text-3xl text-zinc-700 mb-4" />输入谱面 ID 查看全球排行榜
        </div>
      )}

      {/* 回到顶部按钮 */}
      <ScrollToTopButton />
    </div>
  );
}
