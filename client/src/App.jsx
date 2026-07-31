import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Admin from './pages/Admin';
import Inbox from './pages/Inbox';
import Leaderboard from './pages/Leaderboard';
import OsuCallback from './pages/OsuCallback';
import Friends from './pages/Friends';
import MaimaiProfile from './pages/MaimaiProfile';
import MaimaiCollections from './pages/maimai_collections';
import MaimaiPlateDetail from './pages/MaimaiPlateDetail';
import MaimaiLevelDetail from './pages/MaimaiLevelDetail';
import Settings from './pages/Settings';
import ChunithmProfile from './pages/ChunithmProfile';
import OsuProfile from './features/osu/pages/OsuProfile';
import OsuHome from './features/osu/pages/OsuHome';
import OsuPass from './features/osu/pages/OsuPass';
import OsuRecent from './features/osu/pages/OsuRecent';
import OsuBest from './features/osu/pages/OsuBest';
import OsuTodayBest from './features/osu/pages/OsuTodayBest';
import OsuScoreDetail from './features/osu/pages/OsuScoreDetail';
import OsuInfo from './features/osu/pages/OsuInfo';
import OsuMap from './features/osu/pages/OsuMap';
import OsuLeaderboard from './features/osu/pages/OsuLeaderboard';
import OsuProfileRedirect from './features/osu/pages/OsuProfileRedirect';
import DailyHistory from './pages/DailyHistory';
import LetterGame from './pages/LetterGame';
import DecodeProfile from './pages/DecodeProfile';
import Rules from './pages/Rules';
import TournamentManage from './pages/TournamentManage';
import TournamentDetail from './pages/TournamentDetail';
import ComplaintForm from './pages/ComplaintForm';
import MSCErrorBoundary from './features/msc2026/components/MSCErrorBoundary';

// MSC 2026 的 3D 与现场模块按路由加载，避免拖慢站点首屏。
const MSC2026Layout = lazy(() => import('./features/msc2026/pages/MSC2026Layout'));
const TournamentHome = lazy(() => import('./features/msc2026/pages/TournamentHome'));
const RaceTutorialPage = lazy(() => import('./features/msc2026/pages/RaceTutorialPage'));
const Stage1Page = lazy(() => import('./features/msc2026/pages/Stage1Page'));
const Stage4Page = lazy(() => import('./features/msc2026/pages/Stage4Page'));
const RacePage = lazy(() => import('./features/msc2026/pages/RacePage'));
const LiveMatchPage = lazy(() => import('./features/msc2026/pages/LiveMatchPage'));
const PointsStorePage = lazy(() => import('./features/msc2026/pages/PointsStorePage'));

// 引入页面组件
import Home from './pages/Home';
import Intro from './pages/Intro';
import Register from './pages/Register';
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
      <ToastProvider>
        <ThemeProvider>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#06070b] text-xl font-bold text-zinc-300">正在载入比赛界面...</div>}>
          <Routes>
            <Route path="/matches/msc2026/live" element={<MSCErrorBoundary><LiveMatchPage /></MSCErrorBoundary>} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
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
              <Route path="/tournament/:id" element={<TournamentDetail />} />
              <Route path="/tournament-manage/:id" element={<TournamentManage />} />
              <Route path="/complaint" element={<ComplaintForm />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/wiki" element={<WikiIndex />} />
              <Route path="/wiki/:slug" element={<WikiArticle />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/profile/:username/maimai" element={<MaimaiProfile />} />
              <Route path="/profile/:username/maimai/collections" element={<MaimaiCollections />} />
              <Route path="/profile/:username/maimai/plate/:plateId" element={<MaimaiPlateDetail />} />
              <Route path="/profile/:username/maimai/level/:level" element={<MaimaiLevelDetail />} />
              <Route path="/profile/:username/chunithm" element={<ChunithmProfile />} />
              <Route path="/profile/:username/osu" element={<OsuProfileRedirect />} />
              <Route path="/osu" element={<OsuHome />}>
                <Route index element={<Navigate to="/osu/profile" replace />} />
                <Route path="profile" element={<OsuProfile />} />
                <Route path="pass" element={<OsuPass />} />
                <Route path="recent" element={<OsuRecent />} />
                <Route path="best" element={<OsuBest />} />
                <Route path="todaybest" element={<OsuTodayBest />} />
                <Route path="score/:bid" element={<OsuScoreDetail />} />
                <Route path="info" element={<OsuInfo />} />
                <Route path="map" element={<OsuMap />} />
                <Route path="map/:bid" element={<OsuMap />} />
                <Route path="leaderboard" element={<OsuLeaderboard />} />
                <Route path="leaderboard/:bid" element={<OsuLeaderboard />} />
              </Route>
              {/* MSC 2026 独立路由 */}
              <Route path="/matches/msc2026" element={<MSCErrorBoundary><MSC2026Layout /></MSCErrorBoundary>}>
                <Route index element={<TournamentHome />} />
                <Route path="tutorial" element={<RaceTutorialPage />} />
                <Route path="stage1" element={<Stage1Page />} />
                <Route path="stage2" element={<RacePage stage="stage2" />} />
                <Route path="stage3" element={<RacePage stage="stage3" />} />
                <Route path="stage4" element={<Stage4Page />} />
                <Route path="store" element={<PointsStorePage />} />
              </Route>
              <Route path="/daily-history" element={<DailyHistory />} />
              <Route path="/letter-game" element={<LetterGame />} />
              <Route path="/profile/:username/decode" element={<DecodeProfile />} />
              <Route path="songs" element={<Songs />} />
              <Route path="login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </Suspense>
        </ThemeProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
