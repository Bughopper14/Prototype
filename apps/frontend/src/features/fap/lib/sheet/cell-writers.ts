/** Small helpers that write text into the cells of the sheet document. */
export function createCellWriters(doc: Document) {
  const isNoneVal = (val: any): boolean => {
    if (val === undefined || val === null) return true;
    const str = String(val).trim();
    if (!str) return true;
    const upper = str.toUpperCase();
    const lower = str.toLowerCase();
    return (
      upper === 'NONE' ||
      upper === '-' ||
      lower === 'none' ||
      lower === 'select' ||
      lower === 'pilih' ||
      lower.startsWith('select ') ||
      lower.startsWith('pilih ')
    );
  };

  const setText = (id: string, text: any) => {
    const el = doc.getElementById(id);
    if (el) {
      el.textContent = isNoneVal(text) ? '' : String(text).trim();
    }
  };

  const formatFapDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const m = String(dateStr)
      .trim()
      .match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[1]}`;
    return String(dateStr).trim();
  };
  return {isNoneVal, setText, formatFapDate};
}

export type CellWriters = ReturnType<typeof createCellWriters>;
