import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BookOpen, Box, Check, ChevronRight, CircleDot,
  Flag, Footprints, Hand, List, RotateCcw, ShieldAlert, SkipForward, Timer, Trophy, X,
} from 'lucide-react';
import RaceMap3D from '../components/race/RaceMap3D';
import { ITEMS_SIGH, ITEMS_WALLS } from '../constants/publicGameData';
import { EASE_ACCEL } from '../utils/motion';

const STEPS = [
  {
    key: 'goal', eyebrow: '01 / OBJECTIVE', title: '从顶点抵达中心',
    body: '每名选手只沿自己的顶点到中心这条直线移动。六边形轮次前四名晋级，正方形轮次前两名晋级。',
    points: ['起点坐标为 0', '通过两面墙后自动抵达中心坐标 3', '同圈抵达时优先比较完成用时与比赛数据'],
  },
  {
    key: 'turn', eyebrow: '02 / TURN', title: '每回合只选择一种行动',
    body: '轮到你时，可以前进、拾取相邻区域的隐藏道具，或什么都不做。每人行动一次构成一圈，下一圈采用本圈的完整倒序。',
    points: ['前进：遇墙时登记挑战', '拾取：登记区域并结束行动', '下一圈：本圈第一位改为最后一位'],
  },
  {
    key: 'wall', eyebrow: '03 / WALL', title: '墙壁必须由挑战击破',
    body: '第一面墙从 33 项挑战中优先无重复抽取；整池用完会重新洗牌继续使用。所有人完成本圈行动后，裁判再统一确认成功或失败。',
    points: ['本圈结束前不会提前推进或后退', '道具可以改变本次挑战条件', '第二面墙仍使用阶段固定挑战'],
  },
  {
    key: 'item', eyebrow: '04 / ITEM', title: '道具隐藏在相邻三角区域',
    body: '每位选手只可申请起始射线两侧的区域。所有申请在圈末统一随机匹配并发放，避免先手先拿走同一区域道具。',
    points: ['拾取申请消耗本次行动', '圈末发放后仅持有者可见内容', '主动使用普通道具不消耗行动'],
  },
  {
    key: 'ranking', eyebrow: '05 / TIMEOUT', title: '时间到也会产生明确排名',
    body: '若无人全部抵达，系统按规则排序并由裁判确认晋级名单。位置永远是第一优先级。',
    points: ['坐标更靠中心者优先', '同坐标时失败次数更少者优先', '再比较成功挑战平均完成率、累计 DX 分'],
  },
  {
    key: 'maps', eyebrow: '06 / TWO MAPS', title: '两轮地图，规则一致',
    body: '6 进 4 使用六边形，4 进 2 使用正方形。两轮都有两面墙、三个坐标和隐藏道具。',
    points: ['六边形：6 人，60 分钟，前 4 晋级', '正方形：4 人，45 分钟，前 2 晋级', '每名选手拥有两块相邻道具区域'],
  },
  {
    key: 'ready', eyebrow: '07 / READY', title: '上场前只记住四件事',
    body: '看清当前行动人、决定行动、遇墙听裁判、使用道具前读完效果与惩罚。复杂判定全部交给现场裁判。',
    points: ['不要替其他选手操作', '道具效果以持有者界面为准', '对判定有疑问时立即示意裁判'],
  },
];

const MOCK_PLAYERS = Array.from({ length: 6 }, (_, index) => ({
  userId: `tutorial-${index}`,
  username: ['YOU', 'P2', 'P3', 'P4', 'P5', 'P6'][index],
  startVertex: index,
  currentLayer: index === 0 ? 1 : 0,
  finishOrder: null,
  itemCount: index === 0 ? 1 : 0,
}));

const CHALLENGE_CATALOG = [
  {
    code: 'EVAL', name: '评价型', basis: '以 FC、FC+、AP、AP+ 等评价结果判定。',
    example: '例：在指定谱面取得 FC+ 或更高评价。',
    color: 'border-cyan-300 bg-cyan-500/[0.06] text-cyan-200',
  },
  {
    code: 'RATE', name: '完成型', basis: '以最终完成率是否达到目标线判定。',
    example: '例：在指定谱面达到现场公布的目标完成率。',
    color: 'border-emerald-300 bg-emerald-500/[0.06] text-emerald-200',
  },
  {
    code: 'DX', name: '准度型', basis: '以 DX 星级等准度结果判定。',
    example: '例：在指定谱面达到裁判要求的 DX 星级。',
    color: 'border-amber-300 bg-amber-500/[0.06] text-amber-200',
  },
  {
    code: 'LIMIT', name: '补全型', basis: '限制特定失误音符或非完美音符的数量。',
    example: '例：GREAT 及以下音符不超过裁判给出的数量。',
    color: 'border-fuchsia-300 bg-fuchsia-500/[0.06] text-fuchsia-200',
  },
  {
    code: 'COMBO', name: '复合型', basis: '要求同时满足两种或更多判定条件。',
    example: '例：取得指定评价，同时达到要求的 DX 星级。',
    color: 'border-red-300 bg-red-500/[0.06] text-red-200',
  },
];

