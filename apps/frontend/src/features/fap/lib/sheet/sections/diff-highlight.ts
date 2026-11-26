/** Marks the cells that differ in a comparison. */
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import {resolveFieldCellIds} from '@/features/fap/lib/field-cells';

export function highlightDiffCells({doc, props}: {doc: Document; props: FapSheetPreviewProps}) {
  // Highlight cells that have differences
  doc.querySelectorAll('.fap-diff-warning-cell').forEach(c => {
    c.classList.remove('fap-diff-warning-cell');
    (c as HTMLElement).style.backgroundColor = '';
    (c as HTMLElement).style.outline = '';
    (c as HTMLElement).style.boxShadow = '';
  });

  if (props.diffs && props.diffs.length > 0) {
    const methodFromDiff = props.diffs.find((d: any) => d.field === 'financingMethod');
    const detectedMethod =
      props.data?.financingMethod ||
      props.data?.facilityProposed?.financingMethod ||
      methodFromDiff?.newValue ||
      methodFromDiff?.oldValue;

    const extraData = {
      ...props.data,
      financingMethod: detectedMethod || props.data?.financingMethod,
    };

    props.diffs.forEach((item: any) => {
      const cids = resolveFieldCellIds(item.field, item.section, extraData);
      for (const cid of cids) {
        const el = doc.getElementById(cid);
        if (el) {
          el.classList.add('fap-diff-warning-cell');
          const isOcr = props.diffSide === 'ocr';
          const bg = isOcr ? '#fff7ed' : '#fef2f2';
          const border = isOcr ? '#f97316' : '#ef4444';
          (el as HTMLElement).style.backgroundColor = bg;
          (el as HTMLElement).style.outline = `2px solid ${border}`;
          (el as HTMLElement).style.outlineOffset = '-2px';
          (el as HTMLElement).style.boxShadow = `inset 0 0 0 2px ${border}`;
        }
      }
    });
  }
}
