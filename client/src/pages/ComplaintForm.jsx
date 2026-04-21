import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaArrowLeft, FaSpinner, FaPaperPlane, FaExclamationTriangle, FaHistory } from 'react-icons/fa';
import { useEffect } from 'react';

const ComplaintForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('submit');

  // 提交表单状态
  const [formData, setFormData] = useState({ type: 'FEEDBACK', title: '', content: '', targetUserId: '', attachments: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 我的投诉列表
  const [myComplaints, setMyComplaints] = useState([]);
  const [isLoadingMine, setIsLoadingMine] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'history') fetchMyComplaints();
  }, [user, activeTab]);

  const fetchMyComplaints = async () => {
    setIsLoadingMine(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/complaints/mine', { headers: { Authorization: `Bearer ${token}` } });
      setMyComplaints(res.data);
    } catch (err) { console.error(err); }
    finally { setIsLoadingMine(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return addToast('请填写标题和内容', 'error');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/complaints', formData, { headers: { Authorization: `Bearer ${token}` } });
      addToast(res.data.msg, 'success');
      setFormData({ type: 'FEEDBACK', title: '', content: '', targetUserId: '', attachments: [] });
      setActiveTab('history');
    } catch (err) { addToast(err.response?.data?.msg || '提交失败', 'error'); }
    finally { setIsSubmitting(false); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <p className="text-gray-400">请先登录</p>
        <button onClick={() => navigate('/login')} className="mt-4 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">前往登录</button>
      </div>
    );
  }

  const statusMap = {
    'PENDING': { label: '待处理', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    'PROCESSING': { label: '处理中', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'RESOLVED': { label: '已解决', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    'DISMISSED': { label: '已驳回', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-3xl mx-auto pt-24">
      {/* 返回 & 标题 */}
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm mb-4">
          <FaArrowLeft /> 返回
        </button>
        <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
          <FaExclamationTriangle className="text-amber-400" /> 投诉与反馈
        </h1>
        <p className="text-gray-400 text-sm mt-2">遇到问题或不公平现象？向维护团队提交报告。</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-8">
        <button onClick={() => setActiveTab('submit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
            activeTab === 'submit' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/5 text-gray-400 border-white/10 hover:border-amber-500/50'
          }`}>
          <FaPaperPlane /> 提交投诉
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
            activeTab === 'history' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/5 text-gray-400 border-white/10 hover:border-amber-500/50'
          }`}>
          <FaHistory /> 我的投诉
        </button>
      </div>

      {/* 提交表单 */}
      {activeTab === 'submit' && (
        <form onSubmit={handleSubmit} className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">投诉类型</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-bold">
              <option value="COMMENT_REPORT">评论举报</option>
              <option value="FAIRNESS">比赛公平性</option>
              <option value="FEEDBACK">一般反馈</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">标题</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors" placeholder="简要描述问题" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">详细内容</label>
            <textarea rows="6" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-amber-500 outline-none transition-colors resize-y" placeholder="请详细描述您遇到的问题、涉及的人物和事件..." required />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">涉及用户 UID (可选)</label>
            <input type="number" value={formData.targetUserId} onChange={e => setFormData({...formData, targetUserId: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-mono" placeholder="如有涉及的用户，请填入其 UID" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
            {isSubmitting ? '提交中...' : '提交投诉'}
          </button>
        </form>
      )}

      {/* 我的投诉历史 */}
      {activeTab === 'history' && (
        <div>
          {isLoadingMine ? (
            <div className="py-16 flex justify-center"><FaSpinner className="animate-spin text-amber-500 text-3xl" /></div>
          ) : myComplaints.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaExclamationTriangle className="text-4xl mx-auto mb-3 opacity-30" />
              <p>您还没有提交过投诉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myComplaints.map(c => {
                const st = statusMap[c.status] || statusMap['PENDING'];
                return (
                  <div key={c._id} className="bg-black/40 border border-white/10 rounded-2xl p-5 hover:border-amber-500/20 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-bold">{c.title}</h4>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{c.content}</p>
                    <p className="text-xs text-gray-600">{new Date(c.createdAt).toLocaleString('zh-CN')}</p>
                    {c.handlerNote && (
                      <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <p className="text-xs text-green-400"><strong>处理备注：</strong>{c.handlerNote}</p>
                        {c.handledBy && <p className="text-xs text-gray-500 mt-1">处理人：{c.handledBy.username}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintForm;