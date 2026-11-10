/** Project owner table, up to 7 rows. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyProjects({
  d,
  setText,
  isNoneVal,
}: {
  d: SheetValues;
  setText: CellWriters['setText'];
  isNoneVal: CellWriters['isNoneVal'];
}) {
  // Projects (Pemilik Proyek / Project Owner table)
  const projList = d.projects || [];

  for (let i = 0; i < 7; i++) {
    const item = projList[i] || {};
    setText(`fap-cell-proj-${i}-owner`, item.projectOwner || '');
    setText(`fap-cell-proj-${i}-loc`, item.projectLocation || item.location || '');
    const rawRole = (item.projectRole || item.roleInProject || '').trim();
    const displayRole = !isNoneVal(rawRole) ? rawRole : '';
    setText(`fap-cell-proj-${i}-role`, displayRole);
    const rawStatus = (item.contractStatus || item.status || '').trim();
    const displayStatus = !isNoneVal(rawStatus)
      ? rawStatus.toUpperCase() === 'EXISTING'
        ? 'Existing'
        : rawStatus.toUpperCase() === 'NEW'
          ? 'New'
          : rawStatus
      : '';
    setText(`fap-cell-proj-${i}-status`, displayStatus);
  }
}
