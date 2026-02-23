import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaCamera, FaUserPlus, FaUserEdit, FaTrophy, FaUsers, FaMedal, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { username: routeUsername } = useParams(); // 从 URL 获取用户名 (如 /profile/天冉)
  const { user: currentUser } = useAuth(); // 当前登录的用户
  const navigate = useNavigate();
  
  // 状态管理
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 决定要查询的用户名：如果 URL 有提供就用 URL 的，否则用当前登录用户的
  const targetUsername = routeUsername || currentUser?.username;
  
  // 判断当前查看的主页是不是登录者本人的
  const isOwnProfile = currentUser?.username === profile?.username; 

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUsername) {
        setError('请先登录或指定要查看的玩家');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        // 请求我们刚才写好的后端 API
        const res = await axios.get(`/api/users/${targetUsername}`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.msg || '无法获取玩家资料，可能是用户不存在');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUsername]);

  // BBCode 渲染器
  const renderBBCode = (text) => {
    if (!text) return <span className="text-gray-500 italic">这个人很懒，什么都没写...</span>;
    let html = text
      .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
      .replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // --- 视图 A：加载中 ---
  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-white pb-20">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
        <p className="text-gray-400 tracking-widest uppercase text-sm">Loading Data...</p>
      </div>
    );
  }

  // --- 视图 B：报错提示 (用户不存在等) ---
  if (error || !profile) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-white pb-20">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-2xl font-bold mb-2">出错了</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20">
          返回主页
        </button>
      </div>
    );
  }

  // --- 视图 C：正常展示资料 ---
  return (
    <div className="w-full min-h-screen pb-24 overflow-x-hidden text-white relative">
      
      {/* 1. Banner 英雄图区域 */}
      <div className="relative h-[25vh] md:h-[35vh] w-full overflow-hidden bg-gray-900">
        <img 
          src={profile.bannerUrl || '/assets/bg.png'} 
          alt="Profile Banner" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        {isOwnProfile && (
           <button className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/50 hover:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white border border-white/20 transition-all flex items-center gap-2 cursor-pointer z-20">
             <FaCamera /> 更换封面
           </button>
        )}
      </div>

      {/* 2. 用户身份信息区 */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 md:-mt-20 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 text-center md:text-left">
          
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-2xl md:rounded-3xl overflow-hidden border-4 border-black bg-gray-900 shadow-2xl relative">
              <img src={profile.avatarUrl || '/assets/logos.png'} alt="Avatar" className="w-full h-full object-cover" />
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
                  <FaCamera className="text-2xl mb-1 text-white" />
                  <span className="text-[10px] uppercase tracking-widest text-white">Upload</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 pb-2 md:pb-4">
            <h1 className="text-3xl md:text-5xl font-black drop-shadow-lg">{profile.username}</h1>
            <div className="mt-1 md:mt-2 text-blue-400 font-mono text-sm md:text-base font-bold drop-shadow flex items-center justify-center md:justify-start gap-3">
              <span>UID: {profile.uid || '未分配'}</span>
              {profile.isRegistered && (
                 <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">参赛选手</span>
              )}
            </div>
          </div>

          <div className="pb-2 md:pb-4 w-full md:w-auto flex justify-center">
            {isOwnProfile ? (
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full font-bold transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center">
                <FaUserEdit /> 编辑资料
              </button>
            ) : (
              <button className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center">
                <FaUserPlus /> 加为好友
              </button>
            )}
          </div>
        </div>

        {/* 3. 详细内容网格区 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
          
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            
            {/* A: 个人介绍 */}
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

            {/* B: 真实成绩记录 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-2">
                <FaTrophy className="text-yellow-400 text-xl" />
                <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.2em]">
                  Tournament Records
                </h3>
              </div>
              
              <div className="space-y-3">
                {profile.topScores && profile.topScores.length > 0 ? (
                  profile.topScores.map((score, index) => (
                    <div key={score._id || index} className="flex items-center justify-between p-3 md:p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 md:w-10 text-center font-mono font-bold text-gray-500 text-sm md:text-base">
                          #{index + 1}
                        </div>
                        <div>
                          {/* 既然目前数据库只有分数没有曲名，我们显示来源标识 */}
                          <div className="font-bold text-sm md:text-lg text-white">MSC 2026 预选赛成绩</div>
                          <div className="text-[10px] md:text-xs text-gray-400">
                            录入时间: {new Date(score.finishTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-green-400 text-sm md:text-xl">
                          {Number(score.achievement).toFixed(4)}%
                        </div>
                        <div className="font-mono text-xs md:text-sm text-gray-400">
                          DX: {score.dxScore}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    该玩家暂无比赛成绩记录
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6 md:space-y-8">
            
            {/* C: 好友列表 (占位) */}
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
                  {profile.friendsCount || 0}
                </span>
              </div>
              
              {profile.friendsCount === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  还是个独行侠...
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-3 gap-4">
                  {profile.friends?.map(friend => (
                    // 预留的渲染逻辑
                    <div key={friend._id} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <img src={friend.avatarUrl} className="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 border-transparent group-hover:border-blue-400 transition-all object-cover bg-gray-800"/>
                      <span className="text-[10px] text-gray-400 group-hover:text-white truncate w-full text-center">
                        {friend.username}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;