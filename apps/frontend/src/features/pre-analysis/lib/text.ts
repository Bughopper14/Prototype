/** Small text helpers: static asset url, strip HTML, plafon number parse / format. */

/** Static files are served from /public at the site root. */
export function getStaticAssetUrl(relativePath: string): string {
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
}

export function stripHtmlTags(val: any): string {
  if (typeof val !== 'string') return val ?? '';
  if (!val.includes('<') && !val.includes('&')) return val;
  return val
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<\/?div[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parsePlafonNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val || typeof val !== 'string') return 0;
  let clean = val.replace(/Rp\s*/gi, '').trim();
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes('.') && !clean.includes(',')) {
    const parts = clean.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes(',') && !clean.includes('.')) {
    const parts = clean.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatPlafonCurrency(num: number): string {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
