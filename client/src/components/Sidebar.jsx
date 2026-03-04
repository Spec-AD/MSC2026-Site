import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaTrophy, FaUserCircle, FaSearch, FaSpinner, FaTimes, 
  FaCompactDisc, FaBook, FaCrown
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- 搜索栏专属状态 ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  // 导航路由配置
  const navItems = [
    { path: '/', icon: <FaHome />, label: '枢纽' },
    { path: '/tournaments', icon: <FaTrophy />, label: '赛事' },
    { path: '/leaderboard', icon: <FaCrown />, label: '排行' },
    { path: '/songs', icon: <FaCompactDisc />, label: '曲目' },
    { path: '/wiki', icon: <FaBook />, label: '维基' },
  ];

  // --- 搜索核心机制：防抖与请求 ---
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/users/search?q=${query}`);
        setResults(res.data);
      } catch (err) {
        console.error("搜索请求失败", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // --- 交互优化：打开搜索时自动聚焦，按下 Esc 键关闭 ---
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSearchOpen]);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleSelectUser = (username) => {
    closeSearch();
    navigate(`/profile/${username}`);
  };

  return (
    <>
      {/* ===================== 侧边栏/底边栏主体 ===================== */}
      {/* 采用深灰色系，极其轻微的毛玻璃和描边 */}
      <div className="fixed bottom-0 md:bottom-auto md:left-0 md:top-0 w-full md:w-20 h-16 md:h-full bg-[#18181c]/95 md:bg-[#18181c] backdrop-blur-xl border-t border-white/[0.05] md:border-t-0 md:border-r flex flex-row md:flex-col items-center justify-between px-2 md:py-8 z-[100] shadow-2xl">
        
        {/* 导航图标区域 */}
        <div className="flex flex-row md:flex-col justify-around md:justify-start md:gap-4 flex-1 w-full md:w-auto">
          
          {/* 渲染基础页面导航 */}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className="group relative flex flex-col items-center justify-center w-full h-full md:w-14 md:h-14 rounded-xl hover:bg-white/[0.04] transition-all duration-200 active:scale-95"
              >
                {/* 桌面端活跃指示条 */}
                {isActive && (
                  <div className="hidden md:block absolute left-0 w-1 h-6 bg-zinc-300 rounded-r-full" />
                )}
                {/* 移动端活跃指示点 */}
                {isActive && (
                  <div className="md:hidden absolute top-1 w-1 h-1 bg-zinc-300 rounded-full" />
                )}
                
                <div className={`text-xl md:text-[22px] transition-colors duration-200 ${isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  {item.icon}
                </div>
                
                <span className={`mt-1 md:hidden text-[10px] font-medium transition-colors ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                  {item.label}
                </span>

                {/* 桌面端悬浮 Tooltip */}
                <span className="hidden md:block absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity bg-[#222228] px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.05] text-zinc-200 shadow-lg pointer-events-none z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 唤出搜索面板的按钮 */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="group relative flex flex-col items-center justify-center w-full h-full md:w-14 md:h-14 rounded-xl hover:bg-white/[0.04] transition-all duration-200 active:scale-95 md:mt-2"
          >
            <div className="text-xl md:text-[22px] text-zinc-500 group-hover:text-zinc-300 transition-colors duration-200">
              <FaSearch />
            </div>
            <span className="mt-1 md:hidden text-[10px] font-medium text-zinc-500">
              搜索
            </span>
            <span className="hidden md:block absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity bg-[#222228] px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.05] text-zinc-200 shadow-lg pointer-events-none z-50">
              搜索玩家
            </span>
          </button>
        </div>

        {/* 底部/右侧用户入口 */}
        <Link 
          to={user ? `/profile/${user.username}` : '/login'} 
          className="flex flex-col items-center justify-center w-16 h-full md:w-14 md:h-14 rounded-xl hover:bg-white/[0.04] transition-all duration-200 active:scale-95 group relative"
        >
          <div className={`text-[22px] md:text-2xl transition-colors duration-200 ${user ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
            <FaUserCircle />
          </div>
          <span className="mt-1 md:hidden text-[10px] font-medium text-zinc-500">
            {user ? '我的' : '登录'}
          </span>
          <span className="hidden md:block absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity bg-[#222228] px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.05] text-zinc-200 shadow-lg pointer-events-none whitespace-nowrap z-50">
              {user ? (user.nickname || user.username) : '点击登录'}
          </span>
        </Link>
      </div>

      {/* ===================== 全屏搜索覆盖层 (Search Modal) ===================== */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-[200] bg-[#0a0a0c]/80 flex flex-col items-center pt-24 md:pt-32 px-4"
          >
            {/* 关闭按钮 */}
            <button
              onClick={closeSearch}
              className="absolute top-6 right-6 md:top-10 md:right-10 text-zinc-500 hover:text-zinc-200 text-2xl p-2 transition-all active:scale-90 bg-white/[0.02] hover:bg-white/[0.05] rounded-full"
            >
              <FaTimes />
            </button>

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl relative"
            >
              {/* 搜索输入框主体 */}
              <div className="relative flex items-center shadow-2xl">
                <FaSearch className="absolute left-6 text-zinc-500 text-lg" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜索用户名或 UID..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/[0.05] text-zinc-100 placeholder-zinc-500 rounded-2xl py-4 pl-14 pr-14 focus:outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-all text-base md:text-lg"
                />
                {isSearching && <FaSpinner className="absolute right-6 text-zinc-400 animate-spin text-lg" />}
              </div>

              {/* 搜索结果下拉面板 */}
              {query.trim() && (
                <div className="mt-3 bg-[#18181c] border border-white/[0.05] rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {results.length > 0 ? (
                    results.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleSelectUser(u.username)}
                        className="flex items-center gap-4 p-4 hover:bg-[#222228] cursor-pointer transition-colors border-b border-white/[0.02] last:border-0 group"
                      >
                        <img 
                          src={u.avatarUrl || '/assets/logos.png'} 
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover bg-[#111115] border border-white/[0.05]" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-zinc-100 font-semibold text-lg tracking-tight truncate group-hover:text-white transition-colors">
                            {u.username}
                          </div>
                          <div className="text-zinc-500 text-sm mt-0.5 font-medium">UID: {u.uid}</div>
                        </div>
                        {u.isRegistered && (
                          <span className="text-xs bg-white/[0.05] text-zinc-300 border border-white/[0.05] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap">
                            参赛选手
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                      <FaSearch className="text-3xl mb-3 opacity-20" />
                      <div className="text-sm font-medium">未找到匹配的玩家</div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;