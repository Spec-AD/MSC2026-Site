import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import bbcode from 'bbcode-to-react';
import { 
  FaArrowLeft, FaInbox, FaBell, FaUserPlus, FaStar, FaRegStar, 
  FaFolder, FaPlus, FaTrashAlt, FaFolderOpen, FaTimes, FaSpinner,
  FaCheckDouble, FaExchangeAlt
} from 'react-icons/fa';

const Inbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [customFolders, setCustomFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeFolderId, setActiveFolderId] = useState('ALL'); 
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingMessageId, setMovingMessageId] = useState(null);

  useEffect(() => {
    fetchInboxData();
  }, []);

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [msgRes, folderRes] = await Promise.all([
        axios.get('/api/messages', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/messages/folders', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      
      setMessages(msgRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setCustomFolders(folderRes.data || []);
    } catch (err) {
      console.error('获取收件箱失败', err);
      addToast('拉取收件箱数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (e, msgId, currentStarStatus) => {
    e.stopPropagation();
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isStarred: !currentStarStatus } : m));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/${msgId}/star`, { isStarred: !currentStarStatus }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isStarred: currentStarStatus } : m));
      addToast('操作失败', 'error');
    }
  };

  const markAsRead = async (msg) => {
    if (msg.isRead) return;
    setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isRead: true } : m));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/${msg._id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMessage = async (e, msgId) => {
    e.stopPropagation();
    setMessages(prev => prev.filter(m => m._id !== msgId));
    if (selectedMessage?._id === msgId) setSelectedMessage(null);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } });
      addToast('已删除', 'success');
    } catch (err) {
      addToast('删除失败', 'error');
      fetchInboxData(); 
    }
  };

  const bulkDeleteRead = async () => {
    const messagesToDelete = messages.filter(m => m.isRead && !m.isStarred);
    if (messagesToDelete.length === 0) {
      addToast('没有可清理的已读邮件', 'info');
      return;
    }
    
    setMessages(prev => prev.filter(m => !m.isRead || m.isStarred));
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/messages/bulk-delete-read', { headers: { Authorization: `Bearer ${token}` } });
      addToast(`成功清理 ${messagesToDelete.length} 封已读邮件`, 'success');
    } catch (err) {
      addToast('清理失败', 'error');
      fetchInboxData();
    }
  };

  const moveMessage = async (msgId, folderId) => {
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, folderId: folderId } : m));
    setMovingMessageId(null);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/${msgId}/move`, { folderId }, { headers: { Authorization: `Bearer ${token}` } });
      addToast('移动成功', 'success');
    } catch (err) {
      addToast('移动失败', 'error');
      fetchInboxData();
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    if (customFolders.length >= 20) {
      addToast('最多只能创建 20 个自定义分类夹', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/messages/folders', { name: newFolderName }, { headers: { Authorization: `Bearer ${token}` } });
      setCustomFolders(prev => [...prev, res.data]);
      setIsCreatingFolder(false);
      setNewFolderName('');
      addToast('文件夹创建成功', 'success');
    } catch (err) {
      addToast(err.response?.data?.msg || '创建失败', 'error');
    }
  };

  const deleteFolder = async (e, folderId) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除此分类夹吗？其中的邮件将回到"全部邮件"中。')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/messages/folders/${folderId}`, { headers: { Authorization: `Bearer ${token}` } });
      setCustomFolders(prev => prev.filter(f => f._id !== folderId));
      setMessages(prev => prev.map(m => m.folderId === folderId ? { ...m, folderId: null } : m));
      if (activeFolderId === folderId) setActiveFolderId('ALL');
      addToast('文件夹已删除', 'success');
    } catch (err) {
      addToast('删除文件夹失败', 'error');
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      switch (activeFolderId) {
        case 'ALL': return true;
        case 'SYSTEM': return msg.type === 'system' || msg.type === 'notification' || msg.type === 'SYSTEM';
        case 'FRIEND': return msg.type === 'friend_request' || msg.type === 'FRIEND_REQUEST';
        case 'STARRED': return msg.isStarred === true;
        default: return msg.folderId === activeFolderId; 
      }
    });
  }, [messages, activeFolderId]);


  return (
    <div className="w-full min-h-screen bg-[#0c0c11] text-zinc-200 font-sans selection:bg-indigo-500/30 relative pb-24 overflow-x-hidden">
      
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[140px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 relative z-10">
        
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors font-bold text-sm w-fit active:scale-95 mb-6"
          >
            <FaArrowLeft /> 返回
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
              <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">通讯终端</h1>
            </div>
            
            <button 
              onClick={bulkDeleteRead}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
              title="星标邮件将被保护"
            >
              <FaCheckDouble /> 一键清理已读
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            <div className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-4 shadow-sm flex flex-col gap-1">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-2">Smart Views</div>
              
              <button onClick={() => setActiveFolderId('ALL')} className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeFolderId === 'ALL' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}>
                <div className="flex items-center gap-3"><FaInbox className="text-lg" /> 全部邮件</div>
                {messages.filter(m => !m.isRead).length > 0 && <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif" }}>{messages.filter(m => !m.isRead).length}</span>}
              </button>

              <button onClick={() => setActiveFolderId('SYSTEM')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeFolderId === 'SYSTEM' ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}>
                <FaBell className="text-lg" /> 系统通知
              </button>

              <button onClick={() => setActiveFolderId('FRIEND')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeFolderId === 'FRIEND' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}>
                <FaUserPlus className="text-lg" /> 好友申请
              </button>

              <button onClick={() => setActiveFolderId('STARRED')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeFolderId === 'STARRED' ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}>
                <FaStar className="text-lg" /> 星标邮件
              </button>
            </div>

            <div className="bg-[#15151e] border border-white/[0.05] rounded-3xl p-4 shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">My Folders</span>
                <span className="text-[10px] font-bold text-zinc-600 font-mono">{customFolders.length}/20</span>
              </div>

              {customFolders.map(folder => (
                <div 
                  key={folder._id}
                  onClick={() => setActiveFolderId(folder._id)}
                  className={`group flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${activeFolderId === folder._id ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'}`}
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <FaFolder className={activeFolderId === folder._id ? 'text-zinc-300' : 'text-zinc-600'} />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteFolder(e, folder._id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-colors"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              ))}

              {customFolders.length < 20 && (
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-3 px-4 py-3 mt-1 rounded-xl font-bold text-sm text-zinc-500 border border-dashed border-white/10 hover:border-white/20 hover:text-zinc-300 transition-all"
                >
                  <FaPlus /> 创建新分类夹
                </button>
              )}
            </div>

          </div>

          <div className="lg:col-span-9 bg-[#15151e] border border-white/[0.05] rounded-[2rem] overflow-hidden shadow-sm flex flex-col min-h-[600px]">
            
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-indigo-500/50" />
              </div>
            ) : selectedMessage ? (
              
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full bg-[#0c0c11]">
                <div className="flex items-center justify-between p-6 border-b border-white/[0.05] bg-[#15151e]">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedMessage(null)} className="w-10 h-10 rounded-full bg-white/[0.02] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                      <FaArrowLeft />
                    </button>
                    <h2 className="text-xl font-bold text-zinc-100 tracking-tight line-clamp-1">{selectedMessage.title}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => toggleStar(e, selectedMessage._id, selectedMessage.isStarred)} className="w-10 h-10 rounded-full bg-white/[0.02] hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                      {selectedMessage.isStarred ? <FaStar className="text-amber-400" /> : <FaRegStar className="text-zinc-500 hover:text-zinc-300" />}
                    </button>
                    <button onClick={(e) => deleteMessage(e, selectedMessage._id)} className="w-10 h-10 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors">
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/[0.05]">
                    <div className="flex items-center gap-4">
                      {/* 🔥 修复点 1：安全解析 sender 头像 */}
                      {selectedMessage.type === 'SYSTEM' || selectedMessage.type === 'system' ? (
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl font-bold border border-indigo-500/30">SYS</div>
                      ) : (
                        <img 
                          src={selectedMessage.sender?.avatarUrl || '/assets/logos.png'} 
                          alt="avatar" 
                          className="w-12 h-12 rounded-full object-cover border border-white/[0.05] bg-[#0c0c11]"
                        />
                      )}
                      
                      <div>
                        {/* 🔥 修复点 2：安全解析 sender 用户名 */}
                        <div className="font-bold text-zinc-200">
                          {selectedMessage.type === 'SYSTEM' || selectedMessage.type === 'system' 
                            ? '系统管理员' 
                            : (selectedMessage.sender?.username || 'System')}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-zinc-300 leading-loose text-[15px] bbcode-content whitespace-pre-wrap">
                     {bbcode.toReact(selectedMessage.content)}
                  </div>
                </div>
              </motion.div>

            ) : (
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                <div className="p-6 border-b border-white/[0.05] bg-[#1a1a24] flex items-center justify-between">
                  <span className="font-bold text-zinc-300">
                    {activeFolderId === 'ALL' ? '全部邮件' : activeFolderId === 'STARRED' ? '星标邮件' : activeFolderId === 'SYSTEM' ? '系统通知' : activeFolderId === 'FRIEND' ? '好友申请' : customFolders.find(f => f._id === activeFolderId)?.name || '未知分类'}
                  </span>
                  <span className="text-xs font-bold text-zinc-500 font-mono">{filteredMessages.length} Messages</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                      <FaFolderOpen className="text-5xl mb-4 opacity-20" />
                      <p className="font-medium">此分类下暂无邮件</p>
                    </div>
                  ) : (
                    filteredMessages.map((msg) => (
                      <div 
                        key={msg._id}
                        onClick={() => { setSelectedMessage(msg); markAsRead(msg); }}
                        className={`group flex items-center gap-4 p-4 border-b border-white/[0.02] cursor-pointer transition-colors ${msg.isRead ? 'bg-transparent hover:bg-white/[0.02]' : 'bg-indigo-900/10 hover:bg-indigo-900/20'}`}
                      >
                        <div className="flex items-center gap-3 shrink-0 pl-2">
                           <div className={`w-2 h-2 rounded-full ${msg.isRead ? 'bg-transparent' : 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]'}`}></div>
                           <button onClick={(e) => toggleStar(e, msg._id, msg.isStarred)} className="text-lg p-1">
                             {msg.isStarred ? <FaStar className="text-amber-400" /> : <FaRegStar className="text-zinc-600 hover:text-zinc-400 transition-colors" />}
                           </button>
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1 gap-4">
                            {/* 🔥 修复点 3：安全解析列表中的 sender 用户名 */}
                            <span className={`font-bold truncate ${msg.isRead ? 'text-zinc-400' : 'text-zinc-100'}`}>
                              {msg.type === 'SYSTEM' || msg.type === 'system' ? 'System' : (msg.sender?.username || 'System')}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-600 shrink-0" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-sm truncate ${msg.isRead ? 'text-zinc-500' : 'text-zinc-300 font-medium'}`}>
                              {msg.title}
                            </span>
                            
                            <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              
                              {customFolders.length > 0 && (
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => setMovingMessageId(movingMessageId === msg._id ? null : msg._id)} className="p-2 bg-[#1a1a24] hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="移动至...">
                                    <FaExchangeAlt className="text-xs" />
                                  </button>
                                  {movingMessageId === msg._id && (
                                    <div className="absolute right-0 mt-2 w-40 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                                      <button onClick={() => moveMessage(msg._id, null)} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white">移出分类夹</button>
                                      {customFolders.map(f => (
                                        <button key={f._id} onClick={() => moveMessage(msg._id, f._id)} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white truncate">
                                          {f.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <button onClick={(e) => deleteMessage(e, msg._id)} className="p-2 bg-[#1a1a24] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors">
                                <FaTrashAlt className="text-xs" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>

      <AnimatePresence>
        {isCreatingFolder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreatingFolder(false)} className="absolute inset-0 bg-[#0c0c11]/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#15151e] border border-white/[0.05] p-8 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl">
              <h3 className="text-xl font-bold text-zinc-100 mb-6">创建新分类夹</h3>
              <input 
                type="text" autoFocus
                value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                placeholder="输入分类夹名称..." maxLength={15}
                className="w-full bg-[#0c0c11] border border-white/[0.05] rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-indigo-500/50 transition-colors mb-6 text-sm"
              />
              <div className="flex gap-3">
                <button onClick={() => setIsCreatingFolder(false)} className="flex-1 py-3 bg-[#1a1a24] text-zinc-400 rounded-xl font-bold text-sm hover:text-white transition-colors">取消</button>
                <button onClick={createFolder} disabled={!newFolderName.trim()} className="flex-1 py-3 bg-zinc-200 text-zinc-900 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors active:scale-95">创建</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Inbox;