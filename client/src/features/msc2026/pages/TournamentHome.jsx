// ============================================================
// TournamentHome.jsx — MSC 2026 赛事主页
// ============================================================
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import PlayerList from '../components/PlayerList';
import AdminPanel from '../components/admin/AdminPanel';
import { STAGE_CONFIG } from '../constants/gameData';
import { FaArrowRight, FaTrophy } from 'react-icons/fa';

const STAGE_PHASES = ['stage1', 'stage2', 'stage3', 'stage4'];

export default function TournamentHome() {
  const { status, summary, players, fetchStatus, fetchPlayers } = useMSC2026Store();

  useEffect(() => {
    fetchStatus().catch(() => {});
    fetchPlayers().catch(() => {});
  }, [fetchStatus, fetchPlayers]);

  const currentIdx = STAGE_PHASES.indexOf(status);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8 md:p-10 backdrop-blur-xl">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-amber-300/80 mb-3 uppercase tracking-[0.18em]" style={{ fontFamily: 'Torus, sans-serif' }}>
              PureBeat 首届正式比赛
            </h2>
            <h1 className="text-6xl md:text-8xl font-black mb-5 tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
              MSC 2026
            </h1>
            <p className="text-zinc-300 text-xl max-w-3xl leading-relaxed">
              资格赛、12进6 小组赛、六边形与正方形跑图、最终四曲决赛。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <p className="text-5xl font-black text-white tabular-nums">12</p>
              <p className="text-zinc-500 mt-1">正赛</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <p className="text-5xl font-black text-white tabular-nums">4</p>
              <p className="text-zinc-500 mt-1">阶段</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <p className="text-5xl font-black text-white tabular-nums">1</p>
              <p className="text-zinc-500 mt-1">冠军</p>
            </div>
          </div>
        </div>

        {status !== 'pending' && status !== 'finished' && (
          <Link
            to={`/matches/msc2026/${status}`}
            className="inline-flex items-center gap-3 mt-7 px-7 py-4 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30 transition-all text-xl font-black"
          >
            进入当前阶段
            <FaArrowRight />
          </Link>
        )}
      </div>

      {/* 阶段进度条 */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
        <h3 className="text-2xl font-bold text-zinc-100 mb-6" style={{ fontFamily: 'Torus, sans-serif' }}>
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
                      w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-2 transition-all
                      ${isDone ? 'bg-green-500/20 border-green-500 text-green-400' : ''}
                      ${isCurrent ? 'bg-amber-500/30 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10' : ''}
                      ${isPending ? 'bg-zinc-800 border-zinc-700 text-zinc-600' : ''}
                    `}
                  >
                    {isDone ? '✓' : config.icon}
                  </div>
                  <span
                    className={`text-base md:text-lg mt-2 font-bold text-center leading-tight
                      ${isCurrent ? 'text-amber-400' : isDone ? 'text-green-400/70' : 'text-zinc-600'}`}
                  >
                    {config.label}
                  </span>
                </div>
                {/* 连线 */}
                {idx < STAGE_PHASES.length - 1 && (
                  <div className={`h-1 mt-8 flex-1 min-w-[2rem] ${isDone ? 'bg-green-500/30' : 'bg-zinc-800'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 选手名单 */}
      <PlayerList
        players={players}
        status={status}
        winner={summary?.stage4?.winner || null}
      />

      {/* 管理员面板 */}
      <AdminPanel />

      {/* 状态卡片（如果有数据） */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAGE_PHASES.map((phase) => {
            const info = summary[phase];
            const config = STAGE_CONFIG[phase];
            if (!info && status !== 'finished') return null;
            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="text-base text-zinc-500 mb-2">{config.label}</div>
                <div className="text-4xl font-black" style={{ fontFamily: 'Torus, sans-serif' }}>
                  {info?.completedGroups != null ? `${info.completedGroups}/${info.totalGroups}` : '-'}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 已结束状态 */}
      {status === 'finished' && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-10 text-center">
          <FaTrophy className="text-5xl text-amber-300 mx-auto mb-4" />
          <h3 className="text-4xl font-black text-amber-200 mb-2" style={{ fontFamily: 'Torus, sans-serif' }}>
            比赛已结束
          </h3>
          <p className="text-zinc-400 text-xl">MSC 2026 所有阶段已完成</p>
        </div>
      )}
    </div>
  );
}
