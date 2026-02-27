import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa'; 
import { useAuth } from '../context/AuthContext'; // 🔥 引入权限上下文，判断是否登录

const WikiIndex = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // 获取当前登录玩家
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]); // 🔥 存储分类列表供提交表单使用
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- 玩家提交表单状态 ---
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [wikiFormData, setWikiFormData] = useState({ title: '', slug: '', categoryId: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWikiData();
  }, []);

  const fetchWikiData = async () => {
    try {
      // 同时拉取文章列表和分类列表
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

  // --- 处理玩家提交词条 ---
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
      addToast(res.data.msg, 'success'); // 会提示“提交成功，请等待审核”
      setShowSubmitModal(false);
      setWikiFormData({ title: '', slug: '', categoryId: categories[0]?._id || '', content: '' });
    } catch (err) {
      addToast((err.response?.data?.msg || '提交失败，Slug 可能已被占用', 'error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 搜索逻辑
  const filteredArticles = useMemo(() => {
    return articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  // 动态分类聚合
  const groupedArticles = useMemo(() => {
    const groups = {};
    filteredArticles.forEach(article => {
      const cat = article.category || { _id: 'unassigned', name: '未分类 (Uncategorized)', color: 'text-gray-500', icon: 'FaFolder' };
      if (!groups[cat._id]) groups[cat._id] = { info: cat, items: [] };
      groups[cat._id].items.push(article);
    });
    return Object.values(groups);
  }, [filteredArticles]);

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-7xl mx-auto pt-24 relative">
      
      {/* --- 头部 Hero 区 --- */}
      <div className="mb-12 border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 drop-shadow-lg flex items-center gap-4">
            <FaIcons.FaBook className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
            WIKI.
          </h1>
          <p className="text-gray-400 font-mono text-sm tracking-[0.2em] uppercase mt-4">
            Know what you want to know
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
          {/* 🔥 新增：参与共建按钮 */}
          <button 
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/50 rounded-full transition-all text-sm font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          >
            <FaIcons.FaPenNib /> 参与共建
          </button>

          {/* 搜索框 */}
          <div className="relative w-full md:w-64">
            <FaIcons.FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索词条..."
              className="w-full bg-black/50 border border-white/20 rounded-full pl-12 pr-4 py-3 text-sm focus:border-cyan-500 outline-none transition-colors font-mono"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex justify-center"><FaIcons.FaSpinner className="animate-spin text-5xl text-cyan-500" /></div>
      ) : (
        <div className="space-y-12">
          {groupedArticles.map((group) => {
            const config = group.info;
            const Icon = FaIcons[config.icon] || FaIcons.FaFolder;
            const colorClass = config.color || 'text-cyan-400';

            return (
              <motion.div 
                key={config._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl"
              >
                {/* 动态分类表头 */}
                <div className="px-6 md:px-8 py-4 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 flex items-center gap-3">
                  <Icon className={`text-2xl ${colorClass}`} />
                  <h2 className={`text-xl font-black italic tracking-widest uppercase ${colorClass}`}>
                    {config.name}
                  </h2>
                  <span className="text-xs font-mono text-gray-400 ml-auto bg-black/40 px-2 py-1 rounded">
                    {group.items.length} Articles
                  </span>
                </div>

                {/* 词条列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-4 md:p-6">
                  {group.items.map(article => (
                    <div 
                      key={article.slug}
                      onClick={() => navigate(`/wiki/${article.slug}`)}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10"
                    >
                      <div className="flex flex-col truncate pr-4">
                        <span className="text-sm md:text-base font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                          {article.title}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono tracking-widest mt-1">
                          UPDATED: {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                          <FaIcons.FaEye /> {article.views || 0}
                        </div>
                        <FaIcons.FaChevronRight className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {filteredArticles.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono tracking-widest border border-white/5 rounded-2xl bg-black/20">
              未找到相关词条...
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 🔥 玩家共建弹窗 (Submit Modal) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* 模糊背景 */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* 弹窗面板 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-gray-900 border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(34,211,238,0.1)] overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-xl"
              >
                <FaIcons.FaTimes />
              </button>

              <h2 className="text-2xl font-black italic tracking-tight text-cyan-400 mb-2 flex items-center gap-3">
                <FaIcons.FaPenNib /> WIKI CONTRIBUTION
              </h2>
              <p className="text-xs text-gray-400 mb-6 font-mono leading-relaxed">
                感谢你为社区贡献力量！提交的词条将进入审核队列。<br/>
                如果输入的 URL 标识 (Slug) 与现有词条重复，将视为对该词条的**更新修改申请**。
              </p>

              <form onSubmit={handleWikiSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1 block">词条标题</label>
                  <input 
                    type="text" required value={wikiFormData.title} onChange={(e) => setWikiFormData({...wikiFormData, title: e.target.value})}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                    placeholder="如: PPF 战力算法解析"
                  />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1 block">URL 标识 (Slug)</label>
                    <input 
                      type="text" required value={wikiFormData.slug} onChange={(e) => setWikiFormData({...wikiFormData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                      className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors font-mono text-sm"
                      placeholder="纯英文/数字/中划线, 如: ppf-algo"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1 block">所属分类</label>
                    <select 
                      required value={wikiFormData.categoryId} onChange={(e) => setWikiFormData({...wikiFormData, categoryId: e.target.value})}
                      className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors font-bold text-sm"
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
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1 block">正文内容</label>
                  <textarea 
                    required rows="8" value={wikiFormData.content} onChange={(e) => setWikiFormData({...wikiFormData, content: e.target.value})}
                    className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition-colors font-mono text-sm resize-y"
                    placeholder="在这里编写词条内容..."
                  />
                </div>

                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? <FaIcons.FaSpinner className="animate-spin mx-auto" /> : 'SUBMIT FOR REVIEW / 提交审核'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default WikiIndex;