function MapDemo({ square = false }) {
  const count = square ? 4 : 6;
  return (
    <div className="h-[430px] min-h-[430px] overflow-hidden border-y border-cyan-300/25 md:h-[560px] md:min-h-[560px]">
      <RaceMap3D
        config={{ shape: square ? 'square' : 'hexagon', layers: 3, wallLabels: square ? ['叹息之墙', '终局之墙'] : ['密锁之墙', '准锁之墙'] }}
        players={MOCK_PLAYERS.slice(0, count)}
        itemsOnMap={Array.from({ length: count }, (_, zoneIndex) => ({ zoneIndex, collected: false }))}
        wallsBroken={[{ wallIndex: 0, breachedBy: [] }, { wallIndex: 1, breachedBy: [] }]}
        activePlayerId="tutorial-0"
        highlightSectors={[0, count - 1]}
        width="100%"
        height="100%"
      />
    </div>
  );
}

function TurnDemo() {
  const actions = [
    { icon: <Footprints className="h-10 w-10" />, label: '前进一步', note: '挑战留到圈末判定', color: 'border-cyan-300/45 text-cyan-100' },
    { icon: <Hand className="h-10 w-10" />, label: '拾取道具', note: '圈末统一随机发放', color: 'border-amber-300/45 text-amber-100' },
    { icon: <SkipForward className="h-10 w-10" />, label: '什么都不做', note: '保持当前位置', color: 'border-white/20 text-zinc-200' },
  ];
  return <div className="grid min-h-[430px] content-center gap-4 p-6 md:grid-cols-3 md:p-10">{actions.map(({ icon, label, note, color }, index) => <Motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className={`border-t-4 bg-black/25 p-6 ${color}`}>{icon}<p className="mt-8 text-3xl font-black">{label}</p><p className="mt-3 text-lg text-zinc-400">{note}</p></Motion.div>)}</div>;
}

function WallDemo() {
  return <div className="relative min-h-[430px] overflow-hidden p-7 md:p-12"><div className="absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 border-x border-red-300/45 bg-red-500/10 shadow-[0_0_70px_rgba(239,68,68,0.22)]"/><div className="relative z-10 grid min-h-[340px] items-center gap-12 md:grid-cols-[1fr_auto_1fr]"><div><p className="text-sm font-black text-cyan-300">墙前坐标 1</p><p className="mt-3 text-5xl font-black">选手</p></div><ShieldAlert className="mx-auto h-20 w-20 text-red-300"/><div className="text-right"><p className="text-sm font-black text-amber-300">人工裁判判定</p><p className="mt-3 text-3xl font-black">成功 → 通过</p><p className="mt-3 text-2xl font-bold text-red-300">失败 → 退回墙前</p></div></div></div>;
}

function ItemDemo() {
  return <div className="grid min-h-[430px] items-center gap-8 p-7 md:grid-cols-2 md:p-12"><div className="border-l-4 border-cyan-300 bg-cyan-500/10 p-7"><Box className="h-14 w-14 text-cyan-200"/><p className="mt-6 text-sm font-black text-cyan-300">HIDDEN PICKUP</p><p className="mt-2 text-4xl font-black">未知道具</p><p className="mt-3 text-lg text-zinc-400">拾取前，所有人只知道这里存在道具。</p></div><div className="space-y-4"><div className="border border-emerald-300/30 bg-emerald-500/10 p-5"><p className="text-xl font-black text-emerald-200">普通增益</p><p className="mt-2 text-zinc-300">主动使用不消耗回合，通常在挑战前生效。</p></div><div className="border border-red-300/30 bg-red-500/10 p-5"><p className="text-xl font-black text-red-200">双面道具</p><p className="mt-2 text-zinc-300">效果更强，但挑战失败可能静默、禁用道具或退回起点。</p></div></div></div>;
}

function RankingDemo() {
  const rows = [
    ['01', '坐标', '越接近中心越优先'], ['02', '失败次数', '越少越优先'],
    ['03', '平均完成率', '成功挑战的平均值'], ['04', '累计 DX', '越高越优先'],
  ];
  return <div className="min-h-[430px] p-7 md:p-12"><div className="mb-8 flex items-center gap-4"><Timer className="h-12 w-12 text-amber-200"/><div><p className="text-sm font-black text-amber-300">TIME LIMIT</p><p className="text-3xl font-black">超时排序优先级</p></div></div><div>{rows.map(([number, label, detail], index) => <Motion.div key={number} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }} className="grid grid-cols-[60px_1fr] gap-5 border-t border-white/10 py-5 md:grid-cols-[80px_220px_1fr]"><span className="font-mono text-3xl font-black text-zinc-600">{number}</span><span className="text-2xl font-black text-white">{label}</span><span className="text-lg text-zinc-400">{detail}</span></Motion.div>)}</div></div>;
}

