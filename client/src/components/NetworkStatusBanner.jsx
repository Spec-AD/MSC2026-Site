import { useEffect, useState } from 'react';

export default function NetworkStatusBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const markOffline = () => setOffline(true);
    const markOnline = () => setOffline(false);
    window.addEventListener('offline', markOffline);
    window.addEventListener('online', markOnline);
    window.addEventListener('purebeat:api-offline', markOffline);
    window.addEventListener('purebeat:api-online', markOnline);
    return () => {
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('online', markOnline);
      window.removeEventListener('purebeat:api-offline', markOffline);
      window.removeEventListener('purebeat:api-online', markOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[9999] bg-amber-300 px-4 py-2 text-center text-sm font-black text-black shadow-lg" role="status">
      网络连接不稳定，正在保留当前画面并自动重试
    </div>
  );
}
