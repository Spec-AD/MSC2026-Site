// ============================================================
// OsuModeTabs — 紧凑图标式四模式 Tab
// ============================================================

import { MODE_LABELS } from '../../../constants/osuModes';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];
const MODE_ICONS = { standard: 'S', taiko: 'T', catch: 'C', mania: 'M' };

export default function OsuModeTabs({ activeMode, onModeChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 bg-[#15151e]/80 p-1 rounded-lg border border-white/[0.05] w-fit ${className}`}>
      {MODE_IDS.map(modeId => (
        <button
          key={modeId}
          onClick={() => onModeChange(modeId)}
          className={`
            w-8 h-8 text-xs font-bold rounded-md transition-all
            ${activeMode === modeId
              ? 'bg-pink-500/20 text-pink-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }
          `}
          title={MODE_LABELS[modeId] || modeId}
        >
          {MODE_ICONS[modeId]}
        </button>
      ))}
    </div>
  );
}
