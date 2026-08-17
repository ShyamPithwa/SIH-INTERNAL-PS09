import supabase from './supabase';

const API_BASE_URL = 'http://localhost:4000/api/v1';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  if (session) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 240 || response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'An error occurred during API call');
  }

  return data;
}

export const api = {
  get: (path: string, options?: RequestInit) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path: string, body: any, options?: RequestInit) => apiRequest(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: any, options?: RequestInit) => apiRequest(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string, options?: RequestInit) => apiRequest(path, { ...options, method: 'DELETE' }),
};
