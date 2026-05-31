// ============================================================
// ScoreEntryForm.jsx — 裁判成绩录入表单
// ============================================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaClipboardCheck, FaUser } from 'react-icons/fa';
import { SCORE_LIMITS } from '../../constants/gameData';

/** 单个分数输入 */
function ScoreField({ label, field, value, onChange, ...limits }) {
  const { min = 0, max, decimals = 0, suffix = '' } = limits;

  const handleChange = (e) => {
    const raw = e.target.value;
    // 只允许数字和小数点
    if (raw !== '' && !/^[\d.]+$/.test(raw)) return;
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
    <div className="flex-1">
      <label className="block text-[11px] text-zinc-500 mb-1.5 font-medium">
        {label}
        <span className="text-zinc-600 ml-1">
          ({min}-{max}{suffix})
        </span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`
          w-full px-3 py-2.5 rounded-xl text-sm font-mono border transition-all outline-none
          ${isValid
            ? 'bg-zinc-800/80 border-white/10 text-white focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20'
            : 'bg-zinc-800/80 border-red-500/30 text-red-300'
          }
        `}
        placeholder={decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0'}
      />
      {!isValid && value !== '' && (
        <p className="text-[10px] text-red-400/70 mt-1">格式或范围不正确</p>
      )}
    </div>
  );
}

/** 选手成绩卡片 */
function PlayerScoreCard({ player, prefix, scores, onChange }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${prefix === 'p1' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
          {prefix.toUpperCase()}
        </div>
        <FaUser className="text-zinc-600 text-xs" />
        <span className="text-sm text-white font-medium">{player?.username || '—'}</span>
      </div>
      <div className="flex gap-3">
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
          label="大P率"
          field={`${prefix}Score.perfectRate`}
          value={scores.perfectRate}
          onChange={onChange}
          max={SCORE_LIMITS.perfectRate.max}
          decimals={SCORE_LIMITS.perfectRate.decimals}
          suffix="%"
        />
      </div>
    </div>
  );
}

/** 裁判成绩录入表单 */
export default function ScoreEntryForm({
  songIndex, p1, p2,
  onSubmit, onAdvance,
  disabled = false, initialScores = null,
}) {
  const [scores, setScores] = useState({
    p1Score: {
      achievement: initialScores?.p1Score?.achievement?.toString() || '',
      dxScore: initialScores?.p1Score?.dxScore?.toString() || '',
      perfectRate: initialScores?.p1Score?.perfectRate?.toString() || '',
    },
    p2Score: {
      achievement: initialScores?.p2Score?.achievement?.toString() || '',
      dxScore: initialScores?.p2Score?.dxScore?.toString() || '',
      perfectRate: initialScores?.p2Score?.perfectRate?.toString() || '',
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

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
    const p = parseFloat(score.perfectRate);

    if (isNaN(a) || a < 0 || a > SCORE_LIMITS.achievement.max) {
      return `${label}: 完成率需在 0-${SCORE_LIMITS.achievement.max} 之间`;
    }
    if (isNaN(d) || d < 0 || d > SCORE_LIMITS.dxScore.max) {
      return `${label}: DX 分数需为有效整数`;
    }
    if (isNaN(p) || p < 0 || p > SCORE_LIMITS.perfectRate.max) {
      return `${label}: 大P率需在 0-${SCORE_LIMITS.perfectRate.max} 之间`;
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
      songIndex,
      p1Score: {
        achievement: parseFloat(scores.p1Score.achievement),
        dxScore: parseInt(scores.p1Score.dxScore, 10),
        perfectRate: parseFloat(scores.p1Score.perfectRate),
      },
      p2Score: {
        achievement: parseFloat(scores.p2Score.achievement),
        dxScore: parseInt(scores.p2Score.dxScore, 10),
        perfectRate: parseFloat(scores.p2Score.perfectRate),
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
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center"
      >
        <FaClipboardCheck className="text-2xl text-green-400 mx-auto mb-2" />
        <p className="text-sm text-green-300 font-medium">成绩已录入 ✓</p>
        <button
          onClick={async () => {
            setSubmitted(false);
            if (onAdvance) await onAdvance();
          }}
          className="mt-3 px-5 py-2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm hover:bg-amber-500/30 transition-all"
        >
          推进下一轮
        </button>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
        裁判成绩录入
      </h3>

      <PlayerScoreCard player={p1} prefix="p1" scores={scores.p1Score} onChange={handleScoreChange} />
      <PlayerScoreCard player={p2} prefix="p2" scores={scores.p2Score} onChange={handleScoreChange} />

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-400 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          {error}
        </motion.p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || disabled}
        className={`
          w-full py-3 rounded-xl font-medium text-sm transition-all
          ${!submitting && !disabled
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 shadow-lg shadow-amber-500/5'
            : 'bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed'
          }
        `}
      >
        {submitting ? '提交中...' : '确认录入成绩'}
      </button>
    </div>
  );
}
