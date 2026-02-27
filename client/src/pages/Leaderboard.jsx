import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaCrown, FaMedal, FaSpinner, FaFireAlt } from 'react-icons/fa';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get('/api/leaderboard/pf');
        setPlayers(res.data);
      } catch (err) {
        console.error('获取排行榜失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRatingColor = (rating) => {
    const r = Number(rating) || 0;
    if (r >= 16500) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 via-yellow-400 via-green-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'; // 发光彩色
    if (r >= 16000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 drop-shadow-[0_0_10px_rgba(103,232,249,0.6)]'; // 钻石色 (有渐变)
    if (r >= 15000) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'; // 金色
    if (r >= 13000) return 'text-purple-400'; // 紫色
    if (r >= 10000) return 'text-blue-400'; // 蓝色
    return 'text-[#cd7f32]'; // 铜色/棕色 (0 - 9999)
  };

  const getPfColor = (pf) => {
    const p = Number(pf) || 0;
    if (p >= 42000) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 via-yellow-400 via-green-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'; // 发光彩色
    if (p >= 35000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 drop-shadow-[0_0_10px_rgba(103,232,249,0.6)]'; // 钻石色 (有渐变)
    if (p >= 30000) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'; // 金色
    if (p >= 20000) return 'text-purple-400'; // 紫色
    if (p >= 15000) return 'text-blue-400'; // 蓝色
    return 'text-[#cd7f32]'; // 铜色/棕色
  };

  const textClipFix = "pb-1 leading-tight";

  const renderRankBadge = (index) => {
    if (index === 0) return <FaCrown className="text-3xl text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />;
    if (index === 1) return <FaMedal className="text-3xl text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)]" />;
    if (index === 2) return <FaMedal className="text-3xl text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]" />;
    return <span className="text-xl md:text-2xl font-mono font-bold text-gray-500">{index + 1}</span>;
  };

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-5xl mx-auto pt-24">
      
      <div className="mb-12 border-b border-white/10 pb-8 text-center md:text-left">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg flex items-center justify-center md:justify-start gap-4">
          <FaFireAlt className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]" />
          GLOBAL RANKING.
        </h1>
        <p className="text-gray-400 font-mono text-sm tracking-[0.2em] uppercase mt-4">
          Purebeat Performance Top 100 Players
        </p>
      </div>

      {loading ? (
        <div className="py-32 flex justify-center"><FaSpinner className="animate-spin text-5xl text-orange-500" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="hidden md:flex items-center px-6 py-3 text-xs font-bold tracking-widest text-gray-500 uppercase border-b border-white/5">
            <div className="w-20 text-center">Rank</div>
            <div className="flex-1">Player</div>
            <div className="w-32 text-center">DX Rating</div>
            <div className="w-40 text-right pr-4">Performance</div>
          </div>

          {players.map((player, index) => {
            const isTop3 = index < 3;
            // 🔥 根据隐私开关判断 Rating 是否可见
            const isRatingVisible = player.isB50Visible === true; 
            
            return (
              <motion.div 
                key={player._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => navigate(`/profile/${player.username}`)}
                className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-300 group
                  ${isTop3 ? 'bg-gradient-to-r from-white/10 to-transparent border border-white/20 hover:border-orange-500/50 hover:bg-white/10' : 'bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/20'}
                `}
              >
                <div className="w-12 md:w-20 flex justify-center shrink-0">
                  {renderRankBadge(index)}
                </div>

                <div className="flex-1 flex items-center gap-4 overflow-hidden">
                  <img 
                    src={player.avatarUrl || '/assets/logos.png'} 
                    alt="avatar" 
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border-2 transition-all shrink-0
                      ${isTop3 ? 'border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-transparent group-hover:border-white/20'}
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
                    <span className="text-xs text-gray-500 font-mono tracking-widest mt-0.5">
                      UID: {player.uid || '未绑定'}
                    </span>
                  </div>
                </div>

                {/* 🔥 应用隐私判断后的 Rating 显示 */}
                <div className="hidden md:flex w-32 justify-center shrink-0">
                  <span className={`bg-white/5 px-3 py-1 rounded-full text-xs font-mono font-bold border border-white/10 ${textClipFix} ${isRatingVisible ? getRatingColor(player.rating) : 'text-gray-500'}`}>
                    {isRatingVisible ? (player.rating || 0) : '-'}
                  </span>
                </div>

                <div className="w-24 md:w-40 flex flex-col items-end shrink-0 pr-2 md:pr-4">
                  <div className={`text-xl md:text-3xl font-black italic tracking-tighter font-mono ${textClipFix} ${getPfColor(player.totalPf)}`}>
                    {player.totalPf ? player.totalPf.toFixed(2) : '0.00'}
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-[-2px]">
                    Total PF
                  </span>
                </div>
              </motion.div>
            );
          })}

          {players.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono tracking-widest">
              NO RECORDS FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;