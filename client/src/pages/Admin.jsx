import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaBullhorn, FaGlobe, FaEnvelope, FaTrophy, FaSyncAlt, FaSpinner, FaBook, FaCheck, FaTimes } from 'react-icons/fa';

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

  // 模块 5：预选赛状态
  const [qualifierData, setQualifierData] = useState({ targetUid: '', songName: '', level: '3', achievement: '', dxScore: '' });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // 🌟 模块 6：WIKI 管理状态
  const [wikiFormData, setWikiFormData] = useState({ title: '', slug: '', category: 'COMMUNITY', content: '' });
  const [isSubmittingWiki, setIsSubmittingWiki] = useState(false);
  const [pendingWikis, setPendingWikis] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // --- 获取待审核 Wiki 列表 ---
  useEffect(() => {
    if (user && ['ADM', 'TO'].includes(user.role)) {
      fetchPendingWikis();
    }
  }, [user]);

  const fetchPendingWikis = async () => {
    setIsLoadingPending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/wiki/pending', { headers: { Authorization: `Bearer ${token}` }});
      setPendingWikis(res.data);
    } catch (err) {
      console.error('获取待审核维基失败', err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // 🛡️ 前端拦截
  if (!user || !['ADM', 'TO'].includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold text-red-500 mb-4">ACCESS DENIED</h1>
        <p className="text-gray-400">你没有权限访问中控台。</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition">返回主页</button>
      </div>
    );
  }

  // --- 各种处理函数 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/announcements', formData, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ 发布成功！全站已同步。');
      setFormData({ title: '', type: 'NEWS', content: '' });
      navigate('/'); 
    } catch (err) { alert('❌ ' + (err.response?.data?.msg || '发布失败')); } finally { setIsSubmitting(false); }
  };

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.content) return alert('标题和内容不能为空！');
    if (!window.confirm(`⚠️ 警告：确定要向全站所有注册玩家发送这封系统邮件吗？\n此操作不可撤回！`)) return;
    setIsBroadcasting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/broadcast-message', broadcastData, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ ' + res.data.message); setBroadcastData({ title: '', content: '' });
    } catch (err) { alert('❌ ' + (err.response?.data?.message || '广播失败')); } finally { setIsBroadcasting(false); }
  };

  const handleSendDirect = async () => {
    if (!directMessageData.targetUid || !directMessageData.title || !directMessageData.content) return alert('请填写完整信息！');
    setIsSendingDirect(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/send-message', directMessageData, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ ' + res.data.message); setDirectMessageData({ targetUid: '', title: '', content: '' });
    } catch (err) { alert('❌ ' + (err.response?.data?.message || '发送失败')); } finally { setIsSendingDirect(false); }
  };

  const handleQualifierSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingScore(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/qualifier-score', qualifierData, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ ' + res.data.msg); setQualifierData({ targetUid: qualifierData.targetUid, songName: '', level: '3', achievement: '', dxScore: '' });
    } catch (err) { alert('❌ ' + (err.response?.data?.msg || '录入失败')); } finally { setIsSubmittingScore(false); }
  };

  const handleSyncSongs = async () => {
    if (!window.confirm('确定要全量同步水鱼曲库吗？这可能需要几秒钟的时间。')) return;
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/sync-songs', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ ' + res.data.msg);
    } catch (err) { alert('❌ ' + (err.response?.data?.msg || '同步失败')); } finally { setIsSyncing(false); }
  };

  // 🌟 处理 Wiki 提交
  const handleWikiSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingWiki(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/wiki/submit', wikiFormData, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ ' + res.data.msg);
      setWikiFormData({ title: '', slug: '', category: 'COMMUNITY', content: '' }); // 清空
    } catch (err) {
      alert('❌ ' + (err.response?.data?.msg || '词条发布失败，可能是 URL 标识已存在'));
    } finally {
      setIsSubmittingWiki(false);
    }
  };

  // 🌟 处理 Wiki 审核
  const handleReviewWiki = async (id, action) => {
    let rejectReason = '';
    if (action === 'REJECT') {
      rejectReason = window.prompt('请输入退回理由（玩家将可见）：', '内容不符合社区 Wiki 规范');
      if (rejectReason === null) return; // 点击了取消
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/admin/wiki/review/${id}`, { action, rejectReason }, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ ' + res.data.msg);
      fetchPendingWikis(); // 刷新列表
    } catch (err) {
      alert('❌ 操作失败');
    }
  };

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-6xl mx-auto pt-24">
      
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
      {/* 🌟 模块 6：WIKI 知识库管理 (青色专属) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(34,211,238,0.1)] mb-12">
        <h2 className="text-2xl md:text-3xl font-black italic tracking-tight text-cyan-400 mb-6 border-b border-cyan-500/20 pb-4 flex items-center gap-3">
          <FaBook /> WIKI DATABASE / 维基知识库管理
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* 左侧：直接发布新词条 */}
          <div>
            <h3 className="text-gray-300 font-bold tracking-widest uppercase text-sm mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> 编写与发布 (Admin Direct Post)
            </h3>
            <form onSubmit={handleWikiSubmit} className="space-y-4">
              <input 
                type="text" required value={wikiFormData.title} onChange={(e) => setWikiFormData({...wikiFormData, title: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                placeholder="词条标题 (如: PPF 战力算法)"
              />
              <div className="flex gap-4">
                <input 
                  type="text" required value={wikiFormData.slug} onChange={(e) => setWikiFormData({...wikiFormData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                  className="w-1/2 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors font-mono text-sm"
                  placeholder="URL标识 (如: ppf-algo)"
                />
                <select 
                  value={wikiFormData.category} onChange={(e) => setWikiFormData({...wikiFormData, category: e.target.value})}
                  className="w-1/2 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors font-bold text-sm"
                >
                  <option value="COMMUNITY">社区文化 (COMMUNITY)</option>
                  <option value="GUIDE">新手指南 (GUIDE)</option>
                  <option value="SYSTEM">系统机制 (SYSTEM)</option>
                  <option value="TOURNAMENT">赛事规程 (TOURNAMENT)</option>
                  <option value="ARCHIVE">历史编纂 (ARCHIVE)</option>
                </select>
              </div>
              <textarea 
                required rows="8" value={wikiFormData.content} onChange={(e) => setWikiFormData({...wikiFormData, content: e.target.value})}
                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition-colors font-mono text-sm resize-y"
                placeholder="词条正文内容 (支持 BBCode, 作为 ADM 提交将免审直接发布)"
              />
              <button 
                type="submit" disabled={isSubmittingWiki}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isSubmittingWiki ? <FaSpinner className="animate-spin mx-auto" /> : 'PUBLISH WIKI ENTRY'}
              </button>
            </form>
          </div>

          {/* 右侧：玩家共建审核中心 */}
          <div className="flex flex-col">
            <h3 className="text-gray-300 font-bold tracking-widest uppercase text-sm mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span> 审核大厅 (Pending Review)
            </h3>
            
            <div className="flex-1 bg-black/50 border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[480px] custom-scrollbar">
              {isLoadingPending ? (
                <div className="py-20 flex justify-center"><FaSpinner className="animate-spin text-cyan-500 text-3xl" /></div>
              ) : pendingWikis.length === 0 ? (
                <div className="text-center py-20 text-gray-500 font-mono tracking-widest text-sm">
                  ALL CLEAR / 暂无待审核词条
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingWikis.map(wiki => (
                    <div key={wiki._id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-cyan-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-lg truncate pr-4">{wiki.title}</h4>
                        <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">PENDING</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono mb-4 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Slug: {wiki.slug}</span>
                        <span>Author: <span className="text-cyan-400">{wiki.author?.username}</span></span>
                      </div>
                      
                      {/* 截取部分正文预览 */}
                      <div className="text-xs text-gray-500 line-clamp-2 mb-4 bg-black/40 p-2 rounded">
                        {wiki.content}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleReviewWiki(wiki._id, 'APPROVE')}
                          className="flex-1 py-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                        >
                          <FaCheck /> 通过并发布
                        </button>
                        <button 
                          onClick={() => handleReviewWiki(wiki._id, 'REJECT')}
                          className="flex-1 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                        >
                          <FaTimes /> 退回重写
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 模块 5：预选赛成绩录入 (橙色) */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-orange-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(249,115,22,0.1)] mb-12">
        <h2 className="text-2xl md:text-3xl font-black italic tracking-tight text-orange-400 mb-6 border-b border-orange-500/20 pb-4 flex items-center gap-3">
          <FaTrophy className="text-yellow-400" /> TOURNAMENT ENTRY / 预选赛录入
        </h2>
        <form onSubmit={handleQualifierSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/4 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">选手 UID</label>
              <input type="number" required value={qualifierData.targetUid} onChange={(e) => setQualifierData({...qualifierData, targetUid: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors" placeholder="UID" />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">指定曲目名称</label>
              <input type="text" required value={qualifierData.songName} onChange={(e) => setQualifierData({...qualifierData, songName: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors" placeholder="例如：Grievous Lady" />
            </div>
            <div className="md:w-1/4 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">谱面难度</label>
              <select value={qualifierData.level} onChange={(e) => setQualifierData({...qualifierData, level: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors appearance-none font-bold">
                <option value="2" className="text-red-400">EXPERT (红谱)</option>
                <option value="3" className="text-purple-400">MASTER (紫谱)</option>
                <option value="4" className="text-purple-200">Re:MASTER (白谱)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">达成率 (%)</label>
              <input type="number" step="0.0001" required value={qualifierData.achievement} onChange={(e) => setQualifierData({...qualifierData, achievement: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors font-mono" placeholder="例如：100.5000" />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-gray-400 tracking-widest uppercase">DX 分数</label>
              <input type="number" required value={qualifierData.dxScore} onChange={(e) => setQualifierData({...qualifierData, dxScore: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors font-mono" placeholder="例如：2550" />
            </div>
          </div>
          <button type="submit" disabled={isSubmittingScore} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50">
            {isSubmittingScore ? '正在核录成绩...' : 'SUBMIT QUALIFIER SCORE'}
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* 其余模块 (发布公告、全服广播、定向邮件、曲库同步) 紧密排列 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* 模块 1：发布公告指令 (红色警戒) */}
        <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white mb-6 flex items-center gap-3">
            <FaBullhorn className="text-red-400" /> BROADCAST / 发布公告
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors" placeholder="公告标题" />
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors font-bold">
              <option value="NEWS" className="text-blue-400">NEWS (普通新闻)</option>
              <option value="UPDATE" className="text-green-400">UPDATE (系统更新)</option>
              <option value="EVENT" className="text-purple-400">EVENT (活动赛事)</option>
              <option value="ALERT" className="text-red-400">ALERT (紧急通知)</option>
            </select>
            <textarea required rows="8" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white outline-none focus:border-red-500 transition-colors resize-y font-mono text-sm" placeholder="[b]加粗[/b] | [img]直链[/img]" />
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center">
              {isSubmitting ? <FaSpinner className="animate-spin" /> : 'EXECUTE / 立即发布'}
            </button>
          </form>
        </div>

        <div className="space-y-8 flex flex-col">
          {/* 模块 3：全服广播邮件 */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-xl flex-1">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white mb-4 flex items-center gap-3">
              <FaGlobe className="text-purple-400" /> GLOBAL INBOX / 全服邮件
            </h2>
            <div className="space-y-4">
              <input type="text" value={broadcastData.title} onChange={(e) => setBroadcastData({...broadcastData, title: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors text-sm" placeholder="邮件标题" />
              <textarea rows="4" value={broadcastData.content} onChange={(e) => setBroadcastData({...broadcastData, content: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-colors resize-y text-sm" placeholder="全服推送正文内容..." />
              <button onClick={handleBroadcast} disabled={isBroadcasting} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center">
                {isBroadcasting ? <FaSpinner className="animate-spin" /> : 'BROADCAST / 发送广播'}
              </button>
            </div>
          </div>

          {/* 模块 4：定向系统邮件 */}
          <div className="bg-black/40 backdrop-blur-xl border border-green-500/30 rounded-3xl p-6 md:p-8 shadow-xl flex-1">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white mb-4 flex items-center gap-3">
              <FaEnvelope className="text-green-400" /> DIRECT MAIL / 定向邮件
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <input type="number" value={directMessageData.targetUid} onChange={(e) => setDirectMessageData({...directMessageData, targetUid: e.target.value})} className="w-1/3 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors text-sm font-mono" placeholder="UID" />
                <input type="text" value={directMessageData.title} onChange={(e) => setDirectMessageData({...directMessageData, title: e.target.value})} className="w-2/3 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors text-sm" placeholder="邮件标题" />
              </div>
              <textarea rows="3" value={directMessageData.content} onChange={(e) => setDirectMessageData({...directMessageData, content: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-green-500 outline-none transition-colors resize-y text-sm" placeholder="违规警告或专属通知内容..." />
              <button onClick={handleSendDirect} disabled={isSendingDirect} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center">
                {isSendingDirect ? <FaSpinner className="animate-spin" /> : 'SEND DIRECT / 发送'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 模块 2：高危操作 - 数据同步 */}
      <div className="bg-black/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <h2 className="text-2xl font-black italic tracking-tight text-blue-500 mb-4 flex items-center gap-3">
          <FaSyncAlt className="text-blue-400" /> SYSTEM SYNC / 核心数据同步
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-gray-400 text-sm leading-relaxed max-w-lg">
            将从水鱼查分器同步最新的曲目列表、定数 (DS) 以及等级信息。
            <span className="text-red-400 ml-1">执行此操作需要消耗大量服务器资源，仅在游戏大版本更新或新曲实装时执行。</span>
          </div>
          <button onClick={handleSyncSongs} disabled={isSyncing} className="px-8 py-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 font-bold tracking-widest rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 whitespace-nowrap">
            {isSyncing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
            {isSyncing ? 'DOWNLOADING...' : '开始同步全量曲库'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Admin;