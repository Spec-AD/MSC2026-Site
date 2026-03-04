import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FaUserFriends, FaSearch, FaUserCircle, FaChevronRight, 
  FaSpinner, FaArrowLeft 
} from 'react-icons/fa';

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 获取好友列表数据
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // 此处链接到后端获取当前登录用户的好友数组
        const res = await axios.get(`/api/users/${user.username}/friends`);
        setFriends(res.data);
      } catch (err) {
        console.error('获取好友列表失败', err);
        // 如果后端接口暂未完成，这里可以先 setFriends([]) 或展示样板数据
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [user]);

  // 2. 搜索过滤逻辑
  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.uid && String(f.uid).includes(searchQuery))
  );

  // 3. 排名颜色逻辑 (复用排行榜逻辑)
  const getRankColor = (rank) => {
    if (rank === '-' || !rank) return 'text-zinc-500';
    const r = Number(rank);
    if (r >= 1 && r <= 10) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400';
    if (r >= 11 && r <= 100) return 'text-cyan-400';
    return 'text-blue-400';
  };

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative pb-24 overflow-x-hidden">
      
      {/* ==================================================== */}
      {/* 背景：高级晕影与环境散光 (延续全站风格) */}
      {/* ==================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 pt-24 md:pt-32">
        
        {/* --- 头部导航与搜索区 --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95"
            >
              <FaArrowLeft className="text-xs" /> 返回主页
            </button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
              <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">我的好友</h1>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative w-full md:w-80">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
            <input 
              type="text" 
              placeholder="搜索好友用户名或 UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#15151e]/80 backdrop-blur-md border border-white/[0.05] rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all placeholder-zinc-600"
            />
          </div>
        </div>

        {/* --- 好友卡片网格 --- */}
        {loading ? (
          <div className="flex justify-center py-32">
            <FaSpinner className="animate-spin text-3xl text-indigo-500/50" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend, index) => (
                  <motion.div
                    key={friend._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/profile/${friend.username}`)}
                    className="group relative aspect-[4/5] bg-[#15151e] border border-white/[0.05] rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-500"
                  >
                    {/* 背景 Banner 层 (核心功能实现) */}
                    <div className="absolute inset-0 z-0">
                      {friend.bannerUrl ? (
                        <img 
                          src={friend.bannerUrl} 
                          alt="Banner" 
                          className="w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-zinc-900"></div>
                      )}
                      {/* 渐变压暗层，确保文字清晰度 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/60 to-transparent"></div>
                    </div>

                    {/* 卡片内容区 */}
                    <div className="absolute inset-0 z-10 p-6 flex flex-col justify-end">
                      <div className="flex flex-col items-center text-center">
                        {/* 头像 */}
                        <img 
                          src={friend.avatarUrl || '/assets/logos.png'} 
                          alt="Avatar" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-white/10 shadow-lg mb-4 bg-[#0c0c11]"
                        />
                        
                        {/* 用户名与角色标志 */}
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-white tracking-tight truncate max-w-[150px]">
                            {friend.username}
                          </h2>
                          {friend.role === 'ADM' && (
                            <span className="bg-rose-500/10 text-rose-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border border-rose-500/20">
                              ADM
                            </span>
                          )}
                        </div>
                        
                        {/* UID - Quicksand 字体 */}
                        <span 
                          className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mb-6"
                          style={{ fontFamily: "'Quicksand', sans-serif" }}
                        >
                          UID: {friend.uid || 'N/A'}
                        </span>

                        {/* 数据面板 - Quicksand 字体 */}
                        <div className="w-full grid grid-cols-2 gap-2 bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-white/[0.05]">
                          <div className="flex flex-col items-center border-r border-white/5">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Performance</span>
                            <span 
                              className="text-sm font-bold text-cyan-400"
                              style={{ fontFamily: "'Quicksand', sans-serif" }}
                            >
                              {friend.totalPf ? friend.totalPf.toFixed(1) : (friend.rating || '0')}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Rank</span>
                            <span 
                              className={`text-sm font-bold ${getRankColor(friend.pfRank)}`}
                              style={{ fontFamily: "'Quicksand', sans-serif" }}
                            >
                              {friend.pfRank ? `#${friend.pfRank}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 悬浮装饰按钮 */}
                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                        <FaChevronRight className="text-[10px]" />
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-32 flex flex-col items-center justify-center bg-[#15151e]/40 border border-white/[0.05] rounded-[3rem]">
                  <FaUserFriends className="text-5xl text-zinc-800 mb-4 opacity-20" />
                  <p className="text-zinc-500 font-medium tracking-wide">
                    {searchQuery ? '未找到匹配的好友' : '你还没有添加任何好友'}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
};

export default Friends;