import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaCamera, FaUserPlus, FaUserEdit, FaTrophy, FaUsers, FaSpinner, FaSave, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { username: routeUsername } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // --- 核心状态 ---
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- 编辑状态 ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 保存文本和本地预览的 Base64 URL
  const [editData, setEditData] = useState({ bio: '', avatarUrl: '', bannerUrl: '' });
  
  // 保存用户选择的真实文件对象 (File)
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [newBannerFile, setNewBannerFile] = useState(null);

  // 文件选择器引用
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // --- 🔥 更健壮的身份判定 ---
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

  // --- 处理文件选择与预览 ---
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // 格式校验
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('仅支持 jpg, jpeg, png 格式的图片');
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

  // --- 上传图片辅助函数 ---
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    const res = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url; 
  };

  // --- 保存所有资料 ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      let finalAvatarUrl = editData.avatarUrl;
      let finalBannerUrl = editData.bannerUrl;

      if (newAvatarFile) {
        finalAvatarUrl = await uploadImage(newAvatarFile);
      }
      if (newBannerFile) {
        finalBannerUrl = await uploadImage(newBannerFile);
      }

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

  // --- 取消编辑 ---
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

  // --- BBCode 渲染器 ---
  const renderBBCode = (text) => {
    if (!text) return <span className="text-gray-500 italic">这个人很懒，什么都没写...</span>;
    let html = text
      .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
      .replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // --- 视图：加载中 ---
  if (loading) return (
    <div className="w-full min-h-screen flex items-center justify-center text-white pb-20">
      <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
    </div>
  );

  // --- 视图：报错或不存在 ---
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

  return (
    <div className="w-full min-h-screen pb-24 overflow-x-hidden text-white relative">
      
      {/* 隐藏的文件输入框 */}
      <input type="file" ref={avatarInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'avatar')} />
      <input type="file" ref={bannerInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'banner')} />

      {/* --- 1. Banner 区域 --- */}
      <div className="relative h-[25vh] md:h-[40vh] w-full overflow-hidden bg-gray-900 group z-0">
        <img 
          src={isEditing ? editData.bannerUrl : (profile.bannerUrl || '/assets/bg.png')} 
          alt="Profile Banner" 
          className={`w-full h-full object-cover transition-all duration-500 ${isEditing ? 'opacity-30 blur-sm scale-105' : 'opacity-60'}`}
        />
        {/* 🔥 核心修复：添加 pointer-events-none 防止渐变层遮挡点击事件 */}
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
          <div className="flex-1 pb-2 md:pb-4 z-20">
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter drop-shadow-2xl">{profile.username}</h1>
            <div className="mt-1 md:mt-2 text-blue-400 font-mono text-sm md:text-base font-bold drop-shadow flex items-center justify-center md:justify-start gap-3">
              <span>UID: {profile.uid || '未分配'}</span>
              {profile.isRegistered && (
                 <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">参赛选手</span>
              )}
            </div>
          </div>

          {/* 按钮控制区 */}
          <div className="pb-2 md:pb-4 w-full md:w-auto flex justify-center z-20">
            {isOwnProfile ? (
              !isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full font-bold transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center shadow-lg"
                >
                  <FaUserEdit /> 编辑资料
                </button>
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
                    className="w-full h-48 bg-black/50 border border-white/20 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors font-mono text-sm resize-none"
                  />
                  <div className="absolute right-4 bottom-4 text-xs text-gray-500 font-mono pointer-events-none">支持 BBCode</div>
                </div>
              ) : (
                <div className="text-sm md:text-base leading-relaxed text-gray-200">
                  {renderBBCode(profile.bio)}
                </div>
              )}
            </motion.div>

            {/* B: 比赛成绩记录 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-2">
                <FaTrophy className="text-yellow-400 text-xl" />
                <h3 className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
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
      </div>
    </div>
  );
};

export default Profile;