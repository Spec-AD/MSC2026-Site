import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaTimes, FaGlobe, FaUserFriends, FaLock, FaSpinner, FaMedal, FaChartBar, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RadarChart from './RadarChart';
import RadarEditor from './RadarEditor';

// ==========================================
// 🚀 多游戏生态配置引擎
// ==========================================
const GAME_CONFIG = {
  maimai: {
    diffNames: ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'],
    diffColors: ['text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-zinc-300'],
    diffBgColors: [
      'bg-emerald-500/10 border-emerald-500/20',
      'bg-amber-500/10 border-amber-500/20',
      'bg-rose-500/10 border-rose-500/20',
      'bg-purple-500/10 border-purple-500/20',
      'bg-zinc-400/10 border-zinc-400/20'
    ],
    hasDX: true,
  },
  chunithm: {
    diffNames: ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ULTIMA', "WORLD'S END"],
    diffColors: ['text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-red-500', 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300'],
    diffBgColors: [
      'bg-emerald-500/10 border-emerald-500/20',
      'bg-amber-500/10 border-amber-500/20',
      'bg-rose-500/10 border-rose-500/20',
      'bg-purple-500/10 border-purple-500/20',
      'bg-[#1a0a0a] border-red-500/30',
      'bg-[#15151e] border-white/20'
    ],
    hasDX: false,
  },
  arcaea: {
    diffNames: ['Past', 'Present', 'Future', 'Beyond', 'Eternal'],
    diffColors: ['text-blue-400', 'text-green-400', 'text-purple-400', 'text-red-500', 'text-fuchsia-400'],
    diffBgColors: [
      'bg-blue-500/10 border-blue-500/20',
      'bg-green-500/10 border-green-500/20',
      'bg-purple-500/10 border-purple-500/20',
      'bg-red-500/10 border-red-500/20',
      'bg-[#1a0a1a] border-fuchsia-500/30'
    ],
    hasDX: false,
  }
};

// Note 类型颜色映射
const NOTE_COLORS = {
  Tap:   { bar: '#22d3ee', text: 'text-cyan-400' },
  Hold:  { bar: '#fbbf24', text: 'text-amber-400' },
  Slide: { bar: '#c084fc', text: 'text-purple-400' },
  Touch: { bar: '#f472b6', text: 'text-pink-400' },
  Break: { bar: '#fb7185', text: 'text-rose-400' },
};

// ==========================================
// 📊 Note 物量构成图组件
// ==========================================
function NoteBreakdown({ chart, songType }) {
  if (!chart || !chart.notes || !Array.isArray(chart.notes)) return null;

  const notes = chart.notes;
  const isDX = notes.length === 5;
  const labels = isDX
    ? ['Tap', 'Hold', 'Slide', 'Touch', 'Break']
    : ['Tap', 'Hold', 'Slide', 'Break'];
  const total = notes.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Note 构成</span>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 bg-[#0c0c11] rounded border border-white/[0.05]"
            style={{ fontFamily: "'Quicksand', sans-serif", color: isDX ? '#38bdf8' : '#fbbf24' }}
          >
            {isDX ? 'DX' : 'SD'}
          </span>
          <span className="text-xs font-bold text-zinc-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            Total: <span className="text-zinc-200">{total}</span>
          </span>
        </div>
      </div>

      {/* 总分段进度条 */}
      <div className="h-2 w-full rounded-full overflow-hidden flex bg-[#0c0c11] mb-4">
        {labels.map((lbl, i) => {
          const pct = (notes[i] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={lbl}
              className="h-full transition-all duration-700"
              style={{ width: `${pct}%`, background: NOTE_COLORS[lbl]?.bar }}
            />
          );
        })}
      </div>

      {/* 各类型详情 */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}
      >
        {labels.map((lbl, i) => {
          const pct = total > 0 ? (notes[i] / total) * 100 : 0;
          const cfg = NOTE_COLORS[lbl];
          return (
            <div key={lbl} className="flex flex-col items-center gap-1.5">
              {/* 竖向迷你进度条 */}
              <div className="relative w-full h-12 bg-[#0c0c11] rounded-lg overflow-hidden flex flex-col justify-end">
                <motion.div
                  className="w-full"
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 }}
                  style={{ background: cfg?.bar, opacity: 0.75 }}
                />
              </div>
              <span className={`text-[10px] font-black ${cfg?.text}`}>{lbl}</span>
              <span className="text-xs font-bold text-zinc-300" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {notes[i] ?? 0}
              </span>
              <span className="text-[9px] text-zinc-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {chart.charter && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">谱师</span>
          <span className="text-xs text-zinc-300 font-bold">{chart.charter}</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 🌟 五维雷达图展示面板（含刷新能力）
// ==========================================
function RadarPanel({ songId, diffIndex, song, onOpenEditor }) {
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRadar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/songs/${songId}/radar`);
      setRadarData(res.data);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => { fetchRadar(); }, [fetchRadar]);

  const globalRadar = radarData?.finalRadar?.[diffIndex] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Note 物量构成 */}
      {song?.charts?.[diffIndex] && (
        <NoteBreakdown chart={song.charts[diffIndex]} songType={song.type} />
      )}

      {/* 雷达图卡片 */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">五维能力评价</span>
          <button
            onClick={onOpenEditor}
            className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-lg transition-all"
          >
            <FaEdit /> 评价此谱面
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <FaSpinner className="animate-spin text-xl text-indigo-400" />
          </div>
        ) : globalRadar ? (
          <div className="flex flex-col items-center gap-3">
            <RadarChart
              datasets={[{
                values: globalRadar,
                color: '#818cf8',
                fillColor: 'rgba(129,140,248,0.18)',
              }]}
              size={200}
              showLabels
              showGrid
            />

            {/* 数值小卡片行 */}
            <div className="grid grid-cols-5 gap-2 w-full">
              {[
                ['耐力', 'stamina',  '#f472b6'],
                ['技巧', 'tech',     '#fbbf24'],
                ['稳定', 'stable',   '#34d399'],
                ['准度', 'accuracy', '#38bdf8'],
                ['爆发', 'burst',    '#a78bfa'],
              ].map(([label, key, color]) => (
                <div key={key} className="flex flex-col items-center gap-1 p-2 bg-[#0c0c11] rounded-lg border border-white/[0.04]">
                  <span className="text-[9px] font-bold" style={{ color }}>{label}</span>
                  <span className="text-sm font-black" style={{ fontFamily: "'Quicksand', sans-serif", color }}>
                    {Number(globalRadar[key] ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            {globalRadar.voteCount !== undefined && (
              <p className="text-[10px] text-zinc-600">
                基于 {globalRadar.voteCount} 名玩家的评价 · 贝叶斯平滑融合
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-xl text-indigo-400">◆</span>
            </div>
            <p className="text-xs text-zinc-500">暂无评价数据</p>
            <p className="text-[10px] text-zinc-600">成为第一个评价此谱面的玩家！</p>
            <button
              onClick={onOpenEditor}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-4 py-2 rounded-xl transition-all"
            >
              立即评价
            </button>
          </div>
        )}
      </div>

      {/* 隐藏的刷新触发按钮，供 onSaved 回调调用 */}
      <button
        id={`radar-refresh-${songId}-${diffIndex}`}
        onClick={fetchRadar}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ==========================================
// 🎯 主组件：SongDrawer
// ==========================================
export default function SongDrawer({ isOpen, onClose, song, activeGame = 'maimai' }) {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [boardLoading, setBoardLoading] = useState(false);
  const [boardData, setBoardData] = useState([]);
  const [boardScope, setBoardScope] = useState('global');
  const [boardLevel, setBoardLevel] = useState(2);
  const [coverIndex, setCoverIndex] = useState(0);

  // Tab: 'info' | 'radar' | 'leaderboard'
  const [activeTab, setActiveTab] = useState('info');
  // 雷达编辑器
  const [showRadarEditor, setShowRadarEditor] = useState(false);
  const [radarRefreshKey, setRadarRefreshKey] = useState(0);

  const config = GAME_CONFIG[activeGame] || GAME_CONFIG.maimai;
  const isUtage = song?.basic_info?.genre === '宴会场' || song?.type === 'UTAGE';

  // 切歌时重置状态
  useEffect(() => {
    if (song && isOpen) {
      setActiveTab('info');
      setShowRadarEditor(false);
      if (isUtage) {
        setBoardLevel(0);
      } else if (activeGame === 'arcaea') {
        if (song.ds && song.ds[2] !== undefined && song.ds[2] !== null) {
          setBoardLevel(2);
        } else {
          let dl = 0;
          for (let i = config.diffNames.length - 1; i >= 0; i--) {
            if (song.ds && song.ds[i] !== undefined && song.ds[i] !== null) { dl = i; break; }
          }
          setBoardLevel(dl);
        }
      } else {
        let dl = 0;
        for (let i = config.diffNames.length - 1; i >= 0; i--) {
          if (song.ds && song.ds[i] !== undefined && song.ds[i] !== null) { dl = i; break; }
        }
        setBoardLevel(dl);
      }
      setBoardScope('global');
    }
  }, [song, isOpen, isUtage, activeGame, config.diffNames.length]);

  useEffect(() => { setCoverIndex(0); }, [song, boardLevel]);

  // 元数据提取
  const currentDiffInfo = song?.difficulties?.find(d => d.ratingClass === boardLevel);
  const displayTitle = currentDiffInfo?.title_localized?.en || song?.title_localized?.en || song?.basic_info?.title || song?.title;
  const displayJa = currentDiffInfo?.title_localized?.ja || song?.title_localized?.ja;
  const displayArtist = currentDiffInfo?.artist || song?.basic_info?.artist || song?.artist;
  const displayBpm = currentDiffInfo?.bpm || song?.basic_info?.bpm;

  // 封面探测队列
  const coverPaths = useMemo(() => {
    if (!song) return ['/assets/bg.png'];
    if (activeGame === 'chunithm') return [`https://assets2.lxns.net/chunithm/jacket/${song.id}.png`, '/assets/bg.png'];
    if (activeGame === 'maimai') return [`https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`, '/assets/bg.png'];

    const sId = song.id;
    const paths = [];
    const hasOverride = currentDiffInfo?.jacketOverride;
    const isBYD = boardLevel === 3;

    if (hasOverride || isBYD) {
      paths.push(`/assets/arcaea/songs/${sId}/1080_${boardLevel}.jpg`);
      paths.push(`/assets/arcaea/songs/dl_${sId}/1080_${boardLevel}.jpg`);
      paths.push(`/assets/arcaea/songs/${sId}/${boardLevel}.jpg`);
      paths.push(`/assets/arcaea/songs/dl_${sId}/${boardLevel}.jpg`);
      paths.push(`/assets/arcaea/songs/${sId}/${sId}_${boardLevel}.jpg`);
    }
    paths.push(`/assets/arcaea/songs/${sId}/1080_base.jpg`);
    paths.push(`/assets/arcaea/songs/dl_${sId}/1080_base.jpg`);
    paths.push(`/assets/arcaea/songs/${sId}/base.jpg`);
    paths.push(`/assets/arcaea/songs/dl_${sId}/base.jpg`);
    paths.push(`/assets/arcaea/songs/${sId}/${sId}_base.jpg`);
    paths.push('/assets/bg.png');
    return paths;
  }, [song, activeGame, boardLevel, currentDiffInfo?.jacketOverride]);

  const currentCoverUrl = coverPaths[coverIndex] || '/assets/bg.png';

  // 排行榜加载（仅 maimai）
  useEffect(() => {
    if (!isOpen || !song || activeGame !== 'maimai') return;
    if (!isUtage && (!song.ds || song.ds[boardLevel] === undefined)) return;

    let isMounted = true;
    setBoardLoading(true);

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`/api/songs/${song.id}/leaderboard`, {
          params: { level: boardLevel, scope: boardScope },
          headers
        });
        if (isMounted) setBoardData(res.data);
      } catch (err) {
        if (isMounted) {
          addToast(err.response?.data?.msg || '获取排行榜失败', 'error');
          if (boardScope === 'friends') setBoardScope('global');
        }
      } finally {
        if (isMounted) setBoardLoading(false);
      }
    }, 350);

    return () => { isMounted = false; clearTimeout(timer); };
  }, [song, boardLevel, boardScope, isOpen, isUtage, activeGame, addToast]);

  const handleScopeSwitch = (scope) => {
    if (scope === 'friends') {
      if (!currentUser) return addToast('请先登录后查看', 'info');
      if ((currentUser.sponsorTier || 0) < 1) return addToast('好友排行榜为赞助者专属功能', 'error');
    }
    setBoardScope(scope);
  };

  const getRankColor = (i) => {
    if (i === 0) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]';
    if (i === 1) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]';
    if (i === 2) return 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]';
    return 'text-gray-500';
  };

  const getNotesCount = (chartInfo) => {
    if (!chartInfo) return 0;
    if (chartInfo.combo !== undefined) return chartInfo.combo;
    if (chartInfo.notes && Array.isArray(chartInfo.notes)) return chartInfo.notes.reduce((a, b) => a + b, 0);
    return 0;
  };

  // Tab 配置
  const tabs = [
    { id: 'info',        label: '谱面信息', icon: <FaChartBar className="text-[10px]" /> },
    ...(activeGame === 'maimai' ? [
      { id: 'radar',       label: '五维评价', icon: <span className="text-[10px]">◆</span> },
      { id: 'leaderboard', label: '排行榜',   icon: <FaMedal className="text-[10px]" /> },
    ] : []),
  ];

  return (
    <>
      {/* 遮罩 */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-40 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* 抽屉面板 */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#0a0a0c] border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {song && (
          <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: "'Quicksand', sans-serif" }}>

            {/* ── 头部：封面 + 标题 ── */}
            <div className="p-6 pb-4 border-b border-gray-800 relative bg-gradient-to-b from-gray-800/40 to-transparent shrink-0 flex gap-4">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-transform hover:rotate-90 text-xl z-10"
              >
                <FaTimes />
              </button>

              <img
                key={currentCoverUrl}
                src={currentCoverUrl}
                alt="cover"
                className="w-20 h-20 rounded-xl object-cover shadow-lg border border-white/10 shrink-0 transition-all duration-300"
                onError={() => { if (coverIndex < coverPaths.length - 1) setCoverIndex(p => p + 1); }}
              />

              <div className="pr-6 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    activeGame === 'chunithm' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                    activeGame === 'arcaea'   ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                    song.type === 'DX'        ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                                'text-orange-400 border-orange-500/30 bg-orange-500/10'
                  }`}>
                    {activeGame === 'chunithm' ? 'CHU' : activeGame === 'arcaea' ? 'ARC' : song.type}
                  </span>
                  <span className="text-xs text-gray-400 font-mono tracking-wider">ID: {song.id}</span>
                </div>

                <h2 className="text-xl font-bold text-white leading-tight mb-1 truncate" title={displayTitle}>
                  {displayTitle}
                </h2>
                {displayJa && displayJa !== displayTitle && (
                  <p className="text-xs text-purple-300/80 font-medium mb-1 truncate font-sans">{displayJa}</p>
                )}
                <p className="text-sm text-gray-400 truncate font-sans" title={displayArtist}>{displayArtist}</p>

                {song.aliases && song.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 font-sans">
                    {song.aliases.map((alias, i) => (
                      <span key={i} className="text-[10px] bg-white/10 border border-white/5 text-zinc-300 px-2 py-0.5 rounded-md">
                        {alias}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Tab 导航栏 ── */}
            <div className="flex items-center border-b border-gray-800 shrink-0 bg-[#0a0a0c]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab 内容区（可滚动）── */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
              <div className="p-6 space-y-6">

                {/* ===== 谱面信息 Tab ===== */}
                {activeTab === 'info' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-1 font-sans">所属分类 (Pack)</div>
                        <div className="text-sm text-gray-200">{song.basic_info?.genre || '-'}</div>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-1 font-sans">实装版本</div>
                        <div className="text-sm text-gray-200 font-mono">{song.basic_info?.from || '-'}</div>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-1 font-sans">BPM</div>
                        <div className="text-sm text-gray-200 font-mono">{displayBpm || '-'}</div>
                      </div>
                      {activeGame === 'maimai' && (
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                          <div className="text-[10px] text-gray-500 mb-1 font-sans">新曲标识</div>
                          <div className="text-sm text-gray-200 font-sans">
                            {song.basic_info?.is_new ? '✨ 是 (New)' : '否'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 难度与谱师列表 */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest font-sans">
                        Difficulty & Charter
                      </h3>
                      <div className="space-y-2">
                        {song.ds && song.ds.map((constant, idx) => {
                          if (constant === undefined || constant === null) return null;

                          const chartInfo = song.charts && song.charts[idx];
                          const arcaeaDiffInfo = song.difficulties?.find(d => d.ratingClass === idx);

                          let charterName = '未知谱师';
                          if (activeGame === 'arcaea' && arcaeaDiffInfo?.chartDesigner) {
                            charterName = arcaeaDiffInfo.chartDesigner;
                          } else if (chartInfo?.charter) {
                            charterName = chartInfo.charter;
                          }

                          let displayLevel = song.level ? song.level[idx] : null;
                          if (activeGame === 'arcaea' && arcaeaDiffInfo) {
                            displayLevel = song.level ? song.level[idx] : arcaeaDiffInfo.rating;
                          }

                          const totalNotes = activeGame === 'arcaea' ? '-' : getNotesCount(chartInfo);
                          const isSelected = boardLevel === idx;

                          return (
                            <div
                              key={idx}
                              onClick={() => setBoardLevel(idx)}
                              className={`flex flex-col p-3 rounded-xl border backdrop-blur-sm cursor-pointer transition-all duration-300
                                ${isSelected ? config.diffBgColors[idx] : 'bg-gray-800 border-gray-700 opacity-60 hover:opacity-100'}
                                ${activeGame === 'arcaea' && isSelected ? 'shadow-lg scale-[1.02]' : 'scale-100'}
                              `}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-black text-sm ${config.diffColors[idx] || 'text-gray-300'}`}>
                                    {config.diffNames[idx] || 'EXTRA'}
                                  </span>
                                  {displayLevel && (
                                    <span className="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-gray-300 border border-white/5">
                                      Lv.{displayLevel}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-lg font-bold text-white drop-shadow-md">
                                  {constant.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex justify-between items-end mt-1 font-sans">
                                <span className="text-xs text-gray-400 opacity-80 truncate max-w-[200px]" title={charterName}>
                                  {charterName}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  Notes: {totalNotes > 0 ? totalNotes : '-'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ===== 五维评价 Tab（仅 maimai）===== */}
                {activeTab === 'radar' && activeGame === 'maimai' && (
                  <RadarPanel
                    key={`${song.id}-${boardLevel}-${radarRefreshKey}`}
                    songId={String(song.id)}
                    diffIndex={boardLevel}
                    song={song}
                    onOpenEditor={() => setShowRadarEditor(true)}
                  />
                )}

                {/* ===== 排行榜 Tab（仅 maimai）===== */}
                {activeTab === 'leaderboard' && activeGame === 'maimai' && (
                  <div>
                    {/* 难度 & 范围选择器 */}
                    <div className="bg-gray-900/80 border border-white/5 rounded-2xl p-4 mb-4 shadow-inner">
                      {!isUtage && (
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest shrink-0 font-sans">Diff</span>
                          <div className="flex gap-2 flex-1 overflow-x-auto pb-1">
                            {song.ds && song.ds.map((constant, idx) => {
                              if (idx < 2 || constant === undefined || constant === null) return null;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setBoardLevel(idx)}
                                  className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-all whitespace-nowrap ${
                                    boardLevel === idx
                                      ? `bg-white/10 ${config.diffColors[idx]} border-white/20`
                                      : 'border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                  }`}
                                >
                                  {config.diffNames[idx]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between font-sans">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Scope</span>
                        <div className="flex bg-black/50 border border-white/5 rounded-lg p-1">
                          <button
                            onClick={() => handleScopeSwitch('global')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${boardScope === 'global' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                          >
                            <FaGlobe /> 全局
                          </button>
                          <button
                            onClick={() => handleScopeSwitch('friends')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${boardScope === 'friends' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-gray-300'}`}
                          >
                            {(!currentUser || (currentUser.sponsorTier || 0) < 1) ? <FaLock className="text-gray-500" /> : <FaUserFriends />} 好友
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 榜单列表 */}
                    <div className="min-h-[200px]">
                      {boardLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                          <FaSpinner className="animate-spin text-3xl mb-4 text-cyan-400" />
                          <span className="font-mono text-xs tracking-widest font-bold uppercase">Loading Data...</span>
                        </div>
                      ) : boardData.length === 0 ? (
                        <div className="text-center py-16 bg-black/20 border border-white/5 rounded-2xl text-gray-500 font-mono text-xs tracking-widest font-bold">
                          NO RECORDS FOUND
                        </div>
                      ) : (
                        <div className="space-y-2 pb-10">
                          {boardData.map((score, index) => {
                            let starCount = 0;
                            if (config.hasDX) {
                              const chartInfo = song.charts && song.charts[boardLevel];
                              const maxDxScore = (chartInfo?.notes) ? chartInfo.notes.reduce((a, b) => a + b, 0) * 3 : 0;
                              const dxRatio = maxDxScore > 0 ? score.dxScore / maxDxScore : 0;
                              if (dxRatio >= 0.97) starCount = 5;
                              else if (dxRatio >= 0.95) starCount = 4;
                              else if (dxRatio >= 0.93) starCount = 3;
                              else if (dxRatio >= 0.90) starCount = 2;
                              else if (dxRatio >= 0.85) starCount = 1;
                            }

                            const playerName = score.userId?.username || score.username || 'Unknown Player';
                            const displayScore = score.achievement ? score.achievement.toFixed(4) + '%' : '-';
                            const fc = (score.fcStatus || '').toLowerCase();
                            let fcBadge = null;
                            if (['fc', 'fcp', 'ap', 'app'].includes(fc)) {
                              fcBadge = (
                                <span className={`text-[9px] font-black text-white px-1 rounded font-sans ${fc.includes('ap') ? 'bg-yellow-500' : 'bg-pink-500'}`}>
                                  {fc.toUpperCase()}
                                </span>
                              );
                            }

                            return (
                              <div
                                key={score._id}
                                onClick={() => navigate(`/profile/${playerName}/${activeGame}`)}
                                className="flex items-center bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer active:scale-95 group"
                              >
                                <div className={`w-8 text-center font-mono font-black text-lg ${getRankColor(index)}`}>{index + 1}</div>
                                <img
                                  src={score.userId?.avatarUrl || score.avatarUrl || '/assets/logos.png'}
                                  alt="avatar"
                                  className="w-10 h-10 rounded-lg object-cover ml-2 mr-3 border border-white/10 group-hover:scale-105 transition-transform"
                                />
                                <div className="flex-1 overflow-hidden">
                                  <div className="text-white font-bold text-sm truncate group-hover:text-cyan-300 transition-colors font-sans">{playerName}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-cyan-400 font-mono font-bold text-sm">{displayScore}</span>
                                    {fcBadge}
                                  </div>
                                </div>
                                {config.hasDX && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    {starCount > 0 && (
                                      <img src={`/assets/${starCount}dxstar.png`} alt={`${starCount}★`} className="h-[14px] md:h-4 object-contain drop-shadow-md" />
                                    )}
                                    <div className="text-right flex flex-col items-end">
                                      <span className="text-gray-300 font-mono font-bold text-sm">{score.dxScore || 0}</span>
                                      <span className="text-gray-500 text-[9px] font-bold uppercase mt-0.5 font-sans">DX Score</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 雷达图编辑器弹窗 */}
      <AnimatePresence>
        {showRadarEditor && song && (
          <RadarEditor
            songId={String(song.id)}
            diffIndex={boardLevel}
            diffName={config.diffNames[boardLevel] || 'MASTER'}
            globalRadar={null}
            onClose={() => setShowRadarEditor(false)}
            onSaved={() => {
              setShowRadarEditor(false);
              setRadarRefreshKey(k => k + 1);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}