function ReadyDemo() {
  return <div className="grid min-h-[430px] content-center gap-5 p-7 md:grid-cols-2 md:p-12">{['确认轮到自己', '行动前看当前位置', '使用前读完道具', '判定交给裁判'].map((label, index) => <Motion.div key={label} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.08 }} className="flex min-h-28 items-center gap-5 border border-emerald-300/25 bg-emerald-500/10 p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center bg-emerald-300 text-black"><Check className="h-7 w-7"/></span><span className="text-2xl font-black">{label}</span></Motion.div>)}</div>;
}

function StepVisual({ step }) {
  if (step.key === 'goal' || step.key === 'maps') return <MapDemo square={step.key === 'maps'} />;
  if (step.key === 'turn') return <TurnDemo />;
  if (step.key === 'wall') return <WallDemo />;
  if (step.key === 'item') return <ItemDemo />;
  if (step.key === 'ranking') return <RankingDemo />;
  return <ReadyDemo />;
}

function ItemCatalog({ pool, setPool }) {
  const items = useMemo(() => Object.values(pool === 'stage2' ? ITEMS_WALLS : ITEMS_SIGH), [pool]);
  return <div><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black text-cyan-300">ITEM DATABASE</p><h2 className="mt-2 text-4xl font-black md:text-6xl">道具图鉴</h2></div><div className="flex border border-white/10 bg-black/25 p-1"><button onClick={() => setPool('stage2')} className={`px-5 py-3 text-base font-black ${pool === 'stage2' ? 'bg-cyan-300 text-black' : 'text-zinc-400'}`}>6 进 4</button><button onClick={() => setPool('stage3')} className={`px-5 py-3 text-base font-black ${pool === 'stage3' ? 'bg-amber-300 text-black' : 'text-zinc-400'}`}>4 进 2</button></div></div><div className="grid gap-3 lg:grid-cols-2">{items.map(item => <div key={item.ref} className={`border-l-4 bg-white/[0.035] p-5 ${item.type === 'double' ? 'border-red-300' : 'border-cyan-300'}`}><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-sm font-black text-zinc-500">ITEM {String(item.ref).padStart(2, '0')}</p><h3 className="mt-1 text-2xl font-black text-white">{item.name}</h3></div><span className={`shrink-0 border px-3 py-1 text-sm font-black ${item.type === 'double' ? 'border-red-300/35 text-red-200' : 'border-cyan-300/35 text-cyan-200'}`}>{item.type === 'double' ? '双面' : '增益'}</span></div><p className="mt-4 text-lg leading-relaxed text-zinc-300">{item.effect}</p>{item.penalty && <p className="mt-3 border-t border-red-300/15 pt-3 text-base font-bold text-red-200">风险：{item.penalty}</p>}{item.probability && <p className="mt-2 text-sm text-amber-200">触发概率 {Math.round(item.probability * 100)}%</p>}</div>)}</div></div>;
}

