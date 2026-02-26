import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaBullhorn, FaGlobe, FaEnvelope, FaTrophy, FaSyncAlt, FaSpinner, FaUserAstronaut, FaMusic } from 'react-icons/fa';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 模块 1：公告状态
  const [formData, setFormData] = useState({ title: '', type: 'NEWS', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 模块 2：同步状态
  const [isSyncing, setIsSyncing] = useState(false);

  // 模块 3：全服邮件广播状态
  const [broadcastData, setBroadcastData] = useState({ title: '', content: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // 模块 4：定向发送邮件状态
  const [directMessageData, setDirectMessageData] = useState({ targetUid: '', title: '', content: '' });
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // 🌟 模块 5：赛事录入状态 (橙色专属)
  const [qualifierData, setQualifierData] = useState({ 
    targetUid: '', 
    songName: '', 
    level: '3', // 默认紫谱
    achievement: '', 
    dxScore: '' 
  });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // 🛡️ 前端拦截：如果没登录或者不是 ADM / TO，直接劝退
  if (!user || !['ADM', 'TO'].includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold text-red-500 mb-4">ACCESS DENIED</h1>
        <p className="text-gray-400">你没有权限访问中控台。</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition">返回主页</button>
      </div>
    );
  }

  // --- 处理公告发布 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/announcements', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ 发布成功！全站已同步。');
      setFormData({ title: '', type: 'NEWS', content: '' });
      navigate('/'); 
    } catch (err) {
      alert('❌ ' + (err.response?.data?.msg || '发布失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 处理全服系统邮件广播 ---
  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.content) {
      alert('标题和内容不能为空！');
      return;
    }
    if (!window.confirm(`⚠️ 警告：确定要向全站所有注册玩家发送这封系统邮件吗？\n\n标题：${broadcastData.title}\n\n此操作不可撤回！`)) return;
    
    setIsBroadcasting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/broadcast-message', broadcastData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ ' + res.data.message);
      setBroadcastData({ title: '', content: '' });
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || '广播失败'));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // --- 处理定向发信 ---
  const handleSendDirect = async () => {
    if (!directMessageData.targetUid || !directMessageData.title || !directMessageData.content) {
      alert('请填写完整信息！');
      return;
    }
    setIsSendingDirect(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/send-message', directMessageData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ ' + res.data.message);
      setDirectMessageData({ targetUid: '', title: '', content: '' });
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || '发送失败'));
    } finally {
      setIsSendingDirect(false);
    }
  };

  // --- 🏆 处理预选赛成绩录入 ---
  const handleQualifierSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingScore(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/qualifier-score', qualifierData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ ' + res.data.msg);
      // 清空表单（保留 UID 方便连续录入）
      setQualifierData({ ...qualifierData, songName: '', achievement: '', dxScore: '' });
    } catch (err) {
      alert('❌ ' + (err.response?.data?.msg || '录入失败，请检查 UID 和网络'));
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // --- 处理曲库同步 ---
  const handleSyncSongs = async () => {
    if (!window.confirm('确定要全量同步水鱼曲库吗？这可能需要几秒钟的时间。')) return;
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/sync-songs', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ ' + res.data.msg);
    } catch (err) {
      alert('❌ ' + (err.response?.data?.msg || '同步失败'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-5xl mx-auto pt-24">
      
      {/* 头部标题 */}
      <div className="mb-12 border-b border-white/10 pb-6">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          ADM CONTROL.
        </h1>
        <p className="text-gray-400 font-mono text-sm tracking-[0.2em] uppercase mt-2">
          System Administration & Tournament Operations
        </p>
      </div>

      {/* ========================================================= */}
      {/* 模块 5：预选赛成绩录入 (橙色赛事专属 UI) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border-2 border-orange-500/50 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(249,115,22,0.15)] mb-12 relative overflow-hidden">
        <FaTrophy className="absolute -right-10 -top-10 text-[150px] text-orange-500/10 -rotate-12 pointer-events-none" />
        
        <h2 className="text-2xl md:text-3xl font-black italic tracking-tight text-orange-400 mb-6 flex items-center gap-3 relative z-10">
          <FaTrophy className="text-yellow-400" />
          QUALIFIER ENTRY / 赛事成绩核录
        </h2>
        
        <form onSubmit={handleQualifierSubmit} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase flex items-center gap-2">
                <FaUserAstronaut /> 选手 UID
              </label>
              <input 
                type="number" required
                value={qualifierData.targetUid} onChange={(e) => setQualifierData({...qualifierData, targetUid: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors font-mono text-lg"
                placeholder="例如: 10001"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase flex items-center gap-2">
                <FaMusic /> 指定曲目名称 (Song Name)
              </label>
              <input 
                type="text" required
                value={qualifierData.songName} onChange={(e) => setQualifierData({...qualifierData, songName: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors"
                placeholder="需与水鱼查分器曲名完全一致"
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">谱面难度</label>
              <select 
                value={qualifierData.level} onChange={(e) => setQualifierData({...qualifierData, level: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors appearance-none font-bold cursor-pointer"
              >
                <option value="0" className="text-green-400">BASIC (绿)</option>
                <option value="1" className="text-yellow-400">ADVANCED (黄)</option>
                <option value="2" className="text-red-400">EXPERT (红)</option>
                <option value="3" className="text-purple-400">MASTER (紫)</option>
                <option value="4" className="text-purple-200">Re:MASTER (白)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">达成率 (%)</label>
              <input 
                type="number" step="0.0001" required
                value={qualifierData.achievement} onChange={(e) => setQualifierData({...qualifierData, achievement: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-yellow-400 focus:border-orange-500 outline-none transition-colors font-mono text-xl font-bold"
                placeholder="例如: 100.5000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">DX 分数</label>
              <input 
                type="number" required
                value={qualifierData.dxScore} onChange={(e) => setQualifierData({...qualifierData, dxScore: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors font-mono text-xl font-bold"
                placeholder="例如: 2550"
              />
            </div>
          </div>

          <button 
            type="submit" disabled={isSubmittingScore}
            className="w-full py-4 mt-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-black tracking-[0.2em] rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 flex justify-center items-center gap-2 text-lg"
          >
            {isSubmittingScore ? <FaSpinner className="animate-spin" /> : <FaTrophy />}
            {isSubmittingScore ? 'VERIFYING & SUBMITTING...' : 'CONFIRM TOURNAMENT SCORE'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* ========================================================= */}
        {/* 模块 1：发布公告指令 (红色警戒) */}
        {/* ========================================================= */}
        <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 md:p-8 shadow-xl">
          <h2 className="text-2xl font-black italic tracking-tight text-white mb-6 flex items-center gap-3">
            <FaBullhorn className="text-red-400" />
            BROADCAST / 发布公告
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" required
              value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors"
              placeholder="公告标题"
            />
            <select 
              value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors font-bold"
            >
              <option value="NEWS" className="text-blue-400">NEWS (普通新闻)</option>
              <option value="UPDATE" className="text-green-400">UPDATE (系统更新)</option>
              <option value="EVENT" className="text-purple-400">EVENT (活动赛事)</option>
              <option value="ALERT" className="text-red-400">ALERT (紧急通知)</option>
            </select>
            <textarea 
              required rows="8"
              value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white outline-none focus:border-red-500 transition-colors resize-y font-mono text-sm"
              placeholder="[b]加粗[/b] | [img]图片直链[/img] | [color=red]红字[/color]"
            />
            <button 
              type="submit" disabled={isSubmitting}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
            >
              {isSubmitting ? <FaSpinner className="animate-spin" /> : 'EXECUTE / 立即发布'}
            </button>
          </form>
        </div>

        <div className="space-y-8 flex flex-col justify-between">
          {/* ========================================================= */}
          {/* 模块 3：全服广播邮件 (紫色高级指令) */}
          {/* ========================================================= */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl font-black italic tracking-tight text-white mb-4 flex items-center gap-3">
              <FaGlobe className="text-purple-400" />
              GLOBAL INBOX / 全服邮件
            </h2>
            <p className="text-gray-400 text-xs mb-4">瞬间推送到全站玩家收件箱。此操作不可撤回。</p>
            <div className="space-y-4">
              <input 
                type="text" 
                value={broadcastData.title} onChange={(e) => setBroadcastData({...broadcastData, title: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors text-sm"
                placeholder="邮件标题"
              />
              <textarea 
                rows="4"
                value={broadcastData.content} onChange={(e) => setBroadcastData({...broadcastData, content: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-colors resize-y text-sm"
                placeholder="邮件正文内容..."
              />
              <button 
                onClick={handleBroadcast} disabled={isBroadcasting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
              >
                {isBroadcasting ? <FaSpinner className="animate-spin" /> : 'BROADCAST / 发送广播'}
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 模块 4：定向系统邮件 (绿色精准投递) */}
          {/* ========================================================= */}
          <div className="bg-black/40 backdrop-blur-xl border border-green-500/30 rounded-3xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl font-black italic tracking-tight text-white mb-4 flex items-center gap-3">
              <FaEnvelope className="text-green-400" />
              DIRECT MAIL / 定向邮件
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <input 
                  type="number" 
                  value={directMessageData.targetUid} onChange={(e) => setDirectMessageData({...directMessageData, targetUid: e.target.value})}
                  className="w-1/3 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors text-sm font-mono"
                  placeholder="UID"
                />
                <input 
                  type="text" 
                  value={directMessageData.title} onChange={(e) => setDirectMessageData({...directMessageData, title: e.target.value})}
                  className="w-2/3 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors text-sm"
                  placeholder="邮件标题"
                />
              </div>
              <textarea 
                rows="3"
                value={directMessageData.content} onChange={(e) => setDirectMessageData({...directMessageData, content: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-green-500 outline-none transition-colors resize-y text-sm"
                placeholder="违规警告或专属通知内容..."
              />
              <button 
                onClick={handleSendDirect} disabled={isSendingDirect}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
              >
                {isSendingDirect ? <FaSpinner className="animate-spin" /> : 'SEND DIRECT / 发送'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 模块 2：高危操作 - 数据同步 (蓝色科技感) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <h2 className="text-2xl font-black italic tracking-tight text-blue-500 mb-4 flex items-center gap-3">
          <FaSyncAlt className="text-blue-400" />
          SYSTEM SYNC / 核心数据同步
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-gray-400 text-sm leading-relaxed max-w-lg">
            将从水鱼查分器同步最新的曲目列表、定数 (DS) 以及等级信息。
            <span className="text-red-400 ml-1">执行此操作需要消耗大量服务器资源，仅在游戏大版本更新或新曲实装时执行。</span>
          </div>
          <button 
            onClick={handleSyncSongs} disabled={isSyncing}
            className="px-8 py-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 whitespace-nowrap"
          >
            {isSyncing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
            {isSyncing ? 'DOWNLOADING...' : '开始同步全量曲库'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Admin;