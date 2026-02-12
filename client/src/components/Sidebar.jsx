import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaPenNib, FaInfoCircle, FaScroll, FaTrophy, FaUserCircle } from 'react-icons/fa'; // 引入图标
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth(); // 获取登录状态

  // 导航配置
  const navItems = [
    { path: '/', icon: <FaHome />, label: '主页' },
    { path: '/register', icon: <FaPenNib />, label: '报名' },
    { path: '/intro', icon: <FaInfoCircle />, label: '介绍' },
    { path: '/rules', icon: <FaScroll />, label: '须知' },
    { path: '/qualifiers', icon: <FaTrophy />, label: '预选' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-24 bg-black/20 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-10 z-50">
      
      {/* 上方导航图标 */}
      <div className="flex flex-col gap-8 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="group relative flex flex-col items-center justify-center w-16 h-16">
              {/* 选中状态的光条 */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 shadow-[0_0_10px_#60a5fa] rounded-r-full" />
              )}
              
              {/* 图标 */}
              <div className={`text-2xl transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-gray-400 group-hover:text-white'}`}>
                {item.icon}
              </div>
              
              {/* 文字 (Hover时显示) */}
              <span className="absolute left-14 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 pointer-events-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 底部用户头像/登录入口 */}
      <Link to="/login" className="mb-8 group relative">
        <div className={`text-3xl transition-colors ${user ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
          <FaUserCircle />
        </div>
        <span className="absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10">
            {user ? `已登录: ${user.username}` : '点击登录'}
        </span>
      </Link>
    </div>
  );
};

export default Sidebar;