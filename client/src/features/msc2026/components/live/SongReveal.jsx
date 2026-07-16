import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { Music2, Shuffle } from 'lucide-react';
import { EASE_ACCEL, MOTION_TRANSITIONS } from '../../utils/motion';

function songMeta(play) {
  const song = play?.song || play?.songId || play || {};
  return {
    id: String(play?.songId?._id || play?.songId || song?._id || play?.order || 'song'),
    title: song?.title || play?.title || '曲目待确认',
    artist: song?.artist || song?.basic_info?.artist || play?.artist || '',
  };
}

export default function SongReveal({ play, label, order }) {
  const reduceMotion = useReducedMotion();
  const meta = songMeta(play);
  const isRandom = play?.pickType === 'random';
  const Icon = isRandom ? Shuffle : Music2;

  return (
    <AnimatePresence mode="wait">
      <Motion.section
        key={meta.id}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, clipPath: 'inset(0 100% 0 0)' }}
        animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)' }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, clipPath: 'inset(0 0 0 100%)' }}
        transition={MOTION_TRANSITIONS.flow}
        className="relative overflow-hidden border border-amber-400/25 bg-[#11100c] px-5 py-5 md:px-7 md:py-6"
      >
        <Motion.div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-amber-300"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.34, ease: EASE_ACCEL, delay: reduceMotion ? 0 : 0.14 }}
        />
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <Motion.div
            initial={reduceMotion ? false : { rotate: -18, scale: 0.7, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={MOTION_TRANSITIONS.spring}
            className="h-14 w-14 md:h-16 md:w-16 shrink-0 border border-amber-400/25 bg-amber-500/10 flex items-center justify-center text-amber-300"
          >
            <Icon className="h-7 w-7 md:h-8 md:w-8" />
          </Motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-bold uppercase tracking-[0.18em] text-amber-300/75">
              {label || (isRandom ? '系统随机曲目' : '当前曲目')}
            </p>
            <h3 className="mt-1 text-3xl md:text-5xl font-black text-white truncate" style={{ fontFamily: 'Torus, sans-serif' }}>
              {meta.title}
            </h3>
            {meta.artist && <p className="mt-1 text-base md:text-xl text-zinc-400 truncate">{meta.artist}</p>}
          </div>
          {order != null && (
            <div className="hidden sm:block shrink-0 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">TRACK</p>
              <p className="text-5xl font-black tabular-nums text-zinc-200" style={{ fontFamily: 'Torus, sans-serif' }}>
                {String(order).padStart(2, '0')}
              </p>
            </div>
          )}
        </div>
        {!reduceMotion && (
          <Motion.div
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-px bg-amber-300/70"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: EASE_ACCEL }}
          />
        )}
      </Motion.section>
    </AnimatePresence>
  );
}
