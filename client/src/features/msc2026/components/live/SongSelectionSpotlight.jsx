import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
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

export default function SongSelectionSpotlight({ song, onClose, pickLabel }) {
  const reduceMotion = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const bpm = normalizeBpm(song);
  const beatDuration = bpm ? Math.max(0.18, Math.min(1.2, 60 / bpm)) : 0.5;
  const cover = getSongCover(song);
  const artist = song?.artist || song?.basic_info?.artist || '曲师未标注';

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

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
      setClosing(false);
    }, reduceMotion ? 120 : 340);
  };

  if (!song) return null;

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

        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
          {!reduceMotion && [0, 1].map((ring) => (
            <Motion.div
              key={ring}
              aria-hidden="true"
              className="absolute aspect-square h-[min(72vw,58vh)] max-h-[560px] max-w-[560px] border border-amber-200/45 shadow-[0_0_34px_rgba(251,191,36,0.12)]"
              animate={{ scale: [1, 1.025 + ring * 0.018, 1.025 + ring * 0.018], opacity: [0.58, 0, 0] }}
              transition={{
                duration: beatDuration,
                delay: ring * beatDuration * 0.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}

          <Motion.div
            data-testid="song-spotlight-cover"
            data-beat-duration={beatDuration}
            className="relative aspect-square h-[min(72vw,58vh)] max-h-[560px] max-w-[560px] overflow-hidden border border-white/30 bg-zinc-950 shadow-[0_0_65px_rgba(251,191,36,0.18)]"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.78, rotate: -1.5 }}
            animate={reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: [1, 1.012, 1], rotate: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: 1 }}
            transition={reduceMotion
              ? { duration: 0.18 }
              : {
                  opacity: { duration: 0.42, ease: EASE_ACCEL },
                  rotate: { duration: 0.52, ease: EASE_ACCEL },
                  scale: { duration: beatDuration, repeat: Infinity, ease: 'easeOut' },
                }}
          >
            {cover ? (
              <img src={cover} alt={song.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
                <Music2 className="h-16 w-16 md:h-24 md:w-24" />
              </div>
            )}
            {!reduceMotion && (
              <Motion.span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-amber-100 shadow-[0_0_18px_rgba(253,230,138,0.9)]"
                animate={{ opacity: [0.95, 0.18, 0.18] }}
                transition={{ duration: beatDuration, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </Motion.div>
        </div>

        <Motion.div
          className="mt-3 w-full max-w-5xl shrink-0 text-center md:mt-5"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.18, ease: EASE_ACCEL }}
        >
          <h2
            id="msc-song-spotlight-title"
            className="overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-black text-white sm:text-4xl md:text-5xl"
            style={{ fontFamily: 'Torus, sans-serif', letterSpacing: 0 }}
          >
            {song.title || '未命名曲目'}
          </h2>
          <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-zinc-300 sm:text-lg md:text-xl">
            {artist}
          </p>
          {bpm && (
            <p className="mt-2 font-mono text-xs font-bold text-amber-200/75 md:text-sm">
              BPM {bpm}
            </p>
          )}
        </Motion.div>
      </div>
    </Motion.div>,
    document.body,
  );
}
