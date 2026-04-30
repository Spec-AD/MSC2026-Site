// ============================================================
// LazySection — IntersectionObserver 驱动的分区懒加载组件
// 用于首页将非首屏内容延迟渲染，减少初始 DOM + Layout
// ============================================================

import { useState, useEffect, useRef } from 'react';

const Placeholder = ({ height = 200 }) => (
  <div className="w-full" style={{ minHeight: height }} />
);

export default function LazySection({ children, rootMargin = '200px', height, className = '' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : <Placeholder height={height} />}
    </div>
  );
}
