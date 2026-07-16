// ============================================================
// Stage1Page.jsx — 12进6 淘汰赛主页面
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import GroupBracket from '../components/stage1/GroupBracket';
import SongPicker from '../components/stage1/SongPicker';
import ScoreEntryForm from '../components/stage1/ScoreEntryForm';
import { useMSCSSE } from '../hooks/useSSE';
import { FaSync, FaInfoCircle } from 'react-icons/fa';
import { ArrowLeft } from 'lucide-react';
import SongReveal from '../components/live/SongReveal';
import MotionButton from '../components/live/MotionButton';
import ScoreDuelResult from '../components/live/ScoreDuelResult';
import WinnerReveal from '../components/live/WinnerReveal';
import RandomDrawPrompt from '../components/live/RandomDrawPrompt';
import SongSelectionSpotlight from '../components/live/SongSelectionSpotlight';
import { FADE_SLIDE, MOTION_TRANSITIONS } from '../utils/motion';

export default function Stage1Page() {
  const {
    stage1,
    status,
    fetchStatus,
    fetchStage1State,
    selectStage1Song,
    submitStage1Score,
    advanceStage1,
    forfaitStage1,
    resolveStage1Tie,
  } = useMSC2026Store();
  const [view, setView] = useState('bracket'); // bracket | match | admin
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [decisionChoice, setDecisionChoice] = useState(null);
  const [decisionPending, setDecisionPending] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [randomReveal, setRandomReveal] = useState(null);
  const reduceMotion = useReducedMotion();

  // 初始加载（仅挂载时执行一次）
  useEffect(() => {
    fetchStatus().catch(() => {});
    fetchStage1State().catch(() => {});
  }, [fetchStatus, fetchStage1State]);

  // SSE 实时同步（action 函数引用稳定，不依赖整个 store）
  useMSCSSE({
    score_updated: useCallback(() => {
      fetchStage1State();
    }, [fetchStage1State]),
    song_drawn: useCallback(async (data) => {
      const nextState = await fetchStage1State();
      const group = nextState.groups?.find((entry) => entry.order === data.groupIndex);
      const randomPlay = [...(group?.songs || [])].reverse().find((play) => play.pickType === 'random');
      if (randomPlay?.song) setRandomReveal(randomPlay.song);
    }, [fetchStage1State]),
    match_finished: useCallback(() => {
      fetchStage1State();
      fetchStatus();
    }, [fetchStage1State, fetchStatus]),
    stage_advanced: useCallback(() => {
      fetchStatus();
    }, [fetchStatus]),
  }, { enabled: status === 'stage1' });

  const selectedGroup = selectedGroupId !== null
    ? stage1.groups?.find((g) => g.groupId === selectedGroupId)
    : null;
  const selectedWinnerId = selectedGroup?.winner?.toString?.() || selectedGroup?.winner;
  const selectedP1Id = (selectedGroup?.p1?._id || selectedGroup?.p1?.userId)?.toString?.() || selectedGroup?.p1?._id || selectedGroup?.p1?.userId;
  const selectedWinnerName = selectedWinnerId === selectedP1Id
    ? selectedGroup?.p1?.username
    : selectedGroup?.p2?.username;
  const selectedP2Id = (selectedGroup?.p2?._id || selectedGroup?.p2?.userId)?.toString?.() || selectedGroup?.p2?._id || selectedGroup?.p2?.userId;
  const currentSong = selectedGroup?.songs?.[selectedGroup.songs.length - 1] || null;

  const chooseDecision = (type, playerId) => {
    setDecisionChoice({ type, playerId });
    setDecisionError(null);
  };

  const executeDecision = async () => {
    if (!decisionChoice || !selectedGroup) return;
    setDecisionPending(true);
    setDecisionError(null);
    try {
      if (decisionChoice.type === 'tie') {
        await resolveStage1Tie(selectedGroup.order, decisionChoice.playerId);
      } else {
        await forfaitStage1(decisionChoice.playerId);
      }
      await fetchStage1State();
      await fetchStatus();
      setDecisionChoice(null);
    } catch (err) {
      setDecisionError(err?.msg || '操作失败');
    } finally {
      setDecisionPending(false);
    }
  };

  const decisionPlayerName = decisionChoice?.playerId === selectedP1Id
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
            {stage1.status === 'done'
              ? '阶段已结束'
              : `${stage1.completedGroups}/${stage1.totalGroups} 组已完成`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStage1State()}
            className="p-4 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            title="刷新"
          >
            <FaSync className={`text-lg ${stage1.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {view === 'bracket' && (
          <Motion.div
            key="bracket"
            initial={reduceMotion ? { opacity: 0 } : FADE_SLIDE.initial}
            animate={FADE_SLIDE.animate}
            exit={reduceMotion ? { opacity: 0 } : FADE_SLIDE.exit}
            transition={MOTION_TRANSITIONS.enter}
          >
            <GroupBracket
              groups={stage1.groups || []}
              currentGroupIndex={stage1.currentGroupIndex}
              completedGroups={stage1.completedGroups}
              onSelectGroup={(groupId) => {
                setSelectedGroupId(groupId);
                setView('match');
              }}
            />
          </Motion.div>
        )}

        {view === 'match' && selectedGroup && (
          <Motion.div
            key="match"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 34 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={MOTION_TRANSITIONS.flow}
          >
            <div className="flex items-center gap-4 mb-6">
              <MotionButton
                onClick={() => { setView('bracket'); setSelectedGroupId(null); }}
                className="px-3 py-2 text-base md:text-lg text-zinc-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" /> 返回对阵表
              </MotionButton>
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
              <div className="mb-5">
                <WinnerReveal name={selectedWinnerName} eyebrow="GROUP WINNER" detail={`第 ${selectedGroup.order + 1} 组晋级`} />
              </div>
            )}

            {selectedGroup.needTiebreak && !selectedGroup.winner && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 mb-5">
                <div className="flex items-center gap-3 text-amber-200">
                  <FaInfoCircle />
                  <span className="text-xl font-bold">三项数据完全相同，请在线下加赛后录入胜者</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button onClick={() => chooseDecision('tie', selectedP1Id)} className="py-3 rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-200 font-bold">
                    {selectedGroup.p1?.username} 加赛获胜
                  </button>
                  <button onClick={() => chooseDecision('tie', selectedP2Id)} className="py-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200 font-bold">
                    {selectedGroup.p2?.username} 加赛获胜
                  </button>
                </div>
              </div>
            )}

            {/* 操作区 */}
            {selectedGroup.status !== 'done' && (
              <AnimatePresence mode="wait">
                <Motion.div
                  key={`${selectedGroup.groupId}-${selectedGroup.status}-${selectedGroup.songs?.length || 0}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.995 }}
                  transition={MOTION_TRANSITIONS.enter}
                  className="space-y-4"
                >
                {selectedGroup.status === 'p1_pick' || selectedGroup.status === 'p2_pick' ? (
                  <SongPicker
                    pool={stage1.songPool || []}
                    excludedSongIds={selectedGroup.songs?.filter(s => s.songId).map(s => s.songId) || []}
                    pickType={
                      selectedGroup.status === 'p1_pick' ? 'p1_pick' :
                      selectedGroup.status === 'p2_pick' ? 'p2_pick' : null
                    }
                    onPick={async (songId) => {
                      await selectStage1Song(songId);
                      await fetchStage1State();
                    }}
                  />
                ) : selectedGroup.status === 'random_pick' ? (
                  <RandomDrawPrompt
                    onDraw={async () => {
                      const result = await advanceStage1();
                      if (result.data?.song) setRandomReveal(result.data.song);
                      await fetchStage1State().catch(() => {});
                    }}
                  />
                ) : selectedGroup.status === 'playing' ? (
                  <>
                    <SongReveal
                      play={currentSong}
                      label={currentSong?.pickType === 'random' ? '系统随机曲目 · 已锁定' : '当前比赛曲目'}
                      order={(currentSong?.order ?? 0) + 1}
                    />
                    <ScoreEntryForm
                      key={`${selectedGroup.groupId}-${currentSong?.songId || 'none'}`}
                      groupId={selectedGroup.groupId}
                      songId={currentSong?.songId}
                      songIndex={currentSong?.order ?? 0}
                      p1={selectedGroup.p1}
                      p2={selectedGroup.p2}
                      onSubmit={async (data) => {
                        const result = await submitStage1Score(data);
                        setScoreResult({
                          p1: selectedGroup.p1,
                          p2: selectedGroup.p2,
                          p1Score: data.p1Score,
                          p2Score: data.p2Score,
                          songTitle: currentSong?.song?.title || `曲目 ${(currentSong?.order ?? 0) + 1}`,
                        });
                        await fetchStage1State();
                        return result;
                      }}
                      onAdvance={async () => {
                        await advanceStage1();
                        await fetchStage1State();
                      }}
                    />
                  </>
                ) : null}
                </Motion.div>
              </AnimatePresence>
            )}

            {selectedGroup.order === stage1.currentGroupIndex && selectedGroup.status !== 'done' && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="text-sm text-zinc-500 mb-3">异常处理：仅在选手确认弃权后使用</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => chooseDecision('forfeit', selectedP1Id)} className="px-4 py-2 rounded-xl border border-red-400/25 bg-red-500/10 text-red-200">
                    {selectedGroup.p1?.username} 弃权
                  </button>
                  <button onClick={() => chooseDecision('forfeit', selectedP2Id)} className="px-4 py-2 rounded-xl border border-red-400/25 bg-red-500/10 text-red-200">
                    {selectedGroup.p2?.username} 弃权
                  </button>
                </div>
              </div>
            )}

            {decisionChoice && (
              <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
                <p className="text-lg font-bold text-white">
                  {decisionChoice.type === 'tie'
                    ? `确认录入 ${decisionPlayerName} 为加赛胜者？`
                    : `确认 ${decisionPlayerName} 弃权并让对手晋级？`}
                </p>
                <p className="text-sm text-zinc-400 mt-1">确认后将立即推进比赛状态。</p>
                {decisionError && <p className="text-red-200 mt-3">{decisionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button disabled={decisionPending} onClick={executeDecision} className="px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-400/35 text-red-100 font-bold disabled:opacity-50">
                    {decisionPending ? '提交中...' : '确认提交'}
                  </button>
                  <button disabled={decisionPending} onClick={() => setDecisionChoice(null)} className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-300 disabled:opacity-50">
                    取消
                  </button>
                </div>
              </div>
            )}
          </Motion.div>
        )}
      </AnimatePresence>

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
