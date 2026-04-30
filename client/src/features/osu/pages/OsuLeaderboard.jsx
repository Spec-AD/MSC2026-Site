// ============================================================
// OsuLeaderboard — 谱面全球排行榜（对齐琉璃字段表 v1.0）
// GET /api/osu/leaderboard/:bid?mode=&mods=&limit=
// 响应结构：{ beatmap, scores: [{ rank, score, accuracy, pp, ... user: { id, username, avatarUrl, country } }], total }
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import { FaSpinner, FaArrowLeft, FaGlobeAsia, FaMedal, FaUser, FaSearch, FaStar } from 'react-icons/fa';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];
const MODE_LABELS = { standard: 'S', taiko: 'T', catch: 'C', mania: 'M' };
const COMMON_MODS = ['NM', 'HD', 'HR', 'DT', 'HDHR', 'HDDT', 'HRDT', 'HDHRDT', 'FL', 'EZ'];

const RANK_COLORS = {
  1: 'text-yellow-400',
  2: 'text-zinc-300',
  3: 'text-amber-600',
};

export default function OsuLeaderboard() {
  const { bid } = useParams();
  const navigate = useNavigate();
  const [bidInput, setBidInput] = useState(bid || '');
  const [activeMode, setActiveMode] = useState('standard');
  const [selectedMods, setSelectedMods] = useState('NM');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const effectiveBid = bid || bidInput;

  const fetchLeaderboard = async () => {
    if (!effectiveBid || isNaN(Number(effectiveBid))) return;
    setLoading(true);
    setError(null);
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

  return (
    <div>
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

      {/* 谱面标题 */}
      {data?.beatmap && (
        <div className="mb-4 p-3 bg-[#15151e]/40 border border-white/[0.05] rounded-lg flex items-center gap-3">
          <div className="w-10 h-8 rounded overflow-hidden">
            <OsuCoverImage src={data.beatmap.beatmapsetId ? `https://assets.ppy.sh/beatmaps/${data.beatmap.beatmapsetId}/covers/card.jpg` : ''}
              alt="" className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-zinc-200 truncate">{data.beatmap.title}</div>
            <div className="text-xs text-zinc-500 truncate">{data.beatmap.artist} — {data.beatmap.version}</div>
          </div>
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <FaStar className="text-[10px]" /> {data.beatmap.starRating?.toFixed(2)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><FaSpinner className="animate-spin text-2xl text-pink-500/50" /></div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">{error}</div>
      ) : data?.scores?.length > 0 ? (
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
          </div>

          {data.scores.map((entry, i) => (
            <div key={i} className="flex items-center px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              {/* 排名 */}
              <div className="w-12 text-center shrink-0">
                {i < 3 ? <FaMedal className={`mx-auto ${RANK_COLORS[i + 1]}`} />
                  : <span className="text-sm font-mono text-zinc-600">#{entry.rank || i + 1}</span>}
              </div>

              {/* 头像 */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 mr-2">
                {entry.user?.avatarUrl ? (
                  <img src={entry.user.avatarUrl} alt="" className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <FaUser className="w-full h-full p-1.5 text-zinc-600" />
                )}
              </div>

              {/* 用户名 */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-zinc-200 truncate block">
                  {entry.user?.username}
                  {entry.user?.country && (
                    <span className="ml-1.5 text-[10px] text-zinc-500">{entry.user.country}</span>
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
            </div>
          ))}
        </div>
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
