import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FaPlay, FaInfoCircle, FaBolt, FaTrophy, FaDatabase, FaChevronLeft, 
  FaKeyboard, FaPaperPlane, FaCheckCircle, FaTimesCircle, FaSkull, 
  FaSpinner, FaExclamationTriangle, FaStar, FaGamepad, FaMap, FaCrown, FaUsers
} from 'react-icons/fa';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

// ==========================================
// 🧮 挑战模组数据
// ==========================================
const MOD_DEFINITIONS = [
  { id: 'Tenacity', name: 'Tenacity', type: 'ID', mult: 1.15, desc: '倒计时上限为 30 秒。', conflicts: ['Easy', 'Strength'] },
  { id: 'Fear', name: 'Fear', type: 'ID', mult: 1.15, desc: '失误惩罚加倍，扣除 30 秒。', conflicts: ['Brave', 'Prudence', 'Strength'] },
  { id: 'Prudence', name: 'Prudence', type: 'ID', mult: 1.55, desc: '猜错一次直接失败。', conflicts: ['Fear', 'Strength', 'Brave'] },
  { id: 'Reflection', name: 'Reflection', type: 'ID', mult: 1.30, desc: '已被开出的字母 5 秒后将再次遮蔽。', conflicts: ['Puzzle'] },
  { id: 'Perceiver', name: 'Perceiver', type: 'ID', mult: 1.30, desc: '隐藏空格。', conflicts: ['Puzzle'] },
  { id: 'Puzzle', name: 'Puzzle', type: 'ID', mult: 1.70, desc: '曲名完全数字化，仅显示剩余字母数量。', conflicts: ['Perceiver', 'Reflection'] },
  { id: 'Easy', name: 'Easy', type: 'DD', mult: 0.45, desc: '倒计时上限延长至 120 秒。', conflicts: ['Tenacity'] },
  { id: 'Brave', name: 'Brave', type: 'DD', mult: 0.50, desc: '失误惩罚减轻为扣除 5 秒。', conflicts: ['Fear', 'Prudence'] },
  { id: 'Lucky', name: 'Lucky', type: 'DD', mult: 0.20, desc: '行动开始时自动开出少量字符。', conflicts: [] },
  { id: 'Strength', name: 'Strength', type: 'DD', mult: 0.10, desc: '即使时间耗尽，游戏依然可以继续。', conflicts: ['Prudence', 'Tenacity', 'Fear'] }
];

