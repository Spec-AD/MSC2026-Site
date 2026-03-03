import React, { useState, useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { FaSpinner, FaSearch, FaFilter, FaTimes, FaUndo } from 'react-icons/fa';
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
  // 核心筛选状态 (Filter States)
  // ==========================================
  const [isNewOnly, setIsNewOnly] = useState(false);
  
  // 难度分离：0=绿, 1=黄, 2=红, 3=紫, 4=白。空数组代表不限
  const [selectedDiffs, setSelectedDiffs] = useState([]); 
  
  // 定数上下限 (为了更好的输入体验，暂存为字符串，计算时转为数字)
  const [dsMin, setDsMin] = useState("1.0");
  const [dsMax, setDsMax] = useState("15.0");
  
  // BPM 上下限
  const [bpmMin, setBpmMin] = useState("0");
  const [bpmMax, setBpmMax] = useState("400");

  // 高级多选状态
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
        
        // 🔥 数据预处理：将【宴会场】相关曲目的定数强制设为 0
        const processedData = rawData.map(song => {
          // 判断是否为宴会场谱面（兼容多种可能的字段标记）
          const isUtage = 
            song.basic_info?.genre === '宴会场' || 
            song.basic_info?.from === '宴会场' || 
            song.type === 'UTAGE';

          if (isUtage) {
            return {
              ...song,
              // 将原有的 ds 数组全部替换为 0 (例如 [0, 0, 0, 0, 0])
              ds: song.ds ? song.ds.map(() => 0) : [0, 0, 0, 0, 0]
            };
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

  // 动态提取所有可选的“分类(Genre)”和“版本(From)”
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
      // 排除掉被设为 0 的宴会场在版本列表里的干扰排序（如果有需要也可以保留）
      versions: Array.from(verSet).sort().reverse() 
    };
  }, [songs]);

  // ==========================================
  // 输入限制校验逻辑 (在输入框失焦时触发)
  // ==========================================
  const handleDsBlur = (type) => {
    let min = parseFloat(dsMin);
    let max = parseFloat(dsMax);
    
    if (isNaN(min)) min = 1.0;
    if (isNaN(max)) max = 15.0;

    // 允许下限设置为 0，这样如果用户想看宴会场谱面，可以把下限拉到 0
    min = Math.max(0.0, Math.min(min, 15.0));
    max = Math.max(0.0, Math.min(max, 15.0));

    // 逻辑冲突限制：如果下限 > 上限
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

    // 绝对范围限制
    min = Math.max(0, Math.min(min, 1000));
    max = Math.max(0, Math.min(max, 1000));

    // 逻辑冲突限制
    if (min > max) {
      if (type === 'min') min = max;
      else max = min;
    }

    setBpmMin(min.toString());
    setBpmMax(max.toString());
  };

  // ==========================================
  // 超级过滤引擎 (Ultimate Filter Engine)
  // ==========================================
  const filteredSongs = useMemo(() => {
    const numDsMin = parseFloat(dsMin) || 0.0;
    const numDsMax = parseFloat(dsMax) || 15.0;
    const numBpmMin = parseInt(bpmMin) || 0;
    const numBpmMax = parseInt(bpmMax) || 400;

    return songs.filter(song => {
      // 1. 文本搜索
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.basic_info.artist.toLowerCase().includes(query);
        const idMatch = String(song.id).includes(query);
        if (!titleMatch && !artistMatch && !idMatch) return false;
      }

      // 2. 仅看新曲
      if (isNewOnly && !song.basic_info.is_new) return false;

      // 3. 分类筛选
      if (selectedCategories.length > 0 && !selectedCategories.includes(song.basic_info.genre)) {
        return false;
      }

      // 4. 版本筛选
      if (selectedVersions.length > 0 && !selectedVersions.includes(song.basic_info.from)) {
        return false;
      }

      // 5. BPM 范围筛选
      const bpm = song.basic_info.bpm;
      if (bpm < numBpmMin || bpm > numBpmMax) return false;

      // 6. 难度分离 & 定数范围筛选
      const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : [0, 1, 2, 3, 4];
      const hasMatchingDs = diffsToCheck.some(diffIndex => {
        const constant = song.ds[diffIndex];
        return constant !== undefined && constant >= numDsMin && constant <= numDsMax;
      });

      if (!hasMatchingDs) return false;

      return true; 
    });
  }, [songs, searchQuery, isNewOnly, selectedCategories, selectedVersions, dsMin, dsMax, bpmMin, bpmMax, selectedDiffs]);

  // 重置所有筛选条件
  const resetFilters = () => {
    setIsNewOnly(false);
    setSelectedDiffs([]);
    setDsMin("1.0"); // 默认重置回 1.0，自动隐藏定数为 0 的宴会场
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

  // 难度 UI 样式配置
  const DIFF_CONFIG = [
    { label: 'BASIC', color: 'text-green-400 border-green-500/50 hover:bg-green-500/20', activeBg: 'bg-green-500 text-white', tagClass: 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' },
    { label: 'ADVANCED', color: 'text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20', activeBg: 'bg-yellow-500 text-white', tagClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.1)]' },
    { label: 'EXPERT', color: 'text-red-400 border-red-500/50 hover:bg-red-500/20', activeBg: 'bg-red-500 text-white', tagClass: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]' },
    { label: 'MASTER', color: 'text-purple-400 border-purple-500/50 hover:bg-purple-500/20', activeBg: 'bg-purple-500 text-white', tagClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]' },
    { label: 'Re:MASTER', color: 'text-purple-200 border-purple-300/50 hover:bg-purple-300/20', activeBg: 'bg-purple-300 text-black', tagClass: 'text-purple-200 bg-purple-500/20 border-purple-300/30 shadow-[0_0_10px_rgba(216,180,254,0.2)]' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-purple-400 font-maimai">
        <FaSpinner className="animate-spin text-5xl mb-6" />
        <p className="text-lg animate-pulse">正在同步...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center mt-20 font-bold">{error}</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col font-maimai">
      
      {/* 头部与搜索 */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide flex items-center gap-3">
            曲目图鉴 
            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-lg tracking-widest font-mono">
              {filteredSongs.length} TRACKS
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="搜索曲名、曲师或 ID..." 
              value={searchQuery}
              className="w-full bg-gray-900/80 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 transition-colors shadow-inner text-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${isFilterOpen ? 'bg-purple-500 text-white border-purple-400' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
          >
            {isFilterOpen ? <FaTimes /> : <FaFilter />} 筛选
          </button>
        </div>
      </div>

      {/* 主体区域 */}
      <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden">
        
        {/* 高级筛选控制台 */}
        {isFilterOpen && (
          <div className="w-full md:w-80 shrink-0 max-h-[55vh] md:max-h-none bg-gray-900/40 rounded-2xl border border-gray-800/60 shadow-2xl backdrop-blur-sm overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex flex-col gap-6">
            
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="font-bold text-purple-400 tracking-widest flex items-center gap-2"><FaFilter/> ADVANCED FILTER</span>
              <button onClick={resetFilters} className="text-gray-500 hover:text-white transition-colors" title="重置全部">
                <FaUndo />
              </button>
            </div>

            {/* 1. 仅看新曲 */}
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">🆕 仅看新曲 (New Only)</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isNewOnly} onChange={(e) => setIsNewOnly(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isNewOnly ? 'bg-purple-500' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isNewOnly ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>

            {/* 2. 难度分离 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Difficulty (难度限制)</label>
              <div className="flex flex-wrap gap-2">
                {DIFF_CONFIG.map((diff, index) => {
                  const isActive = selectedDiffs.includes(index);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleArrayItem(selectedDiffs, setSelectedDiffs, index)}
                      className={`text-[10px] px-2.5 py-1 rounded-md font-black italic border transition-all ${isActive ? diff.activeBg + ' border-transparent shadow-md' : diff.color}`}
                    >
                      {diff.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 定数范围 (带输入限制) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                <span>DS Range (定数)</span>
                <span className="text-purple-400 font-mono">
                  {(parseFloat(dsMin)||0.0).toFixed(1)} - {(parseFloat(dsMax)||15.0).toFixed(1)}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  step="0.1"
                  min="0.0"
                  max="15.0"
                  value={dsMin} 
                  onChange={e => setDsMin(e.target.value)} 
                  onBlur={() => handleDsBlur('min')}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" 
                />
                <span className="text-gray-600">-</span>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.0"
                  max="15.0"
                  value={dsMax} 
                  onChange={e => setDsMax(e.target.value)} 
                  onBlur={() => handleDsBlur('max')}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" 
                />
              </div>
            </div>

            {/* 4. BPM 范围 (带输入限制) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                <span>BPM Range</span>
                <span className="text-purple-400 font-mono">
                  {parseInt(bpmMin)||0} - {parseInt(bpmMax)||0}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  step="1" 
                  min="0"
                  max="1000"
                  value={bpmMin} 
                  onChange={e => setBpmMin(e.target.value)} 
                  onBlur={() => handleBpmBlur('min')}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" 
                />
                <span className="text-gray-600">-</span>
                <input 
                  type="number" 
                  step="1" 
                  min="0"
                  max="1000"
                  value={bpmMax} 
                  onChange={e => setBpmMax(e.target.value)} 
                  onBlur={() => handleBpmBlur('max')}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" 
                />
              </div>
            </div>

            {/* 5. 分类多选 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Categories (分类)</label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.categories.map(cat => {
                  const isActive = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleArrayItem(selectedCategories, setSelectedCategories, cat)}
                      className={`text-[10px] px-2 py-1 rounded transition-all border ${isActive ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. 版本多选 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Versions (版本)</label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.versions.map(ver => {
                  const isActive = selectedVersions.includes(ver);
                  return (
                    <button
                      key={ver}
                      onClick={() => toggleArrayItem(selectedVersions, setSelectedVersions, ver)}
                      className={`text-[10px] px-2 py-1 rounded transition-all border ${isActive ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-500'}`}
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
        <div className="flex-1 bg-gray-900/40 rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl backdrop-blur-sm">
          {filteredSongs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <FaSearch className="text-5xl mb-4 opacity-20" />
              <p className="tracking-widest">未找到符合条件的曲目</p>
            </div>
          ) : (
            <Virtuoso
              className="h-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
              data={filteredSongs}
              itemContent={(index, song) => {
                const isDX = song.type === 'DX';

                // 智能定数高亮系统
                let displayDs = song.ds[song.ds.length - 1]; 
                let dsTagClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]'; 
                
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

                // 宴会场视觉特殊标记（可选，让界面更有层次感）
                const isUtageVisual = displayDs === 0;

                return (
                  <div 
                    className="flex items-center justify-between p-4 border-b border-gray-800/40 hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                    onClick={() => handleOpenDrawer(song)}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`shrink-0 w-10 text-center text-[10px] font-black py-1 rounded border ${
                        isDX ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 
                        song.type === 'UTAGE' ? 'text-pink-400 border-pink-500/30 bg-pink-500/10' : 
                        'text-orange-400 border-orange-500/30 bg-orange-500/10'
                      }`}>
                        {song.type === 'UTAGE' ? 'UT' : song.type}
                      </div>
                      
                      <div className="flex flex-col truncate">
                        <span className="text-lg font-bold text-gray-100 truncate group-hover:text-purple-300 transition-colors flex items-center gap-2">
                          {song.title}
                          {song.basic_info.is_new && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold italic">NEW</span>}
                        </span>
                        <span className="text-xs text-gray-500 truncate mt-0.5">
                          {song.basic_info.artist} | BPM: {song.basic_info.bpm}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center shrink-0 ml-4">
                      <span className="px-2 py-1 bg-gray-800/80 text-gray-400 text-xs rounded hidden md:block max-w-[150px] truncate text-right">
                        {song.basic_info.from}
                      </span>
                      <span className={`font-mono font-bold border px-2.5 py-1 rounded-lg text-sm ${isUtageVisual ? 'text-pink-400 bg-pink-500/10 border-pink-500/20' : dsTagClass}`}>
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

      <SongDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        song={selectedSong} 
      />
    </div>
  );
}