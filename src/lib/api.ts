// Standalone API helper - no store dependency, reads token from Zustand directly
import { useAppStore } from '@/lib/store';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAppStore.getState().token;
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}

export async function apiPost(url: string, body: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiDelete(url: string, body?: unknown): Promise<Response> {
  if (body) {
    return apiFetch(url, { method: 'DELETE', body: JSON.stringify(body) });
  }
  return apiFetch(url, { method: 'DELETE' });
}

export async function apiPut(url: string, body: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}