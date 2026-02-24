import React from 'react';

export default function SongDrawer({ isOpen, onClose, song }) {
  return (
    <>
      {/* 背景遮罩层 */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-40 
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* 右侧抽屉主体 */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-[#121212] border-l border-gray-800 text-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out p-6 overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {song && (
          <div className="font-maimai space-y-6">
            {/* 头部：返回按钮与标题 */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">{song.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{song.composer}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            {/* 标签区：版本与别名 */}
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                {song.version}
              </span>
              {song.aliases.map((alias, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                  {alias}
                </span>
              ))}
            </div>

            {/* 定数与谱师面板 */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">难度与定数</h3>
              <div className="space-y-3">
                {song.difficulties.map((diff, idx) => {
                  // 根据难度给不同颜色，你可以根据舞萌的标准色修改
                  const colors = ['text-green-400', 'text-yellow-400', 'text-red-400', 'text-purple-400', 'text-pink-400'];
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className={`font-bold ${colors[idx] || 'text-gray-300'} w-12 inline-block`}>
                          {diff.level}
                        </span>
                        <span className="text-gray-500 ml-2">{diff.charter}</span>
                      </div>
                      <span className="font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded">
                        {diff.constant}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 预留评论区位置 */}
            <div className="mt-8 border-t border-gray-800 pt-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">玩家评论 (开发中...)</h3>
              <div className="h-24 bg-gray-900 rounded border border-gray-800 flex items-center justify-center text-gray-600 text-sm">
                等待后端接口接入...
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}