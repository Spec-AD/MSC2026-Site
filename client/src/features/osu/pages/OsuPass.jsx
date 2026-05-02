// ============================================================
// OsuPass — 最近通过的成绩（四模式各一条）
// GET /api/osu/pass   GET /api/osu/pass/all
// ============================================================

import { useState, useEffect } from 'react';
import { getPass } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuCoverImage from '../components/OsuCoverImage';
import OsuModeTabs from '../components/OsuModeTabs';
import OsuBeatmapStatusBadge from '../components/OsuBeatmapStatusBadge';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import { MODE_LABELS } from '../../../constants/osuModes';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];

export default function OsuPass() {
  const [activeMode, setActiveMode] = useState('standard');
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">最近通过</h2>
        </div>
        <OsuModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
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
          <PassItem score={passData} />
        </div>
      )}
    </div>
  );
}

function PassItem({ score }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-20 h-15 rounded-lg overflow-hidden shrink-0">
        <OsuCoverImage src={score.coverUrl} alt={score.title} className="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-zinc-100 truncate">{score.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-zinc-400 truncate">{score.version}</span>
          <OsuBeatmapStatusBadge status={score.beatmapStatus} />
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          {score.mods?.length > 0 && (
            <span className="text-rose-400 font-bold">+{score.mods.join('')}</span>
          )}
          <span>{score.playedAt ? new Date(score.playedAt).toLocaleDateString() : ''}</span>
        </div>
      </div>
      <div className="text-center shrink-0">
        <OsuGrade grade={score.grade} size="lg" />
      </div>
      <div className="text-right shrink-0">
        <div className="text-xl font-bold text-pink-400">{Math.round(score.pp)}<span className="text-xs text-pink-500/60 ml-1">pp</span></div>
        <div className="text-xs text-zinc-400">{score.accuracy?.toFixed(2)}%</div>
      </div>
    </div>
  );
}
