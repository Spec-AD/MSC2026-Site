// ============================================================
// MatchDetail.jsx — 单场比赛详情 Popover
// P3 组件 | 依据：Tournament_API_Contract §1.3 + spec §六.6.1
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaExclamationTriangle, FaClock, FaTimes } from 'react-icons/fa';

const STATUS_CONFIG = {
  PENDING: { label: '待开始', color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
  ONGOING: { label: '进行中', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  FINISHED: { label: '已结束', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const MatchDetail = ({ match, visible, onClose }) => {
  if (!match) return null;

  const statusCfg = STATUS_CONFIG[match.status] || STATUS_CONFIG.PENDING;
  const isFinished = match.status === 'FINISHED';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 w-80 bg-[#1a1a26] border border-white/[0.12] rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                {match.roundName || match.round}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <FaTimes size={12} />
            </button>
          </div>

          {/* Players */}
          <div className="px-4 py-3 space-y-3">
            <PlayerRow
              name={match.playerA?.username || match.playerA || '待定'}
              avatar={match.playerA?.avatarUrl}
              score={match.scoreA}
              isWinner={isFinished && (match.winner === match.playerA?._id || match.winner === match.playerA?.username)}
            />
            <div className="text-center text-[10px] text-zinc-600 font-bold uppercase">VS</div>
            <PlayerRow
              name={match.playerB?.username || match.playerB || '待定'}
              avatar={match.playerB?.avatarUrl}
              score={match.scoreB}
              isWinner={isFinished && (match.winner === match.playerB?._id || match.winner === match.playerB?.username)}
            />
          </div>

          {/* Songs / 小分 */}
          {match.songs && match.songs.length > 0 && (
            <div className="px-4 pb-3 space-y-1.5">
              <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">小分</div>
              {match.songs.map((song, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-white/[0.03]">
                  <span className="text-zinc-300 truncate flex-1">{song.songName}</span>
                  <span className="font-mono text-zinc-400 w-16 text-right">{song.scoreA} — {song.scoreB}</span>
                </div>
              ))}
            </div>
          )}

          {/* Forfeit */}
          {match.forfeited && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-red-400 px-2 py-1.5 rounded-lg bg-red-500/10">
                <FaExclamationTriangle size={10} />
                <span>弃权{match.forfeitReason ? `: ${match.forfeitReason}` : ''}</span>
              </div>
            </div>
          )}

          {/* Schedule */}
          {match.scheduledAt && (
            <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-zinc-500">
              <FaClock size={10} />
              <span>{new Date(match.scheduledAt).toLocaleString('zh-CN')}</span>
            </div>
          )}

          {/* Match ID footer */}
          <div className="px-4 py-2 bg-black/30 text-[9px] text-zinc-700 font-mono">
            #{match.bracketPosition} · nextMatchIndex: {match.nextMatchIndex ?? '—'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PlayerRow = ({ name, avatar, score, isWinner }) => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <img
        src={avatar || '/assets/logos.png'}
        alt=""
        className="w-8 h-8 rounded-full object-cover bg-black border border-white/10"
      />
      {isWinner && (
        <FaTrophy className="absolute -top-1 -right-1 text-yellow-400 text-[10px]" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className={`text-sm font-bold truncate ${isWinner ? 'text-emerald-400' : 'text-zinc-200'}`}>
        {name}
        {isWinner && <span className="ml-1.5 text-[10px] text-emerald-400/70">WINNER</span>}
      </div>
    </div>
    <div className={`text-lg font-black font-mono ${isWinner ? 'text-emerald-400' : 'text-zinc-400'}`}>
      {score ?? '—'}
    </div>
  </div>
);

export default MatchDetail;
