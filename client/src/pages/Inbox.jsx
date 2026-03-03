import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaEnvelopeOpenText, FaUserPlus, FaShieldAlt, FaServer, FaCheck, FaTimes, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import FallingIcons from '../components/FallingIcons';
import { useToast } from '../context/ToastContext';

const Inbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { addToast } = useToast();
  
  // 新增：当前选中的邮件 ID
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
      
      // 如果有数据且没有选中的邮件，默认选中第一条 (仅在电脑端体验更好，可根据需要调整)
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
      setSelectedMsgId(null); // 处理完后清空右侧视图
    } catch (err) {
      addToast(err.response?.data?.message || '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return { icon: <FaUserPlus />, color: 'text-blue-400', label: 'Friend Request' };
      case 'ADM_DIRECT':
        return { icon: <FaShieldAlt />, color: 'text-purple-400', label: 'ADM Message' };
      case 'SYSTEM':
      default:
        return { icon: <FaServer />, color: 'text-yellow-400', label: 'System Notice' };
    }
  };

  // 获取当前选中的完整邮件对象
  const selectedMsg = messages.find(m => m._id === selectedMsgId);

  return (
    <div className="w-full min-h-screen text-white pt-24 pb-8 px-4 md:px-8 font-sans relative overflow-hidden bg-gradient-to-b from-transparent to-black/80 flex flex-col">
      <button
        onClick={() => navigate(-1)}
        classname="flex items-center gap-2 text-gray-400 hover:text-white mb-6 font-bold tracking-widest transition-colors w-max"
      >
        <FaArrowLeft /> BACK
      </button>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col relative z-10 h-full">
        
        {/* Header */}
        <div className="mb-6 border-b border-white/10 pb-4 shrink-0">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 flex items-center gap-4">
            <FaEnvelopeOpenText className="text-gray-300" /> INBOX.
          </h1>
        </div>

        {/* 核心双栏容器 */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-[calc(100vh-200px)] min-h-[500px]">
          
          {/* ================= 左侧：邮件列表 ================= */}
          <div className={`w-full md:w-1/3 h-full bg-black/40 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${selectedMsgId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-800 bg-black/50 text-xs font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center shrink-0">
              <span>Message List</span>
              <span>{messages.filter(m => !m.isRead).length} Unread</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-full"><FaSpinner className="animate-spin text-2xl text-gray-600" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center p-8 text-gray-600 font-mono text-sm uppercase tracking-widest">Inbox is empty.</div>
              ) : (
                messages.map((msg) => {
                  const isSelected = selectedMsgId === msg._id;
                  const isUnread = !msg.isRead;
                  const config = getTypeConfig(msg.type);

                  return (
                    <div 
                      key={msg._id}
                      onClick={() => setSelectedMsgId(msg._id)}
                      className={`p-4 border-b border-gray-800/50 cursor-pointer transition-all ${isSelected ? 'bg-gray-800/80 border-l-4 border-l-blue-500' : 'hover:bg-gray-900/60 border-l-4 border-l-transparent'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-black border border-gray-700 text-[10px] ${config.color}`}>
                            {msg.sender?.avatarUrl ? <img src={msg.sender.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" /> : config.icon}
                          </div>
                          <span className="font-bold text-sm text-gray-200 truncate">{msg.sender?.username || 'SYSTEM'}</span>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          {isUnread && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] mb-1"></div>}
                          <span className="text-[9px] text-gray-500 font-mono">{new Date(msg.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className={`text-sm truncate w-full ${isUnread ? 'text-white font-bold' : 'text-gray-400'}`}>
                        {msg.title}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= 右侧：邮件正文 ================= */}
          <div className={`w-full md:w-2/3 h-full bg-black/40 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${!selectedMsgId ? 'hidden md:flex' : 'flex'}`}>
            
            {!selectedMsg ? (
              // 未选中任何邮件时的占位图
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                <FaEnvelopeOpenText className="text-6xl mb-4 opacity-20" />
                <p className="font-mono text-sm tracking-widest uppercase">Select a message to read</p>
              </div>
            ) : (
              // 选中邮件后的详情视图
              <div className="flex-1 flex flex-col h-full">
                
                {/* 详情头部 */}
                <div className="p-6 border-b border-gray-800 shrink-0 bg-gradient-to-b from-gray-900/50 to-transparent">
                  {/* 手机端返回按钮 */}
                  <button 
                    onClick={() => setSelectedMsgId(null)}
                    className="md:hidden flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    <FaArrowLeft /> Back to List
                  </button>

                  <h2 className="text-2xl font-bold text-white mb-4">{selectedMsg.title}</h2>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black border border-gray-700 text-xl overflow-hidden">
                      {selectedMsg.sender?.avatarUrl ? <img src={selectedMsg.sender.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : getTypeConfig(selectedMsg.type).icon}
                    </div>
                    <div>
                      <div className="font-bold text-gray-200 flex items-center gap-2">
                        {selectedMsg.sender?.username || 'SYSTEM'}
                        <span className="text-[9px] px-1.5 py-0.5 border border-gray-600 rounded uppercase tracking-widest text-gray-400 bg-gray-800/50">
                          {getTypeConfig(selectedMsg.type).label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        {new Date(selectedMsg.createdAt).toLocaleString('zh-CN', { hour12: false })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 详情正文 (可滚动) */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-sm md:text-base text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedMsg.content}
                </div>

                {/* 详情底部操作区 */}
                <div className="p-6 border-t border-gray-800 shrink-0 bg-black/50 flex flex-wrap gap-3 items-center">
                  
                  {selectedMsg.type === 'FRIEND_REQUEST' && !selectedMsg.isRead && selectedMsg.actionData?.senderId && (
                    <>
                      <button 
                        onClick={() => handleFriendAction('ACCEPT', selectedMsg.actionData.senderId, selectedMsg._id)}
                        disabled={processingId === selectedMsg._id}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50"
                      >
                        <FaCheck /> Accept Request
                      </button>
                      <button 
                        onClick={() => handleFriendAction('REJECT', selectedMsg.actionData.senderId, selectedMsg._id)}
                        disabled={processingId === selectedMsg._id}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50"
                      >
                        <FaTimes /> Reject
                      </button>
                    </>
                  )}

                  {selectedMsg.type !== 'FRIEND_REQUEST' && !selectedMsg.isRead && (
                    <button 
                      onClick={() => handleMarkAsRead(selectedMsg._id)}
                      disabled={processingId === selectedMsg._id}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-white text-black hover:bg-gray-200 text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50"
                    >
                      Mark as Read
                    </button>
                  )}
                  
                  {selectedMsg.isRead && (
                    <span className="text-xs font-mono text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                      <FaCheck className="text-green-500/50" /> Message Read
                    </span>
                  )}
                </div>

              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Inbox;