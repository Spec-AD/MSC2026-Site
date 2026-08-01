import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import MSCErrorBoundary from './features/msc2026/components/MSCErrorBoundary';

// 所有页面按路由加载。大陆移动网络下只下载当前页面，避免首屏一次获取整站代码。
const Home = lazy(() => import('./pages/Home'));
const Intro = lazy(() => import('./pages/Intro'));
const Register = lazy(() => import('./pages/Register'));
const Qualifiers = lazy(() => import('./pages/Qualifiers'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Songs = lazy(() => import('./pages/Songs'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const TournamentInfo = lazy(() => import('./pages/TournamentInfo'));
const WikiIndex = lazy(() => import('./pages/WikiIndex'));
const WikiArticle = lazy(() => import('./pages/WikiArticle'));
const Admin = lazy(() => import('./pages/Admin'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const OsuCallback = lazy(() => import('./pages/OsuCallback'));
const Friends = lazy(() => import('./pages/Friends'));
const MaimaiProfile = lazy(() => import('./pages/MaimaiProfile'));
const MaimaiCollections = lazy(() => import('./pages/maimai_collections'));
const MaimaiPlateDetail = lazy(() => import('./pages/MaimaiPlateDetail'));
const MaimaiLevelDetail = lazy(() => import('./pages/MaimaiLevelDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const ChunithmProfile = lazy(() => import('./pages/ChunithmProfile'));
const DailyHistory = lazy(() => import('./pages/DailyHistory'));
const LetterGame = lazy(() => import('./pages/LetterGame'));
const DecodeProfile = lazy(() => import('./pages/DecodeProfile'));
const Rules = lazy(() => import('./pages/Rules'));
const TournamentManage = lazy(() => import('./pages/TournamentManage'));
const TournamentDetail = lazy(() => import('./pages/TournamentDetail'));
const ComplaintForm = lazy(() => import('./pages/ComplaintForm'));
const OsuProfile = lazy(() => import('./features/osu/pages/OsuProfile'));
const OsuHome = lazy(() => import('./features/osu/pages/OsuHome'));
const OsuPass = lazy(() => import('./features/osu/pages/OsuPass'));
const OsuRecent = lazy(() => import('./features/osu/pages/OsuRecent'));
const OsuBest = lazy(() => import('./features/osu/pages/OsuBest'));
const OsuTodayBest = lazy(() => import('./features/osu/pages/OsuTodayBest'));
const OsuScoreDetail = lazy(() => import('./features/osu/pages/OsuScoreDetail'));
const OsuInfo = lazy(() => import('./features/osu/pages/OsuInfo'));
const OsuMap = lazy(() => import('./features/osu/pages/OsuMap'));
const OsuLeaderboard = lazy(() => import('./features/osu/pages/OsuLeaderboard'));
const OsuProfileRedirect = lazy(() => import('./features/osu/pages/OsuProfileRedirect'));
const MSC2026Layout = lazy(() => import('./features/msc2026/pages/MSC2026Layout'));
const TournamentHome = lazy(() => import('./features/msc2026/pages/TournamentHome'));
const RaceTutorialPage = lazy(() => import('./features/msc2026/pages/RaceTutorialPage'));
const Stage1Page = lazy(() => import('./features/msc2026/pages/Stage1Page'));
const Stage4Page = lazy(() => import('./features/msc2026/pages/Stage4Page'));
const RacePage = lazy(() => import('./features/msc2026/pages/RacePage'));
const LiveMatchPage = lazy(() => import('./features/msc2026/pages/LiveMatchPage'));
const PointsStorePage = lazy(() => import('./features/msc2026/pages/PointsStorePage'));

function App() {
    return (
    <BrowserRouter>
      <ToastProvider>
        <ThemeProvider>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#06070b] px-6 text-center text-xl font-bold text-zinc-300">正在加载当前页面，请稍候...</div>}>
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
