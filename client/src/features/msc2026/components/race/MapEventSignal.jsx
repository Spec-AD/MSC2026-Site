import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, ShieldCheck, ShieldX, Trophy } from 'lucide-react';
import { MOTION_TRANSITIONS } from '../../utils/motion';

const SIGNALS = {
  advance: { icon: ArrowDownToLine, line: 'border-sky-300/70', text: 'text-sky-200', ring: 'border-sky-300/55' },
  success: { icon: ShieldCheck, line: 'border-emerald-300/70', text: 'text-emerald-200', ring: 'border-emerald-300/55' },
  failure: { icon: ShieldX, line: 'border-red-300/70', text: 'text-red-200', ring: 'border-red-300/55' },
  finish: { icon: Trophy, line: 'border-amber-300/70', text: 'text-amber-200', ring: 'border-amber-300/55' },
};

export default function MapEventSignal({ signal }) {
  const reduceMotion = useReducedMotion();
  const style = SIGNALS[signal?.type] || SIGNALS.advance;
  const Icon = style.icon;

  return (
    <AnimatePresence mode="wait">
      {signal && (
        <Motion.div
          key={signal.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION_TRANSITIONS.quick}
          className={`pointer-events-none absolute inset-0 z-40 overflow-hidden border-2 ${style.line}`}
        >
          {!reduceMotion && (
            <>
              <Motion.div
                className={`absolute left-1/2 top-1/2 aspect-square w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${style.ring}`}
                initial={{ scale: 0.4, opacity: 0.9 }}
                animate={{ scale: 8, opacity: 0 }}
                transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
              />
              <Motion.div
                className={`absolute left-1/2 top-1/2 aspect-square w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border ${style.ring}`}
                initial={{ scale: 0.35, opacity: 0.75 }}
                animate={{ scale: 6, opacity: 0 }}
                transition={{ duration: 1.2, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            </>
          )}
          <Motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={MOTION_TRANSITIONS.spring}
            className="absolute bottom-5 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 border border-white/12 bg-[#070a0f]/92 px-5 py-3 shadow-2xl backdrop-blur-md"
          >
            <Icon className={`h-6 w-6 shrink-0 ${style.text}`} />
            <div className="min-w-0">
              <p className={`text-lg md:text-xl font-black truncate ${style.text}`}>{signal.title}</p>
              {signal.detail && <p className="text-sm md:text-base text-zinc-400 truncate">{signal.detail}</p>}
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
