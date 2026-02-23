import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // --- 🔥 动态获取头衔颜色 ---
  const getRoleColor = (role) => {
    switch(role) {
      case 'ADM': return 'text-red-500';
      case 'TO':  return 'text-yellow-400';
      case 'DS':  return 'text-green-500';
      default:    return 'text-white group-hover:text-blue-400';
    }
  };

  // --- 核心机制：防抖搜索 ---
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // 用户停止打字 300 毫秒后，才向后端发送请求
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/users/search?q=${query}`);
        setResults(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error("搜索请求失败", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // --- 交互优化：点击屏幕其他地方时，收起下拉框 ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 页面跳转 ---
  const handleSelectUser = (username) => {
    setShowDropdown(false); // 关闭下拉框
    setQuery('');           // 清空搜索栏
    navigate(`/profile/${username}`); // 跳转到目标主页
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm z-50">
      
      {/* 搜索输入框 */}
      <div className="relative flex items-center">
        <FaSearch className="absolute left-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索用户名或 UID..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query.trim() && setShowDropdown(true)}
          className="w-full bg-black/40 border border-white/20 text-white placeholder-gray-500 rounded-full py-2.5 pl-11 pr-11 focus:outline-none focus:border-blue-500 transition-all shadow-inner backdrop-blur-md"
        />
        {/* 加载动画 */}
        {isSearching && <FaSpinner className="absolute right-4 text-blue-400 animate-spin" />}
      </div>

      {/* 搜索结果下拉面板 */}
      <AnimatePresence>
        {showDropdown && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-3 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="max-h-72 overflow-y-auto">
                {results.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleSelectUser(user.username)}
                    className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-0 group"
                  >
                    {/* 头像 */}
                    <img 
                      src={user.avatarUrl || '/assets/logos.png'} 
                      className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-blue-400 transition-colors" 
                    />
                    
                    {/* 身份信息 */}
                    <div className="flex-1 overflow-hidden">
                      {/* 🔥 根据角色的不同赋予不同的名字颜色 */}
                      <div className={`font-bold truncate transition-colors ${getRoleColor(user.role)}`}>
                        {user.username}
                      </div>
                      <div className="text-gray-400 text-xs font-mono">UID: {user.uid}</div>
                    </div>
                    
                    {/* 参赛标签 */}
                    {user.isRegistered && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded tracking-widest uppercase">
                        参赛选手
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // 找不到时的空状态
              <div className="p-6 text-center text-gray-500 text-sm">
                <div className="text-2xl mb-2 opacity-50">🔍</div>
                没有找到匹配的玩家...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;