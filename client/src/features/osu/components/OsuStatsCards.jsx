// ============================================================
// OsuStatsCards — 紧凑 2×2 统计卡片
// 自动处理 未同步/无名次/已加载 三态
// ============================================================

import { FaSpinner, FaLock, FaGlobe, FaMapMarkerAlt, FaPlay } from 'react-icons/fa';

export default function OsuStatsCards({ modeStats, statsDisplay }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <StatCard
        icon={<FaGlobe />}
        label="全球排名"
        value={statsDisplay === 'loaded' ? `#${modeStats?.rank?.toLocaleString()}` : null}
        emptyState={statsDisplay}
      />
      <StatCard
        icon={<FaMapMarkerAlt />}
        label="地区排名"
        value={statsDisplay === 'loaded' ? `#${modeStats?.countryRank?.toLocaleString()}` : null}
        emptyState={statsDisplay}
      />
      <StatCard
        label="Performance"
        value={statsDisplay === 'loaded' ? `${Math.round(modeStats?.pp || 0).toLocaleString()} pp` : null}
        emptyState={statsDisplay}
        accent
      />
      <StatCard
        icon={<FaPlay />}
        label="游玩次数"
        value={statsDisplay === 'loaded' ? modeStats?.playCount?.toLocaleString() : null}
        emptyState={statsDisplay}
      />
    </div>
  );
}

function StatCard({ icon, label, value, emptyState, accent = false }) {
  const emptyContent = {
    unsynced: { icon: <FaSpinner className="animate-spin text-zinc-600" />, text: '未同步' },
    norank: { icon: <FaLock className="text-zinc-600" />, text: '无名次' },
  };

  const isEmpty = emptyState && emptyState !== 'loaded';

  return (
    <div className="bg-[#15151e] border border-white/[0.05] rounded-lg p-4 flex flex-col justify-center">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
        {icon} {label}
      </span>
      {isEmpty ? (
        <div className="flex items-center gap-2 text-zinc-600 text-sm">
          {emptyContent[emptyState]?.icon}
          <span>{emptyContent[emptyState]?.text}</span>
        </div>
      ) : (
        <span className={`text-xl font-bold ${accent ? 'text-pink-400' : 'text-zinc-100'}`}>
          {value || '-'}
        </span>
      )}
    </div>
  );
}
