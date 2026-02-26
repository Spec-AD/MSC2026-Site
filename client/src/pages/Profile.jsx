import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaCamera, FaUserPlus, FaUserEdit, FaTrophy, FaUsers, FaSpinner, FaSave, FaTimes, FaSyncAlt, FaClock, FaHeart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import bbcode from 'bbcode-to-react';

const Profile = () => {
  const { username: routeUsername } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // --- 核心状态 ---
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proberId, setProberId] = useState('');
  
  // 🔥 高级筛选 B50 状态
  const [b50Filter, setB50Filter] = useState('DEFAULT');
  
  // --- 编辑与同步状态 ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importToken, setImportToken] = useState(''); 
  const [isSyncingMaimai, setIsSyncingMaimai] = useState(false);
  
  // 保存文本和本地预览的 Base64 URL
  const [editData, setEditData] = useState({ bio: '', avatarUrl: '', bannerUrl: '' });
  
  // 保存用户选择的真实文件对象 (File)
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newBannerFile, setNewBannerFile] = useState(null);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // --- 身份判定 ---
  const targetUsername = routeUsername || currentUser?.username;
  const isOwnProfile = profile && currentUser && (
    profile.username.toLowerCase() === currentUser.username.toLowerCase()
  );

  useEffect(() => {
    fetchProfile();
  }, [targetUsername, currentUser]);

  const fetchProfile = async () => {
    if (!targetUsername) {
      setError('请先登录或指定要查看的玩家');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/users/${targetUsername}?t=${Date.now()}`);
      
      setProfile(res.data);
      setProberId(res.data.proberUsername || ''); 
      setImportToken(res.data.importToken || '');
      
      setEditData({
        bio: res.data.bio || '',
        avatarUrl: res.data.avatarUrl || '/assets/logos.png',
        bannerUrl: res.data.bannerUrl || '/assets/bg.png'
      });
    } catch (err) {
      setError(err.response?.data?.msg || '用户不存在');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMaimai = async () => {
    if (!proberId.trim()) { alert('请输入有效的水鱼查分器用户名或 QQ！'); return; }
    if (!importToken.trim()) { alert('请提供有效的 Import-Token！'); return; }
    
    setIsSyncingMaimai(true);
    try {
      const res = await axios.post('/api/users/sync-maimai', { 
        proberUsername: proberId,
        importToken: importToken 
      });
      alert('✅ 数据同步成功！您的当前 Rating 为: ' + res.data.rating);
      window.location.reload();
    } catch (err) {
      alert('❌ ' + (err.response?.data?.msg || '同步失败，请检查账号和 Token 是否匹配'));
    } finally {
      setIsSyncingMaimai(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 3 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      alert(`上传失败：图片体积太大啦！当前文件 ${(file.size / 1024 / 1024).toFixed(2)}MB，不能超过 3MB。`);
      e.target.value = ''; 
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('仅支持 jpg, jpeg, png, gif 格式的图片');
      e.target.value = '';
      return;
    }

    if (type === 'avatar') setNewAvatarFile(file);
    else setNewBannerFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditData(prev => ({
        ...prev,
        [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddFriend = async () => {
    if (!currentUser) {
      alert('请先登录才能添加好友！');
      navigate('/login');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/users/${profile.username}/friend-request`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      
      const currentUserId = currentUser.id || currentUser._id;
      setProfile(prev => ({
        ...prev,
        friendRequests: [...(prev.friendRequests || []), currentUserId]
      }));
    } catch (err) {
      alert(err.response?.data?.message || '发送请求失败');
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url; 
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      let finalAvatarUrl = editData.avatarUrl;
      let finalBannerUrl = editData.bannerUrl;

      if (newAvatarFile) finalAvatarUrl = await uploadImage(newAvatarFile);
      if (newBannerFile) finalBannerUrl = await uploadImage(newBannerFile);

      const res = await axios.put('/api/users/profile', {
        bio: editData.bio,
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl
      });
      
      setProfile(res.data);
      setEditData({
        bio: res.data.bio,
        avatarUrl: res.data.avatarUrl,
        bannerUrl: res.data.bannerUrl
      });
      
      setNewAvatarFile(null);
      setNewBannerFile(null);
      setIsEditing(false);
      
      alert('资料更新成功！');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || '保存失败，请检查网络或图片尺寸');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '/assets/logos.png',
      bannerUrl: profile.bannerUrl || '/assets/bg.png'
    });
    setNewAvatarFile(null);
    setNewBannerFile(null);
    setIsEditing(false);
  };

  // ==========================================
  // 🔥 超级引擎：动态 B50 计算核心
  // ==========================================
  const displayScores = useMemo(() => {
    if (!profile) return [];
    
    // 取全量成绩进行筛选，如果没有全量则用 topScores 兜底
    const sourceScores = profile.allScores || profile.topScores || [];
    
    switch (b50Filter) {
      case 'DEFAULT':
        return profile.topScores || [];
      case 'AP50':
        return sourceScores.filter(s => ['ap', 'app'].includes(s.fcStatus)).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'FC50':
        return sourceScores.filter(s => ['fc', 'fcp', 'ap', 'app'].includes(s.fcStatus)).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'I50':
        // I50：基于当前的默认 B50 进行虚拟补全
        return (profile.topScores || []).map(score => {
          let newAch = score.achievement;
          let newFc = score.fcStatus || '';
          
          if (newAch < 100.0) {
            newAch = 100.0;
          } else if (newAch >= 100.0 && newAch < 100.5) {
            newAch = 100.5;
            newFc = 'fcp'; // 强制升为 FC+
          } else if (newAch >= 100.5) {
            newAch = 101.0;
            newFc = 'app'; // 强制升为 AP+
          }
          
          // DX分占比提升5%，最高100%
          let newDxRatio = Math.min(1.0, (score.dxRatio || 0) + 0.05);

          // 重新计算 Maimai DX 理论 Rating
          let factor = 0;
          if (newAch >= 100.5) factor = 22.4;
          else if (newAch >= 100.0) factor = 21.6;
          else if (newAch >= 99.5) factor = 21.1;
          else if (newAch >= 99.0) factor = 20.8;
          else if (newAch >= 98.0) factor = 20.3;
          else if (newAch >= 97.0) factor = 20.0;
          else if (newAch >= 94.0) factor = 16.8;
          else if (newAch >= 90.0) factor = 15.2;
          else if (newAch >= 80.0) factor = 13.6;

          const newRating = Math.floor(score.constant * (Math.min(newAch, 100.5) / 100) * factor);

          return { ...score, achievement: newAch, dxRatio: newDxRatio, rating: newRating, fcStatus: newFc, isIdeal: true };
        }).sort((a, b) => b.rating - a.rating).slice(0, 50);

      case 'STAR_1': return sourceScores.filter(s => s.dxRatio >= 0.85).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'STAR_2': return sourceScores.filter(s => s.dxRatio >= 0.90).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'STAR_3': return sourceScores.filter(s => s.dxRatio >= 0.93).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'STAR_4': return sourceScores.filter(s => s.dxRatio >= 0.95).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'STAR_5': return sourceScores.filter(s => s.dxRatio >= 0.97).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'STAR_5_5': return sourceScores.filter(s => s.dxRatio >= 0.98).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'STAR_6': return sourceScores.filter(s => s.dxRatio >= 0.99).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'RED': return sourceScores.filter(s => s.level === 2).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'PURPLE': return sourceScores.filter(s => s.level === 3).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'WHITE': return sourceScores.filter(s => s.level === 4).sort((a,b) => b.rating - a.rating).slice(0, 50);
      
      default: return profile.topScores || [];
    }
  }, [profile, b50Filter]);

  // 计算筛选后总 Rating 
  const displayRating = useMemo(() => {
    if (b50Filter === 'DEFAULT') return profile?.rating || 0;
    return displayScores.reduce((sum, s) => sum + (s.rating || 0), 0);
  }, [displayScores, b50Filter, profile]);

  if (loading) return (
    <div className="w-full min-h-screen flex items-center justify-center text-white pb-20">
      <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
    </div>
  );

  if (error || !profile) return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center text-white pb-20">
      <div className="text-6xl mb-4">📭</div>
      <h2 className="text-2xl font-bold mb-2">出错了</h2>
      <p className="text-gray-400 mb-6">{error}</p>
      <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20">
        返回主页
      </button>
    </div>
  );

  // --- 👑 头衔系统配置 ---
  const ROLE_CONFIG = {
    ADM: { color: 'text-red-500', badgeUrl: '/assets/badges/adm.png', label: 'Administrator' },
    TO:  { color: 'text-yellow-400', badgeUrl: '/assets/badges/to.png', label: 'Tournament Officer' },
    DS:  { color: 'text-green-500', badgeUrl: '/assets/badges/ds.png', label: 'Daily Supervisioner' },
    user:{ color: 'text-white', badgeUrl: null, label: 'Player' } 
  };
  const userRole = profile.role ? (ROLE_CONFIG[profile.role] || ROLE_CONFIG.user) : ROLE_CONFIG.user;

  // --- 🎨 舞萌 DX 难度颜色映射 ---
  const getDifficultyColor = (levelIndex) => {
    const colors = [
      'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] text-green-400',   // 0: Basic
      'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)] text-yellow-400', // 1: Advanced
      'border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)] text-red-400',      // 2: Expert
      'border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.3)] text-purple-400',// 3: Master
      'border-purple-200 shadow-[0_0_10px_rgba(233,213,255,0.5)] text-purple-200' // 4: Re:Master
    ];
    return colors[levelIndex] || 'border-gray-500 text-gray-400';
  };

  return (
    <div className="w-full min-h-screen pb-24 overflow-x-hidden text-white relative">
      
      <input type="file" ref={avatarInputRef} className="hidden" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => handleFileChange(e, 'avatar')} />
      <input type="file" ref={bannerInputRef} className="hidden" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => handleFileChange(e, 'banner')} />

      {/* --- 1. Banner 区域 --- */}
      <div className="relative h-[25vh] md:h-[40vh] w-full overflow-hidden bg-gray-900 group z-0">
        <img 
          src={isEditing ? editData.bannerUrl : (profile.bannerUrl || '/assets/bg.png')} 
          alt="Profile Banner" 
          className={`w-full h-full object-cover transition-all duration-500 ${isEditing ? 'opacity-30 blur-sm scale-105' : 'opacity-60'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
        
        {isOwnProfile && isEditing && (
           <button 
             onClick={(e) => { e.stopPropagation(); bannerInputRef.current.click(); }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/30 transition-all flex items-center gap-2 z-50 font-bold tracking-widest text-sm cursor-pointer shadow-2xl"
           >
             <FaCamera /> 更换封面图
           </button>
        )}
      </div>

      {/* --- 2. 用户身份信息区 --- */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 md:-mt-24 relative z-20">
        {/* 这个 flex 容器限制了头像、名字和操作按钮 */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 text-center md:text-left">
          
          <div className="relative group flex-shrink-0 z-30">
            <div className="w-28 h-28 md:w-44 md:h-44 rounded-2xl md:rounded-3xl overflow-hidden border-4 border-black bg-gray-900 shadow-2xl relative">
              <img 
                src={isEditing ? editData.avatarUrl : (profile.avatarUrl || '/assets/logos.png')} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
              {isOwnProfile && isEditing && (
                <div 
                  onClick={(e) => { e.stopPropagation(); avatarInputRef.current.click(); }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer opacity-100 transition-opacity z-50"
                >
                  <FaCamera className="text-3xl mb-1 text-white" />
                  <span className="text-[10px] uppercase tracking-widest text-white font-bold">Upload</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 pb-2 md:pb-4 z-20 w-full">
            <div className="flex items-end gap-3 md:gap-4 flex-wrap justify-center md:justify-start">
              <h1 className={`text-4xl md:text-6xl font-black italic tracking-tighter drop-shadow-2xl transition-colors ${userRole.color}`}>
                {profile.username}
              </h1>
              {userRole.badgeUrl && (
                 <img 
                   src={userRole.badgeUrl} 
                   alt={userRole.label} 
                   title={userRole.label}
                   className="h-6 md:h-8 object-contain mb-1 md:mb-2 drop-shadow-lg"
                 />
              )}
            </div>
            
            <div className="flex flex-wrap items-end justify-center md:justify-start gap-6 md:gap-10 mt-4 mb-2">
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest leading-none mb-1 uppercase">UID</span>
                    <span className="text-xl md:text-2xl font-mono text-gray-200 font-semibold leading-none">{profile.uid || '未分配'}</span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest leading-none mb-1 uppercase">Performance</span>
                    <span className="text-xl md:text-2xl font-mono text-purple-400 font-bold leading-none">
                        {profile.totalPf ? profile.totalPf.toFixed(2) : '0.00'}
                    </span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest leading-none mb-1 uppercase">Rank</span>
                    <span className="text-xl md:text-2xl font-mono text-blue-400 font-bold leading-none">
                        {profile.pfRank !== '-' && profile.pfRank ? `#${profile.pfRank}` : '-'}
                    </span>
                </div>
                {profile.isRegistered && (
                   <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] uppercase tracking-wider ml-auto md:ml-0 mb-1">参赛选手</span>
                )}
            </div>
          </div>

          <div className="pb-2 md:pb-4 w-full md:w-auto flex flex-wrap justify-center gap-3 z-20">
            {isOwnProfile ? (
              !isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full font-bold transition-all flex items-center gap-2 text-sm md:text-base shadow-lg"
                  >
                    <FaUserEdit /> 编辑资料
                  </button>

                  {currentUser && currentUser.role === 'ADM' && (
                    <button 
                      onClick={() => navigate('/admin')}
                      className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/50 rounded-full font-bold transition-all flex items-center gap-2 text-sm md:text-base shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    >
                      进入 ADM 中控台
                    </button>
                  )}
                </>
              ) : (
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving} 
                    className="flex-1 md:flex-none px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-full flex items-center justify-center gap-2 transition-all font-bold disabled:opacity-50"
                  >
                    {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存修改
                  </button>
                  <button 
                    onClick={handleCancelEdit} 
                    disabled={isSaving}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <FaTimes />
                  </button>
                </div>
              )
            ) : (
              (() => {
                const currentUserId = currentUser?.id || currentUser?._id;
                const isFriend = currentUserId && profile.friends?.some(f => (f._id || f).toString() === currentUserId.toString());
                const isPending = currentUserId && profile.friendRequests?.some(reqId => reqId.toString() === currentUserId.toString());

                if (isFriend) {
                  return (
                    <button disabled className="px-6 py-3 bg-pink-500 text-white rounded-full font-bold shadow-[0_0_15px_rgba(236,72,153,0.4)] flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center opacity-90 cursor-default">
                      <FaHeart /> Friends
                    </button>
                  );
                }

                if (isPending) {
                  return (
                    <button disabled className="px-6 py-3 bg-gray-600/80 text-gray-300 border border-gray-500/50 rounded-full font-bold flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center cursor-not-allowed transition-all">
                      <FaClock /> 等待验证
                    </button>
                  );
                }

                return (
                  <button 
                    onClick={handleAddFriend}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center"
                  >
                    <FaUserPlus /> 加为好友
                  </button>
                );
              })()
            )}
          </div>
        </div> {/* <--- 核心布局修复：在这里闭合 flex 容器 ---> */}

        {/* 🔥 极简登塔经验条 (与水鱼同步卡片等宽) 🔥 */}
        <div className="w-full mt-8 bg-black/40 border border-white/10 rounded-2xl p-4 md:p-5 relative overflow-hidden group shadow-lg z-20">
          {/* 动态流光背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10 flex items-center gap-4 px-2 md:px-4">
            {/* 等级徽章 (极简) */}
            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black italic text-lg md:text-xl shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-white/20">
              {profile.level || 1}
            </div>

            {/* 进度条区 (300 经验/级) */}
            <div className="flex-1 w-full flex flex-col gap-1.5 justify-center">
              <div className="flex justify-end text-[10px] md:text-xs font-mono font-bold text-cyan-300 drop-shadow-md px-1 leading-none">
                { (profile.xp || 0) % 300 } / 300 <span className="opacity-70 ml-1.5">({ (((profile.xp || 0) % 300) / 300 * 100).toFixed(1) }%)</span>
              </div>
              {/* 进度条轨道 */}
              <div className="h-2.5 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile.xp || 0) % 300) / 300 * 100}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", type: "spring" }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.8)] relative"
                >
                  {/* 进度条高光动画 */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent"></div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* 水鱼数据同步模块 (仅本人可见) */}
        {isOwnProfile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-5 md:p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl w-full backdrop-blur-md flex flex-col gap-4 z-20"
          >
            <div className="text-center md:text-left">
              <label className="text-sm font-bold text-blue-400 uppercase tracking-widest block mb-1">
                Data Synchronization
              </label>
              <div className="text-gray-400 text-xs leading-relaxed">
                绑定查分器账号并提供 Import-Token即可获取您的B50<br/>
                <a 
                  href="https://www.diving-fish.com/maimaidx/prober/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300 mt-1 inline-block"
                >
                  不知道怎么获取？点击前往水鱼查分器主页 {'>'} 编辑个人资料 {'>'} 成绩导入Token（复制即可）
                </a>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row w-full gap-3">
              <input 
                type="text" 
                value={proberId}
                onChange={(e) => setProberId(e.target.value)}
                placeholder="水鱼用户名或QQ"
                className="w-full md:w-48 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors"
              />
              <input 
                type="password" 
                value={importToken}
                onChange={(e) => setImportToken(e.target.value)}
                placeholder="在此粘贴您的超长 Import-Token"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors font-mono"
              />
              <button 
                onClick={handleSyncMaimai}
                disabled={isSyncingMaimai}
                className="bg-gray-800 hover:bg-gray-700 text-purple-400 border border-gray-700 hover:border-purple-500 px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap shadow-lg flex items-center justify-center gap-2 shrink-0"
              >
                {isSyncingMaimai ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
                {isSyncingMaimai ? 'SYNCING...' : 'SYNC'}
              </button>
            </div>
          </motion.div>
        )}

        {/* --- 3. 详细内容网格区 --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
          
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl"
            >
              <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.2em] mb-4 md:mb-6 border-b border-white/10 pb-2 font-bold">
                About Me
              </h3>
              {isEditing ? (
                <div className="relative">
                  <textarea 
                    value={editData.bio}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    placeholder="在这里介绍一下你自己，支持 BBCode 语法"
                    className="w-full h-48 bg-black/50 border border-white/20 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors font-mono text-sm resize-none whitespace-pre-wrap"
                  />
                  <div className="absolute right-4 bottom-4 text-xs text-gray-500 font-mono pointer-events-none">BBCode Supported</div>
                </div>
              ) : (
                <div className="text-sm md:text-base leading-relaxed text-gray-200 bbcode-content break-words whitespace-pre-wrap">
                  {profile.bio ? bbcode.toReact(profile.bio) : <span className="text-gray-500 italic">这个人很懒，什么都没写...</span>}
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <FaTrophy className="text-yellow-400 text-xl" />
                <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
                  Tournament Honors
                </h3>
              </div>
              
              <div className="space-y-4">
                {profile.honors && profile.honors.length > 0 ? (
                  profile.honors.map((imgUrl, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      className="relative w-full overflow-hidden rounded-xl border border-white/5 shadow-lg group cursor-pointer"
                    >
                      <div className="aspect-[4/1] w-full bg-gray-800/50">
                        <img 
                          src={imgUrl} 
                          alt={`Honor Badge ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                    <div className="text-gray-600 text-4xl mb-2">🧊</div>
                    <div className="text-gray-500 text-sm italic">暂无荣誉陈列</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-blue-400" />
                  <h3 className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Friends</h3>
                </div>
                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                  {profile.friends?.length || profile.friendsCount || 0}
                </span>
              </div>
              
              {!profile.friends || profile.friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs font-mono tracking-widest">
                  还是个独行侠...
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {profile.friends.map(friend => (
                    <div 
                      key={friend._id} 
                      onClick={() => navigate(`/profile/${friend.username}`)}
                      className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 md:p-4 rounded-2xl hover:bg-white/10 hover:border-blue-400/50 transition-all cursor-pointer group"
                    >
                      <img 
                        src={friend.avatarUrl || '/assets/logos.png'} 
                        alt="avatar"
                        className="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-transparent group-hover:border-blue-400 transition-all object-cover bg-gray-800 shrink-0"
                      />
                      <div className="flex-1 overflow-hidden flex flex-col justify-center">
                        <span className="text-base md:text-lg font-bold text-gray-300 group-hover:text-white truncate w-full transition-colors">
                          {friend.username}
                        </span>
                        <span className="text-xs text-gray-500 font-mono tracking-widest mt-0.5">
                          UID: <span className="text-gray-400">{friend.uid || '未绑定'}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0 pr-2 md:pr-4">
                        <div className="text-xl md:text-2xl font-black text-white drop-shadow-md font-mono tracking-tighter">
                          {friend.totalPf || friend.rating || '0'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. 史诗级 B50 成绩面板 (Best 50 Records) */}
        {/* ========================================================= */}
        <div className="mt-16 md:mt-24 z-20 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 border-b border-white/10 pb-4 gap-4">
            
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">
                  BEST 50.
                </h2>
                <div className="text-gray-400 font-mono text-sm tracking-[0.3em] uppercase mt-2">
                  Diving Fish / Maimai DX Records
                </div>
              </div>
              
              <select
                value={b50Filter}
                onChange={(e) => setB50Filter(e.target.value)}
                className="bg-black/80 backdrop-blur-md border border-purple-500/50 text-purple-300 rounded-xl px-4 py-2 outline-none font-bold text-sm uppercase tracking-widest cursor-pointer hover:bg-purple-900/30 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.2)] mt-2 md:mt-0"
              >
                 <option value="DEFAULT">默认 B50 (Default)</option>
                 <option value="AP50">AP 50 (All Perfect)</option>
                 <option value="FC50">FC 50 (Full Combo)</option>
                 <option value="I50">理想 B50 (Ideal-50)</option>
                 <option value="STAR_1">1星 B50 (DX≥85%)</option>
                 <option value="STAR_2">2星 B50 (DX≥90%)</option>
                 <option value="STAR_3">3星 B50 (DX≥93%)</option>
                 <option value="STAR_4">4星 B50 (DX≥95%)</option>
                 <option value="STAR_5">5星 B50 (DX≥97%)</option>
                 <option value="STAR_5_5">5.5星 B50 (DX≥98%)</option>
                 <option value="STAR_6">6星 B50 (DX≥99%)</option>
                 <option value="RED">红谱 B50 (EXPERT)</option>
                 <option value="PURPLE">紫谱 B50 (MASTER)</option>
                 <option value="WHITE">白谱 B50 (Re:MASTER)</option>
              </select>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center gap-4 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                {b50Filter === 'DEFAULT' ? 'DX Rating' : 'Filtered Rating'}
              </span>
              <span className="text-3xl font-black italic text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all">
                {displayRating}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {displayScores.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500 font-mono tracking-widest border border-white/5 rounded-2xl bg-black/20">
                NO RECORDS FOUND UNDER THIS FILTER
              </div>
            ) : (
              displayScores.map((record, index) => {
                const colorClasses = getDifficultyColor(record.level);

                return (
                  <motion.div 
                    key={`${b50Filter}-${index}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-gray-900 group cursor-default transition-all duration-300 ${colorClasses}`}
                  >
                    <img 
                      src={`https://www.diving-fish.com/covers/${String(record.songId).padStart(5, '0')}.png`} 
                      alt={record.songName}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                      onError={(e) => { e.target.src = '/assets/bg.png'; }}
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                    {/* FC/AP 状态徽章 */}
                    {record.fcStatus && ['fc', 'fcp', 'ap', 'app'].includes(record.fcStatus) && (
                      <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-black italic text-white shadow-lg z-10 
                        ${record.fcStatus.includes('ap') ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-pink-400 to-pink-600'}`}>
                        {record.fcStatus.toUpperCase()}
                      </div>
                    )}

                    {/* I50 虚拟增幅标志 */}
                    {record.isIdeal && (
                      <div className="absolute top-2 left-10 bg-cyan-500/80 backdrop-blur-sm border border-cyan-300 px-1.5 py-0.5 rounded text-[9px] font-black italic text-white z-10 shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                        BOOSTED
                      </div>
                    )}

                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded text-[10px] font-black italic text-white z-10">
                      #{index + 1}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end z-10">
                      <div className="text-xs md:text-sm font-bold text-white truncate drop-shadow-md mb-1">
                        {record.songName}
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-lg md:text-xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {record.achievement ? record.achievement.toFixed(4) : '0.0000'}<span className="text-[10px] text-gray-300 ml-0.5">%</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-lg">
                          <span className="text-[8px] opacity-70">➔</span> {record.rating || 0}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🔥 5. 极简 PF Top 50 列表 🔥 */}
        {/* ========================================================= */}
        {profile.topPfScores && profile.topPfScores.length > 0 && (
          <div className="mt-16 md:mt-24 z-20 relative border-t border-white/10 pt-12">
            <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-gray-300 drop-shadow-lg mb-6 flex items-center gap-3">
              <FaTrophy className="text-purple-400" />
              PERFORMANCE TOP 50.
            </h2>
            <div className="flex flex-col border-t border-gray-800/50">
              {profile.topPfScores.map((score, index) => {
                const diffColors = ['text-green-400', 'text-yellow-400', 'text-red-400', 'text-purple-400', 'text-pink-300'];
                const diffColor = diffColors[score.difficulty] || diffColors[score.level] || 'text-gray-400';

                return (
                  <div key={score._id || index} className="flex justify-between items-center py-2.5 border-b border-gray-800/50 hover:bg-white/5 transition-colors group px-2">
                    <div className="flex items-center gap-4 truncate">
                      <div className="text-gray-600 font-mono text-sm w-6 text-right shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-gray-200 font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">
                          {score.songName || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className={`font-black ${diffColor}`}>Lv.{score.level}</span>
                          <span className="text-gray-600">|</span>
                          <span className="text-gray-500 font-mono">{score.constant?.toFixed(1)}</span>
                          <span className="text-gray-600 hidden md:inline">|</span>
                          <span className="text-gray-500 font-mono hidden md:inline">{score.achievement?.toFixed(4)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5 shrink-0 ml-4">
                      <span className="text-base font-mono font-bold text-purple-400">
                        {score.pf ? score.pf.toFixed(2) : '0.00'}
                      </span>
                      <span className="text-[10px] text-gray-600 font-bold uppercase">PF</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;