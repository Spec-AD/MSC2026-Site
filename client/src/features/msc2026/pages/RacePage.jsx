// ============================================================
// RacePage.jsx — 跑图阶段页面（阶段二 & 三 共用）
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRaceStore } from '../store';
import { useMSCSSE } from '../hooks/useSSE';
import { STAGE_CONFIG, getItemDef } from '../constants/gameData';
import PolygonMap from '../components/race/PolygonMap';
import ChallengeCard from '../components/race/ChallengeCard';
import ItemCard from '../components/race/ItemCard';
import { FaPlay, FaSync, FaClock } from 'react-icons/fa';
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

  // 初始加载
  useEffect(() => {
    race.fetchRaceState().catch(() => {});
  }, [stage, race]);

  // SSE 实时同步
  useMSCSSE({
    turn_change: useCallback((data) => race.sseTurnChange(data), [race]),
    turn_timeout: useCallback((data) => race.sseTurnTimeout(data), [race]),
    player_moved: useCallback((data) => race.ssePlayerMoved(data), [race]),
    timer_tick: useCallback((data) => race.sseTimerTick(data), [race]),
    item_collected: useCallback(() => race.fetchRaceMap(), [race]),
    item_used: useCallback(() => race.fetchRaceMap(), [race]),
    challenge_revealed: useCallback(() => race.fetchChallenge(), [race]),
    challenge_resolved: useCallback(() => {
      race.dismissChallenge();
      race.fetchRaceMap();
    }, [race]),
    wall_broken: useCallback(() => race.fetchRaceMap(), [race]),
    player_bounced: useCallback(() => race.fetchRaceMap(), [race]),
    match_finished: useCallback(() => race.fetchRaceState(), [race]),
    map_timeout: useCallback(() => race.fetchRaceState(), [race]),
  }, { enabled: true });

  // 地图数据 15s 轮询作为 SSE 兜底
  useEffect(() => {
    const interval = setInterval(() => race.fetchRaceMap().catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, [race]);

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

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* 地图区 */}
      <div className="flex-1 flex flex-col items-center">
        {/* 总时间倒计时 */}
        <div className={`text-lg font-mono font-bold mb-2 ${
          (race.totalRemainingMs != null && race.totalRemainingMs < 300000) ? 'text-red-400 animate-pulse' : 'text-zinc-300'
        }`}>
          <FaClock className="inline text-xs mr-1.5 -mt-0.5" />
          {fmtMs(race.totalRemainingMs)}
        </div>

        <div className="relative">
          <PolygonMap
            config={race.mapConfig}
            players={race.players}
            itemsOnMap={race.itemsOnMap}
            wallsBroken={race.wallsBroken}
            activePlayerId={race.currentPlayerId}
            highlightSectors={adjacentSectors}
            onSectorClick={handlePickup}
            width={520}
            height={520}
          />

          {/* 回合倒计时覆盖在行动选手旁 */}
          {currentPlayer && race.turnRemainingMs != null && (
            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full font-mono text-sm font-bold border
              ${race.turnRemainingMs < 10000
                ? 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-zinc-800/80 border-white/10 text-zinc-300'
              }`}>
              ⏱ {fmtMs(race.turnRemainingMs)}
            </div>
          )}
        </div>
      </div>

      {/* 右侧面板 */}
      <div className="w-full lg:w-72 space-y-3">
        {/* 选手排名 */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">选手</h3>
          <div className="space-y-1.5">
            {race.players?.map((p) => {
              const isActive = (p._id || p.userId) === race.currentPlayerId;
              return (
                <div
                  key={p._id || p.userId}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all
                    ${isActive ? 'bg-amber-500/10 border border-amber-500/20' : 'border border-transparent'}
                    ${p.status === 'finished' ? 'bg-green-500/5 border-green-500/20' : ''}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${p.finishOrder ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {p.finishOrder || '-'}
                  </span>
                  <span className="flex-1 truncate text-white text-xs">{p.username}</span>
                  <span className="text-zinc-600 text-[10px]">L{p.currentLayer}</span>
                  {p.itemCount > 0 && (
                    <span className="text-blue-400 text-[10px]">{p.itemCount}🎒</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 行动日志 */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 max-h-48 overflow-y-auto">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">行动日志</h3>
          <div className="space-y-1">
            {race.actionLog?.slice(-8).map((log, i) => (
              <div key={i} className="text-[10px] text-zinc-500 leading-relaxed">
                <span className="text-zinc-600">#{log.turn}</span>{' '}
                {log.actionType === 'advance' && '⚔️ 挑战墙壁'}
                {log.actionType === 'pickup' && '🎒 拾取道具'}
                {log.actionType === 'use_item' && '✨ 使用道具'}
                {log.actionType === 'skip_timeout' && '⏰ 超时跳过'}
              </div>
            ))}
            {(!race.actionLog || race.actionLog.length === 0) && (
              <p className="text-[10px] text-zinc-600">等待开始...</p>
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
              <FaPlay className="text-xs" /> 前进攻挑战墙壁
            </button>
            <button
              onClick={loadMyItems}
              className="w-full py-3 px-4 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <HiOutlineCube /> 查看/使用道具
            </button>
          </div>
        )}

        {/* 刷新 */}
        <button
          onClick={() => race.fetchRaceState()}
          className="w-full py-2 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all text-xs flex items-center justify-center gap-1"
        >
          <FaSync className={race.loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      {/* 挑战弹窗 */}
      <AnimatePresence>
        {race.activeChallenge && (
          <ChallengeCard
            challenge={race.activeChallenge}
            pendingJudgement={race.pendingJudgement}
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
                <p className="text-xs text-zinc-500">暂无道具</p>
              ) : (
                <div className="space-y-2">
                  {myItems.map((item) => {
                    const def = getItemDef(item.itemRef);
                    return (
                      <div key={item.itemRef} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-zinc-800/50">
                        <div>
                          <p className="text-sm text-white font-medium">{def?.name}</p>
                          <p className="text-[10px] text-zinc-500">{def?.effect}</p>
                        </div>
                        {!item.used && (
                          <button
                            onClick={() => handleUseItem(item.itemRef)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                          >
                            使用
                          </button>
                        )}
                        {item.used && (
                          <span className="text-[10px] text-zinc-600">已使用</span>
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
