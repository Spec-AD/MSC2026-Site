// ============================================================
// OsuHome — osu! 模块入口 / 导航
// b1.7 R3: 顶部导航显示用户头像+昵称（H1 fix）
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FaGamepad, FaTrophy, FaHistory, FaStar, FaList, FaSun, FaSearch, FaMap, FaGlobeAsia, FaUser } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

export default function OsuHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const isActive = (item) => {
    if (item.exact) return location.pathname.startsWith('/osu/profile');
    return location.pathname.startsWith(item.path);
  };

  const NAV_ITEMS = [
    { path: '/osu/profile', label: currentUser ? (currentUser.nickname || currentUser.username) : 'osu!', icon: null, exact: true },
    { path: '/osu/best', label: 'BP 排行', icon: <FaTrophy /> },
    { path: '/osu/pass', label: '最近通过', icon: <FaStar /> },
    { path: '/osu/recent', label: '最近游玩', icon: <FaHistory /> },
    { path: '/osu/todaybest', label: '今日最佳', icon: <FaSun /> },
    { path: '/osu/info', label: '玩家查询', icon: <FaSearch /> },
    { path: '/osu/map', label: '谱面查询', icon: <FaMap /> },
    { path: '/osu/leaderboard', label: '排行榜', icon: <FaGlobeAsia /> },
  ];

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-osu">
      {/* 环境光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-900/10 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-900/10 rounded-full blur-[140px] mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-20 relative z-10">
        {/* 顶部导航 */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.05]">
          {NAV_ITEMS.map((item, idx) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all shrink-0
                ${isActive(item)
                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }
              `}
            >
              {/* 第一个 nav item（我的档案）显示用户头像 + 昵称 */}
              {idx === 0 && currentUser ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <FaUser className="w-full h-full p-1 text-zinc-600" />
                    )}
                  </div>
                  <span className="truncate max-w-[100px]">{item.label}</span>
                </div>
              ) : (
                <>
                  {item.icon && <span className="text-[10px]">{item.icon}</span>}
                  <span>{item.label}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <Outlet />
      </div>
    </div>
  );
}
