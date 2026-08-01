const RELOAD_KEY = 'purebeat:chunk-reload-at';
const RETRY_WINDOW_MS = 30_000;

export function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(message);
}

/**
 * A browser tab can keep an old Vite entry document open while a new deployment
 * replaces its hashed chunks. Reload once so the tab receives the new manifest.
 */
export function recoverChunkLoad(error) {
  if (!isChunkLoadError(error) || typeof window === 'undefined') return false;

  const previousAttempt = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
  const now = Date.now();
  if (now - previousAttempt < RETRY_WINDOW_MS) return false;

  window.sessionStorage.setItem(RELOAD_KEY, String(now));
  window.setTimeout(() => window.location.reload(), 500);
  return true;
}
