// ============================================================
// Stage4Page.jsx — 决赛 2进1
// ============================================================
import { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import SongPicker from '../components/stage1/SongPicker';
import ScoreEntryForm from '../components/stage1/ScoreEntryForm';
import { useMSCSSE } from '../hooks/useSSE';
import { FaCrown, FaMusic } from 'react-icons/fa';
import SongReveal from '../components/live/SongReveal';
import ScoreDuelResult from '../components/live/ScoreDuelResult';
import WinnerReveal from '../components/live/WinnerReveal';
import RandomDrawPrompt from '../components/live/RandomDrawPrompt';
import SongSelectionSpotlight from '../components/live/SongSelectionSpotlight';
import { MOTION_TRANSITIONS, STAGGER_CONTAINER, STAGGER_ITEM } from '../utils/motion';

export default function Stage4Page() {
  const store = useMSC2026Store();
  const {
    stage4,
    status,
    fetchStatus,
    fetchStage4State,
    selectStage4Song,
    submitStage4Score,
    advanceStage4,
    resolveStage4Tie,
  } = store;
  const [tieWinnerId, setTieWinnerId] = useState(null);
  const [tiePending, setTiePending] = useState(false);
  const [tieError, setTieError] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [randomReveal, setRandomReveal] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchStatus().catch(() => {});
    fetchStage4State().catch(() => {});
  }, [fetchStatus, fetchStage4State]);

  useMSCSSE({
    score_updated: useCallback(() => fetchStage4State(), [fetchStage4State]),
    song_drawn: useCallback(async () => {
      const nextState = await fetchStage4State();
      const randomPlay = [...(nextState.songs || [])].reverse().find((play) => play.pickType === 'random');
      if (randomPlay?.song) setRandomReveal(randomPlay.song);
    }, [fetchStage4State]),
    match_finished: useCallback(() => {
      fetchStage4State();
      fetchStatus();
    }, [fetchStage4State, fetchStatus]),
  }, { enabled: status === 'stage4' });

  const currentSongIndex = stage4.songs?.filter(s => s.p1Score && s.p2Score).length || 0;
  const currentSong = stage4.songs?.[currentSongIndex];
  const getSongId = (song) => String(song?.songId?._id || song?.songId || song?._id || '');
  const getSongTitle = (song) => song?.song?.title || song?.songId?.title || song?.title || '—';

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
  const p2Id = stage4.p2?.userId || stage4.p2?._id;
  const tieWinnerName = tieWinnerId === p1Id ? stage4.p1?.username : stage4.p2?.username;

  const submitTieWinner = async () => {
    if (!tieWinnerId) return;
    setTiePending(true);
    setTieError(null);
    try {
      await resolveStage4Tie(tieWinnerId);
      await fetchStage4State();
      await fetchStatus();
      setTieWinnerId(null);
    } catch (err) {
      setTieError(err?.msg || '加赛结果提交失败');
    } finally {
      setTiePending(false);
    }
  };

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
        <Motion.div
          variants={reduceMotion ? undefined : STAGGER_CONTAINER}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        >
          {pickTypes.map((type, idx) => {
            const song = stage4.songs?.[idx];
            return (
              <Motion.div
                key={type}
                layout
                variants={reduceMotion ? undefined : STAGGER_ITEM}
                transition={MOTION_TRANSITIONS.spring}
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
                  <p className="text-2xl font-bold text-white truncate">{getSongTitle(song)}</p>
                </div>
                {song?.p1Score && song?.p2Score && (
                  <span className="text-2xl text-emerald-300">✓</span>
                )}
              </Motion.div>
            );
          })}
        </Motion.div>
      </div>

      {/* 比赛操作区 */}
      {stage4.status !== 'done' && (
        <AnimatePresence mode="wait">
          <Motion.div
            key={`${stage4.status}-${currentSongIndex}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={MOTION_TRANSITIONS.enter}
            className="space-y-4"
          >
          {(stage4.status === 'p1_pick' || stage4.status === 'p2_pick') && (
            <SongPicker
              key={`stage4-${stage4.status}-${stage4.songs?.length || 0}`}
              pool={stage4.songPool || []}
              excludedSongIds={stage4.songs?.map(getSongId).filter(Boolean) || []}
              pickType={stage4.status}
              onPick={async (songId) => {
                await selectStage4Song(songId);
                await fetchStage4State();
              }}
            />
          )}
          {stage4.status === 'random_pick' && (
            <RandomDrawPrompt
              onDraw={async () => {
                const result = await advanceStage4();
                if (result.data?.song) setRandomReveal(result.data.song);
                await fetchStage4State().catch(() => {});
              }}
            />
          )}
          {stage4.status === 'playing' && currentSong && (
            <>
              <SongReveal play={currentSong} label={`当前曲目 · ${pickLabels[currentSong.pickType]}`} order={currentSongIndex + 1} />
              <ScoreEntryForm
                key={`stage4-score-${getSongId(currentSong)}`}
                songId={getSongId(currentSong)}
                songIndex={currentSongIndex}
                p1={stage4.p1}
                p2={stage4.p2}
                onSubmit={async (data) => {
                  const result = await submitStage4Score({ ...data, songIndex: currentSongIndex });
                  setScoreResult({
                    p1: stage4.p1,
                    p2: stage4.p2,
                    p1Score: data.p1Score,
                    p2Score: data.p2Score,
                    songTitle: getSongTitle(currentSong),
                  });
                  if (result.data?.nextStep === 'advance') {
                    await advanceStage4();
                  }
                  await fetchStage4State();
                  await fetchStatus();
                  return result;
                }}
                onAdvance={async () => {
                  await advanceStage4();
                  await fetchStage4State();
                  await fetchStatus();
                }}
              />
            </>
          )}
          </Motion.div>
        </AnimatePresence>
      )}

      {stage4.status === 'done' && stage4.needTiebreak && !stage4.winner && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6">
          <h3 className="text-2xl font-black text-amber-100">四曲总成绩完全相同</h3>
          <p className="text-zinc-300 mt-2">完成线下加赛后，选择获胜选手并再次确认。</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <button onClick={() => { setTieWinnerId(p1Id); setTieError(null); }} className="py-3 rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-200 font-bold">
              {stage4.p1?.username} 加赛获胜
            </button>
            <button onClick={() => { setTieWinnerId(p2Id); setTieError(null); }} className="py-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200 font-bold">
              {stage4.p2?.username} 加赛获胜
            </button>
          </div>
          {tieWinnerId && (
            <div className="mt-5 border-t border-amber-400/20 pt-5">
              <p className="text-lg font-bold text-white">确认 {tieWinnerName} 为 MSC 2026 冠军？</p>
              {tieError && <p className="text-red-200 mt-2">{tieError}</p>}
              <div className="flex gap-3 mt-4">
                <button disabled={tiePending} onClick={submitTieWinner} className="px-5 py-2.5 rounded-xl bg-amber-500/25 border border-amber-400/40 text-amber-100 font-bold disabled:opacity-50">
                  {tiePending ? '提交中...' : '确认赛果'}
                </button>
                <button disabled={tiePending} onClick={() => setTieWinnerId(null)} className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-300 disabled:opacity-50">
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 胜者 */}
      {stage4.winner && (
        <WinnerReveal name={winnerName} eyebrow="MSC 2026 CHAMPION" detail="决赛结果已确认" champion />
      )}

      <AnimatePresence>
        {scoreResult && <ScoreDuelResult result={scoreResult} onContinue={() => setScoreResult(null)} />}
      </AnimatePresence>
      <SongSelectionSpotlight
        song={randomReveal}
        pickLabel="RANDOM TRACK · 系统随机曲目"
        onClose={() => setRandomReveal(null)}
      />
    </div>
  );
}
