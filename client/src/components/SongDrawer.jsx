import React, { useState, useEffect } from 'react';
import { FaTimes, FaGlobe, FaUserFriends, FaLock, FaSpinner, FaMedal } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SongDrawer({ isOpen, onClose, song }) {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  // 排行榜核心状态
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardData, setBoardData] = useState([]);
  const [boardScope, setBoardScope] = useState('global'); // 'global' | 'friends'
  const [boardLevel, setBoardLevel] = useState(3);        // 默认紫谱

  const diffNames = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
  const diffColors = ['text-green-400', 'text-yellow-400', 'text-red-400', 'text-purple-400', 'text-pink-300'];
  const diffBgColors = [
    'bg-green-500/10 border-green-500/20',
    'bg-yellow-500/10 border-yellow-500/20',
    'bg-red-500/10 border-red-500/20',
    'bg-purple-500/10 border-purple-500/20',
    'bg-pink-500/10 border-pink-500/20'
  ];

  const isUtage = song?.basic_info?.genre === '宴会场' || song?.type === 'UTAGE';

  // 1. 初始化机制：只有打开抽屉的瞬间，才初始化难度 (防止后台乱跑)
  useEffect(() => {
    if (song && isOpen) {
      if (isUtage) {
        setBoardLevel(0);
      } else {
        if (song.ds[4] !== undefined) setBoardLevel(4);
        else if (song.ds[3] !== undefined) setBoardLevel(3);
        else if (song.ds[2] !== undefined) setBoardLevel(2);
        else setBoardLevel(0);
      }
      setBoardScope('global'); 
    }
  }, [song, isOpen, isUtage]);

  // 2. 🔥 极致防抖请求引擎：只在参数全部就绪时拉取数据
  useEffect(() => {
    if (!isOpen || !song) return; 
    
    if (!isUtage && song.ds[boardLevel] === undefined) return;
    
    const fetchLeaderboard = async () => {
      setBoardLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const res = await axios.get(`/api/songs/${song.id}/leaderboard`, {
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
  }, [song, boardLevel, boardScope, isOpen, isUtage]);

  // 范围切换逻辑拦截 (判断 Sponsor Tier)
  const handleScopeSwitch = (targetScope) => {
    if (targetScope === 'friends') {
      if (!currentUser) {
        addToast('请先登录后查看', 'info');
        return;
      }
      if ((currentUser.sponsorTier || 0) < 1) {
        addToast('好友排行榜为赞助者专属功能 (Tier 1 及以上)', 'error');
        return;
      }
    }
    setBoardScope(targetScope);
  };

  const handleLevelSwitch = (lvl) => {
    if (song.ds[lvl] !== undefined) {
      setBoardLevel(lvl);
    }
  };

  const getRankColor = (index) => {
    if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]';
    if (index === 1) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]';
    if (index === 2) return 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]';
    return 'text-gray-500';
  };

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
          <div className="font-maimai h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            
            {/* 顶部标题区 */}
            <div className="p-6 pb-4 border-b border-gray-800 relative bg-gradient-to-b from-gray-800/40 to-transparent shrink-0">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-transform hover:rotate-90 text-xl"
              >
                <FaTimes />
              </button>
              
              <div className="pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    song.type === 'DX' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                  }`}>
                    {song.type}
                  </span>
                  <span className="text-xs text-gray-400 font-mono tracking-wider">ID: {song.id}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                  {song.basic_info.title}
                </h2>
                <p className="text-sm text-gray-400">{song.basic_info.artist}</p>
              </div>
            </div>

            <div className="p-6 space-y-8 flex-1">
              
              {/* 1. 基础信息卡片 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">所属分类</div>
                  <div className="text-sm text-gray-200">{song.basic_info.genre}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">实装版本</div>
                  <div className="text-sm text-gray-200">{song.basic_info.from}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">BPM</div>
                  <div className="text-sm text-gray-200 font-mono">{song.basic_info.bpm}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">新曲标识</div>
                  <div className="text-sm text-gray-200">
                    {song.basic_info.is_new ? '✨ 是 (New)' : '否'}
                  </div>
                </div>
              </div>

              {/* 2. 定数与谱面信息 */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Difficulty & Charter</h3>
                <div className="space-y-2">
                  {song.ds.map((constant, idx) => {
                    const chartInfo = song.charts[idx];
                    const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0); 

                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col p-3 rounded-xl border ${diffBgColors[idx]} backdrop-blur-sm`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${diffColors[idx]}`}>
                              {diffNames[idx]}
                            </span>
                            <span className="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-gray-300">
                              Lv.{song.level[idx]}
                            </span>
                          </div>
                          <span className="font-mono text-lg font-bold text-white drop-shadow-md">
                            {constant.toFixed(1)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-1">
                          <span className="text-xs text-gray-400 opacity-80 truncate max-w-[200px]" title={chartInfo.charter}>
                            {chartInfo.charter !== '-' ? chartInfo.charter : '未知谱师'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Notes: {totalNotes}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. 🔥 单曲排行榜模块 */}
              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                  <FaMedal className="text-yellow-500" /> LEADERBOARD
                </h3>

                {/* 排行榜双重控制台 */}
                <div className="bg-gray-900/80 border border-white/5 rounded-2xl p-4 mb-4 shadow-inner">
                  
                  {/* 控制面板 1: 难度切换 */}
                  {!isUtage && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest shrink-0">Diff</span>
                      <div className="flex gap-2 flex-1">
                        {song.ds[2] !== undefined && (
                          <button onClick={() => handleLevelSwitch(2)} className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${boardLevel === 2 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'border-white/5 text-gray-500 hover:text-red-400'}`}>
                            EXPERT
                          </button>
                        )}
                        {song.ds[3] !== undefined && (
                          <button onClick={() => handleLevelSwitch(3)} className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${boardLevel === 3 ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'border-white/5 text-gray-500 hover:text-purple-400'}`}>
                            MASTER
                          </button>
                        )}
                        {song.ds[4] !== undefined && (
                          <button onClick={() => handleLevelSwitch(4)} className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${boardLevel === 4 ? 'bg-purple-300/20 text-purple-200 border-purple-300/50' : 'border-white/5 text-gray-500 hover:text-purple-200'}`}>
                            Re:MAS
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 控制面板 2: 排行榜范围切换 */}
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${boardScope === 'friends' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        {(!currentUser || (currentUser.sponsorTier || 0) < 1) ? <FaLock className="text-gray-500" /> : <FaUserFriends />} 好友
                      </button>
                    </div>
                  </div>
                </div>

                {/* 排行榜列表展示 */}
                <div className="min-h-[200px]">
                  {boardLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <FaSpinner className="animate-spin text-3xl mb-4 text-cyan-400" />
                      <span className="font-mono text-xs tracking-widest font-bold uppercase">Loading Data...</span>
                    </div>
                  ) : boardData.length === 0 ? (
                    <div className="text-center py-16 bg-black/20 border border-white/5 rounded-2xl text-gray-500 font-mono text-xs tracking-widest font-bold">
                      NO RECORDS FOUND
                    </div>
                  ) : (
                    <div className="space-y-2 pb-10">
                      {boardData.map((score, index) => {
                        // 动态计算 DX 星级理论分和评级
                        const chartInfo = song.charts && song.charts[boardLevel];
                        let maxDxScore = 0;
                        if (chartInfo && chartInfo.notes) {
                          maxDxScore = chartInfo.notes.reduce((a, b) => a + b, 0) * 3;
                        }
                        const dxRatio = maxDxScore > 0 ? score.dxScore / maxDxScore : 0;
                        
                        let starCount = 0;
                        if (dxRatio >= 0.97) starCount = 5;
                        else if (dxRatio >= 0.95) starCount = 4;
                        else if (dxRatio >= 0.93) starCount = 3;
                        else if (dxRatio >= 0.90) starCount = 2;
                        else if (dxRatio >= 0.85) starCount = 1;

                        return (
                          <div key={score._id} className="flex items-center bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                            
                            {/* 排名序号 */}
                            <div className={`w-8 text-center font-mono font-black text-lg ${getRankColor(index)}`}>
                              {index + 1}
                            </div>

                            {/* 头像 */}
                            <img src={score.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-10 h-10 rounded-lg object-cover ml-2 mr-3 border border-white/10" />

                            {/* 玩家信息 */}
                            <div className="flex-1 overflow-hidden">
                              <div className="text-white font-bold text-sm truncate flex items-center gap-2">
                                {score.username}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-cyan-400 font-mono font-bold text-sm">
                                  {score.achievement.toFixed(4)}%
                                </span>
                                {score.fcStatus && ['fc', 'fcp', 'ap', 'app'].includes(score.fcStatus) && (
                                  <span className={`text-[9px] font-black text-white px-1 rounded ${score.fcStatus.includes('ap') ? 'bg-yellow-500' : 'bg-pink-500'}`}>
                                    {score.fcStatus.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* DX 分信息与星级 */}
                            <div className="flex items-center gap-2 shrink-0">
                              {starCount > 0 && (
                                <img 
                                  src={`/assets/${starCount}dxstar.png`} 
                                  alt={`DX Star ${starCount}`} 
                                  className="h-[14px] md:h-4 object-contain drop-shadow-md"
                                />
                              )}
                              <div className="text-right flex flex-col items-end">
                                <span className="text-gray-300 font-mono font-bold text-sm">{score.dxScore}</span>
                                <span className="text-gray-500 text-[9px] font-bold uppercase mt-0.5">DX Score</span>
                              </div>
                            </div>
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