import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaArrowLeft, FaEye, FaClock, FaUserEdit, FaSpinner, FaEdit, FaSave, FaTimes, FaHistory, FaFolderOpen } from 'react-icons/fa';
import bbcode from 'bbcode-to-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ==========================================
// 柔和质感的 BBCode 渲染器引擎
// ==========================================

class InlineCodeTag extends bbcode.Tag {
  toReact() {
    const text = (this.getContent(true) || '').replace(/__L__/g, '[').replace(/__R__/g, ']');
    return (
      <code className="bg-white/[0.05] text-zinc-300 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] mx-1 border border-white/[0.05]">
        {text}
      </code>
    );
  }
}

class BlockCodeTag extends bbcode.Tag {
  toReact() {
    const text = (this.getContent(true) || '').replace(/__L__/g, '[').replace(/__R__/g, ']');
    return (
      <pre className="bg-[#141418] border border-white/[0.05] text-zinc-300 p-4 rounded-xl font-mono text-[13px] leading-relaxed overflow-x-auto my-4 shadow-sm custom-scrollbar">
        {text}
      </pre>
    );
  }
}

bbcode.registerTag('code', InlineCodeTag);
bbcode.registerTag('block', BlockCodeTag);

const renderSafeBBCode = (content) => {
  if (!content) return null;
  const safeContent = content.replace(/\[(code|block)\]([\s\S]*?)\[\/\1\]/gi, (match, tag, inner) => {
    const escapedInner = inner.replace(/\[/g, '__L__').replace(/\]/g, '__R__');
    return `[${tag}]${escapedInner}[/${tag}]`;
  });
  return bbcode.toReact(safeContent);
};
// ==========================================

