import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Camera, CheckCircle, Edit, ExternalLink, RefreshCw, Trophy, User, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
    const { username } = useParams();
    const { user, login } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 编辑模式状态
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ bio: '' });
    const [isUploading, setIsUploading] = useState(false);

    // 水鱼同步状态
    const [proberUsername, setProberUsername] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    const isCurrentUser = user && profile && user.username === profile.username;

    // 拉取用户数据
    const fetchProfile = async () => {
        try {
            setLoading(true);
            const targetUsername = username || (user ? user.username : null);
            if (!targetUsername) {
                navigate('/login');
                return;
            }

            const res = await axios.get(`/api/users/${targetUsername}`);
            setProfile(res.data);
            setEditData({ bio: res.data.bio || '' });
            if (res.data.proberUsername) {
                setProberUsername(res.data.proberUsername);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || '无法加载个人资料');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [username, user]);

    // 提交基础资料修改
    const handleSaveProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/users/profile', editData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditing(false);
            fetchProfile(); // 刷新数据
        } catch (err) {
            alert('保存失败: ' + (err.response?.data?.msg || err.message));
        }
    };

    // 头像上传
    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            // 1. 上传图片到图床
            const uploadRes = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            const newAvatarUrl = uploadRes.data.url;

            // 2. 更新用户资料
            await axios.put('/api/users/profile', { avatarUrl: newAvatarUrl }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 3. 刷新页面数据
            fetchProfile();
        } catch (err) {
            alert('头像上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    // 同步水鱼查分器 (B50 & PF)
    const handleSyncMaimai = async () => {
        if (!proberUsername) return alert('请输入查分器账号或QQ号');
        setIsSyncing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/users/sync-maimai', { proberUsername }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.msg || '成绩数据同步成功');
            fetchProfile(); 
        } catch (err) {
            alert(err.response?.data?.msg || '同步失败，请检查账号状态');
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white text-xl">加载中...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-400 text-xl">{error}</div>;
    if (!profile) return null;

    return (
        <div className="min-h-screen pt-16 pb-20 md:pb-10 font-maimai">
            {/* 顶部横幅 Banner */}
            <div className="h-48 md:h-64 w-full bg-gradient-to-br from-blue-900 via-gray-900 to-black relative border-b border-gray-800">
                <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-20"></div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-2xl overflow-hidden p-6 md:p-10">
                    
                    {/* 头像与基础信息区 */}
                    <div className="flex flex-col md:flex-row md:items-end gap-6 border-b border-gray-800/50 pb-8 relative">
                        
                        {/* 头像 */}
                        <div className="relative group shrink-0">
                            <img 
                                src={profile.avatarUrl || '/assets/logos.png'} 
                                alt="avatar" 
                                className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-gray-900 shadow-xl bg-gray-800"
                            />
                            {isCurrentUser && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                                    {isUploading ? <RefreshCw className="animate-spin text-white w-8 h-8" /> : <Camera className="text-white w-8 h-8" />}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                                </label>
                            )}
                        </div>

                        {/* 用户数据看板 */}
                        <div className="flex-1 mb-2">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-wider drop-shadow-lg">
                                    {profile.username}
                                </h1>
                                {/* 徽章区域 */}
                                {profile.role === 'ADM' && (
                                    <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded font-bold text-sm tracking-widest mt-1 md:mt-0">ADM</span>
                                )}
                                {profile.isRegistered && (
                                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded font-bold text-sm tracking-widest mt-1 md:mt-0 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> 参赛选手
                                    </span>
                                )}
                            </div>

                            {/* 🔥 核心改动：稳重的 osu! 风格数值看板 🔥 */}
                            <div className="flex flex-wrap items-end gap-6 md:gap-10 mt-4">
                                {/* UID */}
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-gray-500 font-bold tracking-widest leading-none mb-1 uppercase">UID</span>
                                    <span className="text-xl md:text-2xl font-mono text-gray-300 font-semibold leading-none">{profile.uid}</span>
                                </div>
                                
                                {/* PF 分 */}
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-gray-500 font-bold tracking-widest leading-none mb-1 uppercase">Performance</span>
                                    <span className="text-xl md:text-2xl font-mono text-purple-400 font-bold leading-none">
                                        {profile.totalPf ? profile.totalPf.toFixed(2) : '0.00'}
                                    </span>
                                </div>

                                {/* RANK 排名 */}
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-gray-500 font-bold tracking-widest leading-none mb-1 uppercase">Rank</span>
                                    <span className="text-xl md:text-2xl font-mono text-blue-400 font-bold leading-none">
                                        {profile.pfRank !== '-' && profile.pfRank ? `#${profile.pfRank}` : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 编辑资料按钮 */}
                        {isCurrentUser && (
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white transition bg-gray-800/50 hover:bg-gray-700/50 rounded-lg"
                                title="编辑个人资料"
                            >
                                {isEditing ? <X className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                            </button>
                        )}
                    </div>

                    {/* 下方内容区 */}
                    <div className="mt-8 space-y-10">
                        
                        {/* 简介编辑区 */}
                        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-800/50">
                            <h3 className="text-gray-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
                                <User className="w-4 h-4" /> About Me
                            </h3>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <textarea 
                                        className="w-full bg-gray-900 border border-gray-700 text-white rounded p-3 h-24 focus:border-blue-500 focus:outline-none resize-none text-sm"
                                        placeholder="写点什么介绍一下自己..."
                                        value={editData.bio}
                                        onChange={(e) => setEditData({...editData, bio: e.target.value})}
                                    />
                                    <button 
                                        onClick={handleSaveProfile}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-bold transition"
                                    >
                                        保存更改
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                                    {profile.bio || <span className="text-gray-600 italic">这个人很懒，什么都没写...</span>}
                                </p>
                            )}
                        </div>

                        {/* 水鱼查分器同步组件 (仅本人可见且克制的设计) */}
                        {isCurrentUser && (
                            <div className="bg-gray-800/20 p-6 rounded-xl border border-gray-800/50">
                                <h3 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-widest">
                                    Data Synchronization
                                </h3>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="输入查分器账号或QQ号" 
                                        value={proberUsername}
                                        onChange={(e) => setProberUsername(e.target.value)}
                                        className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:border-purple-500 w-full md:w-64 text-sm font-mono"
                                    />
                                    <button 
                                        onClick={handleSyncMaimai}
                                        disabled={isSyncing}
                                        className="bg-gray-800 hover:bg-gray-700 text-purple-400 border border-gray-700 hover:border-purple-500 px-6 py-2 rounded font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm tracking-widest"
                                    >
                                        {isSyncing ? <RefreshCw className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                        {isSyncing ? 'SYNCING...' : 'SYNC'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600 mt-3 font-mono">
                                    系统将自动拉取数据，并依据算法模型重新计算您的表现分 (PF)。
                                </p>
                            </div>
                        )}

                        {/* B50 成绩展示 (保留原有占位逻辑) */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-2">
                                最近最佳成绩 (Top 5)
                            </h2>
                            {profile.topScores && profile.topScores.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {profile.topScores.map((score, index) => (
                                        <div key={score._id || index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 hover:border-blue-500/50 transition cursor-pointer group">
                                            <div className="text-gray-400 text-xs mb-1">#{index + 1}</div>
                                            <div className="font-bold text-gray-100 truncate group-hover:text-blue-400 transition">{score.songName || '未知曲目'}</div>
                                            <div className="flex justify-between items-center mt-3 border-t border-gray-700/50 pt-2">
                                                <span className="text-sm font-mono text-gray-300">Lv.{score.level}</span>
                                                <span className="text-sm font-mono font-bold text-blue-400">{score.achievement?.toFixed(4)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-gray-800/20 rounded-xl border border-gray-800/50">
                                    <p className="text-gray-500 text-sm">暂无成绩数据</p>
                                </div>
                            )}
                        </div>

                        {/* 🔥 核心改动：极简的 PF Top 50 列表 🔥 */}
                        {profile.topPfScores && profile.topPfScores.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-gray-800/80">
                                <h2 className="text-lg font-bold text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                    <Trophy className="text-purple-400 w-5 h-5" />
                                    Performance (Top 50)
                                </h2>
                                <div className="flex flex-col border-t border-gray-800/50">
                                    {profile.topPfScores.map((score, index) => {
                                        const diffColors = ['text-green-400', 'text-yellow-400', 'text-red-400', 'text-purple-400', 'text-pink-300'];
                                        const diffColor = diffColors[score.difficulty] || 'text-gray-400';

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
            </div>
        </div>
    );
};

export default Profile;