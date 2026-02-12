import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaClock, FaTrophy, FaMedal } from 'react-icons/fa';

// --- 自定义 Hook：监听窗口大小以适配 3D 位移 ---
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
  });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// --- 子组件：曲绘卡片 ---
const SongCard = ({ position, status, img, delay, title, artist }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isHidden = status === 'pending' || status === 'loading';
  
  // 核心适配逻辑：根据屏幕宽度计算位移
  // 电脑端偏移 360px，手机端仅偏移 40-60px 形成堆叠效果
  const xOffset = isMobile ? (position === 'left' ? -60 : 360) : (position === 'left' ? -360 : 360);
  
  // 如果是左侧卡片，手机端通过简单的位移实现轻微重叠；右侧卡片在手机端可以暂时隐藏或大幅缩小
  const variants = {
    center: { x: 0, scale: isMobile ? 0.85 : 1.1, zIndex: 20, rotateY: 0, filter: "brightness(1)", opacity: 1 },
    left: { 
      x: isMobile ? -50 : -360, 
      scale: isMobile ? 0.65 : 0.95, 
      zIndex: 10, 
      rotateY: isMobile ? 10 : 20, 
      filter: "brightness(0.7)",
      opacity: isMobile ? 0.6 : 1
    },
    right: { 
      x: isMobile ? 50 : 360, 
      scale: isMobile ? 0.65 : 0.95, 
      zIndex: 10, 
      rotateY: isMobile ? -10 : -20, 
      filter: "brightness(0.7)",
      opacity: isMobile ? 0.6 : 1
    }
  };

  const displayTitle = isHidden ? "???" : title;
  const displayArtist = isHidden ? "???" : artist;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ 
        y: 0, 
        ...variants[position] 
      }}
      transition={{ delay: delay, duration: 0.8 }}
      className="absolute flex flex-col items-center gap-2 md:gap-4 cursor-pointer"
      style={{ transformStyle: 'preserve-3d', width: isMobile ? '200px' : '300px' }}
    >
      
      {/* A. 封面区域 */}
      <div className="w-[180px] h-[180px] md:w-[300px] md:h-[300px] rounded-xl shadow-2xl overflow-hidden bg-black border border-white/10 relative group">
        <AnimatePresence mode='wait'>
          {isHidden ? (
            <motion.div
              key="hidden"
              className="w-full h-full flex items-center justify-center bg-black relative"
            >
              <span className="text-5xl md:text-8xl font-bold text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10">?</span>
            </motion.div>
          ) : (
            <motion.img
              key="revealed"
              src={img}
              alt="Song Jacket"
              className="w-full h-full object-cover"
            />
          )}
        </AnimatePresence>
      </div>

      {/* B. 文字区域 */}
      <div className="text-center w-full px-2 space-y-1">
        <div className="text-sm md:text-xl font-bold text-white tracking-wide truncate">
          {displayTitle}
        </div>
        <div className="text-[10px] md:text-sm font-light text-gray-400 truncate">
          {displayArtist}
        </div>
      </div>
    </motion.div>
  );
};

