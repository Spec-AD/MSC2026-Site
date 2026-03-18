import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaInfoCircle, FaBolt, FaTrophy, FaDatabase, FaChevronLeft, FaKeyboard, FaPaperPlane, FaCheckCircle, FaTimesCircle, FaSkull, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

// ==========================================
// 🧮 Mod 核心元数据与冲突矩阵
// ==========================================
const MOD_DEFINITIONS = [
  { id: 'Tenacity', name: 'Tenacity', type: 'ID', mult: 1.15, desc: '思考时间缩短为30秒。', conflicts: ['Easy', 'Strength'] },
  { id: 'Fear', name: 'Fear', type: 'ID', mult: 1.15, desc: '猜错惩罚加重为30秒。', conflicts: ['Brave', 'Prudence', 'Strength'] },
  { id: 'Prudence', name: 'Prudence', type: 'ID', mult: 1.55, desc: '猜错一次直接失败 (猝死)。', conflicts: ['Fear', 'Strength', 'Brave'] },
  { id: 'Reflection', name: 'Reflection', type: 'ID', mult: 1.30, desc: '开出的字母5秒后变回掩码。', conflicts: ['Puzzle'] },
  { id: 'Perceiver', name: 'Perceiver', type: 'ID', mult: 1.30, desc: '空格也变为掩码。', conflicts: ['Puzzle'] },
  { id: 'Puzzle', name: 'Puzzle', type: 'ID', mult: 1.70, desc: '歌名数字化，隐藏绝对位置。', conflicts: ['Perceiver', 'Reflection'] },
  { id: 'Easy', name: 'Easy', type: 'DD', mult: 0.45, desc: '思考时间延长至120秒。', conflicts: ['Tenacity'] },
  { id: 'Brave', name: 'Brave', type: 'DD', mult: 0.50, desc: '猜错惩罚减轻为5秒。', conflicts: ['Fear', 'Prudence'] },
  { id: 'Lucky', name: 'Lucky', type: 'DD', mult: 0.20, desc: '开局随机赠送少量明文。', conflicts: [] },
  { id: 'Strength', name: 'Strength', type: 'DD', mult: 0.10, desc: '时间结束后仍可继续游戏。', conflicts: ['Prudence', 'Tenacity', 'Fear'] }
];

