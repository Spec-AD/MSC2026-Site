import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); 
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
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
    /* 优化：
       - 使用 min-h-screen 代替 h-screen，防止手机键盘弹出时内容溢出无法滚动
       - 增加 py-12 确保在小屏幕上上下有留白
    */
    <div className="w-full min-h-screen flex flex-col items-center justify-center z-10 px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        /* 优化：p-6 (手机) -> p-8 (电脑) */
        className="w-full max-w-md p-6 md:p-8 flex flex-col items-center"
      >
        {/* 优化：text-3xl (手机) -> text-4xl (电脑) */}
        <h2 className="text-3xl md:text-4xl font-light mb-10 md:mb-12 tracking-[0.3em] text-white drop-shadow-lg">
          {isLogin ? '登 录' : '注 册'}
        </h2>

        {error && (
          <div className="mb-6 w-full text-red-400 bg-red-900/20 px-4 py-2 rounded text-sm text-center border border-red-500/30">
            {error}
          </div>
        )}

        {/* 优化：gap-6 (手机) -> gap-8 (电脑) */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6 md:gap-8">
          
          {/* 输入框组 */}
          <div className="group relative">
            <input
              type="text"
              name="username"
              placeholder=" " 
              /* 优化：text-lg (手机) -> text-xl (电脑)，防止 iOS 自动放大页面 */
              className="block w-full bg-transparent border-b border-gray-500 text-white text-lg md:text-xl py-2 focus:border-white transition-colors peer outline-none"
              onChange={handleChange}
              required
            />
            <label className="absolute left-0 -top-3.5 text-gray-400 text-xs md:text-sm transition-all peer-placeholder-shown:text-lg md:peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-500 peer-focus:-top-3.5 peer-focus:text-gray-200 peer-focus:text-xs md:peer-focus:text-sm">
              用户名
            </label>
          </div>

          <div className="group relative">
            <input
              type="password"
              name="password"
              placeholder=" "
              className="block w-full bg-transparent border-b border-gray-500 text-white text-lg md:text-xl py-2 focus:border-white transition-colors peer outline-none"
              onChange={handleChange}
              required
            />
            <label className="absolute left-0 -top-3.5 text-gray-400 text-xs md:text-sm transition-all peer-placeholder-shown:text-lg md:peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-500 peer-focus:-top-3.5 peer-focus:text-gray-200 peer-focus:text-xs md:peer-focus:text-sm">
              密码
            </label>
          </div>

          <button 
            type="submit"
            /* 优化：按钮宽度在手机上占满，文字大小微调 */
            className="mt-6 md:mt-8 py-3.5 px-6 bg-white/10 hover:bg-white/20 border border-white/30 rounded text-lg md:text-xl text-white transition-all active:scale-95 hover:tracking-widest"
          >
            {isLogin ? '进入系统' : '创建账号'}
          </button>
        </form>

        {/* 切换模式：增加内边距以提高手机点击精确度 */}
        <p 
          className="mt-8 text-gray-400 text-sm md:text-base cursor-pointer hover:text-white transition-colors py-2 px-4" 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
        </p>

      </motion.div>
    </div>
  );
};

export default Login;