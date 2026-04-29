// ============================================================
// CountdownTimer.jsx — 赛事倒计时组件
// P5 | spec §六.6.3 — 报名截止 / 预选截止 / 比赛开始实时倒计时
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaExclamationTriangle } from 'react-icons/fa';

function computeTimeRemaining(target) {
  if (!target) return null;
  const now = Date.now();
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

const TIME_LABELS = [
  { key: 'days', label: '天' },
  { key: 'hours', label: '时' },
  { key: 'minutes', label: '分' },
  { key: 'seconds', label: '秒' },
];

const CountdownTimer = ({
  targetTime,
  label = '距截止',
  expiredLabel = '已截止',
  urgentThreshold = 86400, // 1天以内变红
  size = 'md',
}) => {
  const [remaining, setRemaining] = useState(() => computeTimeRemaining(targetTime));

  useEffect(() => {
    if (!targetTime) return;
    setRemaining(computeTimeRemaining(targetTime));

    const timer = setInterval(() => {
      const r = computeTimeRemaining(targetTime);
      setRemaining(r);
      if (r.expired) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  if (!remaining) return null;

  const isUrgent = !remaining.expired && remaining.days === 0 && remaining.hours < 24 &&
    (remaining.hours * 3600 + remaining.minutes * 60 + remaining.seconds) < urgentThreshold;

  const isSmall = size === 'sm';

  if (remaining.expired) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-1.5 ${isSmall ? 'text-[10px]' : 'text-xs'} text-zinc-600`}
      >
        <FaExclamationTriangle size={isSmall ? 10 : 12} />
        <span>{expiredLabel}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 ${isSmall ? 'text-[10px]' : 'text-xs'} ${
        isUrgent ? 'text-red-400' : 'text-zinc-400'
      }`}
    >
      {!isSmall && <FaClock size={12} className={isUrgent ? 'text-red-400' : 'text-zinc-500'} />}
      <span className="whitespace-nowrap">{label}</span>
      <div className={`flex items-center gap-0.5 font-mono font-bold ${isUrgent ? 'text-red-400' : ''}`}>
        {TIME_LABELS.map(({ key, label: unitLabel }, i) => {
          const val = remaining[key];
          if (key === 'days' && val === 0) return null;
          return (
            <span key={key} className="flex items-center">
              <motion.span
                key={`${key}_${val}`}
                initial={{ y: -4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={`tabular-nums ${key === 'seconds' ? 'w-4 text-center' : 'w-5 text-center'}`}
              >
                {String(val).padStart(2, '0')}
              </motion.span>
              <span className={`${isSmall ? 'text-[8px]' : 'text-[10px]'} opacity-60`}>
                {unitLabel}{i < TIME_LABELS.length - 2 && remaining.days > 0 ? ' ' : ''}
              </span>
            </span>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CountdownTimer;
