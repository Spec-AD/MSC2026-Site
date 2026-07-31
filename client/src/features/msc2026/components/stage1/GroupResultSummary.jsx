import { ArrowRight, Crown, Flag, Trophy } from 'lucide-react';

const number = new Intl.NumberFormat('zh-CN');

function totals(songs, key) {
  return (songs || []).reduce((sum, song) => ({
    achievement: sum.achievement + Number(song?.[key]?.achievement || 0),
    dxScore: sum.dxScore + Number(song?.[key]?.dxScore || 0),
    perfectBreak: sum.perfectBreak + Number(song?.[key]?.perfectBreak || 0),
  }), { achievement: 0, dxScore: 0, perfectBreak: 0 });
}

function ScoreCell({ score, winner }) {
  return (
    <div className={`min-w-0 border px-3 py-3 ${winner ? 'border-amber-300/40 bg-amber-300/10' : 'border-white/10 bg-black/20'}`}>
      <p className={`text-xl font-black tabular-nums ${winner ? 'text-amber-100' : 'text-white'}`}>{score ? `${Number(score.achievement).toFixed(4)}%` : '—'}</p>
      <p className="mt-1 text-xs text-zinc-500">DX {score ? number.format(score.dxScore) : '—'} · BREAK {score ? number.format(score.perfectBreak || 0) : '—'}</p>
    </div>
  );
}

export default function GroupResultSummary({ group, isCurrent, isLastGroup, canControl, pending, error, onContinue }) {
  const p1Id = group.p1?.userId || group.p1?._id;
  const p2Id = group.p2?.userId || group.p2?._id;
  const winnerId = String(group.winner || '');
  const p1Won = winnerId === String(p1Id);
  const p2Won = winnerId === String(p2Id);
  const p1Totals = totals(group.songs, 'p1Score');
  const p2Totals = totals(group.songs, 'p2Score');

  return (
    <section className="relative overflow-hidden border border-amber-300/30 bg-[#0c0b08] p-5 md:p-8">
      <span className="msc-display pointer-events-none absolute -bottom-12 right-0 text-[10rem] font-black text-white/[0.035] md:text-[16rem]">END</span>
      <div className="relative z-10">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-6">
          <div><p className="msc-kicker text-amber-200">GROUP {String(group.order + 1).padStart(2, '0')} / MATCH COMPLETE</p><h3 className="mt-2 text-4xl font-black text-white md:text-6xl">本组战况总结</h3></div>
          {group.winner && <div className="flex items-center gap-3 border border-amber-300/30 bg-amber-300/10 px-5 py-3"><Crown className="h-7 w-7 text-amber-300" /><div><p className="text-xs font-black text-amber-200/65">GROUP WINNER</p><p className="text-2xl font-black text-amber-100">{p1Won ? group.p1?.username : group.p2?.username}</p></div></div>}
        </header>

        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[720px] space-y-2">
            <div className="grid grid-cols-[minmax(180px,1.1fr)_minmax(220px,1fr)_minmax(220px,1fr)] gap-2 px-3 text-xs font-black text-zinc-600"><span>TRACK</span><span>{group.p1?.username}</span><span>{group.p2?.username}</span></div>
            {(group.songs || []).map((song, index) => {
              const a = Number(song.p1Score?.achievement || 0);
              const b = Number(song.p2Score?.achievement || 0);
              return <div key={song.songId || index} className="grid grid-cols-[minmax(180px,1.1fr)_minmax(220px,1fr)_minmax(220px,1fr)] gap-2"><div className="border border-white/10 bg-white/[0.035] px-4 py-3"><p className="text-xs font-black text-zinc-600">TRACK {String(index + 1).padStart(2, '0')}</p><p className="mt-1 truncate text-lg font-black text-white">{song.song?.title || `曲目 ${index + 1}`}</p></div><ScoreCell score={song.p1Score} winner={a > b} /><ScoreCell score={song.p2Score} winner={b > a} /></div>;
            })}
            <div className="grid grid-cols-[minmax(180px,1.1fr)_minmax(220px,1fr)_minmax(220px,1fr)] gap-2 border-t border-white/15 pt-3"><div className="flex items-center gap-2 px-4 text-lg font-black text-zinc-300"><Trophy className="h-5 w-5 text-amber-300" />三曲合计</div><ScoreCell score={p1Totals} winner={p1Won} /><ScoreCell score={p2Totals} winner={p2Won} /></div>
          </div>
        </div>

        {isCurrent && group.winner && <div className="mt-7 border-t border-white/10 pt-6"><p className="text-zinc-400">比赛不会自动进入下一组。确认现场、设备与选手均已准备完毕后再继续。</p>{error && <p className="mt-3 font-bold text-red-200">{error}</p>}{canControl ? <button disabled={pending} onClick={onContinue} className="mt-4 inline-flex min-h-14 items-center gap-3 bg-amber-300 px-6 text-lg font-black text-black disabled:opacity-40">{isLastGroup ? <Flag className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}{pending ? '正在推进...' : isLastGroup ? '确认结束 12进6' : '确认开始下一组抽签'}</button> : <p className="mt-4 inline-flex border border-white/10 bg-white/[0.04] px-4 py-3 font-black text-zinc-400">等待主办方开始下一组</p>}</div>}
      </div>
    </section>
  );
}
