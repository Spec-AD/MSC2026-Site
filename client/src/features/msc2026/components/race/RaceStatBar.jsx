// ============================================================
// RaceStatBar.jsx — “小标签 · 大数字” 风格的跑图数据条
// ============================================================
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { MOTION_TRANSITIONS, STAGGER_CONTAINER, STAGGER_ITEM } from '../../utils/motion';

function fmtMs(ms) {
  if (ms == null || ms < 0) return '--:--';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 单个数据格：小标签在上，大数字在下 */
export function Stat({ label, value, unit, sub, tone = 'default', size = 'lg', pulse = false }) {
  const reduceMotion = useReducedMotion();
  const toneCls = {
    default: 'text-white',
    amber: 'text-amber-300',
    emerald: 'text-emerald-400',
    blue: 'text-sky-300',
    red: 'text-red-400',
    zinc: 'text-zinc-400',
  }[tone] || 'text-white';

  const sizeCls = size === 'xl' ? 'text-5xl md:text-6xl' : size === 'sm' ? 'text-2xl' : 'text-4xl md:text-5xl';

  return (
    <Motion.div
      variants={reduceMotion ? undefined : STAGGER_ITEM}
      className="msc-panel relative flex min-h-[126px] flex-col items-start overflow-hidden border-t-2 border-t-white/25 px-5 py-4 md:min-h-[142px] md:px-6 md:py-5"
    >
      <span className="mb-3 font-mono text-xs font-black text-zinc-400 md:text-sm">{label}</span>
      <div className="flex min-w-0 items-baseline gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <Motion.span
            key={String(value)}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={MOTION_TRANSITIONS.quick}
            className={`${sizeCls} font-black leading-none tabular-nums ${toneCls} ${pulse ? 'animate-pulse' : ''}`}
            style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}
          >
            {value}
          </Motion.span>
        </AnimatePresence>
        {unit && <span className="font-mono text-lg font-black text-zinc-400 md:text-xl">{unit}</span>}
      </div>
      {sub && <span className="mt-auto max-w-full truncate pt-3 font-mono text-xs font-bold text-zinc-500 md:text-sm">{sub}</span>}
      <span className="absolute bottom-0 right-0 h-5 w-5 border-b border-r border-white/25" />
    </Motion.div>
  );
}

export default function RaceStatBar({
  totalRemainingMs, turnRemainingMs, currentTurn,
  finishedCount = 0, advanceCount = 0, playerCount = 0, stageLabel = '', roundNumber = 1, raceStatus = '',
}) {
  const reduceMotion = useReducedMotion();
  const totalLow = totalRemainingMs != null && totalRemainingMs < 5 * 60 * 1000;
  const turnLow = turnRemainingMs != null && turnRemainingMs < 10 * 1000;

  return (
    <Motion.div
      variants={reduceMotion ? undefined : STAGGER_CONTAINER}
      initial="initial"
      animate="animate"
      className="grid w-full grid-cols-2 gap-px border border-white/10 bg-white/10 lg:grid-cols-5"
    >
      <Stat label="总时长" value={fmtMs(totalRemainingMs)} sub="剩余时间" tone={totalLow ? 'red' : 'default'} pulse={totalLow} size="xl" />
      <Stat label="本回合" value={fmtMs(turnRemainingMs)} sub="行动倒计时" tone={turnLow ? 'red' : 'amber'} pulse={turnLow} />
      <Stat label="行动序号" value={currentTurn ?? 0} sub={`第 ${roundNumber} 圈 · ${raceStatus === 'paused' ? '全局暂停' : raceStatus === 'adjudicating' ? '统一判定' : raceStatus === 'waiting' ? '待启动' : raceStatus === 'racing' ? '行动中' : '未初始化'}`} />
      <Stat label="已抵达中心" value={finishedCount} unit={`/ ${advanceCount}`} sub="晋级名额" tone="emerald" />
      <Stat label="赛场" value={playerCount} unit="人" sub={stageLabel} tone="blue" />
    </Motion.div>
  );
}
