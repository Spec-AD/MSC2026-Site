import React, { useState, useEffect } from 'react';
import { FaTimes, FaGlobe, FaUserFriends, FaLock, FaSpinner, FaMedal } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ==========================================
// 🚀 多游戏生态配置引擎 (新增 Arcaea)
// ==========================================
const GAME_CONFIG = {
  maimai: {
    diffNames: ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'],
    diffColors: ['text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-zinc-300'],
    diffBgColors: [
      'bg-emerald-500/10 border-emerald-500/20',
      'bg-amber-500/10 border-amber-500/20',
      'bg-rose-500/10 border-rose-500/20',
      'bg-purple-500/10 border-purple-500/20',
      'bg-zinc-400/10 border-zinc-400/20'
    ],
    hasDX: true,
  },
  chunithm: {
    diffNames: ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ULTIMA', "WORLD'S END"],
    diffColors: ['text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-red-500', 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300'],
    diffBgColors: [
      'bg-emerald-500/10 border-emerald-500/20',
      'bg-amber-500/10 border-amber-500/20',
      'bg-rose-500/10 border-rose-500/20',
      'bg-purple-500/10 border-purple-500/20',
      'bg-[#1a0a0a] border-red-500/30',
      'bg-[#15151e] border-white/20'
    ],
    hasDX: false,
  },
  arcaea: {
    diffNames: ['Past', 'Present', 'Future', 'Beyond', 'Eternal'],
    diffColors: ['text-blue-400', 'text-green-400', 'text-purple-400', 'text-red-500', 'text-fuchsia-400'],
    diffBgColors: [
      'bg-blue-500/10 border-blue-500/20',
      'bg-green-500/10 border-green-500/20',
      'bg-purple-500/10 border-purple-500/20',
      'bg-red-500/10 border-red-500/20',
      'bg-[#1a0a1a] border-fuchsia-500/30'
    ],
    hasDX: false,
  }
};

export default function SongDrawer({ isOpen, onClose, song, activeGame = 'maimai' }) {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [boardLoading, setBoardLoading] = useState(false);
  const [boardData, setBoardData] = useState([]);
  const [boardScope, setBoardScope] = useState('global'); 
  const [boardLevel, setBoardLevel] = useState(3); 
  const [currentCover, setCurrentCover] = useState('/assets/bg.png');       

  const config = GAME_CONFIG[activeGame] || GAME_CONFIG.maimai;
  const isUtage = song?.basic_info?.genre === '宴会场' || song?.type === 'UTAGE';

  useEffect(() => {
    if (song && isOpen) {
      if (isUtage) {
        setBoardLevel(0);
      } else {
        let defaultLevel = 0;
        for (let i = config.diffNames.length - 1; i >= 0; i--) {
          if (song.ds && song.ds[i] !== undefined && song.ds[i] !== null) {
            defaultLevel = i;
            break;
          }
        }
        setBoardLevel(defaultLevel);
      }
      setBoardScope('global'); 
    }
  }, [song, isOpen, isUtage, config.diffNames.length]);

  useEffect(() => {
    if (!isOpen || !song) return; 
    if (!isUtage && (!song.ds || song.ds[boardLevel] === undefined)) return;
    
    const fetchLeaderboard = async () => {
      setBoardLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // 🌟 智能路由：根据不同游戏请求对应的排行榜 API
        let endpoint = `/api/songs/${song.id}/leaderboard`;
        if (activeGame === 'chunithm') endpoint = `/api/chunithm-songs/${song.id}/leaderboard`;
        if (activeGame === 'arcaea') endpoint = `/api/arcaea-songs/${song.id}/leaderboard`;

        const res = await axios.get(endpoint, {
          params: { level: boardLevel, scope: boardScope },
          headers
        });
        setBoardData(res.data);
      } catch (err) {
        addToast(err.response?.data?.msg || '获取排行榜失败', 'error');
        if (boardScope === 'friends') setBoardScope('global'); 
      } finally {
        setBoardLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [song, boardLevel, boardScope, isOpen, isUtage, activeGame]);

  const handleScopeSwitch = (targetScope) => {
    if (targetScope === 'friends') {
      if (!currentUser) return addToast('请先登录后查看', 'info');
      if ((currentUser.sponsorTier || 0) < 1) return addToast('好友排行榜为赞助者专属功能', 'error');
    }
    setBoardScope(targetScope);
  };

  const getRankColor = (index) => {
    if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]';
    if (index === 1) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]';
    if (index === 2) return 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]';
    return 'text-gray-500';
  };

  const getNotesCount = (chartInfo) => {
    if (!chartInfo) return 0;
    if (chartInfo.combo !== undefined) return chartInfo.combo; 
    if (chartInfo.notes && Array.isArray(chartInfo.notes)) return chartInfo.notes.reduce((a, b) => a + b, 0); 
    return 0;
  };

// ==========================================
  // 🌟 智能图床探测引擎 (完美适配 Arcaea 本地资产)
  // ==========================================
  useEffect(() => {
    if (!song) return;

    if (activeGame === 'arcaea') {
      const isBYD = boardLevel === 3; // 判断用户当前是否点击了 Beyond 难度
      const sId = song.id;

      // 构建探测队列 (按优先级排列)
      const pathsToTry = [];

      // 1. 如果选中了 BYD 难度，优先探测 3.jpg 相关的变体
      if (isBYD) {
        pathsToTry.push(`/assets/arcaea/songs/${sId}/3.jpg`);
        pathsToTry.push(`/assets/arcaea/songs/dl_${sId}/3.jpg`);
        pathsToTry.push(`/assets/arcaea/songs/${sId}/${sId}_3.jpg`);
        pathsToTry.push(`/assets/arcaea/songs/dl_${sId}/${sId}_3.jpg`);
      }

      // 2. 探测基础曲绘 base.jpg 的各种变体
      pathsToTry.push(`/assets/arcaea/songs/${sId}/base.jpg`);
      pathsToTry.push(`/assets/arcaea/songs/dl_${sId}/base.jpg`);
      pathsToTry.push(`/assets/arcaea/songs/${sId}/${sId}_base.jpg`);
      pathsToTry.push(`/assets/arcaea/songs/dl_${sId}/${sId}_base.jpg`);

      // 3. 终极兜底图
      pathsToTry.push('/assets/bg.png');

      // 递归探测：自动挨个试，哪个能加载出来就用哪个
      const probeImage = (index) => {
        if (index >= pathsToTry.length) return;
        const img = new Image();
        img.onload = () => setCurrentCover(pathsToTry[index]);
        img.onerror = () => probeImage(index + 1); // 裂图了就悄悄试下一个
        img.src = pathsToTry[index];
      };

      // 启动探测
      probeImage(0);

    } else if (activeGame === 'chunithm') {
      setCurrentCover(`https://assets2.lxns.net/chunithm/jacket/${song.id}.png`);
    } else {
      setCurrentCover(`https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`);
    }
  }, [song, activeGame, boardLevel]); // 🔥 监听 boardLevel，点击不同难度自动重新探测！

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-40 
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#0a0a0c] border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {song && (
          <div className="font-sans h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            
            <div className="p-6 pb-4 border-b border-gray-800 relative bg-gradient-to-b from-gray-800/40 to-transparent shrink-0 flex gap-4">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-transform hover:rotate-90 text-xl z-10"
              >
                <FaTimes />
              </button>
              
              <img 
                src={currentCover} 
                alt="cover" 
                className="w-20 h-20 rounded-xl object-cover shadow-lg border border-white/10 shrink-0" 
              />

              <div className="pr-6 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    activeGame === 'chunithm' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                    activeGame === 'arcaea' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                    song.type === 'DX' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                  }`}>
                    {activeGame === 'chunithm' ? 'CHU' : activeGame === 'arcaea' ? 'ARC' : song.type}
                  </span>
                  <span className="text-xs text-gray-400 font-mono tracking-wider">ID: {song.id}</span>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight mb-1 truncate" title={song.title || song.basic_info?.title}>
                  {song.title || song.basic_info?.title}
                </h2>
                <p className="text-sm text-gray-400">{song.basic_info?.artist}</p>
                
                {/* 别名徽章展示 */}
                {song.aliases && song.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {song.aliases.map((alias, idx) => (
                      <span key={idx} className="text-[10px] bg-white/10 border border-white/5 text-zinc-300 px-2 py-0.5 rounded-md">
                        {alias}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-8 flex-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">所属分类</div>
                  <div className="text-sm text-gray-200">{song.basic_info?.genre || '-'}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">实装版本</div>
                  <div className="text-sm text-gray-200">{song.basic_info?.from || '-'}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">BPM</div>
                  <div className="text-sm text-gray-200 font-mono">{song.basic_info?.bpm || '-'}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">新曲标识</div>
                  <div className="text-sm text-gray-200">
                    {song.basic_info?.is_new ? '✨ 是 (New)' : '否'}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Difficulty & Charter</h3>
                <div className="space-y-2">
                  {song.ds && song.ds.map((constant, idx) => {
                    if (constant === undefined || constant === null) return null;
                    
                    // 🔥 Arcaea 谱师与等级映射逻辑
                    const chartInfo = song.charts && song.charts[idx];
                    const arcaeaDiffInfo = song.difficulties && song.difficulties.find(d => d.ratingClass === idx);
                    
                    let charterName = '未知谱师';
                    if (activeGame === 'arcaea' && arcaeaDiffInfo?.chartDesigner) {
                      charterName = arcaeaDiffInfo.chartDesigner;
                    } else if (chartInfo?.charter) {
                      charterName = chartInfo.charter;
                    }

                    let displayLevel = song.level ? song.level[idx] : null;
                    if (activeGame === 'arcaea' && arcaeaDiffInfo) {
                      displayLevel = `${arcaeaDiffInfo.rating}${arcaeaDiffInfo.ratingPlus ? '+' : ''}`;
                    }

                    let totalNotes = activeGame === 'arcaea' ? '-' : getNotesCount(chartInfo);

                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col p-3 rounded-xl border ${config.diffBgColors[idx] || 'bg-gray-800 border-gray-700'} backdrop-blur-sm`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${config.diffColors[idx] || 'text-gray-300'}`}>
                              {config.diffNames[idx] || 'EXTRA'}
                            </span>
                            {displayLevel && (
                              <span className="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-gray-300 border border-white/5">
                                Lv.{displayLevel}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-lg font-bold text-white drop-shadow-md">
                            {constant.toFixed(1)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-1">
                          <span className="text-xs text-gray-400 opacity-80 truncate max-w-[200px]" title={charterName}>
                            {charterName !== '-' ? charterName : '未知谱师'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Notes: {totalNotes > 0 ? totalNotes : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                  <FaMedal className={`${activeGame === 'arcaea' ? 'text-purple-400' : 'text-yellow-500'}`} /> LEADERBOARD
                </h3>

                <div className="bg-gray-900/80 border border-white/5 rounded-2xl p-4 mb-4 shadow-inner">
                  {!isUtage && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest shrink-0">Diff</span>
                      <div className="flex gap-2 flex-1 overflow-x-auto custom-scrollbar pb-1">
                        {song.ds && song.ds.map((constant, idx) => {
                          // Arcaea 一般玩家可能会玩 PRS，所以保留所有难度可供切换；如果是 Maimai，依然保留过滤 idx < 2
                          if ((activeGame !== 'arcaea' && idx < 2) || constant === undefined || constant === null) return null; 
                          const isBtnActive = boardLevel === idx;
                          return (
                            <button 
                              key={idx}
                              onClick={() => setBoardLevel(idx)} 
                              className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-all whitespace-nowrap ${isBtnActive ? `bg-white/10 ${config.diffColors[idx]} border-white/20` : 'border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                            >
                              {config.diffNames[idx]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Scope</span>
                    <div className="flex bg-black/50 border border-white/5 rounded-lg p-1">
                      <button 
                        onClick={() => handleScopeSwitch('global')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${boardScope === 'global' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        <FaGlobe /> 全局
                      </button>
                      <button 
                        onClick={() => handleScopeSwitch('friends')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${boardScope === 'friends' ? (activeGame === 'arcaea' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]' : 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]') : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        {(!currentUser || (currentUser.sponsorTier || 0) < 1) ? <FaLock className="text-gray-500" /> : <FaUserFriends />} 好友
                      </button>
                    </div>
                  </div>
                </div>

                <div className="min-h-[200px]">
                  {boardLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <FaSpinner className={`animate-spin text-3xl mb-4 ${activeGame === 'arcaea' ? 'text-purple-400' : 'text-cyan-400'}`} />
                      <span className="font-mono text-xs tracking-widest font-bold uppercase">Loading Data...</span>
                    </div>
                  ) : boardData.length === 0 ? (
                    <div className="text-center py-16 bg-black/20 border border-white/5 rounded-2xl text-gray-500 font-mono text-xs tracking-widest font-bold">
                      NO RECORDS FOUND
                    </div>
                  ) : (
                    <div className="space-y-2 pb-10">
                      {boardData.map((score, index) => {
                        
                        // 兼容 Maimai DX 的星级计算
                        let starCount = 0;
                        if (config.hasDX) {
                          const chartInfo = song.charts && song.charts[boardLevel];
                          const maxDxScore = (chartInfo && chartInfo.notes) ? chartInfo.notes.reduce((a, b) => a + b, 0) * 3 : 0;
                          const dxRatio = maxDxScore > 0 ? score.dxScore / maxDxScore : 0;
                          
                          if (dxRatio >= 0.97) starCount = 5;
                          else if (dxRatio >= 0.95) starCount = 4;
                          else if (dxRatio >= 0.93) starCount = 3;
                          else if (dxRatio >= 0.90) starCount = 2;
                          else if (dxRatio >= 0.85) starCount = 1;
                        }

                        const playerName = score.userId?.username || score.username || 'Unknown Player';

                        // 🔥 Arcaea 的分数由于数值极大 (一千万分满分)，因此采用和 CHUNITHM 相同的 toLocaleString()
                        const displayScore = activeGame === 'chunithm' || activeGame === 'arcaea'
                          ? (score.score ? score.score.toLocaleString() : '-') 
                          : (score.achievement ? score.achievement.toFixed(4) + '%' : '-');

                        // 🔥 动态适配状态标识 (AJC / AP / FC / PM / FR)
                        const fc = (score.fcStatus || score.clear_type || '').toLowerCase(); // Arcaea 可能使用 clear_type 存储状态
                        let fcBadge = null;
                        
                        if (activeGame === 'chunithm') {
                          if (fc.includes('ajc')) fcBadge = <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-950 px-1 rounded text-[9px] font-black">AJC</span>;
                          else if (fc.includes('aj')) fcBadge = <span className="bg-yellow-400 text-yellow-950 px-1 rounded text-[9px] font-black">AJ</span>;
                          else if (fc.includes('fc')) fcBadge = <span className="bg-emerald-400 text-emerald-950 px-1 rounded text-[9px] font-black">FC</span>;
                        } else if (activeGame === 'arcaea') {
                          if (fc.includes('pm') || fc === '3') fcBadge = <span className="bg-gradient-to-r from-blue-300 to-blue-500 text-blue-950 px-1.5 rounded text-[9px] font-black shadow-[0_0_8px_rgba(59,130,246,0.5)]">PM</span>;
                          else if (fc.includes('fr') || fc === '2') fcBadge = <span className="bg-green-400 text-green-950 px-1.5 rounded text-[9px] font-black">FR</span>;
                        } else {
                          if (['fc', 'fcp', 'ap', 'app'].includes(fc)) {
                            fcBadge = <span className={`text-[9px] font-black text-white px-1 rounded ${fc.includes('ap') ? 'bg-yellow-500' : 'bg-pink-500'}`}>{fc.toUpperCase()}</span>;
                          }
                        }

                        // 动态高亮文字颜色
                        const scoreTextColor = activeGame === 'chunithm' 
                          ? 'text-yellow-400' : activeGame === 'arcaea' 
                          ? 'text-purple-300' : 'text-cyan-400';

                        return (
                          <div 
                            key={score._id || index} 
                            onClick={() => navigate(`/profile/${playerName}/${activeGame}`)}
                            className="flex items-center bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer active:scale-95 group"
                          >
                            <div className={`w-8 text-center font-mono font-black text-lg ${getRankColor(index)}`}>
                              {index + 1}
                            </div>

                            <img 
                              src={score.userId?.avatarUrl || score.avatarUrl || '/assets/logos.png'} 
                              alt="avatar" 
                              className="w-10 h-10 rounded-lg object-cover ml-2 mr-3 border border-white/10 group-hover:scale-105 transition-transform" 
                            />

                            <div className="flex-1 overflow-hidden">
                              <div className={`text-white font-bold text-sm truncate transition-colors group-hover:${scoreTextColor}`}>
                                {playerName}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`${scoreTextColor} font-mono font-bold text-sm`}>
                                  {displayScore}
                                </span>
                                {fcBadge}
                              </div>
                            </div>

                            {/* DX 分信息 (仅当有配置 DX 时显示) */}
                            {config.hasDX && (
                              <div className="flex items-center gap-2 shrink-0">
                                {starCount > 0 && (
                                  <img 
                                    src={`/assets/${starCount}dxstar.png`} 
                                    alt={`DX Star`} 
                                    className="h-[14px] md:h-4 object-contain drop-shadow-md"
                                  />
                                )}
                                <div className="text-right flex flex-col items-end">
                                  <span className="text-gray-300 font-mono font-bold text-sm">{score.dxScore || 0}</span>
                                  <span className="text-gray-500 text-[9px] font-bold uppercase mt-0.5">DX Score</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}