// ============================================================
// QualifierRanking.jsx — 预选赛排名榜 + 3D曲卡舞台 + Cut Line
// P2 组件 | 视觉参考：Qualifiers.jsx（3D曲卡舞台风格）
// 业务逻辑不变（排行/晋级/导出/Cut Line）
// ============================================================
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQualifierStore } from '../../store/qualifierStore';
import {
  FaMedal, FaSpinner, FaDownload, FaArrowRight,
  FaTrophy, FaClock
} from 'react-icons/fa';

// ---- 常量 ----
const RANK_COLORS = {
  1: 'from-yellow-500/20 to-transparent border-yellow-500/30 text-yellow-400',
  2: 'from-zinc-400/15 to-transparent border-zinc-400/25 text-zinc-300',
  3: 'from-orange-700/15 to-transparent border-orange-700/25 text-orange-400',
};

const SONG_MEDALS = [
  { label: '预选主打曲', icon: '★', color: 'text-amber-400' },
  { label: '预选副曲 A', icon: '◆', color: 'text-cyan-400' },
  { label: '预选副曲 B', icon: '●', color: 'text-purple-400' },
];

// ---- 子组件：倒计时 ----
const CountdownBlock = ({ ms, label }) => {
  if (ms <= 0) return null;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((ms % (1000 * 60)) / 1000);

  const isUrgent = d === 0 && h < 6;

  return (
    <div className="text-center mb-8 md:mb-12">
      <h2 className="text-xs md:text-sm font-bold text-zinc-500 tracking-widest mb-3 uppercase">
        {label}
      </h2>
      <div className={`text-3xl md:text-5xl font-mono font-bold tracking-tight ${isUrgent ? 'text-red-400' : 'text-zinc-100'}`}>
        {d}天 {h}时 {m}分 {s}秒
      </div>
    </div>
  );
};

// ---- 自定义 Hook：监听窗口大小 ----
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
  });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

