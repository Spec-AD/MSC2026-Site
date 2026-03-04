import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bbcode from 'bbcode-to-react';
import { useAuth } from '../context/AuthContext'; 
import { useToast } from '../context/ToastContext';
import { 
  FaCalendarCheck, FaSpinner, FaCommentDots, FaHeart, 
  FaClock, FaChevronRight, FaTimes, FaUserCircle
} from 'react-icons/fa'; 

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast(); 
  
  const [announcements, setAnnouncements] = useState([]); 
  const [selectedNews, setSelectedNews] = useState(null); 
  
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [serverTime, setServerTime] = useState(new Date());
  
  // 用户详细数据（用于顶部 Banner 和看板展示）
  const [userStats, setUserStats] = useState(null);

  // 1. 获取公告与新闻
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('/api/announcements');
        setAnnouncements(res.data);
      } catch (err) {
        console.error('拉取公告失败', err);
      }
    };
    fetchAnnouncements();
  }, []);

  // 2. 获取服务器时间并启动时钟
  useEffect(() => {
    let timeOffset = 0;
    let timer;
    const fetchTime = async () => {
      try {
        const res = await axios.get('/api/time');
        const serverMs = new Date(res.data.serverTime).getTime();
        timeOffset = serverMs - Date.now();
        
        timer = setInterval(() => {
          setServerTime(new Date(Date.now() + timeOffset));
        }, 1000);
      } catch (err) {
        timer = setInterval(() => setServerTime(new Date()), 1000);
      }
    };
    fetchTime();
    return () => clearInterval(timer);
  }, []);

  // 3. 获取用户状态（含 Banner 和 排名）
  useEffect(() => {
    if (user && user.username) {
      axios.get(`/api/users/${user.username}`)
        .then(res => setUserStats(res.data))
        .catch(err => console.error('拉取用户状态失败', err));
    }
  }, [user]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/check-in', {}, { headers: { Authorization: `Bearer ${token}` }});
      addToast(`${res.data.msg}\nLv.${res.data.level} | XP: ${res.data.xp}`, 'success');
      
      if (userStats) {
        setUserStats(prev => ({ ...prev, xp: res.data.xp, level: res.data.level }));
      }
    } catch (err) {
      addToast(err.response?.data?.msg || '签到失败', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === '-' || !rank) return 'text-zinc-500';
    const r = Number(rank);
    if (r >= 1 && r <= 10) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400';
    if (r >= 11 && r <= 100) return 'text-cyan-400';
    return 'text-blue-400';
  };

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative pb-20 overflow-x-hidden">
      
      {/* ==================================================== */}
      {/* 全局环境光与顶部个人 Banner 融合区 */}
      {/* ==================================================== */}
      
      {/* 环境散光层 (Ambient Light) */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      {/* 用户 Banner 渐黑下沉层 (安全渲染) */}
      <div className="absolute top-0 left-0 w-full h-[45vh] pointer-events-none z-0">
        {userStats?.bannerUrl ? (
          <img 
            src={userStats.bannerUrl} 
            alt="User Banner"
            className="w-full h-full object-cover opacity-[0.12] transition-opacity duration-1000"
            onError={(e) => { e.target.style.display = 'none'; }} // 图片加载失败时隐藏，防止破裂图标
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-indigo-900/10 to-transparent opacity-50"></div>
        )}
        {/* 垂直渐变遮罩，完美无缝融入背景颜色 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0c11]/80 to-[#0c0c11]"></div>
      </div>

      {/* ==================================================== */}
      {/* 顶部 Header：Logo 靠左，图标靠右 */}
      {/* ==================================================== */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-50 relative">
        <div className="flex items-center gap-3 shrink-0">
          <img src="/assets/logos.png" alt="PUREBEAT Logo" className="h-8 md:h-10 object-contain drop-shadow-lg" />
          <div className="hidden sm:flex flex-col ml-2">
            <span className="text-sm font-bold text-zinc-100 tracking-wider">PUREBEAT</span>
            <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-widest">Community Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button 
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="flex items-center justify-center w-10 h-10 bg-[#16161e] hover:bg-[#1d1d28] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              title="每日签到"
            >
              {isCheckingIn ? <FaSpinner className="animate-spin text-[16px]" /> : <FaCalendarCheck className="text-[16px]" />}
            </button>
          )}

          <button 
            onClick={() => navigate('/feedback')}
            className="flex items-center justify-center w-10 h-10 bg-[#16161e] hover:bg-[#1d1d28] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 shadow-sm"
            title="意见反馈"
          >
            <FaCommentDots className="text-[16px]" />
          </button>

          <a 
            href="https://afdian.com/a/purebeat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-zinc-200 text-zinc-900 rounded-xl hover:bg-white transition-all shadow-sm active:scale-95"
            title="支持我们"
          >
            <FaHeart className="text-[16px]" />
          </a>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 核心 Bento 网格布局 (Dashboard) */}
      {/* ==================================================== */}
      <main className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 z-10 relative">
        
        {/* === 左侧主要内容区 (占 8 列) === */}
        <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
          
          {/* 1. 赛事引流 Banner (微光嵌入) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/tournaments" className="block group">
              <div className="relative w-full aspect-[21/9] md:aspect-[21/7] rounded-3xl overflow-hidden border border-white/[0.05] bg-[#0a0a0c] shadow-sm transition-all duration-500 hover:border-indigo-500/30 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)]">
                <img 
                  src="/assets/register_banner.png" 
                  alt="Tournament Banner"
                  className="w-full h-full object-cover opacity-60 grayscale-[30%] group-hover:grayscale-0 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-5 md:bottom-6 left-6 md:left-8">
                  <span className="bg-white/[0.08] backdrop-blur-md border border-white/[0.05] text-indigo-100 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg">
                    Official Event
                  </span>
                  <h2 className="text-xl md:text-3xl font-bold text-white mt-2 drop-shadow-md">
                    探索社区最新赛事
                  </h2>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* 2. 新功能预留位：今日推荐 & 今日挑战 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 今日推荐曲目占位 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden group hover:bg-[#1a1a24] transition-colors cursor-default">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-3.5 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.5)]"></div>
                  <h3 className="text-sm font-bold text-zinc-100 tracking-wide">今日推荐曲目</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.05] px-2 py-0.5 rounded-md">WIP</span>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-black/40 border border-white/[0.05] flex items-center justify-center shrink-0">
                  <span className="text-xl text-zinc-600 font-bold opacity-30">?</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-base font-bold text-zinc-400">系统调度中</span>
                  <span className="text-xs text-zinc-500 mt-1">敬请期待后续版本更新...</span>
                </div>
              </div>
            </motion.div>

            {/* 今日挑战占位 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden group hover:bg-[#1a1a24] transition-colors cursor-default">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-3.5 bg-purple-400 rounded-full shadow-[0_0_6px_rgba(192,132,252,0.5)]"></div>
                  <h3 className="text-sm font-bold text-zinc-100 tracking-wide">今日挑战</h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.05] px-2 py-0.5 rounded-md">WIP</span>
              </div>
              <div className="flex flex-col gap-1 relative z-10">
                <span className="text-sm md:text-base font-bold text-zinc-400">挑战任务生成中</span>
                <span className="text-xs text-zinc-500 mt-0.5">完成后可获取额外的社区经验</span>
                <div className="mt-2.5 w-fit px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-bold rounded-lg opacity-50">
                  奖励: +?? XP
                </div>
              </div>
            </motion.div>

          </div>

          {/* 3. 社区新闻报纸流 (The Purebeat Times) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 bg-indigo-400 rounded-full shadow-[0_0_6px_rgba(129,140,248,0.5)]"></div>
                <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                  社区新闻速递
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {announcements.length > 0 ? (
                announcements.map((news, index) => {
                  const d = new Date(news.createdAt);
                  const isHeadline = index === 0; 

                  return (
                    <div 
                      key={news._id}
                      onClick={() => setSelectedNews(news)}
                      className={`bg-[#15151e] border border-white/[0.05] rounded-2xl cursor-pointer hover:bg-[#1a1a24] hover:border-white/[0.1] transition-all group ${isHeadline ? 'p-6 md:p-8 shadow-md' : 'p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase ${isHeadline ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-white/[0.04] text-zinc-400 border border-white/[0.05]'}`}>
                            {news.type || 'NEWS'}
                          </span>
                          <span className="text-xs font-medium text-zinc-500">
                            {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        
                        <h3 className={`${isHeadline ? 'text-xl md:text-2xl mb-3' : 'text-sm md:text-base'} font-bold text-zinc-100 tracking-tight group-hover:text-indigo-300 transition-colors truncate`}>
                          {news.title}
                        </h3>
                        
                        {isHeadline && (
                          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 pr-4">
                            {news.content.replace(/\[.*?\]/g, '')}
                          </p>
                        )}
                      </div>
                      
                      <div className="hidden sm:flex shrink-0 items-center justify-end">
                         <div className="w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center group-hover:bg-zinc-200 group-hover:text-zinc-900 transition-all">
                           <FaChevronRight className="text-[10px]" />
                         </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-[#15151e] border border-white/[0.05] rounded-2xl text-zinc-500 text-sm font-medium">
                  报社正在排版中，暂无新闻
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* === 右侧边栏 (占 4 列) === */}
        <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">
          
          {/* 1. 个人数据微看板 (Mini Dashboard) */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-3.5 bg-zinc-400 rounded-full shadow-[0_0_6px_rgba(161,161,170,0.4)]"></div>
              <h3 className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold">
                个人信息
              </h3>
            </div>
            
            {user ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-4 mb-6 border-b border-white/[0.05] pb-5">
                  <img 
                    src={userStats?.avatarUrl || user.avatarUrl || '/assets/logos.png'} 
                    alt="Avatar" 
                    className="w-14 h-14 rounded-full object-cover bg-[#0c0c11] border border-white/[0.05] shrink-0 shadow-sm" 
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-lg font-bold text-zinc-100 truncate">{userStats?.username || user.username}</span>
                    <span className="text-xs text-cyan-400 font-bold mt-0.5">Lv.{userStats?.level || user.level || 1}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0c0c11] rounded-xl p-3 border border-white/[0.02] flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-zinc-500 font-bold mb-1">综合战力 (PF)</span>
                    <span className={`text-lg font-bold tracking-tight ${userStats?.totalPf ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400' : 'text-zinc-300'}`}>
                      {userStats?.totalPf ? userStats.totalPf.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="bg-[#0c0c11] rounded-xl p-3 border border-white/[0.02] flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-zinc-500 font-bold mb-1">全站排位</span>
                    <span className={`text-lg font-bold tracking-tight ${getRankColor(userStats?.pfRank)}`}>
                      {userStats?.pfRank !== '-' && userStats?.pfRank ? `#${userStats.pfRank}` : '-'}
                    </span>
                  </div>
                </div>

                <Link to={`/profile/${user.username}`} className="w-full mt-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl text-center text-sm font-semibold text-zinc-300 transition-colors active:scale-95">
                  进入个人空间
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-14 h-14 rounded-full bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center mb-4">
                  <FaUserCircle className="text-2xl text-zinc-600" />
                </div>
                <p className="text-xs font-medium text-zinc-400 mb-5 leading-relaxed px-2">登录系统，在此查阅您的战力档案、全站排名与游戏动态。</p>
                <Link to="/login" className="w-full py-2.5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95">
                  立即登录
                </Link>
              </div>
            )}
          </motion.div>

          {/* 2. 服务器实时时钟 Widget */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-6 shadow-sm overflow-hidden relative">
            {/* 背景大图标 */}
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] text-8xl pointer-events-none">
              <FaClock />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3.5 bg-zinc-500 rounded-full shadow-[0_0_6px_rgba(113,113,122,0.4)]"></div>
              <h3 className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold">
                服务器时间
              </h3>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl md:text-4xl font-light tracking-tight text-zinc-100 font-mono">
                {serverTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-xs text-zinc-500 font-medium mt-1">
                {serverTime.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
              </span>
            </div>
          </motion.div>
          
        </div>
      </main>

      {/* ==================================================== */}
      {/* 📰 报纸阅读模态框 (News Modal) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="absolute inset-0 bg-[#0c0c11]/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-[#15151e] border border-white/[0.05] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 md:p-8 border-b border-white/[0.05] bg-[#1a1a24] shrink-0 flex justify-between items-start">
                <div className="pr-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {selectedNews.type || 'NEWS'}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      {new Date(selectedNews.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight leading-snug">
                    {selectedNews.title}
                  </h2>
                </div>
                
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-400 hover:text-white flex items-center justify-center transition-all active:scale-90"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar bg-[#15151e]">
                <div className="text-zinc-300 leading-loose text-[15px] md:text-base bbcode-content whitespace-pre-wrap">
                  {bbcode.toReact(selectedNews.content)}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Home;