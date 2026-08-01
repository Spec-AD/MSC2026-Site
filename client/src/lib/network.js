import axios from 'axios';

const configuredOrigin = String(import.meta.env.VITE_API_ORIGIN || '').trim().replace(/\/$/, '');

export const API_ORIGIN = configuredOrigin;

if (API_ORIGIN) axios.defaults.baseURL = API_ORIGIN;
axios.defaults.timeout = 10_000;

export function resolveApiUrl(path) {
  if (!API_ORIGIN || /^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

function emitNetworkState(type, detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

axios.interceptors.response.use(
  response => {
    emitNetworkState('purebeat:api-online');
    return response;
  },
  async error => {
    const config = error.config || {};
    const status = error.response?.status;
    const retryable = (!status || status === 408 || status === 429 || status >= 500)
      && String(config.method || 'get').toLowerCase() === 'get'
      && !config.__purebeatRetried;

    if (retryable) {
      config.__purebeatRetried = true;
      await new Promise(resolve => window.setTimeout(resolve, 350 + Math.random() * 450));
      return axios(config);
    }

    if (!status || status >= 500) {
      emitNetworkState('purebeat:api-offline', { status: status || 0 });
    }
    return Promise.reject(error);
  },
);
