import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa'; 
import { useAuth } from '../context/AuthContext'; 
import { useToast } from '../context/ToastContext';

const WikiIndex = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- 玩家提交表单状态 ---
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [wikiFormData, setWikiFormData] = useState({ title: '', slug: '', categoryId: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchWikiData();
  }, []);

  const fetchWikiData = async () => {
    try {
      const [listRes, catRes] = await Promise.all([
        axios.get('/api/wiki/list'),
        axios.get('/api/wiki/categories')
      ]);
      setArticles(listRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0) {
        setWikiFormData(prev => ({ ...prev, categoryId: catRes.data[0]._id }));
      }
    } catch (err) {
      console.error('获取维基数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWikiSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('请先登录后再参与维基共建！', 'info');
      return navigate('/login');
    }
    if (!wikiFormData.categoryId) return addToast('请选择一个分类！', 'info');

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/wiki/submit', wikiFormData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      addToast(res.data.msg, 'success'); 
      setShowSubmitModal(false);
      setWikiFormData({ title: '', slug: '', categoryId: categories[0]?._id || '', content: '' });
    } catch (err) {
      addToast((err.response?.data?.msg || '提交失败，标识 (Slug) 可能已被占用'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  const groupedArticles = useMemo(() => {
    const groups = {};
    filteredArticles.forEach(article => {
      const cat = article.category || { _id: 'unassigned', name: '未分类 (Uncategorized)', color: 'text-zinc-500', icon: 'FaFolder' };
      if (!groups[cat._id]) groups[cat._id] = { info: cat, items: [] };
      groups[cat._id].items.push(article);
    });
    return Object.values(groups);
  }, [filteredArticles]);

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-zinc-600/40 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* --- 头部区 --- */}
        <div className="mb-10 md:mb-12 border-b border-white/[0.05] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
              <FaIcons.FaBook className="text-zinc-400" />
              维基大厅
            </h1>
            <p className="text-sm text-zinc-500 mt-2 font-medium">
              探索与共建 PUREBEAT 社区知识库
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl transition-all text-sm font-bold shadow-sm active:scale-95 shrink-0"
            >
              <FaIcons.FaPenNib /> 参与共建
            </button>

            <div className="relative w-full sm:w-64">
              <FaIcons.FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索词条..."
                className="w-full bg-[#18181c] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-zinc-500 focus:bg-[#1a1a20] outline-none transition-colors text-zinc-200 placeholder-zinc-600"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center"><FaIcons.FaSpinner className="animate-spin text-3xl text-zinc-600" /></div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {groupedArticles.map((group) => {
              const config = group.info;
              const Icon = FaIcons[config.icon] || FaIcons.FaFolder;

              return (
                <motion.div 
                  key={config._id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-[#18181c] border border-white/[0.05] rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="px-6 py-4 bg-[#1a1a20]/50 border-b border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-zinc-300">
                      <Icon className="text-lg" />
                      <h2 className="text-lg font-bold tracking-tight">
                        {config.name}
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 bg-[#111115] px-2.5 py-1 rounded-lg border border-white/[0.02]">
                      {group.items.length} 篇词条
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 p-2">
                    {group.items.map(article => (
                      <div 
                        key={article.slug}
                        onClick={() => navigate(`/wiki/${article.slug}`)}
                        className="group flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col truncate pr-4">
                          <span className="text-[15px] font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                            {article.title}
                          </span>
                          <span className="text-xs text-zinc-500 font-medium mt-1">
                            最后更新: {new Date(article.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                            <FaIcons.FaEye /> {article.views || 0}
                          </div>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.02] group-hover:bg-zinc-200 group-hover:text-zinc-900 transition-all">
                            <FaIcons.FaChevronRight className="text-[10px]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {filteredArticles.length === 0 && (
              <div className="text-center py-20 text-zinc-500 text-sm font-medium border border-white/[0.05] rounded-2xl bg-[#18181c] flex flex-col items-center">
                <FaIcons.FaSearch className="text-3xl mb-3 opacity-20" />
                未找到匹配的词条
              </div>
            )}
          </div>
        )}

        {/* --- 玩家共建弹窗 (Submit Modal) --- */}
        <AnimatePresence>
          {showSubmitModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowSubmitModal(false)}
                className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="flex justify-between items-start mb-6 border-b border-white/[0.05] pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                      <FaIcons.FaPenNib className="text-zinc-400" /> 参与维基共建
                    </h2>
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                      感谢你为社区贡献力量。如果输入的 URL 标识与现有词条重复，将自动转为更新申请。
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowSubmitModal(false)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-full active:scale-90"
                  >
                    <FaIcons.FaTimes />
                  </button>
                </div>

                <form onSubmit={handleWikiSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">词条标题</label>
                    <input 
                      type="text" required value={wikiFormData.title} onChange={(e) => setWikiFormData({...wikiFormData, title: e.target.value})}
                      className="w-full bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors placeholder-zinc-600"
                      placeholder="例如: 综合实力 (PF) 算法详解"
                    />
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">URL 标识 (Slug)</label>
                      <input 
                        type="text" required value={wikiFormData.slug} onChange={(e) => setWikiFormData({...wikiFormData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                        className="w-full bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors font-mono placeholder-zinc-600"
                        placeholder="英文/数字/中划线, 如: pf-algorithm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">所属分类</label>
                      <select 
                        required value={wikiFormData.categoryId} onChange={(e) => setWikiFormData({...wikiFormData, categoryId: e.target.value})}
                        className="w-full bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-zinc-500 outline-none transition-colors appearance-none"
                      >
                        {categories.map(cat => (
                          <option key={cat._id} value={cat._id}>
                             {cat.parentId ? '　├─ ' : ''}{cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">正文内容</label>
                    <textarea 
                      required rows="8" value={wikiFormData.content} onChange={(e) => setWikiFormData({...wikiFormData, content: e.target.value})}
                      className="w-full bg-[#141418] border border-white/[0.05] rounded-xl p-4 text-sm text-zinc-300 focus:border-zinc-500 outline-none transition-colors resize-y placeholder-zinc-600"
                      placeholder="在这里编写词条正文，支持 BBCode 语法..."
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" disabled={isSubmitting}
                      className="w-full py-3 bg-zinc-200 hover:bg-white text-zinc-900 font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <FaIcons.FaSpinner className="animate-spin" /> : '提交审核'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default WikiIndex;