import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaSpinner } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const OsuCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const hasRequested = useRef(false); // 防止 React 18 严格模式发两次请求

  useEffect(() => {
    const bindOsuAccount = async () => {
      if (hasRequested.current) return;
      
      // 从 URL 地址栏里把 ?code=XXXXX 提取出来
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');

      if (!code) {
        addToast('未获取到授权码，绑定失败', 'error');
        return navigate('/profile');
      }

      hasRequested.current = true;

      try {
        const token = localStorage.getItem('token');
        // 把 code 扔给后端去处理
        const res = await axios.post('/api/osu/bind', { code }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        addToast(res.data.msg, 'success');
        navigate('/profile'); // 绑定成功，送回个人资料页
      } catch (err) {
        addToast(err.response?.data?.msg || '网络错误，绑定失败', 'error');
        navigate('/profile');
      }
    };

    bindOsuAccount();
  }, [location, navigate, addToast]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center text-white pb-20">
      <FaSpinner className="animate-spin text-5xl text-pink-500 mb-6" />
      <h2 className="text-2xl font-black italic tracking-widest text-pink-400 animate-pulse">
        CONNECTING TO OSU! ...
      </h2>
      <p className="text-gray-400 mt-2 font-mono text-sm tracking-widest">正在与 Peppy 进行神秘的 PY 交易</p>
    </div>
  );
};

export default OsuCallback;