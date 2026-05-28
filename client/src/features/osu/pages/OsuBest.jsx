// ============================================================
// OsuBest — BP 200 列表
// GET /api/osu/best?mode=&limit=&page=
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getBest } from '../api/osuApi';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuScoreList from '../components/OsuScoreList';
import OsuScoreDetailPanel from '../components/OsuScoreDetailPanel';
import { FaSpinner, FaTrophy } from 'react-icons/fa';

export default function OsuBest() {
  const [activeMode, setActiveMode] = useState('standard');
  const [data, setData] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBest = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await getBest({ mode: activeMode, limit: 200 });
      setData(res);
    } catch (err) {
      setError(err.userMessage || '加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBest();
  }, [activeMode]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <img src="/osu-resources/lazer-nuget.png" className="w-10 h-10 inline-block" alt="osu!" />
            Best Performance
          </h2>
          {data && (
            <span className="text-xs text-zinc-600 font-medium">BP {data.total || data.scores?.length || 0}</span>
          )}
        </div>
        <OsuModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          {error}
        </div>
      ) : !data?.scores?.length ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaTrophy className="mx-auto text-2xl text-zinc-700 mb-3" />
          暂无成绩记录
        </div>
      ) : (
        <OsuScoreList
          scores={data.scores}
          height="75vh"
          emptyMessage="暂无成绩记录"
          onScoreClick={(score) => setSelectedScore(score)}
        />
      )}
      <AnimatePresence>
        {selectedScore && (
          <OsuScoreDetailPanel key="detail-panel" score={selectedScore} onClose={() => setSelectedScore(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
