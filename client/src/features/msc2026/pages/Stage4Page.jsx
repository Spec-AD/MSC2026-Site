// ============================================================
// Stage4Page.jsx — 决赛 2进1
// ============================================================
import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import SongPicker from '../components/stage1/SongPicker';
import ScoreEntryForm from '../components/stage1/ScoreEntryForm';
import { useMSCSSE } from '../hooks/useSSE';
import { FaTrophy, FaCrown, FaMusic } from 'react-icons/fa';

export default function Stage4Page() {
  const store = useMSC2026Store();

  useEffect(() => {
    store.fetchStatus().catch(() => {});
    store.fetchStage4State().catch(() => {});
  }, []);

  useMSCSSE({
    score_updated: useCallback(() => store.fetchStage4State(), [store.fetchStage4State]),
    match_finished: useCallback(() => {
      store.fetchStage4State();
      store.fetchStatus();
    }, [store.fetchStage4State, store.fetchStatus]),
  }, { enabled: store.status === 'stage4' });

  const { stage4 } = store;
  const currentSongIndex = stage4.songs?.filter(s => s.p1Score && s.p2Score).length || 0;
  const currentSong = stage4.songs?.[currentSongIndex];
  const currentPhase = stage4.currentTurn?.phase;

  const pickTypes = ['p1_pick', 'p2_pick', 'random', 'designated'];
  const pickLabels = {
    p1_pick: 'P1 自选',
    p2_pick: 'P2 自选',
    random: '系统随机',
    designated: '课题曲',
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="text-center mb-4">
        <FaCrown className="text-3xl text-amber-400 mx-auto mb-2" />
        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
          决赛
        </h2>
        <p className="text-xs text-zinc-500 mt-1">2进1 · 4 首曲目</p>
      </div>

      {/* P1 vs P2 总览 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-500/20 bg-zinc-900/60 p-5 text-center">
          <span className="text-[10px] text-amber-400/70 uppercase tracking-wider">P1</span>
          <p className="text-lg font-bold text-white mt-1">{stage4.p1?.username || '—'}</p>
        </div>
        <div className="rounded-2xl border border-purple-500/20 bg-zinc-900/60 p-5 text-center">
          <span className="text-[10px] text-purple-400/70 uppercase tracking-wider">P2</span>
          <p className="text-lg font-bold text-white mt-1">{stage4.p2?.username || '—'}</p>
        </div>
      </div>

      {/* 课题曲 */}
      {stage4.designatedSong && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2">
            <FaMusic className="text-amber-400 text-xs" />
            <span className="text-xs text-zinc-400">课题曲</span>
          </div>
          <p className="text-sm text-white font-medium mt-1">{stage4.designatedSong.title}</p>
          {stage4.designatedSong.artist && (
            <p className="text-xs text-zinc-500">{stage4.designatedSong.artist}</p>
          )}
        </div>
      )}

      {/* 曲目进度 */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Torus, sans-serif' }}>
          曲目进度
        </h3>
        <div className="space-y-2">
          {pickTypes.map((type, idx) => {
            const song = stage4.songs?.[idx];
            return (
              <div
                key={type}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
                  ${song?.p1Score && song?.p2Score
                    ? 'border-green-500/20 bg-green-500/5'
                    : idx === currentSongIndex
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-white/5 bg-zinc-800/30'
                  }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono
                  ${idx === currentSongIndex ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-500'}`}>
                  {idx + 1}
                </span>
                <span className="text-xs text-zinc-500 w-16">{pickLabels[type]}</span>
                <span className="flex-1 text-sm text-white truncate">{song?.song?.title || '—'}</span>
                {song?.p1Score && song?.p2Score && (
                  <span className="text-xs text-green-400">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 比赛操作区 */}
      {stage4.status === 'playing' && stage4.songs?.length < 4 && (
        <div className="space-y-4">
          {(currentPhase === 'p1_pick' || currentPhase === 'p2_pick') && (
            <SongPicker
              pool={stage4.songPool || []}
              excludedSongIds={stage4.songs?.map(s => s.songId).filter(Boolean) || []}
              pickType={currentPhase}
              onPick={async (songId) => {
                await store.selectStage4Song(songId);
                store.fetchStage4State();
              }}
            />
          )}
          {currentPhase === 'waiting_play_result' && currentSong && (
            <ScoreEntryForm
              songIndex={currentSongIndex}
              p1={stage4.p1}
              p2={stage4.p2}
              onSubmit={async (data) => {
                await store.submitStage4Score({ ...data, songIndex: currentSongIndex });
                store.fetchStage4State();
              }}
              onAdvance={async () => {
                await store.advanceStage4();
                store.fetchStage4State();
              }}
            />
          )}
        </div>
      )}

      {/* 胜者 */}
      {stage4.winner && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-8 text-center"
        >
          <FaTrophy className="text-4xl text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-amber-400/80 mb-1">MSC 2026 冠军</p>
          <p className="text-2xl font-bold text-amber-300" style={{ fontFamily: 'Torus, sans-serif' }}>
            {stage4.winner === (stage4.p1?._id || stage4.p1?.userId) ? stage4.p1?.username : stage4.p2?.username}
          </p>
        </motion.div>
      )}
    </div>
  );
}
