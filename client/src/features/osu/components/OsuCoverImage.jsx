// ============================================================
// OsuCoverImage — 带渐变占位 + IntersectionObserver 懒加载
// 解决 F5：coverUrl 无 lazy loading / 占位图
// ============================================================

import { useState, useRef, useEffect } from 'react';

export default function OsuCoverImage({ src, alt, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
  };

  const handleError = () => {
    setError(true);
    setLoaded(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-800/60 ${className}`}
    >
      {/* 渐变占位 — 加载完成前显示 */}
      {(!loaded || error) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700/40 to-gray-900/60 animate-pulse" />
      )}

      {/* 真实图片 — 进入视口后才开始加载 */}
      {inView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 加载失败回退 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}
