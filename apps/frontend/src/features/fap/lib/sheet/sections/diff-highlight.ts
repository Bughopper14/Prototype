/** Marks the cells that differ in a comparison. */
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import {FIELD_TO_CELL_ID_MAP, resolveFieldToCellId} from '@/features/fap/lib/field-cells';

export function highlightDiffCells({doc, props}: {doc: Document; props: FapSheetPreviewProps}) {
  // Highlight cells that have differences
  doc.querySelectorAll('.fap-diff-warning-cell').forEach(c => {
    c.classList.remove('fap-diff-warning-cell');
    (c as HTMLElement).style.backgroundColor = '';
    (c as HTMLElement).style.outline = '';
  });

  if (props.diffs && props.diffs.length > 0) {
    props.diffs.forEach((item: any) => {
      const cid = resolveFieldToCellId(item.field, undefined, props.data) || FIELD_TO_CELL_ID_MAP[item.field];
      if (cid) {
        const el = doc.getElementById(cid);
        if (el) {
          el.classList.add('fap-diff-warning-cell');
          (el as HTMLElement).style.backgroundColor = props.diffSide === 'ocr' ? '#fff7ed' : '#fef2f2';
          (el as HTMLElement).style.outline =
            props.diffSide === 'ocr' ? '2px solid #f97316' : '2px solid #ef4444';
        }
      }
    });
  }
}
