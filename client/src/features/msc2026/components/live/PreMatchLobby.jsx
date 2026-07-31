import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Disc3,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  Play,
  Users,
  X,
} from 'lucide-react';
import * as api from '../../api/msc2026Api';
import { readCachedSongConfig, warmSongCache, writeCachedSongConfig } from '../../utils/songCache';
import { MOTION_TRANSITIONS } from '../../utils/motion';

const IDLE_DELAY_MS = 10000;

const difficultyTone = {
  BASIC: 'text-emerald-300',
  ADVANCED: 'text-amber-300',
  EXPERT: 'text-red-300',
  MASTER: 'text-violet-300',
  'Re:MASTER': 'text-pink-300',
};

function ToolButton({ icon, children, onClick, disabled = false, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 items-center gap-3 border px-5 text-lg font-black transition-colors disabled:cursor-not-allowed disabled:opacity-35 md:min-h-16 md:px-7 md:text-xl ${
        primary
          ? 'border-amber-300 bg-amber-300 text-[#080a0c] hover:bg-amber-200'
          : 'border-white/15 bg-black/35 text-zinc-100 hover:border-white/35 hover:bg-white/10'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
      {children}
    </button>
  );
}

function SongPoolPanel({ songs, onClose }) {
  return (
    <Motion.aside
      initial={{ opacity: 0, x: 90 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 70 }}
      transition={MOTION_TRANSITIONS.flow}
      className="fixed inset-y-0 right-0 z-[140] flex w-full max-w-[900px] flex-col border-l border-white/15 bg-[#080b0e]/95 shadow-2xl backdrop-blur-2xl"
      aria-label="阶段一图池"
    >
      <div className="flex min-h-24 items-center justify-between border-b border-white/10 px-6 md:px-10">
        <div>
          <p className="msc-technical text-sm font-bold text-cyan-300">STAGE 01 / SONG POOL</p>
          <h2 className="mt-1 text-3xl font-black text-white md:text-5xl">阶段一图池</h2>
        </div>
        <button type="button" onClick={onClose} title="关闭图池" className="flex h-12 w-12 items-center justify-center border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="grid flex-1 auto-rows-max grid-cols-1 gap-px overflow-y-auto bg-white/10 p-px sm:grid-cols-2">
        {songs.map((song, index) => (
          <article key={song._id || index} className="grid min-h-36 grid-cols-[112px_1fr] gap-5 bg-[#0b0f12] p-5 md:grid-cols-[132px_1fr]">
            <div className="aspect-square overflow-hidden bg-white/5">
              {song.coverUrl ? <img src={song.coverUrl} alt="" className="h-full w-full object-cover" /> : <Disc3 className="m-auto h-full w-12 text-zinc-700" />}
            </div>
            <div className="min-w-0 self-center">
              <p className="msc-technical text-sm text-zinc-500">TRACK {String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-1 break-words text-xl font-black leading-tight text-white md:text-2xl">{song.title || '未命名曲目'}</h3>
              <p className="mt-2 truncate text-base text-zinc-400">{song.artist || 'UNKNOWN ARTIST'}</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`text-base font-black ${difficultyTone[song.difficultyName] || 'text-zinc-200'}`}>{song.difficultyName || 'MASTER'}</span>
                <span className="msc-numeral text-2xl text-white">{song.chartConstant ?? song.levelValue ?? '--'}</span>
                <span className="msc-technical text-sm text-zinc-500">BPM {song.bpm ?? '--'}</span>
              </div>
            </div>
          </article>
        ))}
        {songs.length === 0 && <p className="col-span-full bg-[#0b0f12] p-10 text-xl text-zinc-400">阶段一图池尚未配置。</p>}
      </div>
    </Motion.aside>
  );
}

function PlayerPanel({ roster, pendingPlayerId, onToggle, onClose }) {
  const players = roster?.players || [];
  return (
    <Motion.aside
      initial={{ opacity: 0, x: 90 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 70 }}
      transition={MOTION_TRANSITIONS.flow}
      className="fixed inset-y-0 right-0 z-[140] flex w-full max-w-[940px] flex-col border-l border-white/15 bg-[#080b0e]/95 shadow-2xl backdrop-blur-2xl"
      aria-label="选手签到"
    >
      <div className="flex min-h-24 items-center justify-between border-b border-white/10 px-6 md:px-10">
        <div>
          <p className="msc-technical text-sm font-bold text-cyan-300">QUALIFIER TOP 12 / CHECK-IN</p>
          <h2 className="mt-1 flex items-baseline gap-4 text-3xl font-black text-white md:text-5xl">
            选手签到
            <span className="msc-numeral text-2xl text-amber-300 md:text-3xl">{roster?.checkedInCount || 0}/12</span>
          </h2>
        </div>
        <button type="button" onClick={onClose} title="关闭选手签到" className="flex h-12 w-12 items-center justify-center border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="grid flex-1 auto-rows-max grid-cols-1 gap-px overflow-y-auto bg-white/10 p-px md:grid-cols-2">
        {players.map(player => (
          <div key={player.userId} className={`grid min-h-28 grid-cols-[58px_1fr_auto] items-center gap-4 bg-[#0b0f12] px-5 py-4 ${player.checkedIn ? 'border-l-4 border-emerald-400' : 'border-l-4 border-transparent'}`}>
            <span className="msc-numeral text-4xl text-white/25">{String(player.rank).padStart(2, '0')}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="h-11 w-11 shrink-0 object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-white/5 text-lg font-black text-zinc-500">{player.username?.[0] || '?'}</span>}
                <p className="truncate text-xl font-black text-white">{player.username || '未知选手'}</p>
              </div>
              <p className="msc-technical mt-2 text-sm text-zinc-500">TOKEN <span className="msc-numeral ml-1 text-xl text-cyan-200">{player.token || '---'}</span></p>
            </div>
            <button
              type="button"
              disabled={pendingPlayerId === player.userId}
              onClick={() => onToggle(player)}
              className={`flex h-12 min-w-24 items-center justify-center gap-2 border px-3 text-base font-black transition-colors disabled:opacity-50 ${player.checkedIn ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-red-400/10 hover:text-red-200' : 'border-white/20 text-zinc-200 hover:border-emerald-300/60 hover:bg-emerald-400/10'}`}
            >
              {pendingPlayerId === player.userId ? <Loader2 className="h-5 w-5 animate-spin" /> : player.checkedIn ? <Check className="h-5 w-5" /> : null}
              {player.checkedIn ? '已签到' : '签到'}
            </button>
          </div>
        ))}
        {players.length === 0 && <p className="col-span-full bg-[#0b0f12] p-10 text-xl text-zinc-400">尚未取得预选赛前 12 名名单。</p>}
      </div>
      <p className="border-t border-white/10 px-6 py-4 text-base text-zinc-500 md:px-10">再次单击“已签到”可撤销签到。签到只用于现场核验，不影响晋级资格。</p>
    </Motion.aside>
  );
}

