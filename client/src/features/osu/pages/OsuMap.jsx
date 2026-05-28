// ============================================================
// OsuMap — 谱面搜索（b1.7.11 重构版）
// 热搜索 + 双列 + 无限滚动 + 高级筛选
// GET /api/osu/search/beatmaps
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getBeatmap, searchBeatmaps } from '../api/osuApi';
import SearchInput from '../components/SearchInput';
import BeatmapCard from '../components/BeatmapCard';
import OsuMapCard from '../components/OsuMapCard';
import OsuSearchHistory from '../components/OsuSearchHistory';
import { FaSpinner, FaSearch, FaMusic, FaSlidersH, FaTimes } from 'react-icons/fa';
import useOsuCache from '../store/osuCache';

const STATUS_OPTIONS = ['ranked', 'qualified', 'loved', 'graveyard', 'pending', 'wip'];
const STATUS_LABELS = { ranked: 'Ranked', qualified: 'Qualified', loved: 'Loved', graveyard: 'Graveyard', pending: 'Pending', wip: 'WIP' };

export default function OsuMap() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cache = useOsuCache();

  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status')?.split(',') || []);
  const [starMin, setStarMin] = useState(Number(searchParams.get('star_min')) || 0);
  const [starMax, setStarMax] = useState(Number(searchParams.get('star_max')) || 15);
  const [creatorFilter, setCreatorFilter] = useState(searchParams.get('creator') || '');
  const [artistFilter, setArtistFilter] = useState(searchParams.get('artist') || '');
  const [titleFilter, setTitleFilter] = useState(searchParams.get('title') || '');

  // Detail view
  const [selectedBeatmap, setSelectedBeatmap] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);

  // Build search params for API
  const buildSearchParams = useCallback((cursorVal = null) => {
    const params = {};
    if (query.trim()) params.q = query.trim();
    if (statusFilter.length > 0) params.status = statusFilter.join(',');
    if (starMin > 0) params.starMin = starMin;
    if (starMax < 15) params.starMax = starMax;
    if (creatorFilter.trim()) params.creator = creatorFilter.trim();
    if (artistFilter.trim()) params.artist = artistFilter.trim();
    if (titleFilter.trim()) params.title = titleFilter.trim();
    params.limit = 20;
    if (cursorVal) params.cursor = cursorVal;
    return params;
  }, [query, statusFilter, starMin, starMax, creatorFilter, artistFilter, titleFilter]);

  // 搜索键：用于竞态保护
  const searchKeyRef = useRef(0);

  // Execute search
  const doSearch = useCallback(async (append = false) => {
    const cur = append ? cursor : null;
    if (!append) searchKeyRef.current++;
    const currentKey = searchKeyRef.current;
    setError(null);
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { data } = await searchBeatmaps(buildSearchParams(cur));
      const newResults = data?.beatmapsets || [];
      if (append) {
        setResults(prev => { const ids = new Set(prev.map(r => r.id)); return [...prev, ...newResults.filter(r => !ids.has(r.id))]; });
      } else {
        setResults(newResults);
        setHasSearched(true);
      }
      setCursor(data?.cursor || null);
      setTotal(data?.total || null);
    } catch (err) {
      setError(err.userMessage || '搜索失败');
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildSearchParams, cursor]);

  // 从输入中提取 beatmap ID（BID 或 URL）
  // 搜索词直搜（绕过 buildSearchParams 闭包问题）
  const doSearchWithQ = useCallback(async (searchQuery) => {
    searchKeyRef.current++;
    const currentKey = searchKeyRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      if (starMin > 0) params.starMin = starMin;
      if (starMax < 15) params.starMax = starMax;
      if (creatorFilter.trim()) params.creator = creatorFilter.trim();
      if (artistFilter.trim()) params.artist = artistFilter.trim();
      if (titleFilter.trim()) params.title = titleFilter.trim();
      params.limit = 20;
      const { data } = await searchBeatmaps(params);
      if (currentKey !== searchKeyRef.current) return;
      setResults(data?.beatmapsets || []);
      setCursor(data?.cursor || null);
      setTotal(data?.total || null);
    } catch (err) {
      if (currentKey === searchKeyRef.current) setError(err.userMessage || '搜索失败');
    } finally {
      if (currentKey === searchKeyRef.current) setLoading(false);
    }
  }, [statusFilter, starMin, starMax, creatorFilter, artistFilter, titleFilter]);

  // BID / URL 提取
  const extractBid = (input) => {
    if (!input) return null;
    if (/^\d+$/.test(input.trim())) return Number(input.trim());
    const match = input.match(/beatmaps\/(\d+)|#osu\/(\d+)|#taiko\/(\d+)|#fruits\/(\d+)|#mania\/(\d+)/i);
    if (match) return Number(match[1] || match[2] || match[3] || match[4] || match[5]);
    return null;
  };

  // 热搜索入口（SearchInput debounce 200ms 后调用）
  const handleHotSearch = useCallback((q) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setCursor(null);
      setHasSearched(false);
      return;
    }
    const bid = extractBid(q);
    if (bid) {
      setCursor(null);
      setResults([]);
      setLoading(true);
      getBeatmap(String(bid)).then(({ data }) => {
        setSelectedBeatmap(data);
        setHasSearched(true);
        setLoading(false);
      }).catch(() => {
        setError('未找到该谱面');
        setLoading(false);
      });
      return;
    }
    setCursor(null);
    setResults([]);
    doSearchWithQ(q);
  }, [doSearchWithQ]);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    if (query.trim() || statusFilter.length > 0 || creatorFilter.trim()) {
      setCursor(null);
      setResults([]);
      doSearch(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !cursor || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor && !loadingMore) {
          doSearch(true);
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [cursor, loadingMore, loading, doSearch]);

  // URL sync
  useEffect(() => {
    const params = {};
    if (query.trim()) params.q = query.trim();
    if (statusFilter.length) params.status = statusFilter.join(',');
    if (starMin > 0) params.starMin = starMin;
    if (starMax < 15) params.starMax = starMax;
    if (creatorFilter.trim()) params.creator = creatorFilter.trim();
    if (artistFilter.trim()) params.artist = artistFilter.trim();
    if (titleFilter.trim()) params.title = titleFilter.trim();
    setSearchParams(params, { replace: true });
  }, [query, statusFilter, starMin, starMax, creatorFilter, artistFilter, titleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select a beatmap to view detail
  const handleSelectBeatmap = async (beatmapset) => {
    const bid = beatmapset.beatmaps?.[0]?.id || beatmapset.difficulties?.[0]?.id;
    if (!bid) { setError('该谱面缺少难度 ID，无法打开详情'); return; }
    setDetailLoading(true);
    try {
      const { data } = await getBeatmap(String(bid));
      setSelectedBeatmap(data);
      // Add to history
      cache.addMapHistory({
        bid: bid,
        coverUrl: beatmapset.covers?.cover,
        title: beatmapset.title,
        mode: 'standard',
        starRating: beatmapset.difficulties?.[0]?.difficulty_rating,
        beatmapStatus: beatmapset.status,
      });
    } catch (_) {
      setSelectedBeatmap(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleStatus = (s) => {
    setStatusFilter(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const resetFilters = () => {
    setStatusFilter([]);
    setStarMin(0);
    setStarMax(15);
    setCreatorFilter('');
    setArtistFilter('');
    setTitleFilter('');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <img src="/osu-resources/lazer-nuget.png" className="w-10 h-10 inline-block" alt="osu!" />
          谱面查询
        </h2>
      </div>

      {/* 热搜索 */}
      <div className="mb-4">
        <SearchInput
          value={query}
          onChange={handleHotSearch}
          onSearch={handleSearch}
          placeholder="搜索谱面标题、艺术家、谱师..."
          loading={loading}
          className="mb-3"

        />

        {/* 高级筛选 toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              showFilters ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20' : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.03] border border-white/[0.06]'
            }`}
          >
            <FaSlidersH /> 高级筛选
            {(statusFilter.length > 0 || starMin > 0 || starMax < 15 || creatorFilter) && (
              <span className="w-4 h-4 bg-pink-500 rounded-full text-[9px] text-white flex items-center justify-center">
                {(statusFilter.length > 0 ? 1 : 0) + (starMin > 0 || starMax < 15 ? 1 : 0) + (creatorFilter ? 1 : 0)}
              </span>
            )}
          </button>
          {hasSearched && total != null && (
            <span className="text-xs text-zinc-600">共 {total} 条结果</span>
          )}
          {(statusFilter.length > 0 || starMin > 0 || starMax < 15 || creatorFilter) && (
            <button onClick={resetFilters} className="text-[10px] text-zinc-600 hover:text-zinc-400 ml-auto">
              重置筛选
            </button>
          )}
        </div>
      </div>

      {/* 高级筛选面板 */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-[#15151e]/80 border border-white/[0.06] rounded-xl p-4 space-y-4">
              {/* 谱面状态 */}
              <div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">谱面状态</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        statusFilter.includes(s)
                          ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                          : 'text-zinc-500 hover:text-zinc-300 border border-white/[0.06]'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 星级范围 */}
              <div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  星级范围 <span className="text-zinc-600 normal-case">({starMin.toFixed(1)} - {starMax >= 15 ? '+\u221E' : starMax.toFixed(1)})</span>
                </div>
                <div className="relative px-1">
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={0.1}
                    value={starMin}
                    onChange={(e) => setStarMin(Math.min(Number(e.target.value), starMax - 0.1))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    style={{ pointerEvents: 'auto' }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={0.1}
                    value={starMax}
                    onChange={(e) => setStarMax(Math.max(Number(e.target.value), starMin + 0.1))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    style={{ pointerEvents: 'auto' }}
                  />
                  {/* Track */}
                  <div className="h-1.5 bg-zinc-800 rounded-full relative">
                    <div
                      className="absolute h-full bg-pink-500/40 rounded-full"
                      style={{
                        left: `${(starMin / 15) * 100}%`,
                        width: `${((starMax - starMin) / 15) * 100}%`,
                      }}
                    />
                  </div>
                  {/* Labels */}
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-zinc-600">{starMin.toFixed(1)}</span>
                    <span className="text-[10px] text-zinc-600">{starMax.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* 谱师 */}
              <div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">谱师</div>
                <input
                  type="text"
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  placeholder="按谱师名筛选..."
                  className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500/40"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 搜索结果 */}
      {loading && !loadingMore && (
        <div className="flex items-center justify-center py-20">
          <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
        </div>
      )}

      {error && (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          {error}
        </div>
      )}

      {/* 结果网格 */}
      {hasSearched && !loading && results.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {results.map((beatmapset) => (
              <BeatmapCard
                key={beatmapset.id}
                beatmapset={beatmapset}
                onClick={handleSelectBeatmap}
                onSelectDifficulty={(bid) => navigate(`/osu/leaderboard/${bid}`)}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {cursor && (
            <div ref={sentinelRef} className="h-10 flex items-center justify-center">
              {loadingMore ? (
                <FaSpinner className="animate-spin text-zinc-500 text-lg" />
              ) : (
                <span className="text-xs text-zinc-600">滚动加载更多</span>
              )}
            </div>
          )}
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="py-20 text-center text-zinc-600">
          <FaMusic className="mx-auto text-3xl text-zinc-700 mb-4" />
          未找到匹配的谱面
        </div>
      )}

      {/* 空状态 */}
      {!hasSearched && !loading && (
        <div className="py-20 text-center text-zinc-600">
          <FaMusic className="mx-auto text-3xl text-zinc-700 mb-4" />
          输入关键词搜索谱面
        </div>
      )}

      {/* 详情弹层（复用现有 OsuMapCard） */}
      <AnimatePresence>
        {selectedBeatmap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setSelectedBeatmap(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-2xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <button
                  onClick={() => setSelectedBeatmap(null)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-20 bg-[#15151e] rounded-xl">
                    <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
                  </div>
                ) : (
                  <OsuMapCard
                    beatmap={selectedBeatmap}
                    onViewLeaderboard={(id) => {
                      setSelectedBeatmap(null);
                      navigate(`/osu/leaderboard/${id.split(`_`)[0]}`);
                    }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
