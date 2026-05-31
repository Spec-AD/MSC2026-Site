// ============================================================
// ItemCard.jsx — 道具卡片（拾取/使用确认）
// ============================================================
import { motion } from 'framer-motion';
import { FaGift, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

export default function ItemCard({ item, variant = 'pickup', onUse, onDismiss }) {
  if (!item) return null;

  const def = item;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl
          ${def.type === 'double'
            ? 'border border-pink-500/20 shadow-pink-500/5'
            : 'border border-blue-500/20 shadow-blue-500/5'
          }`}
      >
        {/* 图标 */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3
          ${def.type === 'double'
            ? 'bg-pink-500/10 text-pink-400'
            : 'bg-blue-500/10 text-blue-400'
          }`}>
          <FaGift className="text-xl" />
        </div>

        {/* 性质标签 */}
        <div className="text-center mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full
            ${def.type === 'buff' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
            {def.type === 'buff' ? '增益' : '双面'}
          </span>
        </div>

        {/* 名称 */}
        <h3 className="text-lg font-bold text-white text-center mb-2" style={{ fontFamily: 'Torus, sans-serif' }}>
          {def.name}
        </h3>

        {/* 效果 */}
        <p className="text-sm text-zinc-400 text-center mb-3 leading-relaxed">
          {def.effect}
        </p>

        {/* 概率提示 */}
        {def.probability != null && (
          <p className="text-xs text-zinc-600 text-center mb-2">
            成功率: {(def.probability * 100).toFixed(0)}%
          </p>
        )}

        {/* 惩罚警告 */}
        {def.penalty && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
            <FaExclamationTriangle className="text-red-400 text-xs mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-400/80">{def.penalty}</p>
          </div>
        )}

        {/* 操作按钮 */}
        {variant === 'pickup' ? (
          <div className="text-center py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <FaCheck className="text-green-400 inline mr-1" />
            <span className="text-sm text-green-300">已拾取</span>
          </div>
        ) : variant === 'inventory' && onUse ? (
          <button
            onClick={onUse}
            className="w-full py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all text-sm font-medium"
          >
            使用道具
          </button>
        ) : null}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full mt-3 py-2 rounded-xl border border-white/10 text-zinc-500 hover:text-white text-sm transition-all"
          >
            关闭
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
