import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    // 1. 去掉 bg-black，只保留文字颜色设置
    <div className="flex min-h-screen text-white relative selection:bg-blue-500/30">
      
      {/* 
         - fixed: 永远固定在窗口，不随页面滚动，解决手机端兼容性问题
         - inset-0: 占满整个屏幕
         - z-[-1]: 放在最底层
      */}
      <div className="fixed inset-0 z-[-1]">
         {/* 背景图片 */}
         <img 
           src="/assets/bg.png" 
           alt="Background" 
           className="w-full h-full object-cover"
         />
         {/* 全局遮罩 (可选，统一压暗一点，保证文字清晰) */}
         <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* 2. 侧边栏 */}
      <Sidebar />

      {/* 3. 主内容区 */}
      <main className="flex-1 w-full ml-0 md:ml-24 pb-24 md:pb-0 relative z-10 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;