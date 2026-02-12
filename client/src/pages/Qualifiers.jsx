import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaClock, FaTrophy, FaMedal } from 'react-icons/fa';

// --- 子组件：曲绘卡片 (带文字) ---
const SongCard = ({ position, status, img, delay, title, artist }) => {
  const isHidden = status === 'pending' || status === 'loading';
  
  // 1. 位置定义 (大幅增加了 x 的间距，确保不重叠)
  const variants = {
    center: { x: 0, scale: 1.1, zIndex: 20, rotateY: 0, filter: "brightness(1)" },
    left: { x: -360, scale: 0.95, zIndex: 10, rotateY: 20, filter: "brightness(0.7)" }, // x: -360
    right: { x: 360, scale: 0.95, zIndex: 10, rotateY: -20, filter: "brightness(0.7)" } // x: 360
  };

  // 2. 文字显示逻辑
  const displayTitle = isHidden ? "???" : title;
  const displayArtist = isHidden ? "???" : artist;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        ...variants[position] 
      }}
      // 整体悬停放大
      whileHover={{
        scale: 1.2,
        zIndex: 50,
        rotateY: 0,
        filter: "brightness(1.1)",
        y: -10,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
      transition={{ delay: delay, duration: 0.8 }}
      className="absolute flex flex-col items-center gap-4 cursor-pointer" // Flex布局：上图下文
      style={{ transformStyle: 'preserve-3d', width: '300px' }} // 设定宽度基准
    >
      
      {/* A. 封面区域 */}
      <div className="w-[300px] h-[300px] rounded-xl shadow-2xl overflow-hidden bg-black border border-white/10 relative group">
        <AnimatePresence mode='wait'>
          {isHidden ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center bg-black relative"
            >
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute w-32 h-32 bg-blue-500/30 rounded-full blur-2xl"
              />
              <span className="text-8xl font-bold text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10">?</span>
            </motion.div>
          ) : (
            <motion.img
              key="revealed"
              src={img}
              alt="Song Jacket"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full object-cover"
            />
          )}
        </AnimatePresence>
        {/* 光泽遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5 pointer-events-none" />
      </div>

      {/* B. 文字区域 (曲名 & 曲师) */}
      <div className="text-center w-full px-2 space-y-1">
        <motion.div 
          layout 
          className="text-xl font-bold text-white tracking-wide truncate drop-shadow-md"
        >
          {displayTitle}
        </motion.div>
        <motion.div 
          layout 
          className="text-sm font-light text-gray-400 truncate"
        >
          {displayArtist}
        </motion.div>
      </div>

    </motion.div>
  );
};

// --- 主组件 ---
const Qualifiers = () => {
  const [status, setStatus] = useState('loading');
  const [timeLeft, setTimeLeft] = useState('-- 天 -- 小时 -- 分 -- 秒');
  const [leaderboard, setLeaderboard] = useState([]);
  
  const START_TIME = new Date('2026-04-30T10:00:00').getTime();
  const END_TIME = new Date('2026-07-03T21:30:00').getTime();

  useEffect(() => {
    const initData = async () => {
      try {
        const scoreRes = await axios.get('/api/leaderboard');
        setLeaderboard(scoreRes.data);

        const timeRes = await axios.get('/api/time');
        const serverTime = new Date(timeRes.data.serverTime).getTime();
        const localTime = Date.now();
        const timeOffset = serverTime - localTime;

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
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    setTimeLeft(`${days}天 ${hours}时 ${minutes}分 ${seconds}秒`);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-10 pb-20 overflow-x-hidden perspective-1000">
      
      {/* 倒计时抬头 */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12 z-20"
      >
        <h2 className="text-xl text-blue-300 tracking-[0.5em] mb-2 uppercase">Qualifiers Stage</h2>
        <div className="text-4xl md:text-6xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          {timeLeft}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
           <FaClock /> 
           <span>{status === 'pending' ? '距离开赛' : status === 'active' ? '距离结束' : '状态'}</span>
        </div>
      </motion.div>

      {/* 3张曲绘 (舞台区域加宽到 max-w-7xl 以容纳更宽的间距) */}
      <div className="relative w-full max-w-7xl h-[450px] flex justify-center items-center mb-16 perspective-[1200px]">
        
        {/* 这里填入真实的曲名和曲师 
           未开始时会自动显示 ???
        */}
        <SongCard 
          position="left" 
          status={status} 
          img="/assets/pre1.png" 
          delay={0.2} 
          title="Ultra Synergy Matrix" 
          artist="t+pazolite"
        />
        
        <SongCard 
          position="right" 
          status={status} 
          img="/assets/pre3.png" 
          delay={0.4} 
          title="Oshama Scramble!" 
          artist="t+pazolite"
        />
        
        <SongCard 
          position="center" 
          status={status} 
          img="/assets/pre2.png" 
          delay={0} 
          title="PANDORA PARADOXXX" 
          artist="Gram"
        />
      </div>

      {/* 榜单区域 */}
      <div className="w-full max-w-4xl px-4 z-10">
        <div className="flex items-center gap-3 mb-6 border-b border-white/20 pb-4">
          <FaTrophy className="text-yellow-400 text-2xl" />
          <h3 className="text-2xl font-light tracking-widest">实时排名 (Live Ranking)</h3>
        </div>

        <div className="flex flex-col gap-2">
          {/* 表头 */}
          <div className="grid grid-cols-12 text-gray-500 text-sm px-4 pb-2 uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-3 text-right">Achievement</div>
            <div className="col-span-3 text-right">DX Score</div>
          </div>

          {/* 列表内容 */}
          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white/5 rounded">暂无数据 / 虚位以待</div>
          ) : (
            leaderboard.map((score, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-12 items-center px-4 py-4 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group ${
                  index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : ''
                }`}
              >
                <div className="col-span-1 font-mono font-bold text-xl">
                  {index === 0 ? <FaMedal className="text-yellow-400" /> : 
                   index === 1 ? <FaMedal className="text-gray-300" /> :
                   index === 2 ? <FaMedal className="text-orange-400" /> : 
                   `#${index + 1}`}
                </div>
                <div className="col-span-5 font-bold text-lg text-white group-hover:text-blue-300 transition-colors">
                  {score.nickname}
                </div>
                <div className="col-span-3 text-right font-mono text-xl text-green-400">
                  {score.achievement.toFixed(4)}%
                </div>
                <div className="col-span-3 text-right font-mono text-gray-400">
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