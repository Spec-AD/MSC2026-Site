import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { FaSpinner, FaSearch, FaFilter, FaTimes, FaUndo, FaDatabase, FaChevronLeft, FaMusic } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import SongDrawer from '../components/SongDrawer';
import { useToast } from '../context/ToastContext';

// ==========================================
// 🌟 Arcaea 官方曲包美化字典
// ==========================================
const ARCAEA_PACK_MAPPING = {
  "base": "Arcaea",
  "single": "Memory Archive",
  "extend_4": "World Extend 4",
  "extend_3": "Extend Archive 3",
  "extend_2": "Extend Archive 2",
  "extend": "Extend Archive 1",
  "core": "Eternal Core",
  "yugamu": "Vicious Labyrinth",
  "rei": "Luminous Sky",
  "prelude": "Adverse Prelude",
  "vs": "Black Fate",
  "finale": "Final Verdict",
  "epilogue": "Silent Answer",
  "eden": "Lasting Eden",
  "eden_append_1": "Lasting Eden Chapter 2",
  "eden_append_2": "Lasting Eden -Shifting Veil-",
  "nihil": "Absolute Nihil",
  "lephon": "Lucent Historia",
  "eclipse": "Liminal Eclipse",
  "shiawase": "Crimson Solace",
  "mirai": "Ambivalent Vision",
  "nijuusei": "Binary Enfold",
  "nijuusei_append_1": "Binary Enfold -Shared Time-",
  "zettai": "Absolute Reason",
  "yugure": "Sunset Radiance",
  "alice": "Ephemeral Page",
  "alice_append_1": "Ephemeral Page -The Journey Onwards",
  "dividedheart": "Divided Heart",
  "observer": "Esoteric Order",
  "observer_append_1": "Esoteric Order -Pale Tapestry-",
  "observer_append_2": "Esoteric Order -Light of Salvation-",
  "anima": "Extant Anima",
  "anima_append_1": "Extant Anima Chapter Experientia",
  "dynamix": "Dynamix Collaboration",
  "lanota": "Lanota Collaboration",
  "lanota_append_1": "Lanota Collaboration Chapter 2",
  "tonesphere": "Tone Sphere Collaboration",
  "groovecoaster": "Groove Coaster Collaboration",
  "groovecoaster_append_1": "Groove Coaster Collaboration Chapter 2",
  "chunithm": "CHUNITHM Collaboration",
  "chunithm_append_1": "CHUNITHM Collaboration Chapter 2",
  "chunithm_append_2": "CHUNITHM Collaboration Chapter 3",
  "chunithm_append_3": "CHUNITHM Collaboration Chapter 4",
  "ongeki": "O.N.G.E.K.I. Collaboration",
  "ongeki_append_1": "O.N.G.E.K.I. Collaboration Chapter 2",
  "ongeki_append_2": "O.N.G.E.K.I. Collaboration Chapter 3",
  "maimai": "maimai Collaboration",
  "maimai_append_1": "maimai Collaboration Chapter 2",
  "maimai_append_2": "maimai Collaboration Chapter 3",
  "wacca": "WACCA Collaboration",
  "wacca_append_1": "WACCA Collaboration Chapter 2",
  "musedash": "Muse Dash Collaboration",
  "cytusii": "CYTUS II Collaboration",
  "cytusii_append_1": "CYTUS II Collaboration Chapter 2",
  "rotaeno": "Rotaeno Collaboration",
  "undertale": "UNDERTALE Collaboration",
  "djmax": "DJMAX Collaboration",
  "djmax_append_1": "DJMAX Collaboration Chapter 2",
  "nextstage": "Arcaea Next Stage",
  "megarex": "MEGAREX Collaboration",
};

// ==========================================
// 🌟 Arcaea 完美还原：主包排版矩阵
// ==========================================
const ARCAEA_ROWS = [
  { title: "Arcaea", keys: ["base", "single", "extend_4", "extend_3", "extend_2", "extend"] },
  { title: "Main Story", keys: ["eclipse", "lephon", "nihil", "eden", "epilogue", "finale", "vs", "prelude", "rei", "yugamu", "core"] },
  { title: "Side Story", keys: ["anima", "observer", "dividedheart", "alice", "yugure", "zettai", "nijuusei", "mirai", "shiawase"] },
  { title: "Collaboration", keys: ["megarex", "nextstage", "djmax", "undertale", "rotaeno", "cytusii", "musedash", "wacca", "maimai", "ongeki", "chunithm", "groovecoaster", "tonesphere", "lanota", "dynamix"] }
];


