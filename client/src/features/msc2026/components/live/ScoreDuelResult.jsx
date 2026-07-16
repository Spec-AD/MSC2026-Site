import { motion as Motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Equal, Trophy } from 'lucide-react';
import MotionButton from './MotionButton';
import { MOTION_TRANSITIONS } from '../../utils/motion';

function compareScores(a, b) {
  const fields = ['achievement', 'dxScore', 'perfectRate'];
  for (const field of fields) {
    const delta = Number(a?.[field] || 0) - Number(b?.[field] || 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

function ScoreSide({ player, score, side, leading, reduceMotion }) {
  const tone = side === 'p1' ? 'sky' : 'fuchsia';
  const border = tone === 'sky' ? 'border-sky-400/25' : 'border-fuchsia-400/25';
  const accent = tone === 'sky' ? 'text-sky-300' : 'text-fuchsia-300';

  return (
    <Motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOTION_TRANSITIONS.spring}
      className={`relative border ${border} bg-white/[0.035] p-5 md:p-7 min-w-0`}
    >
      {leading && (
        <span className="absolute right-4 top-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
          <Trophy className="h-4 w-4" /> 本曲领先
        </span>
      )}
      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${accent}`}>{side.toUpperCase()}</p>
      <h3 className="mt-2 text-2xl md:text-4xl font-black text-white truncate" style={{ fontFamily: 'Torus, sans-serif' }}>
        {player?.username || '未命名选手'}
      </h3>
      <Motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...MOTION_TRANSITIONS.enter, delay: reduceMotion ? 0 : 0.12 }}
        className="mt-6 text-4xl md:text-6xl font-black tabular-nums text-white"
        style={{ fontFamily: 'Torus, sans-serif' }}
      >
        {Number(score?.achievement || 0).toFixed(4)}<span className="text-xl md:text-2xl text-zinc-500">%</span>
      </Motion.p>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">DX SCORE</p>
          <p className="mt-1 text-xl md:text-2xl font-bold tabular-nums text-zinc-200">{Number(score?.dxScore || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">大P率</p>
          <p className="mt-1 text-xl md:text-2xl font-bold tabular-nums text-zinc-200">{Number(score?.perfectRate || 0).toFixed(4)}%</p>
        </div>
      </div>
    </Motion.div>
  );
}

export default function ScoreDuelResult({ result, onContinue }) {
  const reduceMotion = useReducedMotion();
  if (!result) return null;

  const comparison = compareScores(result.p1Score, result.p2Score);
  const leader = comparison > 0 ? result.p1 : comparison < 0 ? result.p2 : null;

  return createPortal(
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MOTION_TRANSITIONS.quick}
      className="fixed inset-0 z-[210] flex items-center justify-center overflow-hidden bg-black/82 backdrop-blur-lg"
    >
      <Motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="msc-track-result-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.985 }}
        transition={MOTION_TRANSITIONS.spring}
        style={{ width: 'calc(100% - 2rem)' }}
        className="max-w-5xl border border-white/12 bg-[#080b10] p-5 md:p-8 shadow-2xl max-h-[94dvh] overflow-y-auto"
      >
        <div className="text-center">
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-amber-300">TRACK RESULT</p>
          <h2 id="msc-track-result-title" className="mt-2 text-3xl md:text-5xl font-black text-white truncate" style={{ fontFamily: 'Torus, sans-serif' }}>
            {result.songTitle || '本曲成绩'}
          </h2>
          <p className="mt-2 text-base md:text-xl text-zinc-400">
            {leader ? `${leader.username} 本曲领先` : '本曲三项成绩完全相同'}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          <ScoreSide player={result.p1} score={result.p1Score} side="p1" leading={comparison > 0} reduceMotion={reduceMotion} />
          <div className="flex items-center justify-center px-2 text-zinc-600">
            {comparison === 0 ? <Equal className="h-8 w-8" /> : <span className="text-xl font-black">VS</span>}
          </div>
          <ScoreSide player={result.p2} score={result.p2Score} side="p2" leading={comparison < 0} reduceMotion={reduceMotion} />
        </div>

        <MotionButton
          onClick={onContinue}
          className="mt-7 w-full border border-amber-400/30 bg-amber-500/15 py-4 text-xl md:text-2xl font-black text-amber-200 hover:bg-amber-500/25"
        >
          继续比赛
        </MotionButton>
      </Motion.section>
    </Motion.div>,
    document.body,
  );
}
