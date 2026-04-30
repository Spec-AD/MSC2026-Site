// ============================================================
// OsuHome — osu! 模块入口 / 导航
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FaGamepad, FaTrophy, FaHistory, FaStar, FaList, FaSun, FaSearch, FaMap, FaGlobeAsia } from 'react-icons/fa';

const NAV_ITEMS = [
  { path: '/osu', label: '我的档案', icon: <FaGamepad />, exact: true },
  { path: '/osu/best', label: 'BP 排行', icon: <FaTrophy /> },
  { path: '/osu/pass', label: '最近通过', icon: <FaStar /> },
  { path: '/osu/recent', label: '最近游玩', icon: <FaHistory /> },
  { path: '/osu/todaybest', label: '今日最佳', icon: <FaSun /> },
  { path: '/osu/info', label: '玩家查询', icon: <FaSearch /> },
  { path: '/osu/map', label: '谱面查询', icon: <FaMap /> },
  { path: '/osu/leaderboard', label: '排行榜', icon: <FaGlobeAsia /> },
];

export default function OsuHome() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname === '/osu';
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans">
      {/* 环境光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-900/10 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-900/10 rounded-full blur-[140px] mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-20 relative z-10">
        {/* 顶部导航 */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.05]">
          {NAV_ITEMS.map(item => (
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
              <span className="text-[10px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <Outlet />
      </div>
    </div>
  );
}
