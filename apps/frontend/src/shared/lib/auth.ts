export const getGalleryUrl = () => '/gallery';

export function getLoginUrl(reason?: string): string {
  const params = new URLSearchParams({next: '/crm-dashboard'});
  if (reason) params.set('reason', reason);
  return `/login?${params}`;
}

export function redirectToGlobalLogin(reason?: string): void {
  if (typeof window === 'undefined') return;
  window.location.replace(getLoginUrl(reason));
}

export function checkIsAdmin(u: any): boolean {
  if (!u) return false;
  return Boolean(
    u.isAdmin ||
    u.is_admin ||
    u.role === 'ADMIN' ||
    u.roleBadge === 'ADMIN' ||
    u.displayRole === 'Administrator' ||
    String(u.username || '').toLowerCase() === 'admin' ||
    String(u.email || '')
      .toLowerCase()
      .includes('admin') ||
    String(u.email || '').toLowerCase() === 'axel@liugongfinance.com',
  );
}

export function hasAuthority(u: any, authorityName: string): boolean {
  if (!u) return false;
  if (checkIsAdmin(u)) return true;
  if (Array.isArray(u.authorities)) {
    return u.authorities.includes(authorityName);
  }
  return false;
}