// ==========================================
// 🎨 Arcaea 专属：单曲详情独立渲染面板
// ==========================================
const ArcaeaSongDetail = ({ song, diffConfig }) => {
  const [boardLevel, setBoardLevel] = useState(2);
  const [coverIndex, setCoverIndex] = useState(0);

  useEffect(() => {
    if (!song) return;
    if (song.ds && song.ds[2] !== undefined && song.ds[2] !== null) {
      setBoardLevel(2);
    } else {
      let defaultLevel = 0;
      for (let i = diffConfig.length - 1; i >= 0; i--) {
        if (song.ds && song.ds[i] !== undefined && song.ds[i] !== null) { defaultLevel = i; break; }
      }
      setBoardLevel(defaultLevel);
    }
  }, [song, diffConfig.length]);

  useEffect(() => { setCoverIndex(0); }, [song, boardLevel]);

  const currentDiffInfo = song?.difficulties?.find(d => d.ratingClass === boardLevel);
  const displayTitle = currentDiffInfo?.title_localized?.en || song?.title_localized?.en || song?.basic_info?.title || song?.title;
  const displayJa = currentDiffInfo?.title_localized?.ja || song?.title_localized?.ja;
  const displayArtist = currentDiffInfo?.artist || song?.basic_info?.artist || song?.artist;
  const displayBpm = currentDiffInfo?.bpm || song?.basic_info?.bpm;

  const coverPaths = useMemo(() => {
    if (!song) return ['/assets/bg.png'];
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
  }, [song, boardLevel, currentDiffInfo?.jacketOverride]);

  const currentCoverUrl = coverPaths[coverIndex] || '/assets/bg.png';

  if (!song) return <div className="h-full flex items-center justify-center text-gray-500 font-bold" style={{ fontFamily: "'Quicksand', sans-serif" }}>Select a track to view details</div>;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 bg-[#0a0a0c] rounded-3xl border border-white/5" style={{ fontFamily: "'Quicksand', sans-serif" }}>
      <div className="flex gap-6 mb-8 items-start">
        <img 
          key={currentCoverUrl}
          src={currentCoverUrl} 
          alt="cover" 
          className="w-36 h-36 rounded-2xl object-cover shadow-2xl border border-white/10 shrink-0 transition-all duration-300" 
          onError={() => {
            if (coverIndex < coverPaths.length - 1) {
              setCoverIndex(prev => prev + 1);
            }
          }}
        />
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded border text-purple-400 border-purple-500/30 bg-purple-500/10">ARC</span>
            <span className="text-xs text-gray-400 font-mono tracking-wider">ID: {song.id}</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-1 truncate transition-colors duration-300" title={displayTitle}>
            {displayTitle}
          </h2>
          {displayJa && displayJa !== displayTitle && (
            <p className="text-sm text-purple-300/80 font-medium mb-1 truncate transition-opacity duration-300 font-sans">
              {displayJa}
            </p>
          )}
          <p className="text-base text-gray-400 truncate transition-colors duration-300 font-sans" title={displayArtist}>
            {displayArtist}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <div className="text-[11px] text-gray-500 mb-1 font-sans">Pack</div>
          <div className="text-sm font-bold text-purple-300 truncate">{song.basic_info?.genre || '-'}</div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <div className="text-[11px] text-gray-500 mb-1 font-sans">BPM</div>
          <div className="text-sm font-bold text-gray-200 font-mono transition-colors duration-300">{displayBpm || '-'}</div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest font-sans">Select Difficulty</h3>
        <div className="space-y-3">
          {song.ds && song.ds.map((constant, idx) => {
            if (constant === undefined || constant === null) return null;
            
            const arcaeaDiffInfo = song.difficulties && song.difficulties.find(d => d.ratingClass === idx);
            const charterName = arcaeaDiffInfo?.chartDesigner || 'Unknown';
            const displayLevel = song.level ? song.level[idx] : (arcaeaDiffInfo?.rating || null);
            const isSelected = boardLevel === idx;

            return (
              <div 
                key={idx} 
                onClick={() => setBoardLevel(idx)}
                className={`flex flex-col p-4 rounded-2xl border backdrop-blur-sm cursor-pointer transition-all duration-300
                  ${isSelected ? diffConfig[idx].activeBg : 'bg-gray-800/40 border-gray-700/50 opacity-60 hover:opacity-100 hover:border-gray-500'}
                  ${isSelected ? 'shadow-lg scale-[1.02]' : 'scale-100'}
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-base ${diffConfig[idx].color.split(' ')[0]}`}>
                      {diffConfig[idx].label}
                    </span>
                    {displayLevel && (
                      <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-gray-300 border border-white/5">
                        Lv.{displayLevel}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xl font-bold text-white drop-shadow-md">
                    {constant.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-2 font-sans">
                  <span className="text-xs text-gray-400 opacity-80 truncate max-w-[250px]" title={charterName}>
                    {charterName !== '-' ? charterName : '未知谱师'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🖱️ 专属 Hooks: 鼠标拖拽平滑滚动引擎
// ==========================================
const useDragToScroll = () => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e) => {
    if (!ref.current) return;
    setIsDragging(true);
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
  };

  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);

  const onMouseMove = (e) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 2; // 滑动速度乘数
    ref.current.scrollLeft = scrollLeft.current - walk;
  };

  return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, isDragging };
};

// ==========================================
// 🌟 独立曲包行组件 (修复 Hook 在循环中调用的问题)
// ==========================================
const ArcaeaPackRow = ({ row, processedData, setSelectedPackId }) => {
  const dragProps = useDragToScroll();
  
  const availableKeys = row.keys.filter(key => processedData[key]);
  if (availableKeys.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl md:text-2xl font-bold text-white/80 tracking-[0.2em] uppercase pl-2 border-l-4 border-purple-500/50" style={{ fontFamily: "'Quicksand', sans-serif" }}>
        {row.title}
      </h3>
      
      <div 
        {...dragProps}
        className="flex overflow-x-auto custom-scrollbar gap-6 md:gap-8 pb-6 pt-2 items-start cursor-grab active:cursor-grabbing"
      >
        {availableKeys.map(key => {
          const pack = processedData[key];
          return (
            <div key={key} className="flex flex-col gap-3 shrink-0 items-center w-36 md:w-44">
              
              <div className="relative group w-full flex flex-col items-center">
                <img 
                  src={`/assets/arcaea/packs/${pack.id}.png`}
                  onClick={() => !dragProps.isDragging && setSelectedPackId(pack.id)}
                  alt={pack.name}
                  className="w-full h-auto object-contain cursor-pointer drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_0_25px_rgba(192,132,252,0.6)] group-hover:-translate-y-2 transition-all duration-300 z-10"
                  draggable="false"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div 
                  onClick={() => !dragProps.isDragging && setSelectedPackId(pack.id)} 
                  className="hidden w-full aspect-[1/2] bg-white/5 border border-white/10 rounded-2xl flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-white/10 hover:-translate-y-2 transition-all duration-300 shadow-xl backdrop-blur-sm"
                >
                   <span className="text-sm font-bold text-purple-300" style={{ fontFamily: "'Quicksand', sans-serif" }}>{pack.name}</span>
                   <span className="text-[10px] text-gray-500 mt-2 font-mono">{pack.songs.length} Tracks</span>
                </div>
              </div>

              {/* Append 追加包 */}
              {pack.appends.map(app => (
                <div key={app.id} className="relative group w-[110%] flex flex-col items-center mt-2">
                   <img 
                     src={`/assets/arcaea/packs/${app.id}.png`}
                     onClick={() => !dragProps.isDragging && setSelectedPackId(app.id)}
                     alt={app.name}
                     className="w-full h-auto object-contain cursor-pointer drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_0_20px_rgba(192,132,252,0.5)] group-hover:-translate-y-1 transition-all duration-300 z-10"
                     draggable="false"
                     onError={(e) => {
                       e.target.style.display = 'none';
                       e.target.nextElementSibling.style.display = 'flex';
                     }}
                   />
                   <div 
                     onClick={() => !dragProps.isDragging && setSelectedPackId(app.id)} 
                     className="hidden w-full h-16 bg-white/5 border border-white/10 rounded-xl flex-col items-center justify-center p-2 text-center cursor-pointer hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 shadow-lg backdrop-blur-sm"
                   >
                      <span className="text-[11px] font-bold text-cyan-300 leading-tight" style={{ fontFamily: "'Quicksand', sans-serif" }}>{app.name}</span>
                   </div>
                </div>
              ))}

            </div>
          );
        })}
      </div>
    </div>
  );
};


// ==========================================
// 🎨 Arcaea 专属：曲包沉浸式选曲总控
// ==========================================
const ArcaeaPackExplorer = ({ songs, diffConfig }) => {
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);

  const processedData = useMemo(() => {
    const rawGroups = {};
    songs.forEach(song => {
      const genre = song.basic_info?.genre || 'Memory Archive';
      const packEntry = Object.entries(ARCAEA_PACK_MAPPING).find(([k, v]) => v === genre || k === genre);
      const packId = packEntry ? packEntry[0] : 'unknown';
      const packName = packEntry ? packEntry[1] : genre;

      if (!rawGroups[packId]) rawGroups[packId] = { id: packId, name: packName, songs: [], appends: [] };
      rawGroups[packId].songs.push(song);
    });

    const mainPacks = {};
    const appendPacks = [];

    Object.values(rawGroups).forEach(p => {
      if (p.id.includes('_append_')) appendPacks.push(p);
      else mainPacks[p.id] = p;
    });

    appendPacks.forEach(app => {
      const parentId = app.id.split('_append_')[0];
      if (mainPacks[parentId]) {
        mainPacks[parentId].appends.push(app);
      } else {
        mainPacks[app.id] = app; 
      }
    });

    return mainPacks;
  }, [songs]);

  useEffect(() => {
    if (selectedPackId && !processedData[selectedPackId] && !Object.values(processedData).some(p => p.appends.find(a => a.id === selectedPackId))) {
      setSelectedPackId(null);
      setSelectedSong(null);
    }
  }, [processedData, selectedPackId]);

  useEffect(() => {
    if (selectedPackId) {
      const findPack = () => {
        if (processedData[selectedPackId]) return processedData[selectedPackId];
        for (let key in processedData) {
          const app = processedData[key].appends.find(a => a.id === selectedPackId);
          if (app) return app;
        }
        return null;
      };
      const pack = findPack();
      if (pack && pack.songs.length > 0) setSelectedSong(pack.songs[0]);
    }
  }, [selectedPackId, processedData]);

  if (!selectedPackId) {
    return (
      <div className="flex flex-col gap-10 overflow-y-auto custom-scrollbar p-6 h-full pb-20 select-none">
        {ARCAEA_ROWS.map(row => (
          <ArcaeaPackRow 
            key={row.title} 
            row={row} 
            processedData={processedData} 
            setSelectedPackId={setSelectedPackId} 
          />
        ))}
      </div>
    );
  }

  const findCurrentPack = () => {
    if (processedData[selectedPackId]) return processedData[selectedPackId];
    for (let key in processedData) {
      const app = processedData[key].appends.find(a => a.id === selectedPackId);
      if (app) return app;
    }
    return null;
  };
  const currentPack = findCurrentPack();

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full overflow-hidden bg-[#15151e]/60 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-4 p-4 border-b border-white/5 shrink-0 bg-black/40">
        <button 
          onClick={() => { setSelectedPackId(null); setSelectedSong(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl text-sm font-bold text-gray-400 transition-colors"
        >
          <FaChevronLeft /> Back to Packs
        </button>
        <div className="h-4 w-px bg-white/10"></div>
        <h3 className="font-bold text-purple-300 tracking-wide" style={{ fontFamily: "'Quicksand', sans-serif" }}>{currentPack?.name}</h3>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="md:w-1/3 min-w-[280px] overflow-y-auto custom-scrollbar border-r border-white/5 p-3 space-y-1.5 bg-black/20">
          {currentPack?.songs.map(s => {
            const isSelected = selectedSong?.id === s.id;
            return (
              <div 
                key={s.id}
                onClick={() => setSelectedSong(s)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-4
                  ${isSelected ? 'bg-gradient-to-r from-purple-600/30 to-transparent border-l-4 border-purple-400' : 'hover:bg-white/5 border-l-4 border-transparent'}
                `}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isSelected ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-gray-800/50 text-gray-500'}`}>
                  <FaMusic className="text-sm" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                    {s.title || s.basic_info?.title}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate font-sans mt-0.5">{s.basic_info?.artist}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden p-4 md:p-6 bg-[#0c0c11]">
          <ArcaeaSongDetail song={selectedSong} diffConfig={diffConfig} />
        </div>
      </div>
    </motion.div>
  );
};


// ==========================================
// 🚀 核心主组件
// ==========================================
export default function Songs() {
  const GAMES = [
    { id: 'maimai', label: '舞萌 DX' },
    { id: 'chunithm', label: 'CHUNITHM' },
    { id: 'arcaea', label: 'Arcaea' },
    { id: 'phigros', label: 'Phigros' },
    { id: 'pjsekai', label: 'Project SEKAI' },
  ];
  
  const [activeGame, setActiveGame] = useState('maimai');

  const [maimaiSongs, setMaimaiSongs] = useState([]);
  const [chunithmSongs, setChunithmSongs] = useState([]);
  const [arcaeaSongs, setArcaeaSongs] = useState([]); 
  
  const [isMaimaiLoading, setIsMaimaiLoading] = useState(true);
  const [isChuniLoading, setIsChuniLoading] = useState(false);
  const [isArcaeaLoading, setIsArcaeaLoading] = useState(false); 
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isNewOnly, setIsNewOnly] = useState(false);
  const [selectedDiffs, setSelectedDiffs] = useState([]); 
  const [dsMin, setDsMin] = useState("1.0");
  const [dsMax, setDsMax] = useState("15.7");
  const [bpmMin, setBpmMin] = useState("0");
  const [bpmMax, setBpmMax] = useState("400");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState([]);

  useEffect(() => {
    const fetchMaimai = async () => {
      try {
        setIsMaimaiLoading(true);
        const response = await fetch('/api/songs');
        if (!response.ok) throw new Error('网络请求失败');
        const rawData = await response.json();
        const processedData = rawData.map(song => {
          const isUtage = song.basic_info?.genre === '宴会场' || song.basic_info?.from === '宴会场' || song.type === 'UTAGE';
          if (isUtage) return { ...song, ds: song.ds ? song.ds.map(() => 0) : [0, 0, 0, 0, 0] };
          return song;
        });
        setMaimaiSongs(processedData.reverse()); 
      } catch (err) {
        setError("无法连接到 Maimai 数据源");
      } finally {
        setIsMaimaiLoading(false);
      }
    };
    fetchMaimai();
  }, []);

  useEffect(() => {
    if (activeGame === 'chunithm' && chunithmSongs.length === 0) {
      const fetchChunithm = async () => {
        try {
          setIsChuniLoading(true);
          let response = await fetch('/api/chunithm-songs').catch(() => null);
          if (!response || !response.ok) {
            response = await fetch('https://www.diving-fish.com/api/chunithmprober/music_data');
          }
          if (!response.ok) throw new Error('网络请求失败');
          const rawData = await response.json();
          setChunithmSongs(rawData.reverse()); 
        } catch (err) {
          setError("无法连接到 CHUNITHM 数据源");
        } finally {
          setIsChuniLoading(false);
        }
      };
      fetchChunithm();
    }
  }, [activeGame, chunithmSongs.length]);

  useEffect(() => {
    if (activeGame === 'arcaea' && arcaeaSongs.length === 0) {
      const fetchArcaea = async () => {
        try {
          setIsArcaeaLoading(true);
          const response = await fetch('/api/arcaea-songs');
          if (!response.ok) throw new Error('网络请求失败');
          const rawData = await response.json();
          const processedData = rawData.map(song => ({
            ...song,
            title: song.basic_info?.title || song.title_localized?.en || song.id
          }));
          setArcaeaSongs(processedData.reverse()); 
        } catch (err) {
          setError("无法连接到 Arcaea 数据源");
        } finally {
          setIsArcaeaLoading(false);
        }
      };
      fetchArcaea();
    }
  }, [activeGame, arcaeaSongs.length]);

  const currentSongs = activeGame === 'maimai' ? maimaiSongs : (activeGame === 'chunithm' ? chunithmSongs : arcaeaSongs);
  const isLoading = activeGame === 'maimai' ? isMaimaiLoading : (activeGame === 'chunithm' ? isChuniLoading : isArcaeaLoading);

  const MAIMAI_DIFF_CONFIG = [
    { label: 'BASIC', color: 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10', activeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', tagClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'ADVANCED', color: 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10', activeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', tagClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'EXPERT', color: 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10', activeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', tagClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'MASTER', color: 'text-purple-400 border-purple-500/20 hover:bg-purple-500/10', activeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40', tagClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { label: 'Re:MASTER', color: 'text-zinc-300 border-zinc-400/20 hover:bg-zinc-400/10', activeBg: 'bg-zinc-400/20 text-zinc-100 border-zinc-400/40', tagClass: 'text-zinc-100 bg-zinc-400/10 border-zinc-400/20' }
  ];

  const CHUNI_DIFF_CONFIG = [
    { label: 'BASIC', color: 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10', activeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', tagClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'ADVANCED', color: 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10', activeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', tagClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'EXPERT', color: 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10', activeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', tagClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'MASTER', color: 'text-purple-400 border-purple-500/20 hover:bg-purple-500/10', activeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40', tagClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { label: 'ULTIMA', color: 'text-red-500 border-red-500/20 hover:bg-red-500/10', activeBg: 'bg-[#150000] text-red-500 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]', tagClass: 'text-red-500 bg-[#1a0a0a] border-red-500/30' },
    { label: "WORLD'S END", color: 'text-zinc-300 border-white/20 hover:bg-white/10', activeBg: 'bg-white/10 text-white border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)]', tagClass: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-[#15151e] border-white/20' }
  ];

  const ARCAEA_DIFF_CONFIG = [
    { label: 'Past', color: 'text-blue-400 border-blue-500/20 hover:bg-blue-500/10', activeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(96,165,250,0.2)]' },
    { label: 'Present', color: 'text-green-400 border-green-500/20 hover:bg-green-500/10', activeBg: 'bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_8px_rgba(74,222,128,0.2)]' },
    { label: 'Future', color: 'text-purple-400 border-purple-500/20 hover:bg-purple-500/10', activeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-[0_0_8px_rgba(192,132,252,0.2)]' },
    { label: 'Beyond', color: 'text-red-500 border-red-500/20 hover:bg-red-500/10', activeBg: 'bg-red-500/20 text-red-500 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]' },
    { label: 'Eternal', color: 'text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/10', activeBg: 'bg-[#150015] text-fuchsia-400 border-fuchsia-500/40 shadow-[0_0_8px_rgba(232,121,249,0.2)]' }
  ];

  const currentDiffConfig = activeGame === 'chunithm' ? CHUNI_DIFF_CONFIG : (activeGame === 'arcaea' ? ARCAEA_DIFF_CONFIG : MAIMAI_DIFF_CONFIG);
  const maxDiffIndex = activeGame === 'chunithm' ? 5 : 4;

  const filterOptions = useMemo(() => {
    if (currentSongs.length === 0) return { categories: [], versions: [] };
    const catSet = new Set();
    const verSet = new Set();
    currentSongs.forEach(song => {
      if (song.basic_info?.genre) catSet.add(song.basic_info.genre);
      if (song.basic_info?.from) verSet.add(song.basic_info.from); 
    });
    return { categories: Array.from(catSet), versions: Array.from(verSet).sort().reverse() };
  }, [currentSongs]);

  const handleDsBlur = (type) => {
    let min = parseFloat(dsMin), max = parseFloat(dsMax);
    if (isNaN(min)) min = 1.0; if (isNaN(max)) max = 15.7;
    min = Math.max(0.0, Math.min(min, 15.7)); max = Math.max(0.0, Math.min(max, 15.7));
    if (min > max) { if (type === 'min') min = max; else max = min; }
    setDsMin(min.toFixed(1)); setDsMax(max.toFixed(1));
  };

  const handleBpmBlur = (type) => {
    let min = parseInt(bpmMin), max = parseInt(bpmMax);
    if (isNaN(min)) min = 0; if (isNaN(max)) max = 400;
    min = Math.max(0, Math.min(min, 1000)); max = Math.max(0, Math.min(max, 1000));
    if (min > max) { if (type === 'min') min = max; else max = min; }
    setBpmMin(min.toString()); setBpmMax(max.toString());
  };

  const filteredSongs = useMemo(() => {
    const numDsMin = parseFloat(dsMin) || 0.0; const numDsMax = parseFloat(dsMax) || 15.7;
    const numBpmMin = parseInt(bpmMin) || 0; const numBpmMax = parseInt(bpmMax) || 400;

    return currentSongs.filter(song => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = song.title?.toLowerCase().includes(query) || song.basic_info?.title?.toLowerCase().includes(query);
        const artistMatch = song.basic_info?.artist?.toLowerCase().includes(query);
        const idMatch = String(song.id).includes(query);
        const aliasMatch = song.aliases && song.aliases.some(alias => alias.toLowerCase().includes(query));
        if (!titleMatch && !artistMatch && !idMatch && !aliasMatch) return false;
      }
      if (activeGame === 'maimai' && isNewOnly && !song.basic_info?.is_new) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(song.basic_info?.genre)) return false;
      if (selectedVersions.length > 0 && !selectedVersions.includes(song.basic_info?.from)) return false;
      
      let bpm = 0;
      if (typeof song.basic_info?.bpm === 'string') {
        const match = song.basic_info.bpm.match(/\d+/);
        if (match) bpm = parseInt(match[0], 10);
      } else { bpm = song.basic_info?.bpm || 0; }
      if (bpm < numBpmMin || bpm > numBpmMax) return false;

      const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : Array.from({ length: maxDiffIndex + 1 }, (_, i) => i);
      const hasMatchingDs = diffsToCheck.some(diffIndex => {
        const constant = song.ds ? song.ds[diffIndex] : undefined;
        return constant !== undefined && constant !== null && constant >= numDsMin && constant <= numDsMax;
      });
      if (!hasMatchingDs) return false;
      return true; 
    });
  }, [currentSongs, activeGame, searchQuery, isNewOnly, selectedCategories, selectedVersions, dsMin, dsMax, bpmMin, bpmMax, selectedDiffs, maxDiffIndex]);

  const resetFilters = () => {
    setIsNewOnly(false); setSelectedDiffs([]); setDsMin("1.0"); setDsMax("15.7");
    setBpmMin("0"); setBpmMax("400"); setSelectedCategories([]); setSelectedVersions([]);
  };

  const toggleArrayItem = (array, setArray, item) => {
    if (array.includes(item)) setArray(array.filter(i => i !== item)); else setArray([...array, item]);
  };

  if (error) return <div className="text-rose-400 text-center mt-20 font-bold bg-[#0c0c11] h-screen">{error}</div>;

  const getThemeColorClass = (type) => {
    if (activeGame === 'chunithm') {
      if (type === 'bg') return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      if (type === 'text') return 'text-yellow-400 border-yellow-500/20';
      if (type === 'input') return 'focus:border-yellow-500/50';
      if (type === 'btn') return 'bg-yellow-500 text-zinc-900';
      if (type === 'spinner') return 'text-yellow-500/50';
      if (type === 'hoverText') return 'group-hover:text-yellow-300';
    }
    if (activeGame === 'arcaea') {
      if (type === 'bg') return 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]';
      if (type === 'text') return 'text-purple-400 border-purple-500/20';
      if (type === 'input') return 'focus:border-purple-500/50';
      if (type === 'btn') return 'bg-purple-500 text-white';
      if (type === 'spinner') return 'text-purple-500/50';
      if (type === 'hoverText') return 'group-hover:text-purple-300';
    }
    if (type === 'bg') return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
    if (type === 'text') return 'text-cyan-400 border-cyan-500/20';
    if (type === 'input') return 'focus:border-cyan-500/50';
    if (type === 'btn') return 'bg-cyan-500 text-white';
    if (type === 'spinner') return 'text-cyan-500/50';
    if (type === 'hoverText') return 'group-hover:text-cyan-300';
    return '';
  };

  return (
    <div className="w-full h-screen bg-[#0c0c11] text-zinc-200 flex flex-col font-sans selection:bg-indigo-500/30 relative">
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] mix-blend-screen transition-colors duration-1000 ${
          activeGame === 'chunithm' ? 'bg-yellow-900/10' : (activeGame === 'arcaea' ? 'bg-purple-900/10' : 'bg-cyan-900/10')
        }`}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-6 flex flex-col flex-1 overflow-hidden z-10">
        
        <div className="mb-6 flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-6 rounded-full transition-colors duration-500 ${getThemeColorClass('bg')}`}></div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3 transition-colors">
              曲目图鉴 
              {['maimai', 'chunithm', 'arcaea'].includes(activeGame) && !isLoading && (
                <span className={`text-xs border px-2.5 py-1 rounded-lg font-bold bg-[#15151e] ${getThemeColorClass('text')}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {filteredSongs.length} TRACKS
                </span>
              )}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
            {GAMES.map(game => {
              const isActive = activeGame === game.id;
              return (
                <button
                  key={game.id}
                  onClick={() => { setActiveGame(game.id); resetFilters(); }}
                  style={{ fontFamily: "'Quicksand', sans-serif" }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                    isActive ? 'bg-zinc-200 text-zinc-900 shadow-sm' : 'bg-[#15151e]/60 backdrop-blur-md border border-white/[0.05] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {game.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {['maimai', 'chunithm', 'arcaea'].includes(activeGame) ? (
            <motion.div key="content-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex flex-col flex-1 overflow-hidden">
              <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div className="relative flex-1 w-full md:w-auto md:max-w-md">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
                  <input 
                    type="text" placeholder="搜索曲名、曲师或 ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-[#15151e]/80 backdrop-blur-md border border-white/[0.05] text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition-colors shadow-sm text-sm placeholder-zinc-600 ${getThemeColorClass('input')}`}
                  />
                </div>
                {activeGame !== 'arcaea' && (
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border active:scale-95 ${isFilterOpen ? `${getThemeColorClass('btn')} border-transparent shadow-md` : 'bg-[#15151e]/80 backdrop-blur-md text-zinc-400 border-white/[0.05] hover:text-zinc-200'}`}
                  >
                    {isFilterOpen ? <FaTimes /> : <FaFilter />} 高级筛选
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row flex-1 gap-5 overflow-hidden">
                {isFilterOpen && activeGame !== 'arcaea' && (
                  <div className="w-full md:w-80 shrink-0 max-h-[40vh] md:max-h-none bg-[#15151e]/80 backdrop-blur-md rounded-2xl border border-white/[0.05] shadow-xl overflow-y-auto p-5 custom-scrollbar flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-zinc-500 rounded-full"></div>
                        <span className="font-bold text-zinc-100 text-sm">筛选参数</span>
                      </div>
                      <button onClick={resetFilters} className="text-zinc-500 hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 font-bold"><FaUndo /> 重置</button>
                    </div>

                    {activeGame === 'maimai' && (
                      <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">仅看新曲 (New Only)</span>
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={isNewOnly} onChange={(e) => setIsNewOnly(e.target.checked)} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${isNewOnly ? 'bg-cyan-500' : 'bg-[#222228]'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isNewOnly ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Difficulty</label>
                      <div className="flex flex-wrap gap-2">
                        {currentDiffConfig.map((diff, index) => {
                          const isActive = selectedDiffs.includes(index);
                          return (
                            <button
                              key={index} onClick={() => toggleArrayItem(selectedDiffs, setSelectedDiffs, index)} style={{ fontFamily: "'Quicksand', sans-serif" }}
                              className={`text-[11px] px-3 py-1.5 rounded-lg font-bold border transition-all active:scale-95 ${isActive ? diff.activeBg : diff.color}`}
                            >{diff.label}</button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 flex justify-between uppercase tracking-widest">
                        <span>Constant Range</span>
                        <span style={{ fontFamily: "'Quicksand', sans-serif" }} className={getThemeColorClass('text').split(' ')[0]}>
                          {(parseFloat(dsMin)||0.0).toFixed(1)} - {(parseFloat(dsMax)||15.7).toFixed(1)}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" min="0.0" max="15.7" value={dsMin} onChange={e => setDsMin(e.target.value)} onBlur={() => handleDsBlur('min')} className={`w-full bg-[#0c0c11] border border-white/[0.05] rounded-xl p-2 text-center text-sm text-zinc-200 outline-none transition-colors ${getThemeColorClass('input')}`} style={{ fontFamily: "'Quicksand', sans-serif" }} />
                        <span className="text-zinc-600">-</span>
                        <input type="number" step="0.1" min="0.0" max="15.7" value={dsMax} onChange={e => setDsMax(e.target.value)} onBlur={() => handleDsBlur('max')} className={`w-full bg-[#0c0c11] border border-white/[0.05] rounded-xl p-2 text-center text-sm text-zinc-200 outline-none transition-colors ${getThemeColorClass('input')}`} style={{ fontFamily: "'Quicksand', sans-serif" }} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Categories</label>
                      <div className="flex flex-wrap gap-1.5">
                        {filterOptions.categories.map(cat => {
                          const isActive = selectedCategories.includes(cat);
                          return <button key={cat} onClick={() => toggleArrayItem(selectedCategories, setSelectedCategories, cat)} className={`text-xs px-2.5 py-1.5 rounded-lg transition-all border active:scale-95 ${isActive ? 'bg-zinc-200 text-zinc-900 border-transparent font-bold' : 'bg-[#0c0c11] text-zinc-400 border-white/[0.05] hover:text-zinc-200'}`}>{cat}</button>;
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 bg-[#15151e]/80 backdrop-blur-md rounded-2xl border border-white/[0.05] overflow-hidden shadow-sm flex flex-col relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0c11]/50 backdrop-blur-sm z-10">
                      <FaSpinner className={`animate-spin text-4xl mb-4 ${getThemeColorClass('spinner')}`} />
                    </div>
                  )}

                  {filteredSongs.length === 0 && !isLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                      <FaSearch className="text-4xl mb-3 opacity-20" />
                      <p className="text-sm font-medium">未找到符合条件的曲目</p>
                    </div>
                  ) : activeGame === 'arcaea' ? (
                    <ArcaeaPackExplorer songs={filteredSongs} diffConfig={ARCAEA_DIFF_CONFIG} />
                  ) : (
                    <Virtuoso
                      className="h-full custom-scrollbar"
                      data={filteredSongs}
                      itemContent={(index, song) => {
                        const isMaimai = activeGame === 'maimai';
                        let displayDs = 0; 
                        let dsTagClass = currentDiffConfig[maxDiffIndex].tagClass; 
                        
                        const numDsMin = parseFloat(dsMin) || 0.0;
                        const numDsMax = parseFloat(dsMax) || 15.7;
                        const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : Array.from({ length: maxDiffIndex + 1 }, (_, i) => i);
                        
                        for (let i = maxDiffIndex; i >= 0; i--) {
                          const constant = song.ds ? song.ds[i] : undefined;
                          if (constant !== undefined && constant !== null && diffsToCheck.includes(i) && constant >= numDsMin && constant <= numDsMax) {
                            displayDs = constant; dsTagClass = currentDiffConfig[i].tagClass; break;
                          }
                        }

                        const isUtageVisual = isMaimai && displayDs === 0;
                        const isWE = !isMaimai && song.ds && song.ds[5] > 0;
                        const gameTagColor = isMaimai 
                          ? (song.type === 'DX' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : song.type === 'UTAGE' ? 'text-pink-400 border-pink-500/20 bg-pink-500/10' : 'text-orange-400 border-orange-500/20 bg-orange-500/10')
                          : (isWE ? 'text-cyan-300 border-cyan-500/20 bg-cyan-500/10' : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10');
                        const gameTagText = isMaimai ? (song.type === 'UTAGE' ? 'UT' : song.type) : (isWE ? 'WE' : 'CHU');

                        return (
                          <div 
                            className="flex items-center justify-between p-4 border-b border-white/[0.02] hover:bg-[#1a1a24] cursor-pointer transition-colors group"
                            onClick={() => { setSelectedSong(song); setIsDrawerOpen(true); }}
                          >
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div className={`shrink-0 w-11 text-center text-[10px] font-bold py-1.5 rounded-lg border ${gameTagColor}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                {gameTagText}
                              </div>
                              <div className="flex flex-col truncate min-w-0">
                                <span className={`text-base font-bold text-zinc-100 truncate transition-colors flex items-center gap-2 ${getThemeColorClass('hoverText')}`}>
                                  {song.title || song.basic_info?.title}
                                  {song.basic_info?.is_new && <span className="bg-rose-500/20 text-rose-400 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-bold">NEW</span>}
                                </span>
                                <span className="text-xs text-zinc-500 truncate mt-0.5 font-medium flex items-center gap-1.5">
                                  {song.basic_info?.artist} <span className="opacity-30">|</span> <span style={{ fontFamily: "'Quicksand', sans-serif" }}>BPM: {song.basic_info?.bpm}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-3 items-center shrink-0 ml-4">
                              <span className="px-2.5 py-1 bg-[#0c0c11] border border-white/[0.05] text-zinc-400 text-[10px] rounded-lg hidden md:block max-w-[160px] truncate text-right">
                                {song.basic_info?.from}
                              </span>
                              <span className={`font-bold border px-3 py-1 rounded-lg text-sm ${isUtageVisual ? 'text-pink-400 bg-pink-500/10 border-pink-500/20' : dsTagClass}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
                                {isUtageVisual ? 'UTAGE' : isWE ? 'WE' : displayDs.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="wip" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 w-full flex flex-col items-center justify-center border border-white/[0.05] bg-[#15151e]/50 backdrop-blur-md rounded-2xl">
              <div className="w-20 h-20 rounded-2xl bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center mb-6 shadow-sm"><FaDatabase className="text-3xl text-zinc-600 opacity-50" /></div>
              <h2 className="text-2xl font-bold text-zinc-200 tracking-tight mb-2">数据接入中</h2>
              <p className="text-sm text-zinc-500 font-medium text-center leading-relaxed">该游戏的官方数据接口与档案库正在建设中。<br/>敬请期待后续版本更新。</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeGame !== 'arcaea' && (
        <SongDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} song={selectedSong} activeGame={activeGame} />
      )}
    </div>
  );
}