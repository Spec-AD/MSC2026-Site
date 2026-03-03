import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaCrown, FaMedal, FaSpinner, FaFireAlt, FaLevelUpAlt, FaBook, FaBug, FaCalendarCheck, FaFire } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pf'); // 当前激活的榜单
  const navigate = useNavigate();
  const { addToast } = useToast();

  // 榜单配置字典 (已加入单图最佳排行榜)
  const TABS = [
    { id: 'pf', label: 'PERFORMANCE', icon: <FaFireAlt />, color: 'text-orange-500', bgHover: 'hover:bg-orange-500/20', border: 'border-orange-500' },
    { id: 'level', label: 'LEVELS', icon: <FaLevelUpAlt />, color: 'text-cyan-400', bgHover: 'hover:bg-cyan-500/20', border: 'border-cyan-400' },
    { id: 'single-best', label: 'SINGLE BEST', icon: <FaFire />, color: 'text-pink-500', bgHover: 'hover:bg-pink-500/20', border: 'border-pink-500' },
    { id: 'wiki', label: 'WIKI CONTRIB', icon: <FaBook />, color: 'text-purple-400', bgHover: 'hover:bg-purple-500/20', border: 'border-purple-400' },
    { id: 'feedback', label: 'BUG HUNTER', icon: <FaBug />, color: 'text-green-400', bgHover: 'hover:bg-green-500/20', border: 'border-green-400' },
    { id: 'checkin', label: 'CHECK-IN', icon: <FaCalendarCheck />, color: 'text-yellow-400', bgHover: 'hover:bg-yellow-500/20', border: 'border-yellow-400' },
  ];

  // 当 tab 切换时，重新拉取对应榜单数据
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const endpoint = activeTab === 'single-best' 
          ? '/api/leaderboard/single-best' 
          : `/api/leaderboard/${activeTab}`;
          
        const res = await axios.get(endpoint);
        setPlayers(res.data);
      } catch (err) {
        console.error('获取排行榜失败', err);
        addToast('获取排行榜数据失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeTab]);

  // ==========================================
  // 🔥 段位颜色引擎 (Rating & PF)
  // ==========================================
  const getRatingColor = (rating) => {
    const r = Number(rating) || 0;
    if (r >= 16500) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 via-yellow-400 via-green-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'; 
    if (r >= 16000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 drop-shadow-[0_0_10px_rgba(103,232,249,0.6)]'; 
    if (r >= 15000) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'; 
    if (r >= 13000) return 'text-purple-400'; 
    if (r >= 10000) return 'text-blue-400'; 
    return 'text-[#cd7f32]'; 
  };

  const getPfColor = (pf) => {
    const p = Number(pf) || 0;
    if (p >= 42000) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 via-yellow-400 via-green-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'; 
    if (p >= 35000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 drop-shadow-[0_0_10px_rgba(103,232,249,0.6)]'; 
    if (p >= 30000) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'; 
    if (p >= 20000) return 'text-purple-400'; 
    if (p >= 15000) return 'text-blue-400'; 
    return 'text-[#cd7f32]'; 
  };

  const textClipFix = "pb-1 leading-tight";

  const renderRankBadge = (index) => {
    if (index === 0) return <FaCrown className="text-3xl text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />;
    if (index === 1) return <FaMedal className="text-3xl text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)]" />;
    if (index === 2) return <FaMedal className="text-3xl text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]" />;
    return <span className="text-xl md:text-2xl font-mono font-bold text-gray-500">{index + 1}</span>;
  };

  // 根据当前榜单动态渲染右侧数值列
  const renderDynamicStat = (player) => {
    switch(activeTab) {
      case 'pf':
        return (
          <>
            <div className={`text-xl md:text-3xl font-black italic tracking-tighter font-mono ${textClipFix} ${getPfColor(player.totalPf)}`}>
              {player.totalPf ? player.totalPf.toFixed(2) : '0.00'}
            </div>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest mt-[-2px]">Total PF</span>
          </>
        );
      case 'level':
        return (
          <>
            <div className="text-xl md:text-3xl font-black italic tracking-tighter font-mono text-cyan-400 pb-1 leading-tight">
              Lv.{player.level || 1}
            </div>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest mt-[-2px]">{player.xp || 0} XP</span>
          </>
        );
      case 'single-best':
        return (
          <>
            <div className="text-xl md:text-3xl font-black italic tracking-tighter font-mono text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 drop-shadow-md pb-1 leading-tight">
              {player.pf ? player.pf.toFixed(2) : '0.00'}
            </div>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest mt-[-2px]">Max PF</span>
          </>
        );
      case 'wiki':
        return (
          <>
            <div className="text-xl md:text-3xl font-black italic tracking-tighter font-mono text-purple-400 pb-1 leading-tight">
              {player.wikiApprovedCount || 0}
            </div>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest mt-[-2px]">已过审词条</span>
          </>
        );
      case 'feedback':
        return (
          <>
            <div className="text-xl md:text-3xl font-black italic tracking-tighter font-mono text-green-400 pb-1 leading-tight">
              {player.feedbackApprovedCount || 0}
            </div>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest mt-[-2px]">采纳建议数</span>
          </>
        );
      case 'checkin':
        return (
          <>
            <div className="text-xl md:text-3xl font-black italic tracking-tighter font-mono text-yellow-400 pb-1 leading-tight">
              {player.checkInCount || 0}
            </div>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest mt-[-2px]">累计签到(天)</span>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-5xl mx-auto pt-24">
      
      {/* 头部 Hero 区 */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg flex items-center justify-center md:justify-start gap-4">
          <FaCrown className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
          HALL OF FAME.
        </h1>
        <p className="text-gray-400 font-mono text-sm tracking-[0.2em] uppercase mt-4">
          Purebeat Global Rankings & Achievements
        </p>
      </div>

      {/* 🌟 动态榜单切换栏 (Tabs) */}
      <div className="mb-8 w-full overflow-x-auto hide-scrollbar border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-4 pb-4 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold tracking-widest text-xs md:text-sm uppercase transition-all duration-300 border
                  ${isActive 
                    ? `bg-black/60 shadow-lg ${tab.border} ${tab.color}` 
                    : `bg-white/5 border-transparent text-gray-400 ${tab.bgHover} hover:text-white`
                  }
                `}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-32 flex justify-center">
            <FaSpinner className="animate-spin text-5xl text-gray-500" />
          </motion.div>
        ) : (
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-3"
          >
            {/* 表头 */}
            <div className="hidden md:flex items-center px-6 py-3 text-xs font-bold tracking-widest text-gray-500 uppercase border-b border-white/5">
              <div className="w-20 text-center">Rank</div>
              <div className="flex-1">Player</div>
              {activeTab === 'pf' && <div className="w-32 text-center">DX Rating</div>}
              <div className="w-40 text-right pr-4">Data / Score</div>
            </div>

            {/* 玩家列表 (🔥 动态计算并列排名) */}
            {(() => {
              let currentRank = 1;
              return players.map((player, index) => {
                // 1. 核心并列判断逻辑
                if (index > 0) {
                  const prevPlayer = players[index - 1];
                  let currentVal, prevVal;
                  switch (activeTab) {
                    case 'pf': currentVal = player.totalPf; prevVal = prevPlayer.totalPf; break;
                    case 'level': currentVal = player.xp; prevVal = prevPlayer.xp; break;
                    case 'single-best': currentVal = player.pf; prevVal = prevPlayer.pf; break;
                    case 'wiki': currentVal = player.wikiApprovedCount; prevVal = prevPlayer.wikiApprovedCount; break;
                    case 'feedback': currentVal = player.feedbackApprovedCount; prevVal = prevPlayer.feedbackApprovedCount; break;
                    case 'checkin': currentVal = player.checkInCount; prevVal = prevPlayer.checkInCount; break;
                    default: currentVal = player.totalPf; prevVal = prevPlayer.totalPf; break;
                  }
                  // 如果分数不一样，名次才会往后推；如果一样，沿用上一个 currentRank
                  if (currentVal !== prevVal) {
                    currentRank = index + 1;
                  }
                }
                
                // 此时 rankIndex 即为并列排名对应的索引 (0=第一名, 1=第二名...)
                const rankIndex = currentRank - 1; 
                const isTop3 = rankIndex < 3;
                const isRatingVisible = player.isB50Visible === true; 
                
                return (
                <div 
                  key={`${activeTab}-${player.scoreId || player.userId || player._id}`}
                  onClick={() => navigate(`/profile/${player.username}`)}
                  className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-300 group
                    ${isTop3 ? 'bg-gradient-to-r from-white/10 to-transparent border border-white/20 hover:border-white/30 hover:bg-white/10' : 'bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/20'}
                  `}
                >
                  {/* 排名列 */}
                  <div className="w-12 md:w-20 flex justify-center shrink-0">
                    {renderRankBadge(rankIndex)}
                  </div>

                  {/* 玩家信息列 */}
                  <div className="flex-1 flex items-center gap-4 overflow-hidden">
                    <img 
                      src={player.avatarUrl || '/assets/logos.png'} 
                      alt="avatar" 
                      className={`w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border-2 transition-all shrink-0
                        ${isTop3 ? 'border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'border-transparent group-hover:border-white/20'}
                      `}
                    />
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg md:text-xl font-bold truncate transition-colors
                          ${isTop3 ? 'text-white' : 'text-gray-300 group-hover:text-white'}
                        `}>
                          {player.username}
                        </span>
                        {player.role === 'ADM' && <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider">ADM</span>}
                      </div>
                      
                      {/* 单曲最佳榜单的副标题展示曲目数据，其他榜单展示 UID */}
                      {activeTab === 'single-best' ? (
                        <div className="flex flex-col mt-0.5">
                          <span className="text-cyan-300 font-bold text-xs md:text-sm truncate max-w-[200px] md:max-w-full">
                            {player.songName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs font-mono mt-0.5">
                            <span className="bg-white/10 px-1.5 rounded text-gray-300">Lv.{player.level} ({player.constant?.toFixed(1)})</span>
                            <span className="text-gray-500">|</span>
                            <span className="text-green-400 font-bold">{player.achievement?.toFixed(4)}%</span>
                            {player.fcStatus && ['fc', 'fcp', 'ap', 'app'].includes(player.fcStatus) && (
                              <span className={`px-1 rounded font-black text-white ${player.fcStatus.includes('ap') ? 'bg-yellow-500' : 'bg-pink-500'}`}>
                                {player.fcStatus.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 font-mono tracking-widest mt-0.5">
                          UID: {player.uid || '未绑定'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating 列 (保护隐私) - 仅在 PF 榜单显示 */}
                  {activeTab === 'pf' && (
                    <div className="hidden md:flex w-32 justify-center shrink-0">
                      <span className={`bg-white/5 px-3 py-1 rounded-full text-xs font-mono font-bold border border-white/10 ${textClipFix} ${isRatingVisible ? getRatingColor(player.rating) : 'text-gray-500'}`}>
                        {isRatingVisible ? (player.rating || 0) : '-'}
                      </span>
                    </div>
                  )}

                  {/* 动态渲染右侧数值列 */}
                  <div className="w-24 md:w-40 flex flex-col items-end shrink-0 pr-2 md:pr-4">
                    {renderDynamicStat(player)}
                  </div>
                </div>
              );
              });
            })()} 

            {players.length === 0 && (
              <div className="text-center py-20 text-gray-500 font-mono tracking-widest border border-white/5 bg-black/20 rounded-2xl">
                AWAITING HEROES / 虚位以待
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;