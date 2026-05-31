// ============================================================
// Stage1Page.jsx — 12进6 淘汰赛主页面
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMSC2026Store } from '../store';
import GroupBracket from '../components/stage1/GroupBracket';
import SongPicker from '../components/stage1/SongPicker';
import ScoreEntryForm from '../components/stage1/ScoreEntryForm';
import { useMSCSSE } from '../hooks/useSSE';
import { FaSync, FaInfoCircle } from 'react-icons/fa';

export default function Stage1Page() {
  const store = useMSC2026Store();
  const [view, setView] = useState('bracket'); // bracket | match | admin
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // 初始加载
  useEffect(() => {
    store.fetchStatus().catch(() => {});
    store.fetchStage1State().catch(() => {});
  }, [store]);

  // SSE 实时同步
  useMSCSSE({
    score_updated: useCallback(() => {
      store.fetchStage1State();
    }, [store]),
    match_finished: useCallback(() => {
      store.fetchStage1State();
      store.fetchStatus();
    }, [store]),
    stage_advanced: useCallback(() => {
      store.fetchStatus();
    }, [store]),
  }, { enabled: store.status === 'stage1' });

  const selectedGroup = selectedGroupId !== null
    ? store.stage1.groups?.find((g) => g.groupId === selectedGroupId)
    : null;

  return (
    <div className="space-y-4">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
            12进6 · 淘汰赛
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {store.stage1.status === 'done'
              ? '阶段已结束'
              : `${store.stage1.completedGroups}/${store.stage1.totalGroups} 组已完成`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.fetchStage1State()}
            className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            title="刷新"
          >
            <FaSync className={`text-xs ${store.stage1.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {view === 'bracket' && (
          <motion.div key="bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GroupBracket
              groups={store.stage1.groups || []}
              currentGroupIndex={store.stage1.currentGroupIndex}
              completedGroups={store.stage1.completedGroups}
              onSelectGroup={(groupId) => {
                setSelectedGroupId(groupId);
                setView('match');
              }}
            />
          </motion.div>
        )}

        {view === 'match' && selectedGroup && (
          <motion.div key="match" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => { setView('bracket'); setSelectedGroupId(null); }}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                ← 返回对阵表
              </button>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-white/10">
                第 {selectedGroup.order + 1} 组
              </span>
            </div>

            {/* 比分展示 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* P1 */}
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                    P1
                  </div>
                  <span className="font-medium text-sm text-white">
                    {selectedGroup.p1?.username || '—'}
                  </span>
                </div>
                {selectedGroup.songs?.map((song, i) => (
                  <div key={i} className="text-xs py-1 border-b border-white/5 last:border-0 flex justify-between">
                    <span className="text-zinc-500">{song.song?.title || `曲目 ${i + 1}`}</span>
                    <span className="text-zinc-300 font-mono">
                      {song.p1Score ? `${song.p1Score.achievement.toFixed(4)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {/* P2 */}
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                    P2
                  </div>
                  <span className="font-medium text-sm text-white">
                    {selectedGroup.p2?.username || '—'}
                  </span>
                </div>
                {selectedGroup.songs?.map((song, i) => (
                  <div key={i} className="text-xs py-1 border-b border-white/5 last:border-0 flex justify-between">
                    <span className="text-zinc-500">{song.song?.title || `曲目 ${i + 1}`}</span>
                    <span className="text-zinc-300 font-mono">
                      {song.p2Score ? `${song.p2Score.achievement.toFixed(4)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 胜者 */}
            {selectedGroup.winner && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 mb-4 text-center">
                <span className="text-sm text-green-400">
                  晋级: {selectedGroup.winner === (selectedGroup.p1?._id || selectedGroup.p1?.userId) ? selectedGroup.p1?.username : selectedGroup.p2?.username}
                </span>
              </div>
            )}

            {/* 操作区 */}
            {selectedGroup.status !== 'done' && (
              <div className="space-y-4">
                {selectedGroup.status === 'p1_pick' || selectedGroup.status === 'p2_pick' || selectedGroup.status === 'random_pick' ? (
                  <SongPicker
                    pool={store.stage1.songPool || []}
                    excludedSongIds={selectedGroup.songs?.filter(s => s.songId).map(s => s.songId) || []}
                    pickType={
                      selectedGroup.status === 'p1_pick' ? 'p1_pick' :
                      selectedGroup.status === 'p2_pick' ? 'p2_pick' : null
                    }
                    onPick={async (songId) => {
                      await store.selectStage1Song(songId);
                      store.fetchStage1State();
                    }}
                  />
                ) : selectedGroup.status === 'playing' ? (
                  <ScoreEntryForm
                    groupId={selectedGroup.groupId}
                    songIndex={selectedGroup.songs?.length - 1 || 0}
                    p1={selectedGroup.p1}
                    p2={selectedGroup.p2}
                    onSubmit={async (data) => {
                      await store.submitStage1Score(data);
                      store.fetchStage1State();
                    }}
                    onAdvance={async () => {
                      await store.advanceStage1();
                      store.fetchStage1State();
                    }}
                  />
                ) : null}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
