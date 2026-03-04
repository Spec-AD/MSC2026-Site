import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FaArrowLeft, FaSyncAlt, FaSpinner, FaChartLine, FaTrophy, FaTimes, FaGamepad, FaLock
} from 'react-icons/fa';

const MaimaiProfile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 同步状态
  const [importToken, setImportToken] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // 筛选与弹窗状态
  const [b50Filter, setB50Filter] = useState('DEFAULT');
  const [selectedPfScore, setSelectedPfScore] = useState(null);

  const isOwnProfile = profile && currentUser && (profile.username.toLowerCase() === currentUser.username.toLowerCase());

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users/${username}?t=${Date.now()}`);
      setProfile(res.data);
      setImportToken(res.data.importToken || '');
    } catch (err) {
      setError(err.response?.data?.msg || '未找到该玩家档案');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!importToken.trim()) {
      addToast('请提供有效的 Import-Token！', 'error'); 
      return; 
    }
    
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/sync-maimai', { importToken }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast(`同步成功！当前 Rating: ${res.data.rating}`, 'success');
      await fetchProfile(); 
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请检查 Token', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================
  // 难度与等级智能推导引擎
  // ==========================================
  const getDiffConfig = (score) => {
    // 兼容不同的后端字段命名习惯
    let idx = 3; // 默认 MASTER
    if (score.level_index !== undefined) idx = Number(score.level_index);
    else if (score.levelIndex !== undefined) idx = Number(score.levelIndex);
    else if (score.difficulty !== undefined) idx = Number(score.difficulty);

    const config = [
      { name: 'BASIC', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
      { name: 'ADVANCED', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
      { name: 'EXPERT', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
      { name: 'MASTER', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
      { name: 'Re:MASTER', color: 'text-zinc-100 bg-zinc-400/10 border-zinc-400/20' } // 白谱
    ];
    return config[idx] || config[3];
  };

  const getLevelString = (score) => {
    // 1. 如果已有明确的字符串 "14+"
    if (typeof score.level === 'string' && (score.level.includes('+') || Number(score.level) > 4)) {
      return score.level;
    }
    // 2. 通过定数完美推导 (例如 14.8 -> 14+)
    if (!score.constant || score.constant === 0) return score.level || '';
    const base = Math.floor(score.constant);
    const frac = Math.round((score.constant - base) * 10);
    return `${base}${frac >= 6 ? '+' : ''}`;
  };

  // ==========================================
  // B50 超级过滤与计算引擎
  // ==========================================
  const b50Data = useMemo(() => {
    if (!profile || !profile.allScores) return { b35: [], r15: [], rating: 0 };
    let scores = [...profile.allScores];

    const getIdealScore = (score) => {
      let newAch = score.achievement;
      let newFc = (score.fcStatus || '').toLowerCase();
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

    // 应用过滤规则
    if (b50Filter === 'IDEAL') scores = scores.map(getIdealScore);
    else if (b50Filter === 'AP50') scores = scores.filter(s => ['ap', 'app'].includes((s.fcStatus||'').toLowerCase()));
    else if (b50Filter === 'FC50') scores = scores.filter(s => ['fc', 'fcp', 'ap', 'app'].includes((s.fcStatus||'').toLowerCase()));
    else if (b50Filter === 'STAR_1') scores = scores.filter(s => s.dxRatio >= 0.85);
    else if (b50Filter === 'STAR_2') scores = scores.filter(s => s.dxRatio >= 0.90);
    else if (b50Filter === 'STAR_3') scores = scores.filter(s => s.dxRatio >= 0.93);
    else if (b50Filter === 'STAR_4') scores = scores.filter(s => s.dxRatio >= 0.95);
    else if (b50Filter === 'STAR_5') scores = scores.filter(s => s.dxRatio >= 0.97);
    else if (b50Filter === 'STAR_5_5') scores = scores.filter(s => s.dxRatio >= 0.98);
    else if (b50Filter === 'STAR_6') scores = scores.filter(s => s.dxRatio >= 0.99);
    else if (b50Filter === 'GREEN') scores = scores.filter(s => getDiffConfig(s).name === 'BASIC');
    else if (b50Filter === 'YELLOW') scores = scores.filter(s => getDiffConfig(s).name === 'ADVANCED');
    else if (b50Filter === 'RED') scores = scores.filter(s => getDiffConfig(s).name === 'EXPERT');
    else if (b50Filter === 'PURPLE') scores = scores.filter(s => getDiffConfig(s).name === 'MASTER');
    else if (b50Filter === 'WHITE') scores = scores.filter(s => getDiffConfig(s).name === 'Re:MASTER');
    else if (b50Filter === 'LOCK50') scores = scores.filter(s => s.achievement >= 100.0000 && s.achievement <= 100.1000);
    else if (b50Filter === 'CUN50') scores = scores.filter(s => s.achievement >= 99.8000 && s.achievement <= 99.9999);
    else if (b50Filter === 'YUE50') scores = scores.filter(s => s.achievement < 97.0000);

    // 排序逻辑：Rating优先，达成率其次
    scores.sort((a, b) => b.rating - a.rating || b.achievement - a.achievement);
    
    // 兼容不同的新曲标记命名
    const isNewRecord = (s) => s.isNew === true || s.is_new === true || s.isNewSong === true;

    // 核心组合：旧曲 35 首 + 新曲 15 首
    const oldScores = scores.filter(s => !isNewRecord(s)).slice(0, 35);
    const newScores = scores.filter(s => isNewRecord(s)).slice(0, 15);
    
    const totalRating = [...oldScores, ...newScores].reduce((sum, s) => sum + (s.rating || 0), 0);

    return { b35: oldScores, r15: newScores, rating: totalRating };
  }, [profile, b50Filter]);

  const pf100Data = useMemo(() => {
    if (!profile || !profile.allScores) return [];
    return [...profile.allScores].sort((a, b) => b.pf - a.pf).slice(0, 100);
  }, [profile]);

  const getFcBadge = (fc) => {
    const s = (fc || '').toLowerCase();
    if (s.includes('ap')) return <span className="bg-amber-400 text-amber-950 px-1.5 rounded-sm text-[10px] font-black">{s.toUpperCase()}</span>;
    if (s.includes('fc')) return <span className="bg-pink-400 text-pink-950 px-1.5 rounded-sm text-[10px] font-black">{s.toUpperCase()}</span>;
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

        {/* 顶部标签 */}
        <div className="absolute top-2 left-2 flex gap-1 z-10">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${diff.color}`}>
            {diff.name} <span style={{ fontFamily: "'Quicksand', sans-serif" }}>{realLevel}</span>
          </span>
          {getFcBadge(score.fcStatus)}
        </div>
        {score.isIdeal && <span className="absolute top-2 right-8 bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded text-[9px] font-bold z-10">IDEAL</span>}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-300 z-10" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          #{index + 1}
        </div>

        {/* 底部信息 */}
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
      <FaLock className="text-5xl text-zinc-700 mb-4" />
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
      
      {/* 环境光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">
        
        {/* ========================================== */}
        {/* 头部导航与同步区 */}
        {/* ========================================== */}
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

          {/* 同步框 (仅自己可见) */}
          {isOwnProfile && (
            <div className="flex items-center gap-2 bg-[#15151e]/80 backdrop-blur-md p-2 rounded-2xl border border-white/[0.05] shadow-sm w-full md:w-auto">
              <input 
                type="password" 
                value={importToken}
                onChange={(e) => setImportToken(e.target.value)}
                placeholder="粘贴 Import-token 更新数据"
                className="w-full md:w-64 bg-transparent border-none text-zinc-200 px-3 py-2 text-sm focus:outline-none placeholder-zinc-600 font-mono"
              />
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-cyan-500 hover:bg-cyan-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 active:scale-95"
              >
                {isSyncing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
                同步云端
              </button>
            </div>
          )}
        </div>

        {/* 隐私锁判断 */}
        {!isOwnProfile && !profile.isB50Visible ? (
          <div className="py-32 flex flex-col items-center justify-center bg-[#15151e]/40 border border-white/[0.05] rounded-[3rem] mt-10">
            <FaLock className="text-5xl text-zinc-800 mb-4 opacity-30" />
            <p className="text-zinc-500 font-medium tracking-wide">该玩家的数据档案已设为私密</p>
          </div>
        ) : (
          <>
            {/* ========================================== */}
            {/* B50 成绩模块 */}
            {/* ========================================== */}
            <div className="mb-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.05] pb-4 mb-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                    <FaChartLine className="text-cyan-400" /> Best 50 
                  </h2>
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
                  {/* B35 历史最佳区域 */}
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

                  {/* R15 新曲最佳区域 */}
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
              <div className="flex items-center gap-2 mb-6 border-b border-white/[0.05] pb-4">
                <FaTrophy className="text-cyan-400 text-xl" />
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
                              {getFcBadge(score.fcStatus)}
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
        {/* PF 详情模态窗 */}
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
                <button 
                  onClick={() => setSelectedPfScore(null)}
                  className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-full active:scale-90"
                >
                  <FaTimes />
                </button>

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
                      {/* 环形进度条 */}
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

                      {/* 数据面板 */}
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

      </div>
    </div>
  );
};

export default MaimaiProfile;