// ============================================================
// QualifierRanking.jsx — 预选赛排名榜 + 3D曲卡舞台（可选曲）
// P2 组件 | 2026-04-30 新增：可点击选曲 + 单曲排行榜 + DX★
// ============================================================
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQualifierStore } from '../../store/qualifierStore';
import {
  FaMedal, FaSpinner, FaDownload, FaArrowRight,
  FaTrophy, FaClock, FaMusic
} from 'react-icons/fa';

// ---- 常量 ----
const RANK_COLORS = {
  1: 'from-yellow-500/20 to-transparent border-yellow-500/30 text-yellow-400',
  2: 'from-zinc-400/15 to-transparent border-zinc-400/25 text-zinc-300',
  3: 'from-orange-700/15 to-transparent border-orange-700/25 text-orange-400',
};

const SONG_LABELS = [
  { icon: '★', label: '预选主打曲', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  { icon: '◆', label: '预选副曲 A', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' },
  { icon: '●', label: '预选副曲 B', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
];

// ---- 自定义 Hook：监听窗口大小 ----
const useWindowSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
  });
  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return size;
};

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
      <h2 className="text-xs md:text-sm font-bold text-zinc-500 tracking-widest mb-3 uppercase">{label}</h2>
      <div className={`text-3xl md:text-5xl font-mono font-bold tracking-tight ${isUrgent ? 'text-red-400' : 'text-zinc-100'}`}>
        {d}天 {h}时 {m}分 {s}秒
      </div>
    </div>
  );
};

