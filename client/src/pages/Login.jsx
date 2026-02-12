import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); // 切换 登录/注册 模式
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const { login, registerAction } = useAuth();
  const navigate = useNavigate();

  // 处理输入
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // 简单的 URL 切换
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await axios.post(endpoint, formData);
      // 成功后：
      const { token, user } = res.data;
      
      if (isLogin) {
        login(user, token);
      } else {
        registerAction(user, token);
      }
      
      // 跳转回主页
      navigate('/');
      
    } catch (err) {
      setError(err.response?.data?.msg || '操作失败，请检查网络');
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 flex flex-col items-center"
      >
        <h2 className="text-4xl font-light mb-12 tracking-widest text-white drop-shadow-lg">
          {isLogin ? '登 录' : '注 册'}
        </h2>

        {error && <div className="mb-4 text-red-400 bg-red-900/20 px-4 py-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8">
          {/* 输入框：去卡片化，只有底部边框 */}
          <div className="group relative">
            <input
              type="text"
              name="username"
              placeholder=" " 
              className="block w-full bg-transparent border-b border-gray-500 text-white text-xl py-2 focus:border-white transition-colors peer"
              onChange={handleChange}
              required
            />
            <label className="absolute left-0 -top-3.5 text-gray-400 text-sm transition-all peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-500 peer-focus:-top-3.5 peer-focus:text-gray-200 peer-focus:text-sm">
              用户名
            </label>
          </div>

          <div className="group relative">
            <input
              type="password"
              name="password"
              placeholder=" "
              className="block w-full bg-transparent border-b border-gray-500 text-white text-xl py-2 focus:border-white transition-colors peer"
              onChange={handleChange}
              required
            />
            <label className="absolute left-0 -top-3.5 text-gray-400 text-sm transition-all peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-500 peer-focus:-top-3.5 peer-focus:text-gray-200 peer-focus:text-sm">
              密码
            </label>
          </div>

          <button 
            type="submit"
            className="mt-8 py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/30 rounded text-xl transition-all hover:tracking-widest"
          >
            {isLogin ? '进入系统' : '创建账号'}
          </button>
        </form>

        {/* 切换模式 */}
        <p className="mt-8 text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
        </p>

      </motion.div>
    </div>
  );
};

export default Login;