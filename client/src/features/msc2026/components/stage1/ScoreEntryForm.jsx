// ============================================================
// ScoreEntryForm.jsx — 裁判成绩录入表单
// ============================================================
import { useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { FaClipboardCheck, FaUser } from 'react-icons/fa';
import { SCORE_LIMITS } from '../../constants/gameData';
import MotionButton from '../live/MotionButton';
import { MOTION_TRANSITIONS } from '../../utils/motion';

/** 单个分数输入 */
function ScoreField({ label, field, value, onChange, ...limits }) {
  const { min = 0, max, decimals = 0, suffix = '' } = limits;

  const handleChange = (e) => {
    const raw = e.target.value;
    // 只允许数字和小数点
    const pattern = decimals === 0 ? /^\d+$/ : /^[\d.]+$/;
    if (raw !== '' && !pattern.test(raw)) return;
    onChange(field, raw);
  };

  const handleBlur = () => {
    if (value === '' || value === '.') {
      onChange(field, '0');
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      onChange(field, '0');
      return;
    }
    const clamped = Math.min(max, Math.max(min, num));
    onChange(field, clamped.toFixed(decimals));
  };

  const isValid = value !== '' && value !== '.' && !isNaN(parseFloat(value))
    && parseFloat(value) >= min && parseFloat(value) <= max;

  return (
    <div className="flex-1 min-w-[160px]">
      <label className="block text-sm text-zinc-400 mb-2 font-semibold uppercase tracking-[0.12em]">
        {label}
        <span className="text-zinc-600 ml-2 normal-case tracking-normal">
          ({min}-{max}{suffix})
        </span>
      </label>
      <input
        type="text"
        inputMode={decimals === 0 ? 'numeric' : 'decimal'}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`
          w-full px-4 py-4 rounded-xl text-3xl font-mono border transition-all outline-none tabular-nums
          ${isValid
            ? 'bg-zinc-800/80 border-white/10 text-white focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20'
            : 'bg-zinc-800/80 border-red-500/30 text-red-300'
          }
        `}
        placeholder={decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0'}
      />
      {!isValid && value !== '' && (
        <p className="text-sm text-red-400/80 mt-2">格式或范围不正确</p>
      )}
    </div>
  );
}

/** 选手成绩卡片 */
function PlayerScoreCard({ player, prefix, scores, onChange }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black
          ${prefix === 'p1' ? 'bg-sky-500/15 text-sky-200' : 'bg-fuchsia-500/15 text-fuchsia-200'}`}>
          {prefix.toUpperCase()}
        </div>
        <FaUser className="text-zinc-600 text-lg" />
        <span className="text-3xl text-white font-black truncate">{player?.username || '—'}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        <ScoreField
          label="完成率"
          field={`${prefix}Score.achievement`}
          value={scores.achievement}
          onChange={onChange}
          max={SCORE_LIMITS.achievement.max}
          decimals={SCORE_LIMITS.achievement.decimals}
          suffix="%"
        />
        <ScoreField
          label="DX 分数"
          field={`${prefix}Score.dxScore`}
          value={scores.dxScore}
          onChange={onChange}
          max={SCORE_LIMITS.dxScore.max}
          decimals={0}
        />
        <ScoreField
          label="完美 BREAK"
          field={`${prefix}Score.perfectBreak`}
          value={scores.perfectBreak}
          onChange={onChange}
          max={SCORE_LIMITS.perfectBreak.max}
          decimals={0}
        />
      </div>
    </div>
  );
}

/** 裁判成绩录入表单 */
export default function ScoreEntryForm({
  songId, songIndex, p1, p2,
  onSubmit, onAdvance,
  disabled = false, initialScores = null,
}) {
  const [scores, setScores] = useState({
    p1Score: {
      achievement: initialScores?.p1Score?.achievement?.toString() || '',
      dxScore: initialScores?.p1Score?.dxScore?.toString() || '',
      perfectBreak: initialScores?.p1Score?.perfectBreak?.toString() || '',
    },
    p2Score: {
      achievement: initialScores?.p2Score?.achievement?.toString() || '',
      dxScore: initialScores?.p2Score?.dxScore?.toString() || '',
      perfectBreak: initialScores?.p2Score?.perfectBreak?.toString() || '',
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleScoreChange = (field, value) => {
    setScores((prev) => {
      const newScores = { ...prev };
      const parts = field.split('.');
      let obj = newScores;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return newScores;
    });
    setError(null);
  };

  /** 校验单个 score 对象 */
  const validateScore = (score, label) => {
    const a = parseFloat(score.achievement);
    const d = parseInt(score.dxScore, 10);
    const p = parseInt(score.perfectBreak, 10);

    if (isNaN(a) || a < 0 || a > SCORE_LIMITS.achievement.max) {
      return `${label}: 完成率需在 0-${SCORE_LIMITS.achievement.max} 之间`;
    }
    if (isNaN(d) || d < 0 || d > SCORE_LIMITS.dxScore.max) {
      return `${label}: DX 分数需为有效整数`;
    }
    if (!Number.isInteger(p) || p < 0 || p > SCORE_LIMITS.perfectBreak.max) {
      return `${label}: 完美 BREAK 数量需为 0-${SCORE_LIMITS.perfectBreak.max} 的整数`;
    }
    return null;
  };

  const handleSubmit = async () => {
    // 校验
    const err1 = validateScore(scores.p1Score, 'P1');
    const err2 = validateScore(scores.p2Score, 'P2');
    if (err1 || err2) {
      setError(err1 || err2);
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      songId,
      songIndex,
      p1Score: {
        achievement: parseFloat(scores.p1Score.achievement),
        dxScore: parseInt(scores.p1Score.dxScore, 10),
        perfectBreak: parseInt(scores.p1Score.perfectBreak, 10),
      },
      p2Score: {
        achievement: parseFloat(scores.p2Score.achievement),
        dxScore: parseInt(scores.p2Score.dxScore, 10),
        perfectBreak: parseInt(scores.p2Score.perfectBreak, 10),
      },
    };

    try {
      await onSubmit(payload);
      setSubmitted(true);
    } catch (err) {
      setError(err?.msg || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Motion.div
        initial={reduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={MOTION_TRANSITIONS.spring}
        className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-8 text-center"
      >
        <FaClipboardCheck className="text-4xl text-emerald-300 mx-auto mb-3" />
        <p className="text-3xl text-emerald-200 font-black">成绩已录入</p>
        <MotionButton
          loading={advancing}
          onClick={async () => {
            if (!onAdvance) return;
            setAdvancing(true);
            try {
              await onAdvance();
              setSubmitted(false);
            } finally {
              setAdvancing(false);
            }
          }}
          className="mt-5 px-8 py-3 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xl font-bold hover:bg-amber-500/30 transition-all"
        >
          {advancing ? '推进中...' : '推进下一轮'}
        </MotionButton>
      </Motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
      <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
        裁判成绩录入
      </h3>

      <PlayerScoreCard player={p1} prefix="p1" scores={scores.p1Score} onChange={handleScoreChange} />
      <PlayerScoreCard player={p2} prefix="p2" scores={scores.p2Score} onChange={handleScoreChange} />

      <AnimatePresence>
        {error && (
          <Motion.p
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={MOTION_TRANSITIONS.quick}
            className="text-lg text-red-300 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            {error}
          </Motion.p>
        )}
      </AnimatePresence>

      <MotionButton
        onClick={handleSubmit}
        disabled={submitting || disabled}
        loading={submitting}
        className={`
          w-full py-4 rounded-xl font-black text-2xl transition-all
          ${!submitting && !disabled
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 shadow-lg shadow-amber-500/5'
            : 'bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed'
          }
        `}
      >
        {submitting ? '提交中...' : '确认录入成绩'}
      </MotionButton>
    </div>
  );
}
