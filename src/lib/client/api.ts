import {validateWrite} from '@/lib/shared/input-validation';

export const API_BASE = '/api/v1';
const LOGIN_URL = '/login';
const DEDUPE_WINDOW_MS = 1500;

function redirectToLogin(reason: string): never {
  window.location.replace(`${LOGIN_URL}?next=/crm-dashboard&reason=${encodeURIComponent(reason)}`);
  throw new Error(reason);
}

async function request(path: string, method: string, body?: unknown) {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      credentials: 'same-origin',
      headers: body && !isForm ? {'Content-Type': 'application/json'} : {},
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new Error('Cannot connect to the server. Please try again.');
  }

  if (response.status === 401) {
    if (path.startsWith('/auth/')) return null;
    redirectToLogin('Your session has expired. Please log in again.');
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The server is temporarily unavailable. Please try again.');
  }

  if (!response.ok) {
    if (['SESSION_TIMEOUT', 'NO_SESSION', 'SESSION_EXPIRED'].includes(data?.code)) {
      redirectToLogin(data.error || 'Your session has expired. Please log in again.');
    }
    const fieldErrors = data.errors?.length
      ? data.errors.map((e: any) => `${e.field}: ${e.detail}`).join('\n')
      : '';
    throw new Error(fieldErrors || data.message || data.error || 'Request failed');
  }
  return data;
}

/**
 * Several components ask for the same resource (for example /notifications) while a page is rendering.
 * Identical GET requests made within a short window share one network call; any write clears the sharing.
 */
const recentReads = new Map<string, {startedAt: number; result: Promise<any>}>();

export function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  validateWrite(path, method, body);

  if (method !== 'GET') {
    recentReads.clear();
    return request(path, method, body);
  }

  const recent = recentReads.get(path);
  if (recent && Date.now() - recent.startedAt < DEDUPE_WINDOW_MS) return recent.result;

  const result = request(path, method);
  recentReads.set(path, {startedAt: Date.now(), result});
  result.catch(() => recentReads.delete(path));
  return result;
}

let currentUser: any = null;

export const setCurrentUser = (user: unknown) => {
  currentUser = user;
};
export const getCurrentUser = () => currentUser;

export function hasAuth(authority: string, user = currentUser): boolean {
  if (!user) return false;
  if (user.isAdmin || user.displayRole === 'Admin' || user.username === 'admin') return true;
  return Array.isArray(user.authorities) && user.authorities.includes(authority);
}

let lastActivity = '';

export function logActivity(action: string) {
  if (!action || lastActivity === action) return;
  lastActivity = action;
  api('/user-activity', 'POST', {action}).catch(() => {});
}
