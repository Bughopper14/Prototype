/** Small value formatters of the application diff. */

/** Rupiah text of an amount. */
export function formatMoneyVal(val: any): string {
  const n = Number(val);
  if (isNaN(n) || n === 0) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

/** Trimmed text of any value; empty for null / undefined. */
export function cleanVal(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
