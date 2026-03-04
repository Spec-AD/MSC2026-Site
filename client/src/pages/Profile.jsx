import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  FaCamera, FaUserPlus, FaUserEdit, FaSpinner, FaSave, FaTimes, 
  FaUserFriends, FaLock, FaUnlock, FaMedal, FaChevronRight, FaGamepad
} from 'react-icons/fa';
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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

  if (loading) return (
    <div className="w-full min-h-screen bg-[#0c0c11] flex flex-col items-center justify-center pb-20">
      <FaSpinner className="animate-spin text-4xl text-cyan-500/50 mb-4" />
      <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Loading Profile...</span>
    </div>
  );

  if (error || !profile) return (
    <div className="w-full min-h-screen bg-[#0c0c11] flex flex-col items-center justify-center text-zinc-200 pb-20 selection:bg-indigo-500/30">
      <div className="text-6xl mb-6 opacity-20"><FaLock /></div>
      <h2 className="text-2xl font-bold mb-2">未找到该玩家档案</h2>
      <p className="text-zinc-500 mb-8">{error}</p>
      <button onClick={() => navigate('/')} className="px-6 py-3 bg-zinc-200 text-zinc-900 rounded-xl font-bold transition-all active:scale-95 shadow-sm">
        返回终端主页
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

  const renderSafeBBCode = (content) => {
    if (!content) return null;
    const safeContent = content.replace(/\[(code|block)\]([\s\S]*?)\[\/\1\]/gi, (match, tag, inner) => {
      const escapedInner = inner.replace(/\[/g, '__L__').replace(/\]/g, '__R__');
      return `[${tag}]${escapedInner}[/${tag}]`;
    });
    return bbcode.toReact(safeContent);
  };

  return (
    <div className="w-full min-h-screen pb-24 overflow-x-hidden bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative">
      
      {/* 隐藏的文件输入框 */}
      <input type="file" ref={avatarInputRef} className="hidden" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => handleFileChange(e, 'avatar')} />
      <input type="file" ref={bannerInputRef} className="hidden" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => handleFileChange(e, 'banner')} />

      {/* --- 全局环境散光 --- */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      {/* ==================================================== */}
      {/* 1. 沉浸式 Banner 巨幕 */}
      {/* ==================================================== */}
      <div className="relative h-[30vh] md:h-[40vh] w-full overflow-hidden bg-[#0a0a0c] group z-0 border-b border-white/[0.05]">
        <img 
          src={isEditing ? editData.bannerUrl : (profile.bannerUrl || '/assets/bg.png')} 
          alt="Profile Banner" 
          className={`w-full h-full object-cover transition-all duration-700 ${isEditing ? 'opacity-30 blur-md scale-105' : 'opacity-40'}`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {/* 底部融合遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/40 to-transparent pointer-events-none" />
        
        {isOwnProfile && isEditing && (
           <button 
             onClick={(e) => { e.stopPropagation(); bannerInputRef.current.click(); }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900/80 hover:bg-white text-zinc-200 hover:text-zinc-900 backdrop-blur-md px-6 py-3 rounded-full transition-all flex items-center gap-2 z-50 font-bold text-sm cursor-pointer shadow-lg active:scale-95 border border-white/10"
           >
             <FaCamera /> 设定背景横幅
           </button>
        )}
      </div>

      {/* ==================================================== */}
      {/* 2. 身份铭牌区 (Identity Header) */}
      {/* ==================================================== */}
      <div className="max-w-5xl mx-auto px-6 -mt-20 md:-mt-24 relative z-20">
        
        {/* 顶部：头像、名牌与操作按钮 */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 md:gap-8 bg-[#15151e]/60 backdrop-blur-xl border border-white/[0.05] p-6 md:p-8 rounded-[2rem] shadow-xl">
          
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left w-full md:w-auto">
            {/* 互动式头像 */}
            <div className="relative group shrink-0 -mt-16 md:-mt-20">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] overflow-hidden border-[6px] border-[#15151e] bg-[#0c0c11] shadow-2xl relative rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <img 
                  src={isEditing ? editData.avatarUrl : (profile.avatarUrl || '/assets/logos.png')} 
                  alt="Avatar" 
                  className="w-full h-full object-cover -rotate-3 group-hover:rotate-0 transition-transform duration-500" 
                />
                {isOwnProfile && isEditing && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current.click(); }}
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer opacity-100 transition-opacity z-50 hover:bg-black/50"
                  >
                    <FaCamera className="text-2xl mb-1 text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Change</span>
                  </div>
                )}
              </div>
            </div>

            {/* 玩家基础信息 */}
            <div className="flex flex-col gap-2 md:gap-1.5 pb-2">
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${userRole.color}`}>
                  {profile.username}
                </h1>
                {userRole.badgeUrl && (
                   <img src={userRole.badgeUrl} alt={userRole.label} title={userRole.label} className="h-5 md:h-6 object-contain" />
                )}
                {profile.isRegistered && (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                    Contender
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-center md:justify-start gap-4">
                <span 
                  className="text-sm font-bold text-zinc-400 uppercase tracking-widest"
                  style={{ fontFamily: "'Quicksand', sans-serif" }}
                >
                  UID: {profile.uid || 'N/A'}
                </span>
                
                {/* 极简好友指示器 */}
                <div 
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-black/20 border border-white/5 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => navigate('/friends')}
                  title="查看好友列表"
                >
                  <FaUserFriends /> 
                  <span style={{ fontFamily: "'Quicksand', sans-serif" }}>
                    {profile.friendsCount || profile.friends?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：操作中心 */}
          <div className="flex items-center justify-center gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/[0.05] pt-6 md:pt-0">
            {isOwnProfile ? (
              !isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-6 py-3 bg-[#1a1a24] hover:bg-white/[0.08] border border-white/[0.05] text-zinc-200 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-sm active:scale-95"
                  >
                    <FaUserEdit /> 编辑终端档案
                  </button>
                </>
              ) : (
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving} 
                    className="flex-1 md:flex-none px-6 py-3 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl flex items-center justify-center gap-2 transition-all font-bold disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存
                  </button>
                  <button 
                    onClick={handleCancelEdit} 
                    disabled={isSaving}
                    className="px-4 py-3 bg-[#1a1a24] hover:bg-rose-500/10 border border-white/[0.05] hover:border-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
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
                    <button disabled className="px-6 py-3 bg-[#1a1a24] text-zinc-500 border border-white/[0.05] rounded-xl font-bold flex items-center justify-center gap-2 text-sm w-full md:w-auto cursor-default">
                      <FaUserFriends /> 你们已是好友
                    </button>
                  );
                }

                if (isPending) {
                  return (
                    <button disabled className="px-6 py-3 bg-[#1a1a24] text-zinc-500 border border-white/[0.05] rounded-xl font-bold flex items-center justify-center gap-2 text-sm w-full md:w-auto cursor-not-allowed">
                      等待对方接受
                    </button>
                  );
                }

                return (
                  <button 
                    onClick={handleAddFriend}
                    className="px-6 py-3 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm w-full md:w-auto active:scale-95 shadow-sm"
                  >
                    <FaUserPlus /> 发送好友请求
                  </button>
                );
              })()
            )}
          </div>

        </div>

        {/* ==================================================== */}
        {/* 3. 个人简介与社区成长 (Bio & XP) */}
        {/* ==================================================== */}
        <div className="mt-8 bg-[#15151e] border border-white/[0.05] rounded-[2rem] p-6 md:p-10 shadow-sm">
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">终端记录</h3>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* 简介文本区 */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <>
                  <textarea 
                    value={editData.bio}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    placeholder="在这里记录你的游戏格言、简介或近况..."
                    className="w-full h-32 bg-[#0c0c11] border border-white/[0.05] rounded-xl p-4 text-zinc-200 outline-none focus:border-cyan-500/50 transition-colors text-sm resize-none whitespace-pre-wrap leading-relaxed"
                  />
                  <div className="flex items-center justify-between bg-[#0c0c11] border border-white/[0.05] rounded-xl p-4 mt-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        {editData.isB50Visible ? <FaUnlock className="text-cyan-400" /> : <FaLock className="text-zinc-500" />} 
                        数据隐私设置
                      </span>
                      <span className="text-xs text-zinc-500 mt-1">公开展示我的数据档案与成绩</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={editData.isB50Visible}
                        onChange={(e) => setEditData({...editData, isB50Visible: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-[#222228] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                </>
              ) : (
                <div className="text-[15px] leading-loose text-zinc-300 bbcode-content break-words whitespace-pre-wrap">
                  {renderSafeBBCode(profile.bio) || <span className="text-zinc-600 font-medium">这个人沉迷打歌，什么都没留下。</span>}
                </div>
              )}
            </div>

            {/* 等级成长环 (重构为侧边模块) */}
            <div className="w-full lg:w-64 shrink-0 flex flex-col items-center justify-center p-6 bg-[#0c0c11] border border-white/[0.05] rounded-2xl">
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-cyan-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {profile.level || 1}
                </span>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-1">Level</span>
              </div>
              
              <div className="w-full h-1.5 bg-[#15151e] rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile.xp || 0) % 300) / 300 * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                />
              </div>
              
              <div className="w-full flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                <span>{(profile.xp || 0) % 300} XP</span>
                <span>300 XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 4. 身份与成就矩阵 (Identity & Honors) */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* 段位占位 (WIP) */}
          <div className="bg-[#15151e] border border-white/[0.05] rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-4 right-5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest border border-white/[0.05] px-2 py-0.5 rounded">WIP</div>
            
            <div className="w-24 h-24 mb-4">
              {/* 模拟段位图标的占位圆环 */}
              <div className="w-full h-full rounded-full border-4 border-dashed border-amber-500/20 flex items-center justify-center group-hover:rotate-180 transition-transform duration-1000 ease-in-out">
                <FaMedal className="text-3xl text-amber-500/40" />
              </div>
            </div>
            
            <h4 className="text-lg font-bold text-zinc-400">段位系统筹备中</h4>
            <p className="text-xs text-zinc-600 font-medium mt-1">专属竞技排位即将揭晓</p>
          </div>

          {/* 荣誉陈列区 (横向展开) */}
          <div className="lg:col-span-2 bg-[#15151e] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-4 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
              <h3 className="text-base font-bold text-zinc-100 tracking-tight">荣誉陈列柜</h3>
            </div>
            
            {profile.honors && profile.honors.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
                {profile.honors.map((imgUrl, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -5 }}
                    className="relative w-64 aspect-[3/1] shrink-0 overflow-hidden rounded-xl border border-white/[0.05] shadow-sm bg-[#0c0c11]"
                  >
                    <img src={imgUrl} alt="Honor Badge" className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="w-full h-32 flex flex-col items-center justify-center rounded-xl border border-white/[0.02] bg-[#0c0c11] text-zinc-600">
                <FaMedal className="text-2xl mb-2 opacity-20" />
                <span className="text-xs font-bold uppercase tracking-widest">No Honors Yet</span>
              </div>
            )}
          </div>

        </div>

        {/* ==================================================== */}
        {/* 5. 游戏数据档案库 (Gaming Profiles Hub) */}
        {/* ==================================================== */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-1 h-5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">数据档案库</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Maimai DX 入口 */}
            <div 
              onClick={() => navigate(`/profile/${profile.username}/maimai`)}
              className="group relative bg-[#15151e] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 cursor-pointer overflow-hidden transition-all hover:bg-[#1a1a24] hover:border-cyan-500/30"
            >
              <div className="absolute -right-10 -bottom-10 opacity-5 text-9xl text-cyan-400 transform -rotate-12 group-hover:scale-110 transition-transform duration-500">
                <FaGamepad />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-xl font-bold text-cyan-400 mb-1">Maimai DX</h3>
                <p className="text-xs text-zinc-500 font-medium mb-8">查看 Best 50 成绩单与曲目完成度</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Total PF</span>
                    <span className="text-2xl font-bold text-zinc-200" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      {profile.totalPf ? profile.totalPf.toFixed(1) : '--'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <FaChevronRight className="text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* osu! 入口 */}
            <div 
              onClick={() => navigate(`/profile/${profile.username}/osu`)}
              className="group relative bg-[#15151e] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 cursor-pointer overflow-hidden transition-all hover:bg-[#1a1a24] hover:border-pink-500/30"
            >
              <div className="absolute -right-6 -bottom-6 opacity-5 text-9xl text-pink-400 group-hover:scale-110 transition-transform duration-500">
                <FaGamepad />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-xl font-bold text-pink-400 mb-1">osu!</h3>
                <p className="text-xs text-zinc-500 font-medium mb-8">查看全球排名与 Best Performance 记录</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Performance (PP)</span>
                    <span className="text-2xl font-bold text-zinc-200" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                      {profile.osuPp ? Math.round(profile.osuPp) : '--'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#0c0c11] border border-white/[0.05] flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-colors">
                    <FaChevronRight className="text-sm" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;