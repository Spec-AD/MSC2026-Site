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
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* 顶部横幅 */}
      <div className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Torus, sans-serif' }}>
              MSC 2026
            </h1>
            {currentConfig && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {currentConfig.icon} {currentConfig.label}
              </span>
            )}
          </div>

          {/* 阶段导航 */}
          <div className="flex items-center gap-1">
            {STAGE_NAV.map((item) => {
              const state = isActive(item.key);
              const config = STAGE_CONFIG[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(`/matches/msc2026/${item.key}`)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                    ${state === 'active'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      : state === 'done'
                        ? 'bg-green-500/10 text-green-400/60 border border-green-500/20'
                        : 'bg-transparent text-zinc-600 border border-transparent'
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
        className="max-w-7xl mx-auto px-4 py-6"
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
