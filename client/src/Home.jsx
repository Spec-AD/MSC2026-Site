import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import FallingIcons from '../components/FallingIcons'; 
import { useAuth } from '../context/AuthContext'; 
import bbcode from 'bbcode-to-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEnvelope, FaCalendarCheck, FaSpinner, FaChevronRight } from 'react-icons/fa'; 
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
    <div className="w-full min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center overflow-x-hidden relative selection:bg-zinc-500/30">
      
      {/* 极细网格背景纹理 - 增加稳重感 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, size: '40px 40px', backgroundSize: '40px 40px' }}>
      </div>

      {/* ==================================================== */}
      {/* 顶部导航 - 极简主义改造 */}
      {/* ==================================================== */}
      <div className="fixed top-0 w-full z-[100] px-6 py-8 flex justify-between items-start pointer-events-none">
        
        {/* 左侧品牌：内敛稳重 */}
        <div className="flex flex-col pointer-events-auto">
          <span className="text-xl md:text-2xl font-bold tracking-[0.2em] text-zinc-200">
            PUREBEAT.TOP
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse"></span>
            <span className="text-[9px] font-mono text-zinc-500 tracking-[0.3em] uppercase">
              System Online / v1.1.3
            </span>
          </div>
        </div>

        {/* 右侧交互区：标准化、去色化 */}
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          <div className="flex items-center gap-2 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-1 rounded-full">
            
            {user && (
              <button 
                onClick={() => navigate('/inbox')}
                className="relative text-zinc-400 hover:text-zinc-100 p-2.5 rounded-full transition-colors group"
                title="收件箱"
              >
                <FaEnvelope className="text-sm" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-zinc-100 rounded-full border border-zinc-900"></span>
                )}
              </button>
            )}

            {user && (
              <button 
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-all text-[10px] tracking-widest uppercase font-medium"
              >
                {isCheckingIn ? <FaSpinner className="animate-spin" /> : <FaCalendarCheck />}
                <span>Check-in</span>
              </button>
            )}

            <button 
              onClick={() => navigate('/feedback')}
              className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 hover:text-zinc-100 px-4 py-1.5 rounded-full transition-all"
            >
              Feedback
            </button>

            <a 
              href="https://afdian.com/a/purebeat" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-900 px-5 py-1.5 rounded-full hover:bg-zinc-300 transition-all shadow-lg"
            >
              Support
            </a>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 英雄区域 - 视觉中心稳健处理 */}
      {/* ==================================================== */}
      <div className="relative w-full h-screen flex flex-col items-center justify-center px-6">
        
        {/* FallingIcons 透明度调低作为背景肌理 */}
        <div className="opacity-20">
          <FallingIcons />
        </div>

        <div className="z-10 flex flex-col items-center w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.5 }}
            className="relative"
          >
            <img 
              src="/assets/logos.png" 
              alt="MSC 2026 Logo" 
              className="w-[85vw] md:w-[60vw] max-w-[800px] object-contain opacity-90 brightness-110 contrast-125"
            />
          </motion.div>

          {/* 连续交互性：微小的滚动提示 */}
          <motion.div 
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-12 flex flex-col items-center gap-2 opacity-30"
          >
             <div className="w-[1px] h-12 bg-gradient-to-b from-zinc-100 to-transparent"></div>
          </motion.div>

          {/* Banner：统一为暗色系的高级质感 */}
          <Link to="/register" className="w-full max-w-[700px] mt-16 group">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative w-full aspect-[10/1] rounded-lg overflow-hidden border border-zinc-800/50 bg-zinc-900 shadow-2xl transition-all duration-700 group-hover:border-zinc-500/50"
            >
              <img 
                src="/assets/register_banner.png" 
                alt="Register"
                className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-70 transition-all duration-1000"
                onError={(e) => { e.target.src = 'https://placehold.co/1600x200/0a0a0a/525252?text=CONSCRIPTION+ACTIVE+2026'; }} 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[10px] tracking-[0.8em] font-light text-zinc-500 group-hover:text-zinc-100 transition-colors uppercase">
                    Enter the Protocol
                 </span>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 公告区域 - 连续性纵轴线设计 */}
      {/* ==================================================== */}
      <div className="w-full max-w-5xl mx-auto px-6 py-32 z-10 relative">
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-24 flex items-end gap-4 border-b border-zinc-800 pb-8"
        >
          <div className="flex flex-col">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-100">
              DIRECTIVES
            </h2>
            <p className="text-zinc-500 font-mono text-[10px] tracking-[0.4em] uppercase mt-2">
              Operational News & System Updates
            </p>
          </div>
        </motion.div>

        <div className="relative space-y-32">
          {/* 纵向连续线 */}
          <div className="absolute left-[24px] md:left-[50px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-zinc-800 via-zinc-800 to-transparent"></div>

          {announcements.length > 0 ? (
            announcements.map((announcement, index) => {
              const d = new Date(announcement.createdAt);
              const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

              return (
                <motion.div 
                  key={announcement._id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                  className="flex gap-8 md:gap-20 items-start group"
                >
                  {/* 日期点指示器 */}
                  <div className="relative z-10 flex-shrink-0 mt-2">
                    <div className="w-12 h-12 md:w-24 md:h-24 rounded-full bg-[#050505] border border-zinc-800 flex items-center justify-center group-hover:border-zinc-500 transition-colors duration-500">
                      <span className="text-xs md:text-sm font-mono font-medium text-zinc-400">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* 公告卡片：更内敛的排版 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[9px] font-mono py-1 px-3 border border-zinc-800 rounded-full text-zinc-500 uppercase tracking-widest bg-zinc-900/30">
                        {announcement.type}
                      </span>
                      <div className="h-[1px] flex-1 bg-zinc-900 group-hover:bg-zinc-700 transition-all duration-1000"></div>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold mb-6 text-zinc-100 tracking-tight group-hover:translate-x-1 transition-transform duration-500">
                      {announcement.title}
                    </h3>
                    
                    <div className="bg-zinc-900/20 border border-zinc-900/50 rounded-lg p-6 md:p-8 transition-all duration-500 group-hover:border-zinc-800 group-hover:bg-zinc-900/40 shadow-inner">
                      <div className="text-zinc-400 leading-[1.8] text-sm md:text-base bbcode-content font-light tracking-wide">
                        {bbcode.toReact(announcement.content)}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-4 group-hover:translate-x-0">
                        Read full protocol <FaChevronRight className="text-[8px]"/>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-32 border border-zinc-900 rounded-lg bg-zinc-900/10">
               <span className="font-mono text-[10px] tracking-[0.5em] text-zinc-600">AWAITING SYSTEM BROADCAST...</span>
            </div>
          )}
        </div>
      </div>

      {/* 页脚装饰 */}
      <footer className="w-full py-20 flex flex-col items-center opacity-20 border-t border-zinc-900">
         <span className="text-[10px] font-mono tracking-[0.5em]">PUREBEAT © 2026</span>
      </footer>
    </div>
  );
};

export default Home;