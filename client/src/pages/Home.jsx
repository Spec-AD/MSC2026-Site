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
  FaDiscord, FaPoll, FaUserFriends
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

  // 🔥 核心更新：根据筛选器计算看板显示的数值 (加入 CHUNITHM 逻辑)
  const getDisplayData = () => {
    if (activeGame === 'maimai') {
      return {
        scoreLabel: '综合战力 (PF)',
        scoreValue: userStats?.totalPf ? userStats.totalPf.toFixed(2) : '0.00',
        scoreColor: userStats?.totalPf ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400' : 'text-zinc-400',
        rankValue: userStats?.pfRank !== '-' && userStats?.pfRank ? `#${userStats.pfRank}` : '-'
      };
    } else if (activeGame === 'chunithm') {
      // 🌟 CHUNITHM 专属颜色评级系统
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
        rankValue: userStats?.chuniRank && userStats?.chuniRank !== '-' ? `#${userStats.chuniRank}` : '-'
      };
    } else {
      // osu! 模式
      const modeMatch = userStats?.osuMode?.toLowerCase() === osuMode.toLowerCase();
      const pp = userStats?.osuDetails?.[osuMode]?.pp || (modeMatch ? userStats?.osuPp : null);
      const rank = userStats?.osuDetails?.[osuMode]?.rank || (modeMatch ? userStats?.osuGlobalRank : null);
      
      return {
        scoreLabel: 'Performance (PP)',
        scoreValue: pp ? Math.round(pp) : '--',
        scoreColor: pp ? 'text-pink-400' : 'text-zinc-500',
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
      
      {/* 环境光与顶部个人 Banner 融合区 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="absolute top-0 left-0 w-full h-[45vh] pointer-events-none z-0">
        {userStats?.bannerUrl ? (
          <img 
            src={userStats.bannerUrl} 
            alt="User Banner"
            className="w-full h-full object-cover opacity-[0.12] transition-opacity duration-1000"
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-indigo-900/10 to-transparent opacity-50"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0c11]/80 to-[#0c0c11]"></div>
      </div>

      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-50 relative">
        <div className="flex items-center shrink-0">
          <img src="/assets/logos.png" alt="PUREBEAT Logo" className="h-8 md:h-10 object-contain drop-shadow-lg" />
          <div className="hidden sm:flex flex-col ml-3">
            <span className="text-sm font-bold text-zinc-100 tracking-wider">PUREBEAT</span>
            <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-widest">Community Hub</span>
          </div>
          
          <div className="hidden lg:flex flex-col justify-center ml-8 pl-8 border-l border-white/[0.08]">
            <span 
              className="text-2xl font-bold text-zinc-200 tracking-wider drop-shadow-md leading-none" 
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {serverTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span 
              className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1.5 leading-none"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {serverTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          
          {user && (
            <button 
              onClick={() => navigate('/inbox')}
              className="flex items-center justify-center gap-1.5 min-w-[40px] px-2 h-10 bg-[#16161e] hover:bg-[#1d1d28] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 shadow-sm"
              title="收件箱"
            >
              <FaBell className="text-[16px]" />
              {unreadCount > 0 && (
                <span 
                  className="text-[13px] font-bold text-rose-400 leading-none pt-0.5"
                  style={{ fontFamily: "'Quicksand', sans-serif" }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <button 
            onClick={() => navigate('/voting')}
            className="flex items-center justify-center w-10 h-10 bg-[#16161e] hover:bg-[#1d1d28] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 shadow-sm"
            title="曲目投票箱"
          >
            <FaPoll className="text-[16px]" />
          </button>

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
            href="https://discord.gg/EnYB5GeB58" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 text-[#5865F2] hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
            title="加入 Discord 服务器"
          >
            <FaDiscord className="text-[18px]" />
          </a>

          <a 
            href="https://afdian.com/a/purebeat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center justify-center w-10 h-10 bg-zinc-200 text-zinc-900 rounded-xl hover:bg-white transition-all shadow-sm active:scale-95"
            title="支持我们"
          >
            <FaHeart className="text-[16px]" />
          </a>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 z-10 relative">
        
        <div className="lg:col-span-8 flex flex-col gap-8">
          
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

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-6 px-1">
              <div className="w-1 h-5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
                新闻
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              
              {fullPreviewNews.map((news) => {
                const d = new Date(news.createdAt);
                return (
                  <div 
                    key={news._id}
                    onClick={() => setSelectedNews(news)}
                    className="bg-[#15151e] border border-white/[0.05] rounded-3xl cursor-pointer hover:bg-[#1a1a24] hover:border-white/[0.1] transition-all group overflow-hidden shadow-sm flex flex-col"
                  >
                    <div className="relative w-full aspect-[21/9] md:aspect-[21/8] bg-[#0a0a0c] border-b border-white/[0.05] overflow-hidden">
                      {news.coverUrl ? (
                         <img 
                           src={news.coverUrl} 
                           alt="News Cover" 
                           className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                           onError={(e) => { e.target.style.display = 'none'; }}
                         />
                      ) : (
                         <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-transparent group-hover:scale-105 transition-transform duration-700"></div>
                      )}
                      <div className="absolute top-5 right-5 px-3 py-1 rounded-lg text-xs font-bold tracking-widest uppercase bg-indigo-500 text-white shadow-lg">
                        {news.type || 'NEWS'}
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-medium text-zinc-500" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight group-hover:text-indigo-400 transition-colors leading-snug">
                        {news.title}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-3 leading-relaxed line-clamp-2">
                        {news.subtitle || '这是一段占位的说明文字。在这里可以简要概括本篇新闻的核心内容、主要更新点或是活动前瞻，吸引读者点击阅读正文。'}
                      </p>
                    </div>
                  </div>
                );
              })}

              {compactNews.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {compactNews.map((news) => {
                    const d = new Date(news.createdAt);
                    return (
                      <div 
                        key={news._id}
                        onClick={() => setSelectedNews(news)}
                        className="flex items-center justify-between p-5 bg-[#15151e] border border-white/[0.05] rounded-2xl cursor-pointer hover:bg-[#1a1a24] hover:border-white/[0.1] transition-all group"
                      >
                        <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                          <span 
                            className="text-xs font-bold text-zinc-500 w-12 shrink-0 text-center uppercase tracking-wider"
                            style={{ fontFamily: "'Quicksand', sans-serif" }}
                          >
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[15px] font-bold text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">
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
                <button 
                  onClick={() => setShowAllNews(true)}
                  className="w-full py-4 mt-2 bg-transparent border border-white/[0.05] hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-200 text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  查看更多新闻 <FaChevronRight className="text-[10px]" />
                </button>
              )}

              {announcements.length === 0 && (
                <div className="text-center py-16 bg-[#15151e] border border-white/[0.05] rounded-3xl text-zinc-500 text-sm font-medium">
                  报社正在排版中，暂无新闻
                </div>
              )}

            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 bg-zinc-400 rounded-full shadow-[0_0_6px_rgba(161,161,170,0.5)]"></div>
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  个人信息
                </h3>
              </div>
            </div>
            
            {user ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/[0.05]">
                  <img 
                    src={userStats?.avatarUrl || user.avatarUrl || '/assets/logos.png'} 
                    alt="Avatar" 
                    className="w-12 h-12 rounded-full object-cover bg-[#0c0c11] border border-white/[0.05] shrink-0 shadow-sm" 
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-lg font-bold text-zinc-100 truncate">{userStats?.username || user.username}</span>
                    <span 
                      className="text-xs text-cyan-400 font-bold mt-0.5"
                      style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                      Lv.{userStats?.level || user.level || 1}
                    </span>
                  </div>
                </div>

                {/* 🔥 三游切换器：加入 CHUNITHM */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-1.5 bg-[#0c0c11] p-1 rounded-xl border border-white/[0.02] w-fit flex-wrap">
                    <button 
                      onClick={() => setActiveGame('maimai')} 
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeGame === 'maimai' ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      Maimai DX
                    </button>
                    <button 
                      onClick={() => setActiveGame('chunithm')} 
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeGame === 'chunithm' ? 'bg-yellow-500/10 text-yellow-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      CHUNITHM
                    </button>
                    <button 
                      onClick={() => setActiveGame('osu')} 
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeGame === 'osu' ? 'bg-pink-500/10 text-pink-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      osu!
                    </button>
                  </div>
                  
                  {/* osu! 模式子菜单 */}
                  <AnimatePresence>
                    {activeGame === 'osu' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-1 overflow-hidden"
                      >
                        {['standard', 'taiko', 'catch', 'mania'].map(m => (
                          <button 
                            key={m} 
                            onClick={() => setOsuMode(m)} 
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${osuMode === m ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'text-zinc-600 border border-transparent hover:text-zinc-400'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0c0c11] rounded-xl p-3 border border-white/[0.02] flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-zinc-500 font-bold mb-1">{displayData.scoreLabel}</span>
                    <span 
                      className={`text-lg tracking-tight ${displayData.scoreColor}`}
                      style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                      {displayData.scoreValue}
                    </span>
                  </div>
                  <div className="bg-[#0c0c11] rounded-xl p-3 border border-white/[0.02] flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-zinc-500 font-bold mb-1">全站排位</span>
                    <span 
                      className={`text-lg font-bold tracking-tight ${getRankColor(displayData.rankValue.replace('#',''))}`}
                      style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                      {displayData.rankValue}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Link to={`/profile/${user.username}`} className="flex-1 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl text-center text-xs font-semibold text-zinc-300 transition-colors active:scale-95">
                    进入个人空间
                  </Link>
                  <Link to="/friends" className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl text-xs font-semibold text-zinc-300 transition-colors active:scale-95">
                    <FaUserFriends /> 好友
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-14 h-14 rounded-full bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center mb-4">
                  <FaUserCircle className="text-2xl text-zinc-600" />
                </div>
                <p className="text-xs font-medium text-zinc-400 mb-5 leading-relaxed px-2">登录系统，在此查阅您的多栖战力档案与社交动态。</p>
                <Link to="/login" className="w-full py-2.5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95">
                  立即登录
                </Link>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:bg-[#1a1a24] transition-colors cursor-default">
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.5)]"></div>
                <h3 className="text-sm font-bold text-zinc-100 tracking-wide">今日推荐曲目</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.05] px-2 py-0.5 rounded-md">WIP</span>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-xl bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center shrink-0">
                <span className="text-xl text-zinc-600 font-bold opacity-30">?</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-zinc-400">系统调度中</span>
                <span className="text-xs text-zinc-500 mt-1">敬请期待后续版本更新...</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:bg-[#1a1a24] transition-colors cursor-default">
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 bg-purple-400 rounded-full shadow-[0_0_6px_rgba(192,132,252,0.5)]"></div>
                <h3 className="text-sm font-bold text-zinc-100 tracking-wide">今日挑战</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.05] px-2 py-0.5 rounded-md">WIP</span>
            </div>
            <div className="flex flex-col gap-1.5 relative z-10">
              <span className="text-base font-bold text-zinc-400">挑战任务生成中</span>
              <span className="text-xs text-zinc-500">完成后可获取额外的社区经验</span>
              <div className="mt-3 w-fit px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold rounded-lg opacity-50">
                奖励: +?? XP
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:bg-[#1a1a24] transition-colors cursor-default">
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.5)]"></div>
                <h3 className="text-sm font-bold text-zinc-100 tracking-wide">段位与排行</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.05] px-2 py-0.5 rounded-md">WIP</span>
            </div>
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center shrink-0">
                  <FaMedal className="text-2xl text-zinc-600 opacity-30" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-base font-bold text-zinc-400">段位系统建设中</span>
                  <span className="text-xs text-zinc-500 leading-relaxed">即将推出全新的竞技段位与专属排位赛面板...</span>
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </main>

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