// ============================================================
// TournamentHome.jsx — MSC 2026 赛事主页
// ============================================================
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import { STAGE_CONFIG } from '../constants/gameData';
import { FaArrowRight, FaTrophy } from 'react-icons/fa';

const STAGE_PHASES = ['stage1', 'stage2', 'stage3', 'stage4'];

export default function TournamentHome() {
  const { status, summary, fetchStatus } = useMSC2026Store();

  useEffect(() => {
    fetchStatus().catch(() => {});
  }, [fetchStatus]);

  const currentIdx = STAGE_PHASES.indexOf(status);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-amber-950/20 border border-white/10 p-8">
        <h2 className="text-sm font-medium text-amber-400/80 mb-1 uppercase tracking-wider" style={{ fontFamily: 'Torus, sans-serif' }}>
          PureBeat 首届正式比赛
        </h2>
        <h1 className="text-3xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
          MSC 2026
        </h1>
        <p className="text-zinc-400 text-sm max-w-lg leading-relaxed">
          从 12 名预选赛晋级选手中，经过淘汰赛对决、跑图竞技，最终决出 MSC 2026 冠军。
          包含特殊赛制：六边形跑图、道具系统、25 项挑战任务。
        </p>

        {status !== 'pending' && status !== 'finished' && (
          <Link
            to={`/matches/msc2026/${status}`}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all text-sm font-medium"
          >
            进入当前阶段
            <FaArrowRight className="text-xs" />
          </Link>
        )}
      </div>

      {/* 阶段进度条 */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-5" style={{ fontFamily: 'Torus, sans-serif' }}>
          比赛进度
        </h3>
        <div className="flex items-start gap-0">
          {STAGE_PHASES.map((phase, idx) => {
            const config = STAGE_CONFIG[phase];
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isPending = idx > currentIdx;

            return (
              <div key={phase} className="flex-1 flex items-start min-w-0">
                {/* 节点 */}
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                      ${isDone ? 'bg-green-500/20 border-green-500 text-green-400' : ''}
                      ${isCurrent ? 'bg-amber-500/30 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10' : ''}
                      ${isPending ? 'bg-zinc-800 border-zinc-700 text-zinc-600' : ''}
                    `}
                  >
                    {isDone ? '✓' : config.icon}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium text-center leading-tight
                      ${isCurrent ? 'text-amber-400' : isDone ? 'text-green-400/70' : 'text-zinc-600'}`}
                  >
                    {config.label}
                  </span>
                </div>
                {/* 连线 */}
                {idx < STAGE_PHASES.length - 1 && (
                  <div className={`h-0.5 mt-5 flex-1 min-w-[2rem] ${isDone ? 'bg-green-500/30' : 'bg-zinc-800'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 状态卡片（如果有数据） */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAGE_PHASES.map((phase) => {
            const info = summary[phase];
            const config = STAGE_CONFIG[phase];
            if (!info && status !== 'finished') return null;
            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/10 bg-zinc-900/40 p-4"
              >
                <div className="text-xs text-zinc-500 mb-1">{config.label}</div>
                <div className="text-lg font-bold" style={{ fontFamily: 'Torus, sans-serif' }}>
                  {info?.completedGroups != null ? `${info.completedGroups}/${info.totalGroups}` : '-'}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 已结束状态 */}
      {status === 'finished' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <FaTrophy className="text-3xl text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-300 mb-1" style={{ fontFamily: 'Torus, sans-serif' }}>
            比赛已结束
          </h3>
          <p className="text-zinc-500 text-sm">MSC 2026 所有阶段已完成</p>
        </div>
      )}
    </div>
  );
}
