import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaCamera, FaUserPlus, FaUserEdit, FaTrophy, FaUsers, FaSpinner, FaSave, FaTimes } from 'react-icons/fa';
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
  
  // --- 编辑与同步状态 ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [proberId, setProberId] = useState('');
  const [isSyncingMaimai, setIsSyncingMaimai] = useState(false);
  
  // 保存文本和本地预览的 Base64 URL
  const [editData, setEditData] = useState({ bio: '', avatarUrl: '', bannerUrl: '' });
  
  // 保存用户选择的真实文件对象 (File)
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newBannerFile, setNewBannerFile] = useState(null);

  // 文件选择器引用
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // --- 🔥 身份判定 ---
  const targetUsername = routeUsername || currentUser?.username;
  const isOwnProfile = profile && currentUser && (
    profile.username.toLowerCase() === currentUser.username.toLowerCase()
  );

  // 初始化拉取数据
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
      const res = await axios.get(`/api/users/${targetUsername}`);
      setProfile(res.data);
      setProberId(res.data.proberUsername || ''); // 初始化水鱼账号
      // 初始化编辑框的数据
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

  // --- 处理水鱼 B50 数据同步 ---
  const handleSyncMaimai = async () => {
    if (!proberId.trim()) {
      alert('请输入有效的水鱼查分器用户名或 QQ！');
      return;
    }
    setIsSyncingMaimai(true);
    try {
      const res = await axios.post('/api/users/sync-maimai', { proberUsername: proberId });
      alert('✅ 数据同步成功！您的当前 Rating 为: ' + res.data.rating);
      // 刷新页面以拉取最新成绩数据
      window.location.reload();
    } catch (err) {
      alert('❌ ' + (err.response?.data?.msg || '同步失败，请检查账号并确保水鱼已开启允许第三方查询'));
    } finally {
      setIsSyncingMaimai(false);
    }
  };

  // --- 处理文件选择与预览 ---
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // 体积限制 (3MB)
    const MAX_SIZE = 3 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      alert(`上传失败：图片体积太大啦！当前文件 ${(file.size / 1024 / 1024).toFixed(2)}MB，不能超过 3MB。`);
      e.target.value = ''; 
      return;
    }

    // 格式校验
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('仅支持 jpg, jpeg, png, gif 格式的图片');
      e.target.value = '';
      return;
    }

    if (type === 'avatar') {
      setNewAvatarFile(file);
    } else {
      setNewBannerFile(file);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditData(prev => ({
        ...prev,
        [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: reader.result
      }));
    };
    reader.readAsDataURL(file);
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
      alert(err.response?.data?.msg || '保存失败，请检查网络或图片尺寸是否过大');
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
      'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] text-green-400',   // 0: Basic (绿)
      'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)] text-yellow-400', // 1: Advanced (黄)
      'border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)] text-red-400',      // 2: Expert (红)
      'border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.3)] text-purple-400',// 3: Master (紫)
      'border-purple-200 shadow-[0_0_10px_rgba(233,213,255,0.5)] text-purple-200' // 4: Re:Master (白)
    ];
    return colors[levelIndex] || 'border-gray-500 text-gray-400';
  };

  // --- 📊 模拟的 B50 数据 (等待水鱼 Token 审核通过后，这里将替换为真实的 profile.scores) ---
  const mockB50 = [
    { songId: '834', title: 'PANDORA PARADOXXX', level: 4, achievement: 100.5000, rating: 337, type: 'SD' },
    { songId: '799', title: 'QZKago Requiem', level: 3, achievement: 100.8200, rating: 333, type: 'SD' },
    { songId: '11209', title: 'Grievous Lady', level: 3, achievement: 100.6000, rating: 319, type: 'DX' },
    { songId: '456', title: 'Glorious Crown', level: 3, achievement: 99.8500, rating: 311, type: 'SD' },
    { songId: '10363', title: 'Oshama Scramble!', level: 3, achievement: 100.9500, rating: 306, type: 'DX' },
    { songId: '227', title: 'Garakuta Doll Play', level: 2, achievement: 100.5000, rating: 294, type: 'SD' },
    { songId: '11364', title: 'Lia=Fail', level: 2, achievement: 101.0000, rating: 288, type: 'DX' },
  ];

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
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 text-center md:text-left">
          
          {/* 头像 */}
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

          {/* 身份文字 */}
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
            
            <div className="mt-1 md:mt-2 text-blue-400 font-mono text-sm md:text-base font-bold drop-shadow flex items-center justify-center md:justify-start gap-3">
              <span>UID: {profile.uid || '未分配'}</span>
              {profile.isRegistered && (
                 <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">参赛选手</span>
              )}
            </div>
          </div>

          {/* 按钮控制区 */}
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

                  {/* 🔥 ADM 中控台暗门入口 */}
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
              <button className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center">
                <FaUserPlus /> 加为好友
              </button>
            )}
          </div>
        </div>

        {/* 🔥 全新位置：水鱼数据同步模块 (独立一行，横向排版更美观) 🔥 */}
        {isOwnProfile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl w-full backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 z-20"
          >
            <div className="text-center md:text-left">
              <label className="text-sm font-bold text-blue-400 uppercase tracking-widest block mb-1">
                Diving Fish / 核心数据同步
              </label>
              <div className="text-gray-400 text-xs">绑定查分器账号，生成专属舞萌 DX 战力面板与 B50 成绩单。</div>
            </div>
            
            <div className="flex w-full md:w-auto gap-2">
              <input 
                type="text" 
                value={proberId}
                onChange={(e) => setProberId(e.target.value)}
                placeholder="输入水鱼用户名或 QQ"
                className="flex-1 md:w-64 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
              />
              <button 
                onClick={handleSyncMaimai}
                disabled={isSyncingMaimai}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-blue-500/20"
              >
                {isSyncingMaimai ? '同步中...' : '同步 B50'}
              </button>
            </div>
          </motion.div>
        )}

        {/* --- 3. 详细内容网格区 --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
          
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            
            {/* A: 个人介绍 */}
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
                    placeholder="在这里介绍一下你自己，支持 BBCode 语法，例如 [b]加粗[/b] 或 [color=red]红字[/color]"
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

            {/* B: 荣誉陈列架 */}
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
            
            {/* C: 好友列表 */}
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

        {/* ========================================================= */}
        {/* 🔥 4. 史诗级 B50 成绩面板 (Best 50 Records) 🔥 */}
        {/* ========================================================= */}
        <div className="mt-16 md:mt-24 z-20 relative">
          
          {/* 大气感标题头 */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">
                BEST 50.
              </h2>
              <div className="text-gray-400 font-mono text-sm tracking-[0.3em] uppercase mt-2">
                Diving Fish / Maimai DX Records
              </div>
            </div>
            
            {/* 战力总评 */}
            <div className="mt-4 md:mt-0 flex items-center gap-4 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">DX Rating</span>
              <span className="text-3xl font-black italic text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                {profile.rating || 15000} {/* 暂时写死一个大佬分数过过瘾 */}
              </span>
            </div>
          </div>

          {/* 成绩卡片矩阵 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {mockB50.map((record, index) => {
              // 获取当前难度的颜色边框
              const colorClasses = getDifficultyColor(record.level);

              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-gray-900 group cursor-default transition-all duration-300 ${colorClasses}`}
                >
                  {/* 背景封面图 (直连水鱼图库) */}
                  <img 
                    src={`https://www.diving-fish.com/covers/${record.songId}.png`} 
                    alt={record.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    onError={(e) => { e.target.src = '/assets/bg.png'; }} // 防裂图机制
                  />
                  
                  {/* 底部渐变遮罩 (确保文字清晰) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                  {/* 顶部标签 */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded text-[10px] font-black italic text-white z-10">
                    {record.type}
                  </div>

                  {/* 底部数据区 */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end z-10">
                    {/* 曲名 (单行防溢出) */}
                    <div className="text-xs md:text-sm font-bold text-white truncate drop-shadow-md mb-1">
                      {record.title}
                    </div>
                    
                    {/* 成绩与单曲 Rating */}
                    <div className="flex items-end justify-between">
                      <div className="text-lg md:text-xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {record.achievement.toFixed(4)}<span className="text-[10px] text-gray-300 ml-0.5">%</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-lg">
                        <span className="text-[8px] opacity-70">➔</span> {record.rating}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
        </div>

      </div>
    </div>
  );
};


export default Profile;
