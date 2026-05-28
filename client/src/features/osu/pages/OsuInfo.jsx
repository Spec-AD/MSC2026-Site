// ============================================================
// OsuInfo — 玩家信息查询（b1.7 多模式展示）
// GET /api/osu/info?q=
// 响应结构: { username, osuUsername, avatarUrl, coverUrl, country, joinDate, defaultMode, statistics: { standard, taiko, catch, mania } }
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOsuInfo } from '../api/osuApi';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuSearchHistory from '../components/OsuSearchHistory';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaSearch, FaUser, FaGlobe, FaCalendar } from 'react-icons/fa';
import { MODE_LABELS } from '../../../constants/osuModes';
import useOsuCache from '../store/osuCache';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];

export default function OsuInfo() {
  const [searchParams] = useSearchParams();
  const cache = useOsuCache();
  const [query, setQuery] = useState(cache.infoQuery || '');
  const [player, setPlayer] = useState(cache.infoData);
  const [activeMode, setActiveMode] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(!!cache.infoData);
  const [isFocused, setIsFocused] = useState(false);
  const blurTimerRef = useRef(null);

  // 从 URL ?q= 参数自动触发搜索
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim() && !searched) {
      setQuery(q.trim());
      // 延迟一下让 query state 更新后再搜索
      const timer = setTimeout(() => {
        getOsuInfo(q.trim()).then(({ data }) => {
          setPlayer(data);
          recordPlayerHistory(data);
          cache.setInfo(q.trim(), data);
          setSearched(true);
          if (data?.defaultMode && MODE_IDS.includes(data.defaultMode)) {
            setActiveMode(data.defaultMode);
          }
        }).catch((err) => {
          setError(err.userMessage || '未找到该玩家');
          setSearched(true);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data } = await getOsuInfo(query.trim());
      setPlayer(data);
      recordPlayerHistory(data);
      cache.setInfo(query.trim(), data);
      // 默认选中该用户游玩最多的模式
      if (data?.defaultMode && MODE_IDS.includes(data.defaultMode)) {
        setActiveMode(data.defaultMode);
      } else {
        setActiveMode('standard');
      }
    } catch (err) {
      setError(err.userMessage || '未找到该玩家');
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  };

  // 搜索成功后记录玩家历史
  const recordPlayerHistory = (data) => {
    if (!data) return;
    cache.addPlayerHistory({
      username: data.username,
      avatarUrl: data.avatarUrl,
      countryCode: data.countryCode || data.country,
      osuId: data.osuId || data.id,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // 搜索框 focus/blur
  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setIsFocused(true);
  };
  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setIsFocused(false), 200);
  };

  // 历史条目实时过滤（由 OsuSearchHistory 内部处理，此处不再预过滤）

  // 点击历史条目
  const handleHistorySelect = async (entry) => {
    setQuery(entry.username);
    setLoading(true);
    setError(null);
    setPlayer(null);
    setSearched(true);
    setIsFocused(false);
    try {
      const { data } = await getOsuInfo(entry.username);
      setPlayer(data);
      recordPlayerHistory(data);
      cache.setInfo(entry.username, data);
      if (data?.defaultMode && MODE_IDS.includes(data.defaultMode)) {
        setActiveMode(data.defaultMode);
      }
    } catch (err) {
      setError(err.userMessage || '未找到该玩家');
    } finally {
      setLoading(false);
    }
  };

  // 当前模式的统计数据
  const currentStats = player?.statistics?.[activeMode] || null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <img src="/osu-resources/lazer-nuget.png" className="w-4 h-4 inline-block" alt="osu!" />
          玩家查询
        </h2>
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
            onFocus={handleFocus}
            onBlur={handleBlur}
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

      {/* 搜索历史 — 仅搜索框 focus 时展开（含动画） */}
      <AnimatePresence mode="popLayout">
        {isFocused && cache.playerHistory.length > 0 && (
          <motion.div
            key="info-history"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <OsuSearchHistory
              items={cache.playerHistory}
              filterQuery={query}
              type="player"
              onSelect={handleHistorySelect}
              onClear={() => cache.clearPlayerHistory()}
            />
          </motion.div>
        )}
      </AnimatePresence>

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

          {/* 模式切换 Tab */}
          <div className="px-6 pt-4">
            <OsuModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
          </div>

          {/* 各模式统计 */}
          <div className="p-6">
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
              {MODE_LABELS[activeMode] || activeMode} 统计
            </h4>
            {currentStats ? (
              <div className="bg-black/20 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatItem label="PP" value={Math.round(currentStats.pp).toLocaleString()} accent />
                  <StatItem label="Rank" value={`#${currentStats.rank?.toLocaleString() || '-'}`} />
                  <StatItem label="地区排名" value={`#${currentStats.countryRank?.toLocaleString() || '-'}`} />
                  <StatItem label="命中率" value={`${currentStats.accuracy?.toFixed(2)}%`} />
                  <StatItem label="游玩次数" value={currentStats.playCount?.toLocaleString()} />
                  <StatItem label="等级" value={currentStats.level?.toString()} />
                  <StatItem label="Max Combo" value={`${currentStats.maxCombo?.toLocaleString()}x`} />
                  <StatItem label="总 Hits" value={currentStats.totalHits?.toLocaleString()} />
                  <StatItem label="Ranked Score" value={currentStats.rankedScore?.toLocaleString()} />
                </div>
              </div>
            ) : (
              <div className="text-zinc-600 text-sm bg-black/20 rounded-lg p-4 text-center">
                {MODE_LABELS[activeMode]} 模式暂无数据
              </div>
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
