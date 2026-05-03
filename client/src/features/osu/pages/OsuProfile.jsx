// ============================================================
// OsuProfile — 重建版（b1.7）
// 紧凑布局 · 虚拟滚动 · 全模式同步 · 懒加载封面
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import {
  FaArrowLeft, FaGamepad, FaSpinner, FaSyncAlt,
  FaLock, FaGlobe, FaMapMarkerAlt, FaPlay, FaUser,
  FaCheck, FaExclamationCircle, FaRedo, FaTimes,
  FaClock, FaEye,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getUserProfile } from '../api/osuApi';
import { getModeMap, getApiModeSync } from '../../../constants/osuModes';
import useOsuSync from '../hooks/useOsuSync';
import OsuCoverImage from '../components/OsuCoverImage';
import OsuGrade from '../components/OsuGrade';
import OsuScoreDetailPanel from '../components/OsuScoreDetailPanel';
import OsuModeTabs from '../components/OsuModeTabs';
import RankHistoryChart from '../components/RankHistoryChart';
import CountryFlag from '../components/CountryFlag';
import { getOsuInfo } from '../api/osuApi';

// 模式简洁图标
const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];

export default function OsuProfile() {
  const { username: routeUsername } = useParams();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const searchUser = searchParams.get('user');
  const username = searchUser || routeUsername || currentUser?.username;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [allOsuScores, setAllOsuScores] = useState([]);
  const [selectedScore, setSelectedScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMode, setActiveMode] = useState('standard');
  const [modeMap, setModeMap] = useState(null);

  const { syncState, isSyncing, syncProgress, syncAll, authError, clearAuthError } = useOsuSync();

  const isOwnProfile = profile && currentUser &&
    (profile.username?.toLowerCase() === currentUser.username?.toLowerCase());

  // 初始化时获取 MODE_MAP
  useEffect(() => {
    getModeMap().then(setModeMap).catch(() => setModeMap(null));
  }, []);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const userRes = await getUserProfile(username);
      const profile = userRes.data;

      // 合并 osu! 实时数据（badges / rankHistory / playTime / 关注等）
      if (profile.osuId || profile.osuUsername) {
        try {
          const osuInfoRes = await getOsuInfo(profile.osuUsername || username);
          const oi = osuInfoRes.data;
          if (oi) {
            profile.defaultMode = oi.defaultMode;
            profile.rankHistory = oi.rankHistory;
            profile.badges = oi.badges;
            profile.friendsCount = oi.friendsCount;
            profile.followerCount = oi.followerCount;
            // 合并各模式新增字段
            for (const mode of MODE_IDS) {
              if (oi.statistics?.[mode]) {
                if (!profile.osuDetails?.[mode]) profile.osuDetails[mode] = {};
                Object.assign(profile.osuDetails[mode], {
                  playTime: oi.statistics[mode].playTime,
                  replaysWatched: oi.statistics[mode].replaysWatched,
                  rankHistory: oi.statistics[mode].rankHistory,
                });
              }
            }
          }
        } catch (_) {
          // osuInfo 不可用（未绑定/网络超时）时只使用本地数据
        }
      }

      setProfile(profile);
      setAllOsuScores(profile.osuScores || []);
      if (profile.osuMode && MODE_IDS.includes(profile.osuMode)) {
        setActiveMode(profile.osuMode);
      } else if (profile.defaultMode && MODE_IDS.includes(profile.defaultMode)) {
        setActiveMode(profile.defaultMode);
      }
    } catch (err) {
      setError('无法访问该玩家的档案');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // 当前模式成绩
  const currentModeScores = useMemo(() => {
    const apiMode = modeMap?.[activeMode] || getApiModeSync(activeMode);
    return (allOsuScores || [])
      .filter(s => s.mode === apiMode)
      .sort((a, b) => b.pp - a.pp);
  }, [allOsuScores, activeMode, modeMap]);

  // 当前模式统计数据
  const modeStats = useMemo(() => {
    if (!profile?.osuDetails) return null;
    return profile.osuDetails[activeMode];
  }, [profile, activeMode]);

  // osuDetails 空值区分
  const statsDisplay = useMemo(() => {
    if (!profile?.osuId) return null;
    if (!profile.osuDetails) return { state: 'unsynced', label: '未同步' };
    const stats = profile.osuDetails[activeMode];
    if (stats === null || stats === undefined) return { state: 'unsynced', label: '未同步' };
    if (stats.pp === 0 && stats.rank === 0 && stats.playCount === 0) return { state: 'norank', label: '无名次' };
    return { state: 'loaded', label: '', data: stats };
  }, [profile, activeMode]);

  /** 构造 OAuth URL */
  const buildOsuAuthUrl = () => {
    const clientId = import.meta.env.VITE_OSU_CLIENT_ID || '49210';
    const redirectUri = encodeURIComponent(`${window.location.origin}/osu-callback`);
    const state = `${profile.username}_osu`;
    const scope = encodeURIComponent('identify public');
    return `https://osu.ppy.sh/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  };

  // ---------- 加载状态 ----------
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-pink-500/50" />
      </div>
    );
  }

  // ---------- 错误状态 ----------
  if (error || !profile) {
    return (
      <div className="w-full min-h-screen bg-[#0c0c11] flex items-center justify-center text-zinc-500">
        <FaExclamationCircle className="text-3xl mr-3" /> {error || '用户不存在'}
      </div>
    );
  }

  return (
    <>
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-pink-500/30 relative pb-24 overflow-x-hidden">

      {/* 环境光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-900/10 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-900/10 rounded-full blur-[140px] mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-20 relative z-10">

        {/* ====== Header 区域 ====== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-white/[0.05] pb-6">
          {/* 左侧：返回 + 玩家信息 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/profile/${profile.username}`)}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95"
            >
              <FaArrowLeft /> 返回主页
            </button>

            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                  <FaGamepad className="text-pink-500 text-xl md:text-2xl" /> osu!
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <FaUser className="text-zinc-600 text-xs" />
                  <span className="text-sm font-medium text-zinc-400">
                    {profile.osuUsername || profile.username}
                  </span>
                  {profile.countryCode && (
                    <CountryFlag code={profile.countryCode} size="sm" />
                  )}
                  {profile.osuId && (
                    <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                      已绑定
                    </span>
                  )}
                </div>
                {(profile.followerCount != null || profile.friendsCount != null) && (
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600 font-medium">
                    {profile.followerCount != null && (
                      <span>{profile.followerCount.toLocaleString()} 关注者</span>
                    )}
                    {profile.friendsCount != null && (
                      <span>{profile.friendsCount.toLocaleString()} 好友</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：模式切换 + 绑定/同步按钮 */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <OsuModeTabs activeMode={activeMode} onModeChange={setActiveMode} />

            {/* 绑定/同步按钮组 */}
            {isOwnProfile && (
              profile.osuId ? (
                <div className="flex gap-2">
                  <button
                    onClick={syncAll}
                    disabled={isSyncing}
                    className="flex-1 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 rounded-lg"
                  >
                    {isSyncing ? (
                      <><FaSpinner className="animate-spin" /> 同步中...</>
                    ) : (
                      <><FaSyncAlt /> 全模式同步</>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { window.location.href = buildOsuAuthUrl(); }}
                  className="w-full bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 rounded-lg"
                >
                  <FaLock /> 绑定 osu! 账号
                </button>
              )
            )}
          </div>
        </div>

        {/* 同步进度条 (F4) */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-[#15151e] border border-white/[0.05] rounded-lg p-3"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>同步进度：{syncProgress.completed}/{syncProgress.total} 模式完成</span>
                <span className={syncProgress.failed > 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {syncProgress.failed > 0 ? `${syncProgress.failed} 个失败` : '同步中...'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(syncProgress.completed / syncProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====== Token 过期提醒（需重新绑定）===== */}
        <AnimatePresence>
          {isOwnProfile && authError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <FaExclamationCircle className="text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-300">osu! 授权已过期</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    你的 osu! 账号授权已过期，需要重新绑定后才能同步最新数据。
                    重新绑定不会影响已有的成绩数据。
                  </p>
                  <button
                    onClick={() => { window.location.href = buildOsuAuthUrl(); }}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FaRedo /> 重新绑定 osu! 账号
                  </button>
                </div>
                <button onClick={clearAuthError}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                  <FaTimes size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====== 未绑定状态 ====== */}
        {!profile.osuId ? (
          <div className="py-20 flex flex-col items-center justify-center bg-[#15151e]/40 border border-white/[0.05] rounded-xl mt-6">
            <FaGamepad className="text-5xl text-zinc-700 mb-4" />
            <p className="text-zinc-500 font-medium mb-6">
              {isOwnProfile ? '你尚未绑定 osu! 官方账号' : '该玩家尚未绑定 osu! 官方账号'}
            </p>
            {isOwnProfile && (
              <button
                onClick={() => { window.location.href = buildOsuAuthUrl(); }}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all active:scale-95 flex items-center gap-2 rounded-xl"
              >
                <FaLock /> 立即绑定
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ====== 统计卡片 2×3 紧凑版 ====== */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <StatCard
                icon={<FaGlobe />}
                label="全球排名"
                value={statsDisplay?.state === 'loaded' ? `#${statsDisplay.data.rank?.toLocaleString()}` : null}
                emptyState={statsDisplay?.state}
              />
              <StatCard
                icon={<FaMapMarkerAlt />}
                label="地区排名"
                value={statsDisplay?.state === 'loaded' ? `#${statsDisplay.data.countryRank?.toLocaleString()}` : null}
                emptyState={statsDisplay?.state}
              />
              <StatCard
                icon={null}
                label="Performance"
                value={statsDisplay?.state === 'loaded' ? `${Math.round(statsDisplay.data.pp).toLocaleString()} pp` : null}
                emptyState={statsDisplay?.state}
                accent
              />
              <StatCard
                icon={<FaPlay />}
                label="游玩次数"
                value={statsDisplay?.state === 'loaded' ? statsDisplay.data.playCount?.toLocaleString() : null}
                emptyState={statsDisplay?.state}
              />
              <StatCard
                icon={<FaClock />}
                label="游戏时长"
                value={statsDisplay?.state === 'loaded' && statsDisplay.data.playTime != null
                  ? `${Math.floor(statsDisplay.data.playTime / 3600)}h`
                  : null}
                emptyState={statsDisplay?.state}
              />
              <StatCard
                icon={<FaEye />}
                label="回放观看"
                value={statsDisplay?.state === 'loaded' && statsDisplay.data.replaysWatched != null
                  ? statsDisplay.data.replaysWatched?.toLocaleString()
                  : null}
                emptyState={statsDisplay?.state}
              />
            </div>

            {/* ====== Badges 徽章行 ====== */}
            {profile.badges?.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-pink-400/60 rounded-full" />
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    荣誉徽章
                  </span>
                  <span className="text-[10px] text-zinc-700">({profile.badges.length})</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {profile.badges.map((badge, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 flex items-center gap-2 bg-[#15151e]/60 border border-white/[0.04] rounded-lg px-2.5 py-1.5"
                      title={badge.description}
                    >
                      <img
                        src={badge.image_url}
                        alt={badge.description}
                        className="w-8 h-8 rounded object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-400 truncate max-w-[160px]">
                          {badge.description}
                        </div>
                        {badge.awarded_at && (
                          <div className="text-[9px] text-zinc-700 mt-0.5">
                            {new Date(badge.awarded_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====== 排名趋势 ====== */}
            {statsDisplay?.state === 'loaded' && statsDisplay.data.rankHistory?.length >= 2 && (
              <div className="mb-8">
                <RankHistoryChart data={statsDisplay.data.rankHistory} width={600} />
              </div>
            )}
            {statsDisplay?.state !== 'loaded' && profile.rankHistory?.length >= 2 && (
              <div className="mb-8">
                <RankHistoryChart data={profile.rankHistory} width={600} />
              </div>
            )}

            {/* ====== BP 列表 ====== */}
            <div className="mb-16">
              <div className="flex items-center gap-3 border-b border-white/[0.05] pb-3 mb-4">
                <div className="w-1 h-5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                  Best Performance
                </h2>
                <span className="text-xs text-zinc-600 font-medium">
                  BP {currentModeScores.length}
                </span>
              </div>

              {currentModeScores.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 font-medium bg-[#15151e]/40 rounded-xl border border-white/[0.05]">
                  <FaPlay className="mx-auto text-2xl mb-3 text-zinc-700" />
                  该模式下暂无成绩记录<br/>
                  <span className="text-xs">请先在游戏中打出成绩后点击同步</span>
                </div>
              ) : (
                // 虚拟滚动 (F3)
                <div className="bg-[#15151e]/40 rounded-xl border border-white/[0.05] overflow-hidden">
                  <Virtuoso
                    style={{ height: '70vh', minHeight: 400 }}
                    totalCount={currentModeScores.length}
                    itemContent={(index) => (
                      <ScoreRow
                        score={currentModeScores[index]}
                        rank={index + 1}
                        onClick={() => setSelectedScore(currentModeScores[index])}
                      />
                    )}
                    overscan={5}
                    components={{
                      Header: () => (
                        <div className="sticky top-0 bg-[#15151e]/95 backdrop-blur-sm z-10 flex items-center px-3 py-2 text-xs text-zinc-500 font-bold uppercase tracking-wider border-b border-white/[0.05]">
                          <span className="w-10 text-center">#</span>
                          <span className="w-14" />
                          <span className="w-10 text-center">评级</span>
                          <span className="flex-1 min-w-0">曲名</span>
                          <span className="w-24 text-right">PP</span>
                          <span className="w-20 text-right hidden sm:block">Acc</span>
                        </div>
                      ),
                      EmptyPlaceholder: () => null,
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>

      <AnimatePresence>
        {selectedScore && (
          <OsuScoreDetailPanel
            key="detail-panel"
            score={selectedScore}
            onClose={() => setSelectedScore(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ----- 子组件 -----

/** 统计卡片 */
function StatCard({ icon, label, value, emptyState, accent = false }) {
  const emptyContent = {
    unsynced: { icon: <FaSpinner className="animate-spin text-zinc-600" />, text: '未同步' },
    norank: { icon: <FaLock className="text-zinc-600" />, text: '无名次' },
  };

  const isEmpty = emptyState && emptyState !== 'loaded';

  return (
    <div className="bg-[#15151e] border border-white/[0.05] rounded-lg p-4 flex flex-col justify-center">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
        {icon} {label}
      </span>
      {isEmpty ? (
        <div className="flex items-center gap-2 text-zinc-600 text-sm">
          {emptyContent[emptyState]?.icon}
          <span>{emptyContent[emptyState]?.text}</span>
        </div>
      ) : (
        <span className={`text-xl font-bold ${accent ? 'text-pink-400' : 'text-zinc-100'}`}>
          {value || '-'}
        </span>
      )}
    </div>
  );
}

/** 单条成绩行 */
function ScoreRow({ score, rank, onClick }) {
  const modsStr = score.mods?.length > 0 ? `+${score.mods.join('')}` : '';
  const accuracy = typeof score.accuracy === 'number'
    ? score.accuracy.toFixed(2)
    : score.accuracy;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] hover:cursor-pointer transition-colors group"
    >
      {/* 排名 */}
      <span className="w-10 text-center text-sm font-mono text-zinc-600 shrink-0">
        #{rank}
      </span>

      {/* 封面 — F5: OsuCoverImage */}
      <div className="w-12 h-9 shrink-0 rounded overflow-hidden">
        <OsuCoverImage
          src={score.coverUrl}
          alt={score.title}
          className="w-full h-full"
        />
      </div>

      {/* 评级 */}
      <div className="w-10 text-center shrink-0">
        <OsuGrade grade={score.grade} size="sm" />
      </div>

      {/* 曲名 + 版本 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-zinc-200 truncate group-hover:text-pink-300 transition-colors">
          {score.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-bold text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {score.version}
          </span>
          {modsStr && (
            <span className="text-[9px] font-bold text-rose-400 tracking-widest bg-rose-500/10 px-1 py-0.5 rounded">
              {modsStr}
            </span>
          )}
        </div>
      </div>

      {/* PP */}
      <div className="w-24 text-right shrink-0">
        <span className="text-base font-bold text-pink-400">
          {Math.round(score.pp)}
        </span>
        <span className="text-[9px] text-pink-500/60 ml-0.5">pp</span>
      </div>

      {/* Acc — 桌面端显示 */}
      <div className="w-20 text-right shrink-0 hidden sm:block">
        <span className="text-xs text-zinc-400 font-medium">
          {accuracy}%
        </span>
      </div>
    </motion.div>
  );
}
