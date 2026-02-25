import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import FallingIcons from '../components/FallingIcons'; 
import { useAuth } from '../context/AuthContext'; 
import bbcode from 'bbcode-to-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // 引入路由跳转钩子
  const [announcements, setAnnouncements] = useState([]); // 存放真实公告数据

  // 页面加载时拉取数据
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

  let buttonText = "立即报名 MSC 2026";
  let buttonLink = "/register";

  if (user) {
    if (user.isRegistered) {
      buttonText = "查看预选赛成绩 →";
      buttonLink = "/qualifiers";
    } else {
      buttonText = "前往填写报名表";
      buttonLink = "/register";
    }
  } else {
    buttonText = "登录 / 注册参赛";
    buttonLink = "/login";
  }

  return (
    // 外层容器：支持滚动，隐藏横向溢出，带有从上到下的半透明遮罩防止下方文字看不清
    <div className="w-full min-h-screen text-white flex flex-col items-center overflow-x-hidden relative bg-gradient-to-b from-transparent to-black/80">
      
      {/* ==================================================== */}
      {/* 全新注入：主页右上角专属标志与按钮群 */}
      {/* ==================================================== */}
      <div className="fixed top-6 right-6 md:right-8 z-[100] flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-6 pointer-events-auto">
        
        {/* 品牌标识 */}
        <div className="text-right flex flex-col items-end cursor-default select-none">
          <span className="text-xl md:text-2xl font-black italic tracking-widest text-white drop-shadow-md leading-none">
            purebeat.top
          </span>
          <span className="text-[10px] font-mono text-purple-400 font-bold tracking-widest mt-1 uppercase">
            Version 1.1.2
          </span>
        </div>

        {/* 极简风操作按钮 */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/feedback')}
            className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 bg-black/40 px-4 py-2 rounded-full transition-all backdrop-blur-md"
          >
            Feedback
          </button>
          <button className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-yellow-400 hover:text-yellow-300 border border-yellow-500/50 hover:border-yellow-400 bg-yellow-500/10 px-4 py-2 rounded-full transition-all backdrop-blur-md shadow-[0_0_10px_rgba(234,179,8,0.2)]">
            Donate
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. 英雄区域 (Hero Section) */}
      {/* ==================================================== */}
      <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        
        {/* 背景层 */}
        <FallingIcons />

        {/* 内容层 */}
        <div className="z-10 flex flex-col items-center text-center">
          
          {/* LOGO 动画 */}
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

          {/* 间距 */}
          <div className="h-10 md:h-16"></div>

          {/* 动态按钮 */}
          <Link to={buttonLink} className="w-full flex justify-center">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              whileHover={{ scale: 1.05, textShadow: "0 0 8px rgb(255,255,255)" }}
              whileTap={{ scale: 0.95 }}
              className="text-xl md:text-3xl font-light tracking-[0.15em] md:tracking-[0.2em] text-white border-b border-white/30 pb-2 hover:border-white transition-all duration-300 whitespace-nowrap"
            >
              {buttonText}
            </motion.button>
          </Link>

          {/* 装饰性文字 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="mt-6 text-gray-400 text-[10px] md:text-sm tracking-[0.3em] uppercase opacity-80"
          >
            Rhythm Game Tournament in Sihong
          </motion.p>

          {/* 🔥 引导滚动的提示符 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="absolute bottom-8 md:bottom-12 flex flex-col items-center text-gray-500/50 animate-bounce pointer-events-none"
          >
            <span className="text-[10px] tracking-widest uppercase mb-2">Scroll to Discover</span>
            <span>↓</span>
          </motion.div>

        </div>
      </div>

      {/* ==================================================== */}
      {/* 🔥 2. 史诗级公告区域 (Latest Directives) 🔥 */}
      {/* ==================================================== */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-24 z-10 relative">
        
        {/* 大气感标题 */}
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

        {/* 公告流 */}
        <div className="space-y-16 md:space-y-24">
          {announcements.length > 0 ? (
            announcements.map((announcement, index) => {
              // 🔥 动态计算时间，格式化为 "02.24" 和 "2026"
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
                  {/* 左侧：巨大的日期排版 */}
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

                  {/* 右侧：玻璃卡片内容 */}
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
            // 如果还没发公告，显示酷炫的等待画面
            <div className="text-center py-20 text-gray-500 border border-white/5 rounded-3xl bg-black/20 backdrop-blur-md">
               <span className="font-mono tracking-widest">AWAITING DIRECTIVES...</span>
            </div>
          )}
        </div>
        
      </div>
      {/* ==================================================== */}

    </div>
  );
};

export default Home;