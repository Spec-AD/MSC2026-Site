import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMusic } from 'react-icons/fa';

// ==========================================
// 🎨 舞萌 / CHUNITHM 曲目详情抽屉
// ==========================================
export default function SongDrawer({ isOpen, onClose, song, activeGame }) {
  const [selectedDiff, setSelectedDiff] = useState(null);

  const MAIMAI_DIFF_CONFIG = [
    { label: 'BASIC',     color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
    { label: 'ADVANCED',  color: 'text-amber-400',   activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
    { label: 'EXPERT',    color: 'text-rose-400',    activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
    { label: 'MASTER',    color: 'text-purple-400',  activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
    { label: 'Re:MASTER', color: 'text-zinc-300',    activeBg: 'bg-zinc-500/20 border-zinc-400/40 text-zinc-100' },
  ];

  const CHUNI_DIFF_CONFIG = [
    { label: 'BASIC',        color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
    { label: 'ADVANCED',     color: 'text-amber-400',   activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
    { label: 'EXPERT',       color: 'text-rose-400',    activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
    { label: 'MASTER',       color: 'text-purple-400',  activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
    { label: 'ULTIMA',       color: 'text-red-500',     activeBg: 'bg-red-500/20 border-red-500/40 text-red-400' },
    { label: "WORLD'S END",  color: 'text-zinc-300',    activeBg: 'bg-white/10 border-white/30 text-white' },
  ];

  const diffConfig = activeGame === 'chunithm' ? CHUNI_DIFF_CONFIG : MAIMAI_DIFF_CONFIG;

  useEffect(() => {
    if (!song) return;
    const maxIdx = activeGame === 'chunithm' ? 5 : 4;
    for (let i = maxIdx; i >= 0; i--) {
      if (song.ds?.[i] !== undefined && song.ds?.[i] !== null) {
        setSelectedDiff(i);
        return;
      }
    }
    setSelectedDiff(0);
  }, [song, activeGame]);

  const coverUrl = useMemo(() => {
    if (!song) return null;
    if (activeGame === 'maimai') return `/assets/maimai/jacket/${song.id}.png`;
    if (activeGame === 'chunithm') return `/assets/chunithm/jacket/${song.id}.jpg`;
    return null;
  }, [song, activeGame]);

  const [coverError, setCoverError] = useState(false);
  useEffect(() => { setCoverError(false); }, [song]);

  if (!song) return null;

  const displayTitle = song.title || song.basic_info?.title || '未知曲目';
  const displayArtist = song.basic_info?.artist || '未知曲师';
  const displayBpm = song.basic_info?.bpm || '-';
  const displayGenre = song.basic_info?.genre || '-';
  const displayFrom = song.basic_info?.from || '-';
  const isNew = song.basic_info?.is_new;
  const isUtage = song.type === 'UTAGE';
  const currentDs = selectedDiff !== null ? song.ds?.[selectedDiff] : null;
  const currentLevel = selectedDiff !== null ? song.level?.[selectedDiff] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#111118] border-l border-white/[0.06] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] shrink-0 bg-[#0c0c11]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <FaMusic className="text-zinc-500 text-sm" />
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Song Detail</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              <div className="flex gap-5 items-start">
                <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-[#1a1a24] border border-white/[0.06] shadow-xl">
                  {coverUrl && !coverError ? (
                    <img src={coverUrl} alt="cover" loading="lazy" className="w-full h-full object-cover" onError={() => setCoverError(true)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700"><FaMusic className="text-2xl" /></div>
                  )}
                </div>
                <div className="flex flex-col min-w-0 gap-1.5 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeGame === 'maimai' && song.type && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                        song.type === 'DX' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                        isUtage ? 'text-pink-400 border-pink-500/30 bg-pink-500/10' :
                        'text-orange-400 border-orange-500/30 bg-orange-500/10'
                      }`}>{isUtage ? 'UTAGE' : song.type}</span>
                    )}
                    {isNew && <span className="text-[10px] font-black px-1.5 py-0.5 rounded border text-rose-400 border-rose-500/30 bg-rose-500/10">NEW</span>}
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>{displayTitle}</h2>
                  <p className="text-sm text-zinc-400 truncate">{displayArtist}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'BPM', value: displayBpm }, { label: 'Genre', value: displayGenre }, { label: 'Version', value: displayFrom }, { label: 'ID', value: song.id }].map(({ label, value }) => (
                  <div key={label} className="bg-[#1a1a24] rounded-xl p-3 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-sm font-bold text-zinc-200 truncate" style={{ fontFamily: "'Quicksand', sans-serif" }}>{value ?? '-'}</div>
                  </div>
                ))}
              </div>

              {!isUtage && (
                <div className="space-y-3">
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Difficulties</div>
                  <div className="space-y-2">
                    {diffConfig.map((diff, idx) => {
                      const ds = song.ds?.[idx];
                      const lv = song.level?.[idx];
                      if (ds === undefined || ds === null) return null;
                      const isSelected = selectedDiff === idx;
                      return (
                        <div key={idx} onClick={() => setSelectedDiff(idx)} className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? diff.activeBg : 'bg-[#1a1a24] border-white/[0.04] hover:border-white/10 opacity-70 hover:opacity-100'}`}>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-black ${isSelected ? '' : diff.color}`}>{diff.label}</span>
                            {lv && <span className="text-xs text-zinc-500 font-mono">Lv.{lv}</span>}
                          </div>
                          <span className="font-mono font-bold text-base text-white" style={{ fontFamily: "'Quicksand', sans-serif" }}>{isUtage ? 'UTAGE' : ds === 0 ? '-' : ds.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeGame === 'maimai' && selectedDiff !== null && song.radarStats?.[selectedDiff] && (
                <div className="space-y-3">
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Radar Stats</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(song.radarStats[selectedDiff]).map(([key, val]) => (
                      <div key={key} className="bg-[#1a1a24] rounded-xl p-3 border border-white/[0.04]">
                        <div className="text-[10px] text-zinc-600 font-bold capitalize mb-1">{key}</div>
                        <div className="text-sm font-bold text-zinc-200" style={{ fontFamily: "'Quicksand', sans-serif" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
