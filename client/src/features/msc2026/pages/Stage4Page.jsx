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

  const pickTypes = ['p1_pick', 'p2_pick', 'random', 'designated'];
  const pickLabels = {
    p1_pick: 'P1 自选',
    p2_pick: 'P2 自选',
    random: '系统随机',
    designated: '课题曲',
  };

  const winnerId = stage4.winner?.toString?.() || stage4.winner;
  const p1Id = stage4.p1?.userId || stage4.p1?._id;
  const winnerName = winnerId === p1Id ? stage4.p1?.username : stage4.p2?.username;

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 text-amber-300 mb-2">
            <FaCrown className="text-2xl" />
            <span className="text-sm uppercase tracking-[0.18em]">Final Protocol</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
            决赛
          </h2>
        </div>
        <div className="text-right">
          <p className="text-6xl md:text-8xl font-black text-white leading-none tabular-nums" style={{ fontFamily: 'Torus, sans-serif' }}>2</p>
          <p className="text-lg md:text-2xl text-zinc-400">进 1 · 4 首曲目</p>
        </div>
      </div>

      {/* P1 vs P2 总览 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-4">
        <div className="rounded-2xl border border-sky-400/20 bg-white/[0.045] p-6">
          <span className="text-sm text-sky-300/80 uppercase tracking-[0.18em]">P1</span>
          <p className="text-4xl md:text-6xl font-black text-white mt-3 truncate" style={{ fontFamily: 'Torus, sans-serif' }}>{stage4.p1?.username || '—'}</p>
        </div>
        <div className="self-center text-3xl md:text-5xl font-black text-zinc-500">VS</div>
        <div className="rounded-2xl border border-fuchsia-400/20 bg-white/[0.045] p-6 text-right">
          <span className="text-sm text-fuchsia-300/80 uppercase tracking-[0.18em]">P2</span>
          <p className="text-4xl md:text-6xl font-black text-white mt-3 truncate" style={{ fontFamily: 'Torus, sans-serif' }}>{stage4.p2?.username || '—'}</p>
        </div>
      </div>

      {/* 课题曲 */}
      {stage4.designatedSong && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-5">
          <div className="flex items-center gap-3">
            <FaMusic className="text-amber-300 text-xl" />
            <span className="text-sm uppercase tracking-[0.18em] text-amber-300/80">课题曲</span>
          </div>
          <p className="text-3xl font-black text-white mt-2 truncate">{stage4.designatedSong.title}</p>
          {stage4.designatedSong.artist && (
            <p className="text-lg text-zinc-400 mt-1">{stage4.designatedSong.artist}</p>
          )}
        </div>
      )}

      {/* 曲目进度 */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <h3 className="text-2xl font-bold text-white mb-5" style={{ fontFamily: 'Torus, sans-serif' }}>
          曲目进度
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pickTypes.map((type, idx) => {
            const song = stage4.songs?.[idx];
            return (
              <div
                key={type}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all
                  ${song?.p1Score && song?.p2Score
                    ? 'border-emerald-400/25 bg-emerald-500/10'
                    : idx === currentSongIndex
                      ? 'border-amber-400/35 bg-amber-500/10'
                      : 'border-white/10 bg-black/15'
                  }`}
              >
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black tabular-nums
                  ${idx === currentSongIndex ? 'bg-amber-500/20 text-amber-200' : 'bg-white/[0.06] text-zinc-400'}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base text-zinc-400">{pickLabels[type]}</p>
                  <p className="text-2xl font-bold text-white truncate">{song?.song?.title || '—'}</p>
                </div>
                {song?.p1Score && song?.p2Score && (
                  <span className="text-2xl text-emerald-300">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 比赛操作区 */}
      {stage4.status !== 'done' && (
        <div className="space-y-4">
          {(stage4.status === 'p1_pick' || stage4.status === 'p2_pick') && (
            <SongPicker
              pool={stage4.songPool || []}
              excludedSongIds={stage4.songs?.map(s => s.songId).filter(Boolean) || []}
              pickType={stage4.status}
              onPick={async (songId) => {
                await store.selectStage4Song(songId);
                store.fetchStage4State();
              }}
            />
          )}
          {stage4.status === 'playing' && currentSong && (
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
          className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-10 text-center"
        >
          <FaTrophy className="text-5xl text-amber-300 mx-auto mb-4" />
          <p className="text-xl text-amber-300/80 mb-2">MSC 2026 冠军</p>
          <p className="text-5xl md:text-7xl font-black text-amber-200" style={{ fontFamily: 'Torus, sans-serif' }}>
            {winnerName}
          </p>
        </motion.div>
      )}
    </div>
  );
}
