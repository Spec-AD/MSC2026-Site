import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaMedal, FaSpinner } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 一级分类
  const [activeTab, setActiveTab] = useState('pf'); 
  
  // 二级/三级分类 (专为综合实力设计)
  const [activeGame, setActiveGame] = useState('maimai'); 
  const [osuMode, setOsuMode] = useState('standard'); 

  const navigate = useNavigate();
  const { addToast } = useToast();

  // 榜单配置字典
  const TABS = [
    { id: 'pf', label: '综合实力' },
    { id: 'level', label: '等级' },
    { id: 'wiki', label: '维基贡献' },
    { id: 'feedback', label: '反馈' },
    { id: 'checkin', label: '签到天数' },
  ];

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let endpoint = `/api/leaderboard/${activeTab}`;
        
        // 智能路由选择：匹配我们在 server.js 中新加的专有接口
        if (activeTab === 'pf') {
          if (activeGame === 'chunithm') {
            endpoint = `/api/leaderboard/chunithm`;
          } else {
            endpoint += `?game=${activeGame}`;
            if (activeGame === 'osu') {
              endpoint += `&mode=${osuMode}`;
            }
          }
        }
          
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
  }, [activeTab, activeGame, osuMode]);

  // 🌟 Maimai DX 色彩系统
  const getRatingColor = (rating) => {
    const r = Number(rating) || 0;
    if (r >= 16500) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400 font-bold'; 
    if (r >= 16000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 font-bold'; 
    if (r >= 15000) return 'text-amber-400 font-semibold'; 
    if (r >= 13000) return 'text-purple-400 font-semibold'; 
    if (r >= 10000) return 'text-blue-400 font-semibold'; 
    return 'text-orange-400 font-medium'; 
  };

  const getPfColor = (pf) => {
    const p = Number(pf) || 0;
    if (p >= 42000) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400 font-bold'; 
    if (p >= 35000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 font-bold'; 
    if (p >= 30000) return 'text-amber-400 font-semibold'; 
    if (p >= 20000) return 'text-purple-400 font-semibold'; 
    if (p >= 15000) return 'text-blue-400 font-semibold'; 
    return 'text-orange-400 font-medium'; 
  };

  // 🔥 CHUNITHM 专属色彩系统 (17.00+ 彩色神仙流明特效)
  const getChuniRatingColor = (rating) => {
    const r = Number(rating) || 0;
    if (r >= 17.00) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 font-black drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]';
    if (r >= 16.00) return 'text-rose-400 font-bold';
    if (r >= 15.00) return 'text-purple-400 font-bold';
    return 'text-yellow-400 font-bold';
  };

  const renderRankBadge = (index) => {
    if (index === 0) return <FaMedal className="text-[22px] text-amber-400 drop-shadow-sm" />;
    if (index === 1) return <FaMedal className="text-[22px] text-zinc-300 drop-shadow-sm" />;
    if (index === 2) return <FaMedal className="text-[22px] text-[#b87333] drop-shadow-sm" />;
    return (
      <span 
        className="text-base font-bold text-zinc-500" 
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        {index + 1}
      </span>
    );
  };

  const renderDynamicStat = (player) => {
    switch(activeTab) {
      case 'pf':
        if (activeGame === 'osu') {
          return (
            <>
              <div 
                className="text-xl font-bold tracking-tight pb-0.5 text-pink-400" 
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                {player.pp ? Math.round(player.pp) : (player.totalPf ? Math.round(player.totalPf) : '0')}
              </div>
              <span 
                className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                PP
              </span>
            </>
          );
        } else if (activeGame === 'chunithm') {
          // 🔥 移除 isChuniB50Visible 限制，始终公开展示 Rating 和彩色流明特效
          return (
            <>
              <div 
                className={`text-xl tracking-tight pb-0.5 ${getChuniRatingColor(player.chuniRating)}`}
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                {player.chuniRating ? player.chuniRating.toFixed(2) : '0.00'}
              </div>
              <span 
                className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                RATING
              </span>
            </>
          );
        } else {          
          return (
            <>
              <div 
                className={`text-xl font-bold tracking-tight pb-0.5 ${getPfColor(player.totalPf)}`}
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                {player.totalPf ? player.totalPf.toFixed(2) : '0.00'}
              </div>
              <span 
                className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                PF
              </span>
            </>
          );
        }
      case 'level':
        return (
          <>
            <div 
              className="text-xl font-bold text-cyan-400 tracking-tight pb-0.5"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              Lv.{player.level || 1}
            </div>
            <span 
              className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {player.xp || 0} XP
            </span>
          </>
        );
      case 'wiki':
        return (
          <>
            <div 
              className="text-xl font-bold text-purple-400 tracking-tight pb-0.5"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {player.wikiApprovedCount || 0}
            </div>
            <span className="text-[11px] text-zinc-500 font-bold tracking-widest mt-0.5">
              过审词条
            </span>
          </>
        );
      case 'feedback':
        return (
          <>
            <div 
              className="text-xl font-bold text-emerald-400 tracking-tight pb-0.5"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {player.feedbackApprovedCount || 0}
            </div>
            <span className="text-[11px] text-zinc-500 font-bold tracking-widest mt-0.5">
              采纳建议
            </span>
          </>
        );
      case 'checkin':
        return (
          <>
            <div 
              className="text-xl font-bold text-amber-400 tracking-tight pb-0.5"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {player.checkInCount || 0}
            </div>
            <span className="text-[11px] text-zinc-500 font-bold tracking-widest mt-0.5">
              累计签到
            </span>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      
      {/* 背景：高级晕影与环境散光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* 头部标题区 */}
        <div className="mb-10 text-left">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-zinc-300 rounded-full shadow-[0_0_8px_rgba(212,212,216,0.5)]"></div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
              排行榜
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-3 font-medium">
            全站数据排名与各项社区成就展现
          </p>
        </div>

        {/* 一级导航 */}
        <div className="mb-6 w-full overflow-x-auto custom-scrollbar pb-2">
          <div className="flex items-center gap-2 bg-[#15151e]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/[0.05] w-max">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95
                    ${isActive 
                      ? 'bg-zinc-200 text-zinc-900 shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 二级 & 三级联动筛选器 */}
        <AnimatePresence>
          {activeTab === 'pf' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 overflow-hidden"
            >
              {/* 二级：游戏选择 (加入 CHUNITHM) */}
              <div className="flex items-center gap-1.5 bg-[#15151e]/60 backdrop-blur-md p-1.5 rounded-xl border border-white/[0.05]">
                <button 
                  onClick={() => setActiveGame('maimai')} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${activeGame === 'maimai' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
                >
                  舞萌 DX
                </button>
                <button 
                  onClick={() => setActiveGame('chunithm')} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${activeGame === 'chunithm' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
                >
                  CHUNITHM
                </button>
                <button 
                  onClick={() => setActiveGame('osu')} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${activeGame === 'osu' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
                >
                  osu!
                </button>
              </div>

              {/* 三级：osu! 模式选择 */}
              {activeGame === 'osu' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 bg-[#15151e]/40 backdrop-blur-md p-1 rounded-xl border border-white/[0.02]"
                >
                  {['standard', 'taiko', 'catch', 'mania'].map(mode => (
                    <button 
                      key={mode} 
                      onClick={() => setOsuMode(mode)} 
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 ${osuMode === mode ? 'bg-pink-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'}`}
                      style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                      {mode}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* 数据列表主体 */}
        {/* ==================================================== */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-24 flex justify-center">
              <FaSpinner className="animate-spin text-3xl text-indigo-500/50" />
            </motion.div>
          ) : (
            <motion.div 
              key={`${activeTab}-${activeGame}-${osuMode}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {/* 表头 */}
              <div 
                className="hidden md:flex items-center px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500 border-b border-white/[0.05] mb-2"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                <div className="w-16 text-center">RANK</div>
                <div className="flex-1 pl-4">PLAYER</div>
                {activeTab === 'pf' && activeGame === 'maimai' && <div className="w-32 text-center">RATING</div>}
                <div className="w-32 text-right pr-2">DATA</div>
              </div>

              {/* 玩家列表 */}
              {(() => {
                let currentRank = 1;
                return players.map((player, index) => {
                  // 计算并列名次
                  if (index > 0) {
                    const prevPlayer = players[index - 1];
                    let currentVal, prevVal;
                    switch (activeTab) {
                      case 'pf': 
                        if (activeGame === 'osu') { currentVal = player.pp || player.totalPf; prevVal = prevPlayer.pp || prevPlayer.totalPf; }
                        else if (activeGame === 'chunithm') { currentVal = player.chuniRating; prevVal = prevPlayer.chuniRating; }
                        else { currentVal = player.totalPf; prevVal = prevPlayer.totalPf; }
                        break;
                      case 'level': currentVal = player.xp; prevVal = prevPlayer.xp; break;
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
                  
                  // 前三名专属背景提取
                  let highlightStyle = 'bg-[#15151e]/80 border-white/[0.05] hover:bg-[#1a1a24]';
                  if (rankIndex === 0) highlightStyle = 'bg-[#201a12]/80 border-amber-500/20 hover:bg-[#261f15]';
                  if (rankIndex === 1) highlightStyle = 'bg-[#1a1b1e]/80 border-zinc-400/20 hover:bg-[#1f2024]';
                  if (rankIndex === 2) highlightStyle = 'bg-[#201714]/80 border-orange-700/20 hover:bg-[#261b17]';
                  
                  const isRatingVisible = player.isB50Visible === true; 
                  
                  return (
                  <div 
                    key={player.userId || player._id || index}
                    onClick={() => navigate(`/profile/${player.username}`)}
                    className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all shadow-sm border backdrop-blur-md group ${highlightStyle}`}
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
                        className="w-12 h-12 rounded-full object-cover bg-[#0c0c11] border border-white/[0.05] shrink-0 shadow-sm"
                      />
                      <div className="flex flex-col truncate min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base font-bold text-zinc-100 truncate group-hover:text-white transition-colors">
                            {player.username}
                          </span>
                          {player.role === 'ADM' && <span className="bg-rose-500/10 text-rose-400 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md font-bold">ADM</span>}
                        </div>
                        <span 
                          className="text-xs text-zinc-500 font-medium tracking-widest"
                          style={{ fontFamily: "'Quicksand', sans-serif" }}
                        >
                          UID: {player.uid || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* 原生评分列 (仅 Maimai 显示在中间，中二显示在右侧数值列) */}
                    {activeTab === 'pf' && activeGame === 'maimai' && (
                      <div className="hidden md:flex w-32 justify-center shrink-0 border-l border-white/[0.05]">
                        <span 
                          className={`bg-[#0c0c11]/50 border border-white/[0.05] px-3.5 py-1 rounded-full text-[13px] font-bold ${isRatingVisible ? getRatingColor(player.rating) : 'text-zinc-600'}`}
                          style={{ fontFamily: "'Quicksand', sans-serif" }}
                        >
                          {isRatingVisible ? (player.rating || 0) : 'HIDDEN'}
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
                <div className="text-center py-20 text-zinc-500 text-sm font-medium border border-white/[0.05] bg-[#15151e]/80 backdrop-blur-md rounded-3xl flex flex-col items-center shadow-sm">
                  <span className="text-2xl mb-3 opacity-30 font-bold">--</span>
                  该榜单暂无数据录入
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