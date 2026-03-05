import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Feedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  // 核心视图状态 (Master-Detail 布局控制)
  const [selectedId, setSelectedId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({ title: '', content: '', type: 'FEATURE' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  // 筛选器状态
  const [filters, setFilters] = useState(['PENDING', 'SOLVED', 'CLOSED']);
  const [showMineOnly, setShowMineOnly] = useState(false); // 新增：我发布的
  
  // 回复状态
  const [replyInputs, setReplyInputs] = useState({});
  const [isReplying, setIsReplying] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/feedback');
      setFeedbacks(res.data);
    } catch (err) {
      console.error('获取反馈失败', err);
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
      setIsFormOpen(false);
      fetchFeedbacks();
      addToast('发布成功', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || '操作失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (fb) => {
    setEditingId(fb._id);
    setFormData({ title: fb.title, content: fb.content, type: fb.type });
    setSelectedId(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除吗？')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/feedback/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (selectedId === id) setSelectedId(null);
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
    setFilters(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const canReappeal = (statusUpdatedAt) => {
    if (!statusUpdatedAt) return false;
    const hoursSinceSolved = (Date.now() - new Date(statusUpdatedAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceSolved >= 2;
  };

  const STATUS_DISPLAY = { PENDING: '待处理', SOLVED: '已解决', CLOSED: '已关闭' };
  const TYPE_DISPLAY = { FEATURE: { text: '建议', color: 'text-emerald-400 border-emerald-500/20' }, PROBLEM: { text: '问题', color: 'text-amber-400 border-amber-500/20' }, BUG: { text: '故障', color: 'text-rose-400 border-rose-500/20' } };
  
  // 综合过滤引擎
  const filteredFeedbacks = feedbacks.filter(fb => {
    if (!filters.includes(fb.status)) return false;
    const currentUserId = user ? (user.id || user._id) : null;
    if (showMineOnly && fb.author?._id !== currentUserId) return false;
    return true;
  });

  const selectedFeedback = feedbacks.find(fb => fb._id === selectedId);
  const currentUserId = user ? (user.id || user._id) : null; 
  const isADM = user && user.role === 'ADM';

  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-indigo-500/30 relative">
      
      {/* 统一全局环境光 */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* --- 顶部 Header --- */}
        <div className="mb-8 border-b border-white/[0.05] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">反馈中心</h1>
          </div>
        </div>

        {/* --- 核心 Master-Detail 布局 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[75vh]">
          
          {/* ================= 左侧：列表与筛选区 ================= */}
          <div className={`lg:col-span-4 ${selectedId || isFormOpen ? 'hidden lg:flex' : 'flex'} flex-col gap-4 h-full`}>
            
            {/* 操作与筛选卡片 */}
            <div className="bg-[#15151e] rounded-2xl border border-white/[0.05] p-4 flex flex-col gap-4 shrink-0 shadow-sm">
              <button 
                onClick={() => { setIsFormOpen(true); setSelectedId(null); setEditingId(null); setFormData({ title: '', content: '', type: 'FEATURE' }); }}
                className="w-full py-3 bg-zinc-200 hover:bg-white text-zinc-900 font-bold rounded-xl transition-all active:scale-95 text-sm"
              >
                发布反馈
              </button>
              
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_DISPLAY).map(([status, label]) => (
                  <button 
                    key={status} onClick={() => toggleFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filters.includes(status) ? 'bg-white/10 text-zinc-100' : 'bg-transparent text-zinc-500 border border-white/[0.05] hover:text-zinc-300'}`}
                  >
                    {label}
                  </button>
                ))}
                {user && (
                  <button 
                    onClick={() => setShowMineOnly(!showMineOnly)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showMineOnly ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-transparent text-zinc-500 border-white/[0.05] hover:text-zinc-300'}`}
                  >
                    我发布的
                  </button>
                )}
              </div>
            </div>

            {/* 虚拟反馈列表 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#15151e] rounded-2xl border border-white/[0.05] p-2 flex flex-col gap-1 shadow-sm">
              {loading ? (
                <div className="py-10 text-center text-zinc-500 text-sm">加载中...</div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-sm font-medium">无符合条件的记录</div>
              ) : (
                filteredFeedbacks.map(fb => (
                  <div 
                    key={fb._id}
                    onClick={() => { setSelectedId(fb._id); setIsFormOpen(false); }}
                    className={`p-4 rounded-xl cursor-pointer transition-colors border ${selectedId === fb._id ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${TYPE_DISPLAY[fb.type]?.color || TYPE_DISPLAY.FEATURE.color}`}>
                        {TYPE_DISPLAY[fb.type]?.text || '建议'}
                      </span>
                      <span className={`text-[10px] font-bold ${fb.status === 'SOLVED' ? 'text-emerald-400' : fb.status === 'CLOSED' ? 'text-zinc-600' : 'text-amber-400'}`}>
                        {STATUS_DISPLAY[fb.status]}
                      </span>
                    </div>
                    <div className={`text-sm font-bold truncate ${fb.status === 'CLOSED' ? 'text-zinc-500' : 'text-zinc-200'}`}>
                      {fb.isPinned && <span className="text-indigo-400 mr-1">置顶</span>}
                      {fb.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================= 右侧：详情与表单区 ================= */}
          <div className={`lg:col-span-8 ${!selectedId && !isFormOpen ? 'hidden lg:flex' : 'flex'} flex-col h-full bg-[#15151e] rounded-2xl border border-white/[0.05] overflow-hidden shadow-sm`}>
            
            {/* 场景 1：表单模式 (新建/编辑) */}
            {isFormOpen ? (
              <div className="p-6 md:p-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-5 bg-indigo-400 rounded-full"></div>
                  <h2 className="text-xl font-bold text-zinc-100">{editingId ? '编辑反馈' : '发布反馈'}</h2>
                </div>

                {!user ? (
                   <div className="flex-1 flex items-center justify-center text-zinc-500 font-medium">请先登录</div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
                    <div className="flex gap-4">
                      <select 
                        value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="bg-[#0c0c11] border border-white/[0.05] text-sm font-bold text-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-zinc-500 w-32 appearance-none"
                      >
                        <option value="FEATURE">建议</option>
                        <option value="PROBLEM">问题</option>
                        <option value="BUG">故障</option>
                      </select>
                      <input 
                        type="text" placeholder="标题" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="bg-[#0c0c11] border border-white/[0.05] text-zinc-100 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-zinc-500 flex-1 placeholder-zinc-600" required
                      />
                    </div>
                    <textarea 
                      placeholder="详细描述..." value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="flex-1 bg-[#0c0c11] border border-white/[0.05] text-zinc-300 text-[15px] leading-relaxed rounded-xl p-4 outline-none focus:border-zinc-500 resize-none placeholder-zinc-600 custom-scrollbar" required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={() => { setIsFormOpen(false); setEditingId(null); }} className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-zinc-100 bg-[#1a1a24] transition-all">取消</button>
                      <button type="submit" disabled={isSubmitting} className="px-8 py-3 rounded-xl text-sm font-bold text-zinc-900 bg-zinc-200 hover:bg-white transition-all disabled:opacity-50">
                        {isSubmitting ? '提交中...' : (editingId ? '更新' : '提交')}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            // 场景 2：反馈详情模式
            ) : selectedFeedback ? (
              <div className="flex flex-col h-full relative">
                {/* 移动端返回按钮 */}
                <button onClick={() => setSelectedId(null)} className="lg:hidden absolute top-6 right-6 text-zinc-500 font-bold text-sm bg-white/5 px-3 py-1.5 rounded-lg z-10">
                  返回列表
                </button>

                <div className="p-6 md:p-10 border-b border-white/[0.05] shrink-0">
                  <div className="flex items-center gap-3 mb-6 pr-20 lg:pr-0">
                    <div className={`w-1 h-5 rounded-full ${selectedFeedback.status === 'SOLVED' ? 'bg-emerald-400' : selectedFeedback.status === 'CLOSED' ? 'bg-zinc-600' : 'bg-amber-400'}`}></div>
                    <h2 className="text-xl font-bold text-zinc-100 leading-snug">{selectedFeedback.title}</h2>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={selectedFeedback.author?.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-10 h-10 rounded-full border border-white/[0.05] object-cover bg-[#0c0c11]" />
                      <div>
                        <div className="text-sm font-bold text-zinc-200">{selectedFeedback.author?.username || '注销用户'}</div>
                        <div className="text-[11px] text-zinc-500 font-medium mt-0.5" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {new Date(selectedFeedback.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* 操作组 (无图标纯文本) */}
                    <div className="flex items-center gap-2">
                      {isADM && (
                        <button onClick={() => handleTogglePin(selectedFeedback._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1a1a24] text-zinc-400 hover:text-zinc-200 transition-colors">
                          {selectedFeedback.isPinned ? '取消置顶' : '置顶'}
                        </button>
                      )}
                      {isADM && selectedFeedback.status === 'PENDING' && (
                        <button onClick={() => handleStatusChange(selectedFeedback._id, 'SOLVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          标记解决
                        </button>
                      )}
                      {(user && selectedFeedback.author?._id === currentUserId) && selectedFeedback.status === 'SOLVED' && (
                        <button 
                          onClick={() => handleStatusChange(selectedFeedback._id, 'REAPPEAL')} 
                          disabled={!canReappeal(selectedFeedback.statusUpdatedAt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          重新申诉
                        </button>
                      )}
                      {(user && selectedFeedback.author?._id === currentUserId) && selectedFeedback.status !== 'CLOSED' && (
                        <button onClick={() => handleEditClick(selectedFeedback)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1a1a24] text-zinc-400 hover:text-zinc-200 transition-colors">
                          编辑
                        </button>
                      )}
                      {((user && selectedFeedback.author?._id === currentUserId) || isADM) && (
                        <button onClick={() => handleDelete(selectedFeedback._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors">
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-10">
                  <div className="text-[15px] text-zinc-300 leading-loose whitespace-pre-wrap">
                    {selectedFeedback.content}
                  </div>

                  {/* 回复流水区 */}
                  <div className="flex flex-col gap-5 border-t border-white/[0.05] pt-8">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Replies</div>
                    {selectedFeedback.replies && selectedFeedback.replies.map(reply => (
                      <div key={reply._id} className="flex gap-4 items-start">
                        <img src={reply.author?.avatarUrl || '/assets/logos.png'} alt="avatar" className="w-8 h-8 rounded-full border border-white/[0.05] object-cover shrink-0 bg-[#0c0c11]" />
                        <div className="flex-1 bg-[#1a1a24] border border-white/[0.02] rounded-2xl p-5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-zinc-200">{reply.author?.username || '未知'}</span>
                            <span className="text-[11px] text-zinc-500 font-medium" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                              {new Date(reply.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[14px] text-zinc-400 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* 评论框 */}
                    {user ? (
                      <div className="flex flex-col gap-3 mt-4">
                        <textarea 
                          value={replyInputs[selectedFeedback._id] || ''}
                          onChange={(e) => setReplyInputs({...replyInputs, [selectedFeedback._id]: e.target.value})}
                          placeholder="输入回复..."
                          className="w-full bg-[#0c0c11] border border-white/[0.05] text-zinc-200 text-sm rounded-xl p-4 h-24 outline-none focus:border-zinc-500 transition-colors resize-none placeholder-zinc-600"
                        />
                        <div className="flex justify-end">
                          <button 
                            onClick={() => handleReplySubmit(selectedFeedback._id)}
                            disabled={isReplying || !replyInputs[selectedFeedback._id]?.trim()}
                            className="bg-zinc-200 text-zinc-900 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95"
                          >
                            提交
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm font-bold text-zinc-600 mt-4">登录后参与讨论</div>
                    )}
                  </div>
                </div>
              </div>

            // 场景 3：未选择时的空白页
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-[#0a0a0c]/50">
                <div className="w-1 h-8 bg-zinc-800 rounded-full mb-4"></div>
                <div className="font-bold text-sm">选择左侧项目以查看详情</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Feedback;