export default function PreMatchLobby({ onInitialized, onExit, onToggleFullscreen, isFullscreen }) {
  const reduceMotion = useReducedMotion();
  const cachedConfig = useMemo(() => readCachedSongConfig()?.data || null, []);
  const [config, setConfig] = useState(cachedConfig);
  const [roster, setRoster] = useState(null);
  const [panel, setPanel] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [pendingPlayerId, setPendingPlayerId] = useState('');
  const [confirmStart, setConfirmStart] = useState(false);
  const [error, setError] = useState('');
  const idleTimerRef = useRef(null);

  const songs = config?.stage1SongPool || [];
  const ready = roster?.total === 12 && songs.length >= 3;

  const armIdleTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    if (panel || confirmStart) return;
    idleTimerRef.current = setTimeout(() => setControlsVisible(false), IDLE_DELAY_MS);
  }, [confirmStart, panel]);

  useEffect(() => {
    const onActivity = () => {
      setControlsVisible(true);
      armIdleTimer();
    };
    window.addEventListener('pointermove', onActivity, { passive: true });
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    armIdleTimer();
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [armIdleTimer]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getConfig(), api.getPreMatchCheckIns()]).then(([configResult, rosterResult]) => {
      if (!active) return;
      const failures = [];
      if (configResult.status === 'fulfilled') {
        const nextConfig = configResult.value.data.data;
        setConfig(nextConfig);
        writeCachedSongConfig(nextConfig);
        warmSongCache(nextConfig?.stage1SongPool || []).catch(() => {});
      } else if (!cachedConfig) {
        failures.push(configResult.reason?.response?.data?.msg || '图池读取失败');
      }
      if (rosterResult.status === 'fulfilled') {
        setRoster(rosterResult.value.data.data);
      } else {
        failures.push(rosterResult.reason?.response?.data?.msg || '签到名单读取失败');
      }
      setError(failures.join('；'));
      setLoading(false);
    });
    return () => { active = false; };
  }, [cachedConfig]);

  const toggleCheckIn = async (player) => {
    setPendingPlayerId(player.userId);
    setError('');
    try {
      const response = await api.setPreMatchCheckIn(player.userId, !player.checkedIn);
      setRoster(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.msg || '签到状态更新失败');
    } finally {
      setPendingPlayerId('');
    }
  };

  const startMatch = async () => {
    if (!ready || initializing) return;
    if ((roster?.checkedInCount || 0) < 12 && !confirmStart) {
      setConfirmStart(true);
      return;
    }
    setInitializing(true);
    setError('');
    try {
      await api.initStage1FromQualifier({ advanceCount: 12 });
      await onInitialized?.();
    } catch (requestError) {
      setError(requestError.response?.data?.msg || '阶段一初始化失败');
      setConfirmStart(false);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className={`msc-prematch-lobby preset-industrial-editorial relative h-[100dvh] overflow-hidden text-white ${controlsVisible ? '' : 'cursor-none'}`}>
      <div className="msc-prematch-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-cyan-200/35" />
      <div className="msc-crosshair pointer-events-none absolute left-5 top-5 h-9 w-9 border-l border-t border-amber-300/45 md:left-9 md:top-9" />
      <div className="pointer-events-none absolute bottom-0 right-[12%] top-0 w-px bg-white/[0.06]" />
      <div className="pointer-events-none absolute -right-[4vw] -top-[5vh] font-mono text-[34rem] font-black leading-none text-white/[0.025]">26</div>

      <main className="relative z-20 flex h-full flex-col justify-between px-6 pb-7 pt-6 md:px-12 md:pb-12 md:pt-10 xl:px-20">
        <AnimatePresence>
          {controlsVisible && (
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="flex items-start justify-between gap-6">
              <div className="msc-technical border-l border-cyan-300/50 pl-4 text-sm leading-6 text-zinc-400 md:text-base">
                <p className="font-bold text-cyan-200">PRE-MATCH CONTROL / 00</p>
                <p>VENUE SYSTEM READY</p>
                <p>LOCAL OPERATOR: ADM</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onToggleFullscreen} title={isFullscreen ? '退出全屏' : '进入全屏'} className="flex h-12 w-12 items-center justify-center border border-white/15 bg-black/30 text-zinc-300 hover:bg-white/10 hover:text-white">
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>
                <button type="button" onClick={onExit} title="退出比赛模式" className="flex h-12 w-12 items-center justify-center border border-red-300/20 bg-black/30 text-red-300 hover:bg-red-400/10">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        <Motion.section
          animate={reduceMotion ? undefined : { x: [0, 1, -1, 0], y: [0, -1, 0, 1, 0] }}
          transition={reduceMotion ? undefined : { duration: 0.48, repeat: Infinity, repeatDelay: 2.4 }}
          className="relative -ml-[0.04em] mt-auto mb-auto select-none"
        >
          {controlsVisible && <p className="msc-technical ml-2 text-sm font-bold text-amber-300 md:ml-4 md:text-lg">MAIMAI SPECIAL CUP / LIVE 2026</p>}
          <h1 className="msc-prematch-title msc-display text-[clamp(7rem,20vw,23rem)] font-black leading-[0.64] text-white">MSC</h1>
          <div className="flex items-end gap-5 md:gap-8">
            <span className="msc-display text-[clamp(3.6rem,9vw,10rem)] font-black leading-[0.8] text-white/90">2026</span>
            {controlsVisible && <span className="mb-1 hidden max-w-md border-l border-white/20 pl-5 text-lg font-bold leading-7 text-zinc-400 md:block">竞技主赛系统<br />赛前待机</span>}
          </div>
        </Motion.section>

        <AnimatePresence>
          {controlsVisible && (
            <Motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.16 }} className="max-w-[1180px]">
              <div className="mb-5 flex flex-wrap items-end gap-x-10 gap-y-3 border-t border-white/15 pt-4">
                <p className="text-base font-bold text-zinc-400 md:text-lg">选手签到 <span className="msc-numeral ml-2 text-3xl text-white md:text-4xl">{roster?.checkedInCount || 0}/12</span></p>
                <p className="text-base font-bold text-zinc-400 md:text-lg">阶段一图池 <span className="msc-numeral ml-2 text-3xl text-white md:text-4xl">{songs.length}</span></p>
                {loading && <p className="flex items-center gap-2 text-base text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" />正在核验现场数据</p>}
              </div>

              {error && <p className="mb-4 flex items-center gap-2 border-l-4 border-red-400 bg-red-400/10 px-4 py-3 text-base font-bold text-red-200"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</p>}
              {confirmStart && (
                <div className="mb-4 flex flex-wrap items-center gap-4 border-l-4 border-amber-300 bg-amber-300/10 px-5 py-4">
                  <AlertTriangle className="h-6 w-6 text-amber-300" />
                  <p className="mr-auto text-lg font-black text-amber-100">仍有 {12 - (roster?.checkedInCount || 0)} 人未签到。确认按当前前 12 名生成全部 6 组？</p>
                  <button type="button" onClick={() => setConfirmStart(false)} className="flex h-11 items-center gap-2 border border-white/20 px-4 font-bold text-zinc-200 hover:bg-white/10"><X className="h-4 w-4" />取消</button>
                  <button type="button" onClick={startMatch} className="flex h-11 items-center gap-2 bg-amber-300 px-5 font-black text-black hover:bg-amber-200"><Play className="h-4 w-4 fill-current" />仍然开始</button>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <ToolButton icon={initializing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-current" />} onClick={startMatch} disabled={!ready || initializing} primary>
                  {initializing ? '正在生成抽签' : '开始比赛'}
                </ToolButton>
                <ToolButton icon={<Disc3 className="h-6 w-6" />} onClick={() => setPanel('pool')}>查看图池</ToolButton>
                <ToolButton icon={<Users className="h-6 w-6" />} onClick={() => setPanel('players')}>查看选手</ToolButton>
                {!ready && !loading && <span className="flex items-center text-base font-bold text-amber-200/80">需具备 12 名晋级选手及至少 3 首阶段一曲目</span>}
              </div>
            </Motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {panel && <Motion.button key="panel-backdrop" type="button" aria-label="关闭面板" onClick={() => setPanel(null)} className="fixed inset-0 z-[130] bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
        {panel === 'pool' && <SongPoolPanel key="song-pool" songs={songs} onClose={() => setPanel(null)} />}
        {panel === 'players' && <PlayerPanel key="player-list" roster={roster} pendingPlayerId={pendingPlayerId} onToggle={toggleCheckIn} onClose={() => setPanel(null)} />}
      </AnimatePresence>

    </div>
  );
}
