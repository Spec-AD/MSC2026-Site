const COVER_CACHE = 'msc2026-song-covers-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function isSongCover(request) {
  const url = new URL(request.url);
  return request.destination === 'image' && url.pathname.includes('/covers/');
}

async function cacheFirst(request) {
  const cache = await caches.open(COVER_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  if (isSongCover(event.request)) event.respondWith(cacheFirst(event.request));
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'MSC_PRECACHE_COVERS') return;
  const urls = Array.isArray(event.data.urls) ? [...new Set(event.data.urls)] : [];
  event.waitUntil((async () => {
    const cache = await caches.open(COVER_CACHE);
    await Promise.allSettled(urls.map(async url => {
      const request = new Request(url, { mode: 'no-cors' });
      if (await cache.match(request)) return;
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') await cache.put(request, response);
    }));
    event.ports[0]?.postMessage({ cached: urls.length });
  })());
});
