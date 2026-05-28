// ============================================================
// OsuModIcons — osu! Mod 图标渲染组件（b1.7.09）
// 基于 osu-resources/Mods/ 目录中的白色线条 PNG
// 常用 Mod 显示图标，不常用降级为文字回退
// ============================================================

const MOD_ICON_MAP = {
  DT: 'mod-double-time',
  NC: 'mod-nightcore',
  HD: 'mod-hidden',
  HR: 'mod-hard-rock',
  FL: 'mod-flashlight',
  EZ: 'mod-easy',
  NF: 'mod-no-fail',
  SO: 'mod-spun-out',
  AP: 'mod-autopilot',
  AT: 'mod-autoplay',
  PF: 'mod-perfect',
  SD: 'mod-sudden-death',
  HT: 'mod-half-time',
  RX: 'mod-relax',
  CL: 'mod-classic',
  TD: 'mod-touch-device',
};

function getModIconPath(acronym) {
  const name = MOD_ICON_MAP[acronym];
  return name ? `/osu-resources/Mods/${name}.png` : null;
}

export default function OsuModIcons({ mods = [], size = 'sm' }) {
  if (!mods || mods.length === 0) return null;

  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0">
      {mods.map((mod, i) => {
        const iconPath = getModIconPath(mod);
        if (iconPath) {
          return (
            <img
              key={i}
              src={iconPath}
              title={mod}
              alt={mod}
              className={`${sizeClass} -ml-1 first:ml-0 bg-[#15151e]/80 border border-white/[0.12] rounded p-0.5 relative inline-block`}
              style={{ zIndex: mods.length - i }}
              loading="lazy"
            />
          );
        }
        return (
          <span
            key={i}
            className="text-[9px] font-bold text-rose-400 tracking-widest bg-rose-500/10 px-1 py-0.5 rounded text-nowrap"
          >
            {mod}
          </span>
        );
      })}
    </div>
  );
}
