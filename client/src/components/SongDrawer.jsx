import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMusic, FaTrophy, FaUsers, FaChartLine, FaSpinner, FaEdit, FaCopy, FaCheck } from 'react-icons/fa';
import axios from 'axios';
import RadarChart from './RadarChart';
import RadarEditor from './RadarEditor';
import { useAuth } from '../context/AuthContext';

// ==========================================
// 🌟 舞萌DX封面URL工具 (落雪CDN)
// ==========================================
const getMaimaiCoverUrl = (songId) => {
  // 同一首曲目的标准/DX谱面ID一致，不存在大于10000的ID需取余
  // 宴会场曲目 ID > 100000，不做取余处理
  const numId = Number(songId);
  if (numId > 100000) {
    // 宴会场曲目，直接使用原ID
    return `https://assets2.lxns.net/maimai/jacket/${numId}.png`;
  }
  // 普通曲目：若ID >= 10000，对10000取余
  const lxId = numId >= 10000 ? numId % 10000 : numId;
  return `https://assets2.lxns.net/maimai/jacket/${lxId}.png`;
};

// ==========================================
// 🌟 DX星标图标工具
// ==========================================
const getDxStarIcon = (dxRatio) => {
  if (!dxRatio && dxRatio !== 0) return null;
  const pct = typeof dxRatio === 'number' && dxRatio <= 1 ? dxRatio * 100 : dxRatio;
  let stars = 0;
  if (pct >= 97) stars = 5;
  else if (pct >= 95) stars = 4;
  else if (pct >= 93) stars = 3;
  else if (pct >= 90) stars = 2;
  else if (pct >= 85) stars = 1;
  if (stars === 0) return null;
  return <img src={`/assets/${stars}dxstar.png`} alt={`${stars}★`} className="w-5 h-5 object-contain shrink-0" />;
};

