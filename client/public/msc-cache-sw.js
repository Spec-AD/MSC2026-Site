const COVER_CACHE = 'msc2026-song-covers-v2';
const FETCH_TIMEOUT_MS = 7000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function isSongCover(request) {
  const url = new URL(request.url);
  return request.destination === 'image' && url.pathname.includes('/covers/');
}

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(COVER_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#111318"/><text x="150" y="170" fill="#52525b" font-size="96" text-anchor="middle">?</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } },
    );
  }
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
      const response = await fetchWithTimeout(request);
      if (response.ok || response.type === 'opaque') await cache.put(request, response);
    }));
    event.ports[0]?.postMessage({ cached: urls.length });
  })());
});
