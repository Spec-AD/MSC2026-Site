// ============================================================
// RacePage.jsx — 跑图阶段页面（阶段二 & 三 共用）
// 布局：顶部「小标签·大数字」数据条 + 中央 3D 地图 + 右侧榜单
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRaceStore } from '../store';
import { useMSCSSE } from '../hooks/useSSE';
import { STAGE_CONFIG, getItemDef } from '../constants/gameData';
import RaceMap3D from '../components/race/RaceMap3D';
import RaceStatBar from '../components/race/RaceStatBar';
import ChallengeCard from '../components/race/ChallengeCard';
import ItemCard from '../components/race/ItemCard';
import { FaForward, FaPlay, FaSync } from 'react-icons/fa';
import { HiOutlineCube } from 'react-icons/hi';

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
  const config = STAGE_CONFIG[stage] || {};
  const [itemViewer, setItemViewer] = useState(null);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  // 初始加载（仅 stage 变化时重载，不依赖整个 store）
  useEffect(() => {
    race.fetchRaceState().catch(() => {});
  }, [stage]);

  // 前端本地倒计时：接口/SSE 负责校准，页面负责每秒流逝。
  useEffect(() => {
    const interval = setInterval(() => race.tickTimers(), 1000);
    return () => clearInterval(interval);
  }, [race.tickTimers]);

  // SSE 实时同步（action 函数引用稳定）
  useMSCSSE({
    turn_change: useCallback((data) => race.sseTurnChange(data), [race.sseTurnChange]),
    turn_timeout: useCallback((data) => race.sseTurnTimeout(data), [race.sseTurnTimeout]),
    player_moved: useCallback((data) => race.ssePlayerMoved(data), [race.ssePlayerMoved]),
    timer_tick: useCallback((data) => race.sseTimerTick(data), [race.sseTimerTick]),
    item_collected: useCallback(() => race.fetchRaceMap(), [race.fetchRaceMap]),
    item_used: useCallback(() => race.fetchRaceMap(), [race.fetchRaceMap]),
    challenge_revealed: useCallback(() => race.fetchChallenge(), [race.fetchChallenge]),
    challenge_resolved: useCallback(() => {
      race.dismissChallenge();
      race.fetchRaceMap();
    }, [race.dismissChallenge, race.fetchRaceMap]),
    wall_broken: useCallback(() => race.fetchRaceMap(), [race.fetchRaceMap]),
    player_bounced: useCallback(() => race.fetchRaceMap(), [race.fetchRaceMap]),
    match_finished: useCallback(() => race.fetchRaceState(), [race.fetchRaceState]),
    map_timeout: useCallback(() => race.fetchRaceState(), [race.fetchRaceState]),
  }, { enabled: true });

  // 地图数据 15s 轮询作为 SSE 兜底（自执行不依赖外部变量）
  useEffect(() => {
    const interval = setInterval(() => race.fetchRaceMap().catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, []);

  const canOperate = race.status === 'racing' && !race.activeChallenge;

  /** 处理行动 */
  const handleAdvance = async (force = false) => {
    if (!canOperate) return;
    if (!force && currentPlayer && (currentPlayer.itemCount || 0) > (currentPlayer.itemUsedCount || 0)) {
      await loadCurrentPlayerItems(true);
      return;
    }
    try {
      setPendingAdvance(false);
      setItemViewer(null);
      await race.performAction({ actionType: 'advance' });
      race.fetchRaceMap();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickup = async (zoneIndex) => {
    if (!canOperate) return;
    try {
      await race.performAction({ actionType: 'pickup', zoneIndex });
      race.fetchRaceMap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkipTurn = async () => {
    if (!canOperate) return;
    try {
      await race.skipTurn();
      race.fetchRaceState();
    } catch (err) {
      console.error(err);
    }
  };

  /** 处理挑战判定 */
  const handleChallengeResult = async (passed) => {
    try {
      await race.submitChallengeResult(passed);
      race.fetchRaceState();
    } catch (err) {
      console.error(err);
    }
  };

  /** 处理道具使用 */
  const handleUseItem = async (itemRef) => {
    try {
      await race.useItem(itemRef);
      race.fetchRaceState();
      if (itemViewer?.player?.userId) {
        const data = await race.fetchPlayerItems(itemViewer.player.userId);
        setItemViewer(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /** 加载当前回合选手道具 */
  const loadCurrentPlayerItems = async (forAdvance = false) => {
    if (!race.currentPlayerId) return;
    try {
      const data = await race.fetchPlayerItems(race.currentPlayerId);
      setItemViewer(data);
      setPendingAdvance(forAdvance);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPlayerItems = async (player) => {
    const playerId = player?._id || player?.userId;
    if (!playerId) return;
    try {
      const data = await race.fetchPlayerItems(playerId);
      setItemViewer(data);
      setPendingAdvance(false);
    } catch (err) {
      console.error(err);
    }
  };

  /** 当前选手的相邻扇区 */
  const adjacentSectors = useMemo(() => {
    const currentPlayer = race.players?.find((p) => String(p._id || p.userId) === String(race.currentPlayerId));
    if (!currentPlayer) return [];
    const sv = currentPlayer.startVertex;
    const count = config.mapShape === 'hexagon' ? 6 : 4;
    return [sv, (sv + 1) % count];
  }, [race.players, race.currentPlayerId, config.mapShape]);

  const currentPlayer = race.players?.find((p) => String(p._id || p.userId) === String(race.currentPlayerId));
  const availablePickupSectors = useMemo(() => (
    (race.itemsOnMap || [])
      .filter((item) => !item.collected && adjacentSectors.includes(item.zoneIndex))
      .map((item) => ({
        zoneIndex: item.zoneIndex,
        itemRef: item.itemRef,
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
  // 榜单排序：按回合先手顺序展示，第一个行动的选手排在最上面。
  const ranked = useMemo(() => {
    const players = [...(race.players || [])];
    if (players.length === 0) return players;

    const firstLog = race.actionLog?.find((log) => log.playerId);
    const firstPlayerId = firstLog ? String(firstLog.playerId?._id || firstLog.playerId) : null;
    let startIndex = firstPlayerId
      ? players.findIndex((p) => String(p._id || p.userId) === firstPlayerId)
      : Number(race.currentPlayerIndex);

    if (!Number.isInteger(startIndex) || startIndex < 0) startIndex = 0;

    return players
      .map((player, index) => ({
        player,
        order: (index - startIndex + players.length) % players.length,
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ player }) => player);
  }, [race.players, race.currentPlayerIndex, race.actionLog]);

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
      />

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_430px] gap-5 md:gap-6">
        {/* 地图区 */}
        <div className="min-w-0 flex flex-col">
          {race.status === 'racing' && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur-xl p-4 shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="min-w-0 xl:w-56">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">当前回合</p>
                  <p className="text-2xl font-bold text-white truncate" style={{ fontFamily: 'Torus, sans-serif' }}>
                    {currentPlayer?.username || '等待选手'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:flex-1 gap-2">
                  <button
                    onClick={() => handleAdvance(false)}
                    disabled={!canOperate}
                    className={`min-h-14 px-5 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2
                      ${canOperate
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/35 hover:bg-amber-500/30'
                        : 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed'}`}
                  >
                    <FaPlay className="text-xs" /> 前进
                  </button>
                  {availablePickupSectors.length > 0 ? (
                    availablePickupSectors.map((item, index) => (
                      <button
                        key={`${item.itemRef}-${item.zoneIndex}`}
                        onClick={() => handlePickup(item.zoneIndex)}
                        disabled={!canOperate}
                        className={`min-h-14 px-5 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2
                          ${canOperate
                            ? 'bg-sky-500/18 text-sky-200 border-sky-500/30 hover:bg-sky-500/28'
                            : 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed'}`}
                      >
                        <HiOutlineCube /> 拾取道具{availablePickupSectors.length > 1 ? ` ${index + 1}` : ''}
                      </button>
                    ))
                  ) : (
                    <button
                      disabled
                      className="min-h-14 px-5 rounded-xl bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed text-base font-bold"
                    >
                      无可拾取道具
                    </button>
                  )}
                  <button
                    onClick={handleSkipTurn}
                    disabled={!canOperate}
                    className={`min-h-14 px-5 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2
                      ${canOperate
                        ? 'bg-red-500/14 text-red-200 border-red-500/25 hover:bg-red-500/22'
                        : 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed'}`}
                  >
                    <FaForward className="text-xs" /> 弃权
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="relative h-[min(70vh,900px)] min-h-[620px] 2xl:min-h-[720px]">
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

            {/* 当前行动选手标识（左上） */}
            {currentPlayer && (
              <div className="absolute top-5 left-5 flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/55 backdrop-blur-xl border border-amber-400/30 pointer-events-none shadow-[0_0_34px_rgba(245,158,11,0.12)]">
                <span className="text-sm uppercase tracking-[0.16em] text-zinc-400">行动中</span>
                <span className="text-2xl md:text-3xl font-bold text-amber-200 truncate max-w-[46vw]" style={{ fontFamily: 'Torus, sans-serif' }}>
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
                <span className={`text-5xl md:text-6xl font-bold leading-none tabular-nums ${race.turnRemainingMs != null && race.turnRemainingMs < 10000 ? 'text-red-300 animate-pulse' : 'text-zinc-100'}`}
                  style={{ fontFamily: 'Torus, sans-serif' }}>
                  {race.activeChallenge ? '暂停' : fmtMs(race.turnRemainingMs)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 右侧面板 */}
        <div className="w-full space-y-4">
          {/* 选手排名榜 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-white">实时榜单</h3>
              <span className="text-base text-zinc-400">回合顺序</span>
            </div>
            <div className="space-y-3">
              {ranked.map((p, index) => {
                const playerId = p._id || p.userId;
                const isActive = String(playerId) === String(race.currentPlayerId);
                const finished = p.finishOrder != null;
                return (
                  <div
                    key={playerId}
                    className={`flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all
                      ${isActive ? 'bg-amber-500/10 border-amber-500/25'
                        : finished ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                        : 'bg-transparent border-white/[0.06]'}`}
                  >
                    <button
                      type="button"
                      onClick={() => loadPlayerItems(p)}
                      title="查看道具"
                      className={`shrink-0 w-12 h-12 rounded-2xl overflow-hidden border transition-all flex items-center justify-center
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
                      </p>
                    </div>
                    {/* 大数字：坐标 / ★ */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-5xl font-bold leading-none tabular-nums
                        ${finished ? 'text-emerald-400' : isActive ? 'text-amber-300' : 'text-zinc-300'}`}
                        style={{ fontFamily: 'Torus, sans-serif' }}>
                        {finished ? '★' : (p.currentLayer ?? 0)}
                      </span>
                      <span className="text-sm text-zinc-500 mt-1">{finished ? '完赛' : '坐标'}</span>
                    </div>
                  </div>
                );
              })}
              {(!ranked || ranked.length === 0) && (
                <p className="text-lg text-zinc-500 py-8 text-center">等待选手入场…</p>
              )}
            </div>
          </div>

          {/* 行动日志 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 max-h-64 overflow-y-auto">
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
            challenge={race.activeChallenge}
            pendingJudgement={race.pendingJudgement}
            isJudge
            onPass={() => handleChallengeResult(true)}
            onFail={() => handleChallengeResult(false)}
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
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4"
            onClick={() => { setItemViewer(null); setPendingAdvance(false); }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-4">
                {itemViewer.player?.avatarUrl && (
                  <img src={itemViewer.player.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                )}
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold text-white truncate" style={{ fontFamily: 'Torus, sans-serif' }}>
                    {itemViewer.player?.username || '选手'} · 道具
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {pendingAdvance
                      ? '可先使用道具，也可以直接进入挑战'
                      : itemViewer.disableItemsUntilTurn != null ? `禁用道具至回合 ${itemViewer.disableItemsUntilTurn}` : '可查看当前持有与已激活效果'}
                  </p>
                </div>
              </div>
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
                          <button
                            onClick={() => handleUseItem(item.itemRef)}
                            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-200 text-base font-bold border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                          >
                            使用
                          </button>
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
                  <button
                    onClick={() => handleAdvance(true)}
                    className="py-3 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30 transition-all text-base font-bold"
                  >
                    不使用道具，继续挑战
                  </button>
                  <button
                    onClick={() => { setItemViewer(null); setPendingAdvance(false); }}
                    className="py-3 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-base font-bold"
                  >
                    返回选择
                  </button>
                </div>
              )}
              <button
                onClick={() => { setItemViewer(null); setPendingAdvance(false); }}
                className="w-full mt-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
