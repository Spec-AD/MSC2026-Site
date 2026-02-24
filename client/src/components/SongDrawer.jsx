import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function SongDrawer({ isOpen, onClose, song }) {
  // 舞萌标准的难度命名与颜色映射
  const diffNames = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
  const diffColors = [
    'text-green-400',  // 绿
    'text-yellow-400', // 黄
    'text-red-400',    // 红
    'text-purple-400', // 紫
    'text-pink-300'    // 白
  ];
  const diffBgColors = [
    'bg-green-500/10 border-green-500/20',
    'bg-yellow-500/10 border-yellow-500/20',
    'bg-red-500/10 border-red-500/20',
    'bg-purple-500/10 border-purple-500/20',
    'bg-pink-500/10 border-pink-500/20'
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-40 
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#0a0a0c] border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {song && (
          <div className="font-maimai h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            
            {/* 顶部标题区 */}
            <div className="p-6 pb-4 border-b border-gray-800 relative bg-gradient-to-b from-gray-800/40 to-transparent">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-transform hover:rotate-90 text-xl"
              >
                <FaTimes />
              </button>
              
              <div className="pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    song.type === 'DX' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                  }`}>
                    {song.type}
                  </span>
                  <span className="text-xs text-gray-400 font-mono tracking-wider">ID: {song.id}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                  {song.basic_info.title}
                </h2>
                <p className="text-sm text-gray-400">{song.basic_info.artist}</p>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              
              {/* 基础信息卡片 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">所属分类</div>
                  <div className="text-sm text-gray-200">{song.basic_info.genre}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">实装版本</div>
                  <div className="text-sm text-gray-200">{song.basic_info.from}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">BPM</div>
                  <div className="text-sm text-gray-200 font-mono">{song.basic_info.bpm}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                  <div className="text-[10px] text-gray-500 mb-1">新曲标识</div>
                  <div className="text-sm text-gray-200">
                    {song.basic_info.is_new ? '✨ 是 (New)' : '否'}
                  </div>
                </div>
              </div>

              {/* 定数与谱面信息 (核心渲染逻辑) */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Difficulty & Charter</h3>
                <div className="space-y-2">
                  {/* 遍历 ds 数组，它的长度决定了这首歌有没有白谱 */}
                  {song.ds.map((constant, idx) => {
                    const chartInfo = song.charts[idx];
                    const totalNotes = chartInfo.notes.reduce((a, b) => a + b, 0); // 计算总物量

                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col p-3 rounded-xl border ${diffBgColors[idx]} backdrop-blur-sm`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${diffColors[idx]}`}>
                              {diffNames[idx]}
                            </span>
                            <span className="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-gray-300">
                              Lv.{song.level[idx]}
                            </span>
                          </div>
                          <span className="font-mono text-lg font-bold text-white drop-shadow-md">
                            {constant.toFixed(1)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-1">
                          <span className="text-xs text-gray-400 opacity-80 truncate max-w-[200px]" title={chartInfo.charter}>
                            {chartInfo.charter !== '-' ? chartInfo.charter : '未知谱师'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Notes: {totalNotes}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}