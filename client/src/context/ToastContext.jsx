import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

// 1. 创建 Context
const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

// 2. Provider 组件
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // 触发 Toast 的核心函数
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    // 定时自动移除
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* 消息容器：固定在右上角，顺次排列 */}
      <div className="fixed top-20 md:top-24 right-4 md:right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// 3. 单个 Toast 卡片组件
const ToastItem = ({ toast, onRemove }) => {
  // 根据类型配置不同的图标和颜色
  const theme = {
    success: { icon: <FaCheckCircle className="text-green-400 text-xl drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />, border: 'border-green-500/50', bar: 'bg-gradient-to-r from-green-400 to-green-600' },
    error: { icon: <FaExclamationCircle className="text-red-400 text-xl drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />, border: 'border-red-500/50', bar: 'bg-gradient-to-r from-red-400 to-red-600' },
    info: { icon: <FaInfoCircle className="text-cyan-400 text-xl drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />, border: 'border-cyan-500/50', bar: 'bg-gradient-to-r from-cyan-400 to-blue-500' }
  }[toast.type] || theme.info;

  return (
    <motion.layout
      layout // 使多条消息可以平滑推挤
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto relative w-72 md:w-80 bg-gray-900/90 backdrop-blur-xl border ${theme.border} shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden p-4 flex items-start gap-3`}
    >
      <div className="shrink-0 mt-0.5">{theme.icon}</div>
      <div className="flex-1 text-sm font-bold text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
        {toast.message}
      </div>
      <button onClick={onRemove} className="shrink-0 text-gray-500 hover:text-white transition-colors cursor-pointer">
        <FaTimes />
      </button>
      
      {/* 倒计时进度条 */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: 0 }}
        transition={{ duration: toast.duration / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-1 ${theme.bar}`}
      />
    </motion.layout>
  );
};