import React, { useState, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import axios from 'axios';
import { FaSpinner, FaSearch } from 'react-icons/fa';
import SongDrawer from '../components/SongDrawer';

export default function Songs() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 初始化拉取水鱼真实数据
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoading(true);
        // 直接请求水鱼的公开全量曲目接口
        const res = await axios.get('https://www.diving-fish.com/api/maimaidxprober/music_data');
        // 水鱼的数据默认是旧歌在前，我们可以把它反转一下，让新歌/高定数在前面，或者保持原样
        setSongs(res.data.reverse()); 
      } catch (err) {
        console.error("获取曲目数据失败:", err);
        setError("无法连接到查分器服务器，请检查网络或跨域设置");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongs();
  }, []);

  // 搜索过滤：匹配标题和艺术家
  const filteredSongs = songs.filter(song => {
    const title = song.title.toLowerCase();
    const artist = song.basic_info.artist.toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || artist.includes(query);
  });

  const handleOpenDrawer = (song) => {
    setSelectedSong(song);
    setIsDrawerOpen(true);
  };

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
    <div className="p-4 md:p-6 max-w-6xl mx-auto h-[calc(100vh-80px)] flex flex-col font-maimai">
      
      {/* 头部与搜索 */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">曲目</h1>
          <p className="text-gray-400 text-sm mt-2">已收录 {filteredSongs.length} 首曲目数据</p>
        </div>
        <div className="relative w-full md:w-72">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="搜索曲名或曲师..." 
            className="w-full bg-gray-900/80 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 虚拟列表主体 */}
      <div className="flex-1 bg-gray-900/40 rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl backdrop-blur-sm">
        <Virtuoso
          className="h-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          data={filteredSongs}
          itemContent={(index, song) => {
            const maxDs = song.ds[song.ds.length - 1]; // 获取最高难度定数
            const isDX = song.type === 'DX'; // 判断是否为 DX 谱面

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
                    <span className="text-lg font-bold text-gray-100 truncate group-hover:text-purple-300 transition-colors">
                      {song.title}
                    </span>
                    <span className="text-xs text-gray-500 truncate mt-0.5">
                      {song.basic_info.artist}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 items-center shrink-0 ml-4">
                  <span className="px-2 py-1 bg-gray-800/80 text-gray-400 text-xs rounded hidden md:block">
                    {song.basic_info.from}
                  </span>
                  <span className="font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-sm shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                    {maxDs.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </div>

      <SongDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        song={selectedSong} 
      />
    </div>
  );
}