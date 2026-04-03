import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

const PLATE_VERSIONS = [
  { id: '舞', plates: [{ name: '舞', img: 'maimai' }], label: '舞 (maimai~FiNALE)', versions: ['maimai', 'maimai PLUS', 'maimai GreeN', 'maimai GreeN PLUS', 'maimai ORANGE', 'maimai ORANGE PLUS', 'maimai PiNK', 'maimai PiNK PLUS', 'maimai MURASAKi', 'maimai MURASAKi PLUS', 'maimai MiLK', 'MiLK PLUS', 'maimai MiLK PLUS', 'maimai FiNALE'] },
  { id: '真', plates: [{ name: '真', img: 'plus' }], label: '真 (PLUS)', versions: ['maimai PLUS'] },
  { id: '超', plates: [{ name: '超', img: 'green' }], label: '超 (GreeN)', versions: ['maimai GreeN'] },
  { id: '檄', plates: [{ name: '檄', img: 'green_plus' }], label: '檄 (GreeN+)', versions: ['maimai GreeN PLUS'] },
  { id: '橙', plates: [{ name: '橙', img: 'orange' }], label: '橙 (ORANGE)', versions: ['maimai ORANGE'] },
  { id: '晓', plates: [{ name: '晓', img: 'orange_plus' }], label: '晓 (ORANGE+)', versions: ['maimai ORANGE PLUS'] },
  { id: '桃', plates: [{ name: '桃', img: 'pink' }], label: '桃 (PiNK)', versions: ['maimai PiNK'] },
  { id: '樱', plates: [{ name: '樱', img: 'pink_plus' }], label: '樱 (PiNK+)', versions: ['maimai PiNK PLUS'] },
  { id: '紫', plates: [{ name: '紫', img: 'murasaki' }], label: '紫 (MURASAKi)', versions: ['maimai MURASAKi'] },
  { id: '堇', plates: [{ name: '堇', img: 'murasaki_plus' }], label: '堇 (MURASAKi+)', versions: ['maimai MURASAKi PLUS'] },
  { id: '白', plates: [{ name: '白', img: 'milk' }], label: '白 (MiLK)', versions: ['maimai MiLK'] },
  { id: '雪', plates: [{ name: '雪', img: 'milk_plus' }], label: '雪 (MiLK+)', versions: ['MiLK PLUS', 'maimai MiLK PLUS'] },
  { id: '辉', plates: [{ name: '辉', img: 'finale' }], label: '辉 (FiNALE)', versions: ['maimai FiNALE'] },
  { id: '熊华', plates: [{ name: '熊', img: 'dx' }, { name: '华', img: 'dx_plus' }], label: '熊华 (DX & DX+)', versions: ['maimai でらっくす', 'maimai でらっくす PLUS'] },
  { id: '爽煌', plates: [{ name: '爽', img: 'splash' }, { name: '煌', img: 'splash_plus' }], label: '爽煌 (Splash & Splash+)', versions: ['maimai でらっくす Splash', 'maimai でらっくす Splash PLUS'] },
  { id: '星宙', plates: [{ name: '宙', img: 'universe' }, { name: '星', img: 'universe_plus' }], label: '星宙 (UNiVERSE & UNiVERSE+)', versions: ['maimai でらっくす UNiVERSE', 'maimai でらっくす UNiVERSE PLUS'] },
  { id: '祭祝', plates: [{ name: '祭', img: 'festival' }, { name: '祝', img: 'festival_plus' }], label: '祭祝 (FESTiVAL & FESTiVAL+)', versions: ['maimai でらっくす FESTiVAL', 'maimai でらっくす FESTiVAL PLUS'] },
  { id: '宴双', plates: [{ name: '双', img: 'buddies' }, { name: '宴', img: 'buddies_plus' }], label: '宴双 (BUDDiES & BUDDiES+)', versions: ['maimai でらっくす BUDDiES', 'maimai でらっくす BUDDiES PLUS'] },
  { id: '镜彩', plates: [{ name: '镜', img: 'prism' }, { name: '彩', img: 'prism_plus' }], label: '镜彩 (PRiSM & PRiSM+)', versions: ['maimai でらっくす PRiSM', 'maimai でらっくす PRiSM PLUS'] },
];

const DIFF_NAMES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
const DIFF_COLORS = [
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'text-zinc-100 bg-zinc-400/10 border-zinc-400/20'
];

const getFc = (s) => (s?.fcStatus || s?.fc || '').toLowerCase();
const getFs = (s) => (s?.fsStatus || s?.fs || '').toLowerCase();

