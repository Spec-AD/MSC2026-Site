// ============================================================
// MSC2026Layout.jsx — MSC 2026 赛事主布局
// ============================================================
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import { STAGE_CONFIG } from '../constants/publicGameData';
import { FaTrophy, FaFlag, FaPlay, FaShoppingBag, FaKeyboard } from 'react-icons/fa';
import '../styles/industrialEditorial.css';

const STAGE_NAV = [
  { key: 'stage1', icon: <FaFlag className="text-sm" /> },
  { key: 'decode', icon: <FaKeyboard className="text-sm" /> },
  { key: 'stage2', icon: <FaPlay className="text-sm" /> },
  { key: 'stage3', icon: <FaPlay className="text-sm" /> },
  { key: 'stage4', icon: <FaTrophy className="text-sm" /> },
  { key: 'store', icon: <FaShoppingBag className="text-sm" />, label: '积分商店' },
];

export default function MSC2026Layout() {
  const { status, fetchStatus } = useMSC2026Store();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatus().catch(() => {});
  }, [fetchStatus]);

  const currentConfig = STAGE_CONFIG[status] || null;
  const isActive = (key) => {
    if (key === 'store') return location.pathname.endsWith('/store') ? 'active' : 'pending';
    const stageOrder = ['stage1', 'decode', 'stage2', 'stage3', 'stage4'];
    const currentIdx = stageOrder.indexOf(status);
    const itemIdx = stageOrder.indexOf(key);
    if (currentIdx > itemIdx) return 'done';
    if (currentIdx === itemIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="preset-industrial-editorial msc-industrial">
      <span className="msc-edge-label">MSC26 / COMPETITION CONTROL / TOKYO COORD 35.6762N</span>
      {/* 顶部横幅 */}
      <div className="msc-industrial-header">
        <div className="relative mx-auto grid max-w-[1900px] gap-5 overflow-hidden px-5 py-5 md:px-8 lg:grid-cols-[minmax(300px,0.72fr)_minmax(520px,1.28fr)] lg:items-end lg:py-5">
          <div className="relative z-10">
            <p className="msc-kicker mb-3">MATCH SYSTEM CONTROL / ISSUE 026</p>
            <div className="flex items-end gap-4">
            <h1 className="msc-industrial-title text-5xl md:text-7xl">
              MSC/2026
            </h1>
            {currentConfig && (
              <span className="mb-1 border-l-2 border-amber-300 bg-amber-300/10 px-3 py-1 text-sm font-black text-amber-200 md:text-lg">
                {currentConfig.label}
              </span>
            )}
            </div>
            <div className="msc-microgrid mt-4">
              <span>SYS: ONLINE</span><span>NODE: MSC-01</span><span>REV: 2026.07</span>
            </div>
          </div>

          {/* 阶段导航 */}
          <div className="relative z-10 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-6">
            {STAGE_NAV.map((item) => {
              const state = isActive(item.key);
              const config = STAGE_CONFIG[item.key] || { label: item.label };
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(`/matches/msc2026/${item.key}`)}
                  className={`
                    flex min-h-14 items-center justify-start gap-3 bg-[#090c0f] px-4 py-3 text-base font-black transition-colors md:px-5
                    ${state === 'active'
                      ? '!bg-amber-300 text-black'
                      : state === 'done'
                        ? '!bg-sky-200/10 text-sky-200'
                        : 'text-zinc-500'
                    }
                  `}
                  title={config?.label}
                >
                  {item.icon}
                  <span>{config?.label}</span>
                </button>
              );
            })}
          </div>
          <span className="msc-industrial-anchor">26</span>
        </div>
      </div>

      {/* 内容区 */}
      <Motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 mx-auto max-w-[1900px] px-5 py-6 md:px-8 md:py-8"
      >
        <Outlet />
      </Motion.div>
    </div>
  );
}
