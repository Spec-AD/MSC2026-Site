import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
// 🔥 引入所有的 Fa 图标，以便后端动态下发的 icon 字符串能够生效
import * as FaIcons from 'react-icons/fa'; 

const WikiIndex = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWikiList();
  }, []);

  const fetchWikiList = async () => {
    try {
      const res = await axios.get('/api/wiki/list');
      setArticles(res.data);
    } catch (err) {
      console.error('获取维基列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  // 搜索逻辑
  const filteredArticles = useMemo(() => {
    return articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  // 🔥 v2 核心引擎：动态分类聚合
  const groupedArticles = useMemo(() => {
    const groups = {};
    filteredArticles.forEach(article => {
      // 如果由于历史数据原因没有分类，给个兜底
      const cat = article.category || { _id: 'unassigned', name: '未分类 (Uncategorized)', color: 'text-gray-500', icon: 'FaFolder' };
      
      if (!groups[cat._id]) {
        groups[cat._id] = {
          info: cat,
          items: []
        };
      }
      groups[cat._id].items.push(article);
    });
    // 将对象转为数组，方便 map 渲染
    return Object.values(groups);
  }, [filteredArticles]);

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-7xl mx-auto pt-24">
      
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
        
        {/* 搜索框 */}
        <div className="relative w-full md:w-72">
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

      {loading ? (
        <div className="py-32 flex justify-center"><FaIcons.FaSpinner className="animate-spin text-5xl text-cyan-500" /></div>
      ) : (
        <div className="space-y-12">
          {groupedArticles.map((group) => {
            const config = group.info;
            // 动态匹配图标，找不到就用默认的文件夹图标
            const Icon = FaIcons[config.icon] || FaIcons.FaFolder;
            // 动态颜色
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
    </div>
  );
};

export default WikiIndex;