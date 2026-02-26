import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaBan, FaArrowLeft, FaInfoCircle, FaBook, FaImages, FaExclamationTriangle } from 'react-icons/fa';

// 图片数组 (来自原 Intro.jsx)
const lastYearImages = [
  '/assets/last1.png',
  '/assets/last2.png',
  '/assets/last3.png',
  '/assets/last4.png',
  '/assets/last5.png',
];

const TournamentInfo = () => {
  const navigate = useNavigate();
  // 控制当前显示的 Tab: 'overview' | 'rules' | 'memories'
  const [activeTab, setActiveTab] = useState('overview');
  // 🔥 新增：背景图片状态管理
  const [bgUrl, setBgUrl] = useState('/assets/tournament.png');

  // 🔥 新增：检测图片是否存在
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/tournament.png';
    img.onerror = () => {
      // 如果 tournament.png 加载失败，则回退到站内默认背景
      setBgUrl('/assets/bg.png');
    };
  }, []);

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white overflow-x-hidden relative">
      
      {/* 底部巨大警告图标装饰 (来自原 Rules.jsx) */}
      <div className="fixed bottom-0 right-0 opacity-[0.03] pointer-events-none z-0 translate-x-1/3 translate-y-1/3">
        <FaExclamationTriangle className="text-[15rem] md:text-[40rem] text-white" />
      </div>

      {/* --- 返回按钮 --- */}
      <div className="absolute top-24 left-4 md:left-8 z-50">
        <button 
          onClick={() => navigate('/tournaments')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold tracking-widest text-xs md:text-sm uppercase bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
        >
          <FaArrowLeft /> BACK TO TOURNAMENTS
        </button>
      </div>

      {/* ========================================================= */}
      {/* 第一部分：顶部视觉 Hero 区 (高度自适应缩减为 60vh，让下方露出 Tabs) */}
      {/* ========================================================= */}
      <div className="min-h-[60vh] flex flex-col items-center justify-center relative z-10 px-6 pt-20">
        
        {/* 背景大字装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[25vw] md:text-[20vw] font-bold text-white/[0.03] md:text-white/5 pointer-events-none select-none whitespace-nowrap">
          THE TOWER
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-xs md:text-2xl tracking-[0.2em] md:tracking-[1em] text-blue-300 uppercase mb-4 md:mb-8 ml-1 md:ml-4 font-bold">
            Maimai Sihong Championship
          </h2>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-t from-white to-gray-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            登塔。
          </h1>
          
          <div className="w-px h-16 md:h-24 bg-gradient-to-b from-white to-transparent mx-auto mt-8 md:mt-12 opacity-50"></div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 第二部分：导航 Tabs (概况 / 规则 / 回顾) */}
      {/* ========================================================= */}
      <div className="sticky top-16 md:top-20 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 w-full flex justify-center py-4 px-2">
        <div className="flex gap-2 md:gap-4 bg-white/5 p-1 rounded-full border border-white/10 overflow-x-auto max-w-full hide-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <FaInfoCircle /> 赛事概况
          </button>
          <button 
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'rules' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <FaBook /> 参赛须知
          </button>
          <button 
            onClick={() => setActiveTab('memories')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'memories' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <FaImages /> 往届回顾
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 第三部分：动态内容展示区 */}
      {/* ========================================================= */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 md:py-20 relative z-10 min-h-[50vh]">
        <AnimatePresence mode="wait">
          
          {/* --- Tab 1: 赛事概况 (Overview) --- */}
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="show" exit="exit" className="text-center space-y-8 md:space-y-12">
              <p className="text-lg md:text-3xl font-light leading-relaxed text-gray-200">
                <span className="font-bold text-white text-2xl md:text-4xl">MSC 2026</span> 是 MSC 系列比赛的第二届。
              </p>
              
              <div className="text-gray-400 text-sm md:text-lg leading-loose md:leading-loose font-light space-y-6 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
                <p>
                  第一届比赛（MSC 2025）已在 2025 年 7 月成功举办。<br className="hidden md:block"/>
                  时光流转，热忱不减。
                </p>
                <p>
                  本赛事依然以深入挖掘泗洪及周边地区的潜力新星，<br className="hidden md:block"/>
                  促进舞萌玩家群体间友好交流为精神内核，<br className="hidden md:block"/>
                  努力呈现出一场精彩绝伦的比赛庆典。
                </p>
              </div>
            </motion.div>
          )}

          {/* --- Tab 2: 参赛须知 (Rules) --- */}
          {activeTab === 'rules' && (
            <motion.div key="rules" variants={tabVariants} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-8 md:gap-12">
              {/* 规则 01 */}
              <div className="relative group w-full bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl hover:bg-white/10 transition-colors">
                <div className="absolute right-4 top-2 md:right-8 md:top-4 text-[4rem] md:text-[6rem] font-black text-white/[0.05] select-none pointer-events-none z-0 leading-none">
                  01
                </div>
                <div className="relative z-10 flex flex-row items-start md:items-center gap-4 md:gap-8">
                  <div className="flex-shrink-0 w-12 h-12 md:w-20 md:h-20 flex items-center justify-center bg-blue-500/10 rounded-xl md:rounded-full border border-blue-500/30 text-blue-300 text-xl md:text-3xl mt-1 md:mt-0">
                    <FaUserShield />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2">账号一致性验证</h3>
                    <p className="text-gray-400 text-sm md:text-lg leading-7 md:leading-relaxed font-light">
                      选手必须使用和<span className="text-blue-400 font-bold mx-1">预选赛提交成绩相同</span>的舞萌账号进行正赛。
                    </p>
                  </div>
                </div>
              </div>

              {/* 规则 02 */}
              <div className="relative group w-full bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl hover:bg-white/10 transition-colors">
                <div className="absolute right-4 top-2 md:right-8 md:top-4 text-[4rem] md:text-[6rem] font-black text-white/[0.05] select-none pointer-events-none z-0 leading-none">
                  02
                </div>
                <div className="relative z-10 flex flex-row items-start md:items-center gap-4 md:gap-8">
                  <div className="flex-shrink-0 w-12 h-12 md:w-20 md:h-20 flex items-center justify-center bg-red-500/10 rounded-xl md:rounded-full border border-red-500/30 text-red-300 text-xl md:text-3xl mt-1 md:mt-0">
                    <FaBan />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2">公平竞技红线</h3>
                    <p className="text-gray-400 text-sm md:text-lg leading-7 md:leading-relaxed font-light">
                      严禁使用第三方插件或外部力量获得成绩。<br className="hidden md:block" />
                      违者将<span className="text-red-400 font-bold mx-1 border-b border-red-500/50 pb-0.5">取消一切成绩</span>，两年内禁赛。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- Tab 3: 往届回顾 (Memories) --- */}
          {activeTab === 'memories' && (
            <motion.div key="memories" variants={tabVariants} initial="hidden" animate="show" exit="exit" className="w-full">
              {/* 遮罩层：增加手机端遮罩宽度，让过渡更柔和 */}
              <div className="absolute inset-y-0 left-0 w-8 md:w-32 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
              <div className="absolute inset-y-0 right-0 w-8 md:w-32 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

              {/* 滚动容器 */}
              <div className="flex w-full overflow-hidden">
                <motion.div
                  className="flex gap-4 md:gap-8 px-4"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
                  style={{ width: "fit-content" }} 
                >
                  {[...lastYearImages, ...lastYearImages].map((src, index) => (
                    <div 
                      key={index} 
                      className="w-[80vw] h-[220px] md:w-[600px] md:h-[350px] flex-shrink-0 rounded-2xl overflow-hidden relative group shadow-xl"
                    >
                      <img 
                        src={src} 
                        alt={`Review ${index}`} 
                        className="w-full h-full object-cover opacity-80 md:opacity-60 group-hover:opacity-100 transition-all duration-500 grayscale md:grayscale group-hover:grayscale-0 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 border border-white/10 group-hover:border-white/50 transition-colors pointer-events-none rounded-2xl"></div>
                    </div>
                  ))}
                </motion.div>
              </div>
              <div className="text-center text-gray-600 mt-12 text-[10px] md:text-sm tracking-[0.2em] uppercase">
                Let's Climb the Tower together.
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};

export default TournamentInfo;