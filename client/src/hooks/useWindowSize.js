// ============================================================
// useWindowSize — 响应式窗口尺寸 Hook
// 避免在渲染中直接使用 window.innerWidth
// ============================================================

import { useState, useEffect } from 'react';

export default function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    let ticking = false;
    const handleResize = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setSize({ width: window.innerWidth, height: window.innerHeight });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
