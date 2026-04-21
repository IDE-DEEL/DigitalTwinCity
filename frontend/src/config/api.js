const rawApiUrl = import.meta.env.VITE_API_URL || '';

export const API_BASE_URL = rawApiUrl.replace(/\/$/, '');

export function apiUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
