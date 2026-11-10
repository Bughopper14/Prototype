/** Changes found in: Financial statements. */
import type {DiffContext} from '@/features/activity/lib/diff/types';

export function diffFinancialStatements({draft, changes}: DiffContext) {
  const newStatements = Array.isArray(draft.financialStatements) ? draft.financialStatements : [];
  changes.push({
    section: 'Financial statements',
    subSection: 'Balance Sheet & Income Statement',
    field: 'financialStatements',
    label: 'Laporan Keuangan',
    oldValue: 'Catatan keuangan periode lalu',
    newValue: `Diperbarui performa keuangan untuk ${newStatements.length || 3} tahun buku.`,
  });
}
