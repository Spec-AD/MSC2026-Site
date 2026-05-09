// ============================================================
// OsuProfile — 重建版（b1.7）
// 紧凑布局 · 虚拟滚动 · 全模式同步 · 懒加载封面
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaGamepad, FaSpinner, FaSyncAlt,
  FaLock, FaGlobe, FaMapMarkerAlt, FaPlay, FaUser,
  FaExclamationCircle, FaRedo, FaTimes,
  FaClock, FaEye,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getUserProfile } from '../api/osuApi';
import useOsuSync from '../hooks/useOsuSync';
import OsuModeTabs from '../components/OsuModeTabs';
import RankHistoryChart from '../components/RankHistoryChart';
import CountryFlag from '../components/CountryFlag';
import { getOsuInfo } from '../api/osuApi';

// ====== 全球排名颜色分层 (清音 §14.1) ======
/** 各模式总游玩人数 (清音 §14.1 参考表) */
const MODE_PLAYER_TOTAL = { standard: 3250000, taiko: 386990, catch: 287200, mania: 1007800 };

/**
 * 全球排名颜色分层 — 返回文字颜色/渐变的 class
 */
function getRankColor(rank, mode = 'standard') {
  if (rank == null || rank <= 0) return '';
  if (rank <= 100) return 'bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent';
  const total = MODE_PLAYER_TOTAL[mode] || 1000000;
  const pct = rank / total;
  if (pct <= 0.0005) return 'bg-gradient-to-r from-purple-500 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent';
  if (pct <= 0.0015) return 'text-emerald-400';
  if (pct <= 0.005) return 'text-sky-400';
  if (pct <= 0.015) return 'text-yellow-500';
  if (pct <= 0.05) return 'text-zinc-300';
  if (pct <= 0.15) return 'text-amber-700';
  return '';
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMode, setActiveMode] = useState('standard');
  const [chartWidth, setChartWidth] = useState(600);
  const chartContainerRef = useRef(null);

  const { syncState, isSyncing, syncProgress, syncAll, authError, clearAuthError } = useOsuSync();

  const isOwnProfile = profile && currentUser &&
    (profile.username?.toLowerCase() === currentUser.username?.toLowerCase());

  // 跟踪图表容器宽度（全宽自适应）
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const measure = () => setChartWidth(el.clientWidth || 600);
    measure();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener('resize', measure);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
    };
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
            profile.coverUrl = oi.coverUrl || oi.cover?.url || profile.coverUrl || null;
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
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-osu selection:bg-pink-500/30 relative pb-24 overflow-x-hidden">

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

        {/* ====== 官方风格 Banner ====== */}
        <div className="relative mb-6 rounded-xl overflow-hidden border border-white/[0.05] h-44 md:h-56">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="osu profile banner"
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f17]/90 via-[#0f0f17]/65 to-[#0f0f17]/92" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-transparent to-transparent" />

          <div className="relative z-10 h-full flex items-end p-4 md:p-5">
            <div className="flex items-end gap-3 md:gap-4 min-w-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-white/15 bg-zinc-800 shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.osuUsername || profile.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-400 uppercase tracking-[0.18em] mb-1">osu! profile</div>
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-lg md:text-2xl font-bold text-zinc-100 truncate min-w-0">
                    {profile.osuUsername || profile.username}
                  </h2>
                  {profile.countryCode && (
                    <CountryFlag code={profile.countryCode} size="sm" className="shrink-0" />
                  )}
                </div>
              </div>
            </div>
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
                value={(() => {
                  if (statsDisplay?.state !== 'loaded') return null;
                  const rank = statsDisplay.data.rank;
                  const colorClass = getRankColor(rank, activeMode);
                  const fmt = `#${rank?.toLocaleString()}`;
                  if (!colorClass) return fmt;
                  return <span className={`${colorClass} font-bold`}>{fmt}</span>;
                })()}
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

            {/* ====== 排名趋势（半屏图表 + 右侧占位） ====== */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div ref={chartContainerRef} className="min-h-[160px] min-w-0">
                {statsDisplay?.state === 'loaded' && statsDisplay.data.rankHistory?.length >= 2 ? (
                  <RankHistoryChart data={statsDisplay.data.rankHistory} width={chartWidth} />
                ) : profile.rankHistory?.length >= 2 ? (
                  <RankHistoryChart data={profile.rankHistory} width={chartWidth} />
                ) : null}
              </div>

              {/* 右侧占位面板（按要求先占位） */}
              <div className="min-h-[160px] rounded-lg border border-white/[0.05] bg-[#15151e]/60 flex items-center justify-center">
                <span className="text-xs text-zinc-600">右侧占位区域</span>
              </div>
            </div>

          </>
        )}
      </div>
    </div>

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

