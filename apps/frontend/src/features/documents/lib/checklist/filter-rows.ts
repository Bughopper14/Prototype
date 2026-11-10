/** Applies the search text, department and status filters of the checklist. */
import type {ChecklistRow, StatusFilter} from '@/features/documents/lib/checklist/types';

export function filterRows(
  rows: ChecklistRow[],
  searchTerm: string,
  selectedDept: string,
  selectedStatus: StatusFilter,
) {
  return rows.filter(r => {
    const matchSearch =
      searchTerm === '' ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sourceDetails.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDept === 'ALL' || r.department === selectedDept;

    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'AVAILABLE' && r.isAvailable) ||
      (selectedStatus === 'PENDING' && !r.isAvailable);

    return matchSearch && matchDept && matchStatus;
  });
}
