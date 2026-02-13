import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-black text-white relative selection:bg-blue-500/30">
      {/* 1. 侧边栏 (响应式：手机在底，电脑在左) */}
      <Sidebar />

      {/* 2. 主内容区 (右侧) */}
      {/* 
         - ml-0: 手机端左边距归零
         - md:ml-24: 电脑端保持左边距，避开 Sidebar
         - pb-24: 手机端增加底部内边距，防止内容被底部导航栏遮挡
         - md:pb-0: 电脑端不需要底部内边距
         - w-full: 强制占满剩余宽度
         - p-0: 去掉全局内边距，让 Home/Intro 等页面可以全屏显示
      */}
      <main className="flex-1 w-full ml-0 md:ml-24 pb-24 md:pb-0 relative z-10 overflow-x-hidden">
        <Outlet />
      </main>

      {/* 3. 全局背景遮罩 (可选，增加一点质感) */}
      <div className="fixed inset-0 bg-black/10 pointer-events-none z-0" />
    </div>
  );
};

export default Layout;