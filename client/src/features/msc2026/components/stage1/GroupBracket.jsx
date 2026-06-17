// ============================================================
// GroupBracket.jsx — 12进6 分组对阵表
// ============================================================
import { motion } from 'framer-motion';
import { FaPlay, FaCheck, FaClock, FaCrown } from 'react-icons/fa';

/** 单组卡片 */
function GroupCard({ group, isCurrent, isCompleted, onClick }) {
  const { order, p1, p2, songs, winner } = group;
  const winnerId = winner?.toString?.() || winner;
  const p1Id = (p1?._id || p1?.userId)?.toString?.() || p1?._id || p1?.userId;
  const p2Id = (p2?._id || p2?.userId)?.toString?.() || p2?._id || p2?.userId;
  const p1Won = winnerId && winnerId === p1Id;
  const p2Won = winnerId && winnerId === p2Id;
  const scoredCount = songs?.filter(s => s.p1Score && s.p2Score).length || 0;

  const statusIcon = isCompleted
    ? <FaCheck className="text-emerald-300 text-base" />
    : isCurrent
      ? <FaPlay className="text-amber-300 text-base animate-pulse" />
      : <FaClock className="text-zinc-500 text-base" />;

  const statusBg = isCompleted
    ? 'border-emerald-400/30 bg-emerald-500/[0.08]'
    : isCurrent
      ? 'border-amber-400/45 bg-amber-500/[0.08] ring-2 ring-amber-400/20 shadow-[0_0_42px_rgba(245,158,11,0.12)]'
      : 'border-white/10 bg-white/[0.035]';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full rounded-2xl border ${statusBg} p-5 md:p-6 text-left transition-all
        ${isCompleted ? 'cursor-pointer' : isCurrent ? 'cursor-pointer' : 'cursor-default'}
        ${!isCompleted && !isCurrent ? 'opacity-65' : 'opacity-100'}`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-sm px-3 py-1 rounded-lg bg-white/[0.06] text-zinc-300 font-semibold tabular-nums">
            第 {order + 1} 组
          </span>
          {statusIcon}
        </div>
        <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-300' : isCurrent ? 'text-amber-300' : 'text-zinc-500'}`}>
          {isCompleted ? '已结束' : isCurrent ? '进行中' : '待开始'}
        </span>
      </div>

      {/* P1 vs P2 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <div className={`min-w-0 flex items-center gap-3 px-4 py-4 rounded-xl border
          ${p1Won ? 'bg-emerald-500/10 border-emerald-400/35' : 'bg-black/20 border-white/10'}`}
        >
          <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-black ${p1Won ? 'bg-emerald-400/20 text-emerald-200' : 'bg-sky-400/10 text-sky-200'}`}>P1</span>
          <span className={`text-xl md:text-2xl truncate font-bold ${p1Won ? 'text-emerald-200' : 'text-white'}`}>
            {p1?.username || '—'}
          </span>
          {p1Won && <FaCrown className="ml-auto shrink-0 text-amber-300 text-lg" />}
        </div>
        <span className="self-center text-zinc-500 text-lg font-black">VS</span>
        <div className={`min-w-0 flex items-center gap-3 px-4 py-4 rounded-xl border
          ${p2Won ? 'bg-emerald-500/10 border-emerald-400/35' : 'bg-black/20 border-white/10'}`}
        >
          <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-black ${p2Won ? 'bg-emerald-400/20 text-emerald-200' : 'bg-fuchsia-400/10 text-fuchsia-200'}`}>P2</span>
          <span className={`text-xl md:text-2xl truncate font-bold ${p2Won ? 'text-emerald-200' : 'text-white'}`}>
            {p2?.username || '—'}
          </span>
          {p2Won && <FaCrown className="ml-auto shrink-0 text-amber-300 text-lg" />}
        </div>
      </div>

      {/* 歌曲进展指示器 */}
      <div className="flex items-center gap-2 mt-5">
        {[0, 1, 2].map((i) => {
          const song = songs?.[i];
          const hasScore = song?.p1Score && song?.p2Score;
          return (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-full ${hasScore ? 'bg-emerald-400' : song ? 'bg-amber-400/70' : 'bg-white/10'}`}
            />
          );
        })}
        <span className="text-base text-zinc-400 ml-2 tabular-nums font-semibold">
          {scoredCount}/3
        </span>
      </div>
    </motion.button>
  );
}

/** 分组对阵表 */
export default function GroupBracket({ groups, currentGroupIndex, completedGroups, onSelectGroup }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-16 md:p-24 text-center">
        <p className="text-zinc-300 text-3xl md:text-5xl font-bold">暂无分组数据</p>
        <p className="text-zinc-500 text-lg md:text-2xl mt-4">等待管理员初始化比赛</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 mb-2">
        <span className="text-lg md:text-2xl font-bold text-zinc-100">小组对阵</span>
        <span className="text-lg md:text-2xl text-zinc-300 tabular-nums font-bold">{completedGroups}/{groups.length} 组完成</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
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
