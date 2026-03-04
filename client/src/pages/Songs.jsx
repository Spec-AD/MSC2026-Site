import React, { useState, useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { FaSpinner, FaSearch, FaFilter, FaTimes, FaUndo, FaMusic } from 'react-icons/fa';
import SongDrawer from '../components/SongDrawer';
import { useToast } from '../context/ToastContext';

export default function Songs() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // UI 状态
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ==========================================
  // 核心筛选状态
  // ==========================================
  const [isNewOnly, setIsNewOnly] = useState(false);
  const [selectedDiffs, setSelectedDiffs] = useState([]); 
  const [dsMin, setDsMin] = useState("1.0");
  const [dsMax, setDsMax] = useState("15.0");
  const [bpmMin, setBpmMin] = useState("0");
  const [bpmMax, setBpmMax] = useState("400");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState([]);

  // ==========================================
  // 初始化拉取数据并处理【宴会场】定数
  // ==========================================
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/proxy/diving-fish/music_data');
        if (!response.ok) throw new Error('网络请求失败');
        
        const rawData = await response.json();
        
        const processedData = rawData.map(song => {
          const isUtage = 
            song.basic_info?.genre === '宴会场' || 
            song.basic_info?.from === '宴会场' || 
            song.type === 'UTAGE';

          if (isUtage) {
            return { ...song, ds: song.ds ? song.ds.map(() => 0) : [0, 0, 0, 0, 0] };
          }
          return song;
        });

        setSongs(processedData.reverse()); 
      } catch (err) {
        console.error("获取曲目数据失败:", err);
        setError("无法连接到查分器服务器，请检查网络或跨域设置");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const filterOptions = useMemo(() => {
    if (songs.length === 0) return { categories: [], versions: [] };
    
    const catSet = new Set();
    const verSet = new Set();
    
    songs.forEach(song => {
      if (song.basic_info?.genre) catSet.add(song.basic_info.genre);
      if (song.basic_info?.from) verSet.add(song.basic_info.from); 
    });

    return {
      categories: Array.from(catSet),
      versions: Array.from(verSet).sort().reverse() 
    };
  }, [songs]);

  // ==========================================
  // 输入限制校验逻辑
  // ==========================================
  const handleDsBlur = (type) => {
    let min = parseFloat(dsMin);
    let max = parseFloat(dsMax);
    
    if (isNaN(min)) min = 1.0;
    if (isNaN(max)) max = 15.0;

    min = Math.max(0.0, Math.min(min, 15.0));
    max = Math.max(0.0, Math.min(max, 15.0));

    if (min > max) {
      if (type === 'min') min = max;
      else max = min;
    }

    setDsMin(min.toFixed(1));
    setDsMax(max.toFixed(1));
  };

  const handleBpmBlur = (type) => {
    let min = parseInt(bpmMin);
    let max = parseInt(bpmMax);
    
    if (isNaN(min)) min = 0;
    if (isNaN(max)) max = 400;

    min = Math.max(0, Math.min(min, 1000));
    max = Math.max(0, Math.min(max, 1000));

    if (min > max) {
      if (type === 'min') min = max;
      else max = min;
    }

    setBpmMin(min.toString());
    setBpmMax(max.toString());
  };

  // ==========================================
  // 超级过滤引擎
  // ==========================================
  const filteredSongs = useMemo(() => {
    const numDsMin = parseFloat(dsMin) || 0.0;
    const numDsMax = parseFloat(dsMax) || 15.0;
    const numBpmMin = parseInt(bpmMin) || 0;
    const numBpmMax = parseInt(bpmMax) || 400;

    return songs.filter(song => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.basic_info.artist.toLowerCase().includes(query);
        const idMatch = String(song.id).includes(query);
        if (!titleMatch && !artistMatch && !idMatch) return false;
      }
      if (isNewOnly && !song.basic_info.is_new) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(song.basic_info.genre)) return false;
      if (selectedVersions.length > 0 && !selectedVersions.includes(song.basic_info.from)) return false;
      
      const bpm = song.basic_info.bpm;
      if (bpm < numBpmMin || bpm > numBpmMax) return false;

      const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : [0, 1, 2, 3, 4];
      const hasMatchingDs = diffsToCheck.some(diffIndex => {
        const constant = song.ds[diffIndex];
        return constant !== undefined && constant >= numDsMin && constant <= numDsMax;
      });

      if (!hasMatchingDs) return false;
      return true; 
    });
  }, [songs, searchQuery, isNewOnly, selectedCategories, selectedVersions, dsMin, dsMax, bpmMin, bpmMax, selectedDiffs]);

  const resetFilters = () => {
    setIsNewOnly(false);
    setSelectedDiffs([]);
    setDsMin("1.0"); 
    setDsMax("15.0");
    setBpmMin("0");
    setBpmMax("400");
    setSelectedCategories([]);
    setSelectedVersions([]);
  };

  const toggleArrayItem = (array, setArray, item) => {
    if (array.includes(item)) setArray(array.filter(i => i !== item));
    else setArray([...array, item]);
  };

  const handleOpenDrawer = (song) => {
    setSelectedSong(song);
    setIsDrawerOpen(true);
  };

  // 内敛化难度 UI 样式配置 (去掉了发光 shadow，回归纯净卡片风)
  const DIFF_CONFIG = [
    { label: 'BASIC', color: 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10', activeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', tagClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'ADVANCED', color: 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10', activeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', tagClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'EXPERT', color: 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10', activeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', tagClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'MASTER', color: 'text-purple-400 border-purple-500/20 hover:bg-purple-500/10', activeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40', tagClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { label: 'Re:MASTER', color: 'text-zinc-300 border-zinc-400/20 hover:bg-zinc-400/10', activeBg: 'bg-zinc-400/20 text-zinc-100 border-zinc-400/40', tagClass: 'text-zinc-100 bg-zinc-400/10 border-zinc-400/20' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#111115] text-zinc-500 font-sans">
        <FaSpinner className="animate-spin text-4xl mb-4" />
        <p className="text-sm font-medium">正在同步曲库数据...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-rose-400 text-center mt-20 font-bold bg-[#111115] h-screen">{error}</div>;
  }

  return (
    <div className="w-full h-screen bg-[#111115] text-zinc-200 flex flex-col font-sans selection:bg-zinc-600/40">
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-6 flex flex-col flex-1 overflow-hidden">
        
        {/* 头部与搜索 */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
              <FaMusic className="text-cyan-400 text-2xl" /> 曲目图鉴 
              <span className="text-xs bg-[#18181c] text-zinc-400 border border-white/[0.05] px-2.5 py-1 rounded-lg font-mono font-medium">
                {filteredSongs.length} TRACKS
              </span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
              <input 
                type="text" 
                placeholder="搜索曲名、曲师或 ID..." 
                value={searchQuery}
                className="w-full bg-[#141418] border border-white/[0.05] text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500 transition-colors shadow-sm text-sm placeholder-zinc-600"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border active:scale-95 ${isFilterOpen ? 'bg-zinc-200 text-zinc-900 border-transparent shadow-sm' : 'bg-[#18181c] text-zinc-400 border-white/[0.05] hover:text-zinc-200'}`}
            >
              {isFilterOpen ? <FaTimes /> : <FaFilter />} 筛选
            </button>
          </div>
        </div>

        {/* 主体区域 */}
        <div className="flex flex-col md:flex-row flex-1 gap-5 overflow-hidden">
          
          {/* 高级筛选控制台 */}
          {isFilterOpen && (
            <div className="w-full md:w-80 shrink-0 max-h-[55vh] md:max-h-none bg-[#18181c] rounded-2xl border border-white/[0.05] shadow-xl overflow-y-auto p-5 custom-scrollbar flex flex-col gap-6">
              
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <span className="font-semibold text-zinc-100 flex items-center gap-2">筛选选项</span>
                <button onClick={resetFilters} className="text-zinc-500 hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 font-medium">
                  <FaUndo /> 重置
                </button>
              </div>

              {/* 1. 仅看新曲 */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">仅看新曲 (New Only)</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isNewOnly} onChange={(e) => setIsNewOnly(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isNewOnly ? 'bg-cyan-500' : 'bg-[#222228]'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isNewOnly ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>

              {/* 2. 难度分离 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500">难度筛选</label>
                <div className="flex flex-wrap gap-2">
                  {DIFF_CONFIG.map((diff, index) => {
                    const isActive = selectedDiffs.includes(index);
                    return (
                      <button
                        key={index}
                        onClick={() => toggleArrayItem(selectedDiffs, setSelectedDiffs, index)}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-bold border transition-all active:scale-95 ${isActive ? diff.activeBg : diff.color}`}
                      >
                        {diff.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. 定数范围 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 flex justify-between">
                  <span>定数区间</span>
                  <span className="text-zinc-400 font-mono">
                    {(parseFloat(dsMin)||0.0).toFixed(1)} - {(parseFloat(dsMax)||15.0).toFixed(1)}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.1" min="0.0" max="15.0"
                    value={dsMin} onChange={e => setDsMin(e.target.value)} onBlur={() => handleDsBlur('min')}
                    className="w-full bg-[#141418] border border-white/[0.05] rounded-xl p-2 text-center font-mono text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors" 
                  />
                  <span className="text-zinc-600">-</span>
                  <input 
                    type="number" step="0.1" min="0.0" max="15.0"
                    value={dsMax} onChange={e => setDsMax(e.target.value)} onBlur={() => handleDsBlur('max')}
                    className="w-full bg-[#141418] border border-white/[0.05] rounded-xl p-2 text-center font-mono text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors" 
                  />
                </div>
              </div>

              {/* 4. BPM 范围 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 flex justify-between">
                  <span>BPM 区间</span>
                  <span className="text-zinc-400 font-mono">
                    {parseInt(bpmMin)||0} - {parseInt(bpmMax)||0}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="1" min="0" max="1000"
                    value={bpmMin} onChange={e => setBpmMin(e.target.value)} onBlur={() => handleBpmBlur('min')}
                    className="w-full bg-[#141418] border border-white/[0.05] rounded-xl p-2 text-center font-mono text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors" 
                  />
                  <span className="text-zinc-600">-</span>
                  <input 
                    type="number" step="1" min="0" max="1000"
                    value={bpmMax} onChange={e => setBpmMax(e.target.value)} onBlur={() => handleBpmBlur('max')}
                    className="w-full bg-[#141418] border border-white/[0.05] rounded-xl p-2 text-center font-mono text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors" 
                  />
                </div>
              </div>

              {/* 5. 分类多选 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500">分类 (Categories)</label>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.categories.map(cat => {
                    const isActive = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleArrayItem(selectedCategories, setSelectedCategories, cat)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-all border active:scale-95 ${isActive ? 'bg-zinc-200 text-zinc-900 border-transparent font-bold' : 'bg-[#141418] text-zinc-400 border-white/[0.05] hover:text-zinc-200'}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. 版本多选 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500">版本 (Versions)</label>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.versions.map(ver => {
                    const isActive = selectedVersions.includes(ver);
                    return (
                      <button
                        key={ver}
                        onClick={() => toggleArrayItem(selectedVersions, setSelectedVersions, ver)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-all border active:scale-95 ${isActive ? 'bg-zinc-200 text-zinc-900 border-transparent font-bold' : 'bg-[#141418] text-zinc-400 border-white/[0.05] hover:text-zinc-200'}`}
                      >
                        {ver}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* 虚拟列表主体 */}
          <div className="flex-1 bg-[#18181c] rounded-2xl border border-white/[0.05] overflow-hidden shadow-sm flex flex-col">
            {filteredSongs.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                <FaSearch className="text-4xl mb-3 opacity-20" />
                <p className="text-sm font-medium">未找到符合条件的曲目</p>
              </div>
            ) : (
              <Virtuoso
                className="h-full custom-scrollbar"
                data={filteredSongs}
                itemContent={(index, song) => {
                  const isDX = song.type === 'DX';

                  // 智能定数高亮系统
                  let displayDs = song.ds[song.ds.length - 1]; 
                  let dsTagClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20'; 
                  
                  const numDsMin = parseFloat(dsMin) || 0.0;
                  const numDsMax = parseFloat(dsMax) || 15.0;
                  const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : [0, 1, 2, 3, 4];
                  
                  for (let i = 4; i >= 0; i--) {
                    const constant = song.ds[i];
                    if (constant !== undefined && diffsToCheck.includes(i) && constant >= numDsMin && constant <= numDsMax) {
                      displayDs = constant;
                      dsTagClass = DIFF_CONFIG[i].tagClass;
                      break;
                    }
                  }

                  // 宴会场视觉特殊标记
                  const isUtageVisual = displayDs === 0;

                  return (
                    <div 
                      className="flex items-center justify-between p-4 border-b border-white/[0.02] hover:bg-[#1a1a20] cursor-pointer transition-colors group"
                      onClick={() => handleOpenDrawer(song)}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`shrink-0 w-11 text-center text-[10px] font-bold py-1.5 rounded-lg border ${
                          isDX ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 
                          song.type === 'UTAGE' ? 'text-pink-400 border-pink-500/20 bg-pink-500/10' : 
                          'text-orange-400 border-orange-500/20 bg-orange-500/10'
                        }`}>
                          {song.type === 'UTAGE' ? 'UT' : song.type}
                        </div>
                        
                        <div className="flex flex-col truncate min-w-0">
                          <span className="text-base font-bold text-zinc-100 truncate group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                            {song.title}
                            {song.basic_info.is_new && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">NEW</span>}
                          </span>
                          <span className="text-xs text-zinc-500 truncate mt-0.5 font-medium">
                            {song.basic_info.artist} <span className="mx-1 opacity-50">|</span> BPM: {song.basic_info.bpm}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center shrink-0 ml-4">
                        <span className="px-2.5 py-1 bg-[#141418] border border-white/[0.05] text-zinc-400 text-xs rounded-lg hidden md:block max-w-[160px] truncate text-right">
                          {song.basic_info.from}
                        </span>
                        <span className={`font-mono font-bold border px-3 py-1 rounded-lg text-sm ${isUtageVisual ? 'text-pink-400 bg-pink-500/10 border-pink-500/20' : dsTagClass}`}>
                          {isUtageVisual ? 'UTAGE' : displayDs.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

        </div>
      </div>

      <SongDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        song={selectedSong} 
      />
    </div>
  );
}