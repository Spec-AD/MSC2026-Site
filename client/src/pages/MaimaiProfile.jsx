import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaArrowLeft, FaGamepad, FaSpinner, FaSyncAlt, FaChartLine, FaTrophy, FaLock, FaTimes } from 'react-icons/fa';

// ==========================================
// 牌子世代配置引擎 (完美适配图片前缀与雪代修正)
// ==========================================
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
  { id: '雪', plates: [{ name: '雪', img: 'milk_plus' }], label: '雪 (MiLK+)', versions: ['MiLK PLUS', 'maimai MiLK PLUS'] }, // 修复: MiLK PLUS
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

// 高强度字段兼容：防 undefined 崩溃读取器
const getFc = (s) => (s?.fcStatus || s?.fc || '').toLowerCase();
const getFs = (s) => (s?.fsStatus || s?.fs || '').toLowerCase();

const MaimaiProfile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [musicData, setMusicData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newSongIds, setNewSongIds] = useState(new Set());
  
  // --- 同步模块状态 ---
  const [syncSource, setSyncSource] = useState('df');
  const [importToken, setImportToken] = useState('');
  const [lxFriendCode, setLxFriendCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [b50Filter, setB50Filter] = useState('DEFAULT');
  const [selectedPfScore, setSelectedPfScore] = useState(null);
  
  // --- 牌子系统状态 ---
  const [selectedPlateVersion, setSelectedPlateVersion] = useState('舞');
  const [selectedPlateDetail, setSelectedPlateDetail] = useState(null); 
  const [detailDiff, setDetailDiff] = useState(3); 

  const isOwnProfile = profile && currentUser && (profile.username.toLowerCase() === currentUser.username.toLowerCase());

  // 🔥 核心修复1：在后台静默预加载所有名牌图片，写入浏览器强缓存
  useEffect(() => {
    const preloadImages = () => {
      const types = ['general', 'fc', 'ap', 'fdx'];
      PLATE_VERSIONS.forEach(group => {
        group.plates?.forEach(p => {
          types.forEach(t => {
            const img = new Image();
            img.src = `/assets/${p.img}_${t}.png`;
          });
        });
      });
      const clearImg = new Image();
      clearImg.src = '/assets/clear_general.png';
    };
    preloadImages();
  }, []);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [profileRes, musicRes] = await Promise.all([
          axios.get(`/api/users/${username}?t=${Date.now()}`),
          axios.get('/proxy/diving-fish/music_data').catch(() => ({ data: [] }))
        ]);

        setProfile(profileRes.data);
        setImportToken(profileRes.data.importToken || '');
        setLxFriendCode(profileRes.data.proberUsername || ''); 
        setMusicData(musicRes.data || []);

        const newIds = new Set();
        if (musicRes.data && Array.isArray(musicRes.data)) {
          musicRes.data.forEach(song => {
            if (song.basic_info?.is_new) newIds.add(String(song.id));
          });
        }
        setNewSongIds(newIds);
      } catch (err) {
        setError(err.response?.data?.msg || '未找到该玩家档案');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [username]);

  const handleSync = async () => {
    if (syncSource === 'df' && !importToken.trim()) return addToast('请提供水鱼 Import-Token', 'error'); 
    if (syncSource === 'lx' && !lxFriendCode.trim()) return addToast('请提供落雪好友代码/QQ', 'error'); 
    
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = syncSource === 'df' ? '/api/users/sync-maimai' : '/api/users/sync-luoxue';
      const payload = syncSource === 'df' ? { importToken } : { friendCode: lxFriendCode };
      
      const res = await axios.post(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });
      
      addToast(res.data.msg || `同步成功！当前 Rating: ${res.data.rating}`, 'success');
      const profileRes = await axios.get(`/api/users/${username}?t=${Date.now()}`);
      setProfile(profileRes.data);
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请检查输入或网络', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const getDiffConfig = (score) => {
    let idx = 3; 
    if (typeof score.level === 'number') idx = score.level;
    return { name: DIFF_NAMES[idx], color: DIFF_COLORS[idx] };
  };

  const getLevelString = (score) => {
    if (!score.constant || score.constant === 0) return '';
    const base = Math.floor(score.constant);
    const frac = Math.round((score.constant - base) * 10);
    return `${base}${frac >= 7 ? '+' : ''}`;
  };

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
    if (plateType === '将') return ach >= 100; // 规避浮点数精度
    if (plateType === '极') return ['fc', 'fcp', 'ap', 'app'].includes(fc);
    if (plateType === '神') return ['ap', 'app'].includes(fc);
    if (plateType === '舞舞') return ['fsd', 'fsdp'].includes(fs); 
    return false;
  };

  // ==========================================
  // 牌子进度计算与图片映射
  // ==========================================
  const plateProgress = useMemo(() => {
    if (!musicData || musicData.length === 0 || !profile?.allScores) return null;

    const targetGroup = PLATE_VERSIONS.find(v => v.id === selectedPlateVersion);
    if (!targetGroup) return null;

    const validSongs = musicData.filter(s =>
      s.type !== 'UTAGE' &&
      s.basic_info.genre !== '宴会場' &&
      s.basic_info.genre !== '宴会场' &&
      targetGroup.versions.includes(s.basic_info.from)
    );

    let totalCharts = 0, clearCount = 0, jiangCount = 0, jiCount = 0, shenCount = 0, maiCount = 0;
    const isMaiSeries = selectedPlateVersion === '舞';

    validSongs.forEach(song => {
      let levelsToCheck = isMaiSeries ? (song.level.length === 5 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3]) : [0, 1, 2, 3];
      totalCharts += levelsToCheck.length;

      levelsToCheck.forEach(lvl => {
        const score = userScoreMap.get(`${song.id}_${lvl}`);
        if (!score) return;

        const ach = score.achievement || score.achievementRate || 0;
        const fc = getFc(score);
        const fs = getFs(score);

        if (ach >= 80) clearCount++; 
        if (ach >= 100) jiangCount++;
        if (['fc', 'fcp', 'ap', 'app'].includes(fc)) jiCount++;
        if (['ap', 'app'].includes(fc)) shenCount++;
        if (['fsd', 'fsdp'].includes(fs)) maiCount++;
      });
    });

    const result = [];
    
    targetGroup.plates.forEach(p => {
      const pName = p.name;
      const pImg = p.img;
      
      if (pName === '舞') {
        result.push({ type: '霸者', customImg: 'clear_general', name: '霸者', count: clearCount, total: totalCharts, color: 'text-zinc-300', bar: 'bg-zinc-300' });
        result.push({ type: '将', imgPrefix: pImg, imgSuffix: 'general', name: `${pName}将`, count: jiangCount, total: totalCharts, color: 'text-emerald-400', bar: 'bg-emerald-400' });
        result.push({ type: '极', imgPrefix: pImg, imgSuffix: 'fc', name: `${pName}极`, count: jiCount, total: totalCharts, color: 'text-amber-400', bar: 'bg-amber-400' });
        result.push({ type: '神', imgPrefix: pImg, imgSuffix: 'ap', name: `${pName}神`, count: shenCount, total: totalCharts, color: 'text-cyan-400', bar: 'bg-cyan-400' });
        result.push({ type: '舞舞', imgPrefix: pImg, imgSuffix: 'fdx', name: '舞舞舞', count: maiCount, total: totalCharts, color: 'text-pink-400', bar: 'bg-pink-400' });
      } else {
        if (pName !== '真') {
          result.push({ type: '将', imgPrefix: pImg, imgSuffix: 'general', name: `${pName}将`, count: jiangCount, total: totalCharts, color: 'text-emerald-400', bar: 'bg-emerald-400' });
        }
        result.push({ type: '极', imgPrefix: pImg, imgSuffix: 'fc', name: `${pName}极`, count: jiCount, total: totalCharts, color: 'text-amber-400', bar: 'bg-amber-400' });
        result.push({ type: '神', imgPrefix: pImg, imgSuffix: 'ap', name: `${pName}神`, count: shenCount, total: totalCharts, color: 'text-cyan-400', bar: 'bg-cyan-400' });
        result.push({ type: '舞舞', imgPrefix: pImg, imgSuffix: 'fdx', name: `${pName}舞舞`, count: maiCount, total: totalCharts, color: 'text-pink-400', bar: 'bg-pink-400' });
      }
    });

    return result;
  }, [musicData, profile, selectedPlateVersion, userScoreMap]);

  const b50Data = useMemo(() => {
    if (!profile || !profile.allScores) return { b35: [], r15: [], rating: 0 };
    let scores = [...profile.allScores];

    const getIdealScore = (score) => {
      let newAch = score.achievement;
      let newFc = getFc(score);
      if (newAch < 100.0) newAch = 100.0;
      else if (newAch >= 100.0 && newAch < 100.5) { newAch = 100.5; if (!['fcp', 'ap', 'app'].includes(newFc)) newFc = 'fcp'; }
      else if (newAch >= 100.5) { newAch = 101.0; newFc = 'app'; }
      
      let factor = 0;
      if (newAch >= 100.5) factor = 22.4; else if (newAch >= 100.0) factor = 21.6;
      else if (newAch >= 99.5) factor = 21.1; else if (newAch >= 99.0) factor = 20.8;
      else if (newAch >= 98.0) factor = 20.3; else if (newAch >= 97.0) factor = 20.0;
      else if (newAch >= 94.0) factor = 16.8; else if (newAch >= 90.0) factor = 15.2;
      else if (newAch >= 80.0) factor = 13.6;
      
      const newRating = Math.floor(score.constant * (Math.min(newAch, 100.5) / 100) * factor);
      return { ...score, achievement: newAch, fcStatus: newFc, rating: newRating, isIdeal: true };
    };

    if (b50Filter === 'IDEAL') scores = scores.map(getIdealScore);
    else if (b50Filter === 'AP50') scores = scores.filter(s => ['ap', 'app'].includes(getFc(s)));
    else if (b50Filter === 'FC50') scores = scores.filter(s => ['fc', 'fcp', 'ap', 'app'].includes(getFc(s)));
    else if (b50Filter === 'STAR_1') scores = scores.filter(s => s.dxRatio >= 0.85);
    else if (b50Filter === 'STAR_2') scores = scores.filter(s => s.dxRatio >= 0.90);
    else if (b50Filter === 'STAR_3') scores = scores.filter(s => s.dxRatio >= 0.93);
    else if (b50Filter === 'STAR_4') scores = scores.filter(s => s.dxRatio >= 0.95);
    else if (b50Filter === 'STAR_5') scores = scores.filter(s => s.dxRatio >= 0.97);
    else if (b50Filter === 'STAR_5_5') scores = scores.filter(s => s.dxRatio >= 0.98);
    else if (b50Filter === 'STAR_6') scores = scores.filter(s => s.dxRatio >= 0.99);
    else if (b50Filter === 'GREEN') scores = scores.filter(s => s.level === 0);
    else if (b50Filter === 'YELLOW') scores = scores.filter(s => s.level === 1);
    else if (b50Filter === 'RED') scores = scores.filter(s => s.level === 2);
    else if (b50Filter === 'PURPLE') scores = scores.filter(s => s.level === 3);
    else if (b50Filter === 'WHITE') scores = scores.filter(s => s.level === 4);
    else if (b50Filter === 'LOCK50') scores = scores.filter(s => s.achievement >= 100.0000 && s.achievement <= 100.1000);
    else if (b50Filter === 'CUN50') scores = scores.filter(s => s.achievement >= 99.8000 && s.achievement <= 99.9999);
    else if (b50Filter === 'YUE50') scores = scores.filter(s => s.achievement < 97.0000);

    scores.sort((a, b) => b.rating - a.rating || b.achievement - a.achievement);
    
    const isNewRecord = (s) => newSongIds.has(String(s.songId));
    const oldScores = scores.filter(s => !isNewRecord(s)).slice(0, 35);
    const newScores = scores.filter(s => isNewRecord(s)).slice(0, 15);
    const totalRating = [...oldScores, ...newScores].reduce((sum, s) => sum + (s.rating || 0), 0);

    return { b35: oldScores, r15: newScores, rating: totalRating };
  }, [profile, b50Filter, newSongIds]);

  const pf100Data = useMemo(() => {
    if (!profile || !profile.allScores) return [];
    return [...profile.allScores].sort((a, b) => b.pf - a.pf).slice(0, 100);
  }, [profile]);

  const getFcBadge = (score) => {
    const s = getFc(score);
    if (s.includes('ap')) return <span className="bg-amber-400 text-amber-950 px-1.5 rounded-sm text-[10px] font-black">{s.toUpperCase()}</span>;
    if (s.includes('fc')) return <span className="bg-pink-400 text-pink-950 px-1.5 rounded-sm text-[10px] font-black">{s.toUpperCase()}</span>;
    return null;
  };

  const getFsBadge = (score) => {
    const s = getFs(score);
    if (['fsd', 'fsdp'].includes(s)) return <span className="bg-cyan-400 text-cyan-950 px-1.5 rounded-sm text-[10px] font-black">FDX</span>;
    return null;
  };

  const renderScoreCard = (score, index, prefix) => {
    const diff = getDiffConfig(score);
    const realLevel = getLevelString(score);

    return (
      <motion.div 
        key={`${prefix}-${index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.01 }}
        className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.05] bg-[#0a0a0c] group shadow-sm"
      >
        <img 
          src={`https://www.diving-fish.com/covers/${String(score.songId).padStart(5, '0')}.png`} alt="cover"
          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
          onError={(e) => { e.target.src = '/assets/bg.png'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/40 to-transparent pointer-events-none" />

        <div className="absolute top-2 left-2 flex gap-1 z-10">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${diff.color}`}>
            {diff.name} <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{realLevel}</span>
          </span>
          {getFcBadge(score)}
          {getFsBadge(score)}
        </div>
        {score.isIdeal && <span className="absolute top-2 right-8 bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded text-[9px] font-bold z-10">IDEAL</span>}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-300 z-10" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          #{index + 1}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end z-10">
          <div className="text-[13px] font-bold text-zinc-100 truncate mb-1 leading-tight">{score.songName}</div>
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold text-zinc-100 leading-none" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {score.achievement.toFixed(4)}<span className="text-[10px] text-zinc-400">%</span>
            </span>
            <span className="bg-white/10 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-xs font-bold text-amber-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {score.rating}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) return (
    <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center">
      <FaSpinner className="animate-spin text-4xl text-cyan-500/50" />
    </div>
  );

  if (error || !profile) return (
    <div className="w-full min-h-screen bg-[#0c0c11] flex flex-col items-center justify-center text-zinc-200">
      <FaLock className="text-5xl text-zinc-700 mb-4 opacity-50" />
      <h2 className="text-xl font-bold">无法访问该档案</h2>
      <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 bg-zinc-200 text-zinc-900 rounded-xl font-bold active:scale-95 transition-all">返回</button>
    </div>
  );

  const B50_FILTERS = [
    { value: 'DEFAULT', label: '默认 B50' }, { value: 'IDEAL', label: '理想 B50' },
    { value: 'AP50', label: 'AP 50' }, { value: 'FC50', label: 'FC 50' },
    { value: 'STAR_1', label: '一星 B50' }, { value: 'STAR_2', label: '二星 B50' },
    { value: 'STAR_3', label: '三星 B50' }, { value: 'STAR_4', label: '四星 B50' },
    { value: 'STAR_5', label: '五星 B50' }, { value: 'STAR_5_5', label: '五星半 B50' },
    { value: 'STAR_6', label: '六星 B50' }, { value: 'GREEN', label: '绿谱 B50' },
    { value: 'YELLOW', label: '黄谱 B50' }, { value: 'RED', label: '红谱 B50' },
    { value: 'PURPLE', label: '紫谱 B50' }, { value: 'WHITE', label: '白谱 B50' },
    { value: 'LOCK50', label: '锁 50' }, { value: 'CUN50', label: '寸 50' },
    { value: 'YUE50', label: '越 50' }
  ];

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-cyan-500/30 relative pb-24 overflow-x-hidden">
      
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => navigate(`/profile/${profile.username}`)}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95"
            >
              <FaArrowLeft /> 返回个人主页
            </button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                  <FaGamepad className="text-cyan-400 text-2xl" /> Maimai DX 数据档案
                </h1>
                <span className="text-sm font-medium text-zinc-500 mt-1 block">Player: {profile.username}</span>
              </div>
            </div>
          </div>

          {/* 智能双源同步控制台 */}
          {isOwnProfile && (
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-[#15151e]/80 p-1 rounded-xl border border-white/[0.05] w-fit">
                <button 
                  onClick={() => setSyncSource('df')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${syncSource === 'df' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  水鱼查分器
                </button>
                <button 
                  onClick={() => setSyncSource('lx')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${syncSource === 'lx' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  落雪查分器
                </button>
              </div>

              <div className="flex items-center gap-2 bg-[#15151e]/80 backdrop-blur-md p-2 rounded-2xl border border-white/[0.05] shadow-sm w-full md:w-auto">
                {syncSource === 'df' ? (
                  <input 
                    type="password" 
                    value={importToken}
                    onChange={(e) => setImportToken(e.target.value)}
                    placeholder="粘贴水鱼 Import-token..."
                    className="w-full md:w-64 bg-transparent border-none text-zinc-200 px-3 py-2 text-sm focus:outline-none placeholder-zinc-600 font-mono"
                  />
                ) : (
                  <input 
                    type="text" 
                    value={lxFriendCode}
                    onChange={(e) => setLxFriendCode(e.target.value)}
                    placeholder="输入落雪绑定的好友代码或 QQ"
                    className="w-full md:w-64 bg-transparent border-none text-zinc-200 px-3 py-2 text-sm focus:outline-none placeholder-zinc-600 font-mono"
                  />
                )}
                
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`${syncSource === 'df' ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900' : 'bg-indigo-500 hover:bg-indigo-400 text-white'} px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 active:scale-95`}
                >
                  {isSyncing ? <FaSpinner className="animate-spin" /> : <><FaSyncAlt /> 同步云端</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {!isOwnProfile && !profile.isB50Visible ? (
          <div className="py-32 flex flex-col items-center justify-center bg-[#15151e]/40 border border-white/[0.05] rounded-[3rem] mt-10">
            <FaLock className="text-5xl text-zinc-800 mb-4 opacity-50" />
            <p className="text-zinc-500 font-medium tracking-wide">该玩家的数据档案已设为私密</p>
          </div>
        ) : (
          <>
            {/* ========================================== */}
            {/* 牌子完成度可视化面板 */}
            {/* ========================================== */}
            <div className="mb-14 border-b border-white/[0.05] pb-10">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">牌子进度追踪</h2>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {PLATE_VERSIONS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedPlateVersion(v.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                        selectedPlateVersion === v.id
                          ? 'bg-zinc-200 text-zinc-900 shadow-sm'
                          : 'bg-[#15151e] border border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a24]'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 优雅网格：兼容合并代的 8 牌子矩阵 */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {plateProgress ? plateProgress.map((plate, idx) => {
                  const targetGroup = PLATE_VERSIONS.find(v => v.id === selectedPlateVersion);
                  const isCompleted = plate.total > 0 && plate.count === plate.total;
                  
                  const imgSrc = plate.customImg 
                                ? `/assets/${plate.customImg}.png` 
                                : `/assets/${plate.imgPrefix}_${plate.imgSuffix}.png`;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedPlateDetail({ versionGroup: targetGroup, plateType: plate.type, plateName: plate.name });
                        setDetailDiff(3);
                      }}
                      className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:bg-[#1a1a24] hover:border-cyan-500/30 transition-all cursor-pointer group"
                    >
                      <div className="relative w-full aspect-[3/1] bg-[#0c0c11] rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.02]">
                        <img 
                          key={imgSrc} // 🔥 核心修复2：强制重绘DOM，解决回退状态卡死
                          src={imgSrc}
                          alt={plate.name}
                          className={`w-full h-full object-contain p-2 transition-all duration-500 ${isCompleted ? 'opacity-100 scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]' : 'opacity-20 grayscale brightness-50'}`}
                          onLoad={(e) => {
                            e.target.style.display = 'block'; 
                            if (e.target.nextSibling) e.target.nextSibling.style.opacity = '0';
                          }}
                          onError={(e) => { 
                            e.target.style.display = 'none'; 
                            if (e.target.nextSibling) e.target.nextSibling.style.opacity = '1';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity">
                          <span className={`font-black text-xl tracking-widest ${isCompleted ? plate.color : 'text-zinc-600'}`}>
                            {plate.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center px-1">
                        <div className="text-zinc-300 font-bold text-sm tracking-widest">{plate.name}</div>
                        <div className="text-xs text-zinc-600 group-hover:text-cyan-400 transition-colors">↗</div>
                      </div>
                      
                      <div className="flex items-baseline gap-2 px-1">
                        <span className={`text-2xl font-bold tracking-tight ${isCompleted ? plate.color : 'text-zinc-400'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {plate.count}
                        </span>
                        <span className="text-xs font-bold text-zinc-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          / {plate.total}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 mt-auto px-1">
                        <div className="h-1.5 w-full bg-[#0c0c11] border border-white/[0.02] rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${plate.total > 0 ? (plate.count / plate.total) * 100 : 0}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${plate.bar}`} 
                          />
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 text-right tracking-widest" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {plate.total > 0 ? ((plate.count / plate.total) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-8 text-zinc-500 text-sm font-medium flex items-center gap-3">
                    <FaSpinner className="animate-spin text-xl" /> 正在拉取云端曲库数据...
                  </div>
                )}
              </div>
            </div>

            {/* ========================================== */}
            {/* B50 成绩模块 */}
            {/* ========================================== */}
            <div className="mb-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-4 mb-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                    <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Best 50</h2>
                  </div>
                  <select
                    value={b50Filter}
                    onChange={(e) => setB50Filter(e.target.value)}
                    className="bg-[#15151e] border border-white/[0.05] text-cyan-400 rounded-xl px-4 py-2 outline-none font-bold text-sm cursor-pointer hover:bg-[#1a1a24] transition-colors appearance-none"
                  >
                    {B50_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Rating</span>
                  <span className="text-2xl font-bold text-cyan-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                    {b50Data.rating}
                  </span>
                </div>
              </div>

              {b50Data.b35.length === 0 && b50Data.r15.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 font-medium bg-[#15151e]/40 rounded-2xl border border-white/5">未找到匹配的成绩</div>
              ) : (
                <>
                  {b50Data.b35.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Standard Tracks (B35)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {b50Data.b35.map((score, index) => renderScoreCard(score, index, 'b35'))}
                      </div>
                    </div>
                  )}

                  {b50Data.r15.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> New Tracks (R15)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {b50Data.r15.map((score, index) => renderScoreCard(score, index, 'r15'))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ========================================== */}
            {/* PF 100 成绩列表模块 */}
            {/* ========================================== */}
            <div>
              <div className="flex items-center gap-3 mb-6 border-b border-white/[0.05] pb-4">
                <div className="w-1 h-6 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Performance Top 100</h2>
              </div>

              <div className="flex flex-col gap-2">
                {pf100Data.length === 0 ? (
                  <div className="py-16 text-center text-zinc-600 font-medium bg-[#15151e]/40 rounded-2xl border border-white/5">暂无综合表现数据</div>
                ) : (
                  pf100Data.map((score, index) => {
                    const diff = getDiffConfig(score);
                    const realLevel = getLevelString(score);

                    return (
                      <div 
                        key={`pf-${index}`}
                        onClick={() => setSelectedPfScore(score)}
                        className="flex items-center justify-between bg-[#15151e] border border-white/[0.02] hover:bg-[#1a1a24] hover:border-white/[0.05] p-3 rounded-2xl cursor-pointer transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="w-8 text-center font-bold text-zinc-600 group-hover:text-cyan-400 transition-colors" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {index + 1}
                          </span>
                          <img 
                            src={`https://www.diving-fish.com/covers/${String(score.songId).padStart(5, '0')}.png`} 
                            className="w-12 h-12 rounded-xl object-cover bg-[#0a0a0c] border border-white/5 shrink-0" alt="cover" 
                            onError={(e) => { e.target.src = '/assets/bg.png'; }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[15px] font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                              {score.songName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${diff.color}`}>
                                {diff.name} <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{realLevel}</span>
                              </span>
                              <span className="text-[11px] font-bold text-zinc-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                {score.achievement.toFixed(4)}%
                              </span>
                              {getFcBadge(score)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-4 border-l border-white/[0.05] ml-4">
                          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-0.5">PF</span>
                          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {score.pf ? score.pf.toFixed(2) : '0.00'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* PF 详情模态窗 */}
        <AnimatePresence>
          {selectedPfScore && (
            <div 
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              onClick={() => setSelectedPfScore(null)}
            >
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0c0c11]/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-[#15151e] border border-white/[0.05] rounded-[2rem] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl relative z-10"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-8 px-4 w-full mt-2">
                  <h3 className="text-lg font-bold text-zinc-100 mb-2 line-clamp-2 leading-snug">
                    {selectedPfScore.songName}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center justify-center gap-1 mx-auto w-fit ${getDiffConfig(selectedPfScore).color}`}>
                    {getDiffConfig(selectedPfScore).name} <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{getLevelString(selectedPfScore)}</span>
                  </span>
                </div>

                {(() => {
                  const ach = selectedPfScore.achievement || 0;
                  const dxScore = selectedPfScore.dxScore || 0;
                  const dxRatio = selectedPfScore.dxRatio || 0;
                  const maxDxScore = dxRatio > 0 ? Math.round(dxScore / dxRatio) : 0;

                  const achMultiplier = (Math.min(ach, 101.0000) / 101.0000) * 0.6;
                  const dxMultiplier = Math.min(dxRatio, 1.0) * 0.4;
                  const totalMultiplier = achMultiplier + dxMultiplier;
                  const percent = totalMultiplier * 100;
                  const displayPercent = Math.min(percent, 100); 

                  let grade = 'D'; let gradeColor = 'text-zinc-500'; let ringColor = 'text-zinc-600';
                  if (percent >= 98) { grade = 'X'; gradeColor = 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]'; ringColor = 'text-cyan-400'; } 
                  else if (percent >= 95) { grade = 'S'; gradeColor = 'text-amber-400'; ringColor = 'text-amber-400'; } 
                  else if (percent >= 90) { grade = 'A'; gradeColor = 'text-pink-400'; ringColor = 'text-pink-400'; } 
                  else if (percent >= 85) { grade = 'B'; gradeColor = 'text-purple-400'; ringColor = 'text-purple-400'; } 
                  else if (percent >= 80) { grade = 'C'; gradeColor = 'text-emerald-400'; ringColor = 'text-emerald-400'; } 

                  const radius = 65;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

                  return (
                    <>
                      <div className="relative w-44 h-44 flex items-center justify-center mb-8">
                        <svg className="transform -rotate-90 w-full h-full drop-shadow-lg">
                          <circle cx="88" cy="88" r="65" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-[#0c0c11]" />
                          <circle cx="88" cy="88" r="65" stroke="currentColor" strokeWidth="10" fill="transparent"
                                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                  className={`${ringColor} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                           <span className={`text-6xl font-black ${gradeColor}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{grade}</span>
                           <span className="text-xs font-bold text-zinc-400 mt-2" style={{ fontFamily: "'Quicksand', sans-serif" }}>{percent.toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-[#0c0c11] border border-white/[0.05] rounded-2xl p-5 space-y-3.5 text-sm font-bold shadow-inner">
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-500">达成率</span>
                           <span className="text-zinc-200" style={{ fontFamily: "'Quicksand', sans-serif" }}>{ach.toFixed(4)}%</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-500">达成率分值 <span className="text-[10px] font-medium opacity-50">/ 0.6</span></span>
                           <span className="text-cyan-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>{achMultiplier.toFixed(4)}</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-500">DX 分数</span>
                           <span className="text-zinc-200" style={{ fontFamily: "'Quicksand', sans-serif" }}>{dxScore} <span className="text-zinc-600 text-xs">/ {maxDxScore}</span></span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-500">DX 分值 <span className="text-[10px] font-medium opacity-50">/ 0.4</span></span>
                           <span className="text-indigo-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>{dxMultiplier.toFixed(4)}</span>
                         </div>
                         <div className="flex justify-between items-center pt-1">
                           <span className="text-zinc-300">总分值 <span className="text-[10px] font-medium opacity-50">/ 1.0</span></span>
                           <span className="text-amber-400 text-base" style={{ fontFamily: "'Quicksand', sans-serif" }}>{totalMultiplier.toFixed(4)}</span>
                         </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* 牌子详情曲目墙模态窗 */}
        {/* ========================================== */}
        <AnimatePresence>
          {selectedPlateDetail && (() => {
            const validSongs = musicData.filter(s =>
              s.type !== 'UTAGE' && s.basic_info.genre !== '宴会場' && s.basic_info.genre !== '宴会场' &&
              selectedPlateDetail.versionGroup.versions.includes(s.basic_info.from)
            );

            const maxDiff = selectedPlateDetail.versionGroup.id === '舞' ? 4 : 3;
            const availableDiffs = Array.from({ length: maxDiff + 1 }, (_, i) => i);
            
            const songsInDiff = validSongs.filter(s => s.level.length > detailDiff);

            return (
              <div 
                className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8"
                onClick={() => setSelectedPlateDetail(null)}
              >
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#0c0c11]/90 backdrop-blur-md"
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-[#15151e] border border-white/[0.05] rounded-[2rem] w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl relative z-10 overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6 md:p-8 border-b border-white/[0.05] shrink-0 bg-[#15151e] flex flex-col gap-6 relative z-20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                        <div>
                          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                            {selectedPlateDetail.versionGroup.label} - {selectedPlateDetail.plateName}
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium mt-1">点击难度分类查看具体曲目完成情况</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedPlateDetail(null)} className="text-zinc-500 hover:text-white transition-colors bg-white/[0.02] hover:bg-white/[0.06] p-2.5 rounded-full active:scale-90">
                        <FaTimes />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                      {availableDiffs.map(diff => {
                        const sInThisDiff = validSongs.filter(s => s.level.length > diff);
                        const compInThisDiff = sInThisDiff.filter(s => {
                          const sc = userScoreMap.get(`${s.id}_${diff}`) || userScoreMap.get(`${Number(s.id)}_${diff}`);
                          return checkPlateCondition(sc, selectedPlateDetail.plateType);
                        });
                        const isAllCleared = compInThisDiff.length === sInThisDiff.length && sInThisDiff.length > 0;
                        const conf = { name: DIFF_NAMES[diff], color: DIFF_COLORS[diff] };

                        return (
                          <button
                            key={diff}
                            onClick={() => setDetailDiff(diff)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                              detailDiff === diff
                                ? `${conf.color} ring-1 ring-white/10`
                                : 'bg-[#0c0c11] border-white/[0.05] text-zinc-500 hover:bg-[#1a1a24] hover:text-zinc-300'
                            }`}
                          >
                            <span>{conf.name}</span>
                            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded bg-black/20 ${isAllCleared ? 'text-emerald-400' : 'text-current'}`}>
                              {compInThisDiff.length}/{sInThisDiff.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-[#0c0c11]">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
                      {songsInDiff.map(song => {
                        const score = userScoreMap.get(`${song.id}_${detailDiff}`) || userScoreMap.get(`${Number(song.id)}_${detailDiff}`);
                        const isCompleted = checkPlateCondition(score, selectedPlateDetail.plateType);
                        const diffConf = { color: DIFF_COLORS[detailDiff] };

                        return (
                          <div key={song.id} className="flex flex-col gap-2 group">
                            <div className={`relative aspect-square rounded-xl overflow-hidden border ${isCompleted ? 'border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]' : 'border-white/[0.05] opacity-40 grayscale-[60%]'} transition-all`}>
                              <img 
                                src={`https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`} 
                                alt="cover" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                onError={(e) => { e.target.src = '/assets/bg.png'; }}
                              />
                              {!isCompleted && (
                                <div className="absolute inset-0 bg-[#0c0c11]/60 flex items-center justify-center pointer-events-none">
                                  <div className="bg-black/80 px-2 py-1 rounded text-[9px] font-bold text-zinc-400 uppercase tracking-widest border border-white/10">
                                    Not Cleared
                                  </div>
                                </div>
                              )}
                              
                              {score && isCompleted && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-4 flex justify-between items-end">
                                  <span className="text-[10px] font-bold text-white font-mono">{score.achievement.toFixed(2)}%</span>
                                  {getFcBadge(score) || getFsBadge(score)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col px-1">
                              <span className={`text-[11px] font-bold truncate ${isCompleted ? 'text-zinc-200' : 'text-zinc-500'}`}>
                                {song.title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${diffConf.color.split(' ')[0].replace('text-', 'bg-')}`}></span>
                                <span className="text-[10px] font-bold text-zinc-500 font-mono">
                                  DS: {song.ds[detailDiff]?.toFixed(1) || '0.0'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default MaimaiProfile;