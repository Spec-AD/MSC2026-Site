import { useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import MotionButton from './MotionButton';
import { MOTION_TRANSITIONS } from '../../utils/motion';

export default function RandomDrawPrompt({ onDraw, label = '第三首随机曲目' }) {
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const reduceMotion = useReducedMotion();

  const handleDraw = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onDraw();
      setCompleted(true);
      setPending(false);
    } catch (err) {
      setError(err?.msg || err?.message || '随机抽取失败');
      setPending(false);
    }
  };

  return (
    <Motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOTION_TRANSITIONS.enter}
      className="relative overflow-hidden border border-amber-300/25 bg-[#11100c] px-5 py-7 text-center md:px-8 md:py-10"
    >
      <Motion.div
        className="mx-auto flex h-16 w-16 items-center justify-center border border-amber-300/30 bg-amber-400/10 text-amber-200 md:h-20 md:w-20"
        animate={reduceMotion || pending ? undefined : { rotate: [0, 5, -5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Shuffle className="h-8 w-8 md:h-10 md:w-10" />
      </Motion.div>
      <p className="mt-5 text-xs font-black uppercase text-amber-300/70" style={{ letterSpacing: 0 }}>
        RANDOM DRAW READY
      </p>
      <h3 className="mt-1 text-3xl font-black text-white md:text-5xl" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
        {label}
      </h3>
      <p className="mt-2 text-base font-semibold text-zinc-400 md:text-xl">两首自选曲成绩已确认</p>

      {error && (
        <p role="alert" className="mx-auto mt-5 max-w-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </p>
      )}

      <MotionButton
        onClick={handleDraw}
        loading={pending}
        disabled={pending || completed}
        className="mx-auto mt-6 flex w-full max-w-2xl items-center justify-center gap-3 rounded-lg border border-amber-300/35 bg-amber-400/15 px-6 py-4 text-xl font-black text-amber-100 hover:bg-amber-400/25 md:text-2xl"
      >
        <Shuffle className="h-6 w-6" />
        {pending ? '抽取中...' : completed ? '随机曲目已锁定' : '开始随机抽取'}
      </MotionButton>
    </Motion.section>
  );
}
