import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { EASE_ACCEL, MOTION_TRANSITIONS } from '../../utils/motion';

const TONES = {
  amber: { line: 'bg-amber-300', eyebrow: 'text-amber-300', glow: 'shadow-amber-500/20' },
  cyan: { line: 'bg-cyan-300', eyebrow: 'text-cyan-300', glow: 'shadow-cyan-500/20' },
  emerald: { line: 'bg-emerald-300', eyebrow: 'text-emerald-300', glow: 'shadow-emerald-500/20' },
  red: { line: 'bg-red-400', eyebrow: 'text-red-300', glow: 'shadow-red-500/20' },
  violet: { line: 'bg-violet-300', eyebrow: 'text-violet-300', glow: 'shadow-violet-500/20' },
};

export default function EventCueOverlay({ cue }) {
  const tone = TONES[cue?.tone] || TONES.amber;
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {cue && (
        <Motion.div
          key={cue.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION_TRANSITIONS.quick}
          className="fixed inset-0 z-[240] pointer-events-none flex items-center justify-center bg-black/58"
        >
          <Motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 42, scaleY: 0.72 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -28, scaleY: 0.9 }}
            transition={MOTION_TRANSITIONS.spring}
            className={`w-full border-y border-white/10 bg-[#080b10]/95 py-9 md:py-12 shadow-2xl ${tone.glow}`}
          >
            <div className="mx-auto max-w-6xl px-6 text-center">
              <Motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.38, ease: EASE_ACCEL }}
                className={`mx-auto h-1 w-24 origin-center ${tone.line}`}
              />
              <Motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...MOTION_TRANSITIONS.enter, delay: reduceMotion ? 0 : 0.08 }}
                className={`mt-5 text-sm md:text-base font-bold uppercase tracking-[0.2em] ${tone.eyebrow}`}
              >
                {cue.eyebrow}
              </Motion.p>
              <Motion.h2
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...MOTION_TRANSITIONS.enter, delay: reduceMotion ? 0 : 0.12 }}
                className="mt-2 text-4xl md:text-7xl font-black text-white leading-tight break-words"
                style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}
              >
                {cue.title}
              </Motion.h2>
              {cue.detail && (
                <Motion.p
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...MOTION_TRANSITIONS.enter, delay: reduceMotion ? 0 : 0.17 }}
                  className="mt-3 text-lg md:text-2xl text-zinc-300 break-words"
                >
                  {cue.detail}
                </Motion.p>
              )}
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
