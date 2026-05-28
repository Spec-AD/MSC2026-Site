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

  const frameClass = 'w-[30px] h-5';

  return (
    <div className="flex items-center">
      {mods.map((mod, i) => {
        const iconPath = getModIconPath(mod);
        if (iconPath) {
          return (
            <div
              key={i}
              title={mod}
              className={`${frameClass} ${i > 0 ? '-ml-0.5' : ''} bg-[#15151e]/80 border border-white/[0.12] rounded-lg flex items-center justify-center relative shrink-0`}
              style={{ zIndex: mods.length - i }}
            >
              <img
                src={iconPath}
                alt={mod}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
              />
            </div>
          );
        }
        return (
          <span
            key={i}
            className={`${frameClass} ${i > 0 ? '-ml-0.5' : ''} bg-[#15151e]/80 border border-white/[0.12] rounded-lg flex items-center justify-center text-[9px] font-bold text-rose-400 tracking-widest shrink-0`}
            title={mod}
          >
            {mod}
          </span>
        );
      })}
    </div>
  );
}
