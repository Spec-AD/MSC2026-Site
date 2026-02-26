import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Admin from './pages/Admin';
import Inbox from './pages/Inbox';

// 引入页面组件
import Home from './pages/Home';
import Register from './pages/Register';
import Intro from './pages/Intro';
import Rules from './pages/Rules';
import Qualifiers from './pages/Qualifiers';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Songs from './pages/Songs'; // 🔥 新增：引入曲目图鉴页面
import Feedback from './pages/Feedback';
import Tournaments from './pages/Tournaments';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 外层路由：使用 Layout 布局 */}
        <Route path="/" element={<Layout />}>
          
          {/* 默认首页 */}
          <Route index element={<Home />} />
          
          {/* 各个功能页 */}
          <Route path="register" element={<Register />} />
          <Route path="intro" element={<Intro />} />
          <Route path="rules" element={<Rules />} />
          <Route path="qualifiers" element={<Qualifiers />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
	  <Route path="/feedback" element={<Feedback />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/tournaments" element={<Tournaments />} />
          
          {/* 🔥 新增：曲目图鉴页路由 */}
          <Route path="songs" element={<Songs />} />
          
          {/* 登录页 */}
          <Route path="login" element={<Login />} />

          {/* 404 处理：随便输什么都跳回主页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;