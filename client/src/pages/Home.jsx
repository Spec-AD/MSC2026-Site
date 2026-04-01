import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bbcode from 'bbcode-to-react';
import { useAuth } from '../context/AuthContext'; 
import { useToast } from '../context/ToastContext';
import { 
  FaCalendarCheck, FaSpinner, FaCommentDots, FaHeart, 
  FaChevronRight, FaTimes, FaUserCircle, FaBell, FaMedal,
  FaDiscord, FaPoll, FaUserFriends, FaHistory, FaGamepad,
  FaCrown
} from 'react-icons/fa'; 

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast(); 
  
  const [announcements, setAnnouncements] = useState([]); 
  const [selectedNews, setSelectedNews] = useState(null); 
  const [showAllNews, setShowAllNews] = useState(false); 
  
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [serverTime, setServerTime] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [userStats, setUserStats] = useState(null);
  
  // 个人看板的游戏与模式筛选状态
  const [activeGame, setActiveGame] = useState('maimai'); 
  const [osuMode, setOsuMode] = useState('standard');

  const [dailySong, setDailySong] = useState(null);
  const [isDailyLoading, setIsDailyLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('/api/announcements');
        const sortedData = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnnouncements(sortedData);
      } catch (err) {
        console.error('拉取公告失败', err);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const fetchDailySong = async () => {
      setIsDailyLoading(true);
      try {
        const res = await axios.get('/api/daily-song');
        setDailySong(res.data);
      } catch (err) {
        console.error('拉取每日推荐曲目失败', err);
      } finally {
        setIsDailyLoading(false);
      }
    };
    fetchDailySong();
  }, []);

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

  useEffect(() => {
    if (user && user.username) {
      axios.get(`/api/users/${user.username}`)
        .then(res => setUserStats(res.data))
        .catch(err => console.error('拉取用户状态失败', err));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        try {
          const res = await axios.get('/api/messages/unread-count', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setUnreadCount(res.data.count);
        } catch (err) {}
      };
      fetchUnread();
    }
  }, [user]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/check-in', {}, { headers: { Authorization: `Bearer ${token}` }});
      addToast(`${res.data.msg}\nLv.${res.data.level} | XP: ${res.data.xp}`, 'success');
      if (userStats) setUserStats(prev => ({ ...prev, xp: res.data.xp, level: res.data.level }));
    } catch (err) {
      addToast(err.response?.data?.msg || '签到失败', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === '-' || !rank) return 'text-zinc-500';
    if (typeof rank === 'string' && rank.includes('%')) {
      const val = parseFloat(rank);
      if (val >= 80) return 'text-emerald-400';
      if (val >= 50) return 'text-yellow-400';
      return 'text-rose-400';
    }
    const r = Number(rank);
    if (r >= 1 && r <= 10) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400';
    if (r >= 11 && r <= 100) return 'text-cyan-400';
    return 'text-blue-400';
  };

  const getDisplayData = () => {
    if (activeGame === 'maimai') {
      return {
        scoreLabel: '综合战力 (PF)',
        scoreValue: userStats?.totalPf ? userStats.totalPf.toFixed(2) : '0.00',
        scoreColor: userStats?.totalPf ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400' : 'text-zinc-400',
        rankLabel: '全站排位',
        rankValue: userStats?.pfRank !== '-' && userStats?.pfRank ? `#${userStats.pfRank}` : '-'
      };
    } else if (activeGame === 'chunithm') {
      let color = 'text-zinc-400';
      const rating = userStats?.chuniRating || 0;
      if (rating >= 17.00) color = 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 font-black drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]';
      else if (rating >= 16.00) color = 'text-rose-400 font-bold';
      else if (rating >= 15.00) color = 'text-purple-400 font-bold';
      else if (rating > 0) color = 'text-yellow-400 font-bold';
      return {
        scoreLabel: 'Rating',
        scoreValue: rating ? rating.toFixed(2) : '0.00',
        scoreColor: color,
        rankLabel: '全站排位',
        rankValue: userStats?.chuniRank && userStats?.chuniRank !== '-' ? `#${userStats.chuniRank}` : '-'
      };
    } else if (activeGame === 'decode') {
      const ov = userStats?.letterGameStats?.totalOv || 0;
      const accuracy = userStats?.letterGameStats?.accuracy || 0;
      return {
        scoreLabel: 'Total OV',
        scoreValue: ov > 0 ? ov.toFixed(2) : '0.00',
        scoreColor: ov > 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-black drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]' : 'text-zinc-400',
        rankLabel: 'Accuracy',
        rankValue: accuracy > 0 ? `${(accuracy * 100).toFixed(1)}%` : '-'
      };
    } else {
      const modeMatch = userStats?.osuMode?.toLowerCase() === osuMode.toLowerCase();
      const pp = userStats?.osuDetails?.[osuMode]?.pp || (modeMatch ? userStats?.osuPp : null);
      const rank = userStats?.osuDetails?.[osuMode]?.rank || (modeMatch ? userStats?.osuGlobalRank : null);
      return {
        scoreLabel: 'Performance (PP)',
        scoreValue: pp ? Math.round(pp) : '--',
        scoreColor: pp ? 'text-pink-400' : 'text-zinc-500',
        rankLabel: '全球排名', 
        rankValue: rank ? `#${rank}` : '-'
      };
    }
  };

  const displayData = getDisplayData();
  const fullPreviewNews = announcements.slice(0, 3); 
  const compactNews = showAllNews ? announcements.slice(3) : announcements.slice(3, 8); 
  const hasMoreNews = announcements.length > 8 && !showAllNews;

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative pb-20 overflow-x-hidden">
      
      {/* 背景氛围光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen opacity-70"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen opacity-70"></div>
      </div>

      {/* 🔥 优化：沉浸式深层渐变 Banner，亮度稍微加强且混色更平滑 */}
      <div className="absolute top-0 left-0 w-full h-[55vh] pointer-events-none z-0">
        <div className="absolute inset-0">
          {userStats?.bannerUrl ? (
            <img 
              src={userStats.bannerUrl} 
              alt="User Banner"
              className="w-full h-full object-cover opacity-30 mix-blend-screen transition-opacity duration-1000"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-indigo-900/20 to-transparent opacity-60"></div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0c11]/80 to-[#0c0c11]"></div>
      </div>

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-50 relative">
        <div className="flex items-center shrink-0">
          {/* 🔥 优化：只显示单独的放大版 Logo，并保持时间在其右侧 */}
          <img src="/assets/logos.png" alt="PUREBEAT Logo" className="h-12 md:h-15 object-contain drop-shadow-lg" />
          
          <div className="hidden lg:flex flex-col justify-center ml-6 pl-6 border-l border-white/[0.08]">
            <span className="text-2xl font-bold text-zinc-200 tracking-wider drop-shadow-md leading-none" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {serverTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1.5 leading-none" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {serverTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {user && (
            <button onClick={() => navigate('/inbox')} className="flex items-center justify-center gap-1.5 min-w-[40px] px-2 h-10 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 shadow-sm">
              <FaBell className="text-[16px]" />
              {unreadCount > 0 && <span className="text-[13px] font-bold text-rose-400 leading-none pt-0.5" style={{ fontFamily: "'Quicksand', sans-serif" }}>{unreadCount}</span>}
            </button>
          )}
          <button onClick={() => navigate('/voting')} className="flex items-center justify-center w-10 h-10 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 shadow-sm">
            <FaPoll className="text-[16px]" />
          </button>
          {user && (
            <button onClick={handleCheckIn} disabled={isCheckingIn} className="flex items-center justify-center w-10 h-10 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-sm">
              {isCheckingIn ? <FaSpinner className="animate-spin text-[16px]" /> : <FaCalendarCheck className="text-[16px]" />}
            </button>
          )}
          <button onClick={() => navigate('/feedback')} className="flex items-center justify-center w-10 h-10 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 shadow-sm">
            <FaCommentDots className="text-[16px]" />
          </button>
          <a href="https://discord.gg/EnYB5GeB58" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 text-[#5865F2] hover:text-white rounded-xl transition-all active:scale-95 shadow-sm">
            <FaDiscord className="text-[18px]" />
          </a>
          <a href="https://afdian.com/a/purebeat" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center justify-center w-10 h-10 bg-zinc-200 text-zinc-900 rounded-xl hover:bg-white transition-all shadow-sm active:scale-95">
            <FaHeart className="text-[16px]" />
          </a>
        </div>
      </header>

      {/* Main Grid: 调整间距，布局更紧凑 */}
      <main className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 relative">
        
        {/* 左侧区域：活动图与新闻 */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/tournaments" className="block group">
              <div className="relative w-full aspect-[21/8] md:aspect-[21/6] rounded-3xl overflow-hidden border border-white/[0.05] bg-[#0a0a0c] shadow-lg transition-all duration-500 group-hover:border-indigo-500/40 group-hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)]">
                <img 
                  src="/assets/register_banner.png" 
                  alt="Tournament Banner"
                  className="w-full h-full object-cover opacity-50 grayscale-[40%] group-hover:grayscale-0 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11]/90 via-[#0c0c11]/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 md:bottom-6 left-6 md:left-8">
                  <span className="bg-indigo-500 text-white px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Official Event
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white mt-2.5 drop-shadow-md tracking-tight group-hover:text-indigo-100 transition-colors">
                    探索社区最新赛事
                  </h2>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-1.5 h-5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">资讯枢纽</h2>
            </div>

            <div className="flex flex-col gap-4">
              {fullPreviewNews.map((news) => {
                const d = new Date(news.createdAt);
                return (
                  <div key={news._id} onClick={() => setSelectedNews(news)} className="bg-[#15151e]/80 backdrop-blur-md border border-white/[0.05] rounded-3xl cursor-pointer hover:bg-[#1a1a24] hover:border-white/[0.1] transition-all group overflow-hidden shadow-sm flex flex-col md:flex-row h-auto md:h-44">
                    <div className="relative w-full md:w-64 h-40 md:h-full bg-[#0a0a0c] overflow-hidden shrink-0">
                      {news.coverUrl ? (
                         <img src={news.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                         <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-transparent group-hover:scale-105 transition-transform duration-700"></div>
                      )}
                      <div className="absolute top-4 right-4 md:left-4 md:right-auto px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-black/60 backdrop-blur-md text-white border border-white/10">
                        {news.type || 'NEWS'}
                      </div>
                    </div>
                    
                    <div className="p-5 md:p-6 flex flex-col justify-center flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-zinc-100 tracking-tight group-hover:text-indigo-400 transition-colors leading-snug truncate">
                        {news.title}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                        {news.subtitle || '点击阅读全文，了解 PUREBEAT 社区的最新动态、更新公告及活动前瞻。'}
                      </p>
                    </div>
                  </div>
                );
              })}

              {compactNews.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                  {compactNews.map((news) => {
                    const d = new Date(news.createdAt);
                    return (
                      <div key={news._id} onClick={() => setSelectedNews(news)} className="flex items-center justify-between px-5 py-4 bg-[#15151e]/50 border border-white/[0.03] rounded-2xl cursor-pointer hover:bg-[#1a1a24] hover:border-white/[0.08] transition-all group">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-zinc-500 w-10 shrink-0 text-center uppercase tracking-wider" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-sm font-bold text-zinc-300 truncate group-hover:text-indigo-400 transition-colors">
                            {news.title}
                          </span>
                        </div>
                        <FaChevronRight className="text-[10px] text-zinc-600 group-hover:text-zinc-300 shrink-0 ml-4 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              )}

              {hasMoreNews && (
                <button onClick={() => setShowAllNews(true)} className="w-full py-3.5 mt-1 bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  展开全部资讯 <FaChevronRight className="text-[10px]" />
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* 右侧区域：个人档案与游戏入口 */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* 个人档案卡片 - 紧凑大气版 */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-[#15151e]/80 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/10 blur-[40px] rounded-full pointer-events-none transition-all group-hover:bg-cyan-500/20"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.6)]"></div>
                <h3 className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold">Player Profile</h3>
              </div>
            </div>
            
            {user ? (
              <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <img src={userStats?.avatarUrl || user.avatarUrl || '/assets/logos.png'} alt="Avatar" className="w-14 h-14 rounded-full object-cover bg-[#0c0c11] border-2 border-white/10 shrink-0 shadow-md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xl font-bold text-zinc-100 truncate tracking-tight">{userStats?.username || user.username}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src={`/assets/lv${userStats?.level || user.level || 1}_badge.png`} alt="Lv" className="h-4 object-contain drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />
                      <span className="text-xs text-cyan-400 font-bold" style={{ fontFamily: "'Quicksand', sans-serif" }}>Lv.{userStats?.level || user.level || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0c0c11]/80 p-1 rounded-xl border border-white/[0.04] flex mb-4 shadow-inner">
                  {[{id:'maimai', label:'Maimai'}, {id:'chunithm', label:'Chuni'}, {id:'osu', label:'osu!'}, {id:'decode', label:'Decode'}].map(game => (
                    <button 
                      key={game.id} onClick={() => setActiveGame(game.id)} 
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeGame === game.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {game.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {activeGame === 'osu' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-1 overflow-hidden mb-3">
                      {['standard', 'taiko', 'catch', 'mania'].map(m => (
                        <button key={m} onClick={() => setOsuMode(m)} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${osuMode === m ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-[#0c0c11] border border-white/[0.02] text-zinc-500 hover:text-zinc-300'}`}>
                          {m}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🔥 优化：强化的数据展示区 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#0c0c11]/50 rounded-xl p-4 border border-white/[0.04] flex flex-col justify-center items-center text-center shadow-inner">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5">{displayData.scoreLabel}</span>
                    <span className={`text-2xl md:text-2xl font-black tracking-tight drop-shadow-md ${displayData.scoreColor}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{displayData.scoreValue}</span>
                  </div>
                  <div className="bg-[#0c0c11]/50 rounded-xl p-4 border border-white/[0.04] flex flex-col justify-center items-center text-center shadow-inner">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5">{displayData.rankLabel}</span>
                    <span className={`text-2xl md:text-3xl font-black tracking-tight drop-shadow-md ${getRankColor(displayData.rankValue.replace('#',''))}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{displayData.rankValue}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/profile/${user.username}`} className="flex-1 py-2.5 bg-[#0c0c11] hover:bg-zinc-800 border border-white/[0.05] rounded-xl text-center text-xs font-bold text-zinc-300 transition-colors active:scale-95 shadow-sm">
                    进入个人空间
                  </Link>
                  <Link to="/friends" className="w-12 py-2.5 bg-[#0c0c11] hover:bg-zinc-800 border border-white/[0.05] rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-95 shadow-sm">
                    <FaUserFriends />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4 relative z-10">
                <FaUserCircle className="text-5xl text-zinc-700 mb-3" />
                <p className="text-xs font-medium text-zinc-400 mb-5 leading-relaxed px-2">登录系统，查阅您的专属战力档案与最新社交动态。</p>
                <Link to="/login" className="w-full py-3 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95">
                  立即登录档案库
                </Link>
              </div>
            )}
          </motion.div>

          {/* Letter Decode 入口 */}
          <motion.div 
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} 
            onClick={() => navigate('/letter-game')}
            className="bg-[#15151e]/80 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-5 md:p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden group hover:border-cyan-400/50 transition-all cursor-pointer active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.6)]"></div>
                <h3 className="text-[11px] uppercase tracking-widest text-zinc-100 font-bold">Mini Game</h3>
              </div>
              <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-500 text-black shadow-lg">V 2.0</span>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-xl bg-[#0c0c11] border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 group-hover:border-cyan-400/60 transition-all duration-500">
                <FaGamepad className="text-2xl text-cyan-400 drop-shadow-md group-hover:text-cyan-300 transition-colors" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 truncate tracking-tight">
                  开字母
                </span>
                <span className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  全新星级自选系统。<br/>挑战全球 OV 算力排位！
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} 
            onClick={() => navigate('/daily-history')}
            className="bg-[#15151e]/80 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden group hover:bg-[#1a1a24] hover:border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]"></div>
                <h3 className="text-[11px] uppercase tracking-widest text-zinc-100 font-bold">Daily Track</h3>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded text-indigo-400 flex items-center gap-1 group-hover:bg-indigo-500/10 transition-colors">
                <FaHistory /> 往期回顾
              </span>
            </div>

            {isDailyLoading ? (
              <div className="flex items-center justify-center py-2">
                <FaSpinner className="animate-spin text-xl text-indigo-500/50" />
              </div>
            ) : dailySong && dailySong.title ? (
              <div className="flex items-center gap-3 relative z-10">
                <img 
                  src={dailySong.coverUrl} 
                  alt="Cover" 
                  className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.target.src = '/assets/bg.png'; }}
                />
                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <span className="text-sm font-bold truncate group-hover:text-indigo-400 text-zinc-100 transition-colors" title={dailySong.title}>{dailySong.title}</span>
                  <span className="text-[11px] text-zinc-400 truncate mt-0.5">{dailySong.artist}</span>
                  <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase mt-1 truncate">{dailySong.source}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 relative z-10 opacity-50">
                <div className="w-14 h-14 rounded-xl bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center shrink-0">
                  <span className="text-lg text-zinc-600 font-bold opacity-30">?</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-400">正在挑选...</span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">请稍后再来看看吧</span>
                </div>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-[#15151e]/80 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center group">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-2"><FaMedal className="text-purple-400 text-sm" /></div>
              <h3 className="text-xs font-bold text-zinc-300">今日挑战</h3>
              <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">WIP</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-[#15151e]/80 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center group">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center mb-2"><FaCrown className="text-amber-400 text-sm" /></div>
              <h3 className="text-xs font-bold text-zinc-300">排位系统</h3>
              <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">WIP</p>
            </motion.div>
          </div>
          
        </div>
      </main>

      {/* 新闻阅读 Modal 保持不变 */}
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
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-indigo-500 text-white">
                      {selectedNews.type || 'NEWS'}
                    </span>
                    <span className="text-xs font-medium text-zinc-500" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      {new Date(selectedNews.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight leading-snug">
                    {selectedNews.title}
                  </h2>
                  <div className="text-xs text-zinc-500 font-medium mt-3 flex items-center gap-1.5">
                    撰稿人：<span className="text-zinc-300">{selectedNews.authors?.join(', ') || 'PUREBEAT 社区编辑部'}</span>
                  </div>
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
