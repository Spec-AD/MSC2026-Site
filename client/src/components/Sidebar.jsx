import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaPenNib, FaInfoCircle, FaScroll, 
  FaTrophy, FaUserCircle, FaSearch, FaSpinner, FaTimes 
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

  const navItems = [
    { path: '/', icon: <FaHome />, label: '主页' },
    { path: '/register', icon: <FaPenNib />, label: '报名' },
    { path: '/intro', icon: <FaInfoCircle />, label: '介绍' },
    { path: '/rules', icon: <FaScroll />, label: '须知' },
    { path: '/qualifiers', icon: <FaTrophy />, label: '预选' },
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
      <div className="fixed bottom-0 md:bottom-auto md:left-0 md:top-0 w-full md:w-24 h-16 md:h-full bg-black/80 md:bg-black/20 backdrop-blur-xl md:backdrop-blur-md border-t border-white/10 md:border-t-0 md:border-r flex flex-row md:flex-col items-center justify-between px-2 md:py-10 z-[100]">
        
        {/* 导航图标区域 */}
        <div className="flex flex-row md:flex-col justify-around md:justify-start md:gap-6 flex-1 w-full md:w-auto">
          
          {/* 渲染基础页面导航 */}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className="group relative flex flex-col items-center justify-center w-full h-full md:w-16 md:h-16"
              >
                {isActive && (
                  <div className="absolute top-0 md:top-1/2 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 w-8 md:w-1 h-[2px] md:h-8 bg-blue-400 shadow-[0_0_10px_#60a5fa] rounded-b-full md:rounded-r-full" />
                )}
                <div className={`text-xl md:text-2xl transition-all duration-300 ${isActive ? 'text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  {item.icon}
                </div>
                <span className={`mt-1 md:hidden text-[10px] scale-90 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                <span className="hidden md:block absolute left-14 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 pointer-events-none text-white z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 🔥 新增：唤出搜索面板的按钮 🔥 */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="group relative flex flex-col items-center justify-center w-full h-full md:w-16 md:h-16"
          >
            <div className="text-xl md:text-2xl text-gray-500 group-hover:text-white transition-all duration-300">
              <FaSearch />
            </div>
            <span className="mt-1 md:hidden text-[10px] scale-90 text-gray-600">
              搜索
            </span>
            <span className="hidden md:block absolute left-14 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 pointer-events-none text-white z-50">
              搜索玩家
            </span>
          </button>
        </div>

        {/* 底部/右侧用户入口 */}
        <Link 
          to={user ? `/profile/${user.username}` : '/login'} 
          className="flex flex-col items-center justify-center w-16 h-full md:h-auto md:mb-8 group relative"
        >
          <div className={`text-2xl md:text-3xl transition-colors ${user ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'text-gray-500'}`}>
            <FaUserCircle />
          </div>
          <span className="mt-1 md:hidden text-[10px] text-gray-600 scale-90">
            {user ? '我的' : '登录'}
          </span>
          <span className="hidden md:block absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 text-white z-50">
              {user ? (user.nickname || user.username) : '点击登录'}
          </span>
        </Link>
      </div>

      {/* ===================== 全屏搜索覆盖层 (Search Modal) ===================== */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            // 超高层级，确保遮住全站所有元素
            className="fixed inset-0 z-[200] bg-black/60 flex flex-col items-center pt-24 md:pt-32 px-4"
          >
            {/* 巨大的关闭按钮 */}
            <button
              onClick={closeSearch}
              className="absolute top-8 right-8 md:top-12 md:right-12 text-white/50 hover:text-white text-3xl transition-transform hover:rotate-90"
            >
              <FaTimes />
            </button>

            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="w-full max-w-2xl relative"
            >
              {/* 搜索输入框主体 */}
              <div className="relative flex items-center">
                <FaSearch className="absolute left-6 text-gray-400 text-xl" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="输入用户名或 UID..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-gray-900/80 border-2 border-white/20 text-white placeholder-gray-500 rounded-full py-4 pl-14 pr-14 focus:outline-none focus:border-blue-500 transition-all shadow-2xl text-lg md:text-xl"
                />
                {isSearching && <FaSpinner className="absolute right-6 text-blue-400 animate-spin text-xl" />}
              </div>

              {/* 搜索结果下拉面板 */}
              {query.trim() && (
                <div className="mt-4 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[60vh] overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleSelectUser(u.username)}
                        className="flex items-center gap-4 p-4 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-0 group"
                      >
                        <img 
                          src={u.avatarUrl || '/assets/logos.png'} 
                          className="w-14 h-14 rounded-full object-cover border-2 border-transparent group-hover:border-blue-400 transition-colors bg-gray-800" 
                        />
                        <div className="flex-1">
                          <div className="text-white font-black text-xl italic tracking-tight group-hover:text-blue-400 transition-colors">
                            {u.username}
                          </div>
                          <div className="text-blue-400 text-sm font-mono font-bold mt-1">UID: {u.uid}</div>
                        </div>
                        {u.isRegistered && (
                          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded tracking-widest uppercase">
                            参赛选手
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center text-gray-500">
                      <div className="text-4xl mb-4 opacity-30">🔍</div>
                      <div className="text-lg">没有找到匹配的玩家</div>
                      <div className="text-sm mt-2 opacity-50">请尝试输入完整的 UID 或更换关键词</div>
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