// ============================================================
// ItemCard.jsx — 道具卡片（拾取/使用确认）
// ============================================================
import { FaGift, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

export default function ItemCard({ item, variant = 'pickup', onUse, onDismiss }) {
  if (!item) return null;

  const def = item;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-5"
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-[#090d14] rounded-2xl p-7 md:p-9 max-w-2xl w-full shadow-2xl
          ${def.type === 'double'
            ? 'border border-pink-500/20 shadow-pink-500/5'
            : 'border border-blue-500/20 shadow-blue-500/5'
          }`}
      >
        {/* 图标 */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 border
          ${def.type === 'double'
            ? 'bg-pink-500/10 text-pink-300 border-pink-400/20'
            : 'bg-sky-500/10 text-sky-300 border-sky-400/20'
          }`}>
          <FaGift className="text-3xl" />
        </div>

        {/* 性质标签 */}
        <div className="text-center mb-1">
          <span className={`text-sm px-3 py-1 rounded-full uppercase tracking-[0.14em]
            ${def.type === 'buff' ? 'bg-sky-500/20 text-sky-300' : 'bg-pink-500/20 text-pink-300'}`}>
            {def.type === 'buff' ? '增益' : '双面'}
          </span>
        </div>

        {/* 名称 */}
        <h3 className="text-4xl md:text-5xl font-black text-white text-center mb-4" style={{ fontFamily: 'Torus, sans-serif' }}>
          {def.name}
        </h3>

        {/* 效果 */}
        <p className="text-xl text-zinc-300 text-center mb-5 leading-relaxed">
          {def.effect || def.description}
        </p>

        {/* 概率提示 */}
        {def.probability != null && (
          <p className="text-lg text-zinc-500 text-center mb-4">
            成功率: {(def.probability * 100).toFixed(0)}%
          </p>
        )}

        {/* 惩罚警告 */}
        {def.penalty && (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-red-500/10 border border-red-500/25 mb-5">
            <FaExclamationTriangle className="text-red-300 text-xl mt-1 flex-shrink-0" />
            <p className="text-lg text-red-200">{typeof def.penalty === 'string' ? def.penalty : '失败将触发双面惩罚'}</p>
          </div>
        )}

        {/* 操作按钮 */}
        {variant === 'pickup' ? (
          <div className="text-center py-4 rounded-xl bg-emerald-500/10 border border-emerald-400/25">
            <FaCheck className="text-emerald-300 inline mr-2 text-xl" />
            <span className="text-2xl font-black text-emerald-200">已拾取</span>
          </div>
        ) : variant === 'inventory' && onUse ? (
          <button
            onClick={onUse}
            className="w-full py-4 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30 transition-all text-2xl font-black"
          >
            使用道具
          </button>
        ) : null}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full mt-4 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-lg transition-all"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
