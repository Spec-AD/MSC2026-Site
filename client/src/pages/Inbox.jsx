import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus, FaShieldAlt, FaInfoCircle, FaCheck, FaSpinner, FaArrowLeft, FaInbox } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const Inbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { addToast } = useToast();
  const [selectedMsgId, setSelectedMsgId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMessages();
  }, [user, navigate]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      // 桌面端自动选中第一条
      if (res.data.length > 0 && window.innerWidth >= 768) {
        setSelectedMsgId(res.data[0]._id);
      }
    } catch (err) {
      console.error('拉取信件失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('token');
      await axios.patch(`/api/messages/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(messages.map(msg => msg._id === id ? { ...msg, isRead: true } : msg));
    } catch (err) {
      addToast('操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFriendAction = async (action, senderId, messageId) => {
    try {
      setProcessingId(messageId);
      const token = localStorage.getItem('token');
      const endpoint = action === 'ACCEPT' ? '/api/users/friend-request/accept' : '/api/users/friend-request/reject';
      const res = await axios.post(endpoint, { senderId, messageId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast(res.data.message, 'success');
      fetchMessages(); 
      setSelectedMsgId(null);
    } catch (err) {
      addToast(err.response?.data?.message || '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return { icon: <FaUserPlus className="text-zinc-400" />, label: '好友申请' };
      case 'ADM_DIRECT':
        return { icon: <FaShieldAlt className="text-zinc-300" />, label: '管理团队' };
      case 'SYSTEM':
      default:
        return { icon: <FaInfoCircle className="text-zinc-500" />, label: '系统通知' };
    }
  };

  const selectedMsg = messages.find(m => m._id === selectedMsgId);

  return (
    // 社区经典深色背景：微微偏蓝的深灰色
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 flex flex-col items-center overflow-hidden font-sans selection:bg-zinc-600/40">
      
      {/* 顶部导航返回 */}
      <div className="w-full max-w-6xl mx-auto px-6 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors group w-fit"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform duration-300" /> 
          返回
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 flex-1 flex flex-col h-screen pb-10">
        
        {/* 标题栏：克制、干净 */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">收件箱</h1>
            <p className="text-sm text-zinc-500 mt-1">管理您的通知与好友申请</p>
          </div>
          <div className="hidden md:flex bg-[#1a1a20] px-4 py-1.5 rounded-full border border-white/5 text-sm font-medium text-zinc-400 shadow-sm">
            {messages.filter(m => !m.isRead).length} 条未读
          </div>
        </div>

        {/* 核心容器：大圆角、微描边、深色层级 */}
        <div className="flex-1 flex flex-col md:flex-row bg-[#18181c] rounded-2xl border border-white/[0.05] overflow-hidden shadow-2xl h-[calc(100vh-220px)] relative">
          
          {/* ================= 左侧：信件列表 ================= */}
          <div className={`w-full md:w-[340px] shrink-0 border-r border-white/[0.05] flex flex-col bg-[#18181c] z-10 ${selectedMsgId ? 'hidden md:flex' : 'flex'}`}>
            
            <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-[#1a1a20]/50 shrink-0">
               <span className="text-sm font-semibold text-zinc-300">全部消息</span>
               {loading && <FaSpinner className="animate-spin text-zinc-500 text-sm" />}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {messages.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                  <FaInbox className="text-3xl opacity-20" />
                  <span className="text-sm">暂无新消息</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelected = selectedMsgId === msg._id;
                  const isUnread = !msg.isRead;
                  const config = getTypeConfig(msg.type);

                  return (
                    <motion.div 
                      key={msg._id}
                      onClick={() => setSelectedMsgId(msg._id)}
                      className={`relative p-4 cursor-pointer transition-colors border-l-[3px] border-b border-b-white/[0.02] flex gap-4 items-start ${
                        isSelected 
                          ? 'bg-white/[0.04] border-l-zinc-300' 
                          : 'border-l-transparent hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* 头像/图标容器：圆形 */}
                      <div className="w-10 h-10 rounded-full bg-[#222228] border border-white/[0.05] flex items-center justify-center shrink-0 overflow-hidden">
                        {msg.sender?.avatarUrl ? (
                          <img src={msg.sender.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          config.icon
                        )}
                      </div>

                      {/* 列表内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className={`text-sm truncate ${isUnread ? 'text-zinc-100 font-semibold' : 'text-zinc-300 font-medium'}`}>
                            {msg.sender?.username || 'System'}
                          </h4>
                          <span className="text-xs text-zinc-500 shrink-0 ml-2">
                            {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className={`text-sm truncate pr-2 ${isUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {msg.title}
                        </p>
                      </div>

                      {/* 未读柔和指示点 */}
                      {isUnread && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-300 shadow-[0_0_8px_rgba(212,212,216,0.5)]"></div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= 右侧：阅读面板 ================= */}
          <div className={`flex-1 h-full flex flex-col bg-[#141418] relative ${!selectedMsgId ? 'hidden md:flex' : 'flex'}`}>
            <AnimatePresence mode="wait">
              {!selectedMsg ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-zinc-600"
                >
                  <FaInbox className="text-5xl mb-4 opacity-10" />
                  <p className="text-sm font-medium">请在左侧选择一条消息</p>
                </motion.div>
              ) : (
                <motion.div 
                  key={selectedMsg._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col h-full overflow-hidden"
                >
                  {/* 面板头部 */}
                  <div className="px-8 py-6 border-b border-white/[0.05] bg-[#18181c] shrink-0">
                    <button onClick={() => setSelectedMsgId(null)} className="md:hidden flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 text-sm transition-colors">
                      <FaArrowLeft /> 返回列表
                    </button>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#222228] border border-white/[0.05] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                        {selectedMsg.sender?.avatarUrl ? (
                          <img src={selectedMsg.sender.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          getTypeConfig(selectedMsg.type).icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-zinc-100 truncate">{selectedMsg.title}</h2>
                        <div className="text-sm text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span className="font-medium text-zinc-300">{selectedMsg.sender?.username || 'System'}</span>
                          <span>•</span>
                          <span>{new Date(selectedMsg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 信息正文内容 */}
                  <div className="px-8 py-8 flex-1 overflow-y-auto custom-scrollbar bg-[#141418]">
                    <div className="max-w-3xl text-zinc-300 leading-relaxed text-[15px] whitespace-pre-wrap selection:bg-zinc-500/40">
                      {selectedMsg.content}
                    </div>
                  </div>

                  {/* 底部操作区：社区风格圆角按钮 */}
                  <div className="px-8 py-5 border-t border-white/[0.05] flex flex-wrap gap-3 items-center bg-[#18181c] shrink-0">
                    {selectedMsg.type === 'FRIEND_REQUEST' && !selectedMsg.isRead && selectedMsg.actionData?.senderId && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleFriendAction('ACCEPT', selectedMsg.actionData.senderId, selectedMsg._id)}
                          disabled={processingId === selectedMsg._id}
                          className="px-6 py-2.5 bg-zinc-200 text-zinc-900 text-sm font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50 shadow-sm active:scale-95"
                        >
                          接受申请
                        </button>
                        <button 
                          onClick={() => handleFriendAction('REJECT', selectedMsg.actionData.senderId, selectedMsg._id)}
                          disabled={processingId === selectedMsg._id}
                          className="px-6 py-2.5 bg-[#2a2a32] text-zinc-300 text-sm font-semibold rounded-xl hover:bg-[#32323b] hover:text-zinc-100 transition-all disabled:opacity-50 active:scale-95"
                        >
                          拒绝
                        </button>
                      </div>
                    )}

                    {selectedMsg.type !== 'FRIEND_REQUEST' && !selectedMsg.isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(selectedMsg._id)}
                        disabled={processingId === selectedMsg._id}
                        className="px-6 py-2.5 bg-zinc-200 text-zinc-900 text-sm font-bold rounded-xl hover:bg-white transition-all shadow-sm active:scale-95 flex items-center justify-center min-w-[100px]"
                      >
                        {processingId === selectedMsg._id ? <FaSpinner className="animate-spin" /> : '标为已读'}
                      </button>
                    )}
                    
                    {selectedMsg.isRead && (
                      <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
                        <FaCheck /> 已处理
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;