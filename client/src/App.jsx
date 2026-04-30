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
import DailyHistory from './pages/DailyHistory';
import LetterGame from './pages/LetterGame';
import DecodeProfile from './pages/DecodeProfile';
import Rules from './pages/Rules';
import TournamentManage from './pages/TournamentManage';
import TournamentDetail from './pages/TournamentDetail';
import ComplaintForm from './pages/ComplaintForm';

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
          <Routes>
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
              <Route path="/profile/:username/osu" element={<OsuProfile />} />
              <Route path="/osu" element={<OsuHome />}>
                <Route index element={<OsuProfile />} />
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
              <Route path="/daily-history" element={<DailyHistory />} />
              <Route path="/letter-game" element={<LetterGame />} />
              <Route path="/profile/:username/decode" element={<DecodeProfile />} />
              <Route path="songs" element={<Songs />} />
              <Route path="login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ThemeProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;