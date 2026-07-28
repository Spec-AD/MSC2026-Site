import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { Music2, X } from 'lucide-react';
import { EASE_ACCEL } from '../../utils/motion';
import { getSongCover } from '../../utils/songPresentation';

const PARTICLES = [
  { left: '12%', top: '22%', delay: 0.1, rotate: -24, size: 18 },
  { left: '20%', top: '72%', delay: 0.7, rotate: 18, size: 12 },
  { left: '29%', top: '14%', delay: 1.2, rotate: 42, size: 10 },
  { left: '36%', top: '84%', delay: 0.3, rotate: -12, size: 16 },
  { left: '48%', top: '9%', delay: 0.9, rotate: 28, size: 14 },
  { left: '57%', top: '88%', delay: 1.5, rotate: -38, size: 11 },
  { left: '68%', top: '15%', delay: 0.45, rotate: 16, size: 17 },
  { left: '76%', top: '79%', delay: 1.1, rotate: 36, size: 13 },
  { left: '86%', top: '31%', delay: 0.2, rotate: -18, size: 15 },
  { left: '91%', top: '64%', delay: 1.4, rotate: 22, size: 9 },
];

function normalizeBpm(song) {
  const value = Number(song?.bpm ?? song?.basic_info?.bpm);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const DIFFICULTY_STYLES = {
  BASIC: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  ADVANCED: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  EXPERT: 'border-red-400/40 bg-red-500/15 text-red-200',
  MASTER: 'border-violet-400/40 bg-violet-500/15 text-violet-200',
  'Re:MASTER': 'border-fuchsia-300/50 bg-fuchsia-400/15 text-fuchsia-100',
};

const NOTE_LABELS = [
  ['tap', 'TAP', 'bg-sky-400'],
  ['hold', 'HOLD', 'bg-amber-300'],
  ['slide', 'SLIDE', 'bg-rose-400'],
  ['touch', 'TOUCH', 'bg-emerald-400'],
  ['break', 'BREAK', 'bg-orange-300'],
];

export default function SongSelectionSpotlight({ song, onClose, pickLabel }) {
  const reduceMotion = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const [detailsForSong, setDetailsForSong] = useState(null);
  const closeTimerRef = useRef(null);
  const bpm = normalizeBpm(song);
  const beatDuration = bpm ? Math.max(0.18, Math.min(1.2, 60 / bpm)) : 0.5;
  const cover = getSongCover(song);
  const artist = song?.artist || song?.basic_info?.artist || '曲师未标注';
  const songKey = String(song?._id || song?.songId || song?.id || song?.title || '');
  const detailsVisible = detailsForSong === songKey;

  useEffect(() => {
    if (!song) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, song]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    if (!song) return undefined;
    const timer = window.setTimeout(() => setDetailsForSong(songKey), reduceMotion ? 300 : 3000);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, song, songKey]);

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
      setClosing(false);
    }, reduceMotion ? 120 : 340);
  };

  if (!song) return null;

  const difficultyName = song.difficultyName || 'MASTER';
  const noteCounts = song.noteCounts || {};
  const maxNoteCount = Math.max(1, ...NOTE_LABELS.map(([key]) => Number(noteCounts[key]) || 0));

  return createPortal(
    <Motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="msc-song-spotlight-title"
      className={`fixed inset-0 z-[130] overflow-hidden bg-black/95 text-white cursor-pointer ${closing ? 'pointer-events-none' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.34, ease: EASE_ACCEL }}
      onClick={dismiss}
    >
      {cover && (
        <Motion.img
          src={cover}
          alt=""
          aria-hidden="true"
          className="absolute inset-[-8%] h-[116%] w-[116%] object-cover opacity-25"
          style={{ filter: 'blur(34px) saturate(0.82) brightness(0.7)' }}
          initial={reduceMotion ? false : { scale: 1.08, opacity: 0 }}
          animate={{ scale: 1.02, opacity: 0.25 }}
          exit={{ scale: 1.08, opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE_ACCEL }}
        />
      )}

      <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/25" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-amber-200/30" />

      {!reduceMotion && PARTICLES.map((particle) => (
        <Motion.span
          key={`${particle.left}-${particle.top}`}
          aria-hidden="true"
          className="absolute w-px bg-amber-100/75 shadow-[0_0_8px_rgba(253,230,138,0.72)]"
          style={{
            left: particle.left,
            top: particle.top,
            height: particle.size,
            rotate: `${particle.rotate}deg`,
          }}
          animate={{ opacity: [0, 0.72, 0], y: [12, 0, -18] }}
          transition={{
            duration: beatDuration * 4,
            delay: particle.delay * beatDuration,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          dismiss();
        }}
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center border border-white/20 bg-black/45 text-zinc-200 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white md:right-7 md:top-7"
        title="返回图池"
        aria-label="返回图池"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center px-5 py-5 sm:px-8 sm:py-7">
        <Motion.p
          className="mb-3 text-[11px] font-black uppercase text-amber-200/80 md:mb-5 md:text-sm"
          style={{ letterSpacing: 0 }}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14, ease: EASE_ACCEL }}
        >
          {pickLabel || 'TRACK SELECT'}
        </Motion.p>

        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto">
          <Motion.div layout className="flex w-full max-w-[1500px] flex-col items-center justify-center gap-6 lg:flex-row lg:gap-10">
            <Motion.div
              layout
              animate={{ rotate: detailsVisible && !reduceMotion ? -2.2 : 0 }}
              transition={{ duration: 0.18, ease: EASE_ACCEL }}
              className="relative shrink-0"
            >
              {!reduceMotion && [0, 1].map((ring) => (
                <Motion.div
                  key={ring}
                  aria-hidden="true"
                  className="absolute inset-0 border border-amber-200/45 shadow-[0_0_34px_rgba(251,191,36,0.12)]"
                  animate={{ scale: [1, 1.025 + ring * 0.018, 1.025 + ring * 0.018], opacity: [0.58, 0, 0] }}
                  transition={{ duration: beatDuration, delay: ring * beatDuration * 0.5, repeat: Infinity, ease: 'easeOut' }}
                />
              ))}
              <Motion.div
                data-testid="song-spotlight-cover"
                data-beat-duration={beatDuration}
                className="relative aspect-square h-[min(68vw,55vh)] max-h-[560px] max-w-[560px] overflow-hidden border border-white/30 bg-zinc-950 shadow-[0_0_65px_rgba(251,191,36,0.18)] lg:h-[min(42vw,55vh)]"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.78, rotate: -1.5 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: [1, 1.012, 1] }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: 1 }}
                transition={reduceMotion ? { duration: 0.18 } : {
                  opacity: { duration: 0.42, ease: EASE_ACCEL },
                  scale: { duration: beatDuration, repeat: Infinity, ease: 'easeOut' },
                }}
              >
                {cover ? <img src={cover} alt={song.title} className="h-full w-full object-cover" /> : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600"><Music2 className="h-16 w-16 md:h-24 md:w-24" /></div>
                )}
                {!reduceMotion && <Motion.span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-amber-100 shadow-[0_0_18px_rgba(253,230,138,0.9)]" animate={{ opacity: [0.95, 0.18, 0.18] }} transition={{ duration: beatDuration, repeat: Infinity, ease: 'easeOut' }} />}
              </Motion.div>
              <AnimatePresence>
                {!detailsVisible && (
                  <Motion.div exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15, ease: EASE_ACCEL }} className="absolute inset-x-[-12vw] top-full mt-4 text-center">
                    <h2 id="msc-song-spotlight-title" className="truncate text-3xl font-black text-white md:text-5xl" style={{ fontFamily: 'Torus, sans-serif', letterSpacing: 0 }}>{song.title || '未命名曲目'}</h2>
                    {bpm && <p className="mt-2 font-mono text-sm font-bold text-amber-200/75">BPM {bpm}</p>}
                  </Motion.div>
                )}
              </AnimatePresence>
            </Motion.div>

            <AnimatePresence>
              {detailsVisible && (
                <Motion.section
                  initial={{ opacity: 0, x: 34 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.18, ease: EASE_ACCEL }}
                  className="w-full max-w-2xl border-l-4 border-amber-300 bg-black/45 p-5 text-left md:p-7"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h2 id="msc-song-spotlight-title" className="text-3xl font-black text-white md:text-5xl" style={{ fontFamily: 'Torus, sans-serif', letterSpacing: 0 }}>{song.title || '未命名曲目'}</h2>
                      <p className="mt-2 text-lg font-bold text-zinc-300 md:text-2xl">{artist}</p>
                    </div>
                    <div className={`shrink-0 border px-4 py-3 text-center ${DIFFICULTY_STYLES[difficultyName] || DIFFICULTY_STYLES.MASTER}`}>
                      <p className="text-sm font-black">{difficultyName}</p>
                      <p className="mt-1 font-mono text-3xl font-black">{song.chartConstant ?? song.levelValue ?? '--'}</p>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-white/10 py-5 text-base md:text-xl">
                    <div><p className="text-sm text-zinc-500">谱师</p><p className="mt-1 font-bold text-white">{song.charter || '未收录'}</p></div>
                    <div><p className="text-sm text-zinc-500">总物量</p><p className="mt-1 font-mono text-3xl font-black text-white">{Number(song.totalNotes || 0).toLocaleString()}</p></div>
                    <div><p className="text-sm text-zinc-500">BPM</p><p className="mt-1 font-mono text-2xl font-black text-amber-200">{bpm || '--'}</p></div>
                    <div><p className="text-sm text-zinc-500">别名</p><p className="mt-1 line-clamp-2 font-bold text-zinc-200">{song.aliases?.length ? song.aliases.join(' / ') : '未收录'}</p></div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {NOTE_LABELS.map(([key, label, color]) => {
                      const count = Number(noteCounts[key]) || 0;
                      return <div key={key} className="grid grid-cols-[64px_1fr_60px] items-center gap-3"><span className="text-sm font-black text-zinc-400">{label}</span><div className="h-3 bg-white/10"><Motion.div initial={{ scaleX: 0 }} animate={{ scaleX: count / maxNoteCount }} transition={{ duration: 0.18, delay: 0.05, ease: EASE_ACCEL }} className={`h-full origin-left ${color}`} /></div><span className="text-right font-mono text-lg font-black text-white">{count}</span></div>;
                    })}
                  </div>
                </Motion.section>
              )}
            </AnimatePresence>
          </Motion.div>
        </div>
      </div>
    </Motion.div>,
    document.body,
  );
}
