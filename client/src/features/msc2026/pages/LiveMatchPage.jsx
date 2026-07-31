import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, Loader2, LogOut, Maximize2, Minimize2, Play, Radio, Trophy } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMSC2026Store } from '../store';
import { STAGE_CONFIG } from '../constants/publicGameData';
import { useMSCSSE } from '../hooks/useSSE';
import { useMatchEventQueue } from '../hooks/useMatchEventQueue';
import EventCueOverlay from '../components/live/EventCueOverlay';
import Stage1Page from './Stage1Page';
import RacePage from './RacePage';
import Stage4Page from './Stage4Page';
import { EASE_ACCEL, MOTION_TRANSITIONS } from '../utils/motion';
import * as api from '../api/msc2026Api';
import '../styles/industrialEditorial.css';

const ADMIN_ROLES = ['ADM', 'TO', 'CHM'];

function formatClock(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function StandbyScreen({ finished, onInitialized }) {
  const [readiness, setReadiness] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (finished) return;
    Promise.all([api.getConfig(), api.getQualifierRankings()])
      .then(([configResponse, rankResponse]) => {
        setReadiness({
          songCount: configResponse.data.data?.stage1SongPool?.length || 0,
          playerCount: rankResponse.data.data?.rankings?.slice(0, 12)?.length || 0,
        });
      })
      .catch(err => setError(err.response?.data?.msg || '初始化条件检查失败'));
  }, [finished]);

  const ready = readiness?.songCount >= 3 && readiness?.playerCount === 12;

  return (
    <div className="relative flex min-h-[calc(100dvh-76px)] items-end overflow-hidden px-6 py-12 text-left md:px-12 md:py-16">
      <span className="msc-display pointer-events-none absolute -right-8 -top-12 text-[16rem] font-black leading-none text-white/[0.04] md:text-[28rem]">00</span>
      <div className="relative z-10 max-w-6xl border-l border-white/15 pl-6 md:pl-10">
        {finished ? <Trophy className="h-16 w-16 text-amber-300" /> : <Radio className="h-16 w-16 text-cyan-300" />}
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
          {finished ? 'MATCH COMPLETE' : 'SYSTEM STANDBY'}
        </p>
        <h1 className="msc-editorial-heading mt-4 text-5xl text-white md:text-8xl">
          {finished ? 'MSC 2026 已结束' : '等待比赛初始化'}
        </h1>
        <p className="mt-4 text-lg md:text-2xl text-zinc-400">
          {finished ? '最终比赛结果已经确认' : '完成阶段一配置后，运行画面会自动进入比赛流程'}
        </p>
        {!finished && (
          <div className="mt-8 max-w-2xl border-t border-white/10 pt-7">
            {readiness && (
              <p className="mb-4 text-base font-bold text-zinc-400">
                参赛选手 <span className="text-white">{readiness.playerCount}/12</span>
                <span className="mx-3 text-zinc-700">|</span>
                阶段一图池 <span className="text-white">{readiness.songCount} 首</span>
              </p>
            )}
            <button
              type="button"
              disabled={!ready || initializing}
              onClick={async () => {
                setInitializing(true);
                setError('');
                try {
                  await api.initStage1FromQualifier({ advanceCount: 12 });
                  await onInitialized?.();
                } catch (err) {
                  setError(err.response?.data?.msg || '阶段一初始化失败');
                } finally {
                  setInitializing(false);
                }
              }}
              className="flex min-h-16 min-w-[280px] items-center justify-center gap-3 border border-amber-300/40 bg-amber-400/15 px-8 text-2xl font-black text-amber-100 transition-colors hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-600"
            >
              {initializing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-current" />}
              {initializing ? '正在生成抽签' : '初始化阶段一'}
            </button>
            {error && <p className="mt-4 flex items-center gap-2 text-base text-red-300"><AlertTriangle className="h-5 w-5" />{error}</p>}
            {readiness && !ready && !error && <p className="mt-4 text-base text-amber-200/75">请先在管理页补齐 12 人排名与阶段一图池配置</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function StageSurface({ status, onInitialized }) {
  if (status === 'stage1') return <Stage1Page />;
  if (status === 'stage2' || status === 'stage3') return <RacePage stage={status} />;
  if (status === 'stage4') return <Stage4Page />;
  return <StandbyScreen finished={status === 'finished'} onInitialized={onInitialized} />;
}

export default function LiveMatchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status, stage1, stage4, fetchStatus } = useMSC2026Store();
  const { activeCue, enqueue, queuedCount } = useMatchEventQueue();
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [clock, setClock] = useState(() => new Date());
  const [booting, setBooting] = useState(true);
  const wakeLockRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role));

  const refreshStatus = useCallback(() => {
    fetchStatus().catch(() => {});
  }, [fetchStatus]);

  useEffect(() => {
    refreshStatus();
    const statusTimer = setInterval(refreshStatus, 10000);
    const clockTimer = setInterval(() => setClock(new Date()), 1000);
    const bootTimer = setTimeout(() => setBooting(false), 1050);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    return () => {
      clearInterval(statusTimer);
      clearInterval(clockTimer);
      clearTimeout(bootTimer);
      document.body.style.overflow = previousOverflow;
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, [refreshStatus]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleEvent = useCallback((eventName, data) => {
    let presentationData = data;
    if (eventName === 'match_finished' && data?.winnerId) {
      const players = data.type === 'final'
        ? [stage4.p1, stage4.p2]
        : (() => {
            const group = stage1.groups?.find((entry) => entry.order === data.groupIndex);
            return [group?.p1, group?.p2];
          })();
      const winner = players.find((player) => String(player?._id || player?.userId) === String(data.winnerId));
      presentationData = { ...data, winnerName: winner?.username };
    }
    enqueue(eventName, presentationData);
    if (eventName === 'stage_advanced' || eventName === 'match_finished' || eventName === 'map_timeout') {
      refreshStatus();
    }
  }, [enqueue, refreshStatus, stage1.groups, stage4.p1, stage4.p2]);

  const eventHandlers = useMemo(() => ({
    item_collected: (data) => handleEvent('item_collected', data),
    item_used: (data) => handleEvent('item_used', data),
    item_armed: (data) => handleEvent('item_armed', data),
    challenge_revealed: (data) => handleEvent('challenge_revealed', data),
    challenge_resolved: (data) => handleEvent('challenge_resolved', data),
    stage_advanced: (data) => handleEvent('stage_advanced', data),
    match_finished: (data) => handleEvent('match_finished', data),
    map_timeout: (data) => handleEvent('map_timeout', data),
  }), [handleEvent]);

  useMSCSSE(eventHandlers, { enabled: isAdmin });

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setIsFullscreen(false);
    }
  };

  const exitLiveMode = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    navigate('/matches/msc2026');
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/matches/msc2026" replace />;

  const stageConfig = STAGE_CONFIG[status];

  return (
    <div className="preset-industrial-editorial msc-industrial h-[100dvh] overflow-hidden text-white selection:bg-amber-400/25">
      <header className="h-[76px] border-b border-white/10 bg-[#080b10] px-4 md:px-7 flex items-center justify-between gap-4 relative z-[80]">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-black tracking-[0.18em] text-red-300">LIVE</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="min-w-0">
            <p className="text-xl md:text-2xl font-black text-white truncate" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>MSC 2026</p>
            <p className="text-xs md:text-sm text-zinc-500 truncate">{stageConfig?.label || (status === 'finished' ? '比赛结束' : '等待开始')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {queuedCount > 0 && <span className="hidden md:inline text-xs text-zinc-500">演出队列 {queuedCount}</span>}
          <div className="hidden sm:flex items-center gap-2 text-zinc-300 tabular-nums">
            <Clock3 className="h-4 w-4 text-zinc-500" />
            <span className="text-lg font-bold">{formatClock(clock)}</span>
          </div>
          <button onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '进入全屏'} className="h-10 w-10 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button onClick={exitLiveMode} title="退出比赛模式" className="h-10 w-10 flex items-center justify-center border border-red-400/20 text-red-300 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="h-[calc(100dvh-76px)] overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <Motion.div
            key={status}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 34, clipPath: 'inset(0 0 0 8%)' }}
            animate={{ opacity: 1, x: 0, clipPath: 'inset(0 0 0 0%)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -26, clipPath: 'inset(0 8% 0 0)' }}
            transition={MOTION_TRANSITIONS.flow}
            className="mx-auto w-full max-w-[1920px] px-4 md:px-7 py-5 md:py-7"
          >
            <StageSurface status={status} onInitialized={refreshStatus} />
          </Motion.div>
        </AnimatePresence>
      </main>

      <EventCueOverlay cue={activeCue} />

      <AnimatePresence>
        {booting && (
          <Motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITIONS.enter}
            className="fixed inset-0 z-[300] bg-[#05070a] flex items-center justify-center pointer-events-none"
          >
            <Motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={MOTION_TRANSITIONS.spring}
              className="text-center px-6"
            >
              <Radio className="mx-auto h-12 w-12 text-amber-300" />
              <p className="mt-5 text-sm font-bold tracking-[0.24em] text-amber-300">MATCH SYSTEM ONLINE</p>
              <h1 className="mt-2 text-5xl md:text-8xl font-black text-white" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>MSC 2026</h1>
              {!reduceMotion && (
                <div className="mx-auto mt-7 h-1 w-56 overflow-hidden bg-white/10">
                  <Motion.div
                    className="h-full origin-left bg-amber-300"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, ease: EASE_ACCEL }}
                  />
                </div>
              )}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
