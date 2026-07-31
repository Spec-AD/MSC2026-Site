// ============================================================
// RacePage.jsx — 跑图阶段页面（阶段二 & 三 共用）
// 布局：顶部「小标签·大数字」数据条 + 中央 3D 地图 + 右侧榜单
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { useRaceStore } from '../store';
import { useMSCSSE } from '../hooks/useSSE';
import { STAGE_CONFIG, getItemDef } from '../constants/publicGameData';
import { formatChallengeCondition } from '../utils/challengeFormat';
import RaceMap3D from '../components/race/RaceMap3D';
import RaceStatBar from '../components/race/RaceStatBar';
import ChallengeCard from '../components/race/ChallengeCard';
import ItemCard from '../components/race/ItemCard';
import { FaForward, FaPlay, FaSync } from 'react-icons/fa';
import { HiOutlineCube } from 'react-icons/hi';
import MotionButton from '../components/live/MotionButton';
import MapEventSignal from '../components/race/MapEventSignal';
import { MOTION_TRANSITIONS } from '../utils/motion';
import { useAuth } from '../../../context/AuthContext';

/** 倒计时格式化 */
function fmtMs(ms) {
  if (ms == null || ms < 0) return '--:--';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function RacePage({ stage }) {
  const race = useRaceStore();
  const { user } = useAuth();
  const canManage = Boolean(user && ['ADM', 'TO', 'CHM'].includes(user.role));
  const {
    fetchRaceState, fetchRaceMap, fetchChallenge, dismissChallenge,
    tickTimers, sseTurnChange, sseTurnTimeout, ssePlayerMoved, sseTimerTick,
    sseRoundStarted, sseRoundAdjudication,
  } = race;
  const config = STAGE_CONFIG[stage] || {};
  const [itemViewer, setItemViewer] = useState(null);
  const [itemUseResult, setItemUseResult] = useState(null);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [mapSignal, setMapSignal] = useState(null);
  const reduceMotion = useReducedMotion();

  const showMapSignal = useCallback((type, data = {}) => {
    const playerId = String(data.playerId || '');
    const player = useRaceStore.getState().players.find((entry) => String(entry._id || entry.userId) === playerId);
    const playerName = player?.username || '选手';
    let title = `${playerName} 的位置已更新`;
    let detail = data.wallLabel || '';

    if (type === 'success') title = `${playerName} 突破 ${data.wallLabel || '墙壁'}`;
    if (type === 'failure') title = `${playerName} 突破失败`;
    if (type === 'advance') {
      title = data.reachedEnd ? `${playerName} 抵达中心` : `${playerName} 前进至坐标 ${data.toLayer}`;
      detail = data.reachedEnd ? `第 ${data.finishOrder} 名完成跑图` : data.wallLabel || '';
      type = data.reachedEnd ? 'finish' : 'advance';
    }

    setMapSignal({ id: `${type}-${Date.now()}`, type, title, detail });
  }, []);

  // 初始加载（仅 stage 变化时重载，不依赖整个 store）
  useEffect(() => {
    fetchRaceState().catch(() => {});
  }, [stage, fetchRaceState]);

  // 前端本地倒计时：接口/SSE 负责校准，页面负责每秒流逝。
  useEffect(() => {
    const interval = setInterval(() => tickTimers(), 1000);
    return () => clearInterval(interval);
  }, [tickTimers]);

  // SSE 实时同步（action 函数引用稳定）
  useMSCSSE({
    turn_change: useCallback((data) => sseTurnChange(data), [sseTurnChange]),
    turn_timeout: useCallback((data) => sseTurnTimeout(data), [sseTurnTimeout]),
    player_moved: useCallback((data) => {
      ssePlayerMoved(data);
      showMapSignal('advance', data);
    }, [showMapSignal, ssePlayerMoved]),
    timer_tick: useCallback((data) => sseTimerTick(data), [sseTimerTick]),
    item_collected: useCallback(() => fetchRaceMap(), [fetchRaceMap]),
    item_used: useCallback(() => fetchRaceMap(), [fetchRaceMap]),
    challenge_revealed: useCallback(() => fetchChallenge(), [fetchChallenge]),
    challenge_resolved: useCallback(() => {
      dismissChallenge();
      fetchRaceState();
    }, [dismissChallenge, fetchRaceState]),
    race_started: useCallback(() => fetchRaceState(), [fetchRaceState]),
    round_started: useCallback((data) => {
      sseRoundStarted(data);
      fetchRaceState();
    }, [fetchRaceState, sseRoundStarted]),
    round_adjudication: useCallback((data) => {
      sseRoundAdjudication(data);
      fetchChallenge();
    }, [fetchChallenge, sseRoundAdjudication]),
    challenge_queue_advanced: useCallback(() => fetchChallenge(), [fetchChallenge]),
    wall_broken: useCallback((data) => {
      fetchRaceMap();
      showMapSignal('success', data);
    }, [fetchRaceMap, showMapSignal]),
    player_bounced: useCallback((data) => {
      fetchRaceMap();
      showMapSignal('failure', data);
    }, [fetchRaceMap, showMapSignal]),
    match_finished: useCallback(() => fetchRaceState(), [fetchRaceState]),
    map_timeout: useCallback(() => fetchRaceState(), [fetchRaceState]),
  }, { enabled: true });

  // 地图数据 15s 轮询作为 SSE 兜底（自执行不依赖外部变量）
  useEffect(() => {
    const interval = setInterval(() => fetchRaceMap().catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, [fetchRaceMap]);

  useEffect(() => {
    if (!mapSignal) return undefined;
    const timer = setTimeout(() => setMapSignal(null), 2800);
    return () => clearTimeout(timer);
  }, [mapSignal]);

  // The last action can be advance, pickup, skip, or timeout. Once the persisted
  // state enters adjudication, always load the first challenge in round order.
  useEffect(() => {
    if (race.status !== 'adjudicating' || race.activeChallenge) return;
    fetchChallenge().catch(() => {});
  }, [fetchChallenge, race.activeChallenge, race.status]);

  const canOperate = canManage && race.status === 'racing' && !race.activeChallenge && !pendingAction;

  const handleStartRace = async () => {
    if (!canManage || pendingAction) return;
    try {
      setPendingAction('start');
      setActionError(null);
      await race.startRace();
    } catch (err) {
      setActionError(err.msg || '开始跑图失败');
    } finally {
      setPendingAction(null);
    }
  };

  /** 处理行动 */
  const handleAdvance = async (force = false) => {
    if (!canOperate) return;
    if (!force && currentPlayer && (currentPlayer.itemCount || 0) > (currentPlayer.itemUsedCount || 0)) {
      await loadCurrentPlayerItems(true);
      return;
    }
    try {
      setPendingAction('advance');
      setActionError(null);
      setPendingAdvance(false);
      setItemViewer(null);
      setItemUseResult(null);
      const data = await race.performAction({ actionType: 'advance' });
      await race.fetchRaceMap();
      return data;
    } catch (err) {
      console.error(err);
      setActionError(err.msg || '前进失败');
    } finally {
      setPendingAction(null);
    }
  };

  const handlePickup = async (zoneIndex) => {
    if (!canOperate) return;
    try {
      setPendingAction('pickup');
      setActionError(null);
      setItemUseResult(null);
      await race.performAction({ actionType: 'pickup', zoneIndex });
      await race.fetchRaceState();
    } catch (err) {
      console.error(err);
      setActionError(err.msg || '拾取失败');
    } finally {
      setPendingAction(null);
    }
  };

  const handleSkipTurn = async () => {
    if (!canOperate) return;
    try {
      setPendingAction('skip');
      setActionError(null);
      setItemUseResult(null);
      await race.skipTurn();
      await race.fetchRaceState();
    } catch (err) {
      console.error(err);
      setActionError(err.msg || '跳过失败');
    } finally {
      setPendingAction(null);
    }
  };

  /** 处理挑战判定 */
  const handleChallengeResult = async (passed, resultSnapshot) => {
    try {
      setPendingAction(passed ? 'judge-pass' : 'judge-fail');
      const result = await race.submitChallengeResult(passed, resultSnapshot);
      if (!passed && result.penaltiesApplied?.length) {
        setActionError(`挑战失败，道具惩罚已执行：${result.penaltiesApplied.map(item => `${item.itemName}（${item.summary}）`).join('；')}`);
      } else {
        setActionError(null);
      }
      race.fetchRaceState();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingAction(null);
    }
  };

  /** 处理道具使用 */
  const handleUseItem = async (itemRef) => {
    try {
      setPendingAction(`item:${itemRef}`);
      setActionError(null);
      const response = await race.useItem(itemRef);
      const result = response.data || response;
      setItemUseResult(result);
      await race.fetchRaceState();
      if (itemViewer?.player?.userId) {
        const data = await race.fetchPlayerItems(itemViewer.player.userId);
        setItemViewer(data);
      }
    } catch (err) {
      console.error(err);
      setActionError(err.msg || '道具使用失败');
    } finally {
      setPendingAction(null);
    }
  };

  /** 加载当前回合选手道具 */
  const loadCurrentPlayerItems = async (forAdvance = false) => {
    if (!race.currentPlayerId) return;
    try {
      const data = await race.fetchPlayerItems(race.currentPlayerId);
      setItemViewer(data);
      setItemUseResult(null);
      setPendingAdvance(forAdvance);
    } catch (err) {
      console.error(err);
      setActionError(err.msg || '获取道具失败');
    }
  };

  const loadPlayerItems = async (player) => {
    const playerId = player?._id || player?.userId;
    if (!playerId) return;
    try {
      const data = await race.fetchPlayerItems(playerId);
      setItemViewer(data);
      setItemUseResult(null);
      setPendingAdvance(false);
    } catch (err) {
      console.error(err);
      setActionError(err.msg || '获取道具失败');
    }
  };

  /** 当前选手的相邻扇区 */
  const adjacentSectors = useMemo(() => {
    const currentPlayer = race.players?.find((p) => String(p._id || p.userId) === String(race.currentPlayerId));
    if (!currentPlayer) return [];
    const sv = currentPlayer.startVertex;
    const count = config.mapShape === 'hexagon' ? 6 : 4;
    return [sv, (sv + count - 1) % count];
  }, [race.players, race.currentPlayerId, config.mapShape]);

  const currentPlayer = race.players?.find((p) => String(p._id || p.userId) === String(race.currentPlayerId));
  const availablePickupSectors = useMemo(() => (
    (race.itemsOnMap || [])
      .filter((item) => !item.collected && adjacentSectors.includes(item.zoneIndex))
      .map((item) => ({
        zoneIndex: item.zoneIndex,
      }))
  ), [race.itemsOnMap, adjacentSectors]);
  const effectiveMapConfig = useMemo(() => ({
    shape: race.mapConfig?.shape || config.mapShape || 'hexagon',
    layers: race.mapConfig?.layers || config.layers || 3,
    wallLabels: race.mapConfig?.wallLabels || config.wallLabels || [],
  }), [race.mapConfig, config.mapShape, config.layers, config.wallLabels]);

  // 派生统计
  const advanceCount = stage === 'stage2' ? 4 : stage === 'stage3' ? 2 : 0;
  const finishedCount = race.players?.filter((p) => p.finishOrder != null).length || 0;
  // 榜单按本圈权威行动顺序展示；每圈结束后由后端完整倒序。
  const ranked = useMemo(() => {
    const players = [...(race.players || [])];
    if (players.length === 0) return players;
    if (!race.turnOrder?.length) return players;
    const playerById = new Map(players.map(player => [String(player._id || player.userId), player]));
    const ordered = race.turnOrder.map(playerId => playerById.get(String(playerId))).filter(Boolean);
    const included = new Set(ordered.map(player => String(player._id || player.userId)));
    return [...ordered, ...players.filter(player => !included.has(String(player._id || player.userId)))];
  }, [race.players, race.turnOrder]);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* 顶部数据条 */}
      <RaceStatBar
        totalRemainingMs={race.totalRemainingMs}
        turnRemainingMs={race.turnRemainingMs}
        currentTurn={race.currentTurn}
        finishedCount={finishedCount}
        advanceCount={advanceCount}
        playerCount={race.players?.length || 0}
        stageLabel={config.label || ''}
        roundNumber={race.roundNumber}
        raceStatus={race.status}
      />

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-5 md:gap-6">
        {/* 地图区 */}
        <div className="min-w-0 flex flex-col">
          {race.status === 'waiting' && (
            <div className="msc-panel mb-4 grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-7">
              <div>
                <p className="msc-kicker">MAP READY / POSITION LOCKED</p>
                <p className="mt-2 text-4xl font-black text-white md:text-6xl">地图待启动</p>
                <p className="mt-3 max-w-3xl text-lg text-zinc-400">顶点与首圈顺序已随机并持久化。请现场核验全部选手位置，点击开始后才会启动总计时与首位选手的 45 秒行动计时。</p>
              </div>
              {canManage ? (
                <MotionButton onClick={handleStartRace} loading={pendingAction === 'start'} disabled={Boolean(pendingAction)} className="msc-command flex min-h-16 items-center justify-center gap-3 px-8 text-xl font-black">
                  <FaPlay /> {pendingAction === 'start' ? '启动中' : '开始跑图'}
                </MotionButton>
              ) : (
                <p className="font-mono text-sm text-zinc-500">AWAITING OPERATOR COMMAND</p>
              )}
            </div>
          )}
          {race.status === 'adjudicating' && (
            <div className="msc-panel mb-4 flex flex-col gap-3 border-l-2 border-l-amber-300 p-5 md:flex-row md:items-end md:justify-between md:p-7">
              <div>
                <p className="msc-kicker text-amber-300">ROUND {String(race.roundNumber).padStart(2, '0')} / BATCH JUDGEMENT</p>
                <p className="mt-2 text-4xl font-black text-white md:text-6xl">本圈统一判定</p>
              </div>
              <p className="font-mono text-lg text-zinc-300">PENDING {String(race.pendingJudgementCount || 0).padStart(2, '0')}</p>
            </div>
          )}
          {race.status === 'racing' && (
            <div className="msc-panel msc-index-strip mb-4">
              <div className="msc-display flex items-center justify-center bg-white/[0.035] text-4xl text-zinc-500">
                {String((race.roundPosition || 0) + 1).padStart(2, '0')}
              </div>
              <div className="p-4">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="min-w-0 xl:w-56">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">当前回合</p>
                  <p className="text-2xl font-black text-white truncate">
                    {currentPlayer?.username || '等待选手'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:flex-1 gap-2">
                  <MotionButton
                    onClick={() => handleAdvance(false)}
                    disabled={!canOperate}
                    loading={pendingAction === 'advance'}
                    className={`min-h-14 px-5 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2
                      ${canOperate
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/35 hover:bg-amber-500/30'
                        : 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed'}`}
                  >
                    <FaPlay className="text-xs" /> {pendingAction === 'advance' ? '登记中' : '前进 / 撞墙'}
                  </MotionButton>
                  {availablePickupSectors.length > 0 ? (
                    availablePickupSectors.map((item, index) => (
                      <MotionButton
                        key={item.zoneIndex}
                        onClick={() => handlePickup(item.zoneIndex)}
                        disabled={!canOperate}
                        loading={pendingAction === 'pickup'}
                        className={`min-h-14 px-5 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2
                          ${canOperate
                            ? 'bg-sky-500/18 text-sky-200 border-sky-500/30 hover:bg-sky-500/28'
                            : 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed'}`}
                      >
                        <HiOutlineCube /> {pendingAction === 'pickup' ? '登记中' : `拾取（圈末发放）${availablePickupSectors.length > 1 ? ` ${index + 1}` : ''}`}
                      </MotionButton>
                    ))
                  ) : (
                    <button
                      disabled
                      className="min-h-14 px-5 rounded-xl bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed text-base font-bold"
                    >
                      无可拾取道具
                    </button>
                  )}
                  <MotionButton
                    onClick={handleSkipTurn}
                    disabled={!canOperate}
                    loading={pendingAction === 'skip'}
                    className={`min-h-14 px-5 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2
                      ${canOperate
                        ? 'bg-red-500/14 text-red-200 border-red-500/25 hover:bg-red-500/22'
                        : 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed'}`}
                  >
                    <FaForward className="text-xs" /> {pendingAction === 'skip' ? '结束中' : '什么都不做'}
                  </MotionButton>
                </div>
              </div>
              {actionError && (
                <div className="mt-3 px-4 py-3 rounded-xl border border-red-400/25 bg-red-500/10 text-red-200 text-base">
                  {actionError}
                </div>
              )}
              </div>
              <div className="msc-technical flex min-w-40 flex-col justify-center text-sm text-zinc-500">
                <span>ROUND {String(race.roundNumber || 1).padStart(2, '0')}</span>
                <span>ORDER {String((race.roundPosition || 0) + 1).padStart(2, '0')} / {String(race.players?.length || 0).padStart(2, '0')}</span>
              </div>
            </div>
          )}
          <Motion.div
            animate={!reduceMotion && pendingAction === 'advance'
              ? { scale: [1, 0.994, 1], filter: ['brightness(1)', 'brightness(1.12)', 'brightness(1)'] }
              : !reduceMotion && mapSignal?.type === 'failure'
                ? { x: [0, -7, 7, -4, 4, 0], scale: 1, filter: 'brightness(1)' }
                : !reduceMotion && (mapSignal?.type === 'success' || mapSignal?.type === 'finish')
                  ? { scale: [1, 1.006, 1], filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'] }
                  : { x: 0, scale: 1, filter: 'brightness(1)' }}
            transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
            className="relative h-[min(76vh,980px)] min-h-[700px] 2xl:min-h-[800px]"
          >
            <RaceMap3D
              config={effectiveMapConfig}
              players={race.players}
              itemsOnMap={race.itemsOnMap}
              wallsBroken={race.wallsBroken}
              activePlayerId={race.currentPlayerId}
              highlightSectors={adjacentSectors}
              onSectorClick={handlePickup}
              width="100%"
              height="100%"
            />
            <MapEventSignal signal={mapSignal} />

            {/* 当前行动选手标识（左上） */}
            {currentPlayer && (
              <div className="absolute top-5 left-5 flex items-center gap-3 border-l-2 border-amber-300 bg-black/60 px-5 py-3 backdrop-blur-xl pointer-events-none">
                <span className="text-sm uppercase tracking-[0.16em] text-zinc-400">行动中</span>
                <span className="text-2xl md:text-3xl font-black text-amber-200 truncate max-w-[46vw]">
                  {currentPlayer.username}
                </span>
                <span className="w-3 h-3 rounded-full bg-amber-300 animate-pulse" />
              </div>
            )}

            {/* 回合倒计时（右上，大数字） */}
            {currentPlayer && (race.turnRemainingMs != null || race.activeChallenge) && (
              <div className={`absolute top-5 right-5 flex flex-col items-end px-5 py-3 rounded-2xl border backdrop-blur-xl pointer-events-none
                ${race.turnRemainingMs != null && race.turnRemainingMs < 10000
                  ? 'bg-red-500/20 border-red-400/40'
                  : 'bg-black/55 border-white/10'}`}>
                <span className="text-sm uppercase tracking-[0.16em] text-zinc-400">{race.activeChallenge ? '挑战判定' : '本回合'}</span>
                <span className={`text-5xl md:text-6xl font-black leading-none tabular-nums ${race.turnRemainingMs != null && race.turnRemainingMs < 10000 ? 'text-red-300 animate-pulse' : 'text-zinc-100'}`}>
                  {race.activeChallenge ? '暂停' : fmtMs(race.turnRemainingMs)}
                </span>
              </div>
            )}
          </Motion.div>
        </div>

        {/* 右侧面板 */}
        <div className="w-full space-y-4">
          {/* 选手排名榜 */}
          <div className="border-y border-white/10 bg-black/10 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-white">实时榜单</h3>
              <span className="text-base text-zinc-400">回合顺序</span>
            </div>
            <div className="space-y-px bg-white/10">
              {ranked.map((p, index) => {
                const playerId = p._id || p.userId;
                const isActive = String(playerId) === String(race.currentPlayerId);
                const finished = p.finishOrder != null;
                return (
                  <Motion.div
                    key={playerId}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={MOTION_TRANSITIONS.spring}
                    className={`flex min-h-24 items-center gap-4 border-l-2 px-4 py-4 transition-colors
                      ${isActive ? 'border-l-amber-300 bg-[#18170f]'
                        : finished ? 'border-l-emerald-300 bg-[#0d1714]'
                        : 'border-l-white/10 bg-[#090c0f]'}`}
                  >
                    <button
                      type="button"
                      onClick={() => loadPlayerItems(p)}
                      title="查看道具"
                      className={`shrink-0 w-12 h-12 overflow-hidden border transition-all flex items-center justify-center
                        ${isActive ? 'border-amber-400/45 bg-amber-500/15'
                          : p.itemCount > 0 ? 'border-sky-400/35 bg-sky-500/10'
                          : 'border-white/10 bg-zinc-800 hover:bg-zinc-700'}`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-black text-zinc-400">{index + 1}</span>
                      )}
                    </button>
                    {/* 名字 + 状态 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-bold text-white truncate leading-tight">{p.username}</p>
                      <p className={`text-base leading-tight mt-1 ${isActive ? 'text-amber-300' : 'text-zinc-500'}`}>
                        #{index + 1} 出手位 · {finished ? `第 ${p.finishOrder} 名抵达中心` : isActive ? '行动中…' : '等待回合'}
                        {p.itemCount > 0 && <span className="text-sky-400/80 ml-1.5">道具 {p.itemCount}</span>}
                        <span className="ml-1.5 text-red-300/75">失败 {p.challengeFailureCount || 0}</span>
                      </p>
                    </div>
                    {/* 大数字：坐标 / ★ */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-5xl font-bold leading-none tabular-nums
                        ${finished ? 'text-emerald-400' : isActive ? 'text-amber-300' : 'text-zinc-300'}`}
                        style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
                        {finished ? '★' : (p.currentLayer ?? 0)}
                      </span>
                      <span className="text-sm text-zinc-500 mt-1">{finished ? '完赛' : '坐标'}</span>
                    </div>
                  </Motion.div>
                );
              })}
              {(!ranked || ranked.length === 0) && (
                <p className="text-lg text-zinc-500 py-8 text-center">等待选手入场…</p>
              )}
            </div>
          </div>

          {/* 行动日志 */}
          <div className="border-y border-white/10 bg-black/10 p-5 max-h-64 overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-200 mb-3">行动日志</h3>
            <div className="space-y-2">
              {race.actionLog?.slice(-6).reverse().map((log, i) => (
                <div key={i} className="text-base text-zinc-400 leading-relaxed flex items-center gap-2">
                  <span className="text-zinc-600 font-mono tabular-nums">#{log.turn}</span>
                  {log.actionType === 'advance' && <span>⚔️ 挑战墙壁</span>}
                  {log.actionType === 'pickup' && <span>🎒 拾取道具</span>}
                  {log.actionType === 'use_item' && <span>✨ 使用道具</span>}
                  {log.actionType === 'challenge_passed' && <span className="text-emerald-500/70">✓ 突破成功</span>}
                  {log.actionType === 'challenge_failed' && <span className="text-red-500/70">✗ 挑战失败</span>}
                  {(log.actionType === 'skip_timeout' || log.actionType === 'skip_manual') && <span>⏰ 跳过回合</span>}
                </div>
              ))}
              {(!race.actionLog || race.actionLog.length === 0) && (
                <p className="text-base text-zinc-500">等待开始…</p>
              )}
            </div>
          </div>

          {/* 刷新 */}
          <button
            onClick={() => race.fetchRaceState()}
            className="w-full py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-base flex items-center justify-center gap-2"
          >
            <FaSync className={race.loading ? 'animate-spin' : ''} /> 刷新数据
          </button>
        </div>
      </div>

      {/* 挑战弹窗 */}
      <AnimatePresence>
        {race.activeChallenge && (
          <ChallengeCard
            key={`${race.activeChallenge.playerId}-${race.activeChallenge.taskId}-${race.currentTurn}`}
            challenge={race.activeChallenge}
            pendingJudgement={race.pendingJudgement}
            isJudge
            resolving={pendingAction === 'judge-pass' ? 'pass' : pendingAction === 'judge-fail' ? 'fail' : null}
            onPass={(snapshot) => handleChallengeResult(true, snapshot)}
            onFail={(snapshot) => handleChallengeResult(false, snapshot)}
            onDismiss={() => race.dismissChallenge()}
          />
        )}
      </AnimatePresence>

      {/* 道具拾取弹窗 */}
      <AnimatePresence>
        {race.activeItemPickup && (
          <ItemCard
            item={race.activeItemPickup}
            variant="pickup"
            onDismiss={() => race.dismissItemPickup()}
          />
        )}
      </AnimatePresence>

      {/* 道具背包弹窗 */}
      <AnimatePresence>
        {itemViewer && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITIONS.quick}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4"
            onClick={() => { setItemViewer(null); setPendingAdvance(false); setItemUseResult(null); }}
          >
            <Motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.985 }}
              transition={MOTION_TRANSITIONS.spring}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-4">
                {itemViewer.player?.avatarUrl && (
                  <img src={itemViewer.player.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                )}
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold text-white truncate" style={{ fontFamily: 'Novecento, NotoSansSC, sans-serif' }}>
                    {itemViewer.player?.username || '选手'} · 道具
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {pendingAdvance
                      ? '可先使用道具，也可以直接进入挑战'
                      : itemViewer.disableItemsUntilTurn != null ? `禁用道具至回合 ${itemViewer.disableItemsUntilTurn}` : '可查看当前持有与已激活效果'}
                  </p>
                </div>
              </div>
              {itemUseResult && (
                <div className={`mb-4 rounded-xl border p-4 ${
                  itemUseResult.success === false
                    ? 'border-red-400/25 bg-red-500/10'
                    : itemUseResult.success === true
                      ? 'border-emerald-400/25 bg-emerald-500/10'
                      : 'border-amber-400/25 bg-amber-500/10'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-bold text-white">{itemUseResult.name || '道具'} · 使用结果</p>
                    {itemUseResult.success === true && <span className="text-sm px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200">命中</span>}
                    {itemUseResult.success === false && <span className="text-sm px-2 py-1 rounded-lg bg-red-500/20 text-red-200">未命中</span>}
                    {itemUseResult.globalEffect && <span className="text-sm px-2 py-1 rounded-lg bg-sky-500/20 text-sky-200">全局生效</span>}
                  </div>
                  <p className="text-base text-zinc-300 mt-2">{itemUseResult.effect || '已激活，下一次挑战时生效。'}</p>
                  {itemUseResult.intendedEffect && (
                    <p className="text-sm text-zinc-500 mt-1">目标效果：{itemUseResult.intendedEffect}</p>
                  )}
                  {itemUseResult.challenge && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="text-sm uppercase tracking-[0.14em] text-zinc-500">{itemUseResult.challenge.wallLabel || '墙壁'} · 预览挑战</p>
                      <p className="text-xl font-bold text-white mt-1">{itemUseResult.challenge.taskName}</p>
                      <p className="text-base text-zinc-400 mt-1">{itemUseResult.challenge.songTitle} · {itemUseResult.challenge.difficulty}</p>
                      <p className="text-lg text-amber-200 font-bold mt-2">{formatChallengeCondition(itemUseResult.challenge)}</p>
                    </div>
                  )}
                </div>
              )}
              {(itemViewer.items || []).length === 0 ? (
                <p className="text-xl text-zinc-500">暂无道具</p>
              ) : (
                <div className="space-y-2">
                  {itemViewer.items.map((item) => {
                    const def = getItemDef(item.itemRef);
                    const effect = item.description || def?.effect || '暂无效果说明';
                    const penalty = item.penalty || def?.penalty;
                    return (
                      <div key={item.itemRef} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-zinc-800/50">
                        <div className="min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <p className="text-xl text-white font-bold truncate">{item.name || def?.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'double' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'}`}>
                              {item.type === 'double' ? '双面' : '增益'}
                            </span>
                          </div>
                          <p className="text-base text-zinc-400 mt-1">{effect}</p>
                          {item.probability != null && (
                            <p className="text-sm text-zinc-500 mt-1">成功率 {(item.probability * 100).toFixed(0)}%</p>
                          )}
                          {penalty && (
                            <p className="text-sm text-red-300 mt-1">{typeof penalty === 'string' ? penalty : '失败将触发双面惩罚'}</p>
                          )}
                        </div>
                        {item.status === 'unused' && (
                          <MotionButton
                            onClick={() => handleUseItem(item.itemRef)}
                            loading={pendingAction === `item:${item.itemRef}`}
                            disabled={Boolean(pendingAction)}
                            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-base font-bold border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                          >
                            {pendingAction === `item:${item.itemRef}` ? '使用中' : '使用'}
                          </MotionButton>
                        )}
                        {item.status === 'armed' && (
                          <span className="text-base font-bold text-amber-300">已激活</span>
                        )}
                        {item.status === 'consumed' && (
                          <span className="text-base font-bold text-zinc-500">已使用</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {pendingAdvance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <MotionButton
                    onClick={() => handleAdvance(true)}
                    loading={pendingAction === 'advance'}
                    disabled={Boolean(pendingAction)}
                    className="py-3 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30 transition-all text-base font-bold"
                  >
                    {pendingAction === 'advance' ? '进入挑战中' : itemUseResult ? '继续挑战' : '不使用道具，继续挑战'}
                  </MotionButton>
                  <MotionButton
                    onClick={() => { setItemViewer(null); setPendingAdvance(false); setItemUseResult(null); }}
                    className="py-3 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-base font-bold"
                  >
                    返回选择
                  </MotionButton>
                </div>
              )}
              <MotionButton
                onClick={() => { setItemViewer(null); setPendingAdvance(false); setItemUseResult(null); }}
                className="w-full mt-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-all"
              >
                关闭
              </MotionButton>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
