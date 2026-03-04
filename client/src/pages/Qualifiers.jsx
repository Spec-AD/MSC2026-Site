import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaClock, FaTrophy, FaMedal, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// --- 自定义 Hook：监听窗口大小 ---
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

// --- 子组件：曲绘卡片 (柔和化重构) ---
const SongCard = ({ position, status, img, delay, title, artist }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isHidden = status === 'pending' || status === 'loading';
  
  const xOffset = isMobile ? (position === 'left' ? -140 : 140) : (position === 'left' ? -380 : 380);
  
  const variants = {
    center: { x: 0, scale: isMobile ? 0.85 : 1.1, zIndex: 30, rotateY: 0, filter: "brightness(1)", opacity: 1 },
    left: { 
      x: xOffset, scale: isMobile ? 0.7 : 0.95, zIndex: 20, rotateY: isMobile ? 15 : 20, 
      filter: "brightness(0.5)", opacity: 0.6
    },
    right: { 
      x: xOffset, scale: isMobile ? 0.7 : 0.95, zIndex: 20, rotateY: isMobile ? -15 : -20, 
      filter: "brightness(0.5)", opacity: 0.6
    }
  };

  const displayTitle = isHidden ? "未解禁曲目" : title;
  const displayArtist = isHidden ? "???" : artist;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ y: 0, ...variants[position] }}
      transition={{ delay: delay, duration: 0.8, ease: "easeOut" }}
      className="absolute flex flex-col items-center gap-3 md:gap-4 cursor-default"
      style={{ transformStyle: 'preserve-3d', width: isMobile ? '140px' : '300px' }}
    >
      {/* 封面区域 */}
      <div className="w-[140px] h-[140px] md:w-[300px] md:h-[300px] rounded-2xl shadow-2xl overflow-hidden bg-[#18181c] border border-white/[0.05] relative">
        <AnimatePresence mode='wait'>
          {isHidden ? (
            <motion.div key="hidden" className="w-full h-full flex flex-col items-center justify-center bg-[#141418] relative border border-white/[0.02]">
              <span className="text-5xl md:text-7xl font-bold text-zinc-800 z-10">?</span>
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
        <div className="text-sm md:text-lg font-bold text-zinc-100 tracking-tight truncate">
          {displayTitle}
        </div>
        <div className="text-[11px] md:text-sm font-medium text-zinc-500 truncate">
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
  const navigate = useNavigate();
  
  const START_TIME = new Date('2026-04-30T10:00:00').getTime();
  const END_TIME = new Date('2026-07-03T21:30:00').getTime();

  useEffect(() => {
    const initData = async () => {
      try {
        const scoreRes = await axios.get('/api/leaderboard/qualifiers');
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
            setTimeLeft('预选阶段已结束');
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

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const achA = Number(a.totalAchievement || 0);
    const achB = Number(b.totalAchievement || 0);
    if (Math.abs(achB - achA) !== 0) return achB - achA;
    return (b.totalDxScore || 0) - (a.totalDxScore || 0);
  });

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 flex flex-col items-center pt-8 md:pt-12 pb-24 overflow-x-hidden relative font-sans selection:bg-zinc-600/40">
      
      {/* 顶部返回导航 */}
      <div className="w-full max-w-7xl px-4 md:px-8 flex justify-start mb-6 z-30 relative top-10 md:top-0">
        <button 
          onClick={() => navigate('/tournaments')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-semibold text-sm bg-[#18181c] px-4 py-2.5 rounded-xl border border-white/[0.05] active:scale-95 shadow-sm"
        >
          <FaArrowLeft className="text-xs" /> 返回赛事大厅
        </button>
      </div>

      {/* 1. 倒计时抬头 (褪去霓虹感，改为现代终端风) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 md:mb-16 z-20 px-4 mt-12 md:mt-0">
        <h2 className="text-xs md:text-sm font-bold text-zinc-500 tracking-widest mb-3">
          {status === 'pending' ? '距离预选赛开启还有' : status === 'active' ? '距离预选赛结束还有' : '赛事状态'}
        </h2>
        <div className="text-3xl md:text-5xl font-mono font-bold text-zinc-100 tracking-tight">
          {timeLeft}
        </div>
      </motion.div>

      {/* 2. 3D 舞台区域 */}
      <div className="relative w-full max-w-7xl h-[240px] md:h-[450px] flex justify-center items-center mb-10 md:mb-20 perspective-[1000px]">
        <SongCard position="left" status={status} img="/assets/pre1.png" delay={0.2} title="Ultra Synergy Matrix" artist="t+pazolite" />
        <SongCard position="right" status={status} img="/assets/pre3.png" delay={0.4} title="Oshama Scramble!" artist="t+pazolite" />
        <SongCard position="center" status={status} img="/assets/pre2.png" delay={0} title="PANDORA PARADOXXX" artist="Gram" />
      </div>

      {/* 3. 榜单区域 (现代卡片列表) */}
      <div className="w-full max-w-4xl px-4 z-10">
        <div className="flex items-center gap-3 mb-6 border-b border-white/[0.05] pb-4 px-2">
          <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-white/[0.05] flex items-center justify-center text-amber-400 shadow-sm">
            <FaTrophy className="text-lg" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">预选赛阶段积分榜</h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">Qualifier Stage Total Score Ranking</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          
          {/* 表头 */}
          <div className="flex items-center text-zinc-500 text-xs font-semibold px-4 md:px-6 pb-2">
            <div className="w-12 md:w-16 text-center shrink-0">排名</div>
            <div className="flex-1 pl-2">选手信息</div>
            <div className="w-24 md:w-32 text-right shrink-0">总达成率</div>
            <div className="w-20 md:w-28 text-right shrink-0 pr-2">DX 总分</div>
          </div>

          {sortedLeaderboard.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 bg-[#18181c] border border-white/[0.05] rounded-2xl text-sm font-medium flex flex-col items-center justify-center shadow-sm">
              <FaClock className="text-3xl mb-3 opacity-20" />
              暂无选手成绩录入
            </div>
          ) : (
            sortedLeaderboard.map((score, index) => {
              const isTop3 = index < 3;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  onClick={() => navigate(`/profile/${score.username}`)}
                  className={`flex items-center px-4 md:px-6 py-3 md:py-4 rounded-2xl border cursor-pointer transition-all ${
                    isTop3 
                      ? 'bg-[#18181c] border-white/[0.05] hover:bg-[#1a1a20] shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-[#18181c] hover:border-white/[0.05]'
                  }`}
                >
                  {/* 排名 */}
                  <div className="w-12 md:w-16 flex justify-center shrink-0">
                    {isTop3 ? (
                      <FaMedal className={`text-2xl ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-zinc-300' : 'text-[#b87333]'}`} />
                    ) : (
                      <span className="font-bold text-zinc-500">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* 玩家名及进度 */}
                  <div className="flex-1 flex flex-col pl-2 truncate min-w-0">
                    <span className="font-bold text-base md:text-lg text-zinc-100 truncate">{score.username}</span>
                    <span className="text-[11px] font-medium text-zinc-500 mt-0.5 flex items-center gap-1.5">
                      进度 <span className={score.playCount === 3 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{score.playCount || 0} / 3</span>
                    </span>
                  </div>
                  
                  {/* 总达成率 */}
                  <div className="w-24 md:w-32 text-right shrink-0 font-mono text-sm md:text-lg text-amber-400 font-bold">
                    {Number(score.totalAchievement || 0).toFixed(4)}%
                  </div>
                  
                  {/* 总 DX 分数 */}
                  <div className="w-20 md:w-28 text-right shrink-0 font-mono text-sm md:text-lg text-zinc-200 font-bold pr-2">
                    {score.totalDxScore || 0}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Qualifiers;