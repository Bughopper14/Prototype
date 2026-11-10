/** FAP section ↔ field maps, filtered diffs and scrolling both panes to a section or field. */
import {FIELD_TO_CELL_ID_MAP} from '@/features/fap/lib/field-cells';
import {SECTION_TO_CELL_IDS_MAP, SECTION_TO_SCROLL_TARGET_MAP} from '@/features/fap/lib/section-cells';
import {useEffect, useMemo} from 'react';

export function useFapSectionNav({
  setActiveFileUrl,
  setActiveFile,
  fapComparison,
  setFapComparison,
  setFapRemarks,
  setRemarksSaveStatus,
  setShowHistoryModal,
  setRightViewMode,
  fapNavFilter,
  setFapNavFilter,
  setFapNavTick,
  a,
}: {
  setActiveFileUrl: React.Dispatch<React.SetStateAction<string>>;
  setActiveFile: React.Dispatch<any>;
  fapComparison: any;
  setFapComparison: React.Dispatch<any>;
  setFapRemarks: React.Dispatch<React.SetStateAction<string>>;
  setRemarksSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'unsaved' | 'saving' | 'saved'>>;
  setShowHistoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setRightViewMode: React.Dispatch<React.SetStateAction<'ocr' | 'pdf'>>;
  fapNavFilter: string;
  setFapNavFilter: React.Dispatch<React.SetStateAction<string>>;
  setFapNavTick: React.Dispatch<React.SetStateAction<number>>;
  a: any;
}) {
  const sectionFieldMap: Record<string, string[]> = {
    'fap-preview-sec-header': [
      'fapNumber',
      'applicationDate',
      'customerCategory',
      'customerStatus',
      'companyName',
      'companyType',
      'nib',
      'nibDate',
      'npwp',
      'establishmentActNo',
      'establishmentDate',
      'debtorSignature',
    ],
    'fap-preview-sec-company': [
      'branchCode',
      'customerStatus',
      'locationStatus',
      'companyAddress',
      'province',
      'city',
      'district',
      'village',
      'postalCode',
      'rt',
      'rw',
      'phoneFax',
      'email',
      'website',
    ],
    'fap-preview-sec-business': [
      'mainBusiness',
      'repaymentSource',
      'industrySegment',
      'businessRole',
      'experienceYears',
      'experienceMonths',
      'latestDeedNo',
      'latestDeedDate',
    ],
    'fap-preview-sec-pic': [
      'picName',
      'position',
      'phone',
      'email',
      'picEmail',
      'picAddress',
      'currentAddress',
      'picCity',
      'picProvince',
      'picPostalCode',
      'representativeType',
      'idNumber',
    ],
    'fap-preview-sec-purpose-assets': [
      'financingPurposeDetail',
      'assetSummaryHeLiuGong',
      'assetSummaryTruckLiuGong',
      'assetSummaryHeNonLiuGong',
      'assetSummaryTruckNonLiuGong',
    ],
    'fap-preview-sec-projects': [
      'shareholders',
      'stakeholderType',
      'projectName',
      'projectOwner',
      'projectValue',
      'contractNumber',
      'projects',
    ],
  };

  const fapSectionTitles: Record<string, string> = {
    'fap-preview-sec-header': '1. Identity',
    'fap-preview-sec-company': '2. Domicile',
    'fap-preview-sec-business': '3. Profile',
    'fap-preview-sec-pic': '4. PIC',
    'fap-preview-sec-purpose-assets': '5. Purpose & Assets',
    'fap-preview-sec-projects': '6. Projects',
    'fap-preview-sec-banks': '7. References',
    'fap-preview-sec-proposal': '8. Financing Proposal',
    'fap-preview-sec-financial': '9. Financial Statements',
  };

  const filteredDiffs = useMemo(() => {
    if (!fapComparison?.diffs) return [];
    if (fapNavFilter === 'all') return fapComparison.diffs;
    const allowed = sectionFieldMap[fapNavFilter] || [];
    // Shareholder rows (stakeholder_*, shareholder_*) are listed with the projects block they sit next to
    return fapComparison.diffs.filter(
      (d: any) =>
        allowed.includes(d.field) ||
        (fapNavFilter === 'fap-preview-sec-projects' &&
          (d.field.startsWith('stakeholder_') || d.field.startsWith('shareholder_'))),
    );
  }, [fapComparison, fapNavFilter]);

  // Reset state when switching application to prevent cross-application data leakage
  useEffect(() => {
    setActiveFile(null);
    setActiveFileUrl('');
    setFapComparison(null);
    setFapRemarks('');
    setRemarksSaveStatus('idle');
    setShowHistoryModal(false);
    setRightViewMode('ocr');
    setFapNavFilter('all');
  }, [a.id]);

  const scrollToFapField = (fieldKey: string) => {
    const el = document.getElementById(`fap-diff-cell-${fieldKey}`);
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'center'});
      el.classList.remove('fap-preview-sync-highlight');
      void el.offsetWidth;
      el.classList.add('fap-preview-sync-highlight');
      setTimeout(() => {
        el.classList.remove('fap-preview-sync-highlight');
      }, 2500);
    }

    const cellId = FIELD_TO_CELL_ID_MAP[fieldKey];
    if (cellId) {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-pane-card iframe');
      iframes.forEach(iframe => {
        try {
          const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
          const win = iframe.contentWindow;
          if (!iDoc || !win) return;
          const targetEl = iDoc.getElementById(cellId);
          if (targetEl) {
            targetEl.classList.remove('fap-cell-highlight');
            void targetEl.offsetWidth;
            targetEl.classList.add('fap-cell-highlight');
            const rect = targetEl.getBoundingClientRect();
            const currentScrollY = win.scrollY || iDoc.documentElement.scrollTop || iDoc.body.scrollTop || 0;
            const targetY = Math.max(0, currentScrollY + rect.top - 80);
            win.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.body.scrollTo({top: targetY, behavior: 'smooth'});
            setTimeout(() => targetEl.classList.remove('fap-cell-highlight'), 3000);
          }
        } catch {}
      });
    }
  };

  const scrollToFapSection = (secId: string) => {
    setFapNavFilter(secId);
    setFapNavTick(Date.now());

    // Scroll and highlight inside both iframes within .fap-pane-card (System FAP & OCR FAP)
    const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-pane-card iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (!iDoc || !win) return;

        // Clear existing highlights
        iDoc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
          el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
        });

        if (secId === 'all') {
          win.scrollTo({top: 0, behavior: 'smooth'});
          iDoc.documentElement.scrollTo({top: 0, behavior: 'smooth'});
          iDoc.body.scrollTo({top: 0, behavior: 'smooth'});
          return;
        }

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
      } catch (err) {
        console.warn('Could not scroll iframe section:', err);
      }
    });
  };

  return {sectionFieldMap, fapSectionTitles, filteredDiffs, scrollToFapField, scrollToFapSection};
}
