/** Pre-Analysis numbers: `<sequence>/PREANA/MKT/<roman month>/<year>`, the sequence restarts every year. */
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** The next number of the year of `today` (YYYY-MM-DD, business time), given the numbers already in use. */
export function generatePreAnalysisNo(existingNumbers: string[], today: string): string {
  const [year, month] = today.split('-').map(Number);
  let largest = 0;
  for (const raw of existingNumbers) {
    const match = /^(\d+)\/PREANA\/MKT\/(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(\d{4})$/i.exec(String(raw).trim());
    if (match && Number(match[2]) === year) largest = Math.max(largest, Number(match[1]));
  }
  return `${String(largest + 1).padStart(3, '0')}/PREANA/MKT/${ROMAN_MONTHS[month - 1]}/${year}`;
}