// ---- 子组件：DX 星级 ----
const DxStarIcons = ({ dxStar }) => {
  const star = dxStar ?? 0;
  if (star <= 0 || star > 5) return null;
  return (
    <img
      src={`/assets/${star}dxstar.png`}
      alt={`${star}★`}
      className="inline-block w-6 h-6 md:w-7 md:h-7 object-contain flex-shrink-0"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
};
// （确保导入已包含必要的 React 依赖）
// ---- 子组件：3D 曲卡舞台（可选曲版） ----
const SongCardStage = ({ songs = [], status, selectedIndex, onCardClick }) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isHidden = status === 'pending' || status === 'loading';

  const displaySongs = songs.slice(0, 3);
  while (displaySongs.length < 3) {
    displaySongs.push({ songName: '待定曲目', artist: '???', isPlaceholder: true });
  }

  // 根据 selectedIndex 重排: [left, center, right]
  // null/0 → [1,0,2]  1→[0,1,2]  2→[0,2,1]
  const songOrder = useMemo(() => {
    if (selectedIndex === null || selectedIndex === 0) return [1, 0, 2];
    if (selectedIndex === 1) return [0, 1, 2];
    return [0, 2, 1];
  }, [selectedIndex]);

  const coverFallback = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%2318181c%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%22150%22 y=%22155%22 text-anchor=%22middle%22 font-size=%2260%22 fill=%22%23333%22%3E%3F%3C/text%3E%3C/svg%3E';

  const handleClick = useCallback((songIdx) => {
    if (isHidden) return;
    if (songIdx === selectedIndex) {
      // 点击中心卡 → 回到总榜
      onCardClick(null);
    } else {
      onCardClick(songIdx);
    }
  }, [isHidden, selectedIndex, onCardClick]);

  const positions = ['left', 'center', 'right'];

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[240px] md:h-[420px] flex justify-center items-center mb-8 md:mb-16 perspective-[1000px]">
      {positions.map((pos, posIdx) => {
        const i = songOrder[posIdx];
        const s = displaySongs[i];
        const isCenter = pos === 'center';
        const isSelected = i === selectedIndex;

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

        // 高亮选中卡的明亮度
        const animVariant = { ...variants[pos] };
        if (isSelected && isCenter) {
          animVariant.filter = 'brightness(1.05)';
          animVariant.scale = isMobile ? 0.9 : 1.15;
        }

        const displayTitle = isHidden || s.isPlaceholder ? '未解禁曲目' : s.songName;
        const displayArtist = isHidden || s.isPlaceholder ? '???' : (s.artist || 'Unknown');
        const coverUrl = s.isPlaceholder ? coverFallback : (s.coverUrl || coverFallback);
        const label = SONG_LABELS[i];

        return (
          <motion.div
            key={`${i}-${selectedIndex}`}
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ y: 0, ...animVariant }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute flex flex-col items-center gap-3 md:gap-4 transition-none`}
            style={{ transformStyle: 'preserve-3d', width: isMobile ? '140px' : '280px' }}
            onClick={() => handleClick(i)}
          >
            {/* 曲绘 */}
            <div className={`relative w-[140px] h-[140px] md:w-[280px] md:h-[280px] rounded-2xl shadow-2xl overflow-hidden bg-[#18181c] border transition-all duration-500 cursor-pointer
              ${isCenter ? (isSelected ? 'border-amber-500/40 shadow-amber-500/20' : 'border-white/[0.05]') : 'border-white/[0.02]'}
              hover:border-white/[0.15]`}
            >
              <AnimatePresence mode="wait">
                {isHidden || s.isPlaceholder ? (
                  <motion.div
                    key="hidden"
                    className="w-full h-full flex flex-col items-center justify-center bg-[#141418]"
                  >
                    <span className="text-5xl md:text-7xl font-bold text-zinc-800">?</span>
                  </motion.div>
                ) : (
                  <motion.img
                    key="revealed"
                    src={coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </AnimatePresence>

              {/* 光泽叠加 */}
              {!isHidden && !s.isPlaceholder && isCenter && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              )}

              {/* 中心曲目标签 */}
              {isCenter && !isHidden && !s.isPlaceholder && (
                <div className={`absolute top-2 right-2 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 ${label.color}`}>
                  {label.icon} {isSelected ? label.label : '当前选中'}
                </div>
              )}
            </div>

            {/* 文字 */}
            <div className="text-center w-full px-1 space-y-1 cursor-pointer">
              <div className={`text-sm md:text-lg font-bold tracking-tight truncate max-w-[140px] md:max-w-[280px] transition-colors ${
                isCenter ? (isSelected ? 'text-amber-200' : 'text-zinc-100') : 'text-zinc-400'
              }`}>
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

// ---- DX 星级阈值 ----
const calcDxStar = (achievement) => {
  if (achievement >= 97) return 5;
  if (achievement >= 95) return 4;
  if (achievement >= 93) return 3;
  if (achievement >= 90) return 2;
  if (achievement >= 85) return 1;
  return 0;
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
  const [qualifierStatus, setQualifierStatus] = useState('loading');
  const [timeLeft, setTimeLeft] = useState(0);

  // 选曲状态: null=总榜, 0/1/2=对应单曲
  const [selectedIndex, setSelectedIndex] = useState(null);

  // ---- 加载排名 ----
  useEffect(() => {
    if (tournamentId) fetchRankings(tournamentId, advanceCount);
  }, [tournamentId, advanceCount, fetchRankings]);

  // ---- 实时倒计时 ----
  useEffect(() => {
    if (!qualifierStart && !qualifierEnd) return;
    const startTime = new Date(qualifierStart).getTime();
    const endTime = new Date(qualifierEnd).getTime();
    if (isNaN(startTime) || isNaN(endTime)) return;
    const tick = () => {
      const now = Date.now();
      if (now < startTime) { setQualifierStatus('pending'); setTimeLeft(startTime - now); }
      else if (now < endTime) { setQualifierStatus('active'); setTimeLeft(endTime - now); }
      else { setQualifierStatus('ended'); setTimeLeft(0); }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [qualifierStart, qualifierEnd]);

  // ---- 选曲点击 ----
  const handleCardClick = useCallback((idx) => {
    setSelectedIndex(idx);
  }, []);

  // ---- 歌曲标签切换 ----
  const activeView = selectedIndex !== null ? `song-${selectedIndex}` : 'total';

  // ---- 操作处理 ----
  const handleAdvance = async () => {
    if (!window.confirm(`确认将排名前 ${cutoff} 名选手晋级正赛？`)) return;
    setAdvancing(true);
    try { await advance(tournamentId); onAdvance?.(); }
    catch (err) { console.error('晋级推进失败', err); }
    finally { setAdvancing(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportCSV(tournamentId); }
    catch (err) { console.error('导出失败', err); }
    finally { setExporting(false); }
  };

  // ---- 总榜排序 ----
  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => {
      const achA = Number(a.total || a.totalAchievement || 0);
      const achB = Number(b.total || b.totalAchievement || 0);
      if (Math.abs(achB - achA) > 0.0001) return achB - achA;
      return (b.totalDxScore || b.dxScore || 0) - (a.totalDxScore || a.dxScore || 0);
    });
  }, [rankings]);

  const qualifiedCount = rankings.filter(r => r.rank <= cutoff).length;

  // ---- 从 songBreakdown 中提取当前选中曲目的排行 ----
  // 后端已排好序 + 算好 dxStar，前端直接用
  const currentSongBreakdown = useMemo(() => {
    if (selectedIndex === null || songBreakdown.length === 0) return null;
    const songData = songBreakdown[selectedIndex];
    if (!songData?.rankings) return null;
    return songData.rankings;
  }, [selectedIndex, songBreakdown]);

  // ---- Loading ----
  if (loading && rankings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <FaSpinner className="animate-spin text-3xl text-purple-400" />
      </div>
    );
  }

  if (error && rankings.length === 0) {
    return (
      <div className="text-red-400 text-center py-10 text-sm bg-red-500/5 border border-red-500/10 rounded-2xl">
        {error}
      </div>
    );
  }

  const hasSongBreakdown = songBreakdown.length > 0;

  return (
    <div className="space-y-6">
      {/* ═══ 1. 倒计时抬头 ═══ */}
      {qualifierStart && qualifierEnd && (
        <>
          {qualifierStatus === 'pending' && <CountdownBlock ms={timeLeft} label="距离预选赛开启还有" />}
          {qualifierStatus === 'active' && <CountdownBlock ms={timeLeft} label="距离预选赛结束还有" />}
          {qualifierStatus === 'ended' && (
            <div className="text-center mb-8 md:mb-12">
              <div className="text-xs md:text-sm font-bold text-zinc-500 tracking-widest mb-3 uppercase">预选阶段已结束</div>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <FaClock className="text-lg" />
                <span className="text-lg md:text-xl font-bold">等待晋级结果公布</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ 2. 3D 曲卡舞台（可选曲版） ═══ */}
      <SongCardStage
        songs={qualifierSongs}
        status={qualifierStatus}
        selectedIndex={selectedIndex}
        onCardClick={handleCardClick}
      />

      {/* ═══ 3. 榜单切换标签 ═══ */}
      {hasSongBreakdown && qualifierSongs.length >= 1 && (
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
          <button
            onClick={() => setSelectedIndex(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeView === 'total'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-zinc-800/50 text-zinc-400 border-transparent hover:border-white/10'
            }`}
          >
            <FaTrophy className="inline mr-1.5 text-[11px]" />
            总榜（三首合计）
          </button>
          {qualifierSongs.slice(0, 3).map((song, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeView === `song-${i}`
                  ? SONG_LABELS[i].bg + ' ' + SONG_LABELS[i].color
                  : 'bg-zinc-800/50 text-zinc-400 border-transparent hover:border-white/10'
              }`}
            >
              <FaMusic className="inline mr-1.5 text-[11px]" />
              {song.songName?.length > 6 ? song.songName.slice(0, 6) + '…' : (song.songName || `曲${i + 1}`)}
            </button>
          ))}
        </div>
      )}

      {/* ═══ 4. 头部信息栏 ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-white/[0.05] flex items-center justify-center text-amber-400 shadow-sm">
            <FaTrophy className="text-lg" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">
              {activeView === 'total' ? '预选赛阶段积分榜' : `${qualifierSongs[selectedIndex]?.songName || `曲目 ${selectedIndex + 1}`} 成绩`}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {activeView === 'total'
                ? `${rankings.length} 位选手 · 晋级线 ${cutoff} 名${cutoffScore ? ` · 线分 ${cutoffScore.toFixed(2)}` : ''}`
                : `${currentSongBreakdown?.length || 0} 位选手 · 单曲排行`
              }
            </p>
          </div>
        </div>
        {isManager && activeView === 'total' && (
          <div className="flex items-center gap-2">
            <button onClick={handleExport} disabled={exporting || rankings.length === 0}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 border border-white/[0.05]">
              {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              <span className="hidden sm:inline">导出 CSV</span>
            </button>
            <button onClick={handleAdvance} disabled={advancing || qualifiedCount === 0}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-purple-600/20">
              {advancing ? <FaSpinner className="animate-spin" /> : <FaArrowRight />}
              确认晋级 ({qualifiedCount})
            </button>
          </div>
        )}
      </div>

      {/* ═══ 5. 排名榜单 ═══ */}
      {activeView === 'total' ? (
        /* ── 总榜 ── */
        sortedRankings.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 bg-[#18181c] border border-white/[0.05] rounded-2xl text-sm font-medium flex flex-col items-center justify-center shadow-sm">
            <FaClock className="text-3xl mb-3 opacity-20" />
            暂无选手成绩录入
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center text-zinc-500 text-xs font-semibold px-4 md:px-6 pb-2">
              <div className="w-12 md:w-16 text-center shrink-0">排名</div>
              <div className="flex-1 pl-2">选手信息</div>
              <div className="w-24 md:w-32 text-right shrink-0">总达成率</div>
              <div className="w-20 md:w-28 text-right shrink-0 pr-2">DX 总分</div>
            </div>
            <AnimatePresence initial={false}>
              {sortedRankings.map((player, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const isQualified = rank <= cutoff;
                const isCutLine = rank === cutoff;
                const isFirstEliminated = rank === cutoff + 1;
                const rc = RANK_COLORS[rank] || '';

                return (
                  <div key={player.userId || player._id || idx}>
                    {isFirstEliminated && cutoff > 0 && (
                      <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
                        className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 whitespace-nowrap px-3 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                          ── 晋级线 ──
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                      </motion.div>
                    )}
                    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.02 }}
                      className={`flex items-center px-4 md:px-6 py-3 md:py-4 rounded-2xl border transition-all cursor-pointer ${
                        isTop3 ? (rc || 'bg-[#18181c] border-white/[0.05] hover:bg-[#1a1a20] shadow-sm')
                          : isQualified ? 'bg-purple-500/[0.04] border-purple-500/15 hover:bg-purple-500/[0.08]'
                          : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                      }`}
                      onClick={() => { const u = player.username || player.userId; if (u) window.location.href = `/profile/${u}`; }}
                    >
                      <div className="w-12 md:w-16 flex justify-center shrink-0">
                        {isTop3 ? (
                          <FaMedal className={`text-2xl ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-zinc-300' : 'text-[#b87333]'}`} />
                        ) : (
                          <span className={`font-bold text-sm ${isQualified ? 'text-purple-400' : 'text-zinc-500'}`}>#{rank}</span>
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-3 pl-2 truncate min-w-0">
                        <img src={player.avatarUrl || '/assets/logos.png'} alt=""
                          className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover bg-black border border-white/10 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-sm md:text-lg text-zinc-100 truncate block">{player.username || player.userId}</span>
                          <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                            进度 <span className={player.scoreCount >= 3 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{player.scoreCount || player.playCount || 0} / 3</span>
                          </span>
                        </div>
                      </div>
                      <div className="w-24 md:w-32 text-right shrink-0">
                        <div className="font-mono text-sm md:text-lg text-amber-400 font-bold">
                          {Number(player.total || player.totalAchievement || 0).toFixed(4)}%
                        </div>
                        {isQualified && <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">晋级</div>}
                      </div>
                      <div className="w-20 md:w-28 text-right shrink-0 font-mono text-sm md:text-lg text-zinc-200 font-bold pr-2">
                        {player.totalDxScore || player.dxScore || 0}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        )
      ) : (
        /* ── 单曲排行榜 ── */
        !currentSongBreakdown || currentSongBreakdown.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 bg-[#18181c] border border-white/[0.05] rounded-2xl text-sm font-medium flex flex-col items-center justify-center shadow-sm">
            <FaMusic className="text-3xl mb-3 opacity-20" />
            暂无该曲目的成绩录入
          </div>
        ) : (
          <div className="space-y-1">
            {/* 表头 */}
            <div className="flex items-center text-zinc-500 text-xs font-semibold px-4 md:px-6 pb-2">
              <div className="w-12 md:w-16 text-center shrink-0">排名</div>
              <div className="flex-1 pl-2">选手信息</div>
              <div className="w-28 md:w-36 text-right shrink-0">达成率</div>
              <div className="w-20 md:w-28 text-right shrink-0">DX 分数</div>
              <div className="w-10 md:w-14 text-center shrink-0 pr-2">DX★</div>
            </div>
            <AnimatePresence initial={false}>
              {currentSongBreakdown.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                  <motion.div key={entry.userId || entry._id || idx}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                    className={`flex items-center px-4 md:px-6 py-3 md:py-4 rounded-2xl border transition-all cursor-pointer ${
                      isTop3 ? 'bg-[#18181c] border-white/[0.05] hover:bg-[#1a1a20] shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                    }`}
                    onClick={() => { const u = entry.username || entry.userId; if (u) window.location.href = `/profile/${u}`; }}
                  >
                    <div className="w-12 md:w-16 flex justify-center shrink-0">
                      {isTop3 ? (
                        <FaMedal className={`text-2xl ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-zinc-300' : 'text-[#b87333]'}`} />
                      ) : (
                        <span className="font-bold text-sm text-zinc-500">#{rank}</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-3 pl-2 truncate min-w-0">
                      <img src={entry.avatarUrl || '/assets/logos.png'} alt=""
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover bg-black border border-white/10 flex-shrink-0" />
                      <span className="font-bold text-sm md:text-lg text-zinc-100 truncate">{entry.username || entry.userId}</span>
                    </div>
                    <div className="w-28 md:w-36 text-right shrink-0">
                      <span className="font-mono text-sm md:text-lg text-amber-400 font-bold">
                        {Number(entry.achievement || 0).toFixed(4)}%
                      </span>
                    </div>
                    <div className="w-20 md:w-28 text-right shrink-0 font-mono text-sm md:text-lg text-zinc-200 font-bold">
                      {entry.dxScore || 0}
                    </div>
                    <div className="w-10 md:w-14 flex justify-center shrink-0 pr-2">
                      <DxStarIcons dxStar={entry.dxStar} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )
      )}
    </div>
  );
};

export default QualifierRanking;
