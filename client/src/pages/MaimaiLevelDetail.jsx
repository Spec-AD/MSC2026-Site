import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

const DIFF_NAMES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
const DIFF_COLORS = [
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'text-zinc-100 bg-zinc-400/10 border-zinc-400/20',
];

const getFc = (s) => (s?.fcStatus || s?.fc || '').toLowerCase();
const getFs = (s) => (s?.fsStatus || s?.fs || '').toLowerCase();

const MaimaiLevelDetail = () => {
  const { username, level } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [musicData, setMusicData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDs, setOpenDs] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, musicRes] = await Promise.all([
          axios.get(`/api/users/${username}`),
          axios.get('/api/songs'),
        ]);
        setProfile(profileRes.data);
        setMusicData(musicRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, level]);

  const userScoreMap = useMemo(() => {
    const map = new Map();
    if (profile?.allScores) {
      profile.allScores.forEach((s) => {
        map.set(`${s.songId}_${s.level}`, s);
        map.set(`${Number(s.songId)}_${s.level}`, s);
      });
    }
    return map;
  }, [profile]);

  const getDxStarIcon = (dxRatio) => {
    if (!dxRatio) return null;
    const pct = dxRatio * 100;
    let stars = 0;
    if (pct >= 97) stars = 5;
    else if (pct >= 95) stars = 4;
    else if (pct >= 93) stars = 3;
    else if (pct >= 90) stars = 2;
    else if (pct >= 85) stars = 1;
    if (stars === 0) return null;
    return (
      <img
        src={`/assets/${stars}dxstar.png`}
        alt={`${stars}★`}
        className="w-4 h-4 object-contain shrink-0"
      />
    );
  };

  const getFcBadge = (score) => {
    const s = getFc(score);
    if (s.includes('ap'))
      return (
        <span className="bg-amber-400 text-amber-950 px-1.5 rounded-sm text-[10px] font-black">
          {s.toUpperCase()}
        </span>
      );
    if (s.includes('fc'))
      return (
        <span className="bg-pink-400 text-pink-950 px-1.5 rounded-sm text-[10px] font-black">
          {s.toUpperCase()}
        </span>
      );
    return null;
  };

  // All charts in this level, grouped by DS
  const dsGroups = useMemo(() => {
    if (!musicData.length) return [];
    const dsMap = new Map();
    musicData.forEach((song) => {
      if (
        song.type === 'UTAGE' ||
        song.basic_info?.genre === '宴会場' ||
        song.basic_info?.genre === '宴会场'
      )
        return;
      song.level.forEach((lvlStr, idx) => {
        if (lvlStr !== level) return;
        const ds = song.ds[idx] || 0;
        const key = ds.toFixed(1);
        if (!dsMap.has(key)) dsMap.set(key, { ds: parseFloat(key), charts: [] });
        const score =
          userScoreMap.get(`${song.id}_${idx}`) ||
          userScoreMap.get(`${Number(song.id)}_${idx}`);
        dsMap.get(key).charts.push({ song, diffIndex: idx, ds, score });
      });
    });
    return Array.from(dsMap.values()).sort((a, b) => b.ds - a.ds);
  }, [musicData, level, userScoreMap]);

  // Stats across all charts in this level
  const stats = useMemo(() => {
    let total = 0, cleared = 0, sss = 0, sssp = 0, fc = 0, fcp = 0, ap = 0, app = 0;
    let totalAch = 0, clearedAch = 0, totalDx = 0;
    dsGroups.forEach(({ charts }) => {
      charts.forEach(({ score }) => {
        total++;
        if (!score) return;
        const ach = score.achievement || score.achievementRate || 0;
        const fcVal = getFc(score);
        totalAch += ach;
        totalDx += score.dxRatio || 0;
        if (ach >= 80) { cleared++; clearedAch += ach; }
        if (ach >= 100.0) sss++;
        if (ach >= 100.5) sssp++;
        if (['fc', 'fcp', 'ap', 'app'].includes(fcVal)) fc++;
        if (['fcp', 'ap', 'app'].includes(fcVal)) fcp++;
        if (['ap', 'app'].includes(fcVal)) ap++;
        if (fcVal === 'app') app++;
      });
    });
    return {
      total, cleared, sss, sssp, fc, fcp, ap, app,
      avgAch: total > 0 ? totalAch / total : 0,
      avgClearedAch: cleared > 0 ? clearedAch / cleared : 0,
      avgDx: total > 0 ? (totalDx / total) * 100 : 0,
      clearRate: total > 0 ? (cleared / total) * 100 : 0,
      fcRate: total > 0 ? (fc / total) * 100 : 0,
      apRate: total > 0 ? (ap / total) * 100 : 0,
    };
  }, [dsGroups]);

  if (loading)
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-cyan-500/50" />
      </div>
    );

  const r = 54;
  const circ = 2 * Math.PI * r;
  const clearOffset = circ - (stats.clearRate / 100) * circ;

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200">
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-900/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 relative z-10">
        {/* Back */}
        <button
          onClick={() => navigate(`/profile/${username}/maimai`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 mb-8 font-bold text-sm transition-colors"
        >
          <FaArrowLeft /> 返回档案
        </button>

        {/* Title */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-1.5 h-10 bg-pink-400 rounded-full shadow-[0_0_12px_rgba(244,114,182,0.6)]" />
          <div>
            <h1 className="text-4xl font-black text-zinc-100 tracking-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              Lv.{level}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">共 {stats.total} 张谱面</p>
          </div>
        </div>

        {/* Stats + ring row */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          {/* Big ring */}
          <div className="flex flex-col items-center justify-center bg-[#15151e] border border-white/[0.05] p-8 shrink-0 w-full md:w-56">
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              <svg className="-rotate-90 w-full h-full" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={r} strokeWidth="10" fill="transparent" stroke="currentColor" className="text-[#0c0c11]" />
                <motion.circle
                  cx="64" cy="64" r={r} strokeWidth="10" fill="transparent"
                  stroke="currentColor" className="text-pink-400"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: clearOffset }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {stats.clearRate.toFixed(0)}<span className="text-lg">%</span>
                </span>
                <span className="text-xs text-zinc-500 mt-0.5">通关率</span>
              </div>
            </div>
            <div className="text-center text-xs text-zinc-500 font-bold">
              {stats.cleared} / {stats.total} 已通关
            </div>
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: '均达成率', value: stats.avgAch.toFixed(2) + '%', color: 'text-zinc-300' },
              { label: '通关均达成', value: stats.avgClearedAch.toFixed(2) + '%', color: 'text-emerald-400' },
              { label: '均DX占比', value: stats.avgDx.toFixed(1) + '%', color: 'text-cyan-400' },
              { label: 'SSS+', value: stats.sssp + ' 张', color: 'text-amber-300' },
              { label: 'SSS', value: stats.sss + ' 张', color: 'text-amber-400' },
              { label: 'FC 率', value: stats.fcRate.toFixed(1) + '%', color: 'text-pink-400' },
              { label: 'AP 率', value: stats.apRate.toFixed(1) + '%', color: 'text-amber-400' },
              { label: 'AP+', value: stats.app + ' 张', color: 'text-amber-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#15151e] border border-white/[0.05] p-4 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
                <span className={`text-xl font-black ${color}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DS groups */}
        <div className="flex flex-col gap-4">
          {dsGroups.map(({ ds, charts }) => {
            const cleared = charts.filter(c => c.score && (c.score.achievement || c.score.achievementRate || 0) >= 80).length;
            const fcC = charts.filter(c => c.score && ['fc', 'fcp', 'ap', 'app'].includes(getFc(c.score))).length;
            const apC = charts.filter(c => c.score && ['ap', 'app'].includes(getFc(c.score))).length;
            const pct = charts.length > 0 ? (cleared / charts.length) * 100 : 0;
            const rS = 18; const circS = 2 * Math.PI * rS;
            const offsetS = circS - (pct / 100) * circS;
            const isOpen = openDs === ds.toFixed(1);

            return (
              <div key={ds} className="border border-white/[0.05] bg-[#15151e] rounded-lg overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setOpenDs(isOpen ? null : ds.toFixed(1))}
                  className="w-full flex items-center gap-4 p-5 hover:bg-[#1a1a24] transition-colors"
                >
                  <div className="relative w-11 h-11 shrink-0">
                    <svg className="-rotate-90 w-full h-full" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r={rS} strokeWidth="3.5" fill="transparent" stroke="currentColor" className="text-[#0c0c11]" />
                      <circle cx="22" cy="22" r={rS} strokeWidth="3.5" fill="transparent"
                        stroke="currentColor" className="text-pink-400"
                        strokeDasharray={circS} strokeDashoffset={offsetS} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-zinc-300">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-lg font-black text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      DS {ds.toFixed(1)}
                    </span>
                    <div className="flex gap-3 text-[11px] font-bold text-zinc-500">
                      <span>{cleared}/{charts.length} 通关</span>
                      {fcC > 0 && <span className="text-pink-400">FC×{fcC}</span>}
                      {apC > 0 && <span className="text-amber-400">AP×{apC}</span>}
                    </div>
                  </div>
                  <span className="text-zinc-600 text-sm">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Songs */}
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4 bg-[#0c0c11] grid grid-cols-2 gap-3"
                  >
                    {charts.map(({ song, diffIndex, score }) => {
                      const isCompleted = score && (score.achievement || score.achievementRate || 0) >= 80;
                      const diffConf = { name: DIFF_NAMES[diffIndex], color: DIFF_COLORS[diffIndex] };
                      const ach = score ? (score.achievement || score.achievementRate || 0) : 0;
                      return (
                        <div
                          key={`${song.id}_${diffIndex}`}
                          className={`flex items-center gap-3 p-3 border transition-all ${
                            isCompleted ? 'border-pink-400/40 bg-[#15151e]' : 'border-white/[0.05] bg-[#15151e] opacity-50'
                          }`}
                        >
                          <img
                            src={`https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`}
                            alt=""
                            className="w-16 h-16 object-cover shrink-0"
                            loading="lazy"
                            onError={(e) => { e.target.src = '/assets/bg.png'; }}
                          />
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <div className={`text-sm font-bold truncate ${isCompleted ? 'text-zinc-100' : 'text-zinc-600'}`}>
                              {song.title}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">{song.basic_info?.artist || ''}</div>
                            <div className="flex items-center justify-between mt-0.5">
                              <div className="flex items-center gap-1">
                                <span className={`px-1 py-0.5 text-[8px] font-bold border ${diffConf.color}`}>
                                  {diffConf.name}
                                </span>
                                {getFcBadge(score)}
                              </div>
                              {isCompleted && score ? (
                                <div className="flex items-center gap-1.5">
                                  {getDxStarIcon(score.dxRatio)}
                                  <span className="text-xs font-bold text-pink-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                    {ach.toFixed(4)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-zinc-600">未通关</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MaimaiLevelDetail;