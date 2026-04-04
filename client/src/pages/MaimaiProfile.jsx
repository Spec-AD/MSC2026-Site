import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaArrowLeft, FaGamepad, FaSpinner, FaSyncAlt, FaChartLine, FaTrophy, FaLock, FaTimes } from 'react-icons/fa';

// ==========================================
// 🌟 内联雷达图（Profile 专用，无需外部依赖）
// ==========================================
function RadarChartInline({ values, size = 260 }) {
  const DIMS = [
    { key: 'stamina',  label: '耐力',  color: '#f472b6' },
    { key: 'tech',     label: '技巧',  color: '#fbbf24' },
    { key: 'stable',   label: '稳定',  color: '#34d399' },
    { key: 'accuracy', label: '准度',  color: '#38bdf8' },
    { key: 'burst',    label: '爆发',  color: '#a78bfa' },
  ];
  const MAX = 10;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 34;
  const n = DIMS.length;
  const step = (2 * Math.PI) / n;
  const getP = (i, r) => ({ x: cx + r * Math.sin(i * step), y: cy - r * Math.cos(i * step) });
  const gridLevels = [2, 4, 6, 8, 10];

  const dataPoints = DIMS.map((d, i) => {
    const val = Math.min(Math.max(values?.[d.key] ?? 0, 0), MAX);
    return getP(i, (val / MAX) * outerR);
  });

  // 渐变填充多边形路径
  const polyPts = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="ability-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* 网格 */}
      {gridLevels.map(lv => {
        const pts = DIMS.map((_, i) => { const p = getP(i, (lv / MAX) * outerR); return `${p.x},${p.y}`; }).join(' ');
        return <polygon key={lv} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}

      {/* 轴线 */}
      {DIMS.map((_, i) => { const p = getP(i, outerR); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />; })}

      {/* 数据面 */}
      <polygon points={polyPts} fill="url(#ability-grad)" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />

      {/* 顶点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={DIMS[i].color} stroke="#0c0c11" strokeWidth="2" />
      ))}

      {/* 标签 */}
      {DIMS.map((d, i) => {
        const lp = getP(i, outerR + 20);
        const val = values?.[d.key] ?? 0;
        return (
          <g key={d.key}>
            <text x={lp.x} y={lp.y - 5} textAnchor="middle" dominantBaseline="middle" fill="#a1a1aa" fontSize="12" fontWeight="700" fontFamily="'Quicksand', sans-serif">{d.label}</text>
            <text x={lp.x} y={lp.y + 11} textAnchor="middle" dominantBaseline="middle" fill={d.color} fontSize="12" fontWeight="900" fontFamily="'Quicksand', sans-serif">{Number(val).toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

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

const LEVEL_LIST = ['1', '2', '3', '4', '5', '6', '7', '7+', '8', '8+', '9', '9+', '10', '10+', '11', '11+', '12', '12+', '13', '13+', '14', '14+', '15'];

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

const LXNS_CLIENT_ID = "eef52117-75ed-4283-b861-245375750e62";


const getRatingStyle = (rating) => {
  if (!rating) return { className: 'text-white', inline: {} };
  if (rating >= 16000) return {
    className: 'font-bold animate-pulse',
    inline: {
      background: 'linear-gradient(90deg, #f472b6, #a78bfa, #38bdf8, #34d399, #fbbf24, #f472b6)',
      backgroundSize: '300% 100%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.8))'
    }
  };
  if (rating >= 15000) return {
    className: '',
    inline: {
      background: 'linear-gradient(90deg, #f472b6, #a78bfa, #38bdf8)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    }
  };
  if (rating >= 14000) return { className: 'text-yellow-400', inline: {} };
  if (rating >= 13000) return { className: 'text-blue-400', inline: {} };
  if (rating >= 12000) return { className: 'text-orange-400', inline: {} };
  return { className: 'text-white', inline: {} };
}

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
  
  const [syncSource, setSyncSource] = useState('df');
  const [importToken, setImportToken] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [b50Filter, setB50Filter] = useState('DEFAULT');
  const [selectedPfScore, setSelectedPfScore] = useState(null);
  
  const [selectedPlateVersion, setSelectedPlateVersion] = useState('舞');

  // 🌟 玩家五维能力数据
  const [playerAbility, setPlayerAbility] = useState(null);
  const [abilityLoading, setAbilityLoading] = useState(false);


  const [levelBgCache] = useState(() => {
    const seed = Date.now();
    return { cache: new Map(), seed };
  });

  const isOwnProfile = profile && currentUser && (profile.username.toLowerCase() === currentUser.username.toLowerCase());

  const oauthCalled = useRef(false);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && isOwnProfile && !oauthCalled.current) {
      oauthCalled.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      executeLuoxueOAuthSync(code);
    }
  }, [isOwnProfile, username]);

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
          axios.get('/api/songs').catch(() => ({ data: [] }))
        ]);

        setProfile(profileRes.data);
        setImportToken(profileRes.data.importToken || '');
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
    
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/sync-maimai', { importToken }, { headers: { Authorization: `Bearer ${token}` } });
      
      addToast(res.data.msg || `同步成功！当前 Rating: ${res.data.rating}`, 'success');
      const profileRes = await axios.get(`/api/users/${username}?t=${Date.now()}`);
      setProfile(profileRes.data);
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请检查输入或网络', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const executeLuoxueOAuthSync = async (code) => {
    setIsSyncing(true);
    setSyncSource('lx'); 
    try {
      const token = localStorage.getItem('token');
      const currentRedirectUri = `${window.location.origin}/profile`;
      
      const res = await axios.post('/api/users/sync-luoxue-oauth', 
        { code, redirectUri: currentRedirectUri }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      addToast(res.data.msg || '落雪数据同步成功！', 'success');
      const profileRes = await axios.get(`/api/users/${username}?t=${Date.now()}`);
      setProfile(profileRes.data);
    } catch (err) {
      addToast(err.response?.data?.msg || '授权同步失败，可能是授权码已过期', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLuoxueOAuthLogin = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/profile`);
    const scopes = "read_user_profile+write_player+read_player+read_user_token";
    const authUrl = `https://maimai.lxns.net/oauth/authorize?response_type=code&client_id=${LXNS_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scopes}&state=${username}`;
    window.location.href = authUrl;
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
    if (plateType === '将') return ach >= 100;
    if (plateType === '极') return ['fc', 'fcp', 'ap', 'app'].includes(fc);
    if (plateType === '神') return ['ap', 'app'].includes(fc);
    if (plateType === '舞舞') return ['fsd', 'fsdp'].includes(fs); 
    return false;
  };

  const plateProgress = useMemo(() => {
    if (!musicData || musicData.length === 0 || !profile?.allScores) return null;

    const targetGroup = PLATE_VERSIONS.find(v => v.id === selectedPlateVersion);
    if (!targetGroup) return null;

    const validSongs = musicData.filter(s =>
      s.type !== 'UTAGE' && s.basic_info.genre !== '宴会場' && s.basic_info.genre !== '宴会场' &&
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

  const levelProgress = useMemo(() => {
    if (!musicData || musicData.length === 0 || !userScoreMap) return null;

    const data = LEVEL_LIST.map(lvl => ({
        level: lvl, total: 0, clear: 0, sss: 0, sssp: 0, fc: 0, fcp: 0, ap: 0, app: 0, songs: []
    }));
    const levelMap = {};
    data.forEach(d => levelMap[d.level] = d);

    musicData.forEach(song => {
        if (song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场') return;
        
        song.level.forEach((lvlStr, idx) => {
            if (levelMap[lvlStr]) {
                levelMap[lvlStr].total++;
                levelMap[lvlStr].songs.push(song.id);
                const score = userScoreMap.get(`${song.id}_${idx}`) || userScoreMap.get(`${Number(song.id)}_${idx}`);
                if (score) {
                    const ach = score.achievement || score.achievementRate || 0;
                    const fc = getFc(score);
                    
                    if (ach >= 80) levelMap[lvlStr].clear++;
                    if (ach >= 100.0) levelMap[lvlStr].sss++;
                    if (ach >= 100.5) levelMap[lvlStr].sssp++;
                    
                    if (['fc', 'fcp', 'ap', 'app'].includes(fc)) levelMap[lvlStr].fc++;
                    if (['fcp', 'ap', 'app'].includes(fc)) levelMap[lvlStr].fcp++;
                    if (['ap', 'app'].includes(fc)) levelMap[lvlStr].ap++;
                    if (fc === 'app') levelMap[lvlStr].app++;
                }
            }
        });
    });

    return data.filter(d => d.total > 0);
  }, [musicData, userScoreMap]);

  // 全版本全难度统计数据
  const globalStats = useMemo(() => {
    if (!musicData || musicData.length === 0 || !profile?.allScores) return null;
    let total = 0, clear = 0, s = 0, sp = 0, ss = 0, ssp = 0, sss = 0, sssp = 0;
    let fc = 0, fcp = 0, ap = 0, app = 0;
    let sync = 0, fs = 0, fsd = 0, fsdp = 0;
    let dx1 = 0, dx2 = 0, dx3 = 0, dx4 = 0, dx5 = 0;
    
    musicData.forEach(song => {
      if (song.type === 'UTAGE' || song.basic_info?.genre === '宴会場' || song.basic_info?.genre === '宴会场') return;
      song.level.forEach((lvl, idx) => {
        total++;
        const score = userScoreMap.get(`${song.id}_${idx}`) || userScoreMap.get(`${Number(song.id)}_${idx}`);
        if (!score) return;
        const ach = score.achievement || score.achievementRate || 0;
        const fcVal = getFc(score);
        const fsVal = getFs(score);
        const dxRatio = (score.dxRatio || 0) * 100;
        
        if (ach >= 80) clear++;
        if (ach >= 90) s++;
        if (ach >= 94) sp++;
        if (ach >= 97) ss++;
        if (ach >= 98) ssp++;
        if (ach >= 100) sss++;
        if (ach >= 100.5) sssp++;
        
        if (['fc','fcp','ap','app'].includes(fcVal)) fc++;
        if (['fcp','ap','app'].includes(fcVal)) fcp++;
        if (['ap','app'].includes(fcVal)) ap++;
        if (fcVal === 'app') app++;
        
        if (['sync','fs','fsd','fsdp'].includes(fsVal)) sync++;
        if (['fs','fsd','fsdp'].includes(fsVal)) fs++;
        if (['fsd','fsdp'].includes(fsVal)) fsd++;
        if (fsVal === 'fsdp') fsdp++;
        
        if (dxRatio >= 97) dx5++;
        else if (dxRatio >= 95) dx4++;
        else if (dxRatio >= 93) dx3++;
        else if (dxRatio >= 90) dx2++;
        else if (dxRatio >= 85) dx1++;
      });
    });
    
    return { total, clear, s, sp, ss, ssp, sss, sssp, fc, fcp, ap, app, sync, fs, fsd, fsdp, dx1, dx2, dx3, dx4, dx5 };
  }, [musicData, profile, userScoreMap]);

  // 跨版本牌子总收集统计
  const globalPlateStats = useMemo(() => {
    if (!musicData || musicData.length === 0 || !profile?.allScores) return null;
    const stats = { 将: 0, 极: 0, 神: 0, 舞舞: 0, total: PLATE_VERSIONS.length * 2 };
    let totalPlates = 0;
    PLATE_VERSIONS.forEach(group => {
      const validSongs = musicData.filter(s =>
        s.type !== 'UTAGE' && s.basic_info.genre !== '宴会場' && s.basic_info.genre !== '宴会场' &&
        group.versions.includes(s.basic_info.from)
      );
      const isMai = group.id === '舞';
      group.plates.forEach(p => {
        totalPlates++;
        const levelsToCheck = isMai ? [0,1,2,3,4] : (p.name === '真' ? [0,1,2,3] : [0,1,2,3]);
        let ji = 0, shen = 0, mai = 0, jiang = 0, total = 0;
        validSongs.forEach(song => {
          const lvls = levelsToCheck.filter(l => song.level.length > l);
          total += lvls.length;
          lvls.forEach(l => {
            const sc = userScoreMap.get(`${song.id}_${l}`);
            if (!sc) return;
            const ach = sc.achievement || sc.achievementRate || 0;
            const fc = getFc(sc);
            const fs = getFs(sc);
            if (ach >= 100) jiang++;
            if (['fc','fcp','ap','app'].includes(fc)) ji++;
            if (['ap','app'].includes(fc)) shen++;
            if (['fsd','fsdp'].includes(fs)) mai++;
          });
        });
        if (p.name !== '真' && jiang === total && total > 0) stats['将']++;
        if (ji === total && total > 0) stats['极']++;
        if (shen === total && total > 0) stats['神']++;
        if (mai === total && total > 0) stats['舞舞']++;
      });
    });
    stats.total = totalPlates;
    return stats;
  }, [musicData, profile, userScoreMap]);

  // ==========================================
  // 🌟 玩家五维能力计算引擎
  // 基于 Top50 成绩与各谱面雷达数据的加权聚合
  // ==========================================
  useEffect(() => {
    if (!profile?.allScores || profile.allScores.length === 0) return;

    const computeAbility = async () => {
      setAbilityLoading(true);
      try {
        // 取 Top50 成绩（按 rating 排序）
        const top50 = [...profile.allScores]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 50);

        const DIMS = ['stamina', 'tech', 'stable', 'accuracy', 'burst'];
        const dimAccum = { stamina: 0, tech: 0, stable: 0, accuracy: 0, burst: 0 };
        const dimWeight = { stamina: 0, tech: 0, stable: 0, accuracy: 0, burst: 0 };

        // 批量拉取这 50 首歌的雷达数据
        const radarPromises = top50.map((score, idx) =>
          axios.get(`/api/songs/${score.songId}/radar`)
            .then(res => ({ idx, score, radar: res.data?.finalRadar?.[score.level] ?? null }))
            .catch(() => ({ idx, score, radar: null }))
        );

        const results = await Promise.all(radarPromises);

        results.forEach(({ idx, score, radar }) => {
          if (!radar) return;
          // 衰减权重：第 1 名权重 1.0，每增加一名乘以 0.95
          const decayWeight = Math.pow(0.95, idx);
          // 成绩质量系数：基于达成率
          const ach = score.achievement || 0;
          let achFactor = 0.5;
          if (ach >= 100.5) achFactor = 1.0;
          else if (ach >= 100.0) achFactor = 0.85;
          else if (ach >= 99.0) achFactor = 0.7;
          else if (ach >= 97.0) achFactor = 0.6;

          const w = decayWeight * achFactor;

          DIMS.forEach(dim => {
            const dimVal = radar[dim] ?? 5;
            // 玩家在这个维度的表现 = 谱面该维度难度 × 成绩质量
            // 高难度谱面打高分 → 能力值高
            dimAccum[dim] += dimVal * achFactor * w;
            dimWeight[dim] += w;
          });
        });

        const ability = {};
        DIMS.forEach(dim => {
          if (dimWeight[dim] === 0) {
            ability[dim] = 0;
          } else {
            // 归一化到 0~10，以全谱 10.0 × achFactor 期望值校准
            const raw = dimAccum[dim] / dimWeight[dim];
            ability[dim] = Math.min(10, Math.round(raw * 10) / 10);
          }
        });

        setPlayerAbility(ability);
      } catch (err) {
        console.warn('玩家能力计算失败:', err);
      } finally {
        setAbilityLoading(false);
      }
    };

    computeAbility();
  }, [profile?.allScores]);

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
    else if (b50Filter === 'LOCK50') scores = scores.filter(s =>
      (s.achievement >= 100.0000 && s.achievement <= 100.0500) ||
      (s.achievement >= 100.5000 && s.achievement <= 100.5500)
    );
    else if (b50Filter === 'CUN50') scores = scores.filter(s =>
      (s.achievement >= 99.9000 && s.achievement <= 99.9999) ||
      (s.achievement >= 100.4500 && s.achievement <= 100.4999)
    );
    else if (b50Filter === 'YUE50') scores = scores.filter(s => s.achievement < 97.0000);

    scores.sort((a, b) => b.rating - a.rating || b.achievement - a.achievement);
    
    if (b50Filter === 'DEFAULT' || b50Filter === 'IDEAL') {
      const isNewRecord = (s) => newSongIds.has(String(s.songId));
      const oldScores = scores.filter(s => !isNewRecord(s)).slice(0, 35);
      const newScores = scores.filter(s => isNewRecord(s)).slice(0, 15);
      const totalRating = [...oldScores, ...newScores].reduce((sum, s) => sum + (s.rating || 0), 0);
      return { b35: oldScores, r15: newScores, rating: totalRating };
    } else {
      const top50 = scores.slice(0, 50);
      const totalRating = top50.reduce((sum, s) => sum + (s.rating || 0), 0);
      return { b35: top50, r15: [], rating: totalRating };
    }
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

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-cyan-500/30 relative pb-24 overflow-x-hidden">
      
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">
        
        <button 
          onClick={() => navigate(`/profile/${profile.username}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95 mb-6"
        >
          <FaArrowLeft /> 返回个人主页
        </button>

        {/* New Header with Banner background, Avatar + Username + Rank with rating color */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border border-white/[0.05] p-6 rounded-2xl">
          {/* Banner background with overlay */}
          {profile.bannerUrl ? (
            <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ zIndex: 0 }}>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${profile.bannerUrl})`,
                  filter: 'brightness(0.35) saturate(0.7) blur(1px)'
                }}
              />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#15151e] to-transparent rounded-2xl" style={{ zIndex: 0 }} />
          )}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ zIndex: 1 }} />

          <div className="relative flex items-center gap-6 z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img 
                src={profile.avatarUrl || '/assets/logos.png'} 
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover border-2 border-cyan-400/30 shadow-lg"
                onError={(e) => { e.target.src = '/assets/logos.png'; }}
              />
              {profile.maimaiRank && profile.maimaiRank <= 200 && (
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 via-pink-400 to-purple-400 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse">
                  <span className="text-xs font-black text-white" style={{ fontFamily: "'Quicksand', sans-serif" }}>#{profile.maimaiRank}</span>
                </div>
              )}
            </div>
            
            {/* Username + Title and Rating with dynamic color */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-extrabold text-zinc-100 tracking-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {profile.username}
                </h1>
                {profile.maimaiRank && profile.maimaiRank <= 200 && (
                  <div className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/40 rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                    <FaTrophy className="text-amber-400 text-sm" />
                    <span className="text-xs font-bold text-amber-300">TOP 200</span>
                  </div>
                )}
              </div>
              {profile.rating && (
                <div className="flex items-center gap-2 text-sm">
                  {(() => {
                    const rs = getRatingStyle(profile.rating);
                    return (
                      <span
                        className={`${rs.className} font-bold`}
                        style={{ fontFamily: "'Quicksand', sans-serif", fontSize: '1.5rem', ...rs.inline }}
                      >
                        Rating {profile.rating}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Sync controls */}
          {isOwnProfile && (
            <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
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
                  <>
                    <input 
                      type="password" 
                      value={importToken}
                      onChange={(e) => setImportToken(e.target.value)}
                      placeholder="粘贴水鱼 Import-token..."
                      className="w-full md:w-64 bg-transparent border-none text-zinc-200 px-3 py-2 text-sm focus:outline-none placeholder-zinc-600 font-mono"
                    />
                    <button 
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="bg-cyan-500 hover:bg-cyan-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 active:scale-95"
                    >
                      {isSyncing ? <FaSpinner className="animate-spin" /> : <><FaSyncAlt /> 同步云端</>}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleLuoxueOAuthLogin}
                    disabled={isSyncing}
                    className="w-full md:w-[364px] bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isSyncing ? <FaSpinner className="animate-spin" /> : '🔗 使用落雪账号授权并拉取数据'}
                  </button>
                )}
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
            <div className="mb-10 border-b border-white/[0.05] pb-10">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">牌子进度追踪</h2>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {PLATE_VERSIONS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedPlateVersion(v.id)}
                      className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all active:scale-95 border-b-2 ${
                        selectedPlateVersion === v.id
                          ? 'border-amber-400 text-amber-300'
                          : 'border-transparent text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {!plateProgress || !globalStats ? (
                <div className="py-8 text-zinc-500 text-sm font-medium flex items-center gap-3">
                  <FaSpinner className="animate-spin text-xl" /> 正在拉取云端曲库数据...
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Big ring + stats dashboard (40%) */}
                  <div className="lg:w-[40%] flex flex-col gap-4">
                    {/* Big ring */}
                    <div className={`bg-[#15151e] border p-8 flex flex-col items-center ${globalStats.clear === globalStats.total && globalStats.total > 0 ? 'border-gradient shadow-[0_0_12px_rgba(21,247,255,0.4)]' : 'border-white/[0.05]'}`}>
                      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                        <svg className="-rotate-90 w-full h-full" viewBox="0 0 200 200">
                          <circle cx="100" cy="100" r="85" strokeWidth="14" fill="transparent" className="text-[#0c0c11]" stroke="currentColor" />
                          <motion.circle
                            cx="100" cy="100" r="85" strokeWidth="14" fill="transparent"
                            stroke="currentColor" className={
                              globalStats.clear === globalStats.total && globalStats.total > 0
                                ? 'text-gradient animate-gradient-x'
                                : 'text-cyan-400'}
                            strokeDasharray={2 * Math.PI * 85}
                            initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - globalStats.clear / globalStats.total) }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-5xl font-black text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {((globalStats.clear / globalStats.total) * 100).toFixed(2)}<span className="text-2xl">%</span>
                          </span>
                          <span className="text-sm text-zinc-500 mt-2 font-bold">全谱通关率</span>
                        </div>
                      </div>
                      <div className={`text-center text-xs font-bold ${globalStats.clear === globalStats.total && globalStats.total > 0 ? 'text-cyan-400' : 'text-zinc-500'}`}>
                        {globalStats.clear} / {globalStats.total} 谱面已通关
                      </div>
                    </div>
                    
                    {/* Stats dashboard - progress bar style */}
                    <div className="bg-[#15151e] border border-white/[0.05] p-5">
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">全版本全难度统计</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'S',    value: globalStats.s,    bar: '#a1a1aa', lightText: 'text-zinc-100', darkText: 'text-zinc-900' },
                          { label: 'S+',   value: globalStats.sp,   bar: '#d4d4d8', lightText: 'text-zinc-100', darkText: 'text-zinc-900' },
                          { label: 'SS',   value: globalStats.ss,   bar: '#34d399', lightText: 'text-emerald-100', darkText: 'text-emerald-950' },
                          { label: 'SS+',  value: globalStats.ssp,  bar: '#6ee7b7', lightText: 'text-emerald-100', darkText: 'text-emerald-950' },
                          { label: 'SSS',  value: globalStats.sss,  bar: '#fbbf24', lightText: 'text-amber-100', darkText: 'text-amber-950' },
                          { label: 'SSS+', value: globalStats.sssp, bar: '#fde68a', lightText: 'text-amber-100', darkText: 'text-amber-950' },
                          { label: 'FC',   value: globalStats.fc,   bar: '#f472b6', lightText: 'text-pink-100', darkText: 'text-pink-950' },
                          { label: 'FC+',  value: globalStats.fcp,  bar: '#f9a8d4', lightText: 'text-pink-100', darkText: 'text-pink-950' },
                          { label: 'AP',   value: globalStats.ap,   bar: '#c084fc', lightText: 'text-purple-100', darkText: 'text-purple-950' },
                          { label: 'AP+',  value: globalStats.app,  bar: '#e879f9', lightText: 'text-purple-100', darkText: 'text-purple-950' },
                          { label: 'FDX',  value: globalStats.fsd,  bar: '#818cf8', lightText: 'text-indigo-100', darkText: 'text-indigo-950' },
                          { label: 'FDX+', value: globalStats.fsdp, bar: '#a5b4fc', lightText: 'text-indigo-100', darkText: 'text-indigo-950' },
                        ].map(({ label, value, bar, lightText, darkText }) => {
                          const pct = globalStats.total > 0 ? Math.min((value / globalStats.total) * 100, 100) : 0;
                          const isFull = value >= globalStats.total && globalStats.total > 0;
                          return (
                            <div key={label} className="relative h-14 rounded overflow-hidden bg-[#0c0c11] border border-white/[0.05]">
                              {/* 进度条背景 */}
                              {isFull ? (
                                <div className="absolute inset-0 animate-pulse" style={{
                                  background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#34d399,#fbbf24)'
                                }} />
                              ) : (
                                <div
                                  className="absolute left-0 top-0 h-full transition-all duration-1000"
                                  style={{ width: `${pct}%`, background: bar, opacity: 0.85 }}
                                />
                              )}
                              {/* 标签和数字 */}
                              <div className="absolute inset-0 flex flex-col items-end justify-center pr-2 z-10">
                                <span className={`text-2xl font-black leading-none ${isFull ? 'text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]' : (pct > 70 ? darkText : lightText)}`}
                                  style={{ fontFamily: "'Quicksand', sans-serif",
                                    textShadow: isFull ? '0 0 8px rgba(0,0,0,0.6)' : (pct > 70 ? 'none' : '0 2px 8px rgba(0,0,0,0.8)')
                                  }}>
                                  {value}
                                </span>
                                <span className={`text-[11px] font-bold leading-none mt-0.5 ${isFull ? 'text-white/80' : (pct > 70 ? darkText : lightText)} ${pct > 70 ? 'opacity-80' : 'opacity-90'}`}
                                  style={{ fontFamily: "'Quicksand', sans-serif",
                                    textShadow: pct > 70 ? 'none' : '0 1px 4px rgba(0,0,0,0.8)'
                                  }}>
                                  {pct.toFixed(2)}%
                                </span>
                              </div>
                              {/* 左侧 label */}
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* DX 星星行 - 使用图片图标 */}
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {[
                          { stars: 1, value: globalStats.dx1, bar: '#71717a' },
                          { stars: 2, value: globalStats.dx2, bar: '#a1a1aa' },
                          { stars: 3, value: globalStats.dx3, bar: '#f59e0b' },
                          { stars: 4, value: globalStats.dx4, bar: '#fbbf24' },
                          { stars: 5, value: globalStats.dx5, bar: '#fde68a' },
                        ].map(({ stars, value, bar }) => {
                          const pct = globalStats.total > 0 ? Math.min((value / globalStats.total) * 100, 100) : 0;
                          const isFull = value >= globalStats.total && globalStats.total > 0;
                          return (
                            <div key={stars} className="relative h-16 rounded overflow-hidden bg-[#0c0c11] border border-white/[0.05] flex flex-col">
                              {isFull ? (
                                <div className="absolute inset-0 animate-pulse" style={{
                                  background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#34d399,#fbbf24)'
                                }} />
                              ) : (
                                <div
                                  className="absolute left-0 bottom-0 w-full transition-all duration-1000"
                                  style={{ height: `${pct}%`, background: bar, opacity: 0.7 }}
                                />
                              )}
                              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-0.5 px-1">
                                <img
                                  src={`/assets/${stars}dxstar.png`}
                                  alt={`${stars}star`}
                                  className="w-5 h-5 object-contain"
                                />
                                <span className="text-base font-black text-white leading-none" style={{ fontFamily: "'Quicksand', sans-serif",
                                  textShadow: '0 0 6px rgba(0,0,0,0.8)'
                                }}>{value}</span>
                                <span className="text-[9px] font-bold text-white/70" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Plate progress (60%) */}
                  <div className="lg:w-[60%] flex flex-col gap-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {plateProgress.filter(p => ['将','极','神','舞舞'].some(t => p.type === t)).map((plate, idx) => {
                      const pct = plate.total > 0 ? (plate.count / plate.total) * 100 : 0;
                      const r = 38;
                      const circ = 2 * Math.PI * r;
                      const offset = circ - (Math.min(pct, 100) / 100) * circ;
                      const isCompleted = plate.count === plate.total && plate.total > 0;
                      const bgImg = plate.customImg ? `/assets/${plate.customImg}.png` : `/assets/${plate.imgPrefix}_${plate.imgSuffix}.png`;
                      const plateColorBase = plate.color.split(' ')[0];
                      return (
                        <div
                          key={idx}
                          onClick={() => navigate(`/profile/${username}/maimai/plate/${encodeURIComponent(selectedPlateVersion)}_${encodeURIComponent(plate.type)}`)}
                          className={`relative bg-[#15151e] border p-5 flex flex-col items-center gap-3 cursor-pointer transition-all group overflow-hidden ${
                            isCompleted
                              ? 'border-transparent ring-2 ring-offset-1 ring-offset-[#0c0c11] ring-fuchsia-400 shadow-[0_0_18px_rgba(240,100,255,0.5)]'
                              : 'border-white/[0.05] hover:bg-[#1a1a24] hover:border-amber-500/20'
                          }`}
                        >
                          {/* 满进度流光动画叠层 */}
                          {isCompleted && (
                            <div className="absolute inset-0 pointer-events-none z-0 animate-pulse"
                              style={{
                                background: 'linear-gradient(120deg, rgba(244,114,182,0.12), rgba(167,139,250,0.12), rgba(56,189,248,0.12), rgba(52,211,153,0.12))',
                              }}
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <img src={bgImg} alt="" className="h-full w-auto max-w-none object-contain opacity-[0.15] group-hover:opacity-[0.22] transition-opacity" loading="eager" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/80 to-[#0c0c11]/40 pointer-events-none"></div>

                          {/* 圆环 */}
                          <div className="relative w-32 h-32 flex items-center justify-center z-10">
                            <svg className="-rotate-90 w-full h-full" viewBox="0 0 128 128">
                              <circle cx="64" cy="64" r="44" strokeWidth="9" fill="transparent" stroke="#0c0c11" />
                              {isCompleted ? (
                                <>
                                  <defs>
                                    <linearGradient id={`plate-grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor="#f472b6" />
                                      <stop offset="33%" stopColor="#a78bfa" />
                                      <stop offset="66%" stopColor="#38bdf8" />
                                      <stop offset="100%" stopColor="#34d399" />
                                    </linearGradient>
                                  </defs>
                                  <motion.circle
                                    cx="64" cy="64" r="44" strokeWidth="9" fill="transparent"
                                    stroke={`url(#plate-grad-${idx})`}
                                    strokeDasharray={2 * Math.PI * 44}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                                    animate={{ strokeDashoffset: 0 }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    strokeLinecap="round"
                                  />
                                </>
                              ) : (
                                <motion.circle
                                  cx="64" cy="64" r="44" strokeWidth="9" fill="transparent"
                                  stroke="currentColor"
                                  className={plateColorBase}
                                  strokeDasharray={2 * Math.PI * 44}
                                  initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                                  animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100) }}
                                  transition={{ duration: 1.2, ease: 'easeOut' }}
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              {isCompleted ? (
                                <span className="text-2xl font-black" style={{
                                  fontFamily: "'Quicksand', sans-serif",
                                  background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#34d399)',
                                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                                }}>
                                  100.00<span className="text-sm">%</span>
                                </span>
                              ) : (
                                <span className={`text-2xl font-black ${plateColorBase}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                  {pct.toFixed(2)}<span className="text-sm">%</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 名称和进度数字 */}
                          <div className="text-center z-10">
                            {isCompleted ? (
                              <div className="text-base font-black tracking-widest" style={{
                                background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                              }}>{plate.name}</div>
                            ) : (
                              <div className={`text-sm font-bold tracking-widest ${plateColorBase}`}>{plate.name}</div>
                            )}
                            <div className={`text-sm font-bold mt-0.5 ${isCompleted ? 'text-fuchsia-300' : 'text-zinc-400'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                              {plate.count} <span className="text-zinc-600">/</span> {plate.total}
                            </div>
                          </div>
                          <div className="text-[10px] text-zinc-600 group-hover:text-amber-400 transition-colors z-10">点击查看详情 →</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 次要牌子（霸者）横条 */}
                  {plateProgress.filter(p => p.type === '霸者').map((plate, idx) => {
                    const pct = plate.total > 0 ? (plate.count / plate.total) * 100 : 0;
                    const targetGroup = PLATE_VERSIONS.find(v => v.id === selectedPlateVersion);
                    return (
                      <div key={idx} className="bg-[#15151e] border border-white/[0.05] p-4 flex items-center gap-6">
                        <div className="flex flex-col w-20 shrink-0">
                          <span className="text-xs font-bold text-zinc-400 tracking-widest">{plate.name}</span>
                          <span className="text-lg font-bold text-zinc-300" style={{ fontFamily: "'Quicksand', sans-serif" }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="h-2 w-full bg-[#0c0c11] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full ${plate.bar}`}
                            />
                          </div>
                          <div className="text-xs text-zinc-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>{plate.count} / {plate.total} 谱面已通关</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 跨版本牌子总收集统计 */}
                  {globalPlateStats && (
                    <div className="bg-[#15151e] border border-white/[0.05] p-5">
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">跨版本牌子收集统计</div>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { type: '将', solidColor: '#34d399', gradStart: '#34d399', gradEnd: '#6ee7b7', textColor: 'text-emerald-300' },
                          { type: '极', solidColor: '#fbbf24', gradStart: '#f59e0b', gradEnd: '#fde68a', textColor: 'text-amber-300' },
                          { type: '神', solidColor: '#38bdf8', gradStart: '#0ea5e9', gradEnd: '#7dd3fc', textColor: 'text-sky-300' },
                          { type: '舞舞', solidColor: '#f472b6', gradStart: '#ec4899', gradEnd: '#f9a8d4', textColor: 'text-pink-300' },
                        ].map(({ type, solidColor, gradStart, gradEnd, textColor }) => {
                          const val = globalPlateStats[type];
                          const total = globalPlateStats.total;
                          const pct = total > 0 ? (val / total) * 100 : 0;
                          const isFull = val >= total && total > 0;
                          const r = 36;
                          const circ = 2 * Math.PI * r;
                          const offset = circ - (Math.min(pct, 100) / 100) * circ;
                          const gradId = `gplate-${type}`;
                          return (
                            <div key={type} className={`flex flex-col items-center gap-3 p-3 rounded-xl border transition-all ${
                              isFull
                                ? 'border-fuchsia-400/50 shadow-[0_0_14px_rgba(240,100,255,0.4)] bg-[#1a1a2e]'
                                : 'border-white/[0.05] bg-[#0c0c11]'
                            }`}>
                              {/* 圆环 */}
                              <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="-rotate-90 w-full h-full" viewBox="0 0 96 96">
                                  <defs>
                                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor={gradStart} />
                                      <stop offset="100%" stopColor={gradEnd} />
                                    </linearGradient>
                                    {isFull && (
                                      <linearGradient id={`${gradId}-full`} x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#f472b6" />
                                        <stop offset="33%" stopColor="#a78bfa" />
                                        <stop offset="66%" stopColor="#38bdf8" />
                                        <stop offset="100%" stopColor="#34d399" />
                                      </linearGradient>
                                    )}
                                  </defs>
                                  <circle cx="48" cy="48" r={r} strokeWidth="7" fill="transparent" stroke="#1a1a2e" />
                                  <motion.circle
                                    cx="48" cy="48" r={r} strokeWidth="7" fill="transparent"
                                    stroke={isFull ? `url(#${gradId}-full)` : `url(#${gradId})`}
                                    strokeDasharray={circ}
                                    initial={{ strokeDashoffset: circ }}
                                    animate={{ strokeDashoffset: isFull ? 0 : offset }}
                                    transition={{ duration: 1.3, ease: 'easeOut' }}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                  {isFull ? (
                                    <span className="text-2xl font-black" style={{
                                      fontFamily: "'Quicksand', sans-serif",
                                      background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8)',
                                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                                    }}>{val}</span>
                                  ) : (
                                    <span className={`text-2xl font-black ${textColor}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{val}</span>
                                  )}
                                  <span className="text-[10px] text-zinc-500 font-bold" style={{ fontFamily: "'Quicksand', sans-serif" }}>/ {total}</span>
                                </div>
                              </div>
                              {/* 类型名称 */}
                              {isFull ? (
                                <span className="text-sm font-black tracking-widest" style={{
                                  background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8)',
                                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                                }}>{type}牌</span>
                              ) : (
                                <span className={`text-sm font-bold tracking-widest ${textColor}`}>{type}牌</span>
                              )}
                              {/* 底部进度条 */}
                              <div className="w-full h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                                {isFull ? (
                                  <div className="h-full w-full animate-pulse" style={{
                                    background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#34d399)'
                                  }} />
                                ) : (
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: solidColor }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                  />
                                )}
                              </div>
                              {/* 百分比 */}
                              <span className={`text-xs font-bold ${isFull ? 'text-fuchsia-300' : 'text-zinc-500'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ====== 3-4 玩家能力雷达图（基于谱面评价数据实时计算）====== */}
                  <div className="bg-[#15151e] border border-white/[0.05] p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.6)]"></div>
                        <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">玩家能力</span>
                      </div>
                      {abilityLoading && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <FaSpinner className="animate-spin text-indigo-400" />
                          计算中...
                        </div>
                      )}
                    </div>

                    {playerAbility ? (
                      <div className="flex flex-col items-center gap-4">
                        {/* 使用公共 RadarChart 组件 */}
                        <RadarChartInline
                          values={playerAbility}
                          size={260}
                        />

                        {/* 数值列表 */}
                        <div className="grid grid-cols-5 gap-2 w-full">
                          {[
                            ['耐力', 'stamina',  '#f472b6'],
                            ['技巧', 'tech',     '#fbbf24'],
                            ['稳定', 'stable',   '#34d399'],
                            ['准度', 'accuracy', '#38bdf8'],
                            ['爆发', 'burst',    '#a78bfa'],
                          ].map(([label, key, color]) => (
                            <div key={key} className="flex flex-col items-center gap-1 p-2 bg-[#0c0c11] rounded-lg border border-white/[0.04]">
                              <span className="text-[9px] font-bold" style={{ color }}>{label}</span>
                              <span className="text-base font-black" style={{ fontFamily: "'Quicksand', sans-serif", color }}>
                                {Number(playerAbility[key] ?? 0).toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[10px] text-zinc-600 text-center">
                          基于 Top 50 成绩 × 谱面五维评价数据 · 衰减加权聚合 · 满分 10.0
                        </p>
                      </div>
                    ) : !abilityLoading ? (
                      <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <span className="text-xl text-indigo-400">◆</span>
                        </div>
                        <p className="text-xs text-zinc-500">暂无能力数据</p>
                        <p className="text-[10px] text-zinc-600">需要更多谱面五维评价数据才能计算</p>
                      </div>
                    ) : null}
                  </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-14 border-b border-white/[0.05] pb-10">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-pink-400 rounded-full shadow-[0_0_8px_rgba(244,114,182,0.6)]"></div>
                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">等级进度追踪</h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {levelProgress && levelProgress.map((lvl) => {
                    const isAllAPP = lvl.app === lvl.total;
                    const isAllAP = lvl.ap === lvl.total;
                    const isAllFCp = lvl.fcp === lvl.total;
                    const isAllFC = lvl.fc === lvl.total;
                    const isAllSSSp = lvl.sssp === lvl.total;
                    const isAllSSS = lvl.sss === lvl.total;

                    let baseClass = 'border-white/[0.05] bg-[#15151e] hover:bg-[#1a1a24]';
                    let glowClass = '';
                    let ringColor = 'text-zinc-600';
                    let displayPct = (lvl.clear / lvl.total) * 100;

                    if (isAllAPP) {
                        baseClass = 'border-transparent bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20';
                        glowClass = 'ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
                        ringColor = 'text-purple-400';
                        displayPct = 100;
                    } else if (isAllAP) {
                        baseClass = 'border-white/[0.05] bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 hover:brightness-110';
                        ringColor = 'text-cyan-400';
                        displayPct = (lvl.ap / lvl.total) * 100;
                    } else if (isAllFCp) {
                        baseClass = 'border-white/[0.05] bg-emerald-500/20 hover:bg-emerald-500/30';
                        ringColor = 'text-emerald-400';
                        displayPct = (lvl.fcp / lvl.total) * 100;
                    } else if (isAllFC) {
                        baseClass = 'border-white/[0.05] bg-emerald-500/10 hover:bg-emerald-500/20';
                        ringColor = 'text-emerald-400';
                        displayPct = (lvl.fc / lvl.total) * 100;
                    } else if (isAllSSSp) {
                        glowClass = 'border-amber-500 ring-1 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
                        ringColor = 'text-amber-400';
                        displayPct = (lvl.sssp / lvl.total) * 100;
                    } else if (isAllSSS) {
                        glowClass = 'border-amber-300/60 ring-1 ring-amber-300/50 shadow-[0_0_8px_rgba(252,211,77,0.2)]';
                        ringColor = 'text-amber-300';
                        displayPct = (lvl.sss / lvl.total) * 100;
                    }

                    const r = 32;
                    const circ = 2 * Math.PI * r;
                    const offset = circ - (Math.min(displayPct, 100) / 100) * circ;

                    const bgKey = lvl.level;
                    if (!levelBgCache.cache.has(bgKey)) {
                      const rawRng = Math.sin(levelBgCache.seed + lvl.level.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) * 10000;
                      const idx = Math.floor((rawRng - Math.floor(rawRng)) * lvl.songs.length);
                      const pickedId = lvl.songs[Math.max(0, Math.min(idx, lvl.songs.length - 1))];
                      levelBgCache.cache.set(bgKey, `https://www.diving-fish.com/covers/${String(pickedId).padStart(5, '0')}.png`);
                    }

                    // 角标可叠加显示（优先级：AP+>AP>FC+>FC>SSS+>SSS，同时出现时一起显示）
                    const badges = [];
                    if (isAllAPP) badges.push({ label: 'AP+', cls: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_0_6px_rgba(168,85,247,0.7)]' });
                    else if (isAllAP) badges.push({ label: 'AP', cls: 'bg-indigo-500 text-white shadow-[0_0_6px_rgba(99,102,241,0.6)]' });
                    else if (isAllFCp) badges.push({ label: 'FC+', cls: 'bg-emerald-500 text-white shadow-[0_0_6px_rgba(16,185,129,0.6)]' });
                    else if (isAllFC) badges.push({ label: 'FC', cls: 'bg-emerald-700 text-white' });
                    if (isAllSSSp) badges.push({ label: 'SSS+', cls: 'bg-amber-400 text-amber-950' });
                    else if (isAllSSS) badges.push({ label: 'SSS', cls: 'bg-amber-300 text-amber-950' });

                    // 边框优先级: 绿<金<流动深绿<彩色<流动彩色
                    let borderStyle = {};
                    let extraOverlay = null;
                    if (isAllAPP) {
                      borderStyle = { border: '2px solid transparent', backgroundClip: 'padding-box',
                        boxShadow: '0 0 0 2px #a78bfa, 0 0 20px rgba(167,139,250,0.5), 0 0 40px rgba(244,114,182,0.3)' };
                      extraOverlay = <div className="absolute inset-0 pointer-events-none z-0 animate-pulse" style={{ background: 'linear-gradient(120deg,rgba(244,114,182,0.15),rgba(167,139,250,0.15),rgba(56,189,248,0.15),rgba(52,211,153,0.15))' }} />;
                    } else if (isAllAP) {
                      borderStyle = { boxShadow: '0 0 0 2px #818cf8, 0 0 14px rgba(129,140,248,0.5)' };
                    } else if (isAllFCp) {
                      borderStyle = { boxShadow: '0 0 0 2px #10b981, 0 0 12px rgba(16,185,129,0.5)' };
                    } else if (isAllFC) {
                      borderStyle = { boxShadow: '0 0 0 1.5px #059669' };
                    } else if (isAllSSSp) {
                      borderStyle = { boxShadow: '0 0 0 1.5px #f59e0b, 0 0 10px rgba(245,158,11,0.4)' };
                    } else if (isAllSSS) {
                      borderStyle = { boxShadow: '0 0 0 1.5px #fcd34d, 0 0 8px rgba(252,211,77,0.3)' };
                    }

                    return (
                        <div
                          key={lvl.level}
                          onClick={() => navigate(`/profile/${username}/maimai/level/${encodeURIComponent(lvl.level)}`)}
                          className={`relative p-5 border-0 transition-all cursor-pointer group flex flex-col items-center gap-3 overflow-hidden rounded-xl ${baseClass}`}
                          style={borderStyle}
                        >
                            {extraOverlay}
                            <img src={levelBgCache.cache.get(bgKey)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/60 to-transparent pointer-events-none"></div>

                            {/* 圆环（更大更粗） */}
                            <div className="relative w-24 h-24 flex items-center justify-center z-10">
                              <svg className="-rotate-90 w-full h-full" viewBox="0 0 96 96">
                                <circle cx="48" cy="48" r={r} strokeWidth="7" fill="transparent" stroke="#0c0c11" />
                                {isAllAPP ? (
                                  <>
                                    <defs>
                                      <linearGradient id={`lvl-grad-${lvl.level}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#f472b6" />
                                        <stop offset="33%" stopColor="#a78bfa" />
                                        <stop offset="66%" stopColor="#38bdf8" />
                                        <stop offset="100%" stopColor="#34d399" />
                                      </linearGradient>
                                    </defs>
                                    <motion.circle cx="48" cy="48" r={r} strokeWidth="7" fill="transparent"
                                      stroke={`url(#lvl-grad-${lvl.level})`}
                                      strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                                      animate={{ strokeDashoffset: 0 }}
                                      transition={{ duration: 1, ease: 'easeOut' }} strokeLinecap="round" />
                                  </>
                                ) : (
                                  <motion.circle cx="48" cy="48" r={r} strokeWidth="7" fill="transparent"
                                    stroke="currentColor" className={ringColor}
                                    strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                                    animate={{ strokeDashoffset: offset }}
                                    transition={{ duration: 1, ease: 'easeOut' }} strokeLinecap="round" />
                                )}
                              </svg>
                              <div className="absolute flex flex-col items-center">
                                <span className="text-2xl font-black text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                  {lvl.level}
                                </span>
                              </div>
                            </div>

                            {/* 统计数字强调 */}
                            <div className="flex flex-col items-center gap-1 z-10">
                              <span className={`text-base font-black ${
                                isAllAPP ? 'text-fuchsia-300' : isAllAP ? 'text-indigo-300' : isAllFCp || isAllFC ? 'text-emerald-300' : isAllSSSp ? 'text-amber-300' : isAllSSS ? 'text-amber-200' : 'text-zinc-300'
                              }`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                {lvl.clear} <span className="text-zinc-600 font-bold text-sm">/</span> {lvl.total}
                              </span>

                              {/* 可叠加角标 */}
                              {badges.length > 0 && (
                                <div className="flex gap-1 flex-wrap justify-center">
                                  {badges.map(b => (
                                    <span key={b.label} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${b.cls}`}>{b.label}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                        </div>
                    )
                })}
              </div>
            </div>

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
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> {b50Filter === 'DEFAULT' || b50Filter === 'IDEAL' ? 'Standard Tracks (B35)' : 'Top 50 Tracks'}
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
              {/* PF50 Analysis */}
              {pf100Data.length > 0 && (() => {
                const pf50 = pf100Data.slice(0, 50);
                const avgPf = pf50.reduce((sum, s) => sum + (s.pf || 0), 0) / 50;
                const levelDist = pf50.reduce((acc, s) => {
                  const lv = getLevelString(s);
                  acc[lv] = (acc[lv] || 0) + 1;
                  return acc;
                }, {});
                return (
                  <div className="mb-14 border-b border-white/[0.05] pb-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-6 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.5)]"></div>
                      <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">PF50 分析</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#15151e] border border-white/[0.05] p-5 rounded-2xl">
                        <div className="text-sm text-zinc-500 mb-2">平均 PF 值</div>
                        <div className="text-3xl font-black text-purple-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>{avgPf.toFixed(2)}</div>
                      </div>
                      <div className="bg-[#15151e] border border-white/[0.05] p-5 rounded-2xl">
                        <div className="text-sm text-zinc-500 mb-3">等级分布</div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(levelDist).sort((a,b) => parseFloat(b[0]) - parseFloat(a[0])).map(([lv, cnt]) => (
                            <div key={lv} className="text-center">
                              <div className="text-xs text-zinc-600 mb-1">{lv}</div>
                              <div className="text-lg font-bold text-zinc-300" style={{ fontFamily: "'Quicksand', sans-serif" }}>{cnt}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

        {/* ========================================== */}
        {/* PF 详情模态窗 (重写并对齐 pfCalculator.js 逻辑) */}
        {/* ========================================== */}
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
                  const ach = selectedPfScore.achievement || selectedPfScore.achievementRate || 0;
                  const dxScore = selectedPfScore.dxScore || 0;
                  const dxRatio = selectedPfScore.dxRatio || 0;
                  const maxDxScore = dxRatio > 0 ? Math.round(dxScore / dxRatio) : 0;
                  const constant = selectedPfScore.constant || 0;

                  // 1. 难度基数：(定数 - 5)^3
                  const baseDiff = Math.pow(Math.max(0, constant - 5), 3);

                  // 2. 达成率乘区计算 (严格对齐 pfCalculator.js 凹函数曲线)
                  let achMultiplier = 0;
                  if (ach >= 101.0) {
                    achMultiplier = 0.60;
                  } else if (ach >= 100.0) {
                    achMultiplier = 0.40 + 0.20 * Math.pow((ach - 100.0) / 1.0, 2);
                  } else if (ach >= 97.0) {
                    achMultiplier = 0.10 + 0.30 * Math.pow((ach - 97.0) / 3.0, 2);
                  } else if (ach >= 80.0) {
                    achMultiplier = 0.10 * Math.pow((ach - 80.0) / 17.0, 2);
                  }

                  // 3. DX 乘区计算
                  const dxMultiplier = 0.40 * Math.pow(dxRatio, 2);

                  // 4. 总乘数
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
                           <span className="text-zinc-500">达成率乘区 <span className="text-[10px] font-medium opacity-50">/ 0.6</span></span>
                           <span className="text-cyan-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>{achMultiplier.toFixed(4)}</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-500">DX 分数</span>
                           <span className="text-zinc-200" style={{ fontFamily: "'Quicksand', sans-serif" }}>{dxScore} <span className="text-zinc-600 text-xs">/ {maxDxScore}</span></span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-500">DX 乘区 <span className="text-[10px] font-medium opacity-50">/ 0.4</span></span>
                           <span className="text-indigo-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>{dxMultiplier.toFixed(4)}</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                           <span className="text-zinc-300">总乘数 <span className="text-[10px] font-medium opacity-50">/ 1.0</span></span>
                           <span className="text-amber-400 text-base" style={{ fontFamily: "'Quicksand', sans-serif" }}>{totalMultiplier.toFixed(4)}</span>
                         </div>
                         <div className="flex justify-between items-center pt-1">
                           <span className="text-zinc-500">难度基数 </span>
                           <span className="text-pink-400 text-base" style={{ fontFamily: "'Quicksand', sans-serif" }}>{baseDiff.toFixed(2)}</span>
                         </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>



      </div>
    </div>
  );
};


export default MaimaiProfile;