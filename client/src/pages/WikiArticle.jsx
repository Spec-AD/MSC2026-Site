import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaArrowLeft, FaEye, FaClock, FaUserEdit, FaSpinner, FaTag } from 'react-icons/fa';
import bbcode from 'bbcode-to-react';

const WikiArticle = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await axios.get(`/api/wiki/page/${slug}`);
        setPage(res.data);
      } catch (err) {
        setError(err.response?.data?.msg || '词条读取失败');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex justify-center items-center"><FaSpinner className="animate-spin text-4xl text-cyan-500" /></div>;
  if (error || !page) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white pb-20">
      <div className="text-6xl mb-4 text-gray-600">📖</div>
      <h2 className="text-2xl font-bold mb-2">出错了</h2>
      <p className="text-gray-400 mb-6">{error}</p>
      <button onClick={() => navigate('/wiki')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20">
        返回维基大厅
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-screen pb-24 text-white px-4 md:px-8 max-w-6xl mx-auto pt-24">
      
      {/* 返回按钮 */}
      <button 
        onClick={() => navigate('/wiki')}
        className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors mb-8 font-bold tracking-widest text-sm uppercase"
      >
        <FaArrowLeft /> BACK TO WIKI INDEX
      </button>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* --- 左侧：正文阅读区 --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl"
        >
          {/* 文章标题头 */}
          <div className="border-b border-white/10 pb-8 mb-8">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              {page.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
                <FaTag className="text-cyan-500" /> {page.category}
              </span>
              <span className="flex items-center gap-1.5">
                <FaClock /> {new Date(page.updatedAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400/80">
                <FaEye /> {page.views} VIEWS
              </span>
            </div>
          </div>

          {/* 正文渲染区 */}
          <div className="bbcode-content text-base md:text-lg leading-loose text-gray-200 break-words whitespace-pre-wrap">
            {bbcode.toReact(page.content)}
          </div>
        </motion.div>

        {/* --- 右侧：侧边元数据栏 (PC端悬浮，移动端在底部) --- */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-80 shrink-0 space-y-6 lg:sticky lg:top-24"
        >
          {/* 作者信息卡 */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2">
              <FaUserEdit /> Contributors
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={page.author?.avatarUrl || '/assets/logos.png'} alt="author" className="w-10 h-10 rounded-xl object-cover border border-white/20" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{page.author?.username || 'Unknown'}</span>
                  <span className="text-[10px] text-gray-500 font-mono">Original Author</span>
                </div>
              </div>

              {page.lastEditedBy && page.lastEditedBy._id !== page.author._id && (
                <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                  <img src={page.lastEditedBy.avatarUrl || '/assets/logos.png'} alt="editor" className="w-8 h-8 rounded-lg object-cover border border-white/20 opacity-80" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">{page.lastEditedBy.username}</span>
                    <span className="text-[9px] text-gray-500 font-mono">Last Edited By</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 目录占位 (未来如果要写提取标题生成TOC的逻辑，可以放这里) */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hidden lg:block">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">
              Article Info
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              本文档由 Purebeat 社区成员共同维护。所有内容如无特殊说明，均受相关版权协议保护。
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default WikiArticle;