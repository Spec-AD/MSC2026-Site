import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, Loader2, LogOut, Maximize2, Minimize2, Radio, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMSC2026Store } from '../store';
import { STAGE_CONFIG } from '../constants/publicGameData';
import { useMSCSSE } from '../hooks/useSSE';
import { useMatchEventQueue } from '../hooks/useMatchEventQueue';
import EventCueOverlay from '../components/live/EventCueOverlay';
import PreMatchLobby from '../components/live/PreMatchLobby';
import Stage1Page from './Stage1Page';
import RacePage from './RacePage';
import Stage4Page from './Stage4Page';
import { EASE_ACCEL, MOTION_TRANSITIONS } from '../utils/motion';
import '../styles/industrialEditorial.css';
import TournamentPodium from '../components/live/TournamentPodium';

const ADMIN_ROLES = ['ADM', 'TO', 'CHM'];

function formatClock(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function FinishedScreen() {
  return <TournamentPodium live />;
}

function SystemGate({ loading, error, onRetry, onExit }) {
  return (
    <div className="preset-industrial-editorial flex h-[100dvh] items-end overflow-hidden px-7 py-12 text-white md:px-14 md:py-16">
      <div className="max-w-4xl border-l border-white/15 pl-6 md:pl-10">
        {loading ? <Loader2 className="h-14 w-14 animate-spin text-cyan-300" /> : <AlertTriangle className="h-14 w-14 text-amber-300" />}
        <p className="msc-technical mt-5 text-base font-bold text-zinc-500">MATCH SYSTEM / STATE GUARD</p>
        <h1 className="mt-3 text-4xl font-black text-white md:text-7xl">{loading ? '正在核验比赛状态' : '比赛状态需要处理'}</h1>
        {!loading && <p className="mt-5 text-xl leading-8 text-zinc-300 md:text-2xl">{error}</p>}
        {!loading && (
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onRetry} className="flex min-h-14 items-center gap-3 bg-amber-300 px-6 text-lg font-black text-black hover:bg-amber-200"><RefreshCw className="h-5 w-5" />重新核验</button>
            <button type="button" onClick={onExit} className="flex min-h-14 items-center gap-3 border border-white/15 px-6 text-lg font-black text-zinc-200 hover:bg-white/10"><LogOut className="h-5 w-5" />退出比赛模式</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StageSurface({ status }) {
  if (status === 'stage1') return <Stage1Page />;
  if (status === 'stage2' || status === 'stage3') return <RacePage stage={status} />;
  if (status === 'stage4') return <Stage4Page />;
  return <FinishedScreen />;
}

export default function LiveMatchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status, stage1, stage4, summary, fetchStatus } = useMSC2026Store();
  const { activeCue, enqueue, queuedCount } = useMatchEventQueue();
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [clock, setClock] = useState(() => new Date());
  const [booting, setBooting] = useState(true);
  const [statusResolved, setStatusResolved] = useState(false);
  const [statusError, setStatusError] = useState('');
  const wakeLockRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role));

  const refreshStatus = useCallback(async () => {
    try {
      await fetchStatus();
      setStatusError('');
    } catch (requestError) {
      setStatusError(requestError.response?.data?.msg || '无法读取 MSC 2026 比赛状态，请检查服务连接');
    } finally {
      setStatusResolved(true);
    }
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

  if (!statusResolved) {
    return <SystemGate loading onRetry={refreshStatus} onExit={exitLiveMode} />;
  }

  if (statusError) {
    return <SystemGate error={statusError} onRetry={refreshStatus} onExit={exitLiveMode} />;
  }

  const stage1GroupCount = summary.stage1?.totalGroups || 0;
  if (status === 'pending' && stage1GroupCount === 0) {
    return (
      <PreMatchLobby
        onInitialized={refreshStatus}
        onExit={exitLiveMode}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
    );
  }

  if (status === 'pending') {
    return (
      <SystemGate
        error="系统处于待初始化状态，但检测到已生成的阶段一分组。为防止覆盖现场数据，请先在管理页执行阶段一重置或完全重置。"
        onRetry={refreshStatus}
        onExit={exitLiveMode}
      />
    );
  }

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
            <StageSurface status={status} />
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
