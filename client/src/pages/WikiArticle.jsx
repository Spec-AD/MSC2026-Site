import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaArrowLeft, FaEye, FaClock, FaUserEdit, FaSpinner, FaTag, FaEdit, FaSave, FaTimes, FaHistory } from 'react-icons/fa';
import bbcode from 'bbcode-to-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ==========================================
// 🔥 注册自定义 BBCode 标签 (已修复属性被吞的 BUG)
// ==========================================

// 1. 行内代码标签 [code]...[/code]
class InlineCodeTag extends bbcode.Tag {
  toReact() {
    // 将解析后的魔法占位符还原回真实的中括号
    const text = (this.getContent(true) || '').replace(/__L__/g, '[').replace(/__R__/g, ']');
    return (
      <code className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-[0.9em] mx-1 border border-white/5 shadow-inner">
        {text}
      </code>
    );
  }
}

// 2. 多行代码块标签 [block]...[/block]
class BlockCodeTag extends bbcode.Tag {
  toReact() {
    // 将解析后的魔法占位符还原回真实的中括号
    const text = (this.getContent(true) || '').replace(/__L__/g, '[').replace(/__R__/g, ']');
    return (
      <pre className="bg-black/60 border border-cyan-500/20 text-cyan-300 p-4 rounded-xl font-mono text-sm overflow-x-auto my-4 shadow-[0_0_15px_rgba(34,211,238,0.05)]">
        {text}
      </pre>
    );
  }
}

// 3. 将标签注入系统
bbcode.registerTag('code', InlineCodeTag);
bbcode.registerTag('block', BlockCodeTag);

// 💡 4. 核心引擎：防吞属性预处理器
const renderSafeBBCode = (content) => {
  if (!content) return null;
  // 正则拦截：在进入解析器前，把 [code] 和 [block] 内部的 [ ] 替换成不会被解析的 __L__ 和 __R__
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
  
  // --- 编辑模式核心状态 ---
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
        
        // 同步初始化编辑状态
        setEditTitle(res.data.title);
        setEditContent(res.data.content);
        setEditCategory(res.data.category?._id || '');

        // 🔥 触发每日阅读奖励机制 (静默请求)
        const token = localStorage.getItem('token');
        if (token) {
          axios.post('/api/wiki/read-reward', {}, { headers: { Authorization: `Bearer ${token}` } })
            .then(rewardRes => {
              // 如果今天第一次阅读，弹出奖励提示
              if (rewardRes.data.awarded) {
                addToast(rewardRes.data.msg, 'success'); 
              }
            }).catch(() => { /* 忽略静默请求的错误 */ });
        }

      } catch (err) {
        setError(err.response?.data?.msg || '词条读取失败');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  // 获取分类列表（供编辑模式下拉选择使用）
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/wiki/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('获取分类失败');
    }
  };

  const handleEditClick = () => {
    if (!currentUser) {
      addToast('请先登录后参与维基共建！', 'info');
      return;
    }
    fetchCategories();
    setIsEditing(true);
  };

  // 🔥 提交更新请求
  const handleSubmitUpdate = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      addToast('标题和内容不能为空！', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/wiki/submit', {
        slug: page.slug, // 保持 slug 不变，后端依此识别为更新
        title: editTitle,
        categoryId: editCategory || page.category._id,
        content: editContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      addToast(res.data.msg, 'success');
      setIsEditing(false);
      
      // 如果是 ADM，直接刷新页面看最新版；如果是普通用户，提示并保留当前视角
      if (isAdmin) {
        // 重新拉取以更新视图
        const refreshed = await axios.get(`/api/wiki/page/${slug}`);
        setPage(refreshed.data);
      } else {
        addToast('您的更新已进入审核队列，请耐心等待！', 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.msg || '提交失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        {/* --- 左侧：正文阅读与编辑区 --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl"
        >
          {/* 文章标题头 & 控制栏 */}
          <div className="flex flex-wrap justify-between items-start mb-8 gap-4 border-b border-white/10 pb-6">
            {!isEditing ? (
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs font-bold tracking-widest uppercase">
                    {page.category?.name || '未分类'}
                  </span>
                  <span className="text-gray-500 text-xs font-mono flex items-center gap-1">
                    <FaHistory /> 最后由 {page.lastEditedBy?.username || page.author?.username} 更新
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
                  {page.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <FaClock /> {new Date(page.updatedAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400/80">
                    <FaEye /> {page.views} VIEWS
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3 flex-1">
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black border border-blue-500/50 rounded-xl px-4 py-3 text-2xl font-bold text-white outline-none focus:border-blue-400 transition-colors"
                  placeholder="词条标题"
                />
                <select 
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full md:w-1/2 bg-black border border-white/20 rounded-xl px-4 py-2 text-sm text-gray-300 outline-none focus:border-blue-400 transition-colors"
                >
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 右侧动作按钮区 */}
            <div className="flex items-center gap-2 shrink-0 mt-2 md:mt-0">
              {!isEditing ? (
                <button 
                  onClick={handleEditClick}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-all"
                >
                  <FaEdit /> 参与更新
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={handleSubmitUpdate}
                    disabled={isSubmitting}
                    className="flex justify-center items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />} 提交审核
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                    className="flex justify-center items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    <FaTimes /> 取消
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* --- 主体内容区 --- */}
          {!isEditing ? (
            <div className="bbcode-content text-base md:text-lg leading-loose text-gray-200 break-words whitespace-pre-wrap">
              {renderSafeBBCode(page.content)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {!isAdmin && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm p-4 rounded-xl mb-2 flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <p>提交更新后将进入管理员审核队列。审核通过后，该旧版本将被封存，您将获得 <span className="font-bold bg-yellow-500/20 px-1 rounded">+30 经验值</span> 奖励！</p>
                </div>
              )}
              {isAdmin && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-4 rounded-xl mb-2 flex items-start gap-3">
                </div>
              )}
              <div className="relative">
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="在此输入正文内容（支持 BBCode 语法）..."
                  className="w-full h-[55vh] min-h-[300px] bg-black/50 border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-5 text-gray-200 outline-none focus:border-blue-400 transition-colors font-mono text-sm resize-y leading-relaxed shadow-inner"
                />
                <div className="absolute bottom-4 right-4 text-xs font-mono text-gray-600 pointer-events-none">
                  BBCode Editor
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* --- 右侧：侧边元数据栏 --- */}
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

              {page.lastEditedBy && page.lastEditedBy._id !== page.author?._id && (
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