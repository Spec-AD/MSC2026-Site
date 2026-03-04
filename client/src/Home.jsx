import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import bbcode from 'bbcode-to-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEnvelope, FaCalendarCheck, FaSpinner, FaChevronRight, FaBullhorn } from 'react-icons/fa'; 
import { useToast } from '../context/ToastContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0);
  const { addToast } = useToast(); 
  const [isCheckingIn, setIsCheckingIn] = useState(false);

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
      setTimeout(() => window.location.reload(), 2000); 
    } catch (err) {
      addToast(err.response?.data?.msg || '签到失败', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    // 采用与 Inbox 一致的经典深渊色背景
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 flex flex-col items-center overflow-x-hidden font-sans selection:bg-zinc-600/40">
      
      {/* ==================================================== */}
      {/* 顶部导航 - 干净明了的现代化毛玻璃 Header */}
      {/* ==================================================== */}
      <div className="fixed top-0 w-full z-[100] px-6 py-4 flex justify-between items-center bg-[#111115]/80 backdrop-blur-xl border-b border-white/[0.05] transition-all">
        
        {/* 品牌标识 */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-zinc-100">
            PUREBEAT
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-white/[0.05] text-xs font-medium text-zinc-400">
            Hub
          </span>
        </div>

        {/* 交互区：统一大圆角社区风格按钮 */}
        <div className="flex items-center gap-3">
          {user && (
            <button 
              onClick={() => navigate('/inbox')}
              className="relative flex items-center justify-center w-10 h-10 bg-[#1a1a20] hover:bg-[#222228] border border-white/[0.05] text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95"
              title="收件箱"
            >
              <FaEnvelope className="text-[15px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-zinc-200 rounded-full border-2 border-[#111115] shadow-sm"></span>
              )}
            </button>
          )}

          {user && (
            <button 
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a20] hover:bg-[#222228] border border-white/[0.05] text-zinc-300 hover:text-zinc-100 rounded-xl transition-all text-sm font-medium active:scale-95 disabled:opacity-50"
            >
              {isCheckingIn ? <FaSpinner className="animate-spin" /> : <FaCalendarCheck />}
              <span className="hidden md:inline">每日签到</span>
            </button>
          )}

          <button 
            onClick={() => navigate('/feedback')}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] rounded-xl transition-all"
          >
            反馈
          </button>

          <a 
            href="https://afdian.com/a/purebeat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2 bg-zinc-200 text-zinc-900 text-sm font-bold rounded-xl hover:bg-white transition-all shadow-sm active:scale-95"
          >
            支持我们
          </a>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 英雄区域 - 柔和聚焦、稳重视效 */}
      {/* ==================================================== */}
      <div className="relative w-full pt-32 pb-16 flex flex-col items-center justify-center px-6">
        
        <div className="z-10 flex flex-col items-center w-full max-w-5xl">
          {/* Logo 优雅淡入 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative drop-shadow-2xl"
          >
            <img 
              src="/assets/logos.png" 
              alt="PUREBEAT Logo" 
              className="w-[80vw] md:w-[50vw] max-w-[600px] object-contain"
            />
          </motion.div>

          {/* Banner 区域：极具质感的圆角卡片包装 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="w-full max-w-[800px] mt-12"
          >
            <Link to="/register" className="group block">
              <div className="relative w-full aspect-[10/2] md:aspect-[10/1.5] rounded-2xl overflow-hidden border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-500 group-hover:border-zinc-500/30 group-hover:-translate-y-1 bg-[#0a0a0c]">
                <img 
                  src="/assets/register_banner.png" 
                  alt="Register Banner"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  onError={(e) => { e.target.src = 'https://placehold.co/1600x400/18181c/525252?text=PUREBEAT+CHAMPIONSHIP'; }} 
                />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 公告与资讯区域 - 现代卡片流布局 */}
      {/* ==================================================== */}
      <div className="w-full max-w-4xl mx-auto px-6 py-16 z-10 relative flex-1">
        
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1a1a20] border border-white/[0.05] flex items-center justify-center text-zinc-400 shadow-sm">
            <FaBullhorn className="text-lg" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
              社区资讯
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Announcements & Updates
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {announcements.length > 0 ? (
            announcements.map((announcement, index) => {
              const d = new Date(announcement.createdAt);
              const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

              return (
                <motion.div 
                  key={announcement._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className="bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 md:p-8 hover:bg-[#1a1a20] transition-colors shadow-sm group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-white/[0.04] border border-white/[0.05] rounded-lg text-xs font-medium text-zinc-400">
                      {announcement.type}
                    </span>
                    <span className="text-sm font-medium text-zinc-500">
                      {dateStr}
                    </span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-zinc-100 tracking-tight group-hover:text-white transition-colors">
                    {announcement.title}
                  </h3>
                  
                  <div className="text-zinc-400 leading-relaxed text-[15px] bbcode-content">
                    {bbcode.toReact(announcement.content)}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/[0.05] flex justify-end">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      查看详情 <FaChevronRight className="text-xs transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-[#18181c] border border-white/[0.05] rounded-2xl">
               <FaEnvelope className="text-4xl text-zinc-600 mb-4 opacity-30" />
               <span className="text-sm font-medium text-zinc-500">暂无最新资讯</span>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 极简页脚 */}
      {/* ==================================================== */}
      <footer className="w-full py-10 mt-10 border-t border-white/[0.05] flex flex-col items-center bg-[#0a0a0c]">
         <span className="text-sm font-medium text-zinc-600">PUREBEAT © 2026</span>
         <span className="text-xs text-zinc-700 mt-2">Community-driven Game Hub</span>
      </footer>
    </div>
  );
};

export default Home;