// ---- 子组件：3D 曲卡舞台 ----
const SongCardStage = ({ songs = [], status }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isHidden = status === 'pending' || status === 'loading';

  // 取前 3 首展示
  const displaySongs = songs.slice(0, 3);
  // 不足3首时补齐占位
  while (displaySongs.length < 3) {
    displaySongs.push({ songName: '待定曲目', artist: '???', isPlaceholder: true });
  }

  const positions = ['left', 'center', 'right'];
  const coverFallback = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%2318181c%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%22150%22 y=%22155%22 text-anchor=%22middle%22 font-size=%2260%22 fill=%22%23333%22%3E%3F%3C/text%3E%3C/svg%3E';

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[240px] md:h-[420px] flex justify-center items-center mb-8 md:mb-16 perspective-[1000px]">
      {positions.map((pos, i) => {
        const s = displaySongs[i];
        const isCenter = pos === 'center';
        const xOffset = isMobile
          ? (pos === 'left' ? -130 : pos === 'right' ? 130 : 0)
          : (pos === 'left' ? -340 : pos === 'right' ? 340 : 0);

        const variants = {
          center: {
            x: 0, scale: isMobile ? 0.85 : 1.1, zIndex: 30,
            rotateY: 0, filter: 'brightness(1)', opacity: 1,
          },
          left: {
            x: xOffset, scale: isMobile ? 0.65 : 0.9,
            zIndex: 20, rotateY: isMobile ? 15 : 20,
            filter: 'brightness(0.45)', opacity: 0.55,
          },
          right: {
            x: xOffset, scale: isMobile ? 0.65 : 0.9,
            zIndex: 20, rotateY: isMobile ? -15 : -20,
            filter: 'brightness(0.45)', opacity: 0.55,
          },
        };

        const displayTitle = isHidden || s.isPlaceholder ? '未解禁曲目' : s.songName;
        const displayArtist = isHidden || s.isPlaceholder ? '???' : (s.artist || 'Unknown');
        const coverUrl = s.isPlaceholder ? coverFallback : (s.coverUrl || coverFallback);

        return (
          <motion.div
            key={pos}
            initial={{ opacity: 0, y: 30 }}
            animate={{ y: 0, ...variants[pos] }}
            transition={{ delay: i * 0.15, duration: 0.8, ease: 'easeOut' }}
            className={`absolute flex flex-col items-center gap-3 md:gap-4 ${isCenter ? 'cursor-default' : 'cursor-pointer'}`}
            style={{ transformStyle: 'preserve-3d', width: isMobile ? '140px' : '280px' }}
          >
            {/* 曲绘 */}
            <div className="relative w-[140px] h-[140px] md:w-[280px] md:h-[280px] rounded-2xl shadow-2xl overflow-hidden bg-[#18181c] border border-white/[0.05]">
              <AnimatePresence mode="wait">
                {isHidden || s.isPlaceholder ? (
                  <motion.div
                    key="hidden"
                    className="w-full h-full flex flex-col items-center justify-center bg-[#141418] border border-white/[0.02]"
                  >
                    <span className="text-5xl md:text-7xl font-bold text-zinc-800">?</span>
                    {!isHidden && isCenter && (
                      <span className="absolute bottom-2 text-[10px] text-zinc-700 font-medium">即将解禁</span>
                    )}
                  </motion.div>
                ) : (
                  <motion.img
                    key="revealed"
                    src={coverUrl}
                    alt="Song Jacket"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </AnimatePresence>

              {/* 中心曲目标签 */}
              {isCenter && !isHidden && !s.isPlaceholder && (
                <div className={`absolute top-2 right-2 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 ${SONG_MEDALS[0].color}`}>
                  {SONG_MEDALS[0].icon} {SONG_MEDALS[0].label}
                </div>
              )}
            </div>

            {/* 文字 */}
            <div className="text-center w-full px-1 space-y-1">
              <div className="text-sm md:text-lg font-bold text-zinc-100 tracking-tight truncate max-w-[140px] md:max-w-[280px]">
                {displayTitle}
              </div>
              <div className="text-[11px] md:text-sm font-medium text-zinc-500 truncate max-w-[140px] md:max-w-[280px]">
                {displayArtist}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ---- 主组件 ----
const QualifierRanking = ({
  tournamentId,
  advanceCount,
  isManager = false,
  onAdvance,
  qualifierSongs = [],
  qualifierStart,
  qualifierEnd,
}) => {
  const {
    rankings, cutoff, cutoffScore, loading, error,
    fetchRankings, advance, exportCSV,
  } = useQualifierStore();

  const [advancing, setAdvancing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [qualifierStatus, setQualifierStatus] = useState('loading'); // 'pending' | 'active' | 'ended'
  const [timeLeft, setTimeLeft] = useState(0);

  // ---- 加载排名 ----
  useEffect(() => {
    if (tournamentId) {
      fetchRankings(tournamentId, advanceCount);
    }
  }, [tournamentId, advanceCount, fetchRankings]);

  // ---- 实时倒计时 ----
  useEffect(() => {
    if (!qualifierStart && !qualifierEnd) return;

    const startTime = new Date(qualifierStart).getTime();
    const endTime = new Date(qualifierEnd).getTime();
    if (isNaN(startTime) || isNaN(endTime)) return;

    const tick = () => {
      const now = Date.now();
      if (now < startTime) {
        setQualifierStatus('pending');
        setTimeLeft(startTime - now);
      } else if (now >= startTime && now < endTime) {
        setQualifierStatus('active');
        setTimeLeft(endTime - now);
      } else {
        setQualifierStatus('ended');
        setTimeLeft(0);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [qualifierStart, qualifierEnd]);

  // ---- 操作处理 ----
  const handleAdvance = async () => {
    if (!window.confirm(`确认将排名前 ${cutoff} 名选手晋级正赛？`)) return;
    setAdvancing(true);
    try {
      await advance(tournamentId);
      onAdvance?.();
    } catch (err) {
      console.error('晋级推进失败', err);
    } finally {
      setAdvancing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCSV(tournamentId);
    } catch (err) {
      console.error('导出失败', err);
    } finally {
      setExporting(false);
    }
  };

  // ---- 排序榜单 ----
  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => {
      const achA = Number(a.total || a.totalAchievement || 0);
      const achB = Number(b.total || b.totalAchievement || 0);
      if (Math.abs(achB - achA) > 0.0001) return achB - achA;
      return (b.totalDxScore || b.dxScore || 0) - (a.totalDxScore || a.dxScore || 0);
    });
  }, [rankings]);

  const qualifiedCount = rankings.filter(r => r.rank <= cutoff).length;

  // ---- Loading ----
  if (loading && rankings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <FaSpinner className="animate-spin text-3xl text-purple-400" />
      </div>
    );
  }

  // ---- Error ----
  if (error && rankings.length === 0) {
    return (
      <div className="text-red-400 text-center py-10 text-sm bg-red-500/5 border border-red-500/10 rounded-2xl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ 1. 倒计时抬头 ═══ */}
      {qualifierStart && qualifierEnd && (
        <>
          {qualifierStatus === 'pending' && (
            <CountdownBlock ms={timeLeft} label="距离预选赛开启还有" />
          )}
          {qualifierStatus === 'active' && (
            <CountdownBlock ms={timeLeft} label="距离预选赛结束还有" />
          )}
          {qualifierStatus === 'ended' && (
            <div className="text-center mb-8 md:mb-12">
              <div className="text-xs md:text-sm font-bold text-zinc-500 tracking-widest mb-3 uppercase">
                预选阶段已结束
              </div>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <FaClock className="text-lg" />
                <span className="text-lg md:text-xl font-bold">等待晋级结果公布</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ 2. 3D 曲卡舞台 ═══ */}
      <SongCardStage songs={qualifierSongs} status={qualifierStatus} />

      {/* ═══ 3. 头部信息栏（排名 + 管理操作） ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-white/[0.05] flex items-center justify-center text-amber-400 shadow-sm">
            <FaTrophy className="text-lg" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">预选赛阶段积分榜</h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {rankings.length} 位选手 · 晋级线 {cutoff} 名{cutoffScore ? ` · 线分 ${cutoffScore.toFixed(2)}` : ''}
            </p>
          </div>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || rankings.length === 0}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 border border-white/[0.05]"
            >
              {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              <span className="hidden sm:inline">导出 CSV</span>
            </button>
            <button
              onClick={handleAdvance}
              disabled={advancing || qualifiedCount === 0}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-purple-600/20"
            >
              {advancing ? <FaSpinner className="animate-spin" /> : <FaArrowRight />}
              确认晋级 ({qualifiedCount})
            </button>
          </div>
        )}
      </div>

      {/* ═══ 4. 排名榜单 ═══ */}
      {sortedRankings.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 bg-[#18181c] border border-white/[0.05] rounded-2xl text-sm font-medium flex flex-col items-center justify-center shadow-sm">
          <FaClock className="text-3xl mb-3 opacity-20" />
          暂无选手成绩录入
        </div>
      ) : (
        <div className="space-y-1">
          {/* 表头 */}
          <div className="flex items-center text-zinc-500 text-xs font-semibold px-4 md:px-6 pb-2">
            <div className="w-12 md:w-16 text-center shrink-0">排名</div>
            <div className="flex-1 pl-2">选手信息</div>
            <div className="w-24 md:w-32 text-right shrink-0">总达成率</div>
            <div className="w-20 md:w-28 text-right shrink-0 pr-2">DX 总分</div>
          </div>

          <AnimatePresence initial={false}>
            {sortedRankings.map((player, idx) => {
              const actualRank = idx + 1;
              const isTop3 = actualRank <= 3;
              const isQualified = actualRank <= cutoff;
              const isCutLine = actualRank === cutoff;
              const isFirstEliminated = actualRank === cutoff + 1;
              const rankColor = RANK_COLORS[actualRank] || '';

              return (
                <div key={player.userId || player._id || idx}>
                  {/* Cut Line 分隔线 */}
                  {isFirstEliminated && cutoff > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      className="flex items-center gap-3 my-3"
                    >
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 whitespace-nowrap px-3 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                        ── 晋级线 ──
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                    </motion.div>
                  )}

                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                    className={`flex items-center px-4 md:px-6 py-3 md:py-4 rounded-2xl border transition-all cursor-pointer ${
                      isTop3
                        ? (rankColor || 'bg-[#18181c] border-white/[0.05] hover:bg-[#1a1a20] shadow-sm')
                        : isQualified
                          ? 'bg-purple-500/[0.04] border-purple-500/15 hover:bg-purple-500/[0.08]'
                          : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                    }`}
                    onClick={() => {
                      const uname = player.username || player.userId;
                      if (uname) window.location.href = `/profile/${uname}`;
                    }}
                  >
                    {/* 排名 */}
                    <div className="w-12 md:w-16 flex justify-center shrink-0">
                      {isTop3 ? (
                        <FaMedal className={`text-2xl ${
                          actualRank === 1 ? 'text-amber-400' :
                          actualRank === 2 ? 'text-zinc-300' :
                          'text-[#b87333]'
                        }`} />
                      ) : (
                        <span className={`font-bold text-sm ${isQualified ? 'text-purple-400' : 'text-zinc-500'}`}>
                          #{actualRank}
                        </span>
                      )}
                    </div>

                    {/* 头像 + 玩家信息 */}
                    <div className="flex-1 flex items-center gap-3 pl-2 truncate min-w-0">
                      <img
                        src={player.avatarUrl || '/assets/logos.png'}
                        alt=""
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover bg-black border border-white/10 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-sm md:text-lg text-zinc-100 truncate block">
                          {player.username || player.userId}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                          进度 <span className={player.scoreCount >= 3 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {player.scoreCount || player.playCount || 0} / 3
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* 总达成率 */}
                    <div className="w-24 md:w-32 text-right shrink-0">
                      <div className="font-mono text-sm md:text-lg text-amber-400 font-bold">
                        {Number(player.total || player.totalAchievement || 0).toFixed(4)}%
                      </div>
                      {isQualified && (
                        <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">晋级</div>
                      )}
                    </div>

                    {/* 总 DX 分数 */}
                    <div className="w-20 md:w-28 text-right shrink-0 font-mono text-sm md:text-lg text-zinc-200 font-bold pr-2">
                      {player.totalDxScore || player.dxScore || 0}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default QualifierRanking;
