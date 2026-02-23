import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ title: '', type: 'NEWS', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/announcements', formData);
      alert('✅ 史诗级公告发布成功！全站已同步。');
      setFormData({ title: '', type: 'NEWS', content: '' }); // 清空表单
      navigate('/'); // 发完跳回主页看效果
    } catch (err) {
      alert(err.response?.data?.msg || '发布失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto text-white">
      <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
        <h2 className="text-3xl font-black italic tracking-tight text-red-500 mb-6 border-b border-red-500/20 pb-4">
          ADM 控制台 / 发布全新指令
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
    </div>
  );
};

export default Admin;