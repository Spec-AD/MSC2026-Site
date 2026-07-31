// ============================================================
// TournamentHome.jsx — MSC 2026 赛事主页
// ============================================================
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { BookOpen, Maximize2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMSC2026Store } from '../store';
import PlayerList from '../components/PlayerList';
import AdminPanel from '../components/admin/AdminPanel';
import { STAGE_CONFIG } from '../constants/publicGameData';
import { FaArrowRight } from 'react-icons/fa';
import TournamentPodium from '../components/live/TournamentPodium';

const STAGE_PHASES = ['stage1', 'stage2', 'stage3', 'stage4'];

export default function TournamentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status, summary, players, fetchStatus, fetchPlayers } = useMSC2026Store();

  useEffect(() => {
    fetchStatus().catch(() => {});
    fetchPlayers().catch(() => {});
  }, [fetchStatus, fetchPlayers]);

  const currentIdx = STAGE_PHASES.indexOf(status);
  const canLaunchLive = user && ['ADM', 'TO', 'CHM'].includes(user.role);

  const launchLiveMode = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be unavailable; the standalone match route still works.
    }
    navigate('/matches/msc2026/live');
  };

  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="msc-editorial-hero px-5 py-8 md:px-9 md:py-8">
        <span className="msc-display pointer-events-none absolute -bottom-10 right-[-0.04em] select-none font-black leading-none text-white/[0.045] text-[9rem] md:text-[18rem]">2026</span>
        <div className="relative z-10 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)] xl:items-end">
          <div>
            <p className="msc-kicker mb-5">PUREBEAT COMPETITION ARCHIVE / LIVE CONTROL</p>
            <h1 className="msc-editorial-heading text-7xl text-white md:text-[8rem]">
              <span>MSC</span><span className="text-zinc-400">2026</span>
            </h1>
            <p className="mt-5 max-w-3xl border-l border-sky-200/40 pl-5 text-xl leading-relaxed text-zinc-300 md:text-2xl">
              资格赛、12进6 小组赛、六边形与正方形跑图、最终决赛。
            </p>
          </div>
          <div className="grid grid-cols-3 border-y border-white/15">
            <div className="border-r border-white/15 px-4 py-5 text-left">
              <p className="text-5xl font-black text-white tabular-nums md:text-7xl">12</p>
              <p className="mt-2 font-mono text-sm text-zinc-500">PLAYERS</p>
            </div>
            <div className="border-r border-white/15 px-4 py-5 text-left">
              <p className="text-5xl font-black text-white tabular-nums md:text-7xl">04</p>
              <p className="mt-2 font-mono text-sm text-zinc-500">STAGES</p>
            </div>
            <div className="px-4 py-5 text-left">
              <p className="text-5xl font-black text-amber-200 tabular-nums md:text-7xl">01</p>
              <p className="mt-2 font-mono text-sm text-zinc-500">CHAMPION</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          {canLaunchLive && (
            <button
              onClick={launchLiveMode}
              className="msc-command inline-flex items-center gap-3 px-7 py-4 text-xl font-black"
            >
              <Maximize2 className="h-6 w-6" />
              启动比赛模式
            </button>
          )}
          <Link
            to="/matches/msc2026/tutorial"
            className="inline-flex items-center gap-3 border border-cyan-300/35 bg-cyan-400/10 px-7 py-4 text-xl font-black text-cyan-100 transition-colors hover:bg-cyan-400/18"
          >
            <BookOpen className="h-6 w-6" />
            了解跑图
          </Link>
          {status !== 'pending' && status !== 'finished' && (
            <Link
              to={`/matches/msc2026/${status}`}
              className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.04] px-7 py-4 text-xl font-black text-zinc-200 transition-colors hover:bg-white/10"
            >
              普通页面
              <FaArrowRight />
            </Link>
          )}
        </div>
      </section>

      {/* 阶段进度条 */}
      <div className="msc-panel p-6 md:p-8">
        <p className="msc-kicker mb-2">PROGRESSION MATRIX / 04 PHASES</p>
        <h3 className="mb-7 text-3xl font-black text-zinc-100 md:text-5xl">比赛进度</h3>
        <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {STAGE_PHASES.map((phase, idx) => {
            const config = STAGE_CONFIG[phase];
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={phase} className={`relative min-h-36 overflow-hidden p-5 ${isCurrent ? 'bg-amber-300 text-black' : 'bg-[#090c0f]'}`}>
                <span className={`msc-display absolute -bottom-5 right-1 text-8xl font-black ${isCurrent ? 'text-black/10' : 'text-white/[0.035]'}`}>{config.icon}</span>
                <p className={`msc-technical text-xs font-black ${isCurrent ? 'text-black/55' : isDone ? 'text-emerald-300' : 'text-zinc-600'}`}>
                  PHASE {String(idx + 1).padStart(2, '0')} / {isDone ? 'COMPLETE' : isCurrent ? 'ACTIVE' : 'STANDBY'}
                </p>
                <p className={`mt-6 text-2xl font-black ${isCurrent ? 'text-black' : isDone ? 'text-emerald-100' : 'text-zinc-400'}`}>{config.label}</p>
                <p className={`mt-1 text-sm ${isCurrent ? 'text-black/65' : 'text-zinc-600'}`}>{config.desc}</p>
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
              <Motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="msc-panel p-5"
              >
                <div className="text-base text-zinc-500 mb-2">{config.label}</div>
                <div className="text-4xl font-black" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
                  {info?.completedGroups != null ? `${info.completedGroups}/${info.totalGroups}` : '-'}
                </div>
              </Motion.div>
            );
          })}
        </div>
      )}

      {/* 已结束状态 */}
      {status === 'finished' && (
        <TournamentPodium />
      )}
    </div>
  );
}
