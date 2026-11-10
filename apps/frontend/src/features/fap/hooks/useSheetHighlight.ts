/** Highlights and scrolls to the cell (or section cells) that is active in the form, inside the sheet iframe. */
import {useEffect, type RefObject} from 'react';
import {FIELD_TO_CELL_ID_MAP, resolveFieldToCellId} from '@/features/fap/lib/field-cells';
import {
  SECTION_TO_CELL_IDS_MAP,
  SECTION_TO_SCROLL_TARGET_MAP,
  SECTION_TO_CELL_ID_MAP,
} from '@/features/fap/lib/section-cells';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';

export function useSheetHighlight(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  props: FapSheetPreviewProps,
) {
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    // Clear old highlights
    doc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(h => {
      h.classList.remove('fap-cell-highlight', 'fap-section-highlight');
    });

    if (!props.activeSection && !props.activeField) return;

    if (props.activeSection === 'all') {
      win.scrollTo({top: 0, behavior: 'smooth'});
      doc.documentElement.scrollTo({top: 0, behavior: 'smooth'});
      doc.body.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }

    let cellIdsToHighlight: string[] = [];
    let scrollTargetCellId: string | null = null;

    if (props.activeField) {
      const cid =
        resolveFieldToCellId(props.activeField, props.activeSection || undefined, props.data) ||
        FIELD_TO_CELL_ID_MAP[props.activeField] ||
        (props.activeField.startsWith('fap-cell-') ? props.activeField : null);
      if (cid) {
        cellIdsToHighlight.push(cid);
        scrollTargetCellId = cid;
      }
    } else if (props.activeSection) {
      const sectionCells = SECTION_TO_CELL_IDS_MAP[props.activeSection];
      if (sectionCells && sectionCells.length > 0) {
        cellIdsToHighlight = sectionCells;
        scrollTargetCellId = SECTION_TO_SCROLL_TARGET_MAP[props.activeSection] || sectionCells[0];
      } else {
        const single = SECTION_TO_CELL_ID_MAP[props.activeSection] || props.activeSection;
        if (single) {
          cellIdsToHighlight.push(single);
          scrollTargetCellId = single;
        }
      }
    }

    if (cellIdsToHighlight.length === 0 && !scrollTargetCellId) return;

    // Highlight all target cells with blue theme
    cellIdsToHighlight.forEach(cid => {
      const cel = doc.getElementById(cid);
      if (cel) {
        cel.classList.add('fap-cell-highlight');
      }
    });

    // Robust pixel-level scroll calculation inside iframe
    const scrollTargetEl = scrollTargetCellId ? doc.getElementById(scrollTargetCellId) : null;
    if (scrollTargetEl) {
      const rect = scrollTargetEl.getBoundingClientRect();
      const currentScrollY = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      const targetY = Math.max(0, currentScrollY + rect.top - 60);

      win.scrollTo({top: targetY, behavior: 'smooth'});
      doc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
      doc.body.scrollTo({top: targetY, behavior: 'smooth'});
    }

    const timer = setTimeout(() => {
      cellIdsToHighlight.forEach(cid => {
        const cel = doc.getElementById(cid);
        if (cel) cel.classList.remove('fap-cell-highlight');
      });
    }, 3200);
    return () => clearTimeout(timer);
  }, [props.activeSection, props.activeField, props.syncTick]);
}
