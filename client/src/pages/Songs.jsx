import React, { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import SongDrawer from '../components/SongDrawer'; // 引入抽屉

// Mock 数据：模拟你从水鱼 API 获取的结构
const mockSongs = Array.from({ length: 1200 }, (_, i) => ({
  id: `song_${i}`,
  title: i === 0 ? 'Grievous Lady' : `Maimai Track ${i}`,
  composer: i === 0 ? 'Team Grimoire vs Laur' : 'SEGA Sound Team',
  version: 'maimai DX',
  aliases: i === 0 ? ['GL', '格里弗斯女士'] : ['别名1'],
  difficulties: [
    { level: 'BAS', constant: 4.0, charter: '-' },
    { level: 'ADV', constant: 8.5, charter: '-' },
    { level: 'EXP', constant: 12.4, charter: '某某谱师' },
    { level: 'MAS', constant: 14.9, charter: 'Jack' },
  ]
}));

export default function Songs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 简单的过滤逻辑
  const filteredSongs = mockSongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenDrawer = (song) => {
    setSelectedSong(song);
    setIsDrawerOpen(true);
  };

  return (
    // 使用 Layout 组件包裹（假设 Layout 里有你公用的 Navbar/Sidebar）
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col font-maimai">
      
      {/* 头部与搜索栏 */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">曲目图鉴</h1>
          <p className="text-gray-400 text-sm mt-1">已收录 {filteredSongs.length} 首曲目</p>
        </div>
        <input 
          type="text" 
          placeholder="搜索曲名或别名..." 
          className="w-64 bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 核心：1200首曲目的虚拟列表 */}
      <div className="flex-1 bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <Virtuoso
          className="h-full scrollbar-thin scrollbar-thumb-gray-700"
          data={filteredSongs}
          itemContent={(index, song) => (
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-800/50 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => handleOpenDrawer(song)}
            >
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-100">{song.title}</span>
                <span className="text-xs text-gray-500 mt-1">{song.composer}</span>
              </div>
              <div className="flex gap-3 items-center">
                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded hidden md:block">
                  {song.version}
                </span>
                <span className="font-mono text-purple-400 font-bold bg-purple-400/10 px-2 py-1 rounded">
                  {song.difficulties[song.difficulties.length - 1].constant}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* 挂载抽屉组件 */}
      <SongDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        song={selectedSong} 
      />
    </div>
  );
}