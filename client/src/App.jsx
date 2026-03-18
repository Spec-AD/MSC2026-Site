import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext'; // 🔥 新增：全局 Toast 提示引擎
import Layout from './components/Layout';
import Admin from './pages/Admin';
import Inbox from './pages/Inbox';
import Leaderboard from './pages/Leaderboard';
import OsuCallback from './pages/OsuCallback';
import Friends from './pages/Friends';
import MaimaiProfile from './pages/MaimaiProfile';
import Settings from './pages/Settings';
import ChunithmProfile from './pages/ChunithmProfile';
import OsuProfile from './pages/OsuProfile';
import DailyHistory from './pages/DailyHistory';
import LetterGame from './pages/LetterGame';

// 引入页面组件
import Home from './pages/Home';
import Register from './pages/Register';
import Intro from './pages/Intro';
import Rules from './pages/Rules';
import Qualifiers from './pages/Qualifiers';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Songs from './pages/Songs'; // 🔥 曲目图鉴页面
import Feedback from './pages/Feedback';
import Tournaments from './pages/Tournaments';
import TournamentInfo from './pages/TournamentInfo';
import WikiIndex from './pages/WikiIndex';
import WikiArticle from './pages/WikiArticle';

function App() {
  return (
    <BrowserRouter>
      {/* 🔥 用 ToastProvider 包裹整个路由，使漂亮的弹窗在全站任意页面均可调用 */}
      <ToastProvider>
        <Routes>
          {/* 外层路由：使用 Layout 布局 */}
          <Route path="/" element={<Layout />}>
            
            {/* 默认首页 */}
            <Route index element={<Home />} />
            
            {/* 各个功能页 */}
            <Route path="register" element={<Register />} />
            <Route path="/osu-callback" element={<OsuCallback />} />
            <Route path="intro" element={<Intro />} />
            <Route path="rules" element={<Rules />} />
            <Route path="qualifiers" element={<Qualifiers />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournament-info" element={<TournamentInfo />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/wiki" element={<WikiIndex />} />
            <Route path="/wiki/:slug" element={<WikiArticle />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/profile/:username/maimai" element={<MaimaiProfile />} />
            <Route path="/profile/:username/chunithm" element={<ChunithmProfile />} />
            <Route path="/profile/:username/osu" element={<OsuProfile />} />
            <Route path="/daily-history" element={<DailyHistory />} />
	    <Route path="/letter-game" element={<LetterGame />} />
            {/* 曲目图鉴页路由 */}
            <Route path="songs" element={<Songs />} />
            
            {/* 登录页 */}
            <Route path="login" element={<Login />} />

            {/* 404 处理：随便输什么都跳回主页 */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;