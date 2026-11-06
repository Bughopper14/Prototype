/** Fetch wrapper for /api/v1/um (redirects to login on an expired session) and a date formatter. */

let isUmRedirecting = false;

export async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/v1/um${path}`, {
    method,
    headers: body ? {'Content-Type': 'application/json'} : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    if (typeof window !== 'undefined' && !isUmRedirecting) {
      isUmRedirecting = true;
      const current = window.location.pathname + window.location.search;
      window.location.replace(
        `/login?reason=${encodeURIComponent('Sesi Anda telah berakhir. Silakan login kembali.')}&next=${encodeURIComponent(current)}`,
      );
    }
    return new Promise(() => {});
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (['SESSION_TIMEOUT', 'NO_SESSION', 'SESSION_EXPIRED'].includes(data?.code)) {
      if (typeof window !== 'undefined' && !isUmRedirecting) {
        isUmRedirecting = true;
        const current = window.location.pathname + window.location.search;
        window.location.replace(
          `/login?reason=${encodeURIComponent(data.error || 'Sesi Anda telah berakhir. Silakan login kembali.')}&next=${encodeURIComponent(current)}`,
        );
      }
      return new Promise(() => {});
    }
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
}

export const fmt = (value: unknown) => (value ? new Date(String(value)).toLocaleString('id-ID') : '-');
