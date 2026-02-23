import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCamera, FaUserPlus, FaUserEdit, FaTrophy, FaUsers, FaMedal } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth(); // 获取当前登录用户（用于判断是否看的是自己的主页）
  
  // ==========================================
  // 🚧 Mock 数据区 (开发前期占位，后期替换为 API 请求)
  // ==========================================
  const mockProfileData = {
    uid: "10025", // 唯一的数字ID
    username: "天冉",
    avatarUrl: "/assets/logos.png", // 临时拿 logo 顶替一下头像
    bannerUrl: "/assets/bg.png",    // 临时拿全站背景顶替一下 Banner
    bio: "这里是个人介绍。\n\n[b]MSC 2026 参赛选手[/b]\n坐标泗洪，目前正在努力练习 14 级曲目，希望能打进决赛！\n\n[color=#60a5fa]Let's Climb the Tower together.[/color]",
    friendsCount: 12,
    topScores: [
      { id: 1, song: "PANDORA PARADOXXX", artist: "Gram", achievement: 100.8500, dxScore: 2450, rank: "SS+" },
      { id: 2, song: "Ultra Synergy Matrix", artist: "t+pazolite", achievement: 100.5000, dxScore: 2410, rank: "SS" },
      { id: 3, song: "Oshama Scramble!", artist: "t+pazolite", achievement: 99.8000, dxScore: 2300, rank: "S+" },
      { id: 4, song: "QZKago Requiem", artist: "t+pazolite", achievement: 99.5000, dxScore: 2200, rank: "S" },
      { id: 5, song: "Grievous Lady", artist: "Team Grimoire vs Laur", achievement: 98.0000, dxScore: 2100, rank: "AAA" }
    ],
    friends: [
      { id: 1, username: "Player_A", avatarUrl: "/assets/logos.png" },
      { id: 2, username: "Player_B", avatarUrl: "/assets/logos.png" },
      { id: 3, username: "Player_C", avatarUrl: "/assets/logos.png" },
    ]
  };

  // 假设当前正在查看的就是这个 Mock 用户
  const profile = mockProfileData;
  // 判断当前查看的主页是不是登录者本人的
  const isOwnProfile = user?.username === profile.username; 

  // ==========================================
  // 🎨 简易 BBCode 渲染器 (后期可替换为专业库)
  // ==========================================
  const renderBBCode = (text) => {
    if (!text) return null;
    let html = text
      .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
      .replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="w-full min-h-screen pb-24 overflow-x-hidden text-white relative">
      
      {/* --- 1. Banner 英雄图区域 --- */}
      <div className="relative h-[25vh] md:h-[35vh] w-full overflow-hidden bg-gray-900">
        <img 
          src={profile.bannerUrl} 
          alt="Profile Banner" 
          className="w-full h-full object-cover opacity-60"
        />
        {/* 底部渐变黑影，让头像和名字更清晰 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        {/* 自己的主页才显示更换 Banner 的提示 */}
        {isOwnProfile && (
           <button className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/50 hover:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white border border-white/20 transition-all flex items-center gap-2">
             <FaCamera /> 更换封面
           </button>
        )}
      </div>

      {/* --- 2. 用户身份信息区 (Identity Bar) --- */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 md:-mt-20 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 text-center md:text-left">
          
          {/* 头像 */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-2xl md:rounded-3xl overflow-hidden border-4 border-black bg-gray-900 shadow-2xl relative">
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
                  <FaCamera className="text-2xl mb-1 text-white" />
                  <span className="text-[10px] uppercase tracking-widest text-white">Upload</span>
                </div>
              )}
            </div>
          </div>

          {/* 名字与 UID */}
          <div className="flex-1 pb-2 md:pb-4">
            <h1 className="text-3xl md:text-5xl font-black drop-shadow-lg">{profile.username}</h1>
            <div className="mt-1 md:mt-2 text-blue-400 font-mono text-sm md:text-base font-bold drop-shadow">
              UID: {profile.uid}
            </div>
          </div>

          {/* 操作按钮区 */}
          <div className="pb-2 md:pb-4 w-full md:w-auto flex justify-center">
            {isOwnProfile ? (
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full font-bold transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center">
                <FaUserEdit /> 编辑个人资料
              </button>
            ) : (
              <button className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center">
                <FaUserPlus /> 加为好友
              </button>
            )}
          </div>
        </div>

        {/* --- 3. 详细内容网格区 --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
          
          {/* 左侧主列 (占 2 份宽度)：介绍 & 成绩 */}
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            
            {/* 模块 A：个人介绍 (BBCode) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8"
            >
              <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.2em] mb-4 md:mb-6 border-b border-white/10 pb-2">
                About Me
              </h3>
              <div className="text-sm md:text-base leading-relaxed text-gray-200">
                {renderBBCode(profile.bio)}
              </div>
            </motion.div>

            {/* 模块 B：Best Performance (最佳成绩 Top 5) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-2">
                <FaTrophy className="text-yellow-400 text-xl" />
                <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.2em]">
                  Best Performance
                </h3>
              </div>
              
              <div className="space-y-3">
                {profile.topScores.map((score, index) => (
                  <div key={score.id} className="flex items-center justify-between p-3 md:p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 md:w-10 text-center font-mono font-bold text-gray-500 text-sm md:text-base">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm md:text-lg text-white">{score.song}</div>
                        <div className="text-[10px] md:text-xs text-gray-400">{score.artist}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-green-400 text-sm md:text-xl">
                        {score.achievement.toFixed(4)}%
                      </div>
                      <div className="font-mono text-xs md:text-sm text-gray-400">
                        DX: {score.dxScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* 右侧边栏 (占 1 份宽度)：好友 & 统计 */}
          <div className="space-y-6 md:space-y-8">
            
            {/* 模块 C：好友列表 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-blue-400" />
                  <h3 className="text-gray-400 text-xs uppercase tracking-[0.2em]">Friends</h3>
                </div>
                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                  {profile.friendsCount}
                </span>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-3 gap-4">
                {profile.friends.map(friend => (
                  <div key={friend.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                    <img 
                      src={friend.avatarUrl} 
                      className="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 border-transparent group-hover:border-blue-400 transition-all object-cover bg-gray-800"
                    />
                    <span className="text-[10px] text-gray-400 group-hover:text-white truncate w-full text-center">
                      {friend.username}
                    </span>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 transition-colors">
                View All
              </button>
            </motion.div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;