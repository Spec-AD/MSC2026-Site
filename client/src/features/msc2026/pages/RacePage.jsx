// ============================================================
// RacePage.jsx — 跑图阶段页面（阶段二 & 三 共用）
// 布局：顶部「小标签·大数字」数据条 + 中央 3D 地图 + 右侧榜单
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRaceStore } from '../store';
import { useMSCSSE } from '../hooks/useSSE';
import { STAGE_CONFIG, getItemDef } from '../constants/gameData';
import RaceMap3D from '../components/race/RaceMap3D';
import RaceStatBar from '../components/race/RaceStatBar';
import ChallengeCard from '../components/race/ChallengeCard';
import ItemCard from '../components/race/ItemCard';
import { FaPlay, FaSync } from 'react-icons/fa';
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
  const [myItems, setMyItems] = useState([]);
  const [showMyItems, setShowMyItems] = useState(false);

  // 初始加载（仅 stage 变化时重载，不依赖整个 store）
  useEffect(() => {
    race.fetchRaceState().catch(() => {});
  }, [stage]);

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

  const isMyTurn = false; // TODO: 对接当前用户 session

  /** 处理行动 */
  const handleAdvance = async () => {
    try {
      await race.performAction({ actionType: 'advance' });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickup = async (zoneIndex) => {
    try {
      await race.performAction({ actionType: 'pickup', zoneIndex });
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
    } catch (err) {
      console.error(err);
    }
  };

  /** 加载我的道具 */
  const loadMyItems = async () => {
    try {
      const data = await race.fetchMyItems();
      setMyItems(data?.items || []);
      setShowMyItems(true);
    } catch (err) {
      console.error(err);
    }
  };

  /** 当前选手的相邻扇区 */
  const adjacentSectors = useMemo(() => {
    const currentPlayer = race.players?.find((p) => (p._id || p.userId) === race.currentPlayerId);
    if (!currentPlayer) return [];
    const sv = currentPlayer.startVertex;
    const count = config.mapShape === 'hexagon' ? 6 : 4;
    return [sv, (sv + 1) % count];
  }, [race.players, race.currentPlayerId, config.mapShape]);

  const currentPlayer = race.players?.find((p) => (p._id || p.userId) === race.currentPlayerId);
  const effectiveMapConfig = useMemo(() => ({
    shape: race.mapConfig?.shape || config.mapShape || 'hexagon',
    layers: race.mapConfig?.layers || config.layers || 3,
    wallLabels: race.mapConfig?.wallLabels || config.wallLabels || [],
  }), [race.mapConfig, config.mapShape, config.layers, config.wallLabels]);

  // 派生统计
  const advanceCount = stage === 'stage2' ? 4 : stage === 'stage3' ? 2 : 0;
  const finishedCount = race.players?.filter((p) => p.finishOrder != null).length || 0;
  // 榜单排序：已完成按名次，未完成按层数
  const ranked = useMemo(() => {
    const arr = [...(race.players || [])];
    arr.sort((a, b) => {
      if (a.finishOrder != null && b.finishOrder != null) return a.finishOrder - b.finishOrder;
      if (a.finishOrder != null) return -1;
      if (b.finishOrder != null) return 1;
      return (b.currentLayer || 0) - (a.currentLayer || 0);
    });
    return arr;
  }, [race.players]);

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
            {currentPlayer && race.turnRemainingMs != null && (
              <div className={`absolute top-5 right-5 flex flex-col items-end px-5 py-3 rounded-2xl border backdrop-blur-xl pointer-events-none
                ${race.turnRemainingMs < 10000
                  ? 'bg-red-500/20 border-red-400/40'
                  : 'bg-black/55 border-white/10'}`}>
                <span className="text-sm uppercase tracking-[0.16em] text-zinc-400">本回合</span>
                <span className={`text-5xl md:text-6xl font-bold leading-none tabular-nums ${race.turnRemainingMs < 10000 ? 'text-red-300 animate-pulse' : 'text-zinc-100'}`}
                  style={{ fontFamily: 'Torus, sans-serif' }}>
                  {fmtMs(race.turnRemainingMs)}
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
              <span className="text-base text-zinc-400">坐标进度</span>
            </div>
            <div className="space-y-3">
              {ranked.map((p) => {
                const isActive = (p._id || p.userId) === race.currentPlayerId;
                const finished = p.finishOrder != null;
                return (
                  <div
                    key={p._id || p.userId}
                    className={`flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all
                      ${isActive ? 'bg-amber-500/10 border-amber-500/25'
                        : finished ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                        : 'bg-transparent border-white/[0.06]'}`}
                  >
                    {/* 名次徽章 */}
                    <span className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black tabular-nums
                      ${finished ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
                      {finished ? p.finishOrder : '–'}
                    </span>
                    {/* 名字 + 状态 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-bold text-white truncate leading-tight">{p.username}</p>
                      <p className={`text-base leading-tight mt-1 ${isActive ? 'text-amber-300' : 'text-zinc-500'}`}>
                        {finished ? '已抵达中心' : isActive ? '行动中…' : '推进中'}
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

          {/* 操作按钮区（选手视角） */}
          {isMyTurn && race.status === 'racing' && (
            <div className="space-y-2">
              <button
                onClick={handleAdvance}
                className="w-full py-3 px-4 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <FaPlay className="text-xs" /> 前进 · 挑战墙壁
              </button>
              <button
                onClick={loadMyItems}
                className="w-full py-3 px-4 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <HiOutlineCube /> 查看 / 使用道具
              </button>
            </div>
          )}

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
        {showMyItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMyItems(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'Torus, sans-serif' }}>
                道具背包
              </h3>
              {myItems.length === 0 ? (
                <p className="text-xl text-zinc-500">暂无道具</p>
              ) : (
                <div className="space-y-2">
                  {myItems.map((item) => {
                    const def = getItemDef(item.itemRef);
                    return (
                      <div key={item.itemRef} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-zinc-800/50">
                        <div>
                          <p className="text-xl text-white font-bold">{def?.name}</p>
                          <p className="text-base text-zinc-500 mt-1">{def?.effect}</p>
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
              <button
                onClick={() => setShowMyItems(false)}
                className="w-full mt-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-all"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
