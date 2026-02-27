import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import FallingIcons from '../components/FallingIcons'; 
import { useAuth } from '../context/AuthContext'; 
import bbcode from 'bbcode-to-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEnvelope, FaCalendarCheck, FaSpinner } from 'react-icons/fa'; 
import { useToast } from '../context/ToastContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0);
  const { addToast } = useToast(); 
  
  // 🔥 新增：签到状态
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // 页面加载时拉取公告数据
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

  // 如果用户已登录，拉取未读消息数（小红点）
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

  // 🔥 新增：签到处理函数
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/check-in', {}, { headers: { Authorization: `Bearer ${token}` }});
      addToast(`${res.data.msg}\n当前等级: Lv.${res.data.level} | 经验: ${res.data.xp}`, 'success');
      // 签到成功后刷新页面以更新最新数据
      window.location.reload(); 
    } catch (err) {
      addToast(err.response?.data?.msg || '签到失败', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    // 外层容器：支持滚动，隐藏横向溢出
    <div className="w-full min-h-screen text-white flex flex-col items-center overflow-x-hidden relative bg-gradient-to-b from-transparent to-black/80">
      
      {/* ==================================================== */}
      {/* 主页右上角专属标志与按钮群 */}
      {/* ==================================================== */}
      <div className="absolute top-6 right-6 md:right-8 z-[100] flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-6 pointer-events-auto">
        
        {/* 品牌标识 */}
        <div className="text-right flex flex-col items-end cursor-default select-none">
          <span className="text-xl md:text-2xl font-black italic tracking-widest text-white drop-shadow-md leading-none">
            purebeat.top
          </span>
          <span className="text-[10px] font-mono text-purple-400 font-bold tracking-widest mt-1 uppercase">
            Version 1.1.3
          </span>
        </div>

        {/* 极简风操作按钮群 */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* 1. 信封 (收件箱) - 仅登录可见 */}
          {user && (
            <button 
              onClick={() => navigate('/inbox')}
              className="relative text-gray-300 hover:text-white bg-black/40 p-2 md:p-2.5 rounded-full transition-all backdrop-blur-md border border-gray-600 hover:border-gray-400 flex items-center justify-center"
              title="收件箱"
            >
              <FaEnvelope className="text-sm md:text-base" />
              
              {/* 小红点逻辑 */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* 🔥 2. 新增：每日签到按钮 (仅登录可见) */}
          {user && (
            <button 
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500 hover:to-blue-500 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-transparent rounded-full font-bold text-[10px] md:text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 backdrop-blur-md"
              title="每日签到 (获得经验)"
            >
              {isCheckingIn ? <FaSpinner className="animate-spin text-sm md:text-base" /> : <FaCalendarCheck className="text-sm md:text-base" />}
              <span className="hidden md:inline">Check-In</span>
            </button>
          )}

          {/* 3. 反馈按钮 */}
          <button 
            onClick={() => navigate('/feedback')}
            className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 bg-black/40 px-3 md:px-4 py-2 rounded-full transition-all backdrop-blur-md"
          >
            Feedback
          </button>

          {/* 4. 捐赠按钮 */}
          <a 
            href="https://afdian.com/a/purebeat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-yellow-400 hover:text-yellow-300 border border-yellow-500/50 hover:border-yellow-400 bg-yellow-500/10 px-3 md:px-4 py-2 rounded-full transition-all backdrop-blur-md shadow-[0_0_10px_rgba(234,179,8,0.2)] flex items-center"
          >
            Donate
          </a>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. 英雄区域 (Hero Section) */}
      {/* ==================================================== */}
      <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        
        <FallingIcons />

        <div className="z-10 flex flex-col items-center text-center w-full">
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative group"
          >
            <img 
              src="/assets/logos.png" 
              alt="MSC 2026 Logo" 
              className="w-[100vw] md:w-[80vw] max-w-[1000px] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] md:drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
            />
            
            <div className="absolute inset-0 bg-white/10 blur-[40px] md:blur-[50px] rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-1000"></div>
          </motion.div>

          <div className="h-10 md:h-16"></div>

          {/* 🚀 核心替换：osu! 风格长图广告位 Banner 🚀 */}
          <Link to="/register" className="w-full max-w-[850px] px-4 group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full aspect-[5/1] md:aspect-[8/1] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl group-hover:border-white/30 transition-all duration-500 bg-gray-900"
            >
              {/* Banner 背景图片 - 建议尺寸 1600x200 */}
              <img 
                src="/assets/register_banner.png" 
                alt="Register for MSC 2026"
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                onError={(e) => { e.target.src = 'https://placehold.co/1600x200/0a0a0a/ffffff?text=ENTER+THE+STAGE+MSC+2026'; }} 
              />

              {/* 动态扫光层 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. 史诗级公告区域 (Latest Directives) */}
      {/* ==================================================== */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-24 z-10 relative">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 md:mb-24"
        >
          <h2 className="text-[3rem] md:text-[6rem] font-black italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 drop-shadow-2xl">
            DIRECTIVES.
          </h2>
          <div className="text-blue-400 font-mono font-bold tracking-[0.3em] uppercase mt-2 md:mt-4 pl-1">
            Latest Announcements & News
          </div>
        </motion.div>

        <div className="space-y-16 md:space-y-24">
          {announcements.length > 0 ? (
            announcements.map((announcement, index) => {
              const d = new Date(announcement.createdAt);
              const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
              const yearStr = d.getFullYear().toString();

              return (
                <motion.div 
                  key={announcement._id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex flex-col md:flex-row gap-6 md:gap-12 relative group"
                >
                  <div className="md:w-1/4 flex-shrink-0 flex md:flex-col items-baseline md:items-start gap-3 md:gap-0 border-b border-white/10 md:border-none pb-4 md:pb-0">
                    <div className="text-5xl md:text-7xl font-black italic tracking-tighter text-gray-300 group-hover:text-white transition-colors duration-500">
                      {dateStr}
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-gray-600 font-mono">
                      {yearStr}
                    </div>
                    <div className="mt-0 md:mt-4 ml-auto md:ml-0 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] md:text-xs tracking-widest uppercase text-blue-400 font-bold">
                      {announcement.type}
                    </div>
                  </div>

                  <div className="md:w-3/4">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl group-hover:bg-white/[0.03] transition-colors duration-500">
                      <h3 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8 text-white tracking-tight">
                        {announcement.title}
                      </h3>
                      <div className="text-gray-300 leading-loose text-sm md:text-base bbcode-content whitespace-pre-wrap break-words">
                        {bbcode.toReact(announcement.content)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-20 text-gray-500 border border-white/5 rounded-3xl bg-black/20 backdrop-blur-md">
               <span className="font-mono tracking-widest">AWAITING DIRECTIVES...</span>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Home;