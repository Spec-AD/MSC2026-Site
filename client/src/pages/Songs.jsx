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
  
  // 🔥 新增：UI 状态
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ==========================================
  // 🔥 核心筛选状态 (Filter States)
  // ==========================================
  const [isNewOnly, setIsNewOnly] = useState(false);
  
  // 难度分离：0=绿, 1=黄, 2=红, 3=紫, 4=白。空数组代表不限
  const [selectedDiffs, setSelectedDiffs] = useState([]); 
  
  // 定数上下限 (Maimai DX 定数范围大约 1.0 ~ 15.0)
  const [dsMin, setDsMin] = useState(1.0);
  const [dsMax, setDsMax] = useState(15.0);
  
  // BPM 上下限
  const [bpmMin, setBpmMin] = useState(0);
  const [bpmMax, setBpmMax] = useState(400);

  // 高级多选状态
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState([]);

  // 初始化拉取水鱼真实数据
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/proxy/diving-fish/music_data');
        if (!response.ok) throw new Error('网络请求失败');
        
        const data = await response.json();
        setSongs(data.reverse()); 
      } catch (err) {
        console.error("获取曲目数据失败:", err);
        setError("无法连接到查分器服务器，请检查网络或跨域设置");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongs();
  }, []);

  // ==========================================
  // 动态提取所有可选的“分类(Genre)”和“版本(From)”
  // ==========================================
  const filterOptions = useMemo(() => {
    if (songs.length === 0) return { categories: [], versions: [] };
    
    const catSet = new Set();
    const verSet = new Set();
    
    songs.forEach(song => {
      if (song.basic_info?.genre) catSet.add(song.basic_info.genre);
      if (song.basic_info?.from) verSet.add(song.basic_info.from); // 水鱼数据中 from 对应版本名
    });

    return {
      categories: Array.from(catSet),
      versions: Array.from(verSet).sort().reverse() 
    };
  }, [songs]);

  // ==========================================
  // 超级过滤引擎 (Ultimate Filter Engine)
  // ==========================================
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // 1. 文本搜索 (标题或曲师)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.basic_info.artist.toLowerCase().includes(query);
        const idMatch = String(song.id).includes(query);
        if (!titleMatch && !artistMatch && !idMatch) return false;
      }

      // 2. 仅看新曲
      if (isNewOnly && !song.basic_info.is_new) return false;

      // 3. 分类筛选 (Genre)
      if (selectedCategories.length > 0 && !selectedCategories.includes(song.basic_info.genre)) {
        return false;
      }

      // 4. 版本筛选 (From)
      if (selectedVersions.length > 0 && !selectedVersions.includes(song.basic_info.from)) {
        return false;
      }

      // 5. BPM 范围筛选
      const bpm = song.basic_info.bpm;
      if (bpm < bpmMin || bpm > bpmMax) return false;

      // 6. 🔥 难度分离 & 定数范围筛选
      // 如果没有指定难度类型，就查该歌的所有难度；如果指定了，只查指定难度
      const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : [0, 1, 2, 3, 4];
      const hasMatchingDs = diffsToCheck.some(diffIndex => {
        const constant = song.ds[diffIndex];
        return constant !== undefined && constant >= dsMin && constant <= dsMax;
      });

      if (!hasMatchingDs) return false;

      return true; 
    });
  }, [songs, searchQuery, isNewOnly, selectedCategories, selectedVersions, dsMin, dsMax, bpmMin, bpmMax, selectedDiffs]);

  // 重置所有筛选条件
  const resetFilters = () => {
    setIsNewOnly(false);
    setSelectedDiffs([]);
    setDsMin(1.0);
    setDsMax(15.0);
    setBpmMin(0);
    setBpmMax(400);
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

      {/* 主体区域：侧边栏(筛选) + 列表 */}
      <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden">
        
        {/* 高级筛选控制台 (Sidebar) */}
        {isFilterOpen && (
          <div className="w-full md:w-80 shrink-0 bg-gray-900/40 rounded-2xl border border-gray-800/60 shadow-2xl backdrop-blur-sm overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex flex-col gap-6">
            
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="font-bold text-purple-400 tracking-widest flex items-center gap-2"><FaFilter/> ADVANCED FILTER</span>
              <button onClick={resetFilters} className="text-gray-500 hover:text-white transition-colors" title="重置全部">
                <FaUndo />
              </button>
            </div>

            {/* 1. 仅看新曲 */}
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">🆕 仅看新曲 </span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isNewOnly} onChange={(e) => setIsNewOnly(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isNewOnly ? 'bg-purple-500' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isNewOnly ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>

            {/* 2. 难度分离 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Difficulty</label>
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

            {/* 3. 定数范围 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                <span>定数</span>
                <span className="text-purple-400 font-mono">{dsMin.toFixed(1)} - {dsMax.toFixed(1)}</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.1" value={dsMin} onChange={e => setDsMin(Number(e.target.value))} className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" />
                <span className="text-gray-600">-</span>
                <input type="number" step="0.1" value={dsMax} onChange={e => setDsMax(Number(e.target.value))} className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" />
              </div>
            </div>

            {/* 4. BPM 范围 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                <span>BPM</span>
                <span className="text-purple-400 font-mono">{bpmMin} - {bpmMax}</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="number" step="1" value={bpmMin} onChange={e => setBpmMin(Number(e.target.value))} className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" />
                <span className="text-gray-600">-</span>
                <input type="number" step="1" value={bpmMax} onChange={e => setBpmMax(Number(e.target.value))} className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-center font-mono text-sm text-gray-200 focus:border-purple-500 outline-none" />
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

                // 🔥 智能定数高亮系统：找出符合当前筛选条件的最高难度进行展示
                let displayDs = song.ds[song.ds.length - 1]; // 默认取最高定数
                let dsTagClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]'; 
                
                const diffsToCheck = selectedDiffs.length > 0 ? selectedDiffs : [0, 1, 2, 3, 4];
                for (let i = 4; i >= 0; i--) {
                  const constant = song.ds[i];
                  if (constant !== undefined && diffsToCheck.includes(i) && constant >= dsMin && constant <= dsMax) {
                    displayDs = constant;
                    dsTagClass = DIFF_CONFIG[i].tagClass;
                    break;
                  }
                }

                return (
                  <div 
                    className="flex items-center justify-between p-4 border-b border-gray-800/40 hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                    onClick={() => handleOpenDrawer(song)}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      {/* SD / DX 标签 */}
                      <div className={`shrink-0 w-10 text-center text-[10px] font-black py-1 rounded border ${
                        isDX ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                      }`}>
                        {song.type}
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
                      {/* 🔥 动态显示的定数和颜色框 */}
                      <span className={`font-mono font-bold border px-2.5 py-1 rounded-lg text-sm ${dsTagClass}`}>
                        {displayDs.toFixed(1)}
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
