// ============================================================
// ResultPodium.jsx — 领奖台式结果展示 + 庆祝动画
// P4 组件 | 依据：API Contract §1.4 + spec §六.6.1
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournamentStore } from '../../store/tournamentStore';
import { getResults, distributeRewards } from '../../api/tournamentApi';
import {
  FaCrown, FaTrophy, FaMedal, FaStar, FaSpinner,
  FaGift, FaCheckCircle, FaExclamationTriangle,
} from 'react-icons/fa';

// ─── 粒子 / 彩屑效果 ───
const CONFETTI_COLORS = [
  '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
  '#3b82f6', '#ec4899', '#06b6d4', '#f97316',
];
const CONFETTI_COUNT = 24;

const ConfettiBurst = ({ active }) => {
  if (!active) return null;
  const pieces = useMemo(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.2 + Math.random() * 1.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 720 - 360,
      drift: Math.random() * 60 - 30,
    })), [active]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: -20, x: `${p.x}%`, scale: 0 }}
            animate={{
              opacity: [1, 0.8, 0],
              y: ['0vh', '60vh', '100vh'],
              x: [`${p.x}%`, `${p.x + p.drift / 3}%`, `${p.x + p.drift}%`],
              scale: [0, 1, 0.5],
              rotate: [0, p.rotation],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute top-0 w-2 h-3 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ─── 单个奖台卡片 ───
const PodiumCard = ({ rank, player, delay, onDistribute, distributing }) => {
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;

  const platformHeight = isGold ? 160 : isSilver ? 120 : 90;
  const platformColor = isGold
    ? 'from-yellow-500/30 via-yellow-600/20 to-yellow-900/30 border-yellow-500/30'
    : isSilver
    ? 'from-zinc-300/25 via-zinc-400/15 to-zinc-600/25 border-zinc-400/25'
    : 'from-orange-600/25 via-orange-700/15 to-orange-900/25 border-orange-600/25';
  const cardColor = isGold
    ? 'from-yellow-500/15 to-yellow-600/5 border-yellow-500/25'
    : isSilver
    ? 'from-zinc-300/10 to-zinc-400/5 border-zinc-400/15'
    : 'from-orange-600/10 to-orange-700/5 border-orange-600/15';
  const iconColor = isGold ? 'text-yellow-400' : isSilver ? 'text-zinc-300' : 'text-orange-500';
  const IconComponent = isGold ? FaCrown : isSilver ? FaTrophy : FaMedal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex flex-col items-center ${isSilver ? 'order-2' : isBronze ? 'order-1' : 'order-2'} ${isGold ? '-mt-6 z-10' : 'z-0'}`}
    >
      {/* 奖台 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.4, ease: 'backOut' }}
        className={`relative w-44 bg-gradient-to-b ${cardColor} rounded-2xl border p-4 pt-8 text-center mb-0`}
      >
        {/* 皇冠/奖牌图标 */}
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: delay + 0.4, type: 'spring', stiffness: 200 }}
          className={`absolute -top-5 left-1/2 -translate-x-1/2 text-2xl ${iconColor}`}
        >
          {isGold && (
            <motion.div
              animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
              transition={{ delay: 1, duration: 1.5, ease: 'easeInOut' }}
            >
              <FaCrown />
            </motion.div>
          )}
          {!isGold && <IconComponent />}
        </motion.div>

        {/* 排名 */}
        <div className={`text-3xl font-black mb-2 ${isGold ? 'text-yellow-400' : isSilver ? 'text-zinc-300' : 'text-orange-500'}`}>
          #{rank}
        </div>

        {/* 头像 */}
        <img
          src={player?.avatarUrl || '/assets/logos.png'}
          alt=""
          className="w-14 h-14 rounded-full object-cover bg-black border-2 mx-auto mb-2"
          style={{
            borderColor: isGold ? '#f59e0b' : isSilver ? '#a1a1aa' : '#ea580c',
          }}
        />

        {/* 用户名 */}
        <div className="text-white font-bold text-sm truncate">{player?.username || '未知'}</div>

        {/* 星星装饰 */}
        {isGold && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="mt-2 text-yellow-400/40"
          >
            <FaStar className="inline-block mx-0.5 text-[10px]" />
            <FaStar className="inline-block mx-0.5 text-xs" />
            <FaStar className="inline-block mx-0.5 text-[10px]" />
          </motion.div>
        )}
      </motion.div>

      {/* 底座 */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.5, duration: 0.4, ease: 'easeOut' }}
        className={`w-48 bg-gradient-to-t ${platformColor} border rounded-b-2xl flex items-center justify-center origin-bottom`}
        style={{ height: platformHeight }}
      >
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isGold ? 'text-yellow-400/60' : isSilver ? 'text-zinc-400/60' : 'text-orange-400/60'}`}>
          {rank === 1 ? '🏆 冠军' : rank === 2 ? '🥈 亚军' : '🥉 季军'}
        </span>
      </motion.div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════
// ResultPodium — Main Export
// ══════════════════════════════════════════════════════════════
const ResultPodium = ({ tournamentId, results = [], isManager = false }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState(null);

  // 5 秒后自动停止彩屑
  useEffect(() => {
    if (results.length > 0) {
      const t = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(t);
    }
  }, [results.length]);

  const handleDistribute = async () => {
    if (!window.confirm('确认发放所有奖励？此操作不可逆。')) return;
    setDistributing(true);
    setDistributeResult(null);
    try {
      const res = await distributeRewards(tournamentId, ['xp']);
      setDistributeResult({ success: true, data: res.data.data });
    } catch (err) {
      setDistributeResult({ success: false, msg: err.response?.data?.msg || '发放失败' });
    } finally {
      setDistributing(false);
    }
  };

  // 排序：前 3 名上 podium，其余在下方列表
  const top3 = results.filter(r => r.rank >= 1 && r.rank <= 3).sort((a, b) => a.rank - b.rank);
  const others = results.filter(r => r.rank > 3).sort((a, b) => a.rank - b.rank);

  return (
    <div className="relative">
      {/* 彩屑 */}
      <ConfettiBurst active={showConfetti} />

      {/* 报头 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">🎉 比赛结果</h2>
        <p className="text-zinc-500 text-sm">恭喜所有获奖选手</p>
      </motion.div>

      {/* 领奖台 */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 md:gap-6 mb-12 px-4">
          {/* 第 3 名 */}
          <PodiumCard
            rank={3}
            player={top3.find(r => r.rank === 3)}
            delay={0.3}
          />
          {/* 第 1 名（最高） */}
          <PodiumCard
            rank={1}
            player={top3.find(r => r.rank === 1)}
            delay={0}
          />
          {/* 第 2 名 */}
          <PodiumCard
            rank={2}
            player={top3.find(r => r.rank === 2)}
            delay={0.6}
          />
        </div>
      )}
      {/* 不足 3 人时用紧凑列表 */}
      {top3.length > 0 && top3.length < 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-xl mx-auto">
          {top3.map((r, i) => (
            <motion.div
              key={r.rank}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-center"
            >
              <div className={`text-2xl font-black mb-2 ${
                r.rank === 1 ? 'text-yellow-400' : r.rank === 2 ? 'text-zinc-300' : 'text-orange-500'
              }`}>#{r.rank}</div>
              <img src={r.userId?.avatarUrl || '/assets/logos.png'} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover bg-black border-2 border-yellow-500/30" />
              <div className="text-white font-bold">{r.userId?.username || '未知'}</div>
              {r.note && <div className="text-xs text-zinc-500 mt-1">{r.note}</div>}
            </motion.div>
          ))}
        </div>
      )}

      {/* 4名+ 排名列表 */}
      <AnimatePresence>
        {others.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto space-y-2 mb-8"
          >
            <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-3 text-center">完整排名</h4>
            {others.map((r, i) => (
              <motion.div
                key={r.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.03 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <span className="w-8 text-center text-sm font-mono text-zinc-500">#{r.rank}</span>
                <img src={r.userId?.avatarUrl || '/assets/logos.png'} alt="" className="w-8 h-8 rounded-full object-cover bg-black border border-white/10" />
                <span className="text-zinc-300 text-sm flex-1">{r.userId?.username || '未知'}</span>
                {r.note && <span className="text-[10px] text-zinc-600">{r.note}</span>}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 赛后公告 */}
      {results.length > 0 && results[0]?.announcement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="max-w-2xl mx-auto bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6"
        >
          <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">赛后公告</h4>
          <div className="text-zinc-300 text-sm whitespace-pre-wrap">{results[0].announcement}</div>
        </motion.div>
      )}

      {/* 奖励发放（ADM only） */}
      {isManager && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="max-w-md mx-auto text-center"
        >
          <button
            onClick={handleDistribute}
            disabled={distributing}
            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 mx-auto transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/20"
          >
            {distributing ? <FaSpinner className="animate-spin" /> : <FaGift />}
            {distributing ? '发放中...' : '🎁 发放奖励'}
          </button>

          <AnimatePresence>
            {distributeResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 ${
                  distributeResult.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {distributeResult.success ? (
                  <><FaCheckCircle /> 已向 {distributeResult.data.recipients} 名选手发放 {distributeResult.data.totalXp} XP</>
                ) : (
                  <><FaExclamationTriangle /> {distributeResult.msg}</>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 空状态 */}
      {results.length === 0 && (
        <div className="text-center py-20">
          <FaTrophy className="text-4xl text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">比赛结果尚未公布</p>
        </div>
      )}
    </div>
  );
};

export default ResultPodium;
