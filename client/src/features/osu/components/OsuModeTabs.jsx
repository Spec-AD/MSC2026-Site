// ============================================================
// OsuModeTabs — 图标+完整文字四模式 Tab
// Ruleset 图标位于 /osu-resources/
// ============================================================

import { MODE_LABELS } from '../../../constants/osuModes';

const MODE_IDS = ['standard', 'taiko', 'catch', 'mania'];
const MODE_ICON_MAP = {
  standard: '/osu-resources/RulesetOsu.png',
  taiko: '/osu-resources/RulesetTaiko.png',
  catch: '/osu-resources/RulesetCatch.png',
  mania: '/osu-resources/RulesetMania.png',
};
const MODE_NAMES = {
  standard: 'Standard',
  taiko: 'Taiko',
  catch: 'Catch',
  mania: 'Mania',
};

export default function OsuModeTabs({ activeMode, onModeChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 bg-[#15151e]/80 p-1 rounded-lg border border-white/[0.05] w-fit ${className}`}>
      {MODE_IDS.map(modeId => (
        <button
          key={modeId}
          onClick={() => onModeChange(modeId)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap
            ${activeMode === modeId
              ? 'bg-pink-500/20 text-pink-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }
          `}
        >
          <img
            src={MODE_ICON_MAP[modeId]}
            alt={MODE_NAMES[modeId]}
            className="w-5 h-5 object-contain shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {MODE_NAMES[modeId]}
        </button>
      ))}
    </div>
  );
}
