import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaBan, FaArrowLeft, FaInfoCircle, FaBook, FaImages, FaExclamationTriangle } from 'react-icons/fa';

// 图片数组 (回顾相册)
const lastYearImages = [
  '/assets/last1.png',
  '/assets/last2.png',
  '/assets/last3.png',
  '/assets/last4.png',
  '/assets/last5.png',
];

const TournamentInfo = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // 🔥 背景图逻辑：默认加载 tournament.png，失败则回退到 bg.png
  const [bgUrl, setBgUrl] = useState('/assets/tournament.png');

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/tournament.png';
    img.onerror = () => {
      setBgUrl('/assets/bg.png'); // 如果找不到专项背景，使用站内背景
    };
  }, []);

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white overflow-x-hidden relative">
      
      {/* --- 1. 全局背景层 (降低 z-index) --- */}
      <div className="fixed inset-0 z-0">
        <img 
          src={bgUrl} 
          alt="Background" 
          className="w-full h-full object-cover opacity-30 blur-[2px] transition-all duration-1000" 
        />
        {/* 渐变遮罩：确保内容文字在任何背景下都清晰 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black pointer-events-none" />
      </div>

      {/* 底部巨大图标装饰 */}
      <div className="fixed bottom-0 right-0 opacity-[0.03] pointer-events-none z-0 translate-x-1/3 translate-y-1/3">
        <FaExclamationTriangle className="text-[15rem] md:text-[40rem] text-white" />
      </div>

      {/* --- 2. 内容层 (z-10 确保在背景之上) --- */}
      <div className="relative z-10">
        
        {/* 返回按钮 */}
        <div className="absolute top-24 left-4 md:left-8">
          <button 
            onClick={() => navigate('/tournaments')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold tracking-widest text-xs md:text-sm uppercase bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
          >
            <FaArrowLeft /> BACK TO TOURNAMENTS
          </button>
        </div>

        {/* --- Hero 视觉区 --- */}
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 pt-20">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[25vw] md:text-[20vw] font-bold text-white/[0.03] pointer-events-none select-none whitespace-nowrap">
            THE TOWER
          </div>
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}
            className="text-center"
          >
            <h2 className="text-xs md:text-2xl tracking-[0.2em] md:tracking-[1em] text-blue-300 uppercase mb-4 md:mb-8 font-bold">
              Maimai Sihong Championship
            </h2>
            <h1 className="text-6xl md:text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-t from-white to-gray-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              登塔。
            </h1>
            <div className="w-px h-16 md:h-24 bg-gradient-to-b from-white to-transparent mx-auto mt-8 md:mt-12 opacity-50"></div>
          </motion.div>
        </div>

        {/* --- 选项卡导航 --- */}
        <div className="sticky top-16 md:top-20 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 w-full flex justify-center py-4 px-2">
          <div className="flex gap-2 md:gap-4 bg-white/5 p-1 rounded-full border border-white/10">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              <FaInfoCircle /> 概况
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-widest transition-all ${activeTab === 'rules' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <FaBook /> 规则
            </button>
            <button 
              onClick={() => setActiveTab('memories')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-widest transition-all ${activeTab === 'memories' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <FaImages /> 回顾
            </button>
          </div>
        </div>

        {/* --- 动态详情内容 --- */}
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 md:py-20 min-h-[50vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" variants={tabVariants} initial="hidden" animate="show" exit="exit" className="text-center space-y-8 md:space-y-12">
                <p className="text-lg md:text-3xl font-light leading-relaxed text-gray-200">
                  <span className="font-bold text-white text-2xl md:text-4xl">MSC 2026</span> 是 MSC 系列比赛的第二届。
                </p>
                <div className="text-gray-400 text-sm md:text-lg leading-loose font-light space-y-6 bg-white/5 border border-white/10 p-8 rounded-3xl">
                  <p>第一届比赛（MSC 2025）已在 2025 年 7 月成功举办。<br/>时光流转，热忱不减。</p>
                  <p>本赛事依然以深入挖掘泗洪及周边地区的潜力新星，<br/>促进舞萌玩家群体间友好交流为精神内核，<br/>努力呈现出一场精彩绝伦的比赛庆典。</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'rules' && (
              <motion.div key="rules" variants={tabVariants} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-8 md:gap-12">
                <div className="relative bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl">
                  <div className="absolute right-4 top-2 text-[4rem] font-black text-white/[0.05] pointer-events-none">01</div>
                  <div className="flex flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full border border-blue-500/30 flex items-center justify-center text-blue-300 text-2xl"><FaUserShield /></div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">账号一致性验证</h3>
                      <p className="text-gray-400 text-sm md:text-base">选手必须使用和预选赛提交成绩相同的账号进行正赛。</p>
                    </div>
                  </div>
                </div>
                <div className="relative bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl">
                  <div className="absolute right-4 top-2 text-[4rem] font-black text-white/[0.05] pointer-events-none">02</div>
                  <div className="flex flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full border border-red-500/30 flex items-center justify-center text-red-300 text-2xl"><FaBan /></div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">公平竞技红线</h3>
                      <p className="text-gray-400 text-sm md:text-base">严禁使用任何插件或代打。违者取消成绩并禁赛两年。</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'memories' && (
              <motion.div key="memories" variants={tabVariants} initial="hidden" animate="show" exit="exit">
                <div className="flex w-full overflow-hidden relative">
                  <motion.div 
                    className="flex gap-4 md:gap-8 px-4" 
                    animate={{ x: ["0%", "-50%"] }} 
                    transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
                    style={{ width: "fit-content" }}
                  >
                    {[...lastYearImages, ...lastYearImages].map((src, index) => (
                      <img key={index} src={src} className="w-[80vw] h-[220px] md:w-[600px] md:h-[350px] object-cover rounded-2xl grayscale hover:grayscale-0 transition-all duration-500" />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TournamentInfo;