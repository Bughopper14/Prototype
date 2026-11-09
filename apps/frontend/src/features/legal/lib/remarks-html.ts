/** Turns plain-text / numbered deed remarks into HTML for the rich editor. */

export const normalizeRemarksToHtml = (remarks?: string): string => {
  if (!remarks || !remarks.trim()) return '';
  let html = remarks;
  if (/<(ol|ul)[\s>]/i.test(html)) {
    return html.replace(/<\/ol>\s*<ol[^>]*>/gi, '').replace(/<\/ul>\s*<ul[^>]*>/gi, '');
  }
  const cleaned = html
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|span)[^>]*>/gi, '')
    .trim();
  const lines = cleaned
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const isNumbered = lines.some(l => /^(\d+)[\.\)]\s+/.test(l));
  if (isNumbered) {
    const lis = lines.map(l => {
      const stripped = l.replace(/^(\d+)[\.\)]\s+/, '').trim();
      return `<li>${stripped}</li>`;
    });
    return `<ol>${lis.join('')}</ol>`;
  }
  return lines.map(l => `<p>${l}</p>`).join('');
};
