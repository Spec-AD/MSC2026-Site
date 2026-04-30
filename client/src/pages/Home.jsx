import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
// bbcode-to-react 改为动态 import（不阻塞首屏 bundle）
// import bbcode from 'bbcode-to-react';
import { useAuth } from '../context/AuthContext'; 
import { useTheme } from '../context/ThemeContext'; // 🔥 引入全局主题管家
import { useToast } from '../context/ToastContext';
import { 
  FaCalendarCheck, FaSpinner, FaCommentDots, FaHeart, 
  FaChevronRight, FaTimes, FaUserCircle, FaBell, FaMedal,
  FaDiscord, FaPoll, FaUserFriends, FaHistory, FaGamepad,
  FaCrown, FaSun, FaMoon, FaMusic, FaCircle
} from 'react-icons/fa'; 

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast(); 
  
  // 🔥 直接从管家获取主题状态与切换方法
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark'; 
  
  const [announcements, setAnnouncements] = useState([]); 
  const [selectedNews, setSelectedNews] = useState(null); 
  const [showAllNews, setShowAllNews] = useState(false); 
  
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [serverTime, setServerTime] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);
  const [userStats, setUserStats] = useState(null);
  
  const [activeGame, setActiveGame] = useState('maimai'); 
  const [osuMode, setOsuMode] = useState('standard');
  const [dailySong, setDailySong] = useState(null);
  const [isDailyLoading, setIsDailyLoading] = useState(true);

  // ── 在线人数统计 ──────────────────────────────────────────
  const [bbcodeLib, setBbcodeLib] = useState(null);
  const [onlineStats, setOnlineStats] = useState(null);
  // BBCode 动态加载 — 用户点开公告时才加载
  useEffect(() => {
    if (selectedNews && !bbcodeLib) {
      import('bbcode-to-react').then(mod => setBbcodeLib(() => mod.default));
    }
  }, [selectedNews, bbcodeLib]);

  // 生成/恢复一个持久会话 ID（页面维度，不依赖登录态）
  const sessionIdRef = useRef((() => {
    let sid = sessionStorage.getItem('pb-session-id');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('pb-session-id', sid);
    }
    return sid;
  })());

  const hasCustomBanner = userStats?.bannerUrl && !userStats.bannerUrl.includes('bg.png');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('/api/announcements');
        const sortedData = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnnouncements(sortedData);
      } catch (err) { console.error('拉取公告失败', err); }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const fetchDailySong = async () => {
      setIsDailyLoading(true);
      try {
        const res = await axios.get('/api/daily-song');
        setDailySong(res.data);
      } catch (err) { console.error('拉取每日推荐曲目失败', err); } 
      finally { setIsDailyLoading(false); }
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
        timer = setInterval(() => { setServerTime(new Date(Date.now() + timeOffset)); }, 1000);
      } catch (err) { timer = setInterval(() => setServerTime(new Date()), 1000); }
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

  // 未读消息 — 延迟请求，不阻塞首屏渲染
  useEffect(() => {
    if (user) {
      const taskId = requestIdleCallback ? requestIdleCallback(async () => {
        try {
          const res = await axios.get('/api/messages/unread-count', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          setUnreadCount(res.data.count);
        } catch (err) {}
      }, { timeout: 3000 }) : setTimeout(() => fetchUnread(), 2000);
      return () => { if (requestIdleCallback) cancelIdleCallback(taskId); else clearTimeout(taskId); };
    }
  }, [user]);

  // ── 在线人数：心跳 + 轮询（首屏延迟 2s） ──────────────────
  useEffect(() => {
    const fetchOnlineStats = async () => {
      try {
        const res = await axios.get('/api/online/stats');
        setOnlineStats(res.data);
      } catch (err) { console.error('获取在线人数失败', err); }
    };
    const sendHeartbeat = async () => {
      try {
        await axios.post('/api/online/heartbeat', { sessionId: sessionIdRef.current });
      } catch (err) {}
    };
    sendHeartbeat();
    // 在线统计延迟 2s 请求，不阻塞首屏
    const statsDelay = setTimeout(fetchOnlineStats, 2000);
    const hbTimer = setInterval(sendHeartbeat, 60 * 1000);
    const statsTimer = setInterval(fetchOnlineStats, 60 * 1000);
    return () => { clearTimeout(statsDelay); clearInterval(hbTimer); clearInterval(statsTimer); };
  }, []);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/check-in', {}, { headers: { Authorization: `Bearer ${token}` }});
      addToast(`${res.data.msg}\nLv.${res.data.level} | XP: ${res.data.xp}`, 'success');
      if (userStats) setUserStats(prev => ({ ...prev, xp: res.data.xp, level: res.data.level }));
    } catch (err) { addToast(err.response?.data?.msg || '签到失败', 'error'); } 
    finally { setIsCheckingIn(false); }
  };

  const getRankColor = (rank) => {
    if (rank === '-' || !rank) return 'text-zinc-400 dark:text-zinc-500';
    if (typeof rank === 'string' && rank.includes('%')) {
      const val = parseFloat(rank);
      if (val >= 80) return 'text-emerald-500 dark:text-emerald-400';
      if (val >= 50) return 'text-amber-500 dark:text-yellow-400';
      return 'text-rose-500 dark:text-rose-400';
    }
    const r = Number(rank);
    if (r >= 1 && r <= 10) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-amber-500 to-cyan-500 dark:from-pink-400 dark:via-amber-400 dark:to-cyan-400';
    if (r >= 11 && r <= 100) return 'text-cyan-500 dark:text-cyan-400';
    return 'text-blue-500 dark:text-blue-400';
  };

  const getDisplayData = () => {
    if (activeGame === 'maimai') {
      return {
        scoreLabel: '综合战力 (PF)',
        scoreValue: userStats?.totalPf ? userStats.totalPf.toFixed(2) : '0.00',
        scoreColor: userStats?.totalPf ? `text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-cyan-400 dark:to-indigo-400` : 'text-zinc-400 dark:text-zinc-500',
        rankLabel: '全站排位', rankValue: userStats?.pfRank !== '-' && userStats?.pfRank ? `#${userStats.pfRank}` : '-'
      };
    } else if (activeGame === 'chunithm') {
      let color = 'text-zinc-400 dark:text-zinc-500';
      const rating = userStats?.chuniRating || 0;
      if (rating >= 17.00) color = `text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 dark:from-cyan-300 dark:via-purple-300 dark:to-pink-300 dark:drop-shadow-[0_0_8px_rgba(192,132,252,0.6)] font-black`;
      else if (rating >= 16.00) color = `font-bold text-rose-500 dark:text-rose-400`;
      else if (rating >= 15.00) color = `font-bold text-purple-500 dark:text-purple-400`;
      else if (rating > 0) color = `font-bold text-amber-500 dark:text-yellow-400`;
      return {
        scoreLabel: 'Rating', scoreValue: rating ? rating.toFixed(2) : '0.00', scoreColor: color,
        rankLabel: '全站排位', rankValue: userStats?.chuniRank && userStats?.chuniRank !== '-' ? `#${userStats.chuniRank}` : '-'
      };
    } else if (activeGame === 'decode') {
      const ov = userStats?.letterGameStats?.totalOv || 0;
      const accuracy = userStats?.letterGameStats?.accuracy || 0;
      return {
        scoreLabel: 'Total OV',
        scoreValue: ov > 0 ? ov.toFixed(2) : '0.00',
        scoreColor: ov > 0 ? `text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 dark:from-purple-400 dark:to-cyan-400 dark:drop-shadow-[0_0_8px_rgba(192,132,252,0.6)] font-black` : 'text-zinc-400 dark:text-zinc-500',
        rankLabel: 'Accuracy', rankValue: accuracy > 0 ? `${(accuracy * 100).toFixed(1)}%` : '-'
      };
    } else {
      const modeMatch = userStats?.osuMode?.toLowerCase() === osuMode.toLowerCase();
      const pp = userStats?.osuDetails?.[osuMode]?.pp || (modeMatch ? userStats?.osuPp : null);
      const rank = userStats?.osuDetails?.[osuMode]?.rank || (modeMatch ? userStats?.osuGlobalRank : null);
      return {
        scoreLabel: 'Performance (PP)', scoreValue: pp ? Math.round(pp) : '--',
        scoreColor: pp ? 'text-pink-500 dark:text-pink-400' : 'text-zinc-400 dark:text-zinc-500',
        rankLabel: '全球排名', rankValue: rank ? `#${rank}` : '-'
      };
    }
  };

  const displayData = getDisplayData();
  const fullPreviewNews = announcements.slice(0, 3); 
  const compactNews = showAllNews ? announcements.slice(3) : announcements.slice(3, 8); 
  const hasMoreNews = announcements.length > 8 && !showAllNews;

  // ── 在线人数 SVG 折线图（不依赖任何图表库）─────────────────
  const renderOnlineChart = () => {
    if (!onlineStats) return null;
    const { hourlyData, currentHour, currentMinute, currentCount } = onlineStats;
    const W = 1000, H = 80;
    const PAD_L = 36, PAD_R = 16, PAD_T = 10, PAD_B = 24;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const visibleHours = currentHour + 1;
    const validVals = hourlyData.slice(0, visibleHours).filter(v => v !== null);
    const maxVal = Math.max(...validVals, 1);
    const xOf = (h) => PAD_L + (h / 23) * chartW;
    const yOf = (v) => PAD_T + chartH - (v / maxVal) * chartH;
    const points = [];
    for (let h = 0; h < visibleHours; h++) {
      const v = hourlyData[h];
      if (v !== null) points.push({ x: xOf(h), y: yOf(v) });
    }
    const nowX = PAD_L + ((currentHour + currentMinute / 60) / 23) * chartW;
    const nowY = yOf(currentCount);
    const lineStr = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaStr = points.length > 0
      ? `${points[0].x},${PAD_T + chartH} ${lineStr} ${points[points.length - 1].x},${PAD_T + chartH}`
      : '';
    const xTicks = [0, 4, 8, 12, 16, 20, 23];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="onlineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="onlineLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={PAD_L} y1={PAD_T + chartH - r * chartH} x2={W - PAD_R} y2={PAD_T + chartH - r * chartH}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        ))}
        {areaStr && <polygon points={areaStr} fill="url(#onlineAreaGrad)" />}
        {lineStr && (
          <polyline points={lineStr} fill="none" stroke="url(#onlineLineGrad)"
            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        )}
        <line x1={nowX} y1={PAD_T} x2={nowX} y2={PAD_T + chartH}
          stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" strokeOpacity="0.85" />
        <circle cx={nowX} cy={nowY} r="7" fill="#f59e0b" fillOpacity="0.2" />
        <circle cx={nowX} cy={nowY} r="4" fill="#f59e0b" />
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH}
          stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        {xTicks.map(h => (
          <text key={h} x={xOf(h)} y={H - 4} textAnchor="middle" fontSize="9"
            fill="currentColor" fillOpacity="0.4" fontFamily="Quicksand, sans-serif">
            {String(h).padStart(2, '0')}:00
          </text>
        ))}
        <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize="8"
          fill="currentColor" fillOpacity="0.4" fontFamily="Quicksand, sans-serif">
          {maxVal}
        </text>
      </svg>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0c0c11] text-zinc-900 dark:text-zinc-200 selection:bg-indigo-500/30 relative pb-20 overflow-x-hidden transition-colors duration-300" style={{ fontFamily: "'Quicksand', 'NotoSansSC', sans-serif" }}>
      
            {/* 悬浮主题切换按钮 */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-8 right-8 w-11 h-11 rounded-md flex items-center justify-center shadow-lg transition-all duration-300 z-[100] active:scale-90 bg-white dark:bg-[#15151e] border border-zinc-200 dark:border-white/10 text-indigo-500 dark:text-yellow-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
        title="切换色彩主题"
      >
        {isDark ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
      </button>

      {/* 背景氛围光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-60 bg-cyan-500/10 dark:bg-cyan-900/10 mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-60 bg-purple-500/10 dark:bg-purple-900/10 mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      {/* 顶层无缝 Banner 区域 */}
      <div className="absolute top-0 left-0 w-full h-[55vh] pointer-events-none z-0 flex justify-center">
        <div className="absolute inset-0">
          {hasCustomBanner ? (
            <img 
              src={userStats.bannerUrl} alt="User Banner"
              className="w-full h-full object-cover transition-opacity duration-1000 opacity-100 dark:opacity-30 dark:mix-blend-screen"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          ) : (
            // 波点阵列花纹，智能适配深浅色
            <div 
              className="w-full h-full text-black dark:text-white opacity-[0.03] dark:opacity-[0.05]"
              style={{ 
                backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', 
                backgroundSize: '32px 32px' 
              }}
            ></div>
          )}
        </div>
        {/* 多段渐变边缘消融至主背景色 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/80 to-gray-50 dark:via-[#0c0c11]/80 dark:to-[#0c0c11]"></div>
      </div>

            {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-6 pb-4 flex justify-between items-center z-50 relative">
        <div className="flex items-center shrink-0">
          <img src={isDark ? "/assets/logos.png" : "/assets/logos_dark.png"} alt="PUREBEAT Logo" className="h-10 md:h-14 object-contain drop-shadow-lg transition-all" />
          
          <div className="hidden lg:flex flex-col justify-center ml-6 pl-6 border-l border-zinc-300 dark:border-white/10">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-wider drop-shadow-md leading-none" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {serverTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-1.5 leading-none" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {serverTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {user && (
            <button onClick={() => navigate('/inbox')} className="flex items-center justify-center gap-1.5 min-w-[40px] px-2 h-10 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-white rounded-md transition-all active:scale-95">
              <FaBell className="text-[16px]" />
              {unreadCount > 0 && <span className="text-[13px] font-bold text-rose-500 leading-none pt-0.5" style={{ fontFamily: "'Quicksand', sans-serif" }}>{unreadCount}</span>}
            </button>
          )}
          <button onClick={() => navigate('/voting')} className="flex items-center justify-center w-10 h-10 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-white rounded-md transition-all active:scale-95">
            <FaPoll className="text-[16px]" />
          </button>
          {user && (
            <button onClick={handleCheckIn} disabled={isCheckingIn} className="flex items-center justify-center w-10 h-10 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-white rounded-md transition-all active:scale-95 disabled:opacity-50">
              {isCheckingIn ? <FaSpinner className="animate-spin text-[16px]" /> : <FaCalendarCheck className="text-[16px]" />}
            </button>
          )}
          <button onClick={() => navigate('/feedback')} className="flex items-center justify-center w-10 h-10 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-white rounded-md transition-all active:scale-95">
            <FaCommentDots className="text-[16px]" />
          </button>
          <a href="https://discord.gg/EnYB5GeB58" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md transition-all active:scale-95">
            <FaDiscord className="text-[18px]" />
          </a>
          <a href="https://afdian.com/a/purebeat" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center justify-center w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-all active:scale-95">
            <FaHeart className="text-[16px]" />
          </a>
        </div>
      </header>

      {/* ── 在线人数统计卡片（Daily Track 正上方）──────────────── */}
      <section className="w-full max-w-7xl mx-auto px-6 z-10 relative mb-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full bg-white dark:bg-[#15151e] border border-zinc-100 dark:border-white/5 px-5 pt-3 pb-2"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FaCircle className="text-[7px] text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Online Now</span>
              <span className="text-[15px] font-black text-emerald-500 dark:text-emerald-400 ml-1 tabular-nums" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {onlineStats !== null ? onlineStats.currentCount : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onlineStats && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 tabular-nums">
                  {(() => {
                    const d = new Date(onlineStats.serverTime);
                    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${onlineStats.timezone}`;
                  })()}
                </span>
              )}
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-widest">NOW</span>
            </div>
          </div>
          <div className="text-zinc-400 dark:text-zinc-600 w-full">
            {onlineStats ? renderOnlineChart() : (
              <div className="h-[80px] flex items-center justify-center">
                <FaSpinner className="animate-spin text-indigo-400/40 text-xl" />
              </div>
            )}
          </div>
        </motion.div>
      </section>

            {/* Daily Track Hero Section - Full Width, split 70/30 */}
            <section className="w-full max-w-7xl mx-auto px-6 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white dark:bg-[#15151e] border-l-4 border-l-indigo-500 border-b border-zinc-100 dark:border-white/5 relative overflow-hidden flex flex-col md:flex-row"
        >
          {/* 左侧：今日歌曲详情 (70%) */}
          <div
            onClick={() => { if (dailySong && dailySong.title) navigate(`/daily-song/${dailySong._id || 'today'}`); }}
            className={`flex-[7] p-8 relative overflow-hidden transition-all duration-300 ${
              dailySong && dailySong.title
                ? 'cursor-pointer group hover:bg-gray-50 dark:hover:bg-[#1a1a24]'
                : 'cursor-default'
            }`}
          >
            {/* ── 封面背景：模糊 + 四周晕影，仅 Daily Track 左侧（不含往期推荐）── */}
            {dailySong && dailySong.coverUrl && !dailySong.coverUrl.includes('bg.png') && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <img
                  src={dailySong.coverUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute aspect-square object-cover"
                  style={{
                    width: '55%',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    filter: 'blur(28px)',
                    opacity: isDark ? 0.18 : 0.28,
                  }}
                />
                {/* 晕影：径向渐变从中心透明向四周淡出至卡片背景色 */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: isDark
                      ? 'radial-gradient(ellipse 75% 85% at 50% 50%, transparent 15%, #15151e 72%)'
                      : 'radial-gradient(ellipse 75% 85% at 50% 50%, transparent 15%, #ffffff 72%)',
                  }}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/3 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-5 relative z-10">
              <h3 className="text-sm uppercase tracking-widest text-zinc-800 dark:text-zinc-100 font-bold">Daily Track</h3>
              <span className="text-[9px] font-bold px-2 py-0.5 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                {serverTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {isDailyLoading ? (
              <div className="flex items-center justify-center py-10 relative z-10">
                <FaSpinner className="animate-spin text-3xl text-indigo-500/40" />
              </div>
            ) : dailySong && dailySong.title ? (
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-28 h-28 md:w-32 md:h-32 bg-gray-100 dark:bg-[#0a0a0c] border-l-2 border-indigo-300 dark:border-indigo-500/30 shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                  <FaMusic className="text-zinc-400 dark:text-zinc-600 opacity-20 text-4xl absolute z-0" />
                  {dailySong.coverUrl && !dailySong.coverUrl.includes('bg.png') && (
                    <img
                      src={dailySong.coverUrl}
                      alt="Cover"
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <h2
                    className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                    title={dailySong.title}
                  >
                    {dailySong.title}
                  </h2>
                  <p className="text-base text-zinc-500 dark:text-zinc-400 truncate mt-1.5">{dailySong.artist}</p>
                  <span className="text-[11px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mt-2 inline-block">{dailySong.source}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6 relative z-10 opacity-40 py-4">
                <div className="w-28 h-28 md:w-32 md:h-32 bg-gray-100 dark:bg-white/5 border-l-2 border-zinc-300 dark:border-white/10 flex items-center justify-center shrink-0">
                  <FaMusic className="text-3xl text-zinc-400 dark:text-zinc-600" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-zinc-500 dark:text-zinc-400">正在挑选今日曲目...</h2>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">请稍后再来看看吧</p>
                </div>
              </div>
            )}
          </div>

          {/* 竖向分割线 */}
          <div className="hidden md:block w-px bg-zinc-100 dark:bg-white/5 self-stretch"></div>
          {/* 横向分割线（移动端） */}
          <div className="block md:hidden h-px bg-zinc-100 dark:bg-white/5 w-full"></div>

                    {/* 右侧：往期推荐 (30%) */}
          <div
            onClick={() => navigate('/daily-history')}
            className="flex-[3] bg-gray-50/80 dark:bg-[#0c0c11]/40 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[#0c0c11]/70 transition-all duration-300 group relative overflow-hidden"
          >
            {/* 背景图片 */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20 group-hover:opacity-40 dark:group-hover:opacity-30 transition-opacity duration-500">
              <img 
                src="/assets/View_history.png" 
                alt="History Background" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/60 via-transparent to-indigo-500/5 dark:from-[#0c0c11]/60 dark:to-indigo-500/10 group-hover:from-gray-100/70 dark:group-hover:from-[#0c0c11]/70 transition-all duration-500 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-[#15151e] border-l-2 border-indigo-400 dark:border-indigo-500/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FaHistory className="text-xl text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">往期推荐</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-0.5">View History</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <main className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative mt-8">
        
                {/* 左侧：新闻与活动 */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link to="/tournaments" className="block group">
                <div className="relative w-full aspect-[21/8] md:aspect-[21/6] overflow-hidden border-l-4 border-l-indigo-500 bg-white dark:bg-[#15151e] transition-all duration-500 group-hover:border-l-indigo-400 dark:group-hover:border-l-indigo-400">
                <img 
                  src="/assets/register_banner.png" 
                  alt="Tournament Banner"
                  className="w-full h-full object-cover opacity-80 dark:opacity-60 grayscale-[30%] group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 dark:from-[#0c0c11]/90 dark:via-[#0c0c11]/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 md:bottom-6 left-6 md:left-8">
                  <span className="bg-indigo-500 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
                    Official Event
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white mt-2.5 drop-shadow-md tracking-tight group-hover:text-indigo-200 transition-colors">
                    探索社区最新赛事
                  </h2>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                        <div className="flex items-center gap-3 mb-5 px-1 border-b border-zinc-200 dark:border-white/5 pb-4">
              <div className="w-1 h-5 bg-indigo-500"></div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">资讯枢纽</h2>
            </div>

            <div className="flex flex-col gap-4">
              {fullPreviewNews.map((news) => {
                const d = new Date(news.createdAt);
                return (
                  <div key={news._id} onClick={() => setSelectedNews(news)} className="bg-white dark:bg-[#15151e] border-l-4 border-l-transparent hover:border-l-indigo-500 border-b border-zinc-100 dark:border-white/5 cursor-pointer transition-all duration-300 group flex flex-col md:flex-row h-auto md:h-44">
                    <div className="relative w-full md:w-64 h-40 md:h-full bg-gray-100 dark:bg-[#0a0a0c] overflow-hidden shrink-0 flex items-center justify-center rounded-none">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent group-hover:scale-105 transition-transform duration-700 z-0"></div>
                      <span className="text-4xl text-zinc-300 dark:text-zinc-800 font-bold opacity-50 z-0 relative tracking-widest">NEWS</span>
                      
                      {news.coverUrl && !news.coverUrl.includes('bg.png') && (
                        <img 
                          src={news.coverUrl} 
                          alt="Cover" 
                          className="w-full h-full object-cover opacity-100 dark:opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 absolute inset-0 z-10" 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      )}
                      <div className="absolute top-4 right-4 md:left-4 md:right-auto px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-black/60 backdrop-blur-md text-white border border-white/10 z-20">
                        {news.type || 'NEWS'}
                      </div>
                    </div>
                    
                    <div className="p-5 md:p-6 flex flex-col justify-center flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug truncate">
                        {news.title}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed line-clamp-2">
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
                      <div key={news._id} onClick={() => setSelectedNews(news)} className="flex items-center justify-between px-2 py-4 border-b border-zinc-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all duration-300 group border-l-4 border-l-transparent hover:border-l-indigo-500">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-zinc-500 w-10 shrink-0 text-center uppercase tracking-wider" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {news.title}
                          </span>
                        </div>
                        <FaChevronRight className="text-[10px] text-zinc-400 dark:text-zinc-600 group-hover:text-indigo-500 shrink-0 ml-4 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              )}

                            {hasMoreNews && (
                <button onClick={() => setShowAllNews(true)} className="w-full py-3.5 mt-1 bg-transparent border-b-2 border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  展开全部资讯 <FaChevronRight className="text-[10px]" />
                </button>
              )}
            </div>
          </motion.div>
        </div>

                {/* 右侧区域：个人档案与游戏入口 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white dark:bg-[#15151e] border-l-4 border-l-cyan-500 border-b border-zinc-100 dark:border-white/5 p-6 relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/20 blur-[40px] rounded-full pointer-events-none transition-all group-hover:scale-125"></div>

                        <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Player Profile</h3>
              </div>
            </div>
            
            {user ? (
              <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <img src={userStats?.avatarUrl || user.avatarUrl || '/assets/logos.png'} alt="Avatar" className="w-14 h-14 rounded-full object-cover bg-gray-50 dark:bg-[#0c0c11] border border-zinc-200 dark:border-white/10 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xl font-bold text-zinc-900 dark:text-white truncate tracking-tight">{userStats?.username || user.username}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src={`/assets/lv${userStats?.level || user.level || 1}_badge.png`} alt="Lv" className="h-4 object-contain drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />
                      <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold" style={{ fontFamily: "'Quicksand', sans-serif" }}>Lv.{userStats?.level || user.level || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 dark:bg-[#0c0c11]/80 p-0.5 border-b-2 border-zinc-200 dark:border-white/5 flex mb-4">
                  {[{id:'maimai', label:'Maimai'}, {id:'chunithm', label:'Chuni'}, {id:'osu', label:'osu!'}, {id:'decode', label:'Decode'}].map(game => (
                    <button 
                      key={game.id} onClick={() => setActiveGame(game.id)} 
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${activeGame === game.id ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
                    >
                      {game.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {activeGame === 'osu' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-1 overflow-hidden mb-3">
                                            {['standard', 'taiko', 'catch', 'mania'].map(m => (
                        <button key={m} onClick={() => setOsuMode(m)} className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${osuMode === m ? 'bg-pink-500 text-white border-b-2 border-pink-700' : 'bg-gray-50 dark:bg-white/5 border-b-2 border-transparent text-zinc-500'}`}>
                          {m}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                                <div className="grid grid-cols-2 gap-0 mb-4 border border-zinc-100 dark:border-white/5">
                  <div className="p-4 border-r border-zinc-100 dark:border-white/5 flex flex-col justify-center items-center text-center bg-gray-50 dark:bg-[#0c0c11]/50">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-widest mb-1.5">{displayData.scoreLabel}</span>
                    <span className={`text-2xl md:text-3xl font-black tracking-tight ${displayData.scoreColor}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{displayData.scoreValue}</span>
                  </div>
                  <div className="p-4 flex flex-col justify-center items-center text-center bg-gray-50 dark:bg-[#0c0c11]/50">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-widest mb-1.5">{displayData.rankLabel}</span>
                    <span className={`text-2xl md:text-3xl font-black tracking-tight ${getRankColor(displayData.rankValue.replace('#',''))}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>{displayData.rankValue}</span>
                  </div>
                </div>

                                <div className="flex items-center gap-2">
                  <Link to={`/profile/${user.username}`} className="flex-1 py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border-b-2 border-zinc-200 dark:border-white/10 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors active:scale-95">
                    进入个人空间
                  </Link>
                  <Link to="/friends" className="w-12 py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 border-b-2 border-zinc-200 dark:border-white/10 flex items-center justify-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors active:scale-95">
                    <FaUserFriends />
                  </Link>
                </div>
              </div>
            ) : (
                            <div className="flex flex-col items-center text-center py-4 relative z-10">
                <FaUserCircle className="text-5xl text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed px-2">登录系统，查阅您的专属战力档案与最新社交动态。</p>
                <Link to="/login" className="w-full py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-sm font-bold transition-all active:scale-95">
                  立即登录档案库
                </Link>
              </div>
            )}
          </motion.div>

                              <motion.div 
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} 
            onClick={() => navigate('/letter-game')}
            className="bg-white dark:bg-[#15151e] border-l-4 border-l-cyan-500 border-b border-zinc-100 dark:border-white/5 p-6 relative overflow-hidden group hover:border-l-cyan-400 transition-all duration-300 cursor-pointer active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            
                        <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] uppercase tracking-widest text-zinc-800 dark:text-zinc-100 font-bold">Mini Game</h3>
              </div>
              <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 bg-cyan-500 text-white">V 2.0</span>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-cyan-50 dark:bg-[#0c0c11] border-l-2 border-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-500">
                <FaGamepad className="text-2xl text-cyan-500 dark:text-cyan-400 drop-shadow-md transition-colors" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 truncate tracking-tight">
                  开字母
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  全新星级自选系统。<br/>挑战全球 OV 算力排位！
                </span>
              </div>
            </div>
          </motion.div>

                              

                    <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white dark:bg-[#15151e] border-l-4 border-l-purple-500 border-b border-zinc-100 dark:border-white/5 p-5 relative overflow-hidden flex flex-col items-center justify-center text-center group">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center mb-2"><FaMedal className="text-purple-600 dark:text-purple-500 text-sm" /></div>
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300">今日挑战</h3>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-widest font-bold">WIP</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-white dark:bg-[#15151e] border-l-4 border-l-amber-500 border-b border-zinc-100 dark:border-white/5 p-5 relative overflow-hidden flex flex-col items-center justify-center text-center group">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-2"><FaCrown className="text-amber-600 dark:text-amber-500 text-sm" /></div>
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-300">排位系统</h3>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-widest font-bold">WIP</p>
            </motion.div>
          </div>
          
        </div>
      </main>

      {/* 新闻阅读 Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm"
            />
            
                        <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-white dark:bg-[#15151e] border border-zinc-200 dark:border-white/5 border-t-4 border-t-indigo-500 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-white/5 bg-gray-50 dark:bg-[#1a1a24] shrink-0 flex justify-between items-start rounded-none">
                <div className="pr-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-indigo-500 text-white">
                      {selectedNews.type || 'NEWS'}
                    </span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      {new Date(selectedNews.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
                    {selectedNews.title}
                  </h2>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-3 flex items-center gap-1.5">
                    撰稿人：<span className="text-zinc-800 dark:text-zinc-300">{selectedNews.authors?.join(', ') || 'PUREBEAT 社区编辑部'}</span>
                  </div>
                </div>
                
                                <button 
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all active:scale-90"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#15151e]">
                <div className="text-zinc-700 dark:text-zinc-300 leading-loose text-[15px] md:text-base bbcode-content whitespace-pre-wrap">
                  {bbcodeLib ? bbcodeLib.toReact(selectedNews.content) : selectedNews.content}
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