// ============================================================
// OsuInfo — 玩家信息查询（输入用户名/UID）
// GET /api/osu/info?q=
// ============================================================

import { useState } from 'react';
import { getOsuInfo } from '../api/osuApi';
import { FaSpinner, FaSearch, FaUser, FaGlobe, FaMapMarkerAlt, FaTrophy, FaCalendar } from 'react-icons/fa';

export default function OsuInfo() {
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data } = await getOsuInfo(query.trim());
      setPlayer(data);
    } catch (err) {
      setError(err.userMessage || '未找到该玩家');
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">玩家查询</h2>
      </div>

      {/* 搜索框 */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 osu! 用户名 或 UID..."
            className="w-full bg-[#15151e] border border-white/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
          查询
        </button>
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          {error}
        </div>
      )}

      {/* 玩家信息 */}
      {player && !loading && (
        <div className="bg-[#15151e] border border-white/[0.05] rounded-xl overflow-hidden">
          {/* 封面头 */}
          <div className="relative h-48">
            <img
              src={player.coverUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#15151e] via-[#15151e]/60 to-transparent" />
            <div className="absolute bottom-4 left-6 flex items-end gap-4">
              <img
                src={player.avatarUrl}
                alt={player.username}
                className="w-20 h-20 rounded-full border-2 border-white/10 object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h3 className="text-xl font-bold text-white">{player.username}</h3>
                <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                  {player.country && (
                    <span className="flex items-center gap-1"><FaGlobe className="text-[10px]" /> {player.country}</span>
                  )}
                  {player.joinDate && (
                    <span className="flex items-center gap-1"><FaCalendar className="text-[10px]" /> {new Date(player.joinDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 各模式统计 */}
          <div className="p-6">
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">统计</h4>
          {player.statistics?.standard ? (
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">osu!standard</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatItem label="PP" value={Math.round(player.statistics.standard.pp).toLocaleString()} accent />
                <StatItem label="Rank" value={`#${player.statistics.standard.rank?.toLocaleString() || '-'}`} />
                <StatItem label="地区排名" value={`#${player.statistics.standard.countryRank?.toLocaleString() || '-'}`} />
                <StatItem label="命中率" value={`${player.statistics.standard.accuracy?.toFixed(2)}%`} />
                <StatItem label="游玩次数" value={player.statistics.standard.playCount?.toLocaleString()} />
                <StatItem label="等级" value={player.statistics.standard.level?.toString()} />
                <StatItem label="Max Combo" value={`${player.statistics.standard.maxCombo?.toLocaleString()}x`} />
                <StatItem label="总 Hits" value={player.statistics.standard.totalHits?.toLocaleString()} />
                <StatItem label="Ranked Score" value={player.statistics.standard.rankedScore?.toLocaleString()} />
              </div>
            </div>
          ) : (
            <div className="text-zinc-600 text-sm bg-black/20 rounded-lg p-4 text-center">暂无统计数据</div>
          )}
          </div>
        </div>
      )}

      {/* 未搜索 */}
      {!searched && !loading && (
        <div className="py-20 text-center text-zinc-600">
          <FaUser className="mx-auto text-3xl text-zinc-700 mb-4" />
          输入 osu! 用户名或 UID 查询玩家信息
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, accent = false }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-600">{label}</div>
      <div className={`text-sm font-bold ${accent ? 'text-pink-400' : 'text-zinc-200'}`}>{value || '-'}</div>
    </div>
  );
}
