// ============================================================
// QualifierRanking.jsx — 预选赛排名榜 + Cut Line 可视化
// P2 组件 | 依据：Tournament_API_Contract §1.2 + spec §3.3.4
// ============================================================
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQualifierStore, selectQualifiedPlayers } from '../../store/qualifierStore';
import { FaMedal, FaSpinner, FaDownload, FaArrowRight, FaChevronUp, FaChevronDown } from 'react-icons/fa';

const RANK_COLORS = {
  1: 'from-yellow-500/20 to-transparent border-yellow-500/30 text-yellow-400',
  2: 'from-zinc-400/15 to-transparent border-zinc-400/25 text-zinc-300',
  3: 'from-orange-700/15 to-transparent border-orange-700/25 text-orange-400',
};

const QualifierRanking = ({ tournamentId, advanceCount, isManager = false, onAdvance }) => {
  const {
    rankings, cutoff, cutoffScore, loading, error,
    fetchRankings, advance, exportCSV,
  } = useQualifierStore();

  const [advancing, setAdvancing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [prevRanks, setPrevRanks] = useState({});

  useEffect(() => {
    if (tournamentId) {
      fetchRankings(tournamentId, advanceCount);
    }
  }, [tournamentId, advanceCount]);

  // 追踪排名变化（供动画 highlight 用）
  useEffect(() => {
    const newPrev = {};
    rankings.forEach(r => { newPrev[r.userId] = r.rank; });
    setPrevRanks(newPrev);
  }, [rankings]);

  const handleAdvance = async () => {
    if (!window.confirm(`确认将排名前 ${cutoff} 名选手晋级正赛？`)) return;
    setAdvancing(true);
    try {
      await advance(tournamentId);
      onAdvance?.();
    } catch (err) {
      console.error('晋级推进失败', err);
    } finally {
      setAdvancing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCSV(tournamentId);
    } catch (err) {
      console.error('导出失败', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FaSpinner className="animate-spin text-3xl text-purple-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center py-8 text-sm">{error}</div>;
  }

  const qualifiedCount = rankings.filter(r => r.rank <= cutoff).length;

  return (
    <div className="space-y-4">
      {/* 头部信息栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FaMedal className="text-purple-400 text-lg" />
          <div>
            <h3 className="text-white font-bold">预选排名</h3>
            <p className="text-xs text-zinc-500">
              {rankings.length} 位选手 · 晋级线 {cutoff} 名 · 线上分数 {cutoffScore?.toFixed(2) ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <>
              <button
                onClick={handleExport}
                disabled={exporting || rankings.length === 0}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload />} 导出 CSV
              </button>
              <button
                onClick={handleAdvance}
                disabled={advancing || qualifiedCount === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {advancing ? <FaSpinner className="animate-spin" /> : <FaArrowRight />}
                确认晋级 ({qualifiedCount} 人)
              </button>
            </>
          )}
        </div>
      </div>

      {/* 排名列表 */}
      {rankings.length === 0 ? (
        <div className="text-zinc-500 text-center py-12 text-sm">暂无预选成绩数据</div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {rankings.map((player, idx) => {
              const isQualified = player.rank <= cutoff;
              const isCutLine = player.rank === cutoff;
              const isFirstEliminated = player.rank === cutoff + 1;
              const rankColor = RANK_COLORS[player.rank] || '';

              return (
                <div key={player.userId}>
                  {/* Cut Line 分隔线 */}
                  {isFirstEliminated && cutoff > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      className="flex items-center gap-3 my-4"
                    >
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 whitespace-nowrap px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                        ── 晋级线 ──
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                    </motion.div>
                  )}

                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border bg-gradient-to-r transition-all ${
                      isQualified
                        ? (rankColor || 'from-purple-500/10 to-transparent border-purple-500/20')
                        : 'from-transparent to-transparent border-white/[0.04] opacity-60'
                    }`}
                  >
                    {/* 名次 */}
                    <div className={`w-9 h-9 flex items-center justify-center rounded-lg font-black text-sm flex-shrink-0 ${
                      player.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      player.rank === 2 ? 'bg-zinc-400/15 text-zinc-300 border border-zinc-400/20' :
                      player.rank === 3 ? 'bg-orange-700/15 text-orange-400 border border-orange-700/20' :
                      isQualified ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15' :
                      'bg-white/[0.03] text-zinc-500 border border-white/[0.05]'
                    }`}>
                      #{player.rank}
                    </div>

                    {/* 头像 + 用户名 */}
                    <img
                      src={player.avatarUrl || '/assets/logos.png'}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover bg-black border border-white/10 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate">{player.username}</div>
                      <div className="text-[10px] text-zinc-500">{player.scoreCount} 曲已录入</div>
                    </div>

                    {/* 总分 */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-lg font-black font-mono ${isQualified ? 'text-white' : 'text-zinc-500'}`}>
                        {player.total?.toFixed(4) ?? '—'}
                      </div>
                      {isQualified && (
                        <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">晋级</div>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default QualifierRanking;
