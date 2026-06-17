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

  // 初始加载（仅挂载时执行一次）
  useEffect(() => {
    store.fetchStatus().catch(() => {});
    store.fetchStage1State().catch(() => {});
  }, []);

  // SSE 实时同步（action 函数引用稳定，不依赖整个 store）
  useMSCSSE({
    score_updated: useCallback(() => {
      store.fetchStage1State();
    }, [store.fetchStage1State]),
    match_finished: useCallback(() => {
      store.fetchStage1State();
      store.fetchStatus();
    }, [store.fetchStage1State, store.fetchStatus]),
    stage_advanced: useCallback(() => {
      store.fetchStatus();
    }, [store.fetchStatus]),
  }, { enabled: store.status === 'stage1' });

  const selectedGroup = selectedGroupId !== null
    ? store.stage1.groups?.find((g) => g.groupId === selectedGroupId)
    : null;
  const selectedWinnerId = selectedGroup?.winner?.toString?.() || selectedGroup?.winner;
  const selectedP1Id = (selectedGroup?.p1?._id || selectedGroup?.p1?.userId)?.toString?.() || selectedGroup?.p1?._id || selectedGroup?.p1?.userId;
  const selectedWinnerName = selectedWinnerId === selectedP1Id
    ? selectedGroup?.p1?.username
    : selectedGroup?.p2?.username;

  return (
    <div className="space-y-6">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
            12进6 · 淘汰赛
          </h2>
          <p className="text-base md:text-xl text-zinc-400 mt-2">
            {store.stage1.status === 'done'
              ? '阶段已结束'
              : `${store.stage1.completedGroups}/${store.stage1.totalGroups} 组已完成`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.fetchStage1State()}
            className="p-4 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            title="刷新"
          >
            <FaSync className={`text-lg ${store.stage1.loading ? 'animate-spin' : ''}`} />
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
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => { setView('bracket'); setSelectedGroupId(null); }}
                className="text-base md:text-lg text-zinc-300 hover:text-white transition-colors"
              >
                ← 返回对阵表
              </button>
              <span className="text-base md:text-lg px-4 py-1.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10">
                第 {selectedGroup.order + 1} 组
              </span>
            </div>

            {/* 比分展示 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
              {/* P1 */}
              <div className="rounded-2xl border border-sky-400/20 bg-white/[0.04] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-sky-400/15 flex items-center justify-center text-sky-200 font-black text-xl">
                    P1
                  </div>
                  <span className="font-bold text-3xl text-white truncate">
                    {selectedGroup.p1?.username || '—'}
                  </span>
                </div>
                {selectedGroup.songs?.map((song, i) => (
                  <div key={i} className="text-lg py-3 border-b border-white/10 last:border-0 flex justify-between gap-5">
                    <span className="text-zinc-300 truncate">{song.song?.title || `曲目 ${i + 1}`}</span>
                    <span className="text-zinc-100 font-mono tabular-nums shrink-0">
                      {song.p1Score ? `${song.p1Score.achievement.toFixed(4)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {/* P2 */}
              <div className="rounded-2xl border border-fuchsia-400/20 bg-white/[0.04] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-fuchsia-400/15 flex items-center justify-center text-fuchsia-200 font-black text-xl">
                    P2
                  </div>
                  <span className="font-bold text-3xl text-white truncate">
                    {selectedGroup.p2?.username || '—'}
                  </span>
                </div>
                {selectedGroup.songs?.map((song, i) => (
                  <div key={i} className="text-lg py-3 border-b border-white/10 last:border-0 flex justify-between gap-5">
                    <span className="text-zinc-300 truncate">{song.song?.title || `曲目 ${i + 1}`}</span>
                    <span className="text-zinc-100 font-mono tabular-nums shrink-0">
                      {song.p2Score ? `${song.p2Score.achievement.toFixed(4)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 胜者 */}
            {selectedGroup.winner && (
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 mb-5 text-center">
                <span className="text-2xl md:text-3xl font-bold text-emerald-200">
                  晋级: {selectedWinnerName}
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
