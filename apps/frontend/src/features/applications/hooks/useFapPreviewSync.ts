/** Form ↔ FAP preview sync: highlight a field, scroll to a section, toggle accordion sections, follow rows. */
import {resolveFieldToCellId} from '@/features/fap/lib/field-cells';
import {SECTION_TO_CELL_IDS_MAP, SECTION_TO_SCROLL_TARGET_MAP} from '@/features/fap/lib/section-cells';
import {bankFields, blank, financialFields, projectFields} from '@liugong/shared';
import {useState} from 'react';

/** Every iframe that shows the FAP sheet (form tab, document desk, comparison). */
const PREVIEW_IFRAMES =
  '.fap-detail-preview-col iframe, #excel-fap-iframe, #excel-fap-iframe-system, .excel-fap-iframe, .fap-pane-body-system iframe, .fap-sheet-pane iframe, iframe.fap-excel-preview-iframe';

const FINANCIAL_KEYS = [
  'currentAssets',
  'nonCurrentAssets',
  'totalAssets',
  'currentLiabilities',
  'nonCurrentLiabilities',
  'totalLiabilities',
  'equity',
  'totalLiabAndEquity',
  'revenue',
  'grossMargin',
  'operatingMargin',
  'tax',
  'netIncome',
];

/** Accordion section of the FAP form for a field's section context ("banks-2", "proposal"…). */
const sectionForContext = (sectionContext?: string) =>
  sectionContext?.startsWith('projects')
    ? 'fap-preview-sec-projects'
    : sectionContext?.startsWith('banks')
      ? 'fap-preview-sec-banks'
      : sectionContext?.startsWith('financial')
        ? 'fap-preview-sec-financial'
        : sectionContext &&
            ['proposal', 'company', 'pic', 'business', 'purpose-assets'].includes(sectionContext)
          ? `fap-preview-sec-${sectionContext}`
          : undefined;

export function highlightFormElement(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove('fap-preview-sync-highlight');
  void el.offsetWidth;
  el.classList.add('fap-preview-sync-highlight');
  setTimeout(() => el.classList.remove('fap-preview-sync-highlight'), 2500);
}

