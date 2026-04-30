// ============================================================
// OsuHeader — osu! 模块模式信息头 + 玩家概况
// ============================================================

import { FaArrowLeft, FaUser, FaGamepad } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function OsuHeader({ profile, isOwnProfile, onBind }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-white/[0.05] pb-6">
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate(`/profile/${profile.username}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95"
        >
          <FaArrowLeft /> 返回主页
        </button>

        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
              <FaGamepad className="text-pink-500 text-xl md:text-2xl" /> osu!
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <FaUser className="text-zinc-600 text-xs" />
              <span className="text-sm font-medium text-zinc-400">
                {profile.osuUsername || profile.username}
              </span>
              {profile.osuId && (
                <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                  已绑定
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 绑定按钮（仅自己） */}
      {isOwnProfile && !profile.osuId && (
        <button
          onClick={onBind}
          className="w-full md:w-auto bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 text-xs font-bold transition-all active:scale-95 rounded-lg"
        >
          绑定 osu! 账号
        </button>
      )}
    </div>
  );
}
