// ============================================================
// GroupBracket.jsx — 12进6 分组对阵表
// ============================================================
import { motion } from 'framer-motion';
import { FaPlay, FaCheck, FaClock, FaCrown } from 'react-icons/fa';

/** 单组卡片 */
function GroupCard({ group, isCurrent, isCompleted, onClick }) {
  const { order, p1, p2, songs, winner } = group;

  const statusIcon = isCompleted
    ? <FaCheck className="text-green-400 text-xs" />
    : isCurrent
      ? <FaPlay className="text-amber-400 text-xs animate-pulse" />
      : <FaClock className="text-zinc-600 text-xs" />;

  const statusBg = isCompleted
    ? 'border-green-500/20 bg-green-500/5'
    : isCurrent
      ? 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20'
      : 'border-white/10 bg-zinc-900/30';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full rounded-xl border ${statusBg} p-4 text-left transition-all
        ${isCompleted ? 'cursor-pointer' : isCurrent ? 'cursor-pointer' : 'cursor-default'}
        ${!isCompleted && !isCurrent ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
            #{order + 1}
          </span>
          {statusIcon}
        </div>
        {winner && <FaCrown className="text-amber-400 text-xs" />}
      </div>

      {/* P1 vs P2 */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg
          ${winner && winner === (p1?._id || p1?.userId) ? 'bg-green-500/10 border border-green-500/20' : 'bg-zinc-800/50'}`}
        >
          <span className="text-[10px] text-zinc-500 font-mono">P1</span>
          <span className={`text-sm truncate font-medium ${winner && winner === p1?.userId ? 'text-green-300' : 'text-white'}`}>
            {p1?.username || '—'}
          </span>
        </div>
        <span className="text-zinc-600 text-xs font-bold">VS</span>
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg
          ${winner && winner === (p2?._id || p2?.userId) ? 'bg-green-500/10 border border-green-500/20' : 'bg-zinc-800/50'}`}
        >
          <span className="text-[10px] text-zinc-500 font-mono">P2</span>
          <span className={`text-sm truncate font-medium ${winner && winner === p2?.userId ? 'text-green-300' : 'text-white'}`}>
            {p2?.username || '—'}
          </span>
        </div>
      </div>

      {/* 歌曲进展指示器 */}
      <div className="flex items-center gap-1.5 mt-3">
        {[0, 1, 2].map((i) => {
          const song = songs?.[i];
          const hasScore = song?.p1Score && song?.p2Score;
          return (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${hasScore ? 'bg-green-500' : song ? 'bg-amber-500/50' : 'bg-zinc-700'}`}
            />
          );
        })}
        <span className="text-[10px] text-zinc-600 ml-1">
          {songs?.filter(s => s.p1Score && s.p2Score).length || 0}/3
        </span>
      </div>
    </motion.button>
  );
}

/** 分组对阵表 */
export default function GroupBracket({ groups, currentGroupIndex, completedGroups, onSelectGroup }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-12 text-center">
        <p className="text-zinc-500 text-sm">暂无分组数据</p>
        <p className="text-zinc-600 text-xs mt-1">等待管理员初始化比赛</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">对阵表</span>
        <span className="text-xs text-zinc-600">{completedGroups}/{groups.length} 组完成</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups
          .sort((a, b) => a.order - b.order)
          .map((group) => (
            <GroupCard
              key={group.groupId}
              group={group}
              isCurrent={group.order === currentGroupIndex}
              isCompleted={group.status === 'done'}
              onClick={() => onSelectGroup(group.groupId)}
            />
          ))}
      </div>
    </div>
  );
}
