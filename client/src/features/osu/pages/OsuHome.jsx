// ============================================================
// OsuHome — osu! 模块入口 / 导航（b1.7.10 重构版）
// 纯文字 Tab + nav2 装饰图 + 下划线 active
// 可交互 lazer logo 背景
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function OsuHome() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname.startsWith('/osu/profile');
    return location.pathname.startsWith(item.path);
  };

  const NAV_ITEMS = [
    { path: '/osu/profile', label: '我的档案', exact: true },
    { path: '/osu/best', label: 'BP 排行' },
    { path: '/osu/pass', label: '最近通过' },
    { path: '/osu/recent', label: '最近游玩' },
    { path: '/osu/todaybest', label: '今日最佳' },
    { path: '/osu/info', label: '玩家查询' },
    { path: '/osu/map', label: '谱面查询' },
    { path: '/osu/leaderboard', label: '排行榜' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-osu relative">
      {/* nav2 全宽装饰（最底层，延展到页面左右边缘） */}
      <div className="fixed top-0 left-0 w-full h-[200px] z-0 pointer-events-none overflow-hidden">
        <img
          src="/osu-resources/nav2-background-hue0.png"
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
      </div>

      {/* 可交互 lazer logo（右下角） */}
      <a
        href="https://osu.ppy.sh"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-0 right-0 z-50 pointer-events-auto"
      >
        <img
          src="/osu-resources/lazer.png"
          alt="osu!"
          className="lazer-logo w-[200px] h-auto opacity-30"
          style={{ objectFit: 'contain' }}
        />
      </a>

      <div className="max-w-7xl mx-auto px-4 pt-20 relative z-10">
        {/* 纯文字导航 Tab */}
        <nav className="flex items-center gap-0 border-b border-white/[0.05] mb-6 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                px-4 py-3 text-sm font-bold whitespace-nowrap shrink-0 transition-colors
                border-b-2 border-transparent
                ${isActive(item)
                  ? 'text-pink-400 border-pink-500'
                  : 'text-zinc-500 hover:text-zinc-300'
                }
              `}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* 内容区 */}
        <Outlet />
      </div>
    </div>
  );
}
