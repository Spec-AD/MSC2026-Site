// ============================================================
// OsuScoreDetail — 谱面成绩详情
// GET /api/osu/score/:bid   +   GET /api/osu/map/:bid
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScore, getBeatmap } from '../api/osuApi';
import OsuGrade from '../components/OsuGrade';
import OsuMapCard from '../components/OsuMapCard';
import { FaSpinner, FaArrowLeft, FaChartBar } from 'react-icons/fa';

export default function OsuScoreDetail() {
  const { bid } = useParams();
  const navigate = useNavigate();
  const [score, setScore] = useState(null);
  const [beatmap, setBeatmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bid) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [scoreRes, mapRes] = await Promise.allSettled([
          getScore(bid),
          getBeatmap(bid),
        ]);

        if (scoreRes.status === 'fulfilled') setScore(scoreRes.value.data);
        else if (scoreRes.status === 'rejected') setError(scoreRes.reason?.userMessage || '加载失败');

        if (mapRes.status === 'fulfilled') setBeatmap(mapRes.value.data);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [bid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FaSpinner className="animate-spin text-2xl text-pink-500/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-zinc-600 bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
        {error}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm mb-6 w-fit"
      >
        <FaArrowLeft /> 返回
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 成绩详情 — 占 2 列 */}
        <div className="lg:col-span-2">
          <div className="bg-[#15151e] border border-white/[0.05] rounded-lg p-6">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">成绩详情</h3>

            {score ? (
              <div className="space-y-4">
                {/* 评级 + PP */}
                <div className="flex items-center justify-between">
                  <OsuGrade grade={score.grade} size="lg" />
                  <div className="text-right">
                    <div className="text-2xl font-bold text-pink-400">{Math.round(score.pp)}<span className="text-sm text-pink-500/60 ml-1">pp</span></div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.05]" />

                {/* 成绩数据 */}
                <ScoreRow label="准确率" value={`${score.accuracy?.toFixed(2)}%`} />
                <ScoreRow label="Mods" value={score.mods?.length ? `+${score.mods.join('')}` : 'NM'} />
                <ScoreRow label="游玩时间" value={score.playedAt ? new Date(score.playedAt).toLocaleString() : '-'} />
                {score.maxCombo && <ScoreRow label="Max Combo" value={`${score.maxCombo}x`} />}
                {score.combo && <ScoreRow label="Combo" value={`${score.combo}x`} />}

                {/* 连击详情 */}
                {(score.count300 || score.count100 || score.count50 || score.countMiss) && (
                  <>
                    <div className="h-px bg-white/[0.05]" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {score.count300 !== undefined && <CountBadge label="300" value={score.count300} color="text-emerald-400" />}
                      {score.count100 !== undefined && <CountBadge label="100" value={score.count100} color="text-blue-400" />}
                      {score.count50 !== undefined && <CountBadge label="50" value={score.count50} color="text-purple-400" />}
                      {score.countMiss !== undefined && <CountBadge label="Miss" value={score.countMiss} color="text-rose-500" />}
                    </div>
                  </>
                )}

                {/* 排行榜入口 */}
                <button
                  onClick={() => navigate(`/osu/leaderboard/${bid}`)}
                  className="w-full py-2.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <FaChartBar /> 查看排行榜
                </button>
              </div>
            ) : (
              <div className="text-center text-zinc-600 py-8">暂无该谱面成绩</div>
            )}
          </div>
        </div>

        {/* 谱面信息 — 占 3 列 */}
        <div className="lg:col-span-3">
          <OsuMapCard
            beatmap={beatmap}
            onViewLeaderboard={(id) => navigate(`/osu/leaderboard/${id}`)}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-medium">{value}</span>
    </div>
  );
}

function CountBadge({ label, value, color }) {
  return (
    <div className="bg-black/20 rounded p-2 text-center">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-600">{label}</div>
    </div>
  );
}
