// ============================================================
// OsuTodayBest — 今日最佳成绩
// b1.7.08: BP200 底线筛选 + PP 显示优化
// GET /api/osu/todaybest?mode=
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getTodayBest } from '../api/osuApi';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import OsuStarBadge from '../components/OsuStarBadge';
import OsuModIcons from '../components/OsuModIcons';
import OsuScoreDetailPanel from '../components/OsuScoreDetailPanel';
import useLightSync from '../hooks/useLightSync';
import { FaSpinner, FaSun, FaFire, FaSyncAlt } from 'react-icons/fa';
import { getRulesetIconPath } from '../../../constants/osuModes';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];

function formatElapsed(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return `${Math.floor(diff / 86400_000)} 天前`;
}

export default function OsuTodayBest() {
  const [activeMode, setActiveMode] = useState('standard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const { refresh, refreshing, cooldown, lastRefreshTime } = useLightSync(activeMode);

  // BP100 底线 + Ranked 筛选
  const baseline = data?.bpThreshold ?? null;
  const filteredScores = useMemo(() => {
    return (data?.scores || []).filter(s => {
      const isRanked = s.beatmapStatus === 'ranked';
      const aboveBaseline = baseline === null || s.pp >= baseline;
      return isRanked && aboveBaseline;
    });
  }, [data?.scores, baseline]);

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

  const handleRefresh = async () => {
    try {
      const result = await refresh();
      if (result?.todaybest) setData(result.todaybest);
      else fetchData();
    } catch (err) {
      setError(err.userMessage || '同步失败');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <img src="/osu-resources/lazer-nuget.png" className="w-4 h-4 inline-block" alt="osu!" />
            今日最佳
          </h2>
          {data?.isNewRecord && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <FaFire /> New PB!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefreshTime && (
            <span className="text-[10px] text-zinc-600">
              上次更新: {formatElapsed(lastRefreshTime)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={cooldown > 0 || refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50
              bg-pink-600 hover:bg-pink-500 text-white disabled:bg-pink-600/30"
          >
            {refreshing ? (
              <><FaSpinner className="animate-spin" /> 同步中...</>
            ) : cooldown > 0 ? (
              <><FaSyncAlt className="opacity-50" /> 冷却中 ({Math.ceil(cooldown / 1000)}s)</>
            ) : (
              <><FaSyncAlt /> 同步最近成绩</>
            )}
          </button>
          <OsuModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
        </div>
      </div>

      {baseline !== null && (
        <div className="mb-6 text-xs text-zinc-500 bg-[#15151e]/40 border border-white/[0.05] rounded-lg px-4 py-2 flex items-center gap-3">
          <span>BP 100 底线：<span className="text-pink-400 font-bold">{baseline.toFixed(2)} pp</span></span>
          <span className="text-zinc-600">|</span>
          <span>今日上榜：<span className="text-amber-400 font-bold">{filteredScores.length}</span> 首</span>
          {data.isNewRecord && (
            <span className="text-amber-400 ml-auto">✨ 有新成绩进入 BP 100！</span>
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
      ) : !filteredScores.length ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaSun className="mx-auto text-2xl text-zinc-700 mb-3" />
          {data?.scores?.length > 0 ? '今天还没有上榜成绩喵' : '今日暂无通过成绩'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScores.map((score, i) => (
            <div
              key={i}
              onClick={() => setSelectedScore(score)}
              className="flex items-center gap-4 p-4 bg-[#15151e]/60 border border-white/[0.05] rounded-xl hover:border-amber-500/20 transition-colors cursor-pointer"
            >
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                <OsuCoverImage src={score.coverUrl} alt={score.title} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-zinc-100 truncate">{score.titleOriginal || score.title}</div>
                <div className="flex items-center gap-2">
                  {score.starRating != null && (
                    <OsuStarBadge starRating={score.starRating} size="sm" />
                  )}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const iconPath = getRulesetIconPath(score.mode);
                      return iconPath ? (
                        <img src={iconPath} className="w-3 h-3" alt={score.mode} />
                      ) : null;
                    })()}
                    <span className="text-xs text-zinc-500">{score.version}</span>
                  </div>
                  <OsuBeatmapStatusBadge status={score.beatmapStatus} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <OsuModIcons mods={score.mods} size="sm" />
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

      <AnimatePresence>
        {selectedScore && (
          <OsuScoreDetailPanel
            score={selectedScore}
            onClose={() => setSelectedScore(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