// --- 主组件 ---
const Qualifiers = () => {
  const [status, setStatus] = useState('loading');
  const [timeLeft, setTimeLeft] = useState('-- 天 -- 小时 -- 分 -- 秒');
  const [leaderboard, setLeaderboard] = useState([]);
  const { width } = useWindowSize();
  const isMobile = width < 768;
  
  const START_TIME = new Date('2026-04-30T10:00:00').getTime();
  const END_TIME = new Date('2026-07-03T21:30:00').getTime();

  useEffect(() => {
    const initData = async () => {
      try {
        const scoreRes = await axios.get('/api/leaderboard');
        setLeaderboard(scoreRes.data);

        const timeRes = await axios.get('/api/time');
        const serverTime = new Date(timeRes.data.serverTime).getTime();
        const timeOffset = serverTime - Date.now();

        const timer = setInterval(() => {
          const now = Date.now() + timeOffset;
          if (now < START_TIME) {
            setStatus('pending');
            calcTimeLeft(START_TIME - now);
          } else if (now >= START_TIME && now < END_TIME) {
            setStatus('active');
            calcTimeLeft(END_TIME - now);
          } else {
            setStatus('ended');
            setTimeLeft('预选赛已结束');
            clearInterval(timer);
          }
        }, 1000);

        return () => clearInterval(timer);
      } catch (err) {
        console.error("初始化失败", err);
      }
    };
    initData();
  }, []);

  const calcTimeLeft = (ms) => {
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    setTimeLeft(`${d}天 ${h}时 ${m}分 ${s}秒`);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-6 md:pt-10 pb-20 overflow-x-hidden">
      
      {/* 1. 倒计时抬头 */}
      <motion.div className="text-center mb-6 md:mb-12 z-20 px-4">
        <h2 className="text-xs md:text-xl text-blue-300 tracking-[0.3em] md:tracking-[0.5em] mb-2 uppercase">Qualifiers Stage</h2>
        <div className="text-2xl md:text-6xl font-mono font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          {timeLeft}
        </div>
      </motion.div>

      {/* 2. 3张曲绘 (舞台区域) 
          - 手机端高度从 450px 降至 280px
      */}
      <div className="relative w-full max-w-7xl h-[280px] md:h-[450px] flex justify-center items-center mb-10 md:mb-16">
        <SongCard position="left" status={status} img="/assets/pre1.png" delay={0.2} title="Ultra Synergy Matrix" artist="t+pazolite" />
        <SongCard position="right" status={status} img="/assets/pre3.png" delay={0.4} title="Oshama Scramble!" artist="t+pazolite" />
        <SongCard position="center" status={status} img={isMobile ? "/assets/pre2.png" : "/assets/pre2.png"} delay={0} title="PANDORA PARADOXXX" artist="Gram" />
      </div>

      {/* 3. 榜单区域 */}
      <div className="w-full max-w-4xl px-4 z-10">
        <div className="flex items-center gap-3 mb-6 border-b border-white/20 pb-4">
          <FaTrophy className="text-yellow-400 text-xl md:text-2xl" />
          <h3 className="text-lg md:text-2xl font-light tracking-widest text-white">实时排名 (Live Ranking)</h3>
        </div>

        <div className="flex flex-col gap-2">
          {/* 表头适配：手机端隐藏不重要的列 */}
          <div className="grid grid-cols-12 text-gray-500 text-[10px] md:text-sm px-4 pb-2 uppercase tracking-wider">
            <div className="col-span-2 md:col-span-1">Rank</div>
            <div className="col-span-6 md:col-span-5">Player</div>
            <div className="col-span-4 md:col-span-3 text-right">Achievement</div>
            <div className="hidden md:block col-span-3 text-right">DX Score</div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white/5 rounded text-sm">暂无数据 / 虚位以待</div>
          ) : (
            leaderboard.map((score, index) => (
              <motion.div
                key={index}
                className={`grid grid-cols-12 items-center px-3 md:px-4 py-3 md:py-4 rounded bg-white/5 border border-white/5 ${
                  index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : ''
                }`}
              >
                <div className="col-span-2 md:col-span-1 font-mono font-bold text-base md:text-xl">
                  {index < 3 ? <FaMedal className={index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'} /> : `#${index + 1}`}
                </div>
                <div className="col-span-6 md:col-span-5 font-bold text-sm md:text-lg text-white truncate pr-2">
                  {score.nickname}
                </div>
                <div className="col-span-4 md:col-span-3 text-right font-mono text-base md:text-xl text-green-400">
                  {score.achievement.toFixed(2)}%
                </div>
                <div className="hidden md:block col-span-3 text-right font-mono text-gray-400">
                  {score.dxScore}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Qualifiers;