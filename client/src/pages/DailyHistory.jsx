import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaCompactDisc, FaSpinner, FaMusic } from 'react-icons/fa';

const DailyHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/daily-song/history');
        setHistory(res.data);
      } catch (err) {
        console.error('获取历史推荐失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative pb-24 overflow-x-hidden">
      
      {/* 沉浸式背景光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10 pt-24 md:pt-32">
        
        {/* 头部导航区 */}
        <div className="flex flex-col gap-6 mb-12 border-b border-white/[0.05] pb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95"
          >
            <FaArrowLeft className="text-xs" /> 返回主页
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <FaCompactDisc className="animate-[spin_4s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight mb-2">往期推荐</h1>
              <p className="text-sm text-zinc-500 font-medium">回顾每一首歌曲，沉淀社区的共同记忆。</p>
            </div>
          </div>
        </div>

        {/* 列表内容区 */}
        {loading ? (
          <div className="flex justify-center py-32">
            <FaSpinner className="animate-spin text-4xl text-indigo-500/50" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center bg-[#15151e]/40 border border-white/[0.05] rounded-[3rem]">
            <FaMusic className="text-5xl text-zinc-800 mb-4 opacity-20" />
            <p className="text-zinc-500 font-medium tracking-wide">时光机里空空如也，还没有历史记录哦</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {history.map((song, index) => (
                <motion.div 
                  key={song._id || index}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-5 bg-[#15151e] border border-white/[0.05] p-5 rounded-3xl hover:bg-[#1a1a24] hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-lg"
                >
                  {/* 封面 */}
                  <img 
                    src={song.coverUrl} 
                    alt="cover" 
                    className="w-20 h-20 rounded-2xl object-cover border border-white/5 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-md" 
                    onError={(e) => { e.target.src = '/assets/bg.png'; }}
                  />
                  
                  {/* 信息 */}
                  <div className="flex flex-col flex-1 min-w-0 justify-center">
                    <span 
                      className="text-xs text-indigo-400 font-bold mb-1.5 tracking-widest uppercase flex items-center gap-2"
                      style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {song.dateKey}
                    </span>
                    <span className="text-lg font-bold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors mb-0.5">
                      {song.title}
                    </span>
                    <span className="text-sm text-zinc-500 truncate">
                      {song.artist}
                    </span>
                  </div>

                  {/* 出处 Tag */}
                  <div className="shrink-0 hidden sm:flex flex-col items-end pl-4 border-l border-white/[0.05]">
                    <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase bg-white/[0.03] border border-white/5 px-2.5 py-1.5 rounded-xl">
                      {song.source}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
};


export default DailyHistory;