export function useFapPreviewSync({
  customerCategory,
  customerDraft,
  draft,
  setDraft,
  tab,
  setTab,
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
  setDraft: React.Dispatch<any>;
  tab: number;
  setTab: React.Dispatch<React.SetStateAction<number>>;
  sideBySide: boolean;
  setSideBySide: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setActiveSyncSection: React.Dispatch<React.SetStateAction<string>>;
  setActiveSyncField: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveFieldKey: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [syncTick, setSyncTick] = useState<number>(() => Date.now());
  // Row of each repeating FAP block the form carousel and the sheet point at
  const [targetProjectRow, setTargetProjectRow] = useState<number>(0);
  const [targetBankRow, setTargetBankRow] = useState<number>(0);
  const [financialActiveIndex, setFinancialActiveIndex] = useState<number>(0);

  const forEachPreview = (fn: (doc: Document, win: Window) => void) => {
    document.querySelectorAll<HTMLIFrameElement>(PREVIEW_IFRAMES).forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (doc && win) fn(doc, win);
      } catch (_) {
        /* iframe not ready */
      }
    });
  };
  const scrollPreviewTo = (doc: Document, win: Window, el: HTMLElement, offset: number) => {
    const rect = el.getBoundingClientRect();
    const currentScrollY = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
    const targetY = Math.max(0, currentScrollY + rect.top - offset);
    win.scrollTo({top: targetY, behavior: 'smooth'});
    doc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
    doc.body.scrollTo({top: targetY, behavior: 'smooth'});
  };
  const clearHighlights = (doc: Document) =>
    doc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
      el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
    });

  const handleTriggerFieldSync = (fieldKey: string, sectionContext?: string, extraData?: any) => {
    if (!sideBySide) setSideBySide(true);
    const cellId = resolveFieldToCellId(fieldKey, sectionContext, {
      companyType: customerDraft?.companyType || draft?.customer?.companyType || draft?.companyType,
      customerCategory,
      industrySegment: draft?.industrySegment,
      businessRole: draft?.businessRole,
      targetProjectRow,
      targetBankRow,
      ...extraData,
    });

    setActiveFieldKey(fieldKey);
    setActiveSyncField(cellId || fieldKey);
    setActiveSyncSection('');
    setSyncTick(Date.now());

    // Instant direct highlight & scroll on the live preview iframes
    forEachPreview((doc, win) => {
      clearHighlights(doc);
      const cel = cellId ? doc.getElementById(cellId) : null;
      if (cel) {
        cel.classList.add('fap-cell-highlight');
        scrollPreviewTo(doc, win, cel, 80);
        setTimeout(() => cel.classList.remove('fap-cell-highlight'), 3200);
      }
    });
  };

  const handleTriggerSync = (secId: string) => {
    if (!sideBySide) setSideBySide(true);
    setActiveSyncSection(secId);
    setActiveSyncField(null);
    setActiveFieldKey(null);
    setSyncTick(Date.now());

    forEachPreview((doc, win) => {
      clearHighlights(doc);
      const sectionCells = SECTION_TO_CELL_IDS_MAP[secId] || [];
      sectionCells.forEach(cid => doc.getElementById(cid)?.classList.add('fap-cell-highlight'));
      const targetCellId = SECTION_TO_SCROLL_TARGET_MAP[secId] || sectionCells[0];
      const targetEl = targetCellId ? doc.getElementById(targetCellId) : null;
      if (targetEl) scrollPreviewTo(doc, win, targetEl, 60);
      setTimeout(
        () => sectionCells.forEach(cid => doc.getElementById(cid)?.classList.remove('fap-cell-highlight')),
        3200,
      );
    });
  };

  const toggleSection = (secId: string) => {
    setOpenSections(prev => {
      const willOpen = !prev[secId];
      if (willOpen) handleTriggerSync(secId);
      return {...prev, [secId]: willOpen};
    });
  };

  /** Opens the form section of a field, scrolls to it and focuses the input. */
  const scrollToFormElement = (fieldKey: string, sectionContext?: string, secId?: string) => {
    if (!fieldKey && !secId) return;
    const targetSecId = secId || sectionForContext(sectionContext);
    if (targetSecId) setOpenSections(prev => ({...prev, [targetSecId]: true}));

    setTimeout(() => {
      let el: HTMLElement | null = null;
      const cleanSec = sectionContext?.replace('fap-preview-sec-', '');
      if (cleanSec)
        el =
          document.querySelector(`[data-section="${cleanSec}"] [data-field="${fieldKey}"]`) ||
          document.querySelector(`[data-section="${cleanSec}"] [name="${fieldKey}"]`) ||
          document.querySelector(`[data-section="${sectionContext}"] [data-field="${fieldKey}"]`);
      if (!el && fieldKey)
        el = document.querySelector(
          `[data-field="${fieldKey}"], [name="${fieldKey}"], #fap-form-${fieldKey}`,
        );
      if (!el && fieldKey) {
        if (fieldKey === 'financialAudited' || fieldKey === 'fiscalYear' || FINANCIAL_KEYS.includes(fieldKey))
          el = document.querySelector(`[data-field="${fieldKey}"]`);
        else if (fieldKey === 'referenceComments')
          el = document.querySelector('[data-field="referenceComments"]');
        else if (fieldKey === 'totalMonthlyInstallment')
          el = document.querySelector('[data-field="totalMonthlyInstallment"]');
      }

      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        highlightFormElement(el);
        const input = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
          ? el
          : (el.querySelector('input, select, textarea') as HTMLElement | null);
        input?.focus();
        if (fieldKey === 'proposalNotes' || fieldKey === 'referenceComments') {
          try {
            (window as any).tinymce?.activeEditor?.focus();
          } catch (_) {
            /* editor not ready */
          }
        }
      } else if (targetSecId) {
        const acc = document.getElementById(`acc-${targetSecId}`);
        if (acc) {
          acc.scrollIntoView({behavior: 'smooth', block: 'start'});
          highlightFormElement(acc);
        }
      }
    }, 120);
  };

  /** A cell clicked in the FAP sheet: open its section, turn repeaters to its row, focus the field. */
  const handlePreviewCellClick = (fKey: string, sId?: string, meta?: any) => {
    if (tab !== 0) setTab(0);
    if (sId) setOpenSections(prev => ({...prev, [sId]: true}));
    const rowIndex = meta?.rowIndex;
    const ensureRows = (key: string, newRow: (missing: number) => any) => {
      const rows = draft[key] || [];
      if (rowIndex + 1 <= rows.length) return;
      const next = [...rows];
      while (next.length < rowIndex + 1) next.push(newRow(rowIndex + 1 - next.length));
      setDraft((prev: any) => ({...prev, [key]: next}));
    };
    if (rowIndex !== undefined) {
      if (meta?.repeater === 'projects') {
        ensureRows('projects', () => blank(projectFields));
        setTargetProjectRow(rowIndex);
      } else if (meta?.repeater === 'financial') {
        const year = new Date().getFullYear();
        ensureRows('financialStatements', missing => ({
          ...blank(financialFields),
          fiscalYear: year - missing,
        }));
        setFinancialActiveIndex(rowIndex);
      } else if (meta?.repeater === 'banks') {
        ensureRows('bankReferences', () => blank(bankFields));
        setTargetBankRow(rowIndex);
      }
    }
    handleTriggerFieldSync(fKey, meta?.sectionContext || sId);
    scrollToFormElement(fKey, meta?.sectionContext || sId, sId);
  };

  /** Focus or click inside the form column highlights the matching cell in the sheet. */
  const syncFromFormEvent = (target: HTMLElement | null, selector: string) => {
    if (
      !target ||
      target.closest('.tox, .tox-tinymce, iframe, .preana-rich-editor-wrapper, .crm-rich-editor-wrapper')
    )
      return;
    if (!target.matches(selector)) return;
    const formEl = (target.closest('[data-field]') as HTMLElement) || target;
    highlightFormElement(formEl);
    const fieldKey =
      formEl.getAttribute('data-field') ||
      (formEl as HTMLInputElement).name ||
      (target as HTMLInputElement).name ||
      target.getAttribute('data-field');
    const secContext =
      (target.closest('[data-section]') as HTMLElement)?.getAttribute('data-section') || undefined;
    // Deferred until the click/focus is over: these handlers run in the capture phase, and updating state there
    // re-renders before the event reaches the input, which undoes a checkbox tick or a select change.
    if (fieldKey) setTimeout(() => handleTriggerFieldSync(fieldKey, secContext), 0);
  };
  const formColumnHandlers = {
    onFocusCapture: (e: React.FocusEvent<HTMLDivElement>) => {
      if (e.isTrusted)
        syncFromFormEvent(e.target as HTMLElement, 'input, textarea, select, button, [data-field], [name]');
    },
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) =>
      syncFromFormEvent(
        e.target as HTMLElement,
        'input, textarea, select, button, [data-field], [name], label, td',
      ),
  };

  return {
    syncTick,
    setSyncTick,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    scrollToFormElement,
    handlePreviewCellClick,
    formColumnHandlers,
    targetProjectRow,
    setTargetProjectRow,
    targetBankRow,
    setTargetBankRow,
    financialActiveIndex,
    setFinancialActiveIndex,
  };
}