// ==========================================
// 🎮 实机对战面板 (PlayBoard)
// ==========================================
const PlayBoard = ({ initialSession, activeMods, onReturn }) => {
  const { addToast } = useToast();
  const [session, setSession] = useState(initialSession);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [charInput, setCharInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [selectedSongIdx, setSelectedSongIdx] = useState(0);
  const [usedChars, setUsedChars] = useState(initialSession?.openedChars || []);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [showAbortModal, setShowAbortModal] = useState(false);

  const baseTime = useMemo(() => {
    if (activeMods.includes('Tenacity')) return 30000;
    if (activeMods.includes('Easy')) return 120000;
    return 60000;
  }, [activeMods]);

  const timeoutFired = useRef(false);

  useEffect(() => {
    if (gameResult || showAbortModal) return;
    const timer = setInterval(() => {
      const remaining = new Date(session.expireAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, remaining));
      
      if (remaining > 0) timeoutFired.current = false;
      
      if (remaining <= 0 && !activeMods.includes('Strength')) {
        if (!timeoutFired.current) {
          timeoutFired.current = true;
          handleGameOverByTimeout();
        }
      }
    }, 50);
    return () => clearInterval(timer);
  }, [session.expireAt, gameResult, activeMods, showAbortModal]);

  const handleGameOverByTimeout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/open', { sessionId: session.sessionId, char: ' ' }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.data.gameOver) setGameResult(res.data);
    } catch (err) { addToast('结算同步失败', 'error'); }
    setIsProcessing(false);
  };

  const handleAbort = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/abort', { sessionId: session.sessionId }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setShowAbortModal(false);
      setGameResult(res.data);
      addToast('已终止', 'error');
    } catch (err) { addToast('终止游戏失败', 'error'); }
    setIsProcessing(false);
  };

  const handleOpenChar = async (e) => {
    e.preventDefault();
    if (!charInput.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const targetChar = charInput.trim()[0].toUpperCase();
      const res = await axios.post('/api/letter-game/open', { sessionId: session.sessionId, char: targetChar }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      if (res.data.gameOver) {
        setGameResult(res.data);
      } else {
        setSession(prev => ({ ...prev, expireAt: res.data.expireAt, songs: res.data.songs }));
        if (!usedChars.includes(targetChar)) setUsedChars([...usedChars, targetChar]);
        setCharInput(''); 
      }
    } catch (err) { addToast(err.response?.data?.msg || '操作异常', 'error'); } 
    finally { setIsProcessing(false); }
  };

  const handleGuessSong = async (e) => {
    e.preventDefault();
    if (!guessInput.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/letter-game/guess', { sessionId: session.sessionId, songIndex: selectedSongIdx, guess: guessInput.trim() }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      if (res.data.gameOver) {
        setGameResult(res.data);
        addToast(res.data.msg || '游戏结束！', res.data.isCorrect ? 'success' : 'error');
      } else {
        setSession(prev => ({ ...prev, expireAt: res.data.expireAt, songs: res.data.songs }));
        setGuessInput('');
        if (res.data.isCorrect) {
          addToast('正确！', 'success');
          const nextIdx = res.data.songs.findIndex(s => s.status === 'PLAYING');
          if (nextIdx !== -1) setSelectedSongIdx(nextIdx);
        } else {
          addToast(res.data.msg || '失败!', 'error');
        }
      }
    } catch (err) { addToast(err.response?.data?.msg || '网络异常', 'error'); } 
    finally { setIsProcessing(false); }
  };

  const timePercent = Math.min(100, (timeLeft / baseTime) * 100);
  const timeColor = timePercent > 50 ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : timePercent > 20 ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';

  if (gameResult) {
    const record = gameResult.record || gameResult; 
    const oldStats = gameResult.oldStats || {};
    const newStats = gameResult.newStats || {};
    const timeUsed = gameResult.timeUsed || 0;
    
    const diffOv = (newStats.totalOv || 0) - (oldStats.totalOv || 0);
    const diffAcc = ((newStats.accuracy || 0) - (oldStats.accuracy || 0)) * 100;
    const diffCons = ((newStats.conservativeness || 0) - (oldStats.conservativeness || 0)) * 100;

    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-10 px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#15151e]/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col items-center">
          <FaTrophy className="text-6xl text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
          <h2 className="text-3xl font-black text-white mb-1 tracking-widest uppercase">{record.isFullCombo ? '通过 (CLEARED)' : '失败 (CONCLUDED)'}</h2>
          <p className="text-zinc-400 font-bold mb-6 flex items-center gap-2">
            <FaStar className="text-amber-400"/> 最终评级: {session.starRating || '?'} 星
          </p>
          
          <div className="grid grid-cols-3 w-full gap-4 mb-8">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">OV</span>
               <span className="text-2xl font-black text-purple-400">{(newStats.totalOv || 0).toFixed(2)}</span>
               <span className={`text-xs font-bold mt-1 ${diffOv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{diffOv >= 0 ? '+' : ''}{diffOv.toFixed(2)} {diffOv >= 0 ? '▲' : '▼'}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">精准度 ACC</span>
               <span className="text-2xl font-black text-cyan-400">{((newStats.accuracy || 0)*100).toFixed(1)}%</span>
               <span className={`text-xs font-bold mt-1 ${diffAcc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{diffAcc >= 0 ? '+' : ''}{diffAcc.toFixed(1)}% {diffAcc >= 0 ? '▲' : '▼'}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">保守度 (CONS)</span>
               <span className="text-2xl font-black text-amber-400">{((newStats.conservativeness || 0)*100).toFixed(1)}%</span>
               <span className={`text-xs font-bold mt-1 ${diffCons >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{diffCons >= 0 ? '+' : ''}{diffCons.toFixed(1)}% {diffCons >= 0 ? '▲' : '▼'}</span>
            </div>
          </div>

          <div className="w-full text-left bg-black/20 p-4 rounded-xl mb-8 flex justify-between items-center border border-white/5">
             <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">总用时</span>
             <span className="font-mono text-lg text-white font-black">{(timeUsed / 1000).toFixed(2)}s</span>
          </div>

          <div className="space-y-3 w-full mb-8 text-left">
            {record.songs.map((song, i) => (
              <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${song.isCleared ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  {song.isCleared ? <FaCheckCircle className="text-emerald-400 shrink-0"/> : <FaTimesCircle className="text-rose-500 shrink-0"/>}
                  <span className={`font-bold text-sm truncate ${song.isCleared ? 'text-emerald-100' : 'text-rose-100'}`}>{song.title}</span>
                </div>
                <div className="flex gap-4 shrink-0 font-mono text-xs text-zinc-400 items-center">
                  <span>失误: <span className={song.mistakes > 0 ? "text-rose-400" : ""}>{song.mistakes}</span></span>
                  <span className={`font-bold w-20 text-right ${song.isCleared ? "text-emerald-400" : "text-zinc-600"}`}>+{song.actualOv.toFixed(1)} OV</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onReturn} className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black tracking-widest transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)]">
            返回大厅
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 max-w-6xl mx-auto h-full pb-10" style={{ fontFamily: "'Quicksand', sans-serif" }}>
      
      {/* 二次确认退出 Modal */}
      <AnimatePresence>
        {showAbortModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1010] border border-rose-500/30 p-8 rounded-3xl max-w-md w-full shadow-[0_0_40px_rgba(225,29,72,0.2)] text-center">
              <FaExclamationTriangle className="text-5xl text-rose-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-rose-100 mb-2">终止本次游戏？</h2>
              <p className="text-sm text-rose-400/80 mb-8 font-medium">中途放弃将立即判定为失败，所有未破译的曲目将计为 0 分，并会对你的全局准确率造成影响。</p>
              <div className="flex gap-4">
                <button onClick={() => setShowAbortModal(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">继续作战</button>
                <button onClick={handleAbort} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black transition-colors shadow-lg shadow-rose-600/30">确认放弃</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 顶部状态栏 */}
      <div className="flex justify-between items-end mt-4">
        <button onClick={() => setShowAbortModal(true)} className="text-rose-500/80 hover:text-rose-400 flex items-center gap-2 text-sm font-bold transition-colors bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 shadow-sm active:scale-95">
          <FaChevronLeft /> 中止
        </button>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 mb-1">
             <FaStar className="text-amber-400"/>
             <span className="font-bold text-amber-400 tracking-widest">{session.starRating || '?'} 星级考核</span>
          </div>
          <div className="flex gap-2 justify-end">
            {activeMods.length === 0 ? <span className="text-xs text-zinc-600 font-bold">无附加模组</span> : 
              activeMods.map(mod => <span key={mod} className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-black">{mod}</span>)
            }
          </div>
        </div>
      </div>

      {/* 核心对局区 */}
      <div className="bg-[#15151e]/80 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
        
        <div className="w-full h-2 bg-black/50 relative">
          <div className={`h-full transition-all duration-75 ease-linear ${timeColor}`} style={{ width: `${timePercent}%` }}></div>
        </div>
        <div className="px-6 pt-3 pb-2 flex justify-between items-center bg-black/20">
          <span className="text-xs font-bold text-zinc-500 tracking-widest">倒计时</span>
          <span className={`font-mono text-xl font-black ${timeLeft < 10000 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
            {(timeLeft / 1000).toFixed(2)}s
          </span>
        </div>

        <div className="p-6 space-y-3">
          {session.songs.map((song, i) => {
            const isSelected = selectedSongIdx === i;
            const isCleared = song.status === 'CLEARED';
            const isDead = song.status === 'DEAD';
            
            return (
              <div 
                key={i} onClick={() => !isCleared && !isDead && setSelectedSongIdx(i)}
                className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group
                  ${isCleared ? 'bg-emerald-500/10 border-emerald-500/30' : isDead ? 'bg-black/40 border-white/5 opacity-50 grayscale' : isSelected ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-black/30 border-white/5 hover:border-white/20'}
                `}
              >
                {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none"></div>}
                
                <div className="flex items-center gap-4 z-10 overflow-hidden w-full pr-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm
                    ${isCleared ? 'bg-emerald-500 text-black' : isDead ? 'bg-zinc-800 text-zinc-500' : isSelected ? 'bg-cyan-500 text-black' : 'bg-white/10 text-zinc-400'}
                  `}>
                    {isCleared ? <FaCheckCircle /> : isDead ? <FaSkull /> : `0${i+1}`}
                  </div>
                  
                  <div className="flex flex-col overflow-hidden w-full">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl md:text-2xl font-mono tracking-[0.2em] font-bold truncate drop-shadow-md transition-all ${isCleared ? 'text-emerald-300' : isDead ? 'text-zinc-600' : 'text-white'}`}>
                        {song.maskedTitle}
                      </span>
                      
                      {!isCleared && (
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          {song.hasKanji && <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-bold uppercase tracking-widest shadow-sm">汉字</span>}
                          {song.hasKana && <span className="text-[9px] px-1.5 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded font-bold uppercase tracking-widest shadow-sm">假名</span>}
                          {song.hasSym && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold uppercase tracking-widest shadow-sm">符号</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isCleared && <span className="font-black text-emerald-400 text-sm z-10 shrink-0">+{song.actualOv?.toFixed(2)} OV</span>}
              </div>
            );
          })}
        </div>

        {/* 控制台与历史记录 */}
        <div className="flex flex-col border-t border-white/5 bg-black/40 p-6 gap-6">
          <div className="flex items-center gap-3 w-full bg-black/30 p-3 rounded-xl border border-white/5">
             <span className="text-xs font-bold text-zinc-500 tracking-widest shrink-0 whitespace-nowrap">已解决题目 :</span>
             <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {usedChars.length === 0 ? <span className="text-xs text-zinc-600 italic">尚未解决任何题目</span> : 
                  usedChars.map((c, idx) => (
                    <span key={idx} className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-xs rounded shadow-sm">
                      {c}
                    </span>
                  ))
                }
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <form onSubmit={handleOpenChar} className="flex flex-col gap-2 relative">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><FaKeyboard/> 开字母</label>
              <div className="flex gap-2">
                <input 
                  type="text" maxLength={1} value={charInput} onChange={e => setCharInput(e.target.value)} placeholder="A"
                  disabled={isProcessing || activeMods.includes('Strength') && timeLeft <= 0 && false}
                  className="w-16 h-12 bg-[#0c0c11] border border-white/10 rounded-xl text-center text-2xl font-black text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                />
                <button 
                  type="submit" disabled={isProcessing || !charInput}
                  className="flex-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  解码
                </button>
              </div>
            </form>

            <form onSubmit={handleGuessSong} className="md:col-span-2 flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><FaPaperPlane/> 输入 (目标歌曲: 0{selectedSongIdx+1})</label>
              <div className="flex gap-2">
                <input 
                  type="text" value={guessInput} onChange={e => setGuessInput(e.target.value)} placeholder="输入完整曲名"
                  disabled={isProcessing || session.songs[selectedSongIdx]?.status !== 'PLAYING'}
                  className="flex-1 h-12 px-4 bg-[#0c0c11] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button 
                  type="submit" disabled={isProcessing || !guessInput || session.songs[selectedSongIdx]?.status !== 'PLAYING'}
                  className="px-8 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black tracking-widest hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 🚀 主组件：独立游戏模式 Hub (全新大厅架构)
// ==========================================
export default function LetterGame() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gameState, setGameState] = useState('lobby'); 
  const [lobbyMode, setLobbyMode] = useState('classic'); // 导航：classic, course, ranked, custom
  
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

      if (newMods.includes('Tenacity') && newMods.includes('Fear')) {
        addToast('已替换为效果相同的 MOD', 'info');
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
        gameType: selectedGame, mods: activeMods
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      setSessionData(res.data);
      addToast('开始游戏！', 'success');
      setGameState('playing');
    } catch (err) { 
      addToast(err.response?.data?.msg || '出现了一点错误......', 'error'); 
    } finally { 
      setIsStarting(false); 
    }
  };

  // --- 独立大厅渲染 ---
  if (gameState === 'lobby') {
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 flex flex-col font-sans selection:bg-purple-500/30 relative">
        
        {/* 环境光晕 */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <div className="absolute w-[80vw] h-[80vw] bg-purple-900/10 rounded-full blur-[150px] mix-blend-screen opacity-60"></div>
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[150px] mix-blend-screen"></div>
        </div>

        {/* 顶部标题栏 */}
        <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6 relative z-10 flex justify-between items-end border-b border-white/[0.05]">
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-tighter drop-shadow-md">
              开字母
            </h1>
            <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase mt-2">PureBeat Intelligence Hub 2.0</p>
          </div>
          {user && (
            <button 
              onClick={() => navigate(`/profile/${user.username}/decode`)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <FaTrophy /> 个人数据档案
            </button>
          )}
        </div>

        {/* 核心两栏排版 */}
        <div className="w-full max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col lg:flex-row gap-8">
          
          {/* 左侧：专业导航面板 */}
          <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-1">Select Directive</div>
            
            <button onClick={() => setLobbyMode('classic')} className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${lobbyMode === 'classic' ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-[#15151e] border border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
              <FaGamepad className="text-xl" /> 经典游戏
            </button>
            <button onClick={() => setLobbyMode('course')} className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${lobbyMode === 'course' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-[#15151e] border border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
              <FaMap className="text-xl" /> 难度考核
            </button>
            <button onClick={() => setLobbyMode('ranked')} className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${lobbyMode === 'ranked' ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'bg-[#15151e] border border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
              <FaCrown className="text-xl" /> 段位排位
            </button>
            <button onClick={() => setLobbyMode('custom')} className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${lobbyMode === 'custom' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-[#15151e] border border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
              <FaUsers className="text-xl" /> 玩家自制关卡
            </button>
          </div>

          {/* 右侧：行动配置台 */}
          <div className="flex-1 bg-[#15151e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl min-h-[500px]">
            
            {lobbyMode === 'classic' && (
              <div className="flex flex-col md:flex-row gap-8 h-full">
                {/* 经典模式：左半边配置 */}
                <div className="flex-1 flex flex-col gap-6 md:border-r border-white/5 md:pr-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
                      <FaDatabase className="text-purple-400"/> 曲目池
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                      {[{id:'arcaea', label:'Arcaea'}, {id:'maimai', label:'舞萌 DX'}, {id:'chunithm', label:'CHUNITHM'}].map(game => (
                        <button 
                          key={game.id} onClick={() => setSelectedGame(game.id)}
                          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none ${
                            selectedGame === game.id 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                            : 'bg-black/40 text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          {game.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 p-6 flex flex-col justify-center items-center relative overflow-hidden group min-h-[160px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <FaStar className="text-4xl text-amber-500/30 mb-3" />
                    <div className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">预计星级</div>
                    <div className="text-4xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all">
                      ~{(5.0 * totalMultiplier).toFixed(2)}<span className="text-xl text-amber-500/50 ml-1">★</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-4 text-center max-w-[85%]">
                      选择MOD可以降低或提高游戏难度。
                    </p>
                  </div>

                  <button 
                    onClick={startGame} disabled={isStarting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-black text-lg tracking-widest hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-1 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStarting ? <FaSpinner className="animate-spin" /> : <FaPlay className="text-sm" />}
                    {isStarting ? '初始化...' : '开始游戏'}
                  </button>
                </div>

                {/* 经典模式：右半边 Mod 矩阵 */}
                <div className="flex-[1.5] flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
                    <FaBolt className="text-yellow-400"/> 装备挑战模组 (MODS)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
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
                                : 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/10'
                              }
                            `}
                          >
                            <div className="flex justify-between items-center z-10">
                              <span className={`font-bold text-sm tracking-wide ${isActive ? (isID ? 'text-rose-400' : 'text-cyan-400') : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                {mod.name}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/50 ${isID ? 'text-rose-300' : 'text-cyan-300'}`}>
                                {mod.mult.toFixed(2)}x
                              </span>
                            </div>
                            <p className={`text-[10px] leading-relaxed z-10 mt-1 ${isActive ? 'text-zinc-300' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                              {mod.desc}
                            </p>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {/* 其它 WIP 面板的绝美占位符 */}
            {lobbyMode !== 'classic' && (
              <div className="w-full h-full flex flex-col items-center justify-center py-20 text-center">
                <FaCrown className="text-7xl text-zinc-800 mb-6" />
                <h2 className="text-2xl font-black text-zinc-300 mb-2">制作中......</h2>
                <p className="text-zinc-500 font-medium">更多功能敬请期待</p>
                <button onClick={() => setLobbyMode('classic')} className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all text-sm">返回经典探测</button>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <PlayBoard 
      initialSession={sessionData} activeMods={activeMods} 
      onReturn={() => { setGameState('lobby'); setSessionData(null); }} 
    />
  );
}