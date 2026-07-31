import { useEffect, useState } from 'react';
import { Crown, Medal, Sparkles, Trophy } from 'lucide-react';
import * as api from '../../api/msc2026Api';

const PLACE = {
  1: { label: '优胜', en: 'CHAMPION', color: 'border-amber-300 bg-amber-300/10 text-amber-100', height: 'md:min-h-[27rem]', icon: Crown },
  2: { label: '准优胜', en: 'RUNNER-UP', color: 'border-slate-200/35 bg-slate-200/[0.07] text-slate-100', height: 'md:min-h-[22rem]', icon: Medal },
  3: { label: '季军', en: 'THIRD PLACE', color: 'border-orange-300/30 bg-orange-300/[0.07] text-orange-100', height: 'md:min-h-[19rem]', icon: Medal },
  4: { label: '殿军', en: 'FOURTH PLACE', color: 'border-cyan-300/20 bg-cyan-300/[0.04] text-cyan-100', height: 'md:min-h-[16rem]', icon: Trophy },
};

export default function TournamentPodium({ live = false }) {
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    api.getResults().then(response => setPlacements(response.data.data?.placements || [])).catch(() => {});
  }, []);

  if (!placements.length) return null;
  const ordered = [2, 1, 3, 4].map(place => placements.find(item => item.place === place)).filter(Boolean);

  return (
    <section className={`relative overflow-hidden border-y border-white/10 bg-[#07090c] ${live ? 'min-h-[calc(100dvh-76px)] px-5 py-8 md:px-10 md:py-10' : 'px-5 py-8 md:px-9'}`}>
      <span className="msc-display pointer-events-none absolute -right-10 -top-16 text-[18rem] font-black leading-none text-white/[0.025] md:text-[32rem]">26</span>
      <div className="relative z-10 mx-auto max-w-[1700px]">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6">
          <div><div className="flex items-center gap-2 text-amber-200"><Sparkles className="h-5 w-5" /><p className="msc-kicker">MSC 2026 / FINAL CLASSIFICATION</p></div><h1 className={`msc-editorial-heading mt-3 text-white ${live ? 'text-5xl md:text-8xl' : 'text-5xl md:text-7xl'}`}>最终名次</h1></div>
          <p className="font-mono text-sm font-black text-zinc-600">MATCH COMPLETE / OFFICIAL RESULT</p>
        </header>

        <div className="mt-7 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ordered.map(player => {
            const config = PLACE[player.place];
            const Icon = config.icon;
            return (
              <article key={player.userId} className={`relative flex min-h-64 flex-col justify-end overflow-hidden border p-5 md:p-6 ${config.color} ${config.height} ${player.place === 1 ? 'xl:-translate-y-5 shadow-[0_0_70px_rgba(252,211,77,0.12)]' : ''}`}>
                <span className="msc-display absolute -right-2 -top-8 text-[10rem] font-black text-white/[0.055]">0{player.place}</span>
                {player.avatarUrl && <img src={player.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 grayscale" />}
                <div className="relative z-10"><Icon className={`h-8 w-8 ${player.place === 1 ? 'text-amber-300' : 'text-current opacity-70'}`} /><p className="mt-5 text-xs font-black tracking-[0.14em] opacity-55">{config.en}</p><h2 className="mt-1 text-3xl font-black md:text-4xl">{config.label}</h2><p className="mt-4 break-words text-3xl font-black text-white md:text-5xl">{player.username}</p></div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
