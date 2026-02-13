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

// --- 子组件：曲绘卡片 (修复了手机端遮挡问题) ---
const SongCard = ({ position, status, img, delay, title, artist }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isHidden = status === 'pending' || status === 'loading';
  
  // 🔥 核心修复 A：手机端偏移量从 60 改为 140
  // 这样左右两张卡片会大幅度向两侧推开，不再被中间的卡片挡住
  const xOffset = isMobile ? (position === 'left' ? -140 : 140) : (position === 'left' ? -380 : 380);
  
  const variants = {
    // 中间卡片：手机端稍微缩小
    center: { x: 0, scale: isMobile ? 0.85 : 1.1, zIndex: 30, rotateY: 0, filter: "brightness(1)", opacity: 1 },
    
    // 两侧卡片：缩小并后退，配合 xOffset 确保可见
    left: { 
      x: xOffset, 
      scale: isMobile ? 0.7 : 0.95, 
      zIndex: 20, 
      rotateY: isMobile ? 15 : 20, 
      filter: "brightness(0.6)", 
      opacity: 0.8
    },
    right: { 
      x: xOffset, 
      scale: isMobile ? 0.7 : 0.95, 
      zIndex: 20, 
      rotateY: isMobile ? -15 : -20, 
      filter: "brightness(0.6)", 
      opacity: 0.8
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
      // 🔥 核心修复 B：固定手机端卡片容器宽度为 140px，防止计算错误
      style={{ transformStyle: 'preserve-3d', width: isMobile ? '140px' : '300px' }}
    >
      
      {/* 封面区域 */}
      <div className="w-[140px] h-[140px] md:w-[300px] md:h-[300px] rounded-xl shadow-2xl overflow-hidden bg-black border border-white/10 relative group">
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

      {/* 文字区域 */}
      <div className="text-center w-full px-1 space-y-1">
        <div className="text-xs md:text-xl font-bold text-white tracking-wide truncate">
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
  
  // 比赛时间设置
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

  // 🔥 核心修复 C：前端排序逻辑
  // 1. 优先比 Achievement (降序)
  // 2. 其次比 DX Score (降序)
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const achA = Number(a.achievement);
    const achB = Number(b.achievement);
    
    // 如果差值大于 0.0001，则认为不相等，按达成率排
    if (Math.abs(achB - achA) != 0) {
      return achB - achA;
    }
    
    // 否则按 DX 分数排
    return (b.dxScore || 0) - (a.dxScore || 0);
  });

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-6 md:pt-10 pb-24 overflow-x-hidden">
      
      {/* 1. 倒计时抬头 */}
      <motion.div className="text-center mb-6 md:mb-12 z-20 px-4">
        <h2 className="text-xs md:text-xl text-blue-300 tracking-[0.3em] md:tracking-[0.5em] mb-2 uppercase">Qualifiers Stage</h2>
        <div className="text-2xl md:text-6xl font-mono font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          {timeLeft}
        </div>
      </motion.div>

      {/* 2. 3D 舞台区域 */}
      <div className="relative w-full max-w-7xl h-[220px] md:h-[450px] flex justify-center items-center mb-6 md:mb-16 perspective-[1000px]">
        <SongCard position="left" status={status} img="/assets/pre1.png" delay={0.2} title="Ultra Synergy Matrix" artist="t+pazolite" />
        <SongCard position="right" status={status} img="/assets/pre3.png" delay={0.4} title="Oshama Scramble!" artist="t+pazolite" />
        <SongCard position="center" status={status} img="/assets/pre2.png" delay={0} title="PANDORA PARADOXXX" artist="Gram" />
      </div>

      {/* 3. 榜单区域 */}
      <div className="w-full max-w-4xl px-2 md:px-4 z-10">
        <div className="flex items-center gap-2 mb-4 border-b border-white/20 pb-2 pl-2">
          <FaTrophy className="text-yellow-400 text-lg md:text-2xl" />
          <h3 className="text-base md:text-2xl font-light tracking-widest text-white">实时排名 (Live Ranking)</h3>
        </div>

        <div className="flex flex-col gap-2">
          
          {/* 🔥 核心修复 D：表头自适应 (显示 DX Score) */}
          <div className="grid grid-cols-12 text-gray-500 text-[10px] md:text-sm px-2 md:px-4 pb-1 uppercase tracking-wider">
            <div className="col-span-2 md:col-span-1">Rank</div>
            <div className="col-span-4 md:col-span-5">Player</div>
            <div className="col-span-3 md:col-span-3 text-right">Achiev.</div>
            {/* 手机端不再 hidden，而是跟 Achiev 一样宽 */}
            <div className="col-span-3 md:col-span-3 text-right">DX Score</div>
          </div>

          {sortedLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white/5 rounded text-xs">暂无数据 / 虚位以待</div>
          ) : (
            sortedLeaderboard.map((score, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-12 items-center px-2 md:px-4 py-2 md:py-4 rounded bg-white/5 border border-white/5 ${
                  index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : ''
                }`}
              >
                {/* 排名 */}
                <div className="col-span-2 md:col-span-1 font-mono font-bold text-sm md:text-xl">
                  {index < 3 ? <FaMedal className={index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'} /> : `#${index + 1}`}
                </div>
                
                {/* 玩家名 (截断) */}
                <div className="col-span-4 md:col-span-5 font-bold text-xs md:text-lg text-white truncate pr-1">
                  {score.nickname}
                </div>
                
                {/* 达成率 (强制4位小数 + 小字号) */}
                <div className="col-span-3 md:col-span-3 text-right font-mono text-[10px] md:text-xl text-green-400 leading-tight">
                  {Number(score.achievement).toFixed(4)}%
                </div>
                
                {/* DX 分数 (显示 + 小字号) */}
                <div className="col-span-3 md:col-span-3 text-right font-mono text-[10px] md:text-lg text-gray-400 leading-tight">
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