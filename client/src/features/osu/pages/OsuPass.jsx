// ============================================================
// OsuPass — 最近通过的成绩（四模式各一条）
// b1.7.07: 新增轻量同步刷新按钮 + 60s 冷却
// GET /api/osu/pass   GET /api/osu/pass/all
// ============================================================

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getPass } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import OsuStarBadge from '../components/OsuStarBadge';
import OsuModIcons from '../components/OsuModIcons';
import OsuScoreDetailPanel from '../components/OsuScoreDetailPanel';
import useLightSync from '../hooks/useLightSync';
import { FaSpinner, FaCheckCircle, FaSyncAlt } from 'react-icons/fa';
import { MODE_LABELS, getRulesetIconPath } from '../../../constants/osuModes';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];

function formatElapsed(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return `${Math.floor(diff / 86400_000)} 天前`;
}

export default function OsuPass() {
  const [activeMode, setActiveMode] = useState('standard');
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const { refresh, refreshing, cooldown, lastRefreshTime } = useLightSync(activeMode);

  const fetchPass = async (mode) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getPass(mode);
      setPassData(data);
    } catch (err) {
      setError(err.userMessage || '加载失败');
      setPassData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPass(activeMode);
  }, [activeMode]);

  const handleRefresh = async () => {
    try {
      const data = await refresh();
      if (data?.pass) setPassData(data.pass);
      else fetchPass(activeMode);
    } catch (err) {
      setError(err.userMessage || '同步失败');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <img src="/osu-resources/lazer-nuget.png" className="w-10 h-10 inline-block" alt="osu!" />
            最近通过
          </h2>
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

      <p className="text-sm text-zinc-500 mb-6">
        每个模式最新一条通过成绩（不含 F）
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          {error}
        </div>
      ) : !passData ? (
        <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
          <FaCheckCircle className="mx-auto text-2xl text-zinc-700 mb-3" />
          暂无通过记录
        </div>
      ) : (
        <div className="bg-[#15151e]/40 rounded-xl border border-white/[0.05] overflow-hidden">
          <PassItem score={passData} onClick={setSelectedScore} />
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

function PassItem({ score, onClick }) {
  return (
    <div
      onClick={() => onClick?.(score)}
      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
    >
      <div className="w-20 h-15 rounded-lg overflow-hidden shrink-0">
        <OsuCoverImage src={score.coverUrl} alt={score.title} className="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-zinc-100 truncate">{score.titleOriginal || score.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {score.starRating != null && (
            <OsuStarBadge starRating={score.starRating} size="sm" />
          )}
          <div className="flex items-center gap-1">
            {(() => {
              const iconPath = getRulesetIconPath(score.mode);
              return iconPath ? (
                <img src={iconPath} className="w-3.5 h-3.5" alt={score.mode} />
              ) : null;
            })()}
            <span className="text-sm font-medium text-zinc-400 whitespace-normal break-words">{score.version}</span>
          </div>
          <OsuBeatmapStatusBadge status={score.beatmapStatus} />
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          <OsuModIcons mods={score.mods} />
          <span>{score.playedAt ? new Date(score.playedAt).toLocaleDateString() : ''}</span>
        </div>
      </div>
      <div className="text-center shrink-0">
        <OsuGrade grade={score.grade} size="lg" />
      </div>
      <div className="text-right shrink-0">
        <div className={`text-xl font-bold ${score.beatmapStatus === 'ranked' || score.beatmapStatus === 'approved' ? 'text-pink-400' : 'text-zinc-600'}`}>
          {score.beatmapStatus === 'ranked' || score.beatmapStatus === 'approved' ? Math.round(score.pp || 0) : '-'}
          {(score.beatmapStatus === 'ranked' || score.beatmapStatus === 'approved') && (
            <span className="text-xs text-pink-500/60 ml-1">pp</span>
          )}
        </div>
        <div className="text-xs text-zinc-400">{score.accuracy?.toFixed(2)}%</div>
      </div>
    </div>
  );
}
