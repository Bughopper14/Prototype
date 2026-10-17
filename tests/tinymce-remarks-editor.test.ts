import {test} from 'node:test';
import assert from 'node:assert/strict';

// Helper mirroring the logic in App.tsx
const normalizeRemarksToHtml = (remarks?: string): string => {
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
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
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

const cleanRemarks = (remarks?: string): string => {
  return (remarks || '')
    .replace(/<\/ol>\s*<ol[^>]*>/gi, '')
    .replace(/<\/ul>\s*<ul[^>]*>/gi, '');
};

test('TinyMCE deed remarks: merges adjacent ol lists into single continuous list', () => {
  const adjacentOlHtml = '<ol><li>Poin 1</li><li>Poin 2</li></ol><ol><li>Poin 3</li></ol>';
  const normalized = normalizeRemarksToHtml(adjacentOlHtml);
  assert.equal(normalized, '<ol><li>Poin 1</li><li>Poin 2</li><li>Poin 3</li></ol>');
  
  const saved = cleanRemarks(adjacentOlHtml);
  assert.equal(saved, '<ol><li>Poin 1</li><li>Poin 2</li><li>Poin 3</li></ol>');
});

test('TinyMCE deed remarks: converts plain numbered lines to ordered list', () => {
  const plainText = '1. Perubahan susunan direksi\n2. Peningkatan modal disetor\n3. Penyesuaian KBLI';
  const normalized = normalizeRemarksToHtml(plainText);
  assert.equal(
    normalized,
    '<ol><li>Perubahan susunan direksi</li><li>Peningkatan modal disetor</li><li>Penyesuaian KBLI</li></ol>'
  );
});

test('TinyMCE deed remarks: preserves existing non-numbered paragraph text', () => {
  const text = 'Catatan umum tanpa penomoran';
  const normalized = normalizeRemarksToHtml(text);
  assert.equal(normalized, '<p>Catatan umum tanpa penomoran</p>');
});

test('TinyMCE deed remarks: handles empty or whitespace input safely', () => {
  assert.equal(normalizeRemarksToHtml(''), '');
  assert.equal(normalizeRemarksToHtml('   '), '');
  assert.equal(normalizeRemarksToHtml(undefined), '');
});
