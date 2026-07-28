import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { EASE_ACCEL } from '../../utils/motion';

const TOTAL_MS = 7000;

export default function GroupDrawReveal({ group, onComplete }) {
  const reduceMotion = useReducedMotion();
  const endAt = useMemo(() => {
    const parsed = new Date(group?.revealEndsAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }, [group?.revealEndsAt]);
  const [remaining, setRemaining] = useState(TOTAL_MS);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const completedRef = useRef(false);
  const revealed = remaining <= 1500;

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endAt - Date.now()));
    tick();
    const timer = window.setInterval(tick, 50);
    return () => window.clearInterval(timer);
  }, [endAt]);

  useEffect(() => {
    if (remaining > 0 || completedRef.current) return;
    completedRef.current = true;
    let retryTimer;
    Promise.resolve(onComplete?.()).catch(() => {
      completedRef.current = false;
      retryTimer = window.setTimeout(() => setRetryAttempt(value => value + 1), 1500);
    });
    return () => window.clearTimeout(retryTimer);
  }, [onComplete, remaining, retryAttempt]);

  if (!group) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] overflow-hidden bg-[#05070a] text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-cyan-300" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-300" />
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <Motion.div
          animate={reduceMotion ? undefined : { rotate: [0, 180, 360] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          className="flex h-20 w-20 items-center justify-center border border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
        >
          <Shuffle className="h-9 w-9" />
        </Motion.div>
        <p className="mt-7 text-lg font-black text-zinc-500">GROUP DRAW / {String(group.order + 1).padStart(2, '0')}</p>
        <h1 className="mt-2 text-5xl font-black md:text-8xl" style={{ fontFamily: 'Torus, sans-serif' }}>
          {revealed ? `第 ${group.order + 1} 组` : '抽签进行中'}
        </h1>

        <div className="mt-10 grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-10">
          {['p1', 'p2'].map((side, index) => {
            const player = group[side];
            return (
              <Motion.div
                key={side}
                initial={{ opacity: 0, x: index === 0 ? -80 : 80 }}
                animate={{ opacity: revealed ? 1 : 0.25, x: 0, scale: revealed ? 1 : 0.94 }}
                transition={{ duration: 0.18, ease: EASE_ACCEL }}
                className={`min-w-0 border p-5 md:p-9 ${index === 0 ? 'border-sky-400/35 bg-sky-500/10' : 'border-fuchsia-400/35 bg-fuchsia-500/10'}`}
              >
                <p className={`text-2xl font-black ${index === 0 ? 'text-sky-300' : 'text-fuchsia-300'}`}>{side.toUpperCase()}</p>
                <p className="mt-3 truncate text-3xl font-black md:text-6xl" style={{ fontFamily: 'Torus, sans-serif' }}>
                  {revealed ? player?.username || '待确认' : '---'}
                </p>
              </Motion.div>
            );
          }).reduce((nodes, node, index) => index === 0 ? [node, <span key="vs" className="text-3xl font-black text-zinc-600 md:text-5xl">VS</span>] : [...nodes, node], [])}
        </div>

        <div className="mt-10 h-2 w-full max-w-3xl overflow-hidden bg-white/10">
          <Motion.div
            className="h-full origin-left bg-amber-300"
            animate={{ scaleX: Math.min(1, Math.max(0, 1 - remaining / TOTAL_MS)) }}
            transition={{ duration: 0.12, ease: EASE_ACCEL }}
          />
        </div>
        <p className="mt-4 font-mono text-2xl font-black tabular-nums text-amber-200">{(remaining / 1000).toFixed(1)}s</p>
      </div>
    </div>,
    document.body,
  );
}
