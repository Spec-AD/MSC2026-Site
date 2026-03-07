import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  FaUserFriends, FaSearch, FaChevronRight, 
  FaSpinner, FaArrowLeft 
} from 'react-icons/fa';

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 获取好友列表数据
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const res = await axios.get(`/api/users/${user.username}/friends`);
        // 🔥 核心修复：后端返回的是包含 friends 和 friendRequests 的对象
        // 所以我们必须提取出 res.data.friends 这个数组！
        setFriends(res.data.friends || []);
      } catch (err) {
        console.error('获取好友列表失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [user]);

  // 2. 搜索过滤逻辑 (现在 friends 绝对是个数组了，不再会报错)
  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.uid && String(f.uid).includes(searchQuery))
  );

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative pb-24 overflow-x-hidden">
      
      {/* 背景：高级晕影与环境散光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 pt-24 md:pt-32">
        
        {/* 头部导航与搜索区 */}
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

        {/* 好友卡片网格 */}
        {loading ? (
          <div className="flex justify-center py-32">
            <FaSpinner className="animate-spin text-3xl text-indigo-500/50" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend, index) => (
                  <motion.div
                    key={friend._id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/profile/${friend.username}`)}
                    className="group relative aspect-[2.5/1] md:aspect-[3.5/1] bg-[#15151e] border border-white/[0.05] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-500"
                  >
                    <div className="absolute inset-0 z-0">
                      {friend.bannerUrl ? (
                        <img 
                          src={friend.bannerUrl} 
                          alt="Banner" 
                          className="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-1000"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-indigo-950/40 to-transparent"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c11] via-[#0c0c11]/40 to-transparent"></div>
                    </div>

                    <div className="absolute inset-0 z-10 p-6 md:p-10 flex items-center">
                      <div className="flex items-center gap-6 md:gap-8 w-full">
                        <img 
                          src={friend.avatarUrl || '/assets/logos.png'} 
                          alt="Avatar" 
                          className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/5 shadow-2xl bg-[#0c0c11] shrink-0"
                        />
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                              {friend.username}
                            </h2>
                            {friend.role === 'ADM' && (
                              <span className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border border-rose-500/20">
                                ADM
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2">
                            <span 
                              className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest"
                              style={{ fontFamily: "'Quicksand', sans-serif" }}
                            >
                              UID: {friend.uid || 'N/A'}
                            </span>
                            
                            <span 
                              className="text-xs md:text-sm text-cyan-400 font-bold px-3 py-1 bg-cyan-400/5 border border-cyan-400/10 rounded-lg"
                              style={{ fontFamily: "'Quicksand', sans-serif" }}
                            >
                              Lv.{friend.level || 1}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                           <FaChevronRight className="text-zinc-500 text-lg" />
                        </div>
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