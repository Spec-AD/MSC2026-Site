// ============================================================
// OsuMap — 谱面信息查询
// GET /api/osu/map/:bid
// ============================================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getBeatmap } from '../api/osuApi';
import OsuMapCard from '../components/OsuMapCard';
import OsuSearchHistory from '../components/OsuSearchHistory';
import { FaSpinner, FaSearch, FaMusic, FaMap as FaMapIcon } from 'react-icons/fa';
import useOsuCache from '../store/osuCache';

const modeIcons = {
  standard: '/osu-resources/RulesetOsu.png',
  taiko: '/osu-resources/RulesetTaiko.png',
  catch: '/osu-resources/RulesetCatch.png',
  mania: '/osu-resources/RulesetMania.png',
};

export default function OsuMap() {
  const cache = useOsuCache();
  const [bid, setBid] = useState(cache.mapQuery || '');
  const [beatmap, setBeatmap] = useState(cache.mapData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(!!cache.mapData);
  const [isFocused, setIsFocused] = useState(false);
  const blurTimerRef = useRef(null);
  const navigate = useNavigate();

  // 历史条目实时过滤（由 OsuSearchHistory 内部处理，此处不再预过滤）

  const handleSearch = async () => {
    if (!bid.trim() || isNaN(Number(bid))) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data } = await getBeatmap(bid.trim());
      setBeatmap(data);
      cache.setMap(bid.trim(), data);
      // 搜索成功后记录历史
      if (data) {
        cache.addMapHistory({
          bid: Number(bid.trim()),
          coverUrl: data.coverUrl || data.covers?.cover,
          title: data.titleUnicode || data.title || '',
          version: data.version || '',
          mode: data.mode || 'standard',
          modeIcon: modeIcons[data.mode || 'standard'],
          starRating: data.starRating,
          beatmapStatus: data.status,
        });
      }
    } catch (err) {
      setError(err.userMessage || '未找到该谱面');
      setBeatmap(null);
    } finally {
      setLoading(false);
    }
  };

  // 点击历史条目
  const handleHistorySelect = async (entry) => {
    setBid(String(entry.bid));
    setIsFocused(false);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data } = await getBeatmap(String(entry.bid));
      setBeatmap(data);
      cache.setMap(String(entry.bid), data);
    } catch (err) {
      setError(err.userMessage || '未找到该谱面');
      setBeatmap(null);
    } finally {
      setLoading(false);
    }
  };

  // 搜索框 focus/blur
  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setIsFocused(true);
  };
  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setIsFocused(false), 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <img src="/osu-resources/lazer-nuget.png" className="w-4 h-4 inline-block" alt="osu!" />
          谱面查询
        </h2>
      </div>

      {/* 搜索框 */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex-1 relative">
          <FaMusic className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm" />
          <input
            type="text"
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="输入谱面 ID（beatmapId）..."
            className="w-full bg-[#15151e] border border-white/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !bid.trim()}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
          查询
        </button>
        {beatmap && (
          <button
            onClick={() => navigate(`/osu/leaderboard/${beatmap.beatmapId}`)}
            className="px-4 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <FaMapIcon /> 排行榜
          </button>
        )}
      </div>

      {/* 搜索历史面板 — 搜索框 focus 时展开（含动画） */}
      <AnimatePresence mode="popLayout">
        {isFocused && cache.mapHistory.length > 0 && (
          <motion.div
            key="map-history"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-4"
          >
            <OsuSearchHistory
              items={cache.mapHistory}
              filterQuery={bid}
              type="bid"
              onSelect={handleHistorySelect}
              onClear={() => cache.clearMapHistory()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加载 */}
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

      {/* 谱面信息 */}
      {beatmap && !loading && (
        <div className="max-w-2xl mx-auto">
          <OsuMapCard
            beatmap={beatmap}
            onViewLeaderboard={(id) => navigate(`/osu/leaderboard/${id}`)}
          />
        </div>
      )}

      {/* 空状态 */}
      {!searched && !loading && (
        <div className="py-20 text-center text-zinc-600">
          <FaMusic className="mx-auto text-3xl text-zinc-700 mb-4" />
          输入谱面 ID 查看详细信息
        </div>
      )}
    </div>
  );
}
