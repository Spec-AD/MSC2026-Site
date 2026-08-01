import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, BarChart3, Check, ChevronDown, Crown,
  Gauge, LockKeyhole, Medal, Sparkles, Swords, Trophy, X
} from 'lucide-react';
import { getArchive } from '../api/msc2026Api';
import { getSongCover } from '../utils/songPresentation';

const PICK_LABELS = {
  p1_pick: 'P1 选曲', p2_pick: 'P2 选曲', random: '系统随机',
  designated: '表课题曲', secret_designated: '里课题曲'
};

const pct = value => value == null ? '—' : `${Number(value).toFixed(4)}%`;
const integer = value => value == null ? '—' : Number(value).toLocaleString('zh-CN');

function Player({ player, compact = false }) {
  if (!player) return <span className="text-zinc-600">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <img src={player.avatarUrl || '/assets/logos.png'} alt="" className={`${compact ? 'h-7 w-7' : 'h-9 w-9'} shrink-0 rounded-full border border-white/15 object-cover`} />
      <span className="truncate font-black text-zinc-100">{player.username}</span>
    </span>
  );
}

function Metric({ label, value, accent = false, note, tone = '' }) {
  const toneClass = tone === 'gold' ? 'text-amber-200' : tone === 'cyan' ? 'text-cyan-200' : accent ? 'text-amber-200' : 'text-zinc-100';
  return (
    <div className="border-l border-white/15 pl-3">
      <p className="msc-technical text-[10px] font-black uppercase text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-black tabular-nums ${toneClass}`}>{value}</p>
      {note && <p className="mt-1 text-[10px] text-zinc-600">{note}</p>}
    </div>
  );
}

function ScoreTriplet({ score, unavailableBreak = false }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-right">
      <span className="font-black tabular-nums text-zinc-100">{pct(score?.achievement)}</span>
      <span className="font-black tabular-nums text-sky-200">{integer(score?.dxScore)}</span>
      <span className="font-black tabular-nums text-amber-200" title={unavailableBreak ? '现场系统未记录跑图完美 BREAK' : undefined}>
        {unavailableBreak ? '未记录' : integer(score?.perfectBreak)}
      </span>
    </div>
  );
}

function TableHeader({ first = '曲目' }) {
  return (
    <div className="grid min-w-[760px] grid-cols-[minmax(220px,1fr)_180px_180px] gap-4 border-b border-white/10 px-4 py-3 msc-technical text-[10px] font-black uppercase text-zinc-500">
      <span>{first}</span>
      <span className="grid grid-cols-3 gap-2 text-right"><span>完成率</span><span>DX 分</span><span>PF BREAK</span></span>
      <span className="grid grid-cols-3 gap-2 text-right"><span>完成率</span><span>DX 分</span><span>PF BREAK</span></span>
    </div>
  );
}

