import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSpinner, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import { bindOsuAccount } from '../features/osu/api/osuApi';

const OsuCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const hasRequested = useRef(false);
  const mountedRef = useRef(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const doBind = useCallback(async () => {
    if (hasRequested.current) return;
    hasRequested.current = true;

    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state') || '';

    if (!code) {
      if (mountedRef.current) {
        addToast('未获取到授权码，绑定失败', 'error');
        navigate('/profile');
      }
      return;
    }

    const username = state.replace(/_osu$/, '');
    const redirectUri = `${window.location.origin}/osu-callback`;

    try {
      const res = await bindOsuAccount(code, redirectUri);
      if (!mountedRef.current) return;

      addToast(res.data.msg, 'success');
      navigate(username ? `/profile/${username}/osu` : '/profile');
    } catch (err) {
      if (!mountedRef.current) return;

      const errMsg = err.response?.data?.msg || '网络错误，绑定失败';
      addToast(errMsg, 'error');
      setError(errMsg);
      // 不清除 hasRequested 以便重试
    }
  }, [location.search, navigate, addToast]);

  useEffect(() => {
    mountedRef.current = true;
    doBind();

    return () => {
      mountedRef.current = false;
      hasRequested.current = false; // F2: cleanup 重置 ref
    };
  }, [doBind]);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    setError(null);
    hasRequested.current = false; // 允许重新请求
    doBind().finally(() => setRetrying(false));
  }, [doBind]);

  // 正常加载中
  if (!error) {
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
  }

  // 错误状态 + 重试按钮 (F1)
  return (
    <div className="w-full min-h-screen bg-[#111115] flex flex-col items-center justify-center px-4 font-sans selection:bg-zinc-600/40">
      <div className="bg-[#18181c] border border-red-500/20 rounded-3xl p-8 md:p-12 flex flex-col items-center shadow-xl w-full max-w-sm text-center">
        <FaExclamationTriangle className="text-4xl text-red-400 mb-6" />
        <h2 className="text-xl font-bold text-zinc-100 mb-2 tracking-tight">
          绑定失败
        </h2>
        <p className="text-zinc-500 text-sm font-medium mb-6 leading-relaxed">
          {error}
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 rounded-xl"
        >
          {retrying ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaRedo />
          )}
          重新尝试绑定
        </button>
      </div>
    </div>
  );
};

export default OsuCallback;
