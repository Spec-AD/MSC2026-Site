// ============================================================
// OsuModIcons — osu! Mod 图标渲染组件（b1.7.09）
// 基于 osu-resources/Mods/ 目录中的白色线条 PNG
// 常用 Mod 显示图标，不常用降级为文字回退
// 自定义 tooltip 使用 Torus 字体，显示模组全名
// ============================================================

import { useState, useRef, useCallback } from 'react';

const MOD_FULL_NAMES = {
  DT: 'Double Time',
  NC: 'Nightcore',
  HD: 'Hidden',
  HR: 'Hard Rock',
  FL: 'Flashlight',
  EZ: 'Easy',
  NF: 'No Fail',
  SO: 'Spun Out',
  AP: 'Autopilot',
  AT: 'Autoplay',
  PF: 'Perfect',
  SD: 'Sudden Death',
  HT: 'Half Time',
  RX: 'Relax',
  CL: 'Classic',
  TD: 'Touch Device',
};

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

export default function OsuModIcons({ mods = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const handleMouseEnter = useCallback((mod, e) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTooltip({ mod, x: e.clientX, y: e.clientY });
    }, 300);
  }, []);

  const handleMouseMove = useCallback((mod, e) => {
    if (tooltip?.mod === mod) {
      setTooltip({ mod, x: e.clientX, y: e.clientY });
    }
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setTooltip(null);
  }, []);

  if (!mods || mods.length === 0) return null;

  const frameClass = 'w-[30px] h-5';

  return (
    <div ref={containerRef} className="flex items-center relative">
      {mods.map((mod, i) => {
        const iconPath = getModIconPath(mod);
        const fullName = MOD_FULL_NAMES[mod] || mod;
        if (iconPath) {
          return (
            <div
              key={i}
              className={`${frameClass} ${i > 0 ? '-ml-0.5' : ''} bg-[#15151e]/80 border border-white/[0.12] rounded-lg flex items-center justify-center relative shrink-0`}
              style={{ zIndex: mods.length - i }}
              onMouseEnter={(e) => handleMouseEnter(mod, e)}
              onMouseMove={(e) => handleMouseMove(mod, e)}
              onMouseLeave={handleMouseLeave}
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
            style={{ zIndex: mods.length - i }}
            onMouseEnter={(e) => handleMouseEnter(mod, e)}
            onMouseMove={(e) => handleMouseMove(mod, e)}
            onMouseLeave={handleMouseLeave}
          >
            {mod}
          </span>
        );
      })}

      {tooltip && (
        <div
          className="fixed z-[9999] px-2.5 py-1.5 text-xs font-semibold text-zinc-200 bg-[#1a1a24]/95 border border-white/[0.08] rounded-lg pointer-events-none whitespace-nowrap shadow-lg font-osu"
          style={{
            left: tooltip.x,
            top: tooltip.y - 32,
            transform: 'translateX(-50%)',
          }}
        >
          {MOD_FULL_NAMES[tooltip.mod] || tooltip.mod}
        </div>
      )}
    </div>
  );
}
