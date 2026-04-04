import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMusic, FaTrophy, FaUsers, FaChartLine, FaSpinner, FaEdit } from 'react-icons/fa';
import axios from 'axios';
import RadarChart from './RadarChart';
import RadarEditor from './RadarEditor';
import { useAuth } from '../context/AuthContext';

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
        <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-[#1a1a24] border border-white/[0.06] shadow-xl">
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
          <h2 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>{displayTitle}</h2>
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

    return (
      <div className="space-y-4">
        {/* 全站排行 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FaTrophy className="text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-200">全站排行榜</h3>
            <span className="text-xs text-zinc-600">({globalRankings.length})</span>
          </div>
          {globalRankings.length === 0 ? (
            <div className="text-xs text-zinc-600 text-center py-6 bg-[#1a1a24] rounded-xl border border-white/[0.04]">
              暂无排行数据
            </div>
          ) : (
            <div className="space-y-1.5">
              {globalRankings.slice(0, 10).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a24] rounded-xl border border-white/[0.04] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black w-6 text-center ${
                      idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-orange-600' : 'text-zinc-600'
                    }`}>#{idx + 1}</span>
                    <span className="text-sm font-bold text-zinc-200">{entry.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{entry.achievement?.toFixed(4)}%</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      entry.fcStatus === 'app' ? 'bg-amber-500/20 text-amber-300' :
                      entry.fcStatus === 'fcp' ? 'bg-green-500/20 text-green-300' :
                      entry.fcStatus === 'fc' ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-700/20 text-zinc-500'
                    }`}>{entry.fcStatus?.toUpperCase() || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 好友排行 */}
        {user && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FaUsers className="text-cyan-400" />
              <h3 className="text-sm font-bold text-zinc-200">好友排行榜</h3>
              <span className="text-xs text-zinc-600">({friendRankings.length})</span>
            </div>
            {friendRankings.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-6 bg-[#1a1a24] rounded-xl border border-white/[0.04]">
                暂无好友数据
              </div>
            ) : (
              <div className="space-y-1.5">
                {friendRankings.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a24] rounded-xl border border-white/[0.04] hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black w-6 text-center text-cyan-400">#{idx + 1}</span>
                      <span className="text-sm font-bold text-zinc-200">{entry.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{entry.achievement?.toFixed(4)}%</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        entry.fcStatus === 'app' ? 'bg-amber-500/20 text-amber-300' :
                        entry.fcStatus === 'fcp' ? 'bg-green-500/20 text-green-300' :
                        entry.fcStatus === 'fc' ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-700/20 text-zinc-500'
                      }`}>{entry.fcStatus?.toUpperCase() || '-'}</span>
                    </div>
                  </div>
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
            className="fixed right-0 top-0 h-full w-full md:max-w-2xl bg-[#111118] border-l border-white/[0.06] shadow-2xl z-50 flex flex-col overflow-hidden"
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