function ChallengeCatalog() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-7">
        <div>
          <p className="text-sm font-black text-cyan-300">CHALLENGE TYPES</p>
          <h2 className="mt-2 text-4xl font-black md:text-6xl">挑战图鉴</h2>
        </div>
        <p className="max-w-2xl border-l-4 border-amber-300 bg-amber-500/[0.06] px-5 py-4 text-base font-bold leading-relaxed text-amber-100 md:text-lg">
          以下示例仅用于解释判定方式，不代表本场挑战池，也不包含实际曲目、难度或目标数值。
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {CHALLENGE_CATALOG.map((challenge, index) => (
          <article key={challenge.code} className={`border-l-4 p-6 md:p-7 ${challenge.color}`}>
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-sm font-black opacity-65">TYPE {String(index + 1).padStart(2, '0')} / {challenge.code}</p>
                <h3 className="mt-2 text-3xl font-black text-white md:text-4xl">{challenge.name}</h3>
              </div>
              <span className="font-mono text-5xl font-black opacity-25 md:text-6xl">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <p className="mt-6 text-xl font-bold leading-relaxed text-zinc-100">{challenge.basis}</p>
            <p className="mt-5 border-t border-white/10 pt-5 text-lg leading-relaxed text-zinc-300">{challenge.example}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function RaceTutorialPage() {
  const [mode, setMode] = useState('guide');
  const [stepIndex, setStepIndex] = useState(0);
  const [itemPool, setItemPool] = useState('stage2');
  const reduceMotion = useReducedMotion();
  const step = STEPS[stepIndex];

  return (
    <div className="mx-auto max-w-[1700px] pb-10">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center bg-cyan-300 text-black sm:h-14 sm:w-14"><BookOpen className="h-6 w-6 sm:h-7 sm:w-7"/></span><div className="min-w-0"><p className="text-xs font-black text-cyan-300 sm:text-sm">MSC 2026 / RACE PRIMER</p><h1 className="text-3xl font-black md:text-5xl">了解跑图</h1></div></div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center"><button onClick={() => setMode('guide')} className={`flex items-center justify-center gap-2 px-3 py-3 font-black sm:px-4 ${mode === 'guide' ? 'bg-white text-black' : 'border border-white/15 text-zinc-300'}`}><CircleDot className="h-5 w-5"/>分步教程</button><button onClick={() => setMode('challenges')} className={`flex items-center justify-center gap-2 px-3 py-3 font-black sm:px-4 ${mode === 'challenges' ? 'bg-white text-black' : 'border border-white/15 text-zinc-300'}`}><ShieldAlert className="h-5 w-5"/>挑战图鉴</button><button onClick={() => setMode('items')} className={`flex items-center justify-center gap-2 px-3 py-3 font-black sm:px-4 ${mode === 'items' ? 'bg-white text-black' : 'border border-white/15 text-zinc-300'}`}><List className="h-5 w-5"/>道具列表</button><Link to="/matches/msc2026" className="flex items-center justify-center gap-2 px-4 py-3 text-zinc-400 hover:text-white"><X className="h-5 w-5"/>跳过</Link></div>
      </header>

      {mode === 'items' ? <ItemCatalog pool={itemPool} setPool={setItemPool} /> : mode === 'challenges' ? <ChallengeCatalog /> : <>
        <nav className="mb-6 grid grid-cols-7 gap-1" aria-label="教程步骤">{STEPS.map((item, index) => <button key={item.key} onClick={() => setStepIndex(index)} aria-label={`第 ${index + 1} 步：${item.title}`} className={`h-2 transition-colors ${index === stepIndex ? 'bg-cyan-300' : index < stepIndex ? 'bg-emerald-400/65' : 'bg-white/10'}`}/>)}</nav>
        <div className="grid gap-7 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="flex flex-col border-t-4 border-cyan-300 bg-white/[0.035] p-7 md:p-9">
            <p className="text-sm font-black text-cyan-300">{step.eyebrow}</p><h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">{step.title}</h2><p className="mt-6 text-xl leading-relaxed text-zinc-300">{step.body}</p><div className="mt-8 space-y-4">{step.points.map((point, index) => <div key={point} className="flex gap-4 border-t border-white/10 pt-4"><span className="font-mono text-lg font-black text-cyan-300">0{index + 1}</span><p className="text-lg font-bold text-zinc-200">{point}</p></div>)}</div><div className="mt-auto flex items-center justify-between gap-3 pt-10"><button onClick={() => setStepIndex(index => Math.max(0, index - 1))} disabled={stepIndex === 0} className="flex h-12 w-12 items-center justify-center border border-white/15 text-zinc-200 disabled:opacity-25" title="上一步"><ArrowLeft className="h-5 w-5"/></button><button onClick={() => setStepIndex(0)} className="flex items-center gap-2 px-3 py-3 text-zinc-400 hover:text-white"><RotateCcw className="h-4 w-4"/>重来</button>{stepIndex < STEPS.length - 1 ? <button onClick={() => setStepIndex(index => index + 1)} className="flex items-center gap-2 bg-cyan-300 px-5 py-3 text-lg font-black text-black">下一步<ArrowRight className="h-5 w-5"/></button> : <Link to="/matches/msc2026" className="flex items-center gap-2 bg-emerald-300 px-5 py-3 text-lg font-black text-black">完成<Trophy className="h-5 w-5"/></Link>}</div>
          </section>
          <section className="relative overflow-hidden border border-white/10 bg-[#070a10] shadow-[0_0_0_3px_rgba(103,232,249,0.08)]"><div className="absolute left-4 top-4 z-20 flex items-center gap-2 bg-cyan-300 px-3 py-2 text-sm font-black text-black"><Flag className="h-4 w-4"/>当前高亮</div><AnimatePresence mode="wait"><Motion.div key={step.key} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }} transition={{ duration: 0.18, ease: EASE_ACCEL }}><StepVisual step={step}/></Motion.div></AnimatePresence><div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-sm font-bold text-zinc-500"><span>点击上方进度条可跳转任一步</span><button onClick={() => setMode('items')} className="flex items-center gap-1 text-cyan-200">查看道具图鉴<ChevronRight className="h-4 w-4"/></button></div></section>
        </div>
      </>}
    </div>
  );
}
