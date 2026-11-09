/** Form ↔ FAP preview sync: highlight a field, scroll to a section, toggle accordion sections. */
import {resolveFieldToCellId} from '@/features/fap/lib/field-cells';
import {SECTION_TO_CELL_IDS_MAP, SECTION_TO_SCROLL_TARGET_MAP} from '@/features/fap/lib/section-cells';
import {useState} from 'react';

export function useFapPreviewSync({
  customerCategory,
  customerDraft,
  draft,
  sideBySide,
  setSideBySide,
  setOpenSections,
  setActiveSyncSection,
  setActiveSyncField,
  setActiveFieldKey,
}: {
  customerCategory: string;
  customerDraft: any;
  draft: any;
  sideBySide: boolean;
  setSideBySide: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setActiveSyncSection: React.Dispatch<React.SetStateAction<string>>;
  setActiveSyncField: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveFieldKey: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [syncTick, setSyncTick] = useState<number>(() => Date.now());

  const handleTriggerFieldSync = (fieldKey: string, sectionContext?: string) => {
    if (!sideBySide) setSideBySide(true);
    const cellId = resolveFieldToCellId(fieldKey, sectionContext, {
      companyType: customerDraft?.companyType || draft?.customer?.companyType || draft?.companyType,
      customerCategory,
    });

    setActiveFieldKey(fieldKey);
    setActiveSyncField(cellId || fieldKey);
    setActiveSyncSection('');
    setSyncTick(Date.now());

    // Instant direct highlight & scroll on live preview iframe if mounted
    const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-detail-preview-col iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (!iDoc || !win) return;

        iDoc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
          el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
        });

        if (cellId) {
          const cel = iDoc.getElementById(cellId);
          if (cel) {
            cel.classList.add('fap-cell-highlight');
            const rect = cel.getBoundingClientRect();
            const currentScrollY = win.scrollY || iDoc.documentElement.scrollTop || iDoc.body.scrollTop || 0;
            const targetY = Math.max(0, currentScrollY + rect.top - 80);
            win.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.body.scrollTo({top: targetY, behavior: 'smooth'});
          }
        }

        setTimeout(() => {
          if (cellId) {
            const cel = iDoc.getElementById(cellId);
            if (cel) cel.classList.remove('fap-cell-highlight');
          }
        }, 3200);
      } catch (_) {}
    });
  };

  const handleTriggerSync = (secId: string) => {
    if (!sideBySide) setSideBySide(true);
    setActiveSyncSection(secId);
    setActiveSyncField(null);
    setActiveFieldKey(null);
    setSyncTick(Date.now());

    // Instant direct highlight & scroll on live preview iframe if mounted
    const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-detail-preview-col iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (!iDoc || !win) return;

        iDoc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
          el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
        });

        const sectionCells = SECTION_TO_CELL_IDS_MAP[secId] || [];
        sectionCells.forEach(cid => {
          const cel = iDoc.getElementById(cid);
          if (cel) cel.classList.add('fap-cell-highlight');
        });

        const targetCellId = SECTION_TO_SCROLL_TARGET_MAP[secId] || sectionCells[0];
        if (targetCellId) {
          const targetEl = iDoc.getElementById(targetCellId);
          if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const currentScrollY = win.scrollY || iDoc.documentElement.scrollTop || iDoc.body.scrollTop || 0;
            const targetY = Math.max(0, currentScrollY + rect.top - 60);
            win.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.body.scrollTo({top: targetY, behavior: 'smooth'});
          }
        }

        setTimeout(() => {
          sectionCells.forEach(cid => {
            const cel = iDoc.getElementById(cid);
            if (cel) cel.classList.remove('fap-cell-highlight');
          });
        }, 3200);
      } catch (_) {}
    });
  };

  const toggleSection = (secId: string) => {
    setOpenSections(prev => {
      const willOpen = !prev[secId];
      if (willOpen) {
        handleTriggerSync(secId);
      }
      return {...prev, [secId]: willOpen};
    });
  };

  return {syncTick, setSyncTick, handleTriggerFieldSync, handleTriggerSync, toggleSection};
}
