import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaCrown, FaMedal, FaSpinner, FaFireAlt, FaLevelUpAlt, FaBook, FaBug, FaCalendarCheck, FaFire } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pf'); 
  const navigate = useNavigate();
  const { addToast } = useToast();

  // 榜单配置字典 (本地化并内敛化设计)
  const TABS = [
    { id: 'pf', label: '综合实力', icon: <FaFireAlt /> },
    { id: 'single-best', label: '单曲最佳', icon: <FaFire /> },
    { id: 'level', label: '社区等级', icon: <FaLevelUpAlt /> },
    { id: 'wiki', label: '维基贡献', icon: <FaBook /> },
    { id: 'feedback', label: '捉虫猎人', icon: <FaBug /> },
    { id: 'checkin', label: '签到全勤', icon: <FaCalendarCheck /> },
  ];

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
  // 段位颜色引擎 (保留游戏特色，但去除夸张的霓虹发光)
  // ==========================================
  const getRatingColor = (rating) => {
    const r = Number(rating) || 0;
    if (r >= 16500) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-400 to-cyan-400 font-bold'; 
    if (r >= 16000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 font-bold'; 
    if (r >= 15000) return 'text-amber-400 font-semibold'; 
    if (r >= 13000) return 'text-purple-400 font-semibold'; 
    if (r >= 10000) return 'text-blue-400 font-semibold'; 
    return 'text-orange-400 font-medium'; 
  };

  const getPfColor = (pf) => {
    const p = Number(pf) || 0;
    if (p >= 42000) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-400 to-cyan-400 font-bold'; 
    if (p >= 35000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 font-bold'; 
    if (p >= 30000) return 'text-amber-400 font-semibold'; 
    if (p >= 20000) return 'text-purple-400 font-semibold'; 
    if (p >= 15000) return 'text-blue-400 font-semibold'; 
    return 'text-orange-400 font-medium'; 
  };

  const renderRankBadge = (index) => {
    if (index === 0) return <FaCrown className="text-2xl text-amber-400 drop-shadow-sm" />;
    if (index === 1) return <FaMedal className="text-2xl text-zinc-300 drop-shadow-sm" />;
    if (index === 2) return <FaMedal className="text-2xl text-[#b87333] drop-shadow-sm" />;
    return <span className="text-lg font-semibold text-zinc-500">{index + 1}</span>;
  };

  const renderDynamicStat = (player) => {
    switch(activeTab) {
      case 'pf':
        return (
          <>
            <div className={`text-xl font-bold tracking-tight pb-0.5 ${getPfColor(player.totalPf)}`}>
              {player.totalPf ? player.totalPf.toFixed(2) : '0.00'}
            </div>
            <span className="text-xs text-zinc-500 font-medium mt-0.5">Total PF</span>
          </>
        );
      case 'level':
        return (
          <>
            <div className="text-xl font-bold text-cyan-400 tracking-tight pb-0.5">
              Lv.{player.level || 1}
            </div>
            <span className="text-xs text-zinc-500 font-medium mt-0.5">{player.xp || 0} XP</span>
          </>
        );
      case 'single-best':
        return (
          <>
            <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 tracking-tight pb-0.5">
              {player.pf ? player.pf.toFixed(2) : '0.00'}
            </div>
            <span className="text-xs text-zinc-500 font-medium mt-0.5">Max PF</span>
          </>
        );
      case 'wiki':
        return (
          <>
            <div className="text-xl font-bold text-purple-400 tracking-tight pb-0.5">
              {player.wikiApprovedCount || 0}
            </div>
            <span className="text-xs text-zinc-500 font-medium mt-0.5">过审词条</span>
          </>
        );
      case 'feedback':
        return (
          <>
            <div className="text-xl font-bold text-emerald-400 tracking-tight pb-0.5">
              {player.feedbackApprovedCount || 0}
            </div>
            <span className="text-xs text-zinc-500 font-medium mt-0.5">采纳建议</span>
          </>
        );
      case 'checkin':
        return (
          <>
            <div className="text-xl font-bold text-amber-400 tracking-tight pb-0.5">
              {player.checkInCount || 0}
            </div>
            <span className="text-xs text-zinc-500 font-medium mt-0.5">累计签到</span>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-zinc-600/40">
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* 头部标题区 */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center justify-center md:justify-start gap-3">
            <FaCrown className="text-amber-400" />
            排行榜
          </h1>
          <p className="text-sm text-zinc-500 mt-2 font-medium">
            全局排名与各项社区成就展现
          </p>
        </div>

        {/* 现代药丸导航条 (Pill Tabs) */}
        <div className="mb-8 w-full overflow-x-auto custom-scrollbar pb-2">
          <div className="flex items-center gap-2 bg-[#18181c] p-1.5 rounded-2xl border border-white/[0.05] w-max mx-auto md:mx-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95
                    ${isActive 
                      ? 'bg-zinc-200 text-zinc-900 shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {tab.icon} <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-24 flex justify-center">
              <FaSpinner className="animate-spin text-3xl text-zinc-600" />
            </motion.div>
          ) : (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {/* 表头提示 (极其克制的设计) */}
              <div className="hidden md:flex items-center px-6 py-2 text-xs font-semibold text-zinc-500 border-b border-white/[0.05] mb-2">
                <div className="w-16 text-center">排名</div>
                <div className="flex-1 pl-4">玩家</div>
                {activeTab === 'pf' && <div className="w-32 text-center">综合 Rating</div>}
                <div className="w-32 text-right pr-2">数据 / 成绩</div>
              </div>

              {/* 玩家列表 (并列排名逻辑不变) */}
              {(() => {
                let currentRank = 1;
                return players.map((player, index) => {
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
                    if (currentVal !== prevVal) {
                      currentRank = index + 1;
                    }
                  }
                  
                  const rankIndex = currentRank - 1; 
                  
                  // 前三名专属背景与边框色彩提取
                  let highlightStyle = 'bg-[#18181c] border-white/[0.05] hover:bg-[#1a1a20]';
                  if (rankIndex === 0) highlightStyle = 'bg-[#201a12] border-amber-500/20 hover:bg-[#261f15]';
                  if (rankIndex === 1) highlightStyle = 'bg-[#1a1b1e] border-zinc-400/20 hover:bg-[#1f2024]';
                  if (rankIndex === 2) highlightStyle = 'bg-[#201714] border-orange-700/20 hover:bg-[#261b17]';
                  
                  const isRatingVisible = player.isB50Visible === true; 
                  
                  return (
                  <div 
                    key={`${activeTab}-${player.scoreId || player.userId || player._id}`}
                    onClick={() => navigate(`/profile/${player.username}`)}
                    className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all shadow-sm border ${highlightStyle} group`}
                  >
                    {/* 排名列 */}
                    <div className="w-12 md:w-16 flex justify-center shrink-0">
                      {renderRankBadge(rankIndex)}
                    </div>

                    {/* 玩家信息列 */}
                    <div className="flex-1 flex items-center gap-4 overflow-hidden pl-2 md:pl-4 border-l border-white/[0.05]">
                      <img 
                        src={player.avatarUrl || '/assets/logos.png'} 
                        alt="avatar" 
                        className="w-12 h-12 rounded-full object-cover bg-[#111115] border border-white/[0.05] shrink-0"
                      />
                      <div className="flex flex-col truncate min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base font-bold text-zinc-100 truncate group-hover:text-white transition-colors">
                            {player.username}
                          </span>
                          {player.role === 'ADM' && <span className="bg-rose-500/10 text-rose-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold">ADM</span>}
                        </div>
                        
                        {/* 榜单副标题 */}
                        {activeTab === 'single-best' ? (
                          <div className="flex flex-col">
                            <span className="text-zinc-400 font-medium text-xs truncate max-w-[200px] md:max-w-[300px]">
                              {player.songName}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] mt-1">
                              <span className="bg-white/[0.05] px-1.5 py-0.5 rounded text-zinc-300 font-medium border border-white/[0.05]">
                                Lv.{player.level} ({player.constant?.toFixed(1)})
                              </span>
                              <span className="text-emerald-400 font-semibold">{player.achievement?.toFixed(4)}%</span>
                              {player.fcStatus && ['fc', 'fcp', 'ap', 'app'].includes(player.fcStatus) && (
                                <span className={`px-1.5 py-0.5 rounded font-bold text-white uppercase ${player.fcStatus.includes('ap') ? 'bg-amber-500' : 'bg-pink-500'}`}>
                                  {player.fcStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 font-medium">
                            UID: {player.uid || '未绑定'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating 列 (保护隐私) - 仅在 PF 榜单显示 */}
                    {activeTab === 'pf' && (
                      <div className="hidden md:flex w-32 justify-center shrink-0 border-l border-white/[0.05]">
                        <span className={`bg-white/[0.02] border border-white/[0.05] px-3.5 py-1 rounded-full text-xs font-semibold ${isRatingVisible ? getRatingColor(player.rating) : 'text-zinc-600'}`}>
                          {isRatingVisible ? (player.rating || 0) : '保密'}
                        </span>
                      </div>
                    )}

                    {/* 右侧数值列 */}
                    <div className="w-24 md:w-32 flex flex-col items-end shrink-0 pr-2 border-l border-white/[0.05] md:ml-4">
                      {renderDynamicStat(player)}
                    </div>
                  </div>
                );
                });
              })()} 

              {players.length === 0 && (
                <div className="text-center py-20 text-zinc-500 text-sm font-medium border border-white/[0.05] bg-[#18181c] rounded-2xl flex flex-col items-center">
                  <FaCrown className="text-3xl mb-3 opacity-20" />
                  暂无玩家上榜
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Leaderboard;