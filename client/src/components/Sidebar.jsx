import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaPenNib, FaInfoCircle, FaScroll, FaTrophy, FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: '/', icon: <FaHome />, label: '主页' },
    { path: '/register', icon: <FaPenNib />, label: '报名' },
    { path: '/intro', icon: <FaInfoCircle />, label: '介绍' },
    { path: '/rules', icon: <FaScroll />, label: '须知' },
    { path: '/qualifiers', icon: <FaTrophy />, label: '预选' },
  ];

  return (
    /* 核心逻辑切换：
       - 电脑端 (md:): 左侧固定, 宽度 24, 高度全屏, 垂直排列 (flex-col)
       - 手机端: 底部固定, 宽度全屏, 高度 16, 水平排列 (flex-row)
    */
    <div className="fixed bottom-0 md:bottom-auto md:left-0 md:top-0 w-full md:w-24 h-16 md:h-full bg-black/60 md:bg-black/20 backdrop-blur-xl md:backdrop-blur-md border-t md:border-t-0 md:border-r border-white/10 flex flex-row md:flex-col items-center px-2 md:py-10 z-[100]">
      
      {/* 导航图标区域 */}
      <div className="flex flex-row md:flex-col justify-around md:justify-start md:gap-8 flex-1 w-full md:w-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className="group relative flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16"
            >
              {/* 选中状态指示条：手机端移到顶部，电脑端在左侧 */}
              {isActive && (
                <div className="absolute top-0 md:top-1/2 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 w-8 md:w-1 h-1 md:h-8 bg-blue-400 shadow-[0_0_10px_#60a5fa] rounded-b-full md:rounded-r-full" />
              )}
              
              {/* 图标：手机端稍微缩小 */}
              <div className={`text-xl md:text-2xl transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-gray-400'}`}>
                {item.icon}
              </div>
              
              {/* 手机端标签：常显，极小，用于引导；电脑端仅在 Hover 时显示 */}
              <span className="mt-1 md:hidden text-[10px] text-gray-400 scale-90">
                {item.label}
              </span>

              {/* 电脑端 Hover 文字提示 */}
              <span className="hidden md:block absolute left-14 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 pointer-events-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 底部用户入口：手机端也并入水平排列 */}
      <Link to="/login" className="flex flex-col items-center justify-center w-14 h-14 md:w-auto md:mb-8 group relative">
        <div className={`text-2xl md:text-3xl transition-colors ${user ? 'text-green-400' : 'text-gray-400'}`}>
          <FaUserCircle />
        </div>
        <span className="mt-1 md:hidden text-[10px] text-gray-400 scale-90">
          {user ? '我的' : '登录'}
        </span>
        <span className="hidden md:block absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10">
            {user ? `已登录: ${user.username}` : '点击登录'}
        </span>
      </Link>
    </div>
  );
};

export default Sidebar;