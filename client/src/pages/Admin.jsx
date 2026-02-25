import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

  // 🛡️ 前端拦截：如果没登录或者不是 ADM，直接劝退
  if (!user || user.role !== 'ADM') {
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
      await axios.post('/api/announcements', formData);
      alert('发布成功！全站已同步。');
      setFormData({ title: '', type: 'NEWS', content: '' }); // 清空表单
      navigate('/'); // 发完跳回主页看效果
    } catch (err) {
      alert(err.response?.data?.msg || '发布失败');
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
      setBroadcastData({ title: '', content: '' }); // 发送成功后清空
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || '广播失败'));
    } finally {
      setIsBroadcasting(false);
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
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto text-white">
      
      {/* ========================================================= */}
      {/* 模块 1：发布公告指令 (红色警戒) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] mb-12">
        <h2 className="text-3xl font-black italic tracking-tight text-red-500 mb-6 border-b border-red-500/20 pb-4">
          ADM 控制台 / 发布指令
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">公告标题</label>
              <input 
                type="text" required
                value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors"
                placeholder="例如：MSC 2026 预选赛正式打响"
              />
            </div>
            <div className="md:w-1/3 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">标签类型</label>
              <select 
                value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors appearance-none"
              >
                <option value="TOURNAMENT">赛事 (TOURNAMENT)</option>
                <option value="RECRUITMENT">招募 (RECRUITMENT)</option>
                <option value="SYSTEM">系统 (SYSTEM)</option>
                <option value="NEWS">新闻 (NEWS)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">
              公告内容 <span className="text-xs text-red-400 lowercase normal-case">(支持 BBCode)</span>
            </label>
            <textarea 
              required rows="12"
              value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-red-500 outline-none transition-colors font-mono resize-y"
              placeholder="[b]加粗[/b] | [img]图片直链[/img] | [color=red]红字[/color]"
            />
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
          >
            {isSubmitting ? '正在传输指令...' : 'EXECUTE / 立即发布'}
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* 模块 3：全服广播邮件 (紫色高级指令) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)] mb-12">
        <h2 className="text-3xl font-black italic tracking-tight text-purple-500 mb-6 border-b border-purple-500/20 pb-4">
          GLOBAL BROADCAST / 全服系统邮件
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6 text-gray-400 text-sm">
          <p>
            <span className="font-bold text-white">» 直接触达全站玩家收件箱</span><br />
            在此处发送的邮件，将会瞬间推送到<strong className="text-purple-400 mx-1">全站所有已注册用户</strong>的个人 Inbox（收件箱）中。发送后所有用户的信封图标将会亮起小红点。
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">邮件标题</label>
            <input 
              type="text" 
              value={broadcastData.title} 
              onChange={(e) => setBroadcastData({...broadcastData, title: e.target.value})}
              className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
              placeholder="例如：比赛延期通知 / 节日福利发放"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">邮件正文</label>
            <textarea 
              rows="6"
              value={broadcastData.content} 
              onChange={(e) => setBroadcastData({...broadcastData, content: e.target.value})}
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-colors resize-y"
              placeholder="请输入要广播给所有玩家的详细内容..."
            />
          </div>

          <button 
            onClick={handleBroadcast}
            disabled={isBroadcasting}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
          >
            {isBroadcasting ? '正在全网投递...' : 'BROADCAST / 发送全站广播'}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 模块 2：高危操作 - 数据同步 (蓝色科技感) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <h2 className="text-3xl font-black italic tracking-tight text-blue-500 mb-6 border-b border-blue-500/20 pb-4">
          SYSTEM SYNC / 核心数据同步
        </h2>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-gray-400 text-sm leading-relaxed max-w-lg">
            <p className="font-bold text-white mb-1">» 舞萌 DX 全量曲库 (Diving-Fish API)</p>
            将从水鱼查分器同步最新的曲目列表、定数 (DS) 以及等级信息。
            <span className="text-red-400 ml-1">执行此操作需要消耗大量服务器资源，请勿频繁点击。当游戏有大版本更新或新歌实装时执行即可。</span>
          </div>
          
          <button 
            onClick={handleSyncSongs}
            disabled={isSyncing}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 whitespace-nowrap"
          >
            {isSyncing ? '正在同步数据中...' : '开始同步全量曲库'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Admin;