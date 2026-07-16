import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Crown, Trophy } from 'lucide-react';
import { MOTION_TRANSITIONS } from '../../utils/motion';

export default function WinnerReveal({ name, eyebrow = 'QUALIFIED', detail, champion = false }) {
  const reduceMotion = useReducedMotion();
  const Icon = champion ? Trophy : Crown;

  return (
    <Motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOTION_TRANSITIONS.spring}
      className="relative overflow-hidden border border-amber-400/30 bg-[#131007] px-6 py-8 md:px-10 md:py-10 text-center"
    >
      <Motion.div
        initial={reduceMotion ? false : { scale: 0.45, rotate: -18, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={MOTION_TRANSITIONS.spring}
        className="mx-auto flex h-16 w-16 items-center justify-center border border-amber-400/30 bg-amber-500/12 text-amber-300"
      >
        <Icon className="h-8 w-8" />
      </Motion.div>
      <p className="mt-5 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-amber-300/80">{eyebrow}</p>
      <h2 className="mt-2 text-4xl md:text-7xl font-black text-white break-words" style={{ fontFamily: 'Torus, sans-serif' }}>
        {name || '结果待确认'}
      </h2>
      {detail && <p className="mt-3 text-base md:text-xl text-zinc-400">{detail}</p>}
      {!reduceMotion && (
        <Motion.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-1 bg-amber-300"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ ...MOTION_TRANSITIONS.flow, delay: 0.08 }}
        />
      )}
    </Motion.section>
  );
}
