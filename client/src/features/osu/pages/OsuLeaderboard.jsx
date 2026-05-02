// ============================================================
// OsuLeaderboard — 谱面全球排行榜（b1.7 完全重写）
// GET /api/osu/leaderboard/:bid?mode=&legacy=&mods=&limit=
// 响应结构：{ beatmap, scores: [{ rank, score, accuracy, ... 平铺字段 }], currentUserRank, availableTypes }
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getLeaderboard } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import OsuScoreDetailPanel from '../components/OsuScoreDetailPanel';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import {
  FaSpinner, FaArrowLeft, FaGlobeAsia, FaMedal, FaUser,
  FaSearch, FaStar, FaChevronDown, FaChevronUp
} from 'react-icons/fa';

// ----- 常量 -----

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];
const MODE_LABELS = { standard: 'S', taiko: 'T', catch: 'C', mania: 'M' };
const COMMON_MODS = ['NM', 'HD', 'HR', 'DT', 'HDHR', 'HDDT', 'HRDT', 'HDHRDT', 'FL', 'EZ'];

const RANK_COLORS = {
  1: 'text-yellow-400',
  2: 'text-zinc-300',
  3: 'text-amber-600',
};

// ----- 组件 -----

export default function OsuLeaderboard() {
  const { bid } = useParams();
  const navigate = useNavigate();
  const [bidInput, setBidInput] = useState(bid || '');
  const [activeMode, setActiveMode] = useState('standard');
  const [selectedMods, setSelectedMods] = useState('NM');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const effectiveBid = bid || bidInput;

  const fetchLeaderboard = async () => {
    if (!effectiveBid || isNaN(Number(effectiveBid))) return;
    setLoading(true);
    setError(null);
    setSelectedEntry(null);
    try {
      const params = { mode: activeMode, limit: 50 };
      if (selectedMods !== 'NM') params.mods = selectedMods;

      const { data: res } = await getLeaderboard(effectiveBid, params);
      setData(res);
    } catch (err) {
      setError(err.userMessage || '加载排行榜失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bid) fetchLeaderboard();
  }, [bid, activeMode, selectedMods]);

  const handleSearch = () => {
    if (bidInput) navigate(`/osu/leaderboard/${bidInput}`, { replace: true });
    fetchLeaderboard();
  };

  const handleEntryClick = (entry) => {
    setSelectedEntry(selectedEntry?.rank === entry.rank ? null : entry);
  };

  const handleUsernameClick = (username, e) => {
    e.stopPropagation();
    navigate(`/osu/info?q=${encodeURIComponent(username)}`);
  };

  return (
    <div>
      {/* 返回按钮 */}
      {bid && (
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm mb-6 w-fit">
          <FaArrowLeft /> 返回
        </button>
      )}

      {/* 控制栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="w-1 h-6 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight whitespace-nowrap">排行榜</h2>
          {!bid && (
            <div className="flex items-center gap-2 flex-1">
              <input type="text" value={bidInput} onChange={(e) => setBidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="谱面 ID..." className="bg-[#15151e] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 w-32" />
              <button onClick={handleSearch} disabled={loading}
                className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors">
                {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 模式切换 */}
          <div className="flex items-center gap-1 bg-[#15151e]/80 p-1 rounded-lg border border-white/[0.05]">
            {MODE_IDS.map(mid => (
              <button key={mid} onClick={() => setActiveMode(mid)}
                className={`w-7 h-7 text-[10px] font-bold rounded-md transition-all ${activeMode === mid ? 'bg-pink-500/20 text-pink-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {MODE_LABELS[mid]}
              </button>
            ))}
          </div>

          {/* Mods 过滤 */}
          <div className="flex items-center gap-1 bg-[#15151e]/80 p-1 rounded-lg border border-white/[0.05] overflow-x-auto">
            {COMMON_MODS.map(mod => (
              <button key={mod} onClick={() => setSelectedMods(mod)}
                className={`px-1.5 py-1 text-[9px] font-bold rounded transition-all whitespace-nowrap ${selectedMods === mod ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {mod}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 谱面头部信息 */}
      {data?.beatmap && (
        <div className="mb-4 p-3 bg-[#15151e]/40 border border-white/[0.05] rounded-lg flex items-center gap-3">
          <div className="w-10 h-8 rounded overflow-hidden shrink-0">
            <OsuCoverImage src={data.beatmap.coverUrl} alt="" className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-200 truncate">{data.beatmap.title}</span>
              <OsuBeatmapStatusBadge status={data.beatmap.status} />
            </div>
            <div className="text-xs text-zinc-500 truncate">{data.beatmap.artist} — {data.beatmap.version}</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 shrink-0">
            <FaStar className="text-[10px]" /> {data.beatmap.starRating?.toFixed(2)}
          </div>
        </div>
      )}

      {/* 我的排名横幅 */}
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
            <div className="flex items-center px-4 py-2 text-xs text-zinc-500 font-bold uppercase tracking-wider border-b border-white/[0.05] bg-[#15151e]/95">
              <span className="w-12 text-center">#</span>
              <span className="w-8" />
              <span className="flex-1 min-w-0">玩家</span>
              <span className="w-14 text-center">评级</span>
              <span className="w-16 text-right">PP</span>
              <span className="w-20 text-right hidden sm:block">Acc</span>
              <span className="w-16 text-center hidden md:block">Mods</span>
              <span className="w-20 text-right hidden lg:block">Score</span>
              <span className="w-6 text-center" />
            </div>

            <AnimatePresence initial={false}>
              {data.scores.map((entry, i) => {
                const isHighlighted = data.currentUserRank?.highlight && entry.rank === data.currentUserRank.rank;
                const isExpanded = selectedEntry?.rank === entry.rank;

                return (
                  <div key={entry.userId + '-' + entry.rank}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => handleEntryClick(entry)}
                      className={`
                        flex items-center px-4 py-3 border-b border-white/[0.03]
                        hover:bg-white/[0.02] transition-colors cursor-pointer
                        ${isHighlighted ? 'border-l-2 border-pink-500 bg-pink-500/[0.03]' : ''}
                        ${isExpanded ? 'bg-white/[0.03]' : ''}
                      `}
                    >
                      {/* 排名 */}
                      <div className="w-12 text-center shrink-0">
                        {i < 3 ? <FaMedal className={`mx-auto ${RANK_COLORS[i + 1]}`} />
                          : <span className="text-sm font-mono text-zinc-600">#{entry.rank}</span>}
                      </div>

                      {/* 头像 */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 mr-2">
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <FaUser className="w-full h-full p-1.5 text-zinc-600" />
                        )}
                      </div>

                      {/* 用户名 */}
                      <div className="flex-1 min-w-0">
                        <span
                          onClick={(e) => handleUsernameClick(entry.username, e)}
                          className="text-sm font-bold text-zinc-200 hover:text-pink-400 transition-colors truncate block cursor-pointer"
                        >
                          {entry.username}
                          {entry.countryCode && (
                            <span className="ml-1.5 text-[10px] text-zinc-500">{entry.countryCode}</span>
                          )}
                        </span>
                      </div>

                      {/* 评级 */}
                      <div className="w-14 text-center shrink-0"><OsuGrade grade={entry.grade} size="sm" /></div>

                      {/* PP */}
                      <div className="w-16 text-right shrink-0"><span className="text-sm font-bold text-pink-400">{Math.round(entry.pp)}</span></div>

                      {/* Acc */}
                      <div className="w-20 text-right shrink-0 hidden sm:block">
                        <span className="text-xs text-zinc-400">{entry.accuracy?.toFixed(2)}%</span>
                      </div>

                      {/* Mods */}
                      <div className="w-16 text-center shrink-0 hidden md:block">
                        {entry.mods?.length > 0
                          ? <span className="text-[9px] font-bold text-rose-400">{entry.mods.join('')}</span>
                          : <span className="text-[9px] text-zinc-600">NM</span>}
                      </div>

                      {/* Score */}
                      <div className="w-20 text-right shrink-0 hidden lg:block">
                        <span className="text-xs text-zinc-400">{entry.score?.toLocaleString()}</span>
                      </div>

                      {/* 展开指示 */}
                      <div className="w-6 text-center shrink-0 text-zinc-600">
                        {isExpanded ? <FaChevronUp className="text-[10px] mx-auto" /> : <FaChevronDown className="text-[10px] mx-auto" />}
                      </div>
                    </motion.div>

                    {/* 展开详情 */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-white/[0.03]"
                      >
                        <div className="px-4 py-3 bg-[#15151e]/60">
                          {/* 判定详情 */}
                          <div className="flex items-center gap-4 text-xs mb-3">
                            <span className="text-emerald-400">300 <span className="text-zinc-500">{entry.count300 ?? '-'}</span></span>
                            <span className="text-blue-400">100 <span className="text-zinc-500">{entry.count100 ?? '-'}</span></span>
                            <span className="text-amber-400">50 <span className="text-zinc-500">{entry.count50 ?? '-'}</span></span>
                            <span className="text-red-400">Miss <span className="text-zinc-500">{entry.countMiss ?? '-'}</span></span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>Max Combo: <span className="text-zinc-300 font-mono">{entry.maxCombo}x</span></span>
                            <span>得分: <span className="text-zinc-300 font-mono">{entry.score?.toLocaleString()}</span></span>
                            {entry.hasReplay && (
                              <a href={entry.osuScoreUrl} target="_blank" rel="noreferrer"
                                className="text-pink-400 hover:text-pink-300 underline ml-auto"
                                onClick={(e) => e.stopPropagation()}>
                                查看回放 →
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </AnimatePresence>
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
    </div>
  );
}
