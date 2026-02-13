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
    /* 优化点：
       1. z-[100]: 确保导航栏永远在最上层，不会被 3D 卡片遮挡。
       2. backdrop-blur-xl: 手机端背景模糊加深，防止底部文字干扰视线。
       3. border-t-white/10: 手机端顶部加一条极细的分割线，增加精致感。
    */
    <div className="fixed bottom-0 md:bottom-auto md:left-0 md:top-0 w-full md:w-24 h-16 md:h-full bg-black/80 md:bg-black/20 backdrop-blur-xl md:backdrop-blur-md border-t border-white/10 md:border-t-0 md:border-r flex flex-row md:flex-col items-center justify-between px-2 md:py-10 z-[100]">
      
      {/* 导航图标区域 */}
      <div className="flex flex-row md:flex-col justify-around md:justify-start md:gap-8 flex-1 w-full md:w-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className="group relative flex flex-col items-center justify-center w-full h-full md:w-16 md:h-16"
            >
              {/* 选中指示条：手机端(顶部细条) / 电脑端(左侧竖条) */}
              {isActive && (
                <div className="absolute top-0 md:top-1/2 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 w-8 md:w-1 h-[2px] md:h-8 bg-blue-400 shadow-[0_0_10px_#60a5fa] rounded-b-full md:rounded-r-full" />
              )}
              
              {/* 图标 */}
              <div className={`text-xl md:text-2xl transition-all duration-300 ${isActive ? 'text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {item.icon}
              </div>
              
              {/* 手机端标签：字体缩小到 10px，增加辨识度 */}
              <span className={`mt-1 md:hidden text-[10px] scale-90 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                {item.label}
              </span>

              {/* 电脑端 Hover 提示 */}
              <span className="hidden md:block absolute left-14 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 pointer-events-none text-white z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 底部用户入口 */}
      <Link to="/login" className="flex flex-col items-center justify-center w-16 h-full md:h-auto md:mb-8 group relative">
        <div className={`text-2xl md:text-3xl transition-colors ${user ? 'text-green-400' : 'text-gray-500'}`}>
          <FaUserCircle />
        </div>
        <span className="mt-1 md:hidden text-[10px] text-gray-600 scale-90">
          {user ? '我的' : '登录'}
        </span>
        <span className="hidden md:block absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 text-white">
            {user ? user.nickname : '点击登录'}
        </span>
      </Link>
    </div>
  );
};

export default Sidebar;