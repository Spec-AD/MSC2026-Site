// ============================================================
// OsuTodayBest — 今日最佳成绩
// GET /api/osu/todaybest?mode=
// ============================================================

import { useState, useEffect } from 'react';
import { getTodayBest } from '../api/osuApi';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import OsuStarBadge from '../components/OsuStarBadge';
import { FaSpinner, FaSun, FaFire } from 'react-icons/fa';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];

export default function OsuTodayBest() {
  const [activeMode, setActiveMode] = useState('standard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await getTodayBest(activeMode);
      setData(res);
    } catch (err) {
      setError(err.userMessage || '加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeMode]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">今日最佳</h2>
          {data?.isNewRecord && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <FaFire /> New PB!
            </span>
          )}
        </div>
        <OsuModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
      </div>

      {data?.bp200Threshold !== undefined && (
        <div className="mb-6 text-xs text-zinc-500 bg-[#15151e]/40 border border-white/[0.05] rounded-lg px-4 py-2">
          BP 200 底线：<span className="text-pink-400 font-bold">{data.bp200Threshold.toFixed(2)} pp</span>
          {data.isNewRecord && (
            <span className="text-amber-400 ml-2">✨ 有新成绩进入 BP 200！</span>
          )}
        </div>
      )}

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
          <FaSun className="mx-auto text-2xl text-zinc-700 mb-3" />
          今日暂无通过成绩
        </div>
      ) : (
        <div className="space-y-3">
          {data.scores.map((score, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 bg-[#15151e]/60 border border-white/[0.05] rounded-xl hover:border-amber-500/20 transition-colors"
            >
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                <OsuCoverImage src={score.coverUrl} alt={score.title} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-zinc-100 truncate">{score.title}</div>
                <div className="flex items-center gap-2">
                  {score.starRating != null && (
                    <OsuStarBadge starRating={score.starRating} size="sm" />
                  )}
                  <span className="text-xs text-zinc-500">{score.version}</span>
                  <OsuBeatmapStatusBadge status={score.beatmapStatus} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {score.mods?.length > 0 && (
                    <span className="text-[10px] font-bold text-rose-400">+{score.mods.join('')}</span>
                  )}
                </div>
              </div>
              <OsuGrade grade={score.grade} size="md" />
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-pink-400">{Math.round(score.pp)}<span className="text-xs text-pink-500/60 ml-1">pp</span></div>
                <div className="text-xs text-zinc-400">{score.accuracy?.toFixed(2)}%</div>
              </div>
              {data.isNewRecord && (
                <FaFire className="text-amber-400 text-lg animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