const MaimaiPlateDetail = () => {
  const { username, plateId } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [musicData, setMusicData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState(3);

  const plateInfo = useMemo(() => {
    const [versionId, plateType] = plateId.split('_');
    const version = PLATE_VERSIONS.find(v => v.id === versionId);
    return { version, plateType };
  }, [plateId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, musicRes] = await Promise.all([
          axios.get(`/api/users/${username}`),
          axios.get('/api/songs')
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
  }, [username]);

  const userScoreMap = useMemo(() => {
    const map = new Map();
    if (profile?.allScores) {
      profile.allScores.forEach(s => {
        map.set(`${s.songId}_${s.level}`, s);
        map.set(`${Number(s.songId)}_${s.level}`, s);
      });
    }
    return map;
  }, [profile]);

  const checkPlateCondition = (score, plateType) => {
    if (!score) return false;
    const ach = score.achievement || score.achievementRate || 0;
    const fc = getFc(score);
    const fs = getFs(score);
    if (plateType === '霸者') return ach >= 80;
    if (plateType === '将') return ach >= 100;
    if (plateType === '极') return ['fc', 'fcp', 'ap', 'app'].includes(fc);
    if (plateType === '神') return ['ap', 'app'].includes(fc);
    if (plateType === '舞舞') return ['fsd', 'fsdp'].includes(fs);
    return false;
  };

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
    return <img src={`/assets/${stars}dxstar.png`} alt={`${stars}★`} className="w-4 h-4 object-contain shrink-0" />;
  };

  const getFcBadge = (score) => {
    const s = getFc(score);
    if (s.includes('ap')) return <span className="bg-amber-400 text-amber-950 px-1.5 rounded-sm text-[10px] font-black">{s.toUpperCase()}</span>;
    if (s.includes('fc')) return <span className="bg-pink-400 text-pink-950 px-1.5 rounded-sm text-[10px] font-black">{s.toUpperCase()}</span>;
    return null;
  };

  const songsGroupedByLevel = useMemo(() => {
    if (!plateInfo.version || !musicData.length) return [];
    const validSongs = musicData.filter(s =>
      s.type !== 'UTAGE' && s.basic_info.genre !== '宴会場' && s.basic_info.genre !== '宴会场' &&
      plateInfo.version.versions.includes(s.basic_info.from) &&
      s.level.length > selectedDiff
    );
    const grouped = new Map();
    validSongs.forEach(song => {
      const lvl = song.level[selectedDiff];
      if (!grouped.has(lvl)) grouped.set(lvl, []);
      grouped.get(lvl).push(song);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => parseFloat(b[0].replace('+', '.7')) - parseFloat(a[0].replace('+', '.7')))
      .map(([lvl, songs]) => ({
        level: lvl,
        songs: songs.sort((a, b) => (b.ds[selectedDiff] || 0) - (a.ds[selectedDiff] || 0))
      }));
  }, [plateInfo, musicData, selectedDiff]);

  if (loading) return (
    <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center">
      <FaSpinner className="animate-spin text-4xl text-cyan-500/50" />
    </div>
  );

  const maxDiff = plateInfo.version?.id === '舞' ? 4 : 3;

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200">
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <button onClick={() => navigate(`/profile/${username}/maimai`)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 mb-6 font-bold">
          <FaArrowLeft /> 返回档案
        </button>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">{plateInfo.version?.label} — {plateInfo.plateType}牌</h1>
          <div className="flex gap-2 mt-4">
            {Array.from({ length: maxDiff + 1 }, (_, i) => i).map(diff => (
              <button key={diff} onClick={() => setSelectedDiff(diff)}
                className={`px-4 py-2 text-sm font-bold border-b-2 ${selectedDiff === diff ? `${DIFF_COLORS[diff].split(' ')[0]} border-current` : 'text-zinc-500 border-transparent'}`}>
                {DIFF_NAMES[diff]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {songsGroupedByLevel.map(({ level, songs }) => {
            const completed = songs.filter(s => {
              const sc = userScoreMap.get(`${s.id}_${selectedDiff}`);
              return checkPlateCondition(sc, plateInfo.plateType);
            }).length;
            return (
              <div key={level} className="bg-[#15151e] border border-white/[0.05] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Lv.{level}</h2>
                  <span className="text-sm text-zinc-500">{completed} / {songs.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {songs.map(song => {
                    const score = userScoreMap.get(`${song.id}_${selectedDiff}`);
                    const isCompleted = checkPlateCondition(score, plateInfo.plateType);
                    const ach = score ? (score.achievement || score.achievementRate || 0) : 0;
                    return (
                      <div key={song.id} className={`flex gap-3 p-3 border ${isCompleted ? 'border-amber-400/40' : 'border-white/[0.05] opacity-50'}`}>
                        <img src={`https://www.diving-fish.com/covers/${String(song.id).padStart(5,'0')}.png`} alt="" className="w-16 h-16 object-cover" loading="lazy" onError={e => e.target.src = '/assets/bg.png'} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isCompleted ? 'text-zinc-100' : 'text-zinc-600'}`}>{song.title}</div>
                          <div className="text-xs text-zinc-500 truncate">{song.basic_info?.artist || ''}</div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex gap-1">{getFcBadge(score)}</div>
                            {isCompleted && score ? (
                              <div className="flex items-center gap-1.5">
                                {getDxStarIcon(score.dxRatio)}
                                <span className="text-xs font-bold text-amber-400">{ach.toFixed(4)}%</span>
                              </div>
                            ) : <span className="text-xs text-zinc-600">未完成</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MaimaiPlateDetail;