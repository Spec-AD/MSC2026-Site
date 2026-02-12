import { Outlet, Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar'; // 我们马上就会写这个

const Layout = () => {
  return (
    <div className="flex min-h-screen relative">
      {/* 1. 侧边栏 (固定在左侧) */}
      <Sidebar />

      {/* 2. 主内容区 (右侧) */}
      {/* AnimatePresence 可以加在这里做页面切换动画，暂时先不做 */}
      <main className="flex-1 ml-24 p-8 overflow-y-auto z-10">
        {/* Outlet 是路由的出口，所有页面都会显示在这里 */}
        <Outlet />
      </main>

      {/* 3. 背景遮罩 (可选，让文字更清晰) */}
      <div className="fixed inset-0 bg-black/30 pointer-events-none z-0" />
    </div>
  );
};

export default Layout;