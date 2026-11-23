

export function getLoginUrl(reason?: string): string {
  const params = new URLSearchParams({next: '/crm-dashboard'});
  if (reason) params.set('reason', reason);
  return `/login?${params}`;
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
  if (!authorityName) return false;
  const target = authorityName.toLowerCase().trim();
  if (u.role && String(u.role).toLowerCase().trim() === target) return true;
  if (u.displayRole && String(u.displayRole).toLowerCase().trim() === target) return true;
  if (u.role && target.includes(`(${String(u.role).toLowerCase().trim()})`)) return true;
  if (Array.isArray(u.authorities)) {
    return u.authorities.some((a: string) => String(a).toLowerCase().trim() === target);
  }
  return false;
}