const WikiArticle = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [editCategory, setEditCategory] = useState('');

  const isAdmin = currentUser && ['ADM', 'TO'].includes(currentUser.role);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await axios.get(`/api/wiki/page/${slug}`);
        setPage(res.data);
        
        setEditTitle(res.data.title);
        setEditContent(res.data.content);
        setEditCategory(res.data.category?._id || '');

        const token = localStorage.getItem('token');
        if (token) {
          axios.post('/api/wiki/read-reward', {}, { headers: { Authorization: `Bearer ${token}` } })
            .then(rewardRes => {
              if (rewardRes.data.awarded) { addToast(rewardRes.data.msg, 'success'); }
            }).catch(() => {});
        }

      } catch (err) {
        setError(err.response?.data?.msg || '词条读取失败');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/wiki/categories');
      setCategories(res.data);
    } catch (err) {}
  };

  const handleEditClick = () => {
    if (!currentUser) {
      addToast('请先登录后参与维基共建！', 'info');
      return;
    }
    fetchCategories();
    setIsEditing(true);
  };

  const handleSubmitUpdate = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      addToast('标题和内容不能为空！', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/wiki/submit', {
        slug: page.slug,
        title: editTitle,
        categoryId: editCategory || page.category._id,
        content: editContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      addToast('操作成功', 'success');
      setIsEditing(false);
      
      if (isAdmin) {
        const refreshed = await axios.get(`/api/wiki/page/${slug}`);
        setPage(refreshed.data);
      } else {
        addToast('您的更新已进入审核队列，请耐心等待。', 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.msg || '提交失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-[#111115]"><FaSpinner className="animate-spin text-4xl text-zinc-600" /></div>;
  if (error || !page) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111115] text-zinc-200 pb-20 selection:bg-zinc-600/40">
      <div className="text-5xl mb-4 opacity-30">📖</div>
      <h2 className="text-xl font-bold mb-2">未找到词条</h2>
      <p className="text-zinc-500 mb-6 text-sm">{error}</p>
      <button onClick={() => navigate('/wiki')} className="px-6 py-2.5 bg-[#18181c] border border-white/[0.05] hover:bg-[#1a1a20] rounded-xl transition-colors font-medium text-sm shadow-sm active:scale-95">
        返回维基大厅
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 pt-20 md:pt-24 pb-20 px-4 md:px-8 font-sans selection:bg-zinc-600/40">
      <div className="max-w-6xl mx-auto">
        
        {/* 返回导航 */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/wiki')}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors w-fit active:scale-95"
          >
            <FaArrowLeft className="text-xs" /> 返回维基大厅
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* --- 左侧：正文阅读与编辑区 --- */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 w-full bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 md:p-10 shadow-sm"
          >
            {/* 文章标题头 & 控制栏 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-5 border-b border-white/[0.05] pb-6">
              {!isEditing ? (
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="bg-white/[0.04] border border-white/[0.05] text-zinc-400 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <FaFolderOpen className="text-zinc-500" /> {page.category?.name || '未分类'}
                    </span>
                    <span className="text-zinc-500 text-xs font-medium flex items-center gap-1.5">
                      <FaHistory /> 最后由 {page.lastEditedBy?.username || page.author?.username} 更新
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4 leading-snug">
                    {page.title}
                  </h1>
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <FaClock className="text-zinc-600" /> {new Date(page.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#141418] px-2 py-0.5 rounded-md border border-white/[0.05]">
                      <FaEye className="text-zinc-400" /> {page.views} 次阅读
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4 flex-1">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-3 text-xl md:text-2xl font-bold text-zinc-100 outline-none focus:border-zinc-500 transition-colors"
                    placeholder="请输入词条标题"
                  />
                  <select 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full md:w-64 bg-[#141418] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-300 outline-none focus:border-zinc-500 transition-colors appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 右侧动作按钮区 */}
              <div className="flex items-center shrink-0 w-full md:w-auto mt-2 md:mt-0">
                {!isEditing ? (
                  <button 
                    onClick={handleEditClick}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-200 hover:bg-white text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                  >
                    <FaEdit /> 参与更新
                  </button>
                ) : (
                  <div className="flex w-full md:w-auto gap-2">
                    <button 
                      onClick={handleSubmitUpdate}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-200 hover:bg-white text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />} 提交审核
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      disabled={isSubmitting}
                      className="flex items-center justify-center bg-[#141418] hover:bg-[#1a1a20] border border-white/[0.05] text-zinc-400 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* --- 主体内容区 --- */}
            {!isEditing ? (
              <div className="bbcode-content text-[15px] md:text-base leading-loose text-zinc-300 break-words whitespace-pre-wrap">
                {renderSafeBBCode(page.content)}
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {!isAdmin && (
                  <div className="bg-[#141418] border border-white/[0.05] text-zinc-400 text-sm p-4 rounded-xl flex items-start gap-3">
                    <span className="text-zinc-500 mt-0.5">💡</span>
                    <p className="leading-relaxed">
                      提交更新后将进入管理员审核队列。审核通过后，不仅当前页面会更新，您还将获得 <span className="font-semibold text-zinc-200">+30 经验值</span> 的社区贡献奖励。
                    </p>
                  </div>
                )}
                
                <div className="relative">
                  <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="在此输入正文内容（支持 BBCode 语法）..."
                    className="w-full h-[55vh] min-h-[350px] bg-[#141418] border border-white/[0.05] rounded-xl p-5 text-zinc-200 outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-colors font-mono text-[14px] resize-y leading-relaxed"
                  />
                  <div className="absolute bottom-4 right-4 text-[11px] font-medium text-zinc-600 bg-[#111115] px-2 py-1 rounded-md border border-white/[0.02] pointer-events-none">
                    BBCode 模式
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* --- 右侧：侧边元数据栏 --- */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="w-full lg:w-80 shrink-0 space-y-5 lg:sticky lg:top-28"
          >
            {/* 贡献者名片卡 */}
            <div className="bg-[#18181c] border border-white/[0.05] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-100 mb-5 flex items-center gap-2 border-b border-white/[0.05] pb-3">
                <FaUserEdit className="text-zinc-400" /> 贡献者
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src={page.author?.avatarUrl || '/assets/logos.png'} alt="author" className="w-10 h-10 rounded-full object-cover border border-white/[0.05] bg-[#111115]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-200">{page.author?.username || '未知用户'}</span>
                    <span className="text-xs text-zinc-500 font-medium mt-0.5">词条创建者</span>
                  </div>
                </div>

                {page.lastEditedBy && page.lastEditedBy._id !== page.author?._id && (
                  <div className="flex items-center gap-3 border-t border-white/[0.02] pt-4">
                    <img src={page.lastEditedBy.avatarUrl || '/assets/logos.png'} alt="editor" className="w-8 h-8 rounded-full object-cover border border-white/[0.05] bg-[#111115]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-300">{page.lastEditedBy.username}</span>
                      <span className="text-[11px] text-zinc-500 font-medium mt-0.5">最近更新者</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 许可声明 */}
            <div className="bg-[#141418] border border-white/[0.05] rounded-2xl p-5 hidden lg:block">
              <h3 className="text-xs font-bold text-zinc-500 mb-2">
                版权与许可声明
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                本维基文档由 PUREBEAT 社区成员自发编写并共同维护。在没有特殊说明的情况下，您可以自由参考，但转载请注明出处。
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default WikiArticle;