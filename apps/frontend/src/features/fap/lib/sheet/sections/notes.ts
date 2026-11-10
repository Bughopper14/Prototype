/** Proposal notes. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';

export function applyNotes({doc, d}: {doc: Document; d: SheetValues}) {
  const prop = d.financingProposal || {};
  // Notes
  const notesCell = doc.getElementById('fap-cell-prop-notes');

  if (notesCell) {
    notesCell.innerHTML = prop.notes || '';
  }
}
