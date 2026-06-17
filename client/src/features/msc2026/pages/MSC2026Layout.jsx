// ============================================================
// MSC2026Layout.jsx — MSC 2026 赛事主布局
// ============================================================
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMSC2026Store } from '../store';
import { STAGE_CONFIG } from '../constants/gameData';
import { FaTrophy, FaFlag, FaPlay } from 'react-icons/fa';

const STAGE_NAV = [
  { key: 'stage1', icon: <FaFlag className="text-sm" /> },
  { key: 'stage2', icon: <FaPlay className="text-sm" /> },
  { key: 'stage3', icon: <FaPlay className="text-sm" /> },
  { key: 'stage4', icon: <FaTrophy className="text-sm" /> },
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
    const stageOrder = ['stage1', 'stage2', 'stage3', 'stage4'];
    const currentIdx = stageOrder.indexOf(status);
    const itemIdx = stageOrder.indexOf(key);
    if (currentIdx > itemIdx) return 'done';
    if (currentIdx === itemIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(245,158,11,0.13),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.74),rgba(3,7,18,0.98))]" />
      {/* 顶部横幅 */}
      <div className="border-b border-white/10 bg-[#080b12]/88 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-5 md:px-8 py-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
              MSC 2026
            </h1>
            {currentConfig && (
              <span className="text-sm md:text-lg px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35">
                {currentConfig.icon} {currentConfig.label}
              </span>
            )}
          </div>

          {/* 阶段导航 */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            {STAGE_NAV.map((item) => {
              const state = isActive(item.key);
              const config = STAGE_CONFIG[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(`/matches/msc2026/${item.key}`)}
                  className={`
                    flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm md:text-base font-semibold transition-all duration-200
                    ${state === 'active'
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-400/45 shadow-[0_0_24px_rgba(245,158,11,0.16)]'
                      : state === 'done'
                        ? 'bg-emerald-500/10 text-emerald-300/80 border border-emerald-400/20'
                        : 'bg-white/[0.03] text-zinc-500 border border-white/10'
                    }
                  `}
                  title={config?.label}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{config?.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 max-w-[1800px] mx-auto px-5 md:px-8 py-6 md:py-8"
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
