import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaArrowLeft, FaGamepad, FaSpinner, FaSyncAlt, FaLock, FaGlobe, FaMapMarkerAlt, FaPlay } from 'react-icons/fa';

const MODES = [
  { id: 'standard', apiMode: 'osu', label: 'osu!standard' },
  { id: 'taiko', apiMode: 'taiko', label: 'osu!taiko' },
  { id: 'catch', apiMode: 'fruits', label: 'osu!catch' },
  { id: 'mania', apiMode: 'mania', label: 'osu!mania' }
];

export default function OsuProfile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [allOsuScores, setAllOsuScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 当前查看的模式
  const [activeMode, setActiveMode] = useState('standard');
  const [isSyncing, setIsSyncing] = useState(false);
  const oauthCalled = useRef(false);

  const isOwnProfile = profile && currentUser && (profile.username.toLowerCase() === currentUser.username.toLowerCase());

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && isOwnProfile && !oauthCalled.current) {
      oauthCalled.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOsuOAuthBind(code);
    }
  }, [isOwnProfile]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users/${username}?t=${Date.now()}`);
      setProfile(res.data);
      setAllOsuScores(res.data.osuScores || []);
      if (res.data.osuMode && MODES.some(m => m.id === res.data.osuMode)) {
        setActiveMode(res.data.osuMode);
      }
    } catch (err) {
      setError('无法访问该玩家的档案');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const handleOsuOAuthBind = async (code) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/osu/bind', { code }, { headers: { Authorization: `Bearer ${token}` } });
      addToast('osu! 账号绑定成功！', 'success');
      await fetchProfileData();
    } catch (err) {
      addToast(err.response?.data?.msg || '绑定失败', 'error');
    }
  };

  const handleSyncScores = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/sync-osu', { mode: activeMode }, { headers: { Authorization: `Bearer ${token}` } });
      addToast(res.data.msg, 'success');
      await fetchProfileData();
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请检查网络', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 根据当前选择的模式过滤显示成绩
  const currentModeScores = useMemo(() => {
    const targetApiMode = MODES.find(m => m.id === activeMode)?.apiMode || 'osu';
    return allOsuScores.filter(s => s.mode === targetApiMode).sort((a, b) => b.pp - a.pp);
  }, [allOsuScores, activeMode]);

  // 从 profile.osuDetails 中安全读取当前模式的详情
  const modeStats = useMemo(() => {
    if (!profile || !profile.osuDetails) return null;
    return profile.osuDetails[activeMode];
  }, [profile, activeMode]);

  const renderGrade = (grade) => {
    const g = (grade || '').toUpperCase();
    if (g === 'XH' || g === 'SH') return <span className="text-zinc-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] font-black italic">{g.replace('H', '')}</span>; 
    if (g === 'X' || g === 'S') return <span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] font-black italic">{g === 'X' ? 'SS' : 'S'}</span>; 
    if (g === 'A') return <span className="text-emerald-400 font-black italic">A</span>;
    if (g === 'B') return <span className="text-blue-400 font-black italic">B</span>;
    if (g === 'C') return <span className="text-purple-400 font-black italic">C</span>;
    if (g === 'D') return <span className="text-rose-500 font-black italic">D</span>;
    return <span className="text-zinc-500 font-black">{g}</span>;
  };

  if (loading) return <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-pink-500/50" /></div>;
  if (error || !profile) return <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center text-zinc-500"><FaLock className="text-3xl mr-3" /> {error}</div>;

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-pink-500/30 relative pb-24 overflow-x-hidden">
      
      {/* osu! 专属品红/粉色环境光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">
        
        {/* 头部控制台 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/[0.05] pb-8">
          <div className="flex flex-col gap-4">
            <button onClick={() => navigate(`/profile/${profile.username}`)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95">
              <FaArrowLeft /> 返回个人主页
            </button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                  <FaGamepad className="text-pink-500 text-2xl" /> osu! 数据档案
                </h1>
                <span className="text-sm font-medium text-zinc-500 mt-1 flex items-center gap-2">
                  Player: {profile.osuUsername || profile.username}
                  {profile.osuId && <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">Linked</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 bg-[#15151e]/80 p-1.5 rounded-xl border border-white/[0.05] w-fit">
              {MODES.map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id)}
                  style={{ fontFamily: "'Quicksand', sans-serif" }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMode === mode.id ? 'bg-pink-500/20 text-pink-400 shadow-sm border border-pink-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {isOwnProfile && profile.osuId && (
              <button 
                onClick={handleSyncScores}
                disabled={isSyncing}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-pink-900/20"
              >
                {isSyncing ? <FaSpinner className="animate-spin" /> : <><FaSyncAlt /> 同步当前 {MODES.find(m=>m.id===activeMode).label} 数据</>}
              </button>
            )}
          </div>
        </div>

        {!profile.osuId ? (
          <div className="py-24 flex flex-col items-center justify-center bg-[#15151e]/40 border border-white/[0.05] rounded-[3rem] mt-10">
            <img src="/assets/logos.png" alt="osu Logo" className="w-20 h-20 opacity-30 mb-6 grayscale" />
            <p className="text-zinc-400 font-medium tracking-wide mb-6">该玩家尚未绑定 osu! 官方账号</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FaGlobe /> 全球排名</span>
                <span className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {modeStats?.rank ? `#${modeStats.rank.toLocaleString()}` : '-'}
                </span>
              </div>
              <div className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FaMapMarkerAlt /> 地区排名</span>
                <span className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {modeStats?.countryRank ? `#${modeStats.countryRank.toLocaleString()}` : '-'}
                </span>
              </div>
              <div className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Performance</span>
                <span className="text-2xl font-bold text-pink-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {modeStats?.pp ? Math.round(modeStats.pp).toLocaleString() : '-'} <span className="text-sm text-pink-500/50">pp</span>
                </span>
              </div>
              <div className="bg-[#15151e] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FaPlay /> 游玩次数</span>
                <span className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {modeStats?.playCount ? modeStats.playCount.toLocaleString() : '-'}
                </span>
              </div>
            </div>

            <div className="mb-16">
              <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4 mb-6">
                <div className="w-1 h-6 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Best Performance (BP 100)</h2>
              </div>

              {currentModeScores.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 font-medium bg-[#15151e]/40 rounded-2xl border border-white/5">
                  该模式下暂无成绩记录，请先在游戏中打出成绩后点击同步
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {currentModeScores.map((score, index) => (
                    <motion.div 
                      key={score._id || index}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.01 > 0.5 ? 0 : index * 0.01 }}
                      className="relative flex items-center bg-[#15151e] border border-white/[0.05] hover:border-pink-500/30 rounded-2xl p-3 overflow-hidden group transition-colors shadow-sm"
                    >
                      <div className="w-10 shrink-0 text-center font-bold text-lg text-zinc-600 font-mono z-10">
                        #{index + 1}
                      </div>

                      {/* 🔥 封面原图缩略图显示 */}
                      <img 
                        src={score.coverUrl} 
                        alt="cover" 
                        className="w-16 h-11 object-cover rounded-md border border-white/5 shrink-0 mr-3 shadow-sm group-hover:scale-105 transition-transform" 
                        onError={(e) => e.target.style.display='none'} 
                      />

                      <div className="w-10 shrink-0 text-center text-2xl z-10 flex items-center justify-center mr-2">
                        {renderGrade(score.grade)}
                      </div>

                      <div className="flex flex-col flex-1 min-w-0 pr-4 z-10">
                        <div className="text-[15px] font-bold text-zinc-100 truncate group-hover:text-pink-300 transition-colors">
                          {score.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 truncate">
                          <span className="text-[11px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md truncate max-w-[150px]" title={score.version}>
                            {score.version}
                          </span>
                          {score.mods && score.mods.length > 0 && (
                            <span className="text-[10px] font-bold text-rose-400 tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                              +{score.mods.join('')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-4 border-l border-white/[0.05] z-10">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-pink-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {Math.round(score.pp)}
                          </span>
                          <span className="text-[10px] text-pink-500/60 font-bold uppercase">pp</span>
                        </div>
                        <span className="text-xs text-zinc-400 font-medium" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {score.accuracy.toFixed(2)}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}