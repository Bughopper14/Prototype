import {validateWrite} from '@liugong/shared';

export const API_BASE = '/api/v1';
const LOGIN_URL = '/login';
const DEDUPE_WINDOW_MS = 1500;

let isRedirecting = false;

function redirectToLogin(reason: string): Promise<never> {
  if (typeof window !== 'undefined' && !isRedirecting) {
    isRedirecting = true;
    const current = window.location.pathname + window.location.search;
    const nextParam = current && current !== '/login' ? `&next=${encodeURIComponent(current)}` : '';
    window.location.replace(`${LOGIN_URL}?reason=${encodeURIComponent(reason)}${nextParam}`);
  }
  return new Promise<never>(() => {});
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
    return redirectToLogin('Sesi Anda telah berakhir. Silakan login kembali.');
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
      return redirectToLogin(data.error || 'Sesi Anda telah berakhir. Silakan login kembali.');
    }
    const fieldErrors = data.errors?.length ? readableErrors(data.errors) : '';
    throw Object.assign(new Error(fieldErrors || data.message || data.error || 'Request failed'), {
      code: data?.code,
      missing: data?.missing,
    });
  }
  return data;
}

/**
 * Several components ask for the same resource (for example /notifications) while a page is rendering.
 * Identical GET requests made within a short window share one network call; any write clears the sharing.
 */
const recentReads = new Map<string, {startedAt: number; result: Promise<any>}>();

/** "0.currentAssets: Invalid" becomes "Row 1 · Current assets: not a valid value". The same problem is shown once. */
function readableErrors(errors: {field?: string; detail?: string}[]) {
  const words = (key: string) => {
    const text = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const lines = errors.map(e => {
    const parts = String(e.field || '').split('.').filter(Boolean);
    const label = parts.map(part => (/^\d+$/.test(part) ? `Row ${Number(part) + 1}` : words(part))).join(' / ');
    const detail = !e.detail || e.detail === 'Invalid' ? 'not a valid value' : e.detail;
    return label ? `${label}: ${detail}` : detail;
  });
  return [...new Set(lines)].join('\n');
}

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