function SongRows({ songs, p1, p2 }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[minmax(220px,1fr)_180px_180px] gap-4 border-b border-white/15 bg-white/[0.025] px-4 py-3 text-sm">
          <span />
          <Player player={p1} compact />
          <Player player={p2} compact />
        </div>
        <TableHeader />
        {songs.map(song => (
          <div key={`${song.order}-${song.song?.songId}`} className="grid grid-cols-[minmax(220px,1fr)_180px_180px] items-center gap-4 border-b border-white/[0.07] px-4 py-3 text-sm last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              {song.song && <img src={getSongCover({ id: song.song.catalogId })} alt="" className="h-11 w-11 shrink-0 object-cover" loading="lazy" />}
              <div className="min-w-0">
                <p className="truncate font-black text-zinc-100">{song.song?.title || '未知曲目'}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{PICK_LABELS[song.pickType] || song.pickType} · {song.song?.difficultyName} {song.song?.level || ''}</p>
              </div>
            </div>
            <ScoreTriplet score={song.p1Score} />
            <ScoreTriplet score={song.p2Score} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AggregateFace({ player, totals, side = 'left' }) {
  const total = totals?.totalAchievement == null ? '—' : Number(totals.totalAchievement).toFixed(4);
  return (
    <div className={`relative min-h-36 overflow-hidden border border-white/10 bg-black/20 p-5 ${side === 'right' ? 'text-right' : ''}`}>
      <span className={`msc-display pointer-events-none absolute -bottom-3 text-[4.4rem] font-black leading-none text-white/[0.11] md:text-[5.6rem] ${side === 'right' ? '-left-2' : '-right-2'}`}>{total}</span>
      <div className={`relative flex ${side === 'right' ? 'justify-end' : ''}`}><Player player={player} compact /></div>
      <p className="msc-technical relative mt-5 text-[10px] font-black uppercase text-zinc-500">完成率总和</p>
      <p className="msc-display relative mt-1 text-3xl font-black text-white tabular-nums md:text-5xl">{total}<span className="ml-1 text-base text-zinc-500">%</span></p>
      <p className="relative mt-3 text-sm font-black text-sky-200">DX 总分 {integer(totals?.totalDxScore)} <span className="ml-2 text-amber-200">PF BREAK {integer(totals?.perfectBreak)}</span></p>
    </div>
  );
}

function Stage1({ stage }) {
  return (
    <section id="stage1" className="scroll-mt-32 space-y-4">
      <SectionTitle index="01" eyebrow="TWELVE TO SIX" title="12 进 6 · 六组逐曲战报" description="每组完成三首曲目，先比较三曲完成率总和，再比较 DX 分与完美 BREAK。" />
      {stage.groups.map(group => (
        <article key={group.group} className="msc-panel overflow-hidden">
          <div className="grid gap-4 border-b border-white/10 p-5 md:grid-cols-[90px_1fr_auto] md:items-center">
            <div><p className="msc-technical text-xs text-zinc-500">GROUP</p><p className="msc-display text-5xl font-black text-zinc-200">{String(group.group).padStart(2, '0')}</p></div>
            <div className="flex flex-wrap items-center gap-3 text-lg"><Player player={group.p1} /><Swords className="h-4 w-4 text-zinc-600" /><Player player={group.p2} /></div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-emerald-300"><Check className="h-4 w-4" />晋级 <Player player={group.winner} compact /></div>
          </div>
          <div className="grid gap-px bg-white/10 md:grid-cols-2">
            <AggregateFace player={group.p1} totals={group.p1Totals} />
            <AggregateFace player={group.p2} totals={group.p2Totals} side="right" />
          </div>
          <SongRows songs={group.songs} p1={group.p1} p2={group.p2} />
        </article>
      ))}
    </section>
  );
}

function RaceStage({ stage, index }) {
  return (
    <section id={stage.key} className="scroll-mt-32 space-y-4">
      <SectionTitle index={index} eyebrow={stage.key === 'stage2' ? 'SIX TO FOUR' : 'FOUR TO TWO'} title={`${stage.label} · ${stage.format}`} description="排名依次比较到达终点、推进层数、失败次数、成功挑战平均完成率与累计 DX 分。" />
      <div className="msc-panel overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[64px_minmax(190px,1fr)_90px_90px_120px_120px_110px] gap-3 border-b border-white/10 px-5 py-3 msc-technical text-[10px] font-black uppercase text-zinc-500">
              <span>排名</span><span>选手</span><span>尝试</span><span>通过</span><span>平均完成率</span><span>DX 分</span><span>PF BREAK</span>
            </div>
            {stage.rankings.map(entry => (
              <div key={entry.player.userId} className={`grid grid-cols-[64px_minmax(190px,1fr)_90px_90px_120px_120px_110px] items-center gap-3 border-b border-white/[0.07] px-5 py-4 last:border-b-0 ${entry.qualified ? 'bg-emerald-300/[0.035]' : ''}`}>
                <span className="msc-display text-2xl font-black text-zinc-300">{String(entry.rank).padStart(2, '0')}</span>
                <div><Player player={entry.player} />{entry.qualified && <p className="ml-11 mt-1 text-xs font-black text-emerald-300">晋级</p>}</div>
                <span className="font-black tabular-nums">{entry.attempts}</span>
                <span className="font-black tabular-nums text-emerald-300">{entry.clears}</span>
                <span className="font-black tabular-nums">{pct(entry.averageAchievement)}</span>
                <span className="font-black tabular-nums text-sky-200">{integer(entry.totalDxScore)}</span>
                <span className="text-xs font-black text-zinc-500">未记录</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {stage.rankings.filter(entry => entry.challenges.length).map(entry => (
          <details key={entry.player.userId} className="msc-panel group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <Player player={entry.player} /><span className="flex items-center gap-2 text-xs font-black text-zinc-500">{entry.challenges.length} 次挑战 <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
            </summary>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              {entry.challenges.map((challenge, challengeIndex) => (
                <div key={`${challenge.taskName}-${challengeIndex}`} className="grid grid-cols-[24px_1fr_auto] gap-3 border-b border-white/[0.06] py-3 last:border-0">
                  {challenge.passed ? <Check className="h-4 w-4 text-emerald-300" /> : <X className="h-4 w-4 text-rose-300" />}
                  <div><p className="font-bold text-zinc-200">{challenge.taskName}</p><p className="text-xs text-zinc-500">{challenge.songTitle || `第 ${challenge.wallIndex + 1} 道墙`}{challenge.itemEffects.length ? ` · ${challenge.itemEffects.join('；')}` : ''}</p></div>
                  <div className="text-right text-xs tabular-nums"><p>{pct(challenge.achievement)}</p><p className="text-sky-200">DX {integer(challenge.dxScore)}</p></div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="space-y-1 text-xs text-zinc-500">
        {stage.key === 'stage2' && <p>数据说明：由于现场记录故障，本阶段仅统计系统修复后留存的对局数据。</p>}
        {stage.key === 'stage2' && <p>席位记录：7XDawn 完成 6进4 后退出后续赛程，4进2 起由 CTSs2317 接替席位。</p>}
        <p className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />跑图录入未保存完美 BREAK 原值，本页以“未记录”展示。</p>
      </div>
    </section>
  );
}

function FinalStage({ stage }) {
  return (
    <section id="stage4" className="scroll-mt-32 space-y-4">
      <SectionTitle index="04" eyebrow="GRAND FINAL" title="决赛 · 五曲终局" description="双方选曲、系统随机、表课题曲与里课题曲组成最终五曲；完成率总和决定冠军。" />
      <article className="msc-panel overflow-hidden">
        <div className="grid gap-5 border-b border-white/10 p-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="md:text-right"><Player player={stage.p1} /></div>
          <div className="text-center"><Crown className="mx-auto h-7 w-7 text-amber-200" /><p className="mt-2 text-xs font-black text-zinc-500">WINNER</p><p className="text-xl font-black text-amber-100">{stage.winner.username}</p></div>
          <Player player={stage.p2} />
        </div>
        <div className="grid gap-px bg-white/10 md:grid-cols-2">
          <AggregateFace player={stage.p1} totals={stage.p1Totals} />
          <AggregateFace player={stage.p2} totals={stage.p2Totals} side="right" />
        </div>
        <SongRows songs={stage.songs} p1={stage.p1} p2={stage.p2} />
      </article>
    </section>
  );
}

function SectionTitle({ index, eyebrow, title, description }) {
  return (
    <div className="msc-index-strip">
      <div className="msc-crosshair flex items-end"><span className="msc-display text-3xl font-black text-zinc-500">{index}</span></div>
      <div><p className="msc-kicker">{eyebrow}</p><h2 className="mt-2 text-3xl font-black text-white md:text-5xl">{title}</h2><p className="mt-2 max-w-4xl text-zinc-400">{description}</p></div>
      <div className="msc-barcode self-center" />
    </div>
  );
}

function HighlightCard({ icon, label, performance, metric }) {
  if (!performance) return null;
  return (
    <div className="msc-panel p-5">
      {icon}
      <p className="msc-kicker mt-6">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{metric}</p>
      <p className="mt-3"><Player player={performance.player} compact /></p>
      <p className="mt-2 truncate text-sm text-zinc-500">{performance.song?.title} · {performance.stage}</p>
    </div>
  );
}

function PlayerArchives({ players }) {
  return (
    <section id="players" className="scroll-mt-32 space-y-4">
      <SectionTitle index="06" eyebrow="PLAYER DOSSIERS" title="选手赛事数据档案" description="只汇总本届赛事的逐曲与跑图数据；随机路线与道具会影响晋级结果，不据此评价选手实力。" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {players.map((entry, index) => (
          <article key={entry.player.userId} className={`msc-panel relative overflow-hidden border-t-2 p-5 ${entry.averageAchievement >= 100.7 ? 'border-t-amber-300' : entry.averageAchievement >= 100.4 ? 'border-t-cyan-300' : 'border-t-white/15'}`}>
            <span className="msc-display absolute -bottom-5 right-2 text-8xl font-black text-white/[0.045]">{entry.finalRank ? String(entry.finalRank).padStart(2, '0') : '—'}</span>
            <div className="relative flex items-start justify-between gap-3"><Player player={entry.player} />{entry.finalRank && <span className="border border-white/15 px-2 py-1 font-black text-zinc-300">#{entry.finalRank}</span>}</div>
            <p className="relative mt-4 text-xs text-zinc-500">{entry.stages.join(' → ')}{entry.finalRank ? ` · 最终第 ${entry.finalRank} 名` : ''}</p>
            <div className="relative mt-5 grid grid-cols-2 gap-4">
              <Metric label="平均完成率" value={pct(entry.averageAchievement)} tone={entry.averageAchievement >= 100.7 ? 'gold' : entry.averageAchievement >= 100.4 ? 'cyan' : ''} />
              <Metric label="累计 DX 分" value={integer(entry.totalDxScore)} />
              <Metric label="完美 BREAK" value={integer(entry.perfectBreak)} />
              <Metric label="跑图通过" value={`${entry.raceClears} / ${entry.raceAttempts}`} />
            </div>
            {entry.contextNote && <p className="relative mt-5 border-t border-white/10 pt-3 text-xs leading-relaxed text-zinc-400">{entry.contextNote}</p>}
            <span className="msc-technical absolute left-2 top-2 text-[9px] text-zinc-700">DOSSIER {String(index + 1).padStart(2, '0')}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Standings({ standings }) {
  return (
    <section id="standings" className="scroll-mt-32 space-y-4">
      <SectionTitle index="05" eyebrow="OFFICIAL STANDINGS" title="选手最终排名" description="依照各阶段晋级结果公示；同阶段未晋级选手按该阶段的有效成绩排序。" />
      <div className="msc-panel overflow-hidden">
        <div className="grid grid-cols-[70px_minmax(160px,1fr)_minmax(120px,0.7fr)] gap-4 border-b border-white/10 px-5 py-3 msc-technical text-[10px] font-black uppercase text-zinc-500 md:grid-cols-[90px_minmax(220px,1fr)_180px_180px]">
          <span>排名</span><span>选手</span><span>赛事结果</span><span className="hidden md:block">阶段</span>
        </div>
        {standings.map(entry => (
          <div key={`${entry.rank}-${entry.player.userId}`} className={`grid grid-cols-[70px_minmax(160px,1fr)_minmax(120px,0.7fr)] items-center gap-4 border-b border-white/[0.07] px-5 py-4 last:border-0 md:grid-cols-[90px_minmax(220px,1fr)_180px_180px] ${entry.rank <= 3 ? 'bg-amber-200/[0.035]' : ''}`}>
            <span className={`msc-display text-3xl font-black ${entry.rank === 1 ? 'text-amber-200' : entry.rank <= 3 ? 'text-zinc-200' : 'text-zinc-500'}`}>{String(entry.rank).padStart(2, '0')}</span>
            <Player player={entry.player} />
            <span className="text-sm font-black text-zinc-300">{entry.resultLabel}</span>
            <span className="hidden text-sm text-zinc-500 md:block">{entry.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MSC2026ArchivePage() {
  const [archive, setArchive] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getArchive().then(response => setArchive(response.data.data)).catch(err => setError(err.response?.data?.msg || '赛事档案加载失败'));
  }, []);

  const nav = useMemo(() => [
    ['stage1', '12进6'], ['stage2', '6进4'], ['stage3', '4进2'], ['stage4', '决赛'], ['standings', '最终排名'], ['players', '选手档案']
  ], []);

  if (error) return <div className="msc-panel mx-auto max-w-2xl p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-rose-300" /><p className="mt-4 text-xl font-black">{error}</p></div>;
  if (!archive) return <div className="min-h-[60vh] animate-pulse"><div className="h-72 border border-white/10 bg-white/[0.03]" /><div className="mt-6 grid grid-cols-4 gap-3">{[0,1,2,3].map(i => <div key={i} className="h-28 bg-white/[0.03]" />)}</div></div>;

  const { stages, highlights } = archive;
  return (
    <div className="space-y-16 pb-20">
      <section className="msc-editorial-hero px-5 py-9 md:px-9 md:py-12">
        <span className="msc-display pointer-events-none absolute -bottom-10 right-[-0.04em] select-none text-[9rem] font-black leading-none text-white/[0.04] md:text-[18rem]">END</span>
        <div className="relative z-10 grid gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-end">
          <div>
            <p className="msc-kicker">MSC 2026 / OFFICIAL FINAL RECORD</p>
            <h1 className="msc-editorial-heading mt-5 text-6xl text-white md:text-[7.4rem]"><span>终局已定，</span><span className="text-zinc-400">数据留存。</span></h1>
            <p className="mt-6 max-w-4xl border-l border-amber-200/40 pl-5 text-lg leading-relaxed text-zinc-300 md:text-xl">
              MSC 2026 已完成全部赛程。本页汇总每一组、每一曲、跑图阶段与最终名次，作为本届赛事的正式公开档案。
            </p>
          </div>
          <div className="grid grid-cols-2 border-y border-white/15">
            <div className="border-r border-white/15 p-5"><p className="msc-display text-5xl font-black">12</p><p className="msc-technical mt-2 text-xs text-zinc-500">MAIN EVENT</p></div>
            <div className="p-5"><p className="msc-display text-5xl font-black text-amber-200">01</p><p className="msc-technical mt-2 text-xs text-zinc-500">CHAMPION</p></div>
            <div className="col-span-2 border-t border-white/15 p-5"><p className="text-sm font-black text-zinc-200">04 个正式阶段 · 完整赛果公开</p><p className="mt-1 text-xs text-zinc-500">12进6 / 6进4 / 4进2 / GRAND FINAL</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-4">
        {archive.placements.map(place => (
          <div key={place.rank} className={`relative overflow-hidden bg-[#090c0f] p-6 ${place.rank === 1 ? 'md:col-span-2' : ''}`}>
            <span className="msc-display absolute -bottom-8 right-1 text-9xl font-black text-white/[0.04]">{place.rank}</span>
            <div className="relative flex items-center justify-between"><p className="msc-kicker">{place.label}</p>{place.rank === 1 ? <Trophy className="h-6 w-6 text-amber-200" /> : <Medal className="h-5 w-5 text-zinc-500" />}</div>
            <div className="relative mt-7"><Player player={place.player} /></div>
          </div>
        ))}
      </section>

      <nav aria-label="赛事战报章节" className="sticky top-[104px] z-30 flex gap-px overflow-x-auto border border-white/10 bg-[#07090b]/95 p-1 backdrop-blur-xl">
        {nav.map(([id, label], index) => <a key={id} href={`#${id}`} className="whitespace-nowrap px-4 py-3 text-sm font-black text-zinc-400 transition hover:bg-white/10 hover:text-white"><span className="mr-2 text-zinc-700">0{index + 1}</span>{label}</a>)}
      </nav>

      <Stage1 stage={stages.stage1} />
      <RaceStage stage={stages.stage2} index="02" />
      <RaceStage stage={stages.stage3} index="03" />
      <FinalStage stage={stages.stage4} />
      <Standings standings={archive.standings} />

      <section className="space-y-4">
        <SectionTitle index="HL" eyebrow="HIGHLIGHTS" title="精度峰值与终局瞬间" description="从全部逐曲成绩中自动提取完成率、DX 分与完美 BREAK 的单曲峰值。" />
        <div className="grid gap-3 md:grid-cols-3">
          <HighlightCard icon={<Gauge className="h-5 w-5 text-amber-200" />} label="最高单曲完成率" performance={highlights.highestAchievement} metric={pct(highlights.highestAchievement?.score?.achievement)} />
          <HighlightCard icon={<BarChart3 className="h-5 w-5 text-amber-200" />} label="最高单曲 DX 分" performance={highlights.highestDxScore} metric={integer(highlights.highestDxScore?.score?.dxScore)} />
          <HighlightCard icon={<Sparkles className="h-5 w-5 text-amber-200" />} label="最多完美 BREAK" performance={highlights.mostPerfectBreak} metric={integer(highlights.mostPerfectBreak?.score?.perfectBreak)} />
        </div>
      </section>

      <PlayerArchives players={archive.players} />

      <footer className="msc-panel grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end">
        <div><div className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-zinc-500" /><p className="font-black text-zinc-200">档案已锁定 · 只读公开</p></div>{archive.dataNotes.map(note => <p key={note} className="mt-2 text-sm text-zinc-500">— {note}</p>)}</div>
        {archive.oldTournamentId && <Link to={`/tournament/${archive.oldTournamentId}`} className="inline-flex items-center justify-center gap-2 border border-sky-200/25 bg-sky-200/[0.06] px-5 py-3 font-black text-sky-100 transition hover:bg-sky-200/10">查看赛事大厅战果 <ArrowUpRight className="h-4 w-4" /></Link>}
      </footer>
    </div>
  );
}
