import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaSpinner } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const OsuCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const hasRequested = useRef(false);

  useEffect(() => {
    const bindOsuAccount = async () => {
      if (hasRequested.current) return;

      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state') || '';

      if (!code) {
        addToast('未获取到授权码，绑定失败', 'error');
        return navigate('/profile');
      }

      hasRequested.current = true;

      // 从 state 中解析用户名（格式：{username}_osu）
      const username = state.replace(/_osu$/, '');
      // 向前端传递实际使用的 redirect_uri，确保后端 token exchange 用的值一致
      const redirectUri = `${window.location.origin}/osu-callback`;

      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/osu/bind', { code, redirect_uri: redirectUri }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        addToast(res.data.msg, 'success');
        // 回传用户名，对管理员场景友好
        navigate(username ? `/profile/${username}/osu` : '/profile');
      } catch (err) {
        addToast(err.response?.data?.msg || '网络错误，绑定失败', 'error');
        navigate(username ? `/profile/${username}` : '/profile');
      }
    };

    bindOsuAccount();
  }, [location, navigate, addToast]);

  return (
    <div className="w-full min-h-screen bg-[#111115] flex flex-col items-center justify-center px-4 font-sans selection:bg-zinc-600/40">
      <div className="bg-[#18181c] border border-white/[0.05] rounded-3xl p-8 md:p-12 flex flex-col items-center shadow-xl w-full max-w-sm text-center">
        <FaSpinner className="animate-spin text-4xl text-pink-500 mb-6" />
        <h2 className="text-xl font-bold text-zinc-100 mb-2 tracking-tight">
          正在验证 osu! 授权
        </h2>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed">
          正在与 osu! 官方服务器建立安全连接<br/>请稍候，不要关闭此页面...
        </p>
      </div>
    </div>
  );
};

export default OsuCallback;