// ==========================================
// 🎮 实机游玩面板子组件 (PlayBoard)
// ==========================================
const PlayBoard = ({ initialSession, activeMods, onReturn }) => {
  const { addToast } = useToast();
  const [session, setSession] = useState(initialSession);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // 控制台输入状态
  const [charInput, setCharInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [selectedSongIdx, setSelectedSongIdx] = useState(0);
  
  // 交互锁定与结算
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  // 动态基准时间 (用于血条百分比计算)
  const baseTime = useMemo(() => {
    if (activeMods.includes('Tenacity')) return 30000;
    if (activeMods.includes('Easy')) return 120000;
    return 60000;
  }, [activeMods]);

  // 高精度倒计时引擎 (每 50ms 刷新)
  useEffect(() => {
    if (gameResult) return;

    const timer = setInterval(() => {
      const remaining = new Date(session.expireAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, remaining));
      
      // 时间耗尽且无不死 Mod 时，触发结算校验
      if (remaining <= 0 && !activeMods.includes('Strength')) {
        handleGameOverByTimeout();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [session.expireAt, gameResult, activeMods]);

  const handleGameOverByTimeout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/open', { 
        sessionId: session.sessionId, char: ' ' // 发送一个空请求来触发后端的超时结算
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      
      if (res.data.gameOver) {
        setGameResult(res.data.record);
      }
    } catch (err) {
      addToast('结算同步失败', 'error');
    }
    setIsProcessing(false);
  };

  // 1. 发送：开字母请求
  const handleOpenChar = async (e) => {
    e.preventDefault();
    if (!charInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/open', {
        sessionId: session.sessionId,
        char: charInput.trim()[0] // 只取第一个字符
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      if (res.data.gameOver) {
        setGameResult(res.data.record);
      } else {
        setSession(prev => ({ ...prev, expireAt: res.data.expireAt, songs: res.data.songs }));
        setCharInput(''); // 清空输入框
      }
    } catch (err) {
      addToast(err.response?.data?.msg || '操作失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. 发送：猜歌名请求
  const handleGuessSong = async (e) => {
    e.preventDefault();
    if (!guessInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/guess', {
        sessionId: session.sessionId,
        songIndex: selectedSongIdx,
        guess: guessInput.trim()
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      if (res.data.gameOver) {
        setGameResult(res.data.record);
        addToast(res.data.msg || '游戏结束！', res.data.isCorrect ? 'success' : 'error');
      } else {
        setSession(prev => ({ ...prev, expireAt: res.data.expireAt, songs: res.data.songs }));
        setGuessInput('');
        if (res.data.isCorrect) {
          addToast('正确！目标已击破！', 'success');
          // 自动选中下一个未猜出的歌
          const nextIdx = res.data.songs.findIndex(s => s.status === 'PLAYING');
          if (nextIdx !== -1) setSelectedSongIdx(nextIdx);
        } else {
          addToast(res.data.msg || '错误！时间遭到削减！', 'error');
        }
      }
    } catch (err) {
      addToast(err.response?.data?.msg || '校验失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 计算血条比例与颜色
  const timePercent = Math.min(100, (timeLeft / baseTime) * 100);
  const timeColor = timePercent > 50 ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 
                    timePercent > 20 ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 
                    'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';

  // 渲染结算模态框
  if (gameResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-10">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#15151e]/90 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl max-w-2xl w-full text-center">
          <FaTrophy className="text-6xl text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
          <h2 className="text-3xl font-black text-white mb-2 tracking-widest">DECODE COMPLETE</h2>
          <p className="text-zinc-400 font-bold mb-8">Your OV</p>
          
          <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-purple-500 mb-10 drop-shadow-lg">
            {gameResult.totalOv.toFixed(2)}
          </div>

          <div className="space-y-3 mb-8 text-left">
            {gameResult.songs.map((song, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-black/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 overflow-hidden">
                  {song.isCleared ? <FaCheckCircle className="text-emerald-400 shrink-0"/> : <FaTimesCircle className="text-rose-500 shrink-0"/>}
                  <span className="font-bold text-sm text-zinc-300 truncate">{song.title}</span>
                </div>
                <div className="flex gap-4 shrink-0 font-mono text-xs text-zinc-500">
                  <span>Miss: {song.mistakes}</span>
                  <span className={song.isCleared ? "text-cyan-400 font-bold" : ""}>+{song.actualOv.toFixed(2)} OV</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onReturn} className="px-10 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest transition-all">
            回到大厅
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 max-w-5xl mx-auto h-full pb-10" style={{ fontFamily: "'Quicksand', sans-serif" }}>
      
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-end">
        <button onClick={onReturn} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
          <FaChevronLeft /> FORFEIT
        </button>
        <div className="text-right">
          <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-1">Active Mods</div>
          <div className="flex gap-2 justify-end">
            {activeMods.length === 0 ? <span className="text-xs text-zinc-600 font-bold">NOMOD</span> : 
              activeMods.map(mod => <span key={mod} className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-black">{mod}</span>)
            }
          </div>
        </div>
      </div>

      {/* 核心对局区 */}
      <div className="bg-[#15151e]/80 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
        
        {/* 血条 (时间) */}
        <div className="w-full h-2 bg-black/50 relative">
          <div className={`h-full transition-all duration-75 ease-linear ${timeColor}`} style={{ width: `${timePercent}%` }}></div>
        </div>
        <div className="px-6 pt-3 pb-2 flex justify-between items-center bg-black/20">
          <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">System Timer</span>
          <span className={`font-mono text-xl font-black ${timeLeft < 10000 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
            {(timeLeft / 1000).toFixed(2)}s
          </span>
        </div>

        {/* 曲目列表 */}
        <div className="p-6 space-y-3">
          {session.songs.map((song, i) => {
            const isSelected = selectedSongIdx === i;
            const isCleared = song.status === 'CLEARED';
            const isDead = song.status === 'DEAD';
            
            return (
              <div 
                key={i} 
                onClick={() => !isCleared && !isDead && setSelectedSongIdx(i)}
                className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group
                  ${isCleared ? 'bg-emerald-500/10 border-emerald-500/30' : 
                    isDead ? 'bg-black/40 border-white/5 opacity-50 grayscale' : 
                    isSelected ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 
                    'bg-black/30 border-white/5 hover:border-white/20'}
                `}
              >
                {/* 背景发光 */}
                {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none"></div>}
                
                <div className="flex items-center gap-4 z-10 overflow-hidden">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm
                    ${isCleared ? 'bg-emerald-500 text-black' : isDead ? 'bg-zinc-800 text-zinc-500' : isSelected ? 'bg-cyan-500 text-black' : 'bg-white/10 text-zinc-400'}
                  `}>
                    {isCleared ? <FaCheckCircle /> : isDead ? <FaSkull /> : `0${i+1}`}
                  </div>
                  <span className={`text-xl md:text-2xl font-mono tracking-[0.2em] font-bold truncate drop-shadow-md transition-all
                    ${isCleared ? 'text-emerald-300' : isDead ? 'text-zinc-600' : 'text-white'}
                  `}>
                    {song.maskedTitle}
                  </span>
                </div>

                {isCleared && <span className="font-black text-emerald-400 text-sm z-10 shrink-0">+{song.actualOv?.toFixed(2)} OV</span>}
              </div>
            );
          })}
        </div>

        {/* 控制台 (Console) */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/5 bg-black/40 p-6 gap-6">
          
          {/* 左侧：开字母 */}
          <form onSubmit={handleOpenChar} className="flex flex-col gap-2 relative">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><FaKeyboard/> Open Character</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                maxLength={1}
                value={charInput}
                onChange={e => setCharInput(e.target.value)}
                placeholder="A"
                disabled={isProcessing || activeMods.includes('Strength') && timeLeft <= 0 && false} // 简易防抖
                className="w-16 h-12 bg-[#0c0c11] border border-white/10 rounded-xl text-center text-2xl font-black text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
              />
              <button 
                type="submit" disabled={isProcessing || !charInput}
                className="flex-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                开码
              </button>
            </div>
            {activeMods.includes('Reflection') && <span className="absolute -bottom-5 left-0 text-[9px] text-purple-400 font-bold">* Reflection Active: Decays in 5s</span>}
          </form>

          {/* 右侧：猜歌名 */}
          <form onSubmit={handleGuessSong} className="md:col-span-2 flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><FaPaperPlane/> Guess Title (Target: 0{selectedSongIdx+1})</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={guessInput}
                onChange={e => setGuessInput(e.target.value)}
                placeholder="Enter full track title..."
                disabled={isProcessing || session.songs[selectedSongIdx]?.status !== 'PLAYING'}
                className="flex-1 h-12 px-4 bg-[#0c0c11] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button 
                type="submit" disabled={isProcessing || !guessInput || session.songs[selectedSongIdx]?.status !== 'PLAYING'}
                className="px-6 bg-purple-500 text-white rounded-xl font-black tracking-widest hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                提交
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};


// ==========================================
// 🚀 主组件：大厅与 Mod 控制台
// ==========================================
export default function LetterGame() {
  const { addToast } = useToast();
  
  const [gameState, setGameState] = useState('lobby'); 
  const [selectedGame, setSelectedGame] = useState('arcaea');
  const [activeMods, setActiveMods] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionData, setSessionData] = useState(null); 

  const handleModToggle = (modId) => {
    setActiveMods(prev => {
      let newMods = [...prev];
      const targetMod = MOD_DEFINITIONS.find(m => m.id === modId);

      if (newMods.includes(modId)) {
        newMods = newMods.filter(m => m !== modId);
      } else {
        newMods = newMods.filter(m => !targetMod.conflicts.includes(m));
        newMods = newMods.filter(existingModId => {
          const eMod = MOD_DEFINITIONS.find(m => m.id === existingModId);
          return !eMod.conflicts.includes(modId);
        });
        newMods.push(modId);
      }

      // 彩蛋：Tenacity + Fear = Prudence
      if (newMods.includes('Tenacity') && newMods.includes('Fear')) {
        addToast('Tenacity 与 Fear 产生共鸣，升华为 Prudence！', 'info');
        newMods = newMods.filter(m => m !== 'Tenacity' && m !== 'Fear');
        const prudenceMod = MOD_DEFINITIONS.find(m => m.id === 'Prudence');
        newMods = newMods.filter(m => !prudenceMod.conflicts.includes(m));
        if (!newMods.includes('Prudence')) newMods.push('Prudence');
      }

      return newMods;
    });
  };

  const totalMultiplier = useMemo(() => {
    let mult = 1.0;
    activeMods.forEach(modId => {
      const mod = MOD_DEFINITIONS.find(m => m.id === modId);
      if (mod) mult *= mod.mult;
    });
    return mult;
  }, [activeMods]);

  const startGame = async () => {
    setIsStarting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/start', {
        gameType: selectedGame,
        mods: activeMods
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      setSessionData(res.data);
      addToast('对局生成成功，祝你好运！', 'success');
      setGameState('playing');
    } catch (err) {
      addToast(err.response?.data?.msg || '无法连接到游戏服务器', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  // --- 大厅渲染 ---
  if (gameState === 'lobby') {
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 flex flex-col items-center justify-center p-6 selection:bg-purple-500/30" style={{ fontFamily: "'Quicksand', sans-serif" }}>
        
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <div className="absolute w-[60vw] h-[60vw] bg-purple-900/10 rounded-full blur-[150px] mix-blend-screen"></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl flex flex-col gap-8 mt-10">
          
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-tighter">
              开字母
            </h1>
            <p className="text-zinc-500 font-medium tracking-widest text-sm uppercase">挑战你的曲库极限</p>
          </div>

          <div className="bg-[#15151e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-8">
            
            <div className="flex-1 flex flex-col gap-6 md:border-r border-white/5 md:pr-8">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FaDatabase className="text-purple-400"/> Select Target
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {['arcaea', 'maimai', 'chunithm'].map(game => (
                    <button 
                      key={game}
                      onClick={() => setSelectedGame(game)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none ${
                        selectedGame === game 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                        : 'bg-black/20 text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-black/40'
                      }`}
                    >
                      {game.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 p-5 flex flex-col justify-center items-center relative overflow-hidden group min-h-[160px]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <FaTrophy className="text-4xl text-purple-500/30 mb-3" />
                <div className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Estimated Multiplier</div>
                <div className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all">
                  {totalMultiplier.toFixed(2)}<span className="text-2xl text-purple-400 ml-1">x</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-4 text-center max-w-[80%]">
                  OV 获取倍率
                </p>
              </div>

              <button 
                onClick={startGame}
                disabled={isStarting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-lg tracking-widest hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-1 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? <FaSpinner className="animate-spin" /> : <FaPlay className="text-sm" />}
                {isStarting ? '初始化......' : '开始开字母'}
              </button>
            </div>

            <div className="flex-[1.8] flex flex-col">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FaBolt className="text-yellow-400"/> MODS
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {MOD_DEFINITIONS.map(mod => {
                    const isActive = activeMods.includes(mod.id);
                    const isID = mod.type === 'ID'; 
                    
                    return (
                      <motion.div 
                        key={mod.id} layout onClick={() => handleModToggle(mod.id)}
                        className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col gap-1 overflow-hidden group
                          ${isActive 
                            ? (isID ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]') 
                            : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/10'
                          }
                        `}
                      >
                        <div className="flex justify-between items-center z-10">
                          <span className={`font-black text-sm tracking-wide ${isActive ? (isID ? 'text-rose-400' : 'text-cyan-400') : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                            {mod.name}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 ${isID ? 'text-rose-300' : 'text-cyan-300'}`}>
                            {mod.mult.toFixed(2)}x
                          </span>
                        </div>
                        <p className={`text-[9px] leading-tight z-10 mt-1 ${isActive ? 'text-zinc-300' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                          {mod.desc}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="mt-auto pt-6 flex items-start gap-3 text-xs text-zinc-500 bg-white/[0.02] p-4 rounded-xl border border-white/[0.02]">
                <FaInfoCircle className="text-purple-400 shrink-0 mt-0.5 text-base" />
                <p className="leading-relaxed">
                  单击以应用模组。<br/>
                  一些特定模组 (像 <span className="text-zinc-300">Tenacity</span> 和 <span className="text-zinc-300">Easy</span>) 是互相排斥的，不能同时应用。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 实机对战渲染 ---
  return (
    <PlayBoard 
      initialSession={sessionData} 
      activeMods={activeMods} 
      onReturn={() => {
        setGameState('lobby');
        setSessionData(null);
      }} 
    />
  );
}