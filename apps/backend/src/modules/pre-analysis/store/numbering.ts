/** Pre-Analysis numbers (roman month, sequence) and the list of numbers in use on crm_liugong1. */
import {pool} from '../../../core/db/pool';

export const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function getRomanMonthFromDate(dateInput?: string | Date): string {
  if (!dateInput) return 'IX';
  if (typeof dateInput === 'string') {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const lower = dateInput.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) return romanMonths[i];
    }
  }
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) return romanMonths[d.getUTCMonth()] || 'IX';
  return 'IX';
}

export function generatePreAnalysisNo(existingNumbers: string[], dateInput?: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : dateInput ? new Date(dateInput) : new Date();
  const year = !isNaN(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear();
  const romanMonth = getRomanMonthFromDate(dateInput || d);
  let largest = 0;
  for (const raw of existingNumbers) {
    if (!raw) continue;
    const match = /^(\d+)\/PREANA\/MKT\/(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(\d{4})$/i.exec(
      String(raw).trim(),
    );
    if (match && Number(match[2]) === year) {
      largest = Math.max(largest, Number(match[1]));
    }
  }
  const nextSeq = largest + 1;
  return `${String(nextSeq).padStart(3, '0')}/PREANA/MKT/${romanMonth}/${year}`;
}

export async function getAllPreAnalysisNumbers(): Promise<string[]> {
  const numbers: string[] = [];
  if (pool) {
    try {
      const [rows] = await pool.query<any[]>(
        'SELECT pre_analysis_no FROM crm_pre_analysis_forms WHERE deleted_at IS NULL AND pre_analysis_no IS NOT NULL',
      );
      for (const row of rows) {
        if (row.pre_analysis_no) numbers.push(row.pre_analysis_no);
      }
    } catch (e) {
      console.warn('Failed to query Pre-Analysis numbers from MySQL:', e);
    }
  }
  return numbers;
}
