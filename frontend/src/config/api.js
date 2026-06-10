const runtimeEnv = globalThis.window?.__ENV__ || {};
const rawApiUrl = runtimeEnv.VITE_API_URL || import.meta.env.VITE_API_URL || '';

export const API_BASE_URL = rawApiUrl.replace(/\/$/, '');

export function apiUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function wsUrl(path) {
  if (/^wss?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const localhostUrl = "http://localhost:8000";
  const baseUrl = API_BASE_URL || localhostUrl || '';
  const url = new URL(normalizedPath, baseUrl);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.toString();
}
