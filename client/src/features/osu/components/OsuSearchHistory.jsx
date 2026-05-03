// ============================================================
// OsuSearchHistory — 搜索历史通用组件
// 支持 BID 历史（曲绘+曲名+难度+模式）和玩家历史（头像+名+国旗+ID）
// ============================================================

import { FaHistory, FaTrash } from 'react-icons/fa';

/**
 * @param {Object} props
 * @param {Array} props.items - 历史条目数组
 * @param {'bid'|'player'} props.type - 类型
 * @param {(entry: Object) => void} props.onSelect - 点击回调
 * @param {() => void} props.onClear - 清除回调
 */
export default function OsuSearchHistory({ items, type, onSelect, onClear }) {
  if (!items?.length) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider flex items-center gap-1">
          <FaHistory className="text-[9px]" /> 搜索历史
        </span>
        {onClear && (
          <button onClick={onClear} className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors flex items-center gap-1">
            <FaTrash className="text-[8px]" /> 清除
          </button>
        )}
      </div>
      <div className="space-y-1">
        {items.map((entry, idx) => (
          <button
            key={type === 'bid' ? entry.bid : entry.username}
            onClick={() => onSelect(entry)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#15151e]/40 hover:bg-[#15151e]/70 border border-transparent hover:border-white/[0.06] transition-all text-left group"
          >
            {type === 'bid' ? (
              <>
                {/* 曲绘 */}
                <div className="w-10 h-7 shrink-0 rounded overflow-hidden bg-zinc-800">
                  {entry.coverUrl ? (
                    <img src={entry.coverUrl} alt="" className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : null}
                </div>
                {/* 曲名 + 难度 */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-300 truncate">{entry.title}</div>
                  <div className="text-[9px] text-zinc-600 truncate">{entry.version}</div>
                </div>
                {/* 模式 PNG */}
                {entry.modeIcon && (
                  <img src={entry.modeIcon} alt="" className="w-4 h-4 shrink-0 opacity-60" />
                )}
              </>
            ) : (
              <>
                {/* 头像 */}
                <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden bg-zinc-800">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full bg-zinc-700" />
                  )}
                </div>
                {/* 用户名 */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-300 truncate">{entry.username}</div>
                  <div className="text-[9px] text-zinc-600">ID: {entry.osuId || '—'}</div>
                </div>
                {/* 国旗 */}
                {entry.countryCode && (
                  <img src={`/osu-resources/Flags/${entry.countryCode}.png`} alt=""
                    className="w-4 h-3 shrink-0 rounded-sm opacity-70"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                )}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
