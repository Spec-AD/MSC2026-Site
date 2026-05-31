// ============================================================
// PlayerList.jsx — MSC 2026 选手名单
// ============================================================
import { FaUser, FaCrown, FaSkull } from 'react-icons/fa';

/** 单个选手条目 */
function PlayerCard({ player, status, isWinner }) {
  const stageLabel = (() => {
    if (player.isQualifiedStage3) return '决赛选手';
    if (player.isQualifiedStage2) return '晋级·阶段三';
    if (player.isQualifiedStage1) return '晋级·阶段二';
    if (player.inStage1) return '阶段一';
    return '待安排';
  })();

  const stageColor = (() => {
    if (player.isQualifiedStage3) return 'text-amber-400';
    if (player.isQualifiedStage2) return 'text-purple-400';
    if (player.isQualifiedStage1) return 'text-green-400';
    if (player.inStage1) return 'text-blue-400';
    return 'text-zinc-500';
  })();

  const isEliminated = player.inStage1 && !player.isQualifiedStage1;
  const isFinished = player.isFinished;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
        ${isWinner
          ? 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/10'
          : isEliminated
            ? 'border-white/5 bg-zinc-800/20 opacity-50'
            : isFinished
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-white/5 bg-zinc-800/40 hover:border-white/10 hover:bg-zinc-800/60'
        }`}
    >
      {/* 头像 */}
      {player.avatarUrl ? (
        <img
          src={player.avatarUrl}
          alt={player.username}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/10"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
          <FaUser className="text-zinc-500 text-xs" />
        </div>
      )}

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white truncate">{player.username}</span>
          {isWinner && <FaCrown className="text-amber-400 text-[10px] flex-shrink-0" />}
          {isEliminated && <FaSkull className="text-zinc-600 text-[10px] flex-shrink-0" />}
        </div>
        <span className={`text-[10px] ${stageColor}`}>{stageLabel}</span>
      </div>

      {/* 阶段指示器 */}
      <div className="flex items-center gap-1">
        {['s1', 's2', 's3', 's4'].map((stage) => {
          const done = stage === 's1' ? player.isQualifiedStage1 :
                       stage === 's2' ? player.isQualifiedStage2 :
                       stage === 's3' ? player.isQualifiedStage3 :
                       player.isFinished;
          return (
            <div
              key={stage}
              className={`w-1.5 h-1.5 rounded-full ${
                done ? 'bg-green-500' : 'bg-zinc-700'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

/** 选手名单组件 */
export default function PlayerList({ players = [], status, winner }) {
  const total = players.length;
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center">
        <FaUser className="text-2xl text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">暂无选手数据</p>
        <p className="text-xs text-zinc-600 mt-1">等待管理员初始化比赛</p>
      </div>
    );
  }

  const qualified = players.filter((p) =>
    p.isQualifiedStage1 || p.isQualifiedStage2 || p.isQualifiedStage3 || p.isFinished
  ).length;
  const eliminated = players.filter((p) => p.inStage1 && !p.isQualifiedStage1).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Torus, sans-serif' }}>
          参赛选手
        </h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>共 {total} 人</span>
          {qualified > 0 && <span className="text-green-400">{qualified} 晋级</span>}
          {eliminated > 0 && <span className="text-red-400/70">{eliminated} 淘汰</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {players.map((player) => (
          <PlayerCard
            key={player.userId}
            player={player}
            status={status}
            isWinner={winner && (player.userId === winner)}
          />
        ))}
      </div>
    </div>
  );
}
