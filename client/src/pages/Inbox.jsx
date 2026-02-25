import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaEnvelopeOpenText, FaUserPlus, FaShieldAlt, FaServer, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import FallingIcons from '../components/FallingIcons';

const Inbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); // 防止连点

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
    } catch (err) {
      console.error('拉取信件失败', err);
    } finally {
      setLoading(false);
    }
  };

  // 标记普通信件为已读
  const handleMarkAsRead = async (id) => {
    try {
      setProcessingId(id);
      const token = localStorage.getItem('token');
      await axios.patch(`/api/messages/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // 本地更新状态，让红点消失
      setMessages(messages.map(msg => msg._id === id ? { ...msg, isRead: true } : msg));
    } catch (err) {
      alert('操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  // 处理好友请求 (同意或拒绝)
  const handleFriendAction = async (action, senderId, messageId) => {
    try {
      setProcessingId(messageId);
      const token = localStorage.getItem('token');
      const endpoint = action === 'ACCEPT' ? '/api/users/friend-request/accept' : '/api/users/friend-request/reject';
      
      const res = await axios.post(endpoint, { senderId, messageId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(res.data.message);
      fetchMessages(); // 重新拉取列表更新状态
    } catch (err) {
      alert(err.response?.data?.message || '操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  // 根据邮件类型渲染不同的图标和颜色
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

  return (
    <div className="w-full min-h-screen text-white pt-24 pb-20 px-4 md:px-8 font-sans relative overflow-x-hidden bg-gradient-to-b from-transparent to-black/80">
      <FallingIcons />

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-12 border-b border-white/10 pb-6">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 flex items-center gap-4">
            <FaEnvelopeOpenText className="text-gray-300" /> INBOX.
          </h1>
          <p className="text-gray-400 text-xs md:text-sm mt-3 tracking-widest uppercase font-mono">
            Your personal messages and notifications
          </p>
        </div>

        {/* 邮件列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20"><FaSpinner className="animate-spin text-3xl text-gray-600 mx-auto" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-gray-600 font-mono text-sm uppercase tracking-widest bg-black/40 border border-gray-800 rounded-2xl backdrop-blur-md">
              Inbox is empty.
            </div>
          ) : (
            messages.map((msg, index) => {
              const config = getTypeConfig(msg.type);
              const isUnread = !msg.isRead;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.05 }}
                  key={msg._id} 
                  className={`relative bg-black/50 backdrop-blur-md border rounded-xl p-5 md:p-6 transition-all ${
                    isUnread ? 'border-gray-500 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-gray-800 opacity-70 grayscale-[30%]'
                  }`}
                >
                  {/* 未读红点标志 */}
                  {isUnread && (
                    <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                  )}

                  {/* 发件人与类型信息 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black border border-gray-700 text-lg ${config.color}`}>
                      {msg.sender?.avatarUrl ? (
                        <img src={msg.sender.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        config.icon
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-200 flex items-center gap-2">
                        {msg.sender?.username || 'SYSTEM'}
                        <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase tracking-widest font-bold ${
                          msg.type === 'ADM_DIRECT' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
                          msg.type === 'FRIEND_REQUEST' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-0.5">
                        {new Date(msg.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* 邮件正文 */}
                  <div className="ml-0 md:ml-13 mb-4">
                    <h3 className={`text-base font-bold mb-1 ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                      {msg.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>

                  {/* 操作按钮区 */}
                  <div className="ml-0 md:ml-13 flex flex-wrap items-center gap-3">
                    
                    {/* 好友请求专属按钮 (仅未读时显示) */}
                    {msg.type === 'FRIEND_REQUEST' && isUnread && msg.actionData?.senderId && (
                      <>
                        <button 
                          onClick={() => handleFriendAction('ACCEPT', msg.actionData.senderId, msg._id)}
                          disabled={processingId === msg._id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50"
                        >
                          <FaCheck /> Accept
                        </button>
                        <button 
                          onClick={() => handleFriendAction('REJECT', msg.actionData.senderId, msg._id)}
                          disabled={processingId === msg._id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 border border-gray-700"
                        >
                          <FaTimes /> Reject
                        </button>
                      </>
                    )}

                    {/* 普通邮件标为已读按钮 (仅未读时显示) */}
                    {msg.type !== 'FRIEND_REQUEST' && isUnread && (
                      <button 
                        onClick={() => handleMarkAsRead(msg._id)}
                        disabled={processingId === msg._id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white text-black hover:bg-gray-200 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                  
                </motion.div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default Inbox;