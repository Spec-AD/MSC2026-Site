import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FaBug, FaLightbulb, FaExclamationTriangle, FaCheckCircle, FaClock, FaTimesCircle, FaEdit, FaTrash, FaRedoAlt, FaSpinner, FaThumbtack, FaReply, FaFilter } from 'react-icons/fa';
import FallingIcons from '../components/FallingIcons';

const Feedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 表单与状态
  const [formData, setFormData] = useState({ title: '', content: '', type: 'FEATURE' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  // 筛选器状态 (默认全选)
  const [filters, setFilters] = useState(['PENDING', 'SOLVED', 'CLOSED']);
  
  // 回复输入框状态 (对象结构，键为 feedbackId，值为输入内容)
  const [replyInputs, setReplyInputs] = useState({});
  const [isReplying, setIsReplying] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/feedback');
      setFeedbacks(res.data);
    } catch (err) {
      console.error('Failed to fetch feedbacks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return alert('标题和正文不能为空');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      if (editingId) {
        await axios.put(`/api/feedback/${editingId}`, formData, { headers });
      } else {
        await axios.post('/api/feedback', formData, { headers });
      }
      setFormData({ title: '', content: '', type: 'FEATURE' });
      setEditingId(null);
      fetchFeedbacks();
    } catch (err) {
      alert(err.response?.data?.message || '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', type: 'FEATURE' });
  };

  const handleEditClick = (fb) => {
    setEditingId(fb._id);
    setFormData({ title: fb.title, content: fb.content, type: fb.type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这条反馈吗？')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/feedback/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchFeedbacks();
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/feedback/${id}/status`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      fetchFeedbacks();
    } catch (err) {
      alert(err.response?.data?.message || '状态更新失败');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/feedback/${id}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchFeedbacks();
    } catch (err) {
      alert('置顶操作失败');
    }
  };

  const handleReplySubmit = async (feedbackId) => {
    const content = replyInputs[feedbackId];
    if (!content || !content.trim()) return;
    setIsReplying(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/feedback/${feedbackId}/reply`, { content }, { headers: { Authorization: `Bearer ${token}` } });
      setReplyInputs({ ...replyInputs, [feedbackId]: '' }); // 清空该帖子的输入框
      fetchFeedbacks();
    } catch (err) {
      alert('回复失败');
    } finally {
      setIsReplying(false);
    }
  };

  const toggleFilter = (status) => {
    setFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const renderTypeBadge = (type) => {
    const config = {
      FEATURE: { color: 'text-green-400 border-green-500/30 bg-green-500/10', icon: <FaLightbulb />, text: 'Feature' },
      PROBLEM: { color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', icon: <FaExclamationTriangle />, text: 'Problem' },
      BUG: { color: 'text-red-400 border-red-500/30 bg-red-500/10', icon: <FaBug />, text: 'Bug' },
    };
    const c = config[type] || config.FEATURE;
    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${c.color}`}>
        {c.icon} {c.text}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const config = {
      PENDING: { color: 'text-yellow-400', icon: <FaClock className="animate-pulse" />, text: 'PENDING' },
      SOLVED: { color: 'text-green-400', icon: <FaCheckCircle />, text: 'SOLVED' },
      CLOSED: { color: 'text-gray-500', icon: <FaTimesCircle />, text: 'CLOSED' },
    };
    const c = config[status] || config.PENDING;
    return (
      <div className={`flex items-center gap-1.5 text-xs font-black tracking-widest ${c.color}`}>
        {c.icon} {c.text}
      </div>
    );
  };

  const renderTime = (createdAt, updatedAt) => {
    const cTime = new Date(createdAt);
    const uTime = new Date(updatedAt);
    const isEdited = uTime.getTime() - cTime.getTime() > 1000;
    return (
      <div className="text-[10px] text-gray-500 font-mono tracking-wider">
        {isEdited ? '重编于 ' : '发布于 '}
        {(isEdited ? uTime : cTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </div>
    );
  };

  const canReappeal = (statusUpdatedAt) => {
    if (!statusUpdatedAt) return false;
    const hoursSinceSolved = (Date.now() - new Date(statusUpdatedAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceSolved >= 2;
  };

  // 过滤后的反馈列表
  const filteredFeedbacks = feedbacks.filter(fb => filters.includes(fb.status));

  return (
    <div className="w-full min-h-screen text-white pt-24 pb-20 px-4 md:px-8 font-sans relative overflow-x-hidden bg-gradient-to-b from-transparent to-black/80">
      <FallingIcons />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-12 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">
              FEEDBACK 反馈
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-3 tracking-widest uppercase font-mono">
              Help us shape the future of purebeat.top
            </p>
          </div>

          {/* 状态多选过滤器 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 mr-2"><FaFilter/> Filter:</span>
            {['PENDING', 'SOLVED', 'CLOSED'].map(status => {
               const isActive = filters.includes(status);
               return (
                 <button 
                   key={status}
                   onClick={() => toggleFilter(status)}
                   className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all border ${
                     isActive ? 'bg-white text-black border-white' : 'bg-black/40 text-gray-400 border-gray-700 hover:border-gray-500'
                   }`}
                 >
                   {status}
                 </button>
               )
            })}
          </div>
        </div>

        {/* 提交反馈表单 (需登录) */}
        {user ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              {editingId ? <FaEdit className="text-blue-400"/> : <FaLightbulb className="text-yellow-400"/>}
              {editingId ? 'Edit Your Post' : 'Submit a New Post'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="bg-black/60 border border-gray-700 text-sm font-bold text-gray-200 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors w-full md:w-1/4 uppercase tracking-wider"
                >
                  <option value="FEATURE">Feature (建议)</option>
                  <option value="PROBLEM">Problem (非代码问题)</option>
                  <option value="BUG">Bug (代码报错)</option>
                </select>
                <input 
                  type="text" 
                  placeholder="标题" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-black/60 border border-gray-700 text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors flex-1 placeholder:text-gray-600"
                  required
                />
              </div>
              <textarea 
                placeholder="详细描述你的问题或建议..." 
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full bg-black/60 border border-gray-700 text-gray-300 text-sm rounded-lg p-4 h-32 outline-none focus:border-blue-500 transition-colors resize-none placeholder:text-gray-600"
                required
              />
              <div className="flex justify-end gap-3 pt-2">
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="px-6 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-all uppercase tracking-widest">
                    Cancel
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-2 rounded-full text-xs font-bold text-black bg-white hover:bg-gray-200 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : (editingId ? 'Update Post' : 'Submit Post')}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="mb-16 bg-gray-900/30 border border-gray-800/50 rounded-2xl p-8 text-center backdrop-blur-sm">
            <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-4">Login required to submit feedback</p>
            <button onClick={() => window.location.href='/login'} className="px-6 py-2 rounded-full text-xs font-bold text-white border border-white/20 hover:bg-white/10 transition-all uppercase tracking-widest">
              Go to Login
            </button>
          </div>
        )}

        {/* 反馈大厅列表 */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20"><FaSpinner className="animate-spin text-3xl text-gray-600 mx-auto" /></div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-20 text-gray-600 font-mono text-sm uppercase tracking-widest">No matching posts found.</div>
          ) : (
            filteredFeedbacks.map((fb, index) => {
              const currentUserId = user ? (user.id || user._id) : null; 
              const isAuthor = user && fb.author && fb.author._id === currentUserId;
              const isADM = user && user.role === 'ADM';

              return (
                <motion.div 
                  layout // 允许动画平滑过渡过滤
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.05 }}
                  key={fb._id} 
                  className={`bg-black/40 backdrop-blur-md border rounded-xl transition-colors ${fb.isPinned ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-gray-800 hover:border-gray-700'} ${fb.status === 'CLOSED' ? 'opacity-60 grayscale' : ''}`}
                >
                  {/* 主帖区域 */}
                  <div className="p-5 md:p-6">
                    {/* 顶部：头像、信息与状态 */}
                    <div className="flex justify-between items-start mb-4 border-b border-gray-800/50 pb-4 relative">
                      {fb.isPinned && (
                        <div className="absolute -top-6 -left-2 text-purple-400 text-xl transform -rotate-45 drop-shadow-md">
                          <FaThumbtack />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <img src={fb.author?.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-10 h-10 rounded-full border border-gray-700 object-cover bg-gray-900" />
                        <div>
                          <div className="text-sm font-bold text-gray-200 flex items-center gap-2">
                            {fb.author?.username || 'Unknown User'}
                            {fb.author?.role === 'ADM' && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">ADM</span>}
                          </div>
                          {renderTime(fb.createdAt, fb.updatedAt)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(fb.status)}
                        {fb.isPinned && <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Pinned</span>}
                      </div>
                    </div>

                    {/* 中部：徽章、标题与正文 */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        {renderTypeBadge(fb.type)}
                        <h3 className="text-lg font-bold text-white leading-tight">{fb.title}</h3>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mt-3 pl-1">
                        {fb.content}
                      </p>
                    </div>

                    {/* 底部：操作按钮区 */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
                      
                      {/* ADM 专属：置顶/取消置顶 */}
                      {isADM && (
                        <button onClick={() => handleTogglePin(fb._id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${fb.isPinned ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                          <FaThumbtack /> {fb.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}

                      {isADM && fb.status === 'PENDING' && (
                        <button onClick={() => handleStatusChange(fb._id, 'SOLVE')} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 text-[10px] font-bold uppercase tracking-widest transition-colors">
                          <FaCheckCircle /> Mark Solved
                        </button>
                      )}

                      {isAuthor && fb.status === 'SOLVED' && (
                        <button 
                          onClick={() => handleStatusChange(fb._id, 'REAPPEAL')} 
                          disabled={!canReappeal(fb.statusUpdatedAt)}
                          title={!canReappeal(fb.statusUpdatedAt) ? "需在标记解决 2 小时后方可重申" : ""}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <FaRedoAlt /> Re-appeal
                        </button>
                      )}

                      {isAuthor && fb.status !== 'CLOSED' && (
                        <button onClick={() => handleEditClick(fb)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                          <FaEdit /> Edit
                        </button>
                      )}

                      {(isAuthor || isADM) && (
                        <button onClick={() => handleDelete(fb._id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-bold uppercase tracking-widest transition-colors">
                          <FaTrash /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 盖楼回复区 */}
                  <div className="bg-black/30 border-t border-gray-800/80 p-5 md:p-6 rounded-b-xl">
                    {/* 历史回复列表 */}
                    {fb.replies && fb.replies.length > 0 && (
                      <div className="space-y-4 mb-4">
                        {fb.replies.map(reply => (
                          <div key={reply._id} className="flex gap-3 items-start">
                            <img src={reply.author?.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-6 h-6 rounded-full border border-gray-700 object-cover shrink-0" />
                            <div className="flex-1 bg-gray-900/50 border border-gray-800/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-300">{reply.author?.username || 'Unknown'}</span>
                                {reply.author?.role === 'ADM' && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded uppercase">ADM</span>}
                                <span className="text-[9px] text-gray-600 font-mono ml-auto">
                                  {new Date(reply.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                               </span>
                              </div>
                              <p className="text-sm text-gray-400 whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 回复输入框 (需登录) */}
                    {user ? (
                      <div className="flex gap-3">
                        <img src={user.avatarUrl || '/assets/logos.png'} alt="my-avatar" className="w-6 h-6 rounded-full border border-gray-700 object-cover shrink-0 mt-1" />
                        <div className="flex-1 flex items-start gap-2">
                          <textarea 
                            value={replyInputs[fb._id] || ''}
                            onChange={(e) => setReplyInputs({...replyInputs, [fb._id]: e.target.value})}
                            placeholder="Type a reply..."
                            className="w-full bg-black/60 border border-gray-700 text-gray-300 text-xs rounded p-2.5 h-10 min-h-[40px] outline-none focus:border-blue-500 transition-colors resize-y"
                          />
                          <button 
                            onClick={() => handleReplySubmit(fb._id)}
                            disabled={isReplying || !replyInputs[fb._id]?.trim()}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-2.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <FaReply className="text-[10px]" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-gray-600 uppercase tracking-widest font-mono">
                        Login to join the discussion
                      </div>
                    )}
                  </div>

                </motion.div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};


export default Feedback;
