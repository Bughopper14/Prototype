/** Shared helpers for CRM application intake & partner mapping against crm_liugong1. */
import {cleanNullableString, parsePortalUserId} from '../../../core/db/crm-lookups';

export const sanitizeFieldValue = (value: any, type?: string): any => {
  if (value === undefined || value === null || value === '') return null;
  if (type === 'number' || type === 'decimal' || type === 'currency') {
    const num = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  }
  if (type === 'date') return dateStr(value);
  return String(value).trim() || null;
};

export function dateStr(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function cleanDecimal(v: unknown, fallback: number | null = null): number | null {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const raw = String(v).trim().replace(/[^\d.,-]/g, '');
  if (!raw) return fallback;
  let normalized = raw;
  if ((raw.match(/\./g) || []).length > 1) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (raw.includes('.') && raw.includes(',')) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if ((raw.match(/,/g) || []).length > 1) normalized = raw.replace(/,/g, '');
  else normalized = raw.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

export function cleanInt(v: unknown, fallback = 0): number {
  const num = cleanDecimal(v);
  return num === null ? fallback : Math.max(0, Math.trunc(num));
}

export function cleanNullableInt(v: unknown): number | null {
  const num = cleanDecimal(v);
  return num === null ? null : Math.trunc(num);
}

export function actorMeta(actor: any) {
  const userId = parsePortalUserId(actor?.id);
  const actorName = String(actor?.name || actor?.username || 'System').slice(0, 150);
  const actorRole = String(actor?.role || 'SYSTEM').slice(0, 30);
  return {userId, actorName, actorRole};
}

export const shortCode = (v: unknown, maxLen: number): string | null => {
  const s = cleanNullableString(v);
  return s ? s.slice(0, maxLen) : null;
};

export const mysqlError = (message: string, status = 422) => Object.assign(new Error(message), {status});
