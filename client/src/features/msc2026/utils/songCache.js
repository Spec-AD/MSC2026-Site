const CONFIG_CACHE_KEY = 'msc2026:song-config:v2';
const CACHE_STATUS_KEY = 'msc2026:song-cache-status:v1';

function canUseBrowserStorage() {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readCachedSongConfig() {
  if (!canUseBrowserStorage()) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONFIG_CACHE_KEY));
    return parsed?.data && typeof parsed.data === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedSongConfig(data) {
  if (!canUseBrowserStorage() || !data) return;
  try {
    window.localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data }));
  } catch {
    // 本地缓存不可用不应影响已持久化的比赛配置。
  }
}

export function readSongCacheStatus() {
  if (!canUseBrowserStorage()) return null;
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_STATUS_KEY));
  } catch {
    return null;
  }
}

export function collectSongs(...sources) {
  const songs = [];
  const visit = value => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (value.song) visit(value.song);
    if (value.coverUrl || value.title) songs.push(value);
  };
  sources.forEach(visit);
  return [...new Map(songs.map(song => [String(song._id || song.songId || song.id || song.coverUrl), song])).values()];
}

async function registerCacheWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.register('/msc-cache-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function warmSongCache(songs) {
  if (typeof navigator === 'undefined') return { cached: 0, supported: false };
  const uniqueSongs = collectSongs(songs);
  const urls = [...new Set(uniqueSongs.map(song => song.coverUrl).filter(Boolean))];
  const registration = await registerCacheWorker().catch(() => null);
  const worker = navigator.serviceWorker.controller || registration?.active || registration?.waiting;
  if (worker && typeof MessageChannel !== 'undefined') {
    await Promise.race([
      new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = resolve;
        worker.postMessage({ type: 'MSC_PRECACHE_COVERS', urls }, [channel.port2]);
      }),
      new Promise(resolve => window.setTimeout(resolve, 15000)),
    ]);
  }

  await Promise.allSettled(urls.map(url => new Promise(resolve => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = url;
  })));

  const status = { cachedAt: Date.now(), songCount: uniqueSongs.length, coverCount: urls.length };
  if (canUseBrowserStorage()) {
    try {
      window.localStorage.setItem(CACHE_STATUS_KEY, JSON.stringify(status));
    } catch {
      // 素材已进入 HTTP/Service Worker 缓存，状态摘要写入失败可忽略。
    }
  }
  return { ...status, supported: Boolean(registration) };
}
