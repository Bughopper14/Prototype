/** Counters shown in the metric cards above the checklist. */
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function summarizeRows(rows: ChecklistRow[]) {
  const totalCount = rows.length;
  const availableCount = rows.filter(r => r.isAvailable).length;
  return {
    totalCount,
    availableCount,
    pendingCount: totalCount - availableCount,
    mandatoryCount: rows.filter(r => r.isMandatory).length,
    mandatoryAvailableCount: rows.filter(r => r.isMandatory && r.isAvailable).length,
    systemLinkedCount: rows.filter(r => r.sourceType === 'SYSTEM_LINKED').length,
  };
}
