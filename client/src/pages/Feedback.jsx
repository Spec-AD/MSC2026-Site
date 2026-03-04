import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FaBug, FaLightbulb, FaExclamationTriangle, FaCheckCircle, 
  FaClock, FaTimesCircle, FaEdit, FaTrash, FaRedoAlt, 
  FaSpinner, FaThumbtack, FaReply, FaFilter, FaCommentDots 
} from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Feedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  // 表单与状态
  const [formData, setFormData] = useState({ title: '', content: '', type: 'FEATURE' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  // 筛选器状态
  const [filters, setFilters] = useState(['PENDING', 'SOLVED', 'CLOSED']);
  
  // 回复输入框状态
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
    if (!formData.title.trim() || !formData.content.trim()) return addToast('标题和正文不能为空', 'error');
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
      addToast(err.response?.data?.message || '操作失败', 'error');
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
      addToast('删除失败', 'error');
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/feedback/${id}/status`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      fetchFeedbacks();
    } catch (err) {
      addToast(err.response?.data?.message || '状态更新失败', 'error');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/feedback/${id}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchFeedbacks();
    } catch (err) {
      addToast('置顶操作失败', 'error');
    }
  };

  const handleReplySubmit = async (feedbackId) => {
    const content = replyInputs[feedbackId];
    if (!content || !content.trim()) return;
    setIsReplying(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/feedback/${feedbackId}/reply`, { content }, { headers: { Authorization: `Bearer ${token}` } });
      setReplyInputs({ ...replyInputs, [feedbackId]: '' }); 
      fetchFeedbacks();
    } catch (err) {
      addToast('回复失败', 'error');
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
      FEATURE: { color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', icon: <FaLightbulb />, text: '建议' },
      PROBLEM: { color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', icon: <FaExclamationTriangle />, text: '问题' },
      BUG: { color: 'text-rose-400 border-rose-500/20 bg-rose-500/10', icon: <FaBug />, text: '故障' },
    };
    const c = config[type] || config.FEATURE;
    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.color}`}>
        {c.icon} {c.text}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const config = {
      PENDING: { color: 'text-amber-400', icon: <FaClock />, text: '待处理' },
      SOLVED: { color: 'text-emerald-400', icon: <FaCheckCircle />, text: '已解决' },
      CLOSED: { color: 'text-zinc-500', icon: <FaTimesCircle />, text: '已关闭' },
    };
    const c = config[status] || config.PENDING;
    return (
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${c.color}`}>
        {c.icon} {c.text}
      </div>
    );
  };

  const renderTime = (createdAt, updatedAt) => {
    const cTime = new Date(createdAt);
    const uTime = new Date(updatedAt);
    const isEdited = uTime.getTime() - cTime.getTime() > 1000;
    return (
      <div className="text-xs text-zinc-500 font-medium mt-0.5">
        {isEdited ? '重新编辑于 ' : '发布于 '}
        {(isEdited ? uTime : cTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    );
  };

  const canReappeal = (statusUpdatedAt) => {
    if (!statusUpdatedAt) return false;
    const hoursSinceSolved = (Date.now() - new Date(statusUpdatedAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceSolved >= 2;
  };

  const STATUS_DISPLAY = { PENDING: '待处理', SOLVED: '已解决', CLOSED: '已关闭' };
  const filteredFeedbacks = feedbacks.filter(fb => filters.includes(fb.status));

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-zinc-600/40">
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* 头部标题区 */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
              反馈中心
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5 font-medium">
              提交您的建议、问题报告或功能诉求，帮助改进社区体验。
            </p>
          </div>

          {/* 状态筛选器 - 现代化药丸按钮 */}
          <div className="flex items-center gap-2 bg-[#18181c] p-1 rounded-xl border border-white/[0.05]">
            <span className="text-zinc-500 text-sm font-medium pl-3 pr-2 flex items-center gap-1.5">
              <FaFilter className="text-xs"/> 筛选
            </span>
            {Object.entries(STATUS_DISPLAY).map(([status, label]) => {
               const isActive = filters.includes(status);
               return (
                 <button 
                   key={status}
                   onClick={() => toggleFilter(status)}
                   className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                     isActive 
                     ? 'bg-zinc-200 text-zinc-900 shadow-sm' 
                     : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                   }`}
                 >
                   {label}
                 </button>
               )
            })}
          </div>
        </div>

        {/* ========================================= */}
        {/* 提交反馈表单 */}
        {/* ========================================= */}
        {user ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-100 mb-5 flex items-center gap-2">
              {editingId ? <FaEdit className="text-blue-400"/> : <FaCommentDots className="text-zinc-400"/>}
              {editingId ? '编辑反馈' : '发布新反馈'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="bg-[#141418] border border-white/[0.05] text-sm font-medium text-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-500 transition-colors md:w-40 appearance-none"
                >
                  <option value="FEATURE">💡 建议 (Feature)</option>
                  <option value="PROBLEM">⚠️ 问题 (Problem)</option>
                  <option value="BUG">🐛 故障 (Bug)</option>
                </select>
                <input 
                  type="text" 
                  placeholder="标题 (一句话概括)..." 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-[#141418] border border-white/[0.05] text-zinc-100 text-sm rounded-xl px-4 py-3 outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-colors flex-1 placeholder-zinc-600"
                  required
                />
              </div>
              <textarea 
                placeholder="详细描述你的问题或建议..." 
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full bg-[#141418] border border-white/[0.05] text-zinc-300 text-[15px] leading-relaxed rounded-xl p-4 h-32 outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-colors resize-none placeholder-zinc-600"
                required
              />
              <div className="flex justify-end gap-3 pt-2">
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-100 bg-white/[0.02] hover:bg-white/[0.05] transition-all active:scale-95">
                    取消
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-zinc-200 hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[120px] active:scale-95 shadow-sm"
                >
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : (editingId ? '更新内容' : '提交反馈')}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="mb-12 bg-[#18181c] border border-white/[0.05] rounded-2xl p-10 text-center flex flex-col items-center justify-center">
            <FaCommentDots className="text-4xl text-zinc-700 mb-4" />
            <p className="text-zinc-400 text-sm font-medium mb-5">登录后即可提交反馈或参与讨论</p>
            <button onClick={() => window.location.href='/login'} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-900 bg-zinc-200 hover:bg-white transition-all active:scale-95 shadow-sm">
              前往登录
            </button>
          </div>
        )}

        {/* ========================================= */}
        {/* 反馈信息流列表 */}
        {/* ========================================= */}
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 flex justify-center"><FaSpinner className="animate-spin text-3xl text-zinc-600" /></div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm font-medium flex flex-col items-center">
              <FaFilter className="text-3xl mb-3 opacity-20" />
              未找到符合条件的反馈
            </div>
          ) : (
            filteredFeedbacks.map((fb, index) => {
              const currentUserId = user ? (user.id || user._id) : null; 
              const isAuthor = user && fb.author && fb.author._id === currentUserId;
              const isADM = user && user.role === 'ADM';

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  key={fb._id} 
                  className={`bg-[#18181c] border border-white/[0.05] rounded-2xl transition-all shadow-sm ${fb.isPinned ? 'ring-1 ring-zinc-500/30' : ''} ${fb.status === 'CLOSED' ? 'opacity-70 grayscale-[30%]' : ''}`}
                >
                  {/* 反馈卡片主体 */}
                  <div className="p-6 md:p-8">
                    {/* 头部信息区 */}
                    <div className="flex justify-between items-start mb-6 border-b border-white/[0.05] pb-5 relative">
                      <div className="flex items-center gap-4">
                        <img src={fb.author?.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-11 h-11 rounded-full border border-white/[0.05] object-cover bg-[#141418]" />
                        <div>
                          <div className="text-[15px] font-bold text-zinc-100 flex items-center gap-2">
                            {fb.author?.username || '注销用户'}
                            {fb.author?.role === 'ADM' && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-md font-bold">ADM</span>}
                          </div>
                          {renderTime(fb.createdAt, fb.updatedAt)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                        <div className="flex items-center gap-3">
                          {fb.isPinned && <FaThumbtack className="text-zinc-500 text-sm" title="置顶" />}
                          {renderStatusBadge(fb.status)}
                        </div>
                      </div>
                    </div>

                    {/* 正文内容区 */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        {renderTypeBadge(fb.type)}
                        <h3 className="text-xl font-bold text-zinc-100 leading-snug">{fb.title}</h3>
                      </div>
                      <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap mt-2 selection:bg-zinc-600/40">
                        {fb.content}
                      </p>
                    </div>

                    {/* 操作按钮区 (微小图标按钮) */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
                      {isADM && (
                        <button onClick={() => handleTogglePin(fb._id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors">
                          <FaThumbtack /> {fb.isPinned ? '取消置顶' : '置顶'}
                        </button>
                      )}

                      {isADM && fb.status === 'PENDING' && (
                        <button onClick={() => handleStatusChange(fb._id, 'SOLVE')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          <FaCheckCircle /> 标记解决
                        </button>
                      )}

                      {isAuthor && fb.status === 'SOLVED' && (
                        <button 
                          onClick={() => handleStatusChange(fb._id, 'REAPPEAL')} 
                          disabled={!canReappeal(fb.statusUpdatedAt)}
                          title={!canReappeal(fb.statusUpdatedAt) ? "需在解决后 2 小时方可重申" : ""}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <FaRedoAlt /> 重新申诉
                        </button>
                      )}

                      {isAuthor && fb.status !== 'CLOSED' && (
                        <button onClick={() => handleEditClick(fb)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors">
                          <FaEdit /> 编辑
                        </button>
                      )}

                      {(isAuthor || isADM) && (
                        <button onClick={() => handleDelete(fb._id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors">
                          <FaTrash /> 删除
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 盖楼回复区 */}
                  <div className="bg-[#141418] border-t border-white/[0.05] p-6 rounded-b-2xl">
                    
                    {/* 历史回复列表 */}
                    {fb.replies && fb.replies.length > 0 && (
                      <div className="space-y-4 mb-5">
                        {fb.replies.map(reply => (
                          <div key={reply._id} className="flex gap-4 items-start">
                            <img src={reply.author?.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-8 h-8 rounded-full border border-white/[0.05] object-cover shrink-0 bg-[#111115]" />
                            <div className="flex-1 bg-[#1a1a20] border border-white/[0.05] rounded-xl p-4 shadow-sm">
                              <div className="flex justify-between items-baseline mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-zinc-200">{reply.author?.username || '未知用户'}</span>
                                  {reply.author?.role === 'ADM' && <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold">ADM</span>}
                                </div>
                                <span className="text-[11px] text-zinc-500 font-medium">
                                  {new Date(reply.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[14px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 回复输入框 */}
                    {user ? (
                      <div className="flex gap-4">
                        <img src={user.avatarUrl || '/assets/logos.png'} alt="my-avatar" className="w-8 h-8 rounded-full border border-white/[0.05] object-cover shrink-0" />
                        <div className="flex-1 flex flex-col md:flex-row items-start md:items-stretch gap-2">
                          <textarea 
                            value={replyInputs[fb._id] || ''}
                            onChange={(e) => setReplyInputs({...replyInputs, [fb._id]: e.target.value})}
                            placeholder="写下你的回复..."
                            className="w-full bg-[#1a1a20] border border-white/[0.05] text-zinc-200 text-sm rounded-xl p-3 h-11 min-h-[44px] outline-none focus:border-zinc-500 focus:bg-[#1f1f26] transition-colors resize-y placeholder-zinc-600"
                          />
                          <button 
                            onClick={() => handleReplySubmit(fb._id)}
                            disabled={isReplying || !replyInputs[fb._id]?.trim()}
                            className="bg-white/[0.05] hover:bg-zinc-200 hover:text-zinc-900 text-zinc-400 border border-white/[0.05] px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 w-full md:w-auto shrink-0"
                          >
                            <FaReply className="text-sm" /> 
                            <span className="md:hidden text-sm font-semibold">提交回复</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-zinc-500 font-medium bg-[#1a1a20] py-3 rounded-xl border border-white/[0.05]">
                        请登录后参与讨论
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