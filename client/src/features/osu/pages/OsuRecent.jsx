// ============================================================
// OsuRecent — 最近所有成绩（含 F）
// b1.7.07: 防抖自动刷新 + 模式持久化 + 自动 refresh + showTime
// GET /api/osu/recent?mode=&from=&to=&page=&limit=
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { getRecent } from '../api/osuApi';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuScoreCard from '../components/OsuScoreCard';
import useDebounce from '../hooks/useDebounce';
import { FaSpinner, FaChevronLeft, FaChevronRight, FaFilter, FaExclamationCircle } from 'react-icons/fa';

const PREFERRED_MODE_KEY = 'osu_recent_mode';

export default function OsuRecent() {
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem(PREFERRED_MODE_KEY) || 'standard';
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const RECENT_REFRESH_KEY = 'osu_re_…fresh';

  // 从 sessionStorage 恢复冷却状态
  const isCoolingDown = () => {
    try {
      const stored = sessionStorage.getItem(RECENT_REFRESH_KEY);
      return stored && (Date.now() - parseInt(stored, 10)) < 60000;
    } catch (_) { return false; }
  };

  // 所有筛选条件统一防抖
  const debouncedFilters = useDebounce({ mode: activeMode, page, from: dateFrom, to: dateTo }, 500);

  const fetchRecent = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = { mode: debouncedFilters.mode, page: debouncedFilters.page, limit: 20 };
      if (debouncedFilters.from) params.from = debouncedFilters.from;
      if (debouncedFilters.to) params.to = debouncedFilters.to;
      if (refresh) params.refresh = true;
      const { data: res } = await getRecent(params);
      setData(res);
      if (refresh) setHasRefreshed(true);
    } catch (err) {
      setData(null);
      setError(err?.userMessage || '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 防抖值变化时自动触发查询（跳过首屏，由 auto-refresh effect 接管）
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    fetchRecent(false);
  }, [debouncedFilters]);

  // 模式切换：重置页码 + 持久化
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setPage(1);
    localStorage.setItem(PREFERRED_MODE_KEY, mode);
  };

  // 页面首次加载时自动触发一次 refresh（60s 冷却，跨挂载持久化）
  // 这是首屏唯一的查询触发，debounce effect 跳过首屏
  useEffect(() => {
    initialLoadDoneRef.current = false;
    if (isCoolingDown()) {
      // 冷却中，只做本地查询
      fetchRecent(false);
    } else {
      sessionStorage.setItem(RECENT_REFRESH_KEY, String(Date.now()));
      fetchRecent(true);
    }
    initialLoadDoneRef.current = true;
  }, []);

  const defaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">最近游玩</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-[#15151e] border border-white/[0.05] rounded-lg transition-colors"
          >
            <FaFilter /> 筛选
          </button>
          <OsuModeTabs activeMode={activeMode} onModeChange={handleModeChange} />
        </div>
      </div>

      {/* 日期筛选 */}
      {showFilters && (
        <div className="mb-6 p-4 bg-[#15151e] border border-white/[0.05] rounded-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">从</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder={defaultFrom()}
                className="bg-black/30 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">到</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-black/30 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 w-36"
              />
            </div>
            {/* 筛选条件变更后自动 500ms 防抖刷新，无需查询按钮 */}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-500 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaExclamationCircle className="mx-auto text-xl mb-2" />
          {error}
        </div>
      ) : !data || data.scores?.length === 0 ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          {dateFrom || dateTo
            ? '当前筛选条件下无匹配记录'
            : hasRefreshed
              ? '近期无游玩记录'
              : '暂无记录，首次加载正在同步最新数据...'}
        </div>
      ) : (
        <>
          <div className="bg-[#15151e]/40 rounded-xl border border-white/[0.05] overflow-hidden mb-4">
            <div className="sticky top-0 bg-[#15151e]/95 backdrop-blur-sm z-10 flex items-center px-3 py-2 text-xs text-zinc-500 font-bold uppercase tracking-wider border-b border-white/[0.05]">
              <span className="w-10 text-center">#</span>
              <span className="w-14" />
              <span className="w-10 text-center">评级</span>
              <span className="flex-1 min-w-0">曲名</span>
              <span className="w-24 text-right">PP</span>
              <span className="w-20 text-right hidden sm:block">Acc</span>
            </div>
            {data.scores.map((score, i) => (
              <OsuScoreCard key={i} score={score} rank={(page - 1) * 20 + i + 1} showTime={true} />
            ))}
          </div>

          {/* 分页 */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft /> 上一页
              </button>
              <span className="text-zinc-500">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                下一页 <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
