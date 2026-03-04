import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaUser, FaLock, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); 
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { addToast } = useToast();
  
  const { login, registerAction } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await axios.post(endpoint, formData);
      const { token, user } = res.data;
      
      if (isLogin) {
        login(user, token);
      } else {
        registerAction(user, token);
      }
      
      navigate('/');
      
    } catch (err) {
      setError(err.response?.data?.msg || '操作失败，请检查网络');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#111115] text-zinc-200 flex flex-col items-center justify-center z-10 px-4 py-12 font-sans selection:bg-zinc-600/40">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-[#18181c] border border-white/[0.05] rounded-[2rem] p-8 md:p-10 shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* 顶部装饰光效 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent"></div>

        {/* 标题区 */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2">
            {isLogin ? '欢迎回来' : '加入社区'}
          </h2>
          <p className="text-sm font-medium text-zinc-500">
            {isLogin ? '登录以访问您的 PUREBEAT 终端' : '注册您的 PUREBEAT 专属账号'}
          </p>
        </div>

        {/* 错误提示框 */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl text-sm font-medium border border-rose-500/20 text-center">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          
          {/* 用户名输入组 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-400 pl-1 flex items-center gap-2">
              <FaUser className="text-xs" /> 用户名
            </label>
            <input
              type="text"
              name="username"
              placeholder="请输入您的用户名" 
              className="w-full bg-[#141418] border border-white/[0.05] text-zinc-100 text-base md:text-lg rounded-xl px-4 py-3.5 outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-colors placeholder-zinc-600"
              onChange={handleChange}
              value={formData.username}
              required
            />
          </div>

          {/* 密码输入组 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-400 pl-1 flex items-center gap-2">
              <FaLock className="text-xs" /> 密码
            </label>
            <input
              type="password"
              name="password"
              placeholder="请输入密码"
              className="w-full bg-[#141418] border border-white/[0.05] text-zinc-100 text-base md:text-lg rounded-xl px-4 py-3.5 outline-none focus:border-zinc-500 focus:bg-[#1a1a20] transition-colors placeholder-zinc-600"
              onChange={handleChange}
              value={formData.password}
              required
            />
          </div>

          {/* 提交按钮 */}
          <button 
            type="submit"
            className="mt-6 w-full py-4 bg-zinc-200 text-zinc-900 text-base font-bold rounded-xl hover:bg-white transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            {isLogin ? (
              <><FaSignInAlt /> 进入系统</>
            ) : (
              <><FaUserPlus /> 创建账号</>
            )}
          </button>
        </form>

        {/* 模式切换 (平滑的用户引导) */}
        <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
          <p 
            className="text-sm font-medium text-zinc-500 cursor-pointer hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5 p-2 rounded-lg hover:bg-white/[0.02] active:scale-95" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(''); // 切换时顺便清空报错
            }}
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？返回登录'}
          </p>
        </div>

      </motion.div>
      
      <div className="mt-12 text-zinc-600 text-xs font-medium text-center">
        PUREBEAT PROTOCOL © 2026
      </div>
    </div>
  );
};

export default Login;