// ==========================================
// 🎨 舞萌 / CHUNITHM 曲目详情抽屉
// ==========================================
export default function SongDrawer({ isOpen, onClose, song, activeGame }) {
  const { user } = useAuth();
  const [selectedDiff, setSelectedDiff] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [globalRankings, setGlobalRankings] = useState([]);
  const [friendRankings, setFriendRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [radarData, setRadarData] = useState(null);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [showRadarEditor, setShowRadarEditor] = useState(false);
  const [coverIndex, setCoverIndex] = useState(0);
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1800);
    }).catch(() => {});
  };

  const MAIMAI_DIFF_CONFIG = [
    { label: 'BASIC',     color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
    { label: 'ADVANCED',  color: 'text-amber-400',   activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
    { label: 'EXPERT',    color: 'text-rose-400',    activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
    { label: 'MASTER',    color: 'text-purple-400',  activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
    { label: 'Re:MASTER', color: 'text-zinc-300',    activeBg: 'bg-zinc-500/20 border-zinc-400/40 text-zinc-100' },
  ];

  const CHUNI_DIFF_CONFIG = [
    { label: 'BASIC',        color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
    { label: 'ADVANCED',     color: 'text-amber-400',   activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
    { label: 'EXPERT',       color: 'text-rose-400',    activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
    { label: 'MASTER',       color: 'text-purple-400',  activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
    { label: 'ULTIMA',       color: 'text-red-500',     activeBg: 'bg-red-500/20 border-red-500/40 text-red-400' },
    { label: "WORLD'S END",  color: 'text-zinc-300',    activeBg: 'bg-white/10 border-white/30 text-white' },
  ];

  const diffConfig = activeGame === 'chunithm' ? CHUNI_DIFF_CONFIG : MAIMAI_DIFF_CONFIG;

  useEffect(() => {
    if (!song) return;
    const maxIdx = activeGame === 'chunithm' ? 5 : 4;
    for (let i = maxIdx; i >= 0; i--) {
      if (song.ds?.[i] !== undefined && song.ds?.[i] !== null) {
        setSelectedDiff(i);
        return;
      }
    }
    setSelectedDiff(0);
  }, [song, activeGame]);

  const coverPaths = useMemo(() => {
    if (!song) return [null];
    const paths = [];
    if (activeGame === 'maimai') {
      // 🔥 优先使用落雪CDN封面（已处理10000取余逻辑）
      paths.push(getMaimaiCoverUrl(song.id));
      // 本地备用
      const paddedId = String(song.id).padStart(5, '0');
      paths.push(`/assets/maimai/jacket/${paddedId}.png`);
      paths.push(`/assets/maimai/jacket/${song.id}.png`);
    } else if (activeGame === 'chunithm') {
      paths.push(`/assets/chunithm/jacket/${song.id}.jpg`);
    } else if (activeGame === 'arcaea') {
      paths.push(`/assets/arcaea/songs/${song.id}/base.jpg`);
      paths.push(`/assets/arcaea/songs/dl_${song.id}/base.jpg`);
    }
    return paths;
  }, [song, activeGame]);

  const currentCoverUrl = coverPaths[coverIndex];

  useEffect(() => { setCoverIndex(0); }, [song]);

  // 加载排行榜数据
  useEffect(() => {
    if (!song || activeGame !== 'maimai' || activeTab !== 'rankings') return;
    if (selectedDiff === null || ![2, 3, 4].includes(selectedDiff)) return;

    const fetchRankings = async () => {
      setLoadingRankings(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [globalRes, friendRes] = await Promise.all([
          axios.get(`/api/songs/${song.id}/leaderboard`, {
            params: { level: selectedDiff, scope: 'global' },
            headers
          }).catch(() => ({ data: [] })),
          token ? axios.get(`/api/songs/${song.id}/leaderboard`, {
            params: { level: selectedDiff, scope: 'friends' },
            headers
          }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);
        setGlobalRankings(globalRes.data || []);
        setFriendRankings(friendRes.data || []);
      } catch (err) {
        console.error('Failed to load rankings:', err);
      } finally {
        setLoadingRankings(false);
      }
    };
    fetchRankings();
  }, [song, activeGame, activeTab, selectedDiff]);

  // 加载雷达数据
  useEffect(() => {
    if (!song || activeGame !== 'maimai' || activeTab !== 'radar') return;

    const fetchRadar = async () => {
      setLoadingRadar(true);
      try {
        const res = await axios.get(`/api/songs/${song.id}/radar`);
        setRadarData(res.data);
      } catch (err) {
        console.error('Failed to load radar:', err);
      } finally {
        setLoadingRadar(false);
      }
    };
    fetchRadar();
  }, [song, activeGame, activeTab]);

  const refetchRadar = async () => {
    if (!song) return;
    try {
      const res = await axios.get(`/api/songs/${song.id}/radar`);
      setRadarData(res.data);
    } catch (err) {
      console.error('Failed to refetch radar:', err);
    }
  };

  if (!song) return null;

  const displayTitle = song.title || song.basic_info?.title || '未知曲目';
  const displayArtist = song.basic_info?.artist || '未知曲师';
  const displayBpm = song.basic_info?.bpm || '-';
  const displayGenre = song.basic_info?.genre || '-';
  const displayFrom = song.basic_info?.from || '-';
  const isNew = song.basic_info?.is_new;
  const isUtage = song.type === 'UTAGE';

  const renderInfoTab = () => (
    <>
      <div className="flex gap-5 items-start">
        <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-[#1a1a24] border border-white/[0.06] shadow-xl">
          {currentCoverUrl ? (
            <img
              src={currentCoverUrl}
              alt="cover"
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => {
                if (coverIndex < coverPaths.length - 1) {
                  setCoverIndex(prev => prev + 1);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700"><FaMusic className="text-2xl" /></div>
          )}
        </div>
        <div className="flex flex-col min-w-0 gap-1.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {activeGame === 'maimai' && song.type && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                song.type === 'DX' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                isUtage ? 'text-pink-400 border-pink-500/30 bg-pink-500/10' :
                'text-orange-400 border-orange-500/30 bg-orange-500/10'
              }`}>{isUtage ? 'UTAGE' : song.type}</span>
            )}
            {isNew && <span className="text-[10px] font-black px-1.5 py-0.5 rounded border text-rose-400 border-rose-500/30 bg-rose-500/10">NEW</span>}
          </div>
          {/* 🔥 曲名 - 可点击复制 */}
          <button
            onClick={() => handleCopy(displayTitle)}
            className="text-left text-lg font-bold text-white leading-tight hover:text-cyan-300 transition-colors flex items-center gap-2 group"
            style={{ fontFamily: "'Quicksand', sans-serif" }}
            title="点击复制曲名"
          >
            <span>{displayTitle}</span>
            <span className="opacity-0 group-hover:opacity-60 transition-opacity text-xs">
              {copiedText === displayTitle ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
            </span>
          </button>
          {/* 🔥 别名列表 */}
          {song.aliases && song.aliases.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {song.aliases.slice(0, 4).map((alias, i) => (
                <button
                  key={i}
                  onClick={() => handleCopy(alias)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all flex items-center gap-1 group"
                  title="点击复制别名"
                >
                  {alias}
                  {copiedText === alias
                    ? <FaCheck className="text-emerald-400 text-[8px]" />
                    : <FaCopy className="opacity-0 group-hover:opacity-60 transition-opacity text-[8px]" />
                  }
                </button>
              ))}
              {song.aliases.length > 4 && (
                <span className="text-[10px] text-zinc-600 px-1 self-center">+{song.aliases.length - 4}</span>
              )}
            </div>
          )}
          <p className="text-sm text-zinc-400 truncate">{displayArtist}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[{ label: 'BPM', value: displayBpm }, { label: 'Genre', value: displayGenre }, { label: 'Version', value: displayFrom }, { label: 'ID', value: song.id }].map(({ label, value }) => (
          <div key={label} className="bg-[#1a1a24] rounded-xl p-3 border border-white/[0.04]">
            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">{label}</div>
            <div className="text-sm font-bold text-zinc-200 truncate" style={{ fontFamily: "'Quicksand', sans-serif" }}>{value ?? '-'}</div>
          </div>
        ))}
      </div>

      {!isUtage && (
        <div className="space-y-3">
          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Difficulties</div>
          <div className="space-y-2">
            {diffConfig.map((diff, idx) => {
              const ds = song.ds?.[idx];
              const lv = song.level?.[idx];
              if (ds === undefined || ds === null) return null;
              const isSelected = selectedDiff === idx;
              return (
                <div key={idx} onClick={() => setSelectedDiff(idx)} className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? diff.activeBg : 'bg-[#1a1a24] border-white/[0.04] hover:border-white/10 opacity-70 hover:opacity-100'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${isSelected ? '' : diff.color}`}>{diff.label}</span>
                    {lv && <span className="text-xs text-zinc-500 font-mono">Lv.{lv}</span>}
                  </div>
                  <span className="font-mono font-bold text-base text-white" style={{ fontFamily: "'Quicksand', sans-serif" }}>{isUtage ? 'UTAGE' : ds === 0 ? '-' : ds.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  const renderRankingsTab = () => {
    if (selectedDiff === null || ![2, 3, 4].includes(selectedDiff)) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <FaTrophy className="text-4xl mb-3 opacity-20" />
          <p className="text-sm">请选择 Expert / Master / Re:Master 难度</p>
        </div>
      );
    }

    if (loadingRankings) {
      return (
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-cyan-400" />
        </div>
      );
    }

    const RankEntry = ({ entry, idx, accentColor = 'text-amber-400' }) => {
      const rankColors = [
        'text-amber-400',
        'text-zinc-300',
        'text-orange-500',
      ];
      const rankBg = [
        'bg-amber-500/10 border-amber-500/20',
        'bg-zinc-500/10 border-zinc-500/20',
        'bg-orange-500/10 border-orange-500/20',
      ];
      const isTop3 = idx < 3;
      const fcBadgeMap = {
        app: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
        ap:  'bg-amber-400/10 text-amber-400 border border-amber-400/20',
        fcp: 'bg-pink-400/20 text-pink-300 border border-pink-400/30',
        fc:  'bg-pink-400/10 text-pink-400 border border-pink-400/20',
      };
      const fcStatus = (entry.fcStatus || '').toLowerCase();
      const fcClass = fcBadgeMap[fcStatus] || 'bg-zinc-700/20 text-zinc-500 border border-zinc-700/20';

      return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:brightness-110 ${
          isTop3 ? rankBg[idx] : 'bg-[#1a1a24] border-white/[0.04] hover:border-white/10'
        }`}>
          {/* 排名 */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
            isTop3 ? `${rankColors[idx]} bg-black/30` : 'text-zinc-600'
          }`}>
            {idx + 1}
          </div>
          {/* 头像 */}
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#0c0c11] border border-white/[0.06] shrink-0">
            {entry.avatarUrl ? (
              <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">
                {(entry.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          {/* 用户名 */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-zinc-200 truncate" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {entry.username}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getDxStarIcon(entry.dxRatio)}
              <span className="text-[11px] text-zinc-500 font-mono">{entry.achievement?.toFixed(4)}%</span>
            </div>
          </div>
          {/* FC标签 */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${fcClass}`}>
            {fcStatus ? fcStatus.toUpperCase() : '-'}
          </span>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* 全站排行 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-amber-400 rounded-full"></div>
            <FaTrophy className="text-amber-400 text-sm" />
            <h3 className="text-sm font-bold text-zinc-200">全站排行榜</h3>
            <span className="text-xs text-zinc-600 ml-auto bg-[#1a1a24] px-2 py-0.5 rounded-lg">{globalRankings.length} 人上榜</span>
          </div>
          {globalRankings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 bg-[#1a1a24] rounded-2xl border border-white/[0.04] text-zinc-600">
              <FaTrophy className="text-3xl opacity-20" />
              <p className="text-xs">暂无排行数据</p>
            </div>
          ) : (
            <div className="space-y-2">
              {globalRankings.slice(0, 10).map((entry, idx) => (
                <RankEntry key={idx} entry={entry} idx={idx} />
              ))}
            </div>
          )}
        </div>

        {/* 好友排行 */}
        {user && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-cyan-400 rounded-full"></div>
              <FaUsers className="text-cyan-400 text-sm" />
              <h3 className="text-sm font-bold text-zinc-200">好友排行榜</h3>
              <span className="text-xs text-zinc-600 ml-auto bg-[#1a1a24] px-2 py-0.5 rounded-lg">{friendRankings.length} 人</span>
            </div>
            {friendRankings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 bg-[#1a1a24] rounded-2xl border border-white/[0.04] text-zinc-600">
                <FaUsers className="text-3xl opacity-20" />
                <p className="text-xs">暂无好友数据</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friendRankings.slice(0, 10).map((entry, idx) => (
                  <RankEntry key={idx} entry={entry} idx={idx} accentColor="text-cyan-400" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRadarTab = () => {
    if (loadingRadar) {
      return (
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-cyan-400" />
        </div>
      );
    }

    const currentRadar = radarData?.finalRadar?.[selectedDiff];
    const voteCount = currentRadar?.voteCount || 0;
    const hasData = currentRadar && Object.keys(currentRadar).some(k => k !== 'voteCount' && k !== 'isBaseOnly' && currentRadar[k] > 0);

    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FaChartLine className="text-4xl text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-400 mb-2">该谱面暂无五维数据</p>
          <p className="text-xs text-zinc-600 mb-6">成为第一个评价者，帮助社区建设数据</p>
          <button
            onClick={() => setShowRadarEditor(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all"
          >
            <FaEdit /> 立即评价
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <RadarChart
            datasets={[{
              values: currentRadar,
              color: '#22d3ee',
              fillColor: 'rgba(34, 211, 238, 0.15)'
            }]}
            size={280}
            showLabels
            showGrid
            className="drop-shadow-xl"
          />
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <FaUsers />
            <span>{voteCount} 位玩家参与评价</span>
          </div>
        </div>

        <button
          onClick={() => setShowRadarEditor(true)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1a1a24] border border-white/[0.08] hover:border-cyan-500/30 text-zinc-300 hover:text-cyan-300 rounded-xl font-bold text-sm transition-all"
        >
          <FaEdit /> {user ? '修改我的评价' : '登录后参与评价'}
        </button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full md:max-w-3xl xl:max-w-4xl bg-[#111118] border-l border-white/[0.06] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] shrink-0 bg-[#0c0c11]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <FaMusic className="text-zinc-500 text-sm" />
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Song Detail</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                <FaTimes />
              </button>
            </div>

            {/* Tab 切换 */}
            {activeGame === 'maimai' && ['expert', 'master', 'remaster'].some(d => {
              const idx = ['basic', 'advanced', 'expert', 'master', 'remaster'].indexOf(d);
              return song.ds?.[idx] !== undefined && song.ds?.[idx] !== null;
            }) && (
              <div className="flex gap-2 px-6 py-3 border-b border-white/[0.05] bg-[#0c0c11]/60 shrink-0">
                {[{ id: 'info', label: '详情', icon: FaMusic }, { id: 'rankings', label: '排行', icon: FaTrophy }, { id: 'radar', label: '五维', icon: FaChartLine }].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="text-[10px]" /> {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {activeTab === 'info' && renderInfoTab()}
              {activeTab === 'rankings' && renderRankingsTab()}
              {activeTab === 'radar' && renderRadarTab()}
            </div>
          </motion.div>

          {/* 雷达编辑器弹窗 */}
          <AnimatePresence>
            {showRadarEditor && activeGame === 'maimai' && selectedDiff !== null && (
              <RadarEditor
                songId={song.id}
                diffIndex={selectedDiff}
                diffName={diffConfig[selectedDiff]?.label || ''}
                globalRadar={radarData?.finalRadar?.[selectedDiff]}
                onClose={() => setShowRadarEditor(false)}
                onSaved={refetchRadar}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}