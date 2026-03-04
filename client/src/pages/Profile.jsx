import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaCamera, FaUserPlus, FaUserEdit, FaTrophy, FaUsers, FaSpinner, FaSave, FaTimes, FaSyncAlt, FaClock, FaHeart, FaLock, FaUnlock, FaGamepad, FaChartLine } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import bbcode from 'bbcode-to-react';
import { useToast } from '../context/ToastContext';

const Profile = () => {
  const { username: routeUsername } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // --- 核心状态 ---
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proberId, setProberId] = useState('');
  const [activeGame, setActiveGame] = useState('maimai'); 
  const [isSyncingOsu, setIsSyncingOsu] = useState(false);
  const [osuSyncMode, setOsuSyncMode] = useState('osu');
  
  const [selectedPfScore, setSelectedPfScore] = useState(null);
  
  const [b50Filter, setB50Filter] = useState('DEFAULT');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importToken, setImportToken] = useState(''); 
  const [isSyncingMaimai, setIsSyncingMaimai] = useState(false);
  
  const [editData, setEditData] = useState({ bio: '', avatarUrl: '', bannerUrl: '', isB50Visible: false });
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newBannerFile, setNewBannerFile] = useState(null);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

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
        bannerUrl: res.data.bannerUrl || '/assets/bg.png',
        isB50Visible: res.data.isB50Visible || false 
      });
    } catch (err) {
      setError(err.response?.data?.msg || '用户不存在');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMaimai = async () => {
    if (!proberId.trim()) { addToast('请输入有效的水鱼查分器用户名或 QQ！', 'error'); return; }
    if (!importToken.trim()) { addToast('请提供有效的 Import-Token！', 'error'); return; }
    
    setIsSyncingMaimai(true);
    try {
      const res = await axios.post('/api/users/sync-maimai', { 
        proberUsername: proberId,
        importToken: importToken 
      });
      addToast(`数据同步成功！\n当前 Rating 为: ${res.data.rating}`, 'success');
      window.location.reload();
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请检查账号和 Token 是否匹配', 'error');
    } finally {
      setIsSyncingMaimai(false);
    }
  };

  const handleSyncOsu = async () => {
    setIsSyncingOsu(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/sync-osu', { mode: osuSyncMode }, { headers: { Authorization: `Bearer ${token}` }});
      addToast(res.data.msg, 'success');
      setTimeout(() => window.location.reload(), 1500); 
    } catch (err) {
      addToast(err.response?.data?.msg || '同步失败，请稍后重试', 'error');
    } finally {
      setIsSyncingOsu(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 3 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      addToast(`上传失败：图片体积太大！当前文件 ${(file.size / 1024 / 1024).toFixed(2)}MB，不能超过 3MB。`, 'error');
      e.target.value = ''; 
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast('仅支持 jpg, jpeg, png, gif 格式的图片', 'error');
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
      addToast('请先登录才能添加好友', 'info'); 
      navigate('/login');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/users/${profile.username}/friend-request`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast(res.data.message, 'success'); 
      
      const currentUserId = currentUser.id || currentUser._id;
      setProfile(prev => ({
        ...prev,
        friendRequests: [...(prev.friendRequests || []), currentUserId]
      }));
    } catch (err) {
      addToast(err.response?.data?.message || '发送请求失败', 'error'); 
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

      await axios.put('/api/users/profile', {
        bio: editData.bio,
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl,
        isB50Visible: editData.isB50Visible 
      });
      
      await fetchProfile();
      
      setNewAvatarFile(null);
      setNewBannerFile(null);
      setIsEditing(false);
      
      addToast('资料更新成功！', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.msg || '保存失败，请检查网络或图片尺寸', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '/assets/logos.png',
      bannerUrl: profile.bannerUrl || '/assets/bg.png',
      isB50Visible: profile.isB50Visible || false
    });
    setNewAvatarFile(null);
    setNewBannerFile(null);
    setIsEditing(false);
  };

  const displayScores = useMemo(() => {
    if (!profile) return [];
    const sourceScores = profile.allScores || profile.topScores || [];
    switch (b50Filter) {
      case 'DEFAULT': return profile.topScores || [];
      case 'AP50': return sourceScores.filter(s => ['ap', 'app'].includes(s.fcStatus)).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'FC50': return sourceScores.filter(s => ['fc', 'fcp', 'ap', 'app'].includes(s.fcStatus)).sort((a,b) => b.rating - a.rating).slice(0, 50);
      case 'I50':
        return (profile.topScores || []).map(score => {
          let newAch = score.achievement;
          let newFc = score.fcStatus || '';
          if (newAch < 100.0) newAch = 100.0;
          else if (newAch >= 100.0 && newAch < 100.5) { newAch = 100.5; newFc = 'fcp'; }
          else if (newAch >= 100.5) { newAch = 101.0; newFc = 'app'; }
          let newDxRatio = Math.min(1.0, (score.dxRatio || 0) + 0.05);
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

  const displayRating = useMemo(() => {
    if (b50Filter === 'DEFAULT') return profile?.rating || 0;
    return displayScores.reduce((sum, s) => sum + (s.rating || 0), 0);
  }, [displayScores, b50Filter, profile]);

  if (loading) return (
    <div className="w-full min-h-screen bg-[#111115] flex items-center justify-center pb-20">
      <FaSpinner className="animate-spin text-4xl text-zinc-500" />
    </div>
  );

  if (error || !profile) return (
    <div className="w-full min-h-screen bg-[#111115] flex flex-col items-center justify-center text-zinc-200 pb-20 selection:bg-zinc-600/40">
      <div className="text-5xl mb-4 opacity-20">📭</div>
      <h2 className="text-2xl font-bold mb-2">未找到该玩家</h2>
      <p className="text-zinc-500 mb-6">{error}</p>
      <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-medium">
        返回主页
      </button>
    </div>
  );

  const ROLE_CONFIG = {
    ADM: { color: 'text-rose-400', badgeUrl: '/assets/badges/adm.png', label: 'Administrator' },
    TO:  { color: 'text-amber-400', badgeUrl: '/assets/badges/to.png', label: 'Tournament Officer' },
    DS:  { color: 'text-emerald-400', badgeUrl: '/assets/badges/ds.png', label: 'Daily Supervisioner' },
    user:{ color: 'text-zinc-100', badgeUrl: null, label: 'Player' } 
  };
  const userRole = profile.role ? (ROLE_CONFIG[profile.role] || ROLE_CONFIG.user) : ROLE_CONFIG.user;

  // 难度色彩引擎 (内敛化)
  const getDifficultyColor = (levelIndex) => {
    const colors = [
      'border-emerald-500/30 text-emerald-400',
      'border-amber-500/30 text-amber-400',
      'border-rose-500/30 text-rose-400',
      'border-purple-500/30 text-purple-400',
      'border-zinc-300/30 text-zinc-200'
    ];
    return colors[levelIndex] || 'border-zinc-500/30 text-zinc-400';
  };

  const getRatingColor = (rating) => {
    const r = Number(rating) || 0;
    if (r >= 16500) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400'; 
    if (r >= 16000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400'; 
    if (r >= 15000) return 'text-amber-400'; 
    if (r >= 13000) return 'text-purple-400'; 
    if (r >= 10000) return 'text-blue-400'; 
    return 'text-orange-400'; 
  };

  const getOsuGradeColor = (grade) => {
    const g = grade.toUpperCase();
    if (['XH', 'SH'].includes(g)) return 'text-zinc-200';
    if (['X', 'S'].includes(g)) return 'text-amber-400';
    if (g === 'A') return 'text-emerald-400';
    if (g === 'B') return 'text-blue-400';
    if (g === 'C') return 'text-purple-400';
    return 'text-zinc-500';
  };

  const getPfColor = (pf) => {
    const p = Number(pf) || 0;
    if (p >= 42000) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400'; 
    if (p >= 35000) return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400'; 
    if (p >= 30000) return 'text-amber-400'; 
    if (p >= 20000) return 'text-purple-400'; 
    if (p >= 15000) return 'text-blue-400'; 
    return 'text-orange-400'; 
  };

  const getRankColor = (rank) => {
    if (rank === '-' || !rank) return 'text-zinc-500';
    const r = Number(rank);
    if (r >= 1 && r <= 10) return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400';
    if (r >= 11 && r <= 100) return 'text-cyan-400';
    return 'text-blue-400';
  };

  const renderSafeBBCode = (content) => {
    if (!content) return null;
    const safeContent = content.replace(/\[(code|block)\]([\s\S]*?)\[\/\1\]/gi, (match, tag, inner) => {
      const escapedInner = inner.replace(/\[/g, '__L__').replace(/\]/g, '__R__');
      return `[${tag}]${escapedInner}[/${tag}]`;
    });
    return bbcode.toReact(safeContent);
  };

  return (
    <div className="w-full min-h-screen pb-24 overflow-x-hidden bg-[#111115] text-zinc-200 font-sans selection:bg-zinc-600/40 relative">
      
      <input type="file" ref={avatarInputRef} className="hidden" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => handleFileChange(e, 'avatar')} />
      <input type="file" ref={bannerInputRef} className="hidden" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => handleFileChange(e, 'banner')} />

      {/* --- 1. Banner 区域 --- */}
      <div className="relative h-[25vh] md:h-[35vh] w-full overflow-hidden bg-[#0a0a0c] group z-0 border-b border-white/[0.05]">
        <img 
          src={isEditing ? editData.bannerUrl : (profile.bannerUrl || '/assets/bg.png')} 
          alt="Profile Banner" 
          className={`w-full h-full object-cover transition-all duration-700 ${isEditing ? 'opacity-30 blur-md scale-105' : 'opacity-50'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-transparent to-transparent pointer-events-none" />
        
        {isOwnProfile && isEditing && (
           <button 
             onClick={(e) => { e.stopPropagation(); bannerInputRef.current.click(); }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900/80 hover:bg-white text-zinc-200 hover:text-zinc-900 backdrop-blur-md px-6 py-3 rounded-full transition-all flex items-center gap-2 z-50 font-bold text-sm cursor-pointer shadow-lg active:scale-95"
           >
             <FaCamera /> 更换封面底图
           </button>
        )}
      </div>

      {/* --- 2. 用户信息头部 --- */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20 relative z-20">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
          
          <div className="relative group flex-shrink-0 z-30">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[#111115] bg-[#18181c] shadow-xl relative">
              <img 
                src={isEditing ? editData.avatarUrl : (profile.avatarUrl || '/assets/logos.png')} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
              {isOwnProfile && isEditing && (
                <div 
                  onClick={(e) => { e.stopPropagation(); avatarInputRef.current.click(); }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer opacity-100 transition-opacity z-50 hover:bg-black/50"
                >
                  <FaCamera className="text-2xl mb-1 text-white" />
                  <span className="text-xs font-semibold text-white">更换头像</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 pb-2 z-20 w-full">
            <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center md:justify-start">
              <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${userRole.color}`}>
                {profile.username}
              </h1>
              {userRole.badgeUrl && (
                 <img 
                   src={userRole.badgeUrl} 
                   alt={userRole.label} 
                   title={userRole.label}
                   className="h-5 md:h-6 object-contain opacity-90"
                 />
              )}
            </div>
            
            <div className="flex flex-wrap items-end justify-center md:justify-start gap-6 md:gap-10 mt-3 mb-1">
                <div className="flex flex-col items-start">
                    <span className="text-xs text-zinc-500 font-semibold mb-0.5">UID</span>
                    <span className="text-lg font-medium text-zinc-300 leading-none">{profile.uid || '未分配'}</span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-xs text-zinc-500 font-semibold mb-0.5">综合表现 (PF)</span>
                    <span className={`text-lg font-bold ${getPfColor(profile.totalPf)}`}>
                        {profile.totalPf ? profile.totalPf.toFixed(2) : '0.00'}
                    </span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-xs text-zinc-500 font-semibold mb-0.5">全站排名</span>
                    <span className={`text-lg font-bold ${getRankColor(profile.pfRank)}`}>
                        {profile.pfRank !== '-' && profile.pfRank ? `#${profile.pfRank}` : '-'}
                    </span>
                </div>
                {profile.isRegistered && (
                   <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold ml-auto md:ml-0 mb-1">
                     参赛选手
                   </span>
                )}
            </div>
          </div>

          <div className="pb-2 w-full md:w-auto flex flex-wrap justify-center gap-3 z-20">
            {isOwnProfile ? (
              !isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-6 py-2.5 bg-[#18181c] hover:bg-[#222228] border border-white/[0.05] rounded-xl font-semibold transition-all flex items-center gap-2 text-sm shadow-sm active:scale-95"
                  >
                    <FaUserEdit /> 编辑资料
                  </button>

                  {currentUser && currentUser.role === 'ADM' && (
                    <button 
                      onClick={() => navigate('/admin')}
                      className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm active:scale-95"
                    >
                      系统后台
                    </button>
                  )}
                </>
              ) : (
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving} 
                    className="flex-1 md:flex-none px-6 py-2.5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl flex items-center justify-center gap-2 transition-all font-bold disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存修改
                  </button>
                  <button 
                    onClick={handleCancelEdit} 
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-[#18181c] hover:bg-[#222228] border border-white/[0.05] text-zinc-400 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
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
                    <button disabled className="px-6 py-2.5 bg-[#18181c] text-zinc-400 border border-white/[0.05] rounded-xl font-semibold flex items-center gap-2 text-sm w-full md:w-auto justify-center opacity-80 cursor-default">
                      <FaHeart className="text-rose-400" /> 已互为好友
                    </button>
                  );
                }

                if (isPending) {
                  return (
                    <button disabled className="px-6 py-2.5 bg-[#18181c] text-zinc-500 border border-white/[0.05] rounded-xl font-semibold flex items-center gap-2 text-sm w-full md:w-auto justify-center cursor-not-allowed">
                      <FaClock /> 等待对方通过
                    </button>
                  );
                }

                return (
                  <button 
                    onClick={handleAddFriend}
                    className="px-6 py-2.5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl font-bold transition-all flex items-center gap-2 text-sm w-full md:w-auto justify-center active:scale-95 shadow-sm"
                  >
                    <FaUserPlus /> 加为好友
                  </button>
                );
              })()
            )}
          </div>
        </div> 

        {/* 社区等级经验条 (内敛重构) */}
        <div className="w-full mt-8 bg-[#18181c] border border-white/[0.05] rounded-2xl p-4 md:p-5 relative overflow-hidden group shadow-sm z-20">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#141418] border border-white/[0.05] flex items-center justify-center font-bold text-lg text-cyan-400">
              Lv.{profile.level || 1}
            </div>

            <div className="flex-1 w-full flex flex-col gap-2 justify-center">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-zinc-400">社区活跃度</span>
                <div className="text-xs font-medium text-zinc-500">
                  <span className="text-cyan-400">{ (profile.xp || 0) % 300 }</span> / 300 XP
                </div>
              </div>
              <div className="h-2 w-full bg-[#111115] rounded-full overflow-hidden border border-white/[0.05]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile.xp || 0) % 300) / 300 * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-cyan-500/80 rounded-full relative"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. 全局通用信息网格区 --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          
          <div className="md:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-4"
            >
              <h3 className="text-zinc-100 text-base border-b border-white/[0.05] pb-3 font-semibold flex items-center gap-2">
                个人简介
              </h3>
              
              {isEditing ? (
                <>
                  <div className="relative">
                    <textarea 
                      value={editData.bio}
                      onChange={(e) => setEditData({...editData, bio: e.target.value})}
                      placeholder="在这里介绍一下你自己，支持基础排版语法"
                      className="w-full h-40 bg-[#141418] border border-white/[0.05] rounded-xl p-4 text-zinc-200 outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-colors text-[15px] resize-none whitespace-pre-wrap"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-[#141418] border border-white/[0.05] rounded-xl p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        {editData.isB50Visible ? <FaUnlock className="text-zinc-400" /> : <FaLock className="text-zinc-500" />} 
                        数据隐私设置
                      </span>
                      <span className="text-xs text-zinc-500 mt-1 hidden sm:inline">对外公开展示我的 Maimai Rating 和 B50 成绩单</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={editData.isB50Visible}
                        onChange={(e) => setEditData({...editData, isB50Visible: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-[#222228] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white"></div>
                      <span className="ml-3 text-sm font-medium w-10 text-center text-zinc-400">
                        {editData.isB50Visible ? '公开' : '隐藏'}
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <div className="text-[15px] leading-relaxed text-zinc-300 bbcode-content break-words whitespace-pre-wrap min-h-[60px]">
                  {renderSafeBBCode(profile.bio) || <span className="text-zinc-600">这个人很懒，什么都没留下。</span>}
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5 border-b border-white/[0.05] pb-3">
                <FaTrophy className="text-amber-400 text-lg" />
                <h3 className="text-zinc-100 text-base font-semibold">赛事荣誉</h3>
              </div>
              
              <div className="space-y-4">
                {profile.honors && profile.honors.length > 0 ? (
                  profile.honors.map((imgUrl, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.01 }}
                      className="relative w-full overflow-hidden rounded-xl border border-white/[0.05] shadow-sm cursor-pointer"
                    >
                      <div className="aspect-[4/1] w-full bg-[#141418]">
                        <img 
                          src={imgUrl} 
                          alt={`Honor Badge ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-[#141418] rounded-xl border border-white/[0.05]">
                    <div className="text-zinc-600 text-3xl mb-2 opacity-30">🏆</div>
                    <div className="text-zinc-500 text-sm font-medium">暂无荣誉陈列</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5 border-b border-white/[0.05] pb-3">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-zinc-400" />
                  <h3 className="text-zinc-100 text-base font-semibold">好友列表</h3>
                </div>
                <span className="text-xs bg-white/[0.05] px-2.5 py-1 rounded-lg text-zinc-400 font-medium">
                  {profile.friends?.length || profile.friendsCount || 0} 人
                </span>
              </div>
              
              {!profile.friends || profile.friends.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm font-medium bg-[#141418] rounded-xl border border-white/[0.05]">
                  还没有添加任何好友
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {profile.friends.map(friend => (
                    <div 
                      key={friend._id} 
                      onClick={() => navigate(`/profile/${friend.username}`)}
                      className="flex items-center gap-3 bg-[#141418] border border-white/[0.02] p-3 rounded-xl hover:bg-[#1a1a20] hover:border-white/[0.05] transition-all cursor-pointer group"
                    >
                      <img 
                        src={friend.avatarUrl || '/assets/logos.png'} 
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover bg-[#111115] shrink-0 border border-white/[0.05]"
                      />
                      <div className="flex-1 overflow-hidden flex flex-col justify-center">
                        <span className="text-[15px] font-bold text-zinc-200 group-hover:text-white truncate w-full transition-colors">
                          {friend.username}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium mt-0.5">
                          UID: <span className="text-zinc-400">{friend.uid || '-'}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0 pr-1">
                        <div className={`text-lg font-bold tracking-tight ${friend.totalPf ? getPfColor(friend.totalPf) : (friend.isB50Visible === true ? getRatingColor(friend.rating) : 'text-zinc-600')}`}>
                          {friend.totalPf ? friend.totalPf.toFixed(1) : (friend.isB50Visible !== false ? (friend.rating || '0') : '-')}
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
        {/* 🎮 游戏生态 Tab 切换器 */}
        {/* ========================================================= */}
        <div className="mt-12 flex items-center gap-2 border-b border-white/[0.05] pb-3 overflow-x-auto custom-scrollbar z-20 relative">
          <button 
            onClick={() => setActiveGame('maimai')}
            className={`text-sm md:text-base font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeGame === 'maimai' ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
          >
            Maimai DX
          </button>
          <button 
            onClick={() => setActiveGame('osu')}
            className={`text-sm md:text-base font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeGame === 'osu' ? 'bg-pink-500/10 text-pink-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
          >
            osu!
          </button>
        </div>

        {/* ========================================================= */}
        {/* 💠 MAIMAI DX 生态系统区 */}
        {/* ========================================================= */}
        {activeGame === 'maimai' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
            
            {/* 数据同步模块 (仅本人可见) */}
            {isOwnProfile && (
              <div className="mt-6 p-5 md:p-6 bg-[#18181c] border border-cyan-500/20 rounded-2xl w-full flex flex-col gap-4 z-20 shadow-sm">
                <div className="text-center md:text-left">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-1 flex items-center gap-2">
                    <FaSyncAlt /> 查分器数据同步
                  </h3>
                  <div className="text-zinc-500 text-xs leading-relaxed">
                    绑定水鱼查分器账号并提供 Import-Token 即可获取或更新您的 B50 成绩单。<br/>
                    <a href="https://www.diving-fish.com/maimaidx/prober/" target="_blank" rel="noopener noreferrer" className="text-cyan-400/80 hover:text-cyan-400 underline transition-colors mt-1 inline-block">
                      如何获取？前往水鱼查分器主页 {'>'} 编辑个人资料 {'>'} 成绩导入Token
                    </a>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row w-full gap-3">
                  <input 
                    type="text" 
                    value={proberId}
                    onChange={(e) => setProberId(e.target.value)}
                    placeholder="查分器用户名或 QQ"
                    className="w-full md:w-56 bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-cyan-500 outline-none transition-colors"
                  />
                  <input 
                    type="password" 
                    value={importToken}
                    onChange={(e) => setImportToken(e.target.value)}
                    placeholder="在此粘贴您的 Import-Token"
                    className="flex-1 bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-cyan-500 outline-none transition-colors font-mono"
                  />
                  <button 
                    onClick={handleSyncMaimai}
                    disabled={isSyncingMaimai}
                    className="bg-cyan-600/10 hover:bg-cyan-500 text-cyan-500 hover:text-white border border-cyan-500/30 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shrink-0 active:scale-95"
                  >
                    {isSyncingMaimai ? <FaSpinner className="animate-spin" /> : '开始同步'}
                  </button>
                </div>
              </div>
            )}

            {/* B50 成绩面板 */}
            {(isOwnProfile || profile.isB50Visible) ? (
              <div className="mt-8 z-20 relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-white/[0.05] pb-4 gap-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                        <FaChartLine className="text-cyan-400" /> Best 50 成绩单
                      </h2>
                      <div className="text-zinc-500 font-medium text-sm mt-1">
                        基于 Maimai DX 真实游玩数据计算
                      </div>
                    </div>
                    
                    <select
                      value={b50Filter}
                      onChange={(e) => setB50Filter(e.target.value)}
                      className="bg-[#141418] border border-white/[0.05] text-zinc-300 rounded-xl px-4 py-2.5 outline-none font-medium text-sm cursor-pointer hover:bg-[#1a1a20] transition-colors mt-2 md:mt-0 appearance-none min-w-[180px]"
                    >
                       <option value="DEFAULT">默认 B50 (Default)</option>
                       <option value="AP50">纯 AP 榜单</option>
                       <option value="FC50">纯 FC/AP 榜单</option>
                       <option value="I50">理想 B50 (满分假设)</option>
                       <option value="STAR_5">五星水平 (DX≥97%)</option>
                       <option value="RED">红谱专榜 (EXPERT)</option>
                       <option value="PURPLE">紫谱专榜 (MASTER)</option>
                       <option value="WHITE">白谱专榜 (Re:MASTER)</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 bg-[#18181c] border border-white/[0.05] px-5 py-2.5 rounded-xl">
                    <span className="text-zinc-500 text-xs font-semibold">
                      {b50Filter === 'DEFAULT' ? '综合 Rating' : '当前筛选 Rating'}
                    </span>
                    <span className={`text-2xl font-bold tracking-tight ${getRatingColor(displayRating)}`}>
                      {displayRating}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {displayScores.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-zinc-500 text-sm font-medium border border-white/[0.05] rounded-2xl bg-[#141418]">
                      在当前筛选条件下未找到任何成绩
                    </div>
                  ) : (
                    displayScores.map((record, index) => {
                      const colorClasses = getDifficultyColor(record.level);

                      return (
                        <motion.div 
                          key={`${b50Filter}-${index}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border bg-[#18181c] group cursor-default transition-all ${colorClasses}`}
                        >
                          <img 
                            src={`https://www.diving-fish.com/covers/${String(record.songId).padStart(5, '0')}.png`} 
                            alt={record.songName}
                            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                            onError={(e) => { e.target.src = '/assets/bg.png'; }}
                          />
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-[#111115]/40 to-transparent pointer-events-none" />

                          {/* 状态徽章 */}
                          {record.fcStatus && ['fc', 'fcp', 'ap', 'app'].includes(record.fcStatus) && (
                            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-zinc-900 z-10 shadow-sm
                              ${record.fcStatus.includes('ap') ? 'bg-amber-400' : 'bg-pink-400'}`}>
                              {record.fcStatus.toUpperCase()}
                            </div>
                          )}

                          {record.isIdeal && (
                            <div className="absolute top-2 left-12 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-md text-[9px] font-bold z-10">
                              假设
                            </div>
                          )}

                          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md border border-white/[0.05] px-2 py-0.5 rounded-md text-[10px] font-bold text-zinc-300 z-10">
                            #{index + 1}
                          </div>

                          <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end z-10">
                            <div className="text-xs md:text-[13px] font-bold text-zinc-100 truncate mb-1">
                              {record.songName}
                            </div>
                            <div className="flex items-end justify-between">
                              <div className="text-base md:text-lg font-bold text-zinc-100 tracking-tight">
                                {record.achievement ? record.achievement.toFixed(4) : '0.0000'}<span className="text-[10px] text-zinc-400 ml-0.5 font-medium">%</span>
                              </div>
                              <div className="bg-white/[0.05] backdrop-blur-md border border-white/[0.05] px-2 py-1 rounded-lg text-xs font-semibold text-zinc-200 flex items-center gap-1">
                                {record.rating || 0}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-8 z-20 relative border border-white/[0.05] bg-[#141418] rounded-2xl p-16 md:p-24 flex flex-col items-center justify-center text-center">
                <FaLock className="text-5xl text-zinc-700 mb-4" />
                <h2 className="text-xl font-bold text-zinc-300 mb-2">成绩单已设为私密</h2>
                <p className="text-zinc-500 text-sm font-medium">该玩家选择不向访客公开 Maimai 表现数据</p>
              </div>
            )}

            {/* PF Top 50 列表 */}
            {profile.topPfScores && profile.topPfScores.length > 0 && (
              <div className="mt-12 z-20 relative border-t border-white/[0.05] pt-8">
                <h2 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                  <FaTrophy className="text-cyan-400" />
                  单曲综合表现 Top 50
                </h2>
                <div className="flex flex-col bg-[#141418] border border-white/[0.05] rounded-2xl overflow-hidden">
                  {profile.topPfScores.map((score, index) => {
                    const diffColors = ['text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-zinc-300'];
                    const diffColor = diffColors[score.difficulty] || diffColors[score.level] || 'text-zinc-400';

                    return (
                      <div 
                        key={score._id || index} 
                        onClick={() => setSelectedPfScore(score)}
                        className="flex justify-between items-center py-3 border-b border-white/[0.02] last:border-0 hover:bg-[#1a1a20] transition-colors group px-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="text-zinc-600 font-bold text-sm w-6 text-center shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-zinc-200 font-semibold text-[15px] truncate group-hover:text-cyan-400 transition-colors">
                              {score.songName || 'Unknown Track'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs font-medium">
                              <span className={`${diffColor}`}>Lv.{score.level}</span>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-500">{score.constant?.toFixed(1)}</span>
                              <span className="text-zinc-600 hidden md:inline">·</span>
                              <span className="text-zinc-400 hidden md:inline">{score.achievement?.toFixed(4)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 ml-4">
                          <span className={`text-lg font-bold tracking-tight ${getPfColor(score.pf)}`}>
                            {score.pf ? score.pf.toFixed(2) : '0.00'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-bold">PF</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* ========================================================= */}
        {/* 🌸 OSU! 生态系统区 */}
        {/* ========================================================= */}
        {activeGame === 'osu' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col mt-6">
            
            {/* osu! 名片面板 */}
            <div className="bg-[#18181c] border border-pink-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden z-20 shadow-sm">
              
              <div className="flex items-center gap-5 z-10 w-full md:w-auto">
                {profile.osuId ? (
                  <img 
                    src={profile.osuAvatarUrl || '/assets/logos.png'} 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[#18181c] ring-2 ring-pink-500/50 object-cover bg-[#111115] shrink-0" 
                    alt="osu avatar" 
                  />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed border-pink-500/30 flex items-center justify-center bg-pink-500/5 shrink-0">
                    <FaGamepad className="text-3xl text-pink-500/40" />
                  </div>
                )}
                
                <div className="flex flex-col">
                  {profile.osuId ? (
                    <>
                      <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">
                        {profile.osuUsername}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1.5 text-sm font-semibold text-pink-400">
                        <span className="bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                          {profile.osuMode ? profile.osuMode.toUpperCase() : 'OSU'} · {Math.round(profile.osuPp || 0)} pp
                        </span>
                        <span className="text-zinc-600 hidden md:inline">|</span>
                        <span className="text-zinc-400 flex items-center gap-1.5">🌍 <span className="text-zinc-200">#{profile.osuGlobalRank || '-'}</span></span>
                        <span className="text-zinc-600 hidden md:inline">|</span>
                        <span className="text-zinc-400 flex items-center gap-1.5">🏳️ <span className="text-zinc-200">#{profile.osuCountryRank || '-'}</span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-zinc-400">未绑定账号</h3>
                      <p className="text-sm font-medium text-zinc-500 mt-1">该玩家尚未关联 osu! 官方档案</p>
                    </>
                  )}
                </div>
              </div>

              {/* 操作区 */}
              <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 z-10">
                {!profile.osuId ? (
                  isOwnProfile && (
                    <button onClick={() => {
                      const clientId = "49210"; 
                      const redirectUri = encodeURIComponent("https://www.purebeat.top/osu-callback");
                      window.location.href = `https://osu.ppy.sh/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=public+identify`;
                    }} className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95">
                      <FaLock /> 前往授权绑定
                    </button>
                  )
                ) : (
                  isOwnProfile && (
                    <div className="flex flex-col md:flex-row gap-2">
                      <select
                        value={osuSyncMode}
                        onChange={(e) => setOsuSyncMode(e.target.value)}
                        className="bg-[#141418] border border-pink-500/30 text-pink-400 px-4 py-2.5 rounded-xl font-semibold outline-none appearance-none cursor-pointer text-center md:text-left transition-colors hover:bg-pink-500/10"
                      >
                        <option value="osu">osu! (STD)</option>
                        <option value="mania">osu!mania</option>
                        <option value="taiko">osu!taiko</option>
                        <option value="fruits">osu!catch</option>
                      </select>
                      
                      <button 
                        onClick={handleSyncOsu}
                        disabled={isSyncingOsu}
                        className="flex-1 bg-zinc-200 hover:bg-white text-zinc-900 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                      >
                        {isSyncingOsu ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
                        刷新数据
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* BP100 成绩区 */}
            {profile.osuId && (
              <div className="mt-10 z-20 relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-white/[0.05] pb-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                      <FaTrophy className="text-pink-400" /> Best Performance
                    </h2>
                    <div className="text-zinc-500 font-medium text-sm mt-1">
                      {profile.osuMode || 'osu!'} 模式历史 Top 100 表现
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(!profile.osuScores || profile.osuScores.length === 0) ? (
                    <div className="col-span-full py-16 text-center text-zinc-500 text-sm font-medium border border-white/[0.05] rounded-2xl bg-[#141418]">
                      暂无数据 (点击刷新获取最新成绩)
                    </div>
                  ) : (
                    profile.osuScores.map((score, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.01 }}
                        key={score._id || index} 
                        className="flex items-center bg-[#18181c] border border-white/[0.05] rounded-xl overflow-hidden hover:bg-[#1a1a20] transition-colors group p-1.5"
                      >
                        <div className="w-10 text-center font-bold text-zinc-600 group-hover:text-pink-500 transition-colors">
                          {index + 1}
                        </div>
                        
                        <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-white/[0.05]">
                          <img src={score.coverUrl || '/assets/bg.png'} className="w-full h-full object-cover" alt="cover" />
                        </div>
                        
                        <div className="flex-1 px-3 overflow-hidden flex flex-col justify-center">
                          <div className="text-sm font-bold text-zinc-100 truncate group-hover:text-pink-300 transition-colors">
                            {score.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-amber-400 font-semibold truncate max-w-[140px] md:max-w-[180px]">
                              [{score.version}]
                            </span>
                            {score.mods && score.mods.length > 0 && (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                +{score.mods.join('')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-bold text-pink-400">
                              {Math.round(score.pp)} pp
                            </span>
                            <span className="text-xs font-medium text-zinc-500">
                              {score.accuracy.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-14 flex justify-center shrink-0 pr-2">
                          <span className={`text-2xl font-black ${getOsuGradeColor(score.grade)}`}>
                            {score.grade}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

      {/* ========================================================= */}
      {/* 🌟 PF 详情极简弹窗 (柔和化重构) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedPfScore && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0c]/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedPfScore(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#18181c] border border-white/[0.05] rounded-3xl p-6 md:p-8 w-full max-w-sm flex flex-col items-center shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedPfScore(null)}
                className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-200 transition-colors p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-full active:scale-90"
              >
                <FaTimes />
              </button>

              <div className="text-center mb-6 px-4 w-full pt-2">
                <h3 className="text-lg font-bold text-zinc-100 mb-2 line-clamp-2 leading-snug">
                  {selectedPfScore.songName}
                </h3>
                <span className="text-xs font-semibold text-cyan-900 bg-cyan-400 px-2.5 py-0.5 rounded-md">
                  Lv.{selectedPfScore.level}
                </span>
              </div>

              {(() => {
                const ach = selectedPfScore.achievement || 0;
                const dxScore = selectedPfScore.dxScore || 0;
                const constant = selectedPfScore.constant || 0;
                const dxRatio = selectedPfScore.dxRatio || 0;

                const achMultiplier = (Math.min(ach, 100) / 100) * 0.6;
                const dxMultiplier = Math.min(dxRatio, 1.0) * 0.4;
                const totalMultiplier = achMultiplier + dxMultiplier;
                const percent = totalMultiplier * 100;
                const displayPercent = Math.min(percent, 100); 

                let grade = 'D';
                let gradeColor = 'text-zinc-500';
                let ringColor = 'text-zinc-600';

                if (percent >= 98) { grade = 'X'; gradeColor = 'text-amber-400'; ringColor = 'text-amber-400'; } 
                else if (percent >= 95) { grade = 'S'; gradeColor = 'text-pink-400'; ringColor = 'text-pink-400'; } 
                else if (percent >= 88) { grade = 'A'; gradeColor = 'text-emerald-400'; ringColor = 'text-emerald-400'; } 
                else if (percent >= 80) { grade = 'B'; gradeColor = 'text-blue-400'; ringColor = 'text-blue-400'; } 
                else if (percent >= 70) { grade = 'C'; gradeColor = 'text-orange-400'; ringColor = 'text-orange-400'; } 

                const radius = 60;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

                return (
                  <>
                    <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                      <svg className="transform -rotate-90 w-full h-full">
                        <circle cx="80" cy="80" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#222228]" />
                        <circle cx="80" cy="80" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                className={`${ringColor} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                         <span className={`text-5xl font-black ${gradeColor}`}>{grade}</span>
                         <span className="text-sm font-semibold text-zinc-300 mt-1">{percent.toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-[#141418] border border-white/[0.05] rounded-2xl p-5 space-y-3.5 text-[13px] font-medium shadow-sm">
                       <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                         <span className="text-zinc-500">完成率</span>
                         <span className="text-zinc-200">{ach.toFixed(4)}%</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                         <span className="text-zinc-500">完成率得分</span>
                         <span className="text-emerald-400">{achMultiplier.toFixed(4)} <span className="text-zinc-600 text-[10px]">/ 0.6</span></span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                         <span className="text-zinc-500">DX 原始分</span>
                         <span className="text-zinc-200">{dxScore}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                         <span className="text-zinc-500">DX 分折算</span>
                         <span className="text-blue-400">{dxMultiplier.toFixed(4)} <span className="text-zinc-600 text-[10px]">/ 0.4</span></span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                         <span className="text-zinc-500">难度定数</span>
                         <span className="text-purple-400">{constant.toFixed(1)}</span>
                       </div>
                       <div className="flex justify-between items-center pt-1">
                         <span className="text-zinc-300 font-bold">总系数</span>
                         <span className="text-amber-400 font-bold text-sm">{totalMultiplier.toFixed(4)} <span className="text-zinc-600 text-[10px]">/ 1.0</span></span>
                       </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      </div>
    </div>
  );
};

export default Profile;