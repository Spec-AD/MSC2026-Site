// ============================================================
// RaceStatBar.jsx — “小标签 · 大数字” 风格的跑图数据条
// ============================================================

function fmtMs(ms) {
  if (ms == null || ms < 0) return '--:--';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 单个数据格：小标签在上，大数字在下 */
export function Stat({ label, value, unit, sub, tone = 'default', size = 'lg', pulse = false }) {
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
    <div className="flex flex-col items-start px-5 py-4 md:px-6 md:py-5 rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl min-h-[118px]">
      <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400 mb-2">{label}</span>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={`${sizeCls} font-bold leading-none tabular-nums ${toneCls} ${pulse ? 'animate-pulse' : ''}`} style={{ fontFamily: 'Torus, sans-serif' }}>
          {value}
        </span>
        {unit && <span className="text-lg md:text-xl text-zinc-400 font-semibold">{unit}</span>}
      </div>
      {sub && <span className="text-sm md:text-base text-zinc-500 mt-2 tracking-wide truncate max-w-full">{sub}</span>}
    </div>
  );
}

export default function RaceStatBar({
  totalRemainingMs, turnRemainingMs, currentTurn,
  finishedCount = 0, advanceCount = 0, playerCount = 0, stageLabel = '',
}) {
  const totalLow = totalRemainingMs != null && totalRemainingMs < 5 * 60 * 1000;
  const turnLow = turnRemainingMs != null && turnRemainingMs < 10 * 1000;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 w-full">
      <Stat label="总时长" value={fmtMs(totalRemainingMs)} sub="剩余时间" tone={totalLow ? 'red' : 'default'} pulse={totalLow} size="xl" />
      <Stat label="本回合" value={fmtMs(turnRemainingMs)} sub="行动倒计时" tone={turnLow ? 'red' : 'amber'} pulse={turnLow} />
      <Stat label="回合数" value={currentTurn ?? 0} sub="已进行" />
      <Stat label="已抵达中心" value={finishedCount} unit={`/ ${advanceCount}`} sub="晋级名额" tone="emerald" />
      <Stat label="赛场" value={playerCount} unit="人" sub={stageLabel} tone="blue" />
    </div>
  );
}
