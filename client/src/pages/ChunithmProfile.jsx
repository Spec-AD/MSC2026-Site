import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaArrowLeft, FaGamepad, FaSpinner, FaSyncAlt, FaLock, FaTimes } from 'react-icons/fa';

// CHUNITHM 专属的难度色彩体系 (兼容 ULTIMA & WE)
const DIFF_NAMES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ULTIMA', "WORLD'S END"];
const DIFF_COLORS = [
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'text-red-500 bg-[#1a0a0a] border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-[#15151e] border-white/20'
];

// CHUNITHM 等级划分 (7 级开始带 +)
const LEVEL_LIST = ['1','2','3','4','5','6','7','7+','8','8+','9','9+','10','10+','11','11+','12','12+','13','13+','14','14+','15','15+'];

// 落雪 OAuth Client ID
const LXNS_CLIENT_ID = "eef52117-75ed-4283-b861-245375750e62";

export default function ChunithmProfile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [chuniScores, setChuniScores] = useState([]);
  const [musicData, setMusicData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newSongIds, setNewSongIds] = useState(new Set());
  
  // 新增：双源同步状态
  const [syncSource, setSyncSource] = useState('df'); // 'df' 为水鱼, 'lx' 为落雪
  const [importToken, setImportToken] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [selectedLevelDetail, setSelectedLevelDetail] = useState(null);

  const isOwnProfile = profile && currentUser && (profile.username.toLowerCase() === currentUser.username.toLowerCase());
  const oauthCalled = useRef(false);

  // ==========================================
  // 数据初始化与 OAuth 拦截
  // ==========================================
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
    const initData = async () => {
      setLoading(true);
      try {
        // 并发拉取：用户档案、中二玩家成绩、中二本地全量曲库
        const [profileRes, scoresRes, musicRes] = await Promise.all([
          axios.get(`/api/users/${username}?t=${Date.now()}`),
          axios.get(`/api/users/${username}/chunithm-scores`).catch(() => ({ data: [] })), 
          axios.get('/api/chunithm-songs').catch(() => ({ data: [] }))
        ]);

        setProfile(profileRes.data);
        setImportToken(profileRes.data.importToken || '');
        setChuniScores(scoresRes.data || []);
        setMusicData(musicRes.data || []);

        const newIds = new Set();
        if (musicRes.data && Array.isArray(musicRes.data)) {
          musicRes.data.forEach(song => {
            if (song.basic_info?.is_new || song.basic_info?.from === 'LUMINOUS PLUS') newIds.add(String(song.id));
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

  // ==========================================
  // 执行落雪 OAuth 同步
  // ==========================================
  const executeLuoxueOAuthSync = async (code) => {
    setIsSyncing(true);
    setSyncSource('lx');
    try {
      const token = localStorage.getItem('token');
      const currentRedirectUri = `${window.location.origin}/profile`; // 必须对应落雪后台配置
      
      const res = await axios.post('/api/users/sync-chunithm-oauth', 
        { code, redirectUri: currentRedirectUri }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      addToast(res.data.msg || 'CHUNITHM 数据同步成功！', 'success');
      // 刷新数据
      const scoresRes = await axios.get(`/api/users/${username}/chunithm-scores`);
      setChuniScores(scoresRes.data);
    } catch (err) {
      addToast(err.response?.data?.msg || '授权同步失败', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLuoxueOAuthLogin = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/profile`);
    const scopes = "read_user_profile+write_player+read_player+read_user_token";
    // ⚠️ 重点：传入 state 为 username_chunithm，让 Profile 拦截器知道要跳回中二页面
    const authUrl = `https://maimai.lxns.net/oauth/authorize?response_type=code&client_id=${LXNS_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scopes}&state=${username}_chunithm`;
    window.location.href = authUrl;
  };

  // ==========================================
  // 执行水鱼 (Diving-fish) API 同步
  // ==========================================
  const handleSync = async () => {
    if (syncSource === 'df' && !importToken.trim()) return addToast('请提供水鱼 Import-Token', 'error'); 
    
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/sync-chunithm', { importToken }, { headers: { Authorization: `Bearer ${token}` } });
      
      addToast(res.data.msg || `水鱼数据同步成功！`, 'success');
      const scoresRes = await axios.get(`/api/users/${username}/chunithm-scores`);
      setChuniScores(scoresRes.data);
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请检查 Token 或网络', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================
  // 核心工具函数
  // ==========================================
  const getDiffConfig = (levelIndex) => {
    let idx = 3; 
    if (typeof levelIndex === 'number' && levelIndex >= 0 && levelIndex <= 5) idx = levelIndex;
    return { name: DIFF_NAMES[idx], color: DIFF_COLORS[idx] };
  };

  // 严格遵守：7 级以上带 + 逻辑
  const getLevelString = (constant) => {
    if (!constant || constant === 0) return '';
    const base = Math.floor(constant);
    const frac = Math.round((constant - base) * 10);
    if (base < 7) return `${base}`;
    return `${base}${frac >= 5 ? '+' : ''}`;
  };

  const userScoreMap = useMemo(() => {
    const map = new Map();
    chuniScores.forEach(s => {
      map.set(`${s.songId}_${s.level}`, s);
    });
    return map;
  }, [chuniScores]);

  // ==========================================
  // 等级进度计算引擎 (适配 CHUNITHM)
  // ==========================================
  const levelProgress = useMemo(() => {
    if (!musicData || musicData.length === 0 || !userScoreMap) return null;

    const data = LEVEL_LIST.map(lvl => ({
      level: lvl, total: 0, clear: 0, s: 0, ss: 0, sss: 0, fc: 0, aj: 0
    }));
    const levelMap = {};
    data.forEach(d => levelMap[d.level] = d);

    musicData.forEach(song => {
      if (!song.ds) return;
      song.ds.forEach((constant, idx) => {
        if (constant === undefined || constant === null || idx === 5) return; // 剔除 WE 谱面不计入等级统计
        
        const lvlStr = getLevelString(constant);
        if (levelMap[lvlStr]) {
          levelMap[lvlStr].total++;
          const score = userScoreMap.get(`${song.id}_${idx}`);
          if (score && score.score > 0) {
            const s = score.score;
            const fc = (score.fcStatus || '').toLowerCase();
            
            levelMap[lvlStr].clear++; // 有成绩就算 clear
            if (s >= 975000) levelMap[lvlStr].s++;
            if (s >= 1000000) levelMap[lvlStr].ss++;
            if (s >= 1007500) levelMap[lvlStr].sss++;
            
            if (['fc', 'aj', 'ajc'].includes(fc)) levelMap[lvlStr].fc++;
            if (['aj', 'ajc'].includes(fc)) levelMap[lvlStr].aj++;
          }
        }
      });
    });

    return data.filter(d => d.total > 0);
  }, [musicData, userScoreMap]);

  // ==========================================
  // 🌟 B50 计算引擎 (B30 + R20)
  // ==========================================
  const b50Data = useMemo(() => {
    if (!chuniScores || chuniScores.length === 0) return { b30: [], r20: [], rating: 0 };
    
    // 规则 1：剔除 WE (World's End) 谱面
    const validScores = chuniScores.filter(s => s.level !== 5 && s.rating > 0);
    
    // 按单曲 Rating 降序
    validScores.sort((a, b) => b.rating - a.rating || b.score - a.score);
    
    const isNewRecord = (s) => newSongIds.has(String(s.songId)) || s.isNew;
    
    // 规则 2：拆分 B30 (旧曲) 和 R20 (新曲)
    const b30 = validScores.filter(s => !isNewRecord(s)).slice(0, 30);
    const r20 = validScores.filter(s => isNewRecord(s)).slice(0, 20);
    
    // 计算综合 Rating (通常取平均值，保留两位小数)
    const sumB30 = b30.reduce((sum, s) => sum + s.rating, 0);
    const sumR20 = r20.reduce((sum, s) => sum + s.rating, 0);
    const totalCount = b30.length + r20.length;
    const avgRating = totalCount > 0 ? ((sumB30 + sumR20) / totalCount).toFixed(2) : '0.00';

    return { b30, r20, rating: avgRating };
  }, [chuniScores, newSongIds]);

  const getRankBadge = (scoreNum) => {
    if (scoreNum >= 1009000) return <span className="text-yellow-300 font-black drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]">SSS+</span>;
    if (scoreNum >= 1007500) return <span className="text-yellow-500 font-black">SSS</span>;
    if (scoreNum >= 1005000) return <span className="text-red-400 font-black">SS+</span>;
    if (scoreNum >= 1000000) return <span className="text-red-500 font-black">SS</span>;
    if (scoreNum >= 990000) return <span className="text-gray-300 font-black">S+</span>;
    if (scoreNum >= 975000) return <span className="text-gray-400 font-black">S</span>;
    return <span className="text-gray-600 font-black">AAA</span>;
  };

  const getFcBadge = (fcStatus) => {
    const s = (fcStatus || '').toLowerCase();
    if (s.includes('ajc')) return <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-950 px-1.5 rounded-sm text-[10px] font-black tracking-widest">AJC</span>;
    if (s.includes('aj')) return <span className="bg-yellow-400 text-yellow-950 px-1.5 rounded-sm text-[10px] font-black tracking-widest">AJ</span>;
    if (s.includes('fc')) return <span className="bg-emerald-400 text-emerald-950 px-1.5 rounded-sm text-[10px] font-black tracking-widest">FC</span>;
    return null;
  };

  const renderScoreCard = (score, index, prefix) => {
    const diff = getDiffConfig(score.level);
    const realLevel = getLevelString(score.constant);

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

        <div className="absolute top-2 left-2 flex gap-1 z-10 shadow-sm">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${diff.color}`}>
            {diff.name} <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{realLevel}</span>
          </span>
          {getFcBadge(score.fcStatus)}
        </div>
        
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400/80 z-10" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          #{index + 1}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end z-10">
          <div className="text-[13px] font-bold text-zinc-100 truncate mb-1 leading-tight">{score.songName}</div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-zinc-100 leading-none tracking-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {score.score.toLocaleString()}
              </span>
              <span className="text-xs">{getRankBadge(score.score)}</span>
            </div>
            <span className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-bold text-yellow-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {score.rating.toFixed(2)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) return (
    <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center">
      <FaSpinner className="animate-spin text-4xl text-yellow-500/50" />
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
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-yellow-500/30 relative pb-24 overflow-x-hidden">
      
      {/* 动态环境光 (中二主题黄) */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-yellow-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-amber-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/[0.05] pb-8">
          <div className="flex flex-col gap-4">
            <button onClick={() => navigate(`/profile/${profile.username}`)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95">
              <FaArrowLeft /> 返回个人主页
            </button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                  <FaGamepad className="text-yellow-400 text-2xl" /> CHUNITHM 数据档案
                </h1>
                <span className="text-sm font-medium text-zinc-500 mt-1 block">Player: {profile.username}</span>
              </div>
            </div>
          </div>

          {/* 🔥 智能双源同步控制台 */}
          {isOwnProfile && (
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-[#15151e]/80 p-1 rounded-xl border border-white/[0.05] w-fit">
                <button 
                  onClick={() => setSyncSource('df')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${syncSource === 'df' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
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
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 active:scale-95"
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
                    {isSyncing ? <FaSpinner className="animate-spin" /> : '🔗 使用落雪账号授权同步数据'}
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
            {/* ========================================== */}
            {/* 等级完成度面板 */}
            {/* ========================================== */}
            <div className="mb-14 border-b border-white/[0.05] pb-10">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">谱面评级追踪</h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {levelProgress && levelProgress.map((lvl) => {
                    const isAllAJ = lvl.aj === lvl.total;
                    const isAllSSS = lvl.sss === lvl.total;
                    const isAllSS = lvl.ss === lvl.total;

                    let baseClass = 'border-white/[0.05] bg-[#15151e] hover:bg-[#1a1a24]';
                    let glowClass = '';

                    if (isAllAJ) {
                        baseClass = 'border-transparent bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20';
                        glowClass = 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]';
                    } else if (isAllSSS) {
                        baseClass = 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20';
                    } else if (isAllSS) {
                        baseClass = 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
                    }

                    return (
                        <div key={lvl.level} className={`relative rounded-xl p-3 border transition-all flex flex-col gap-1.5 ${baseClass} ${glowClass}`}>
                            <div className="flex justify-between items-baseline relative z-10">
                                <span className="text-xl font-bold text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                    {lvl.level}
                                </span>
                                <span className="text-[11px] font-bold text-zinc-500 transition-colors" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                    {lvl.clear} / {lvl.total}
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-semibold tracking-wide relative z-10">
                                <span className={lvl.sss === lvl.total ? 'text-yellow-400' : 'text-zinc-500'}>SSS:{lvl.sss}</span>
                                <span className={lvl.ss === lvl.total ? 'text-red-400' : 'text-zinc-500'}>SS:{lvl.ss}</span>
                                {lvl.aj > 0 && <span className={lvl.aj === lvl.total ? 'text-orange-400' : 'text-zinc-500'}>AJ:{lvl.aj}</span>}
                            </div>
                            
                            <div className="h-1 w-full bg-[#0c0c11] rounded-full mt-auto overflow-hidden border border-white/[0.02] relative z-10">
                                <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${lvl.total > 0 ? (lvl.clear / lvl.total) * 100 : 0}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-amber-500"
                                />
                            </div>
                        </div>
                    )
                })}
              </div>
            </div>

            {/* ========================================== */}
            {/* B50 成绩模块 (B30 + R20) */}
            {/* ========================================== */}
            <div className="mb-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-4 mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Best 50 (B30 + R20)</h2>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Average Rating</span>
                  <span className="text-2xl font-bold text-yellow-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                    {b50Data.rating}
                  </span>
                </div>
              </div>

              {b50Data.b30.length === 0 && b50Data.r20.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 font-medium bg-[#15151e]/40 rounded-2xl border border-white/5">未找到匹配的成绩</div>
              ) : (
                <>
                  {b50Data.b30.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Historical Best Tracks (B30)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {b50Data.b30.map((score, index) => renderScoreCard(score, index, 'b30'))}
                      </div>
                    </div>
                  )}

                  {b50Data.r20.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Recent Best Tracks (R20)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {b50Data.r20.map((score, index) => renderScoreCard(score, index, 'r20'))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}