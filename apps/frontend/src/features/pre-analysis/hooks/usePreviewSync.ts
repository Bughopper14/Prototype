/** Keeps the form and the live document in step: scrolls to and highlights the matching cell, and opens sections. */
import {useRef} from 'react';
import type {PreAnalysisViewState} from '@/features/pre-analysis/hooks/usePreAnalysisView';

export function usePreviewSync({
  setOpenSections,
  isInitialMountRef,
  viewMode,
  setViewMode,
}: PreAnalysisViewState) {
  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const nextOpen = !prev[id];
      if (nextOpen) {
        const secMap: Record<string, string> = {
          sec1: 'preana-preview-sec-1',
          sec2: 'preana-preview-sec-2',
          sec3: 'preana-preview-sec-3',
          sec4: 'preana-preview-sec-4',
          sec5: 'preana-preview-sec-5',
          sec6: 'preana-preview-sec-6',
          sec7: 'preana-preview-sec-7',
        };
        if (secMap[id]) {
          scrollToPreviewElement(secMap[id]);
        }
      }
      return {...prev, [id]: nextOpen};
    });
  };

  const highlightElement = (el: HTMLElement | null) => {
    if (!el) return;
    el.classList.remove('fap-preview-sync-highlight');
    void el.offsetWidth;
    el.classList.add('fap-preview-sync-highlight');
    setTimeout(() => {
      el.classList.remove('fap-preview-sync-highlight');
    }, 2500);
  };

  // Sync scroll & highlight helper
  const scrollToPreviewElement = (elementId: string, formTriggerElOrKey?: HTMLElement | string) => {
    if (isInitialMountRef.current) return;
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    setTimeout(() => {
      let el = document.getElementById(elementId);
      if (!el && elementId.startsWith('preana-preview-cell-signatory-')) {
        const sIdx = elementId.replace('preana-preview-cell-signatory-', '');
        if (sIdx === '0')
          el =
            document.getElementById('preana-preview-cell-proposedBy') ||
            document.getElementById('preana-preview-cell-signatory-0');
        else if (sIdx === '1')
          el =
            document.getElementById('preana-preview-cell-reviewedBy') ||
            document.getElementById('preana-preview-cell-signatory-1');
        else if (sIdx === '2')
          el =
            document.getElementById('preana-preview-cell-approvedBy') ||
            document.getElementById('preana-preview-cell-signatory-2');
      }
      if (!el && elementId === 'preana-preview-cell-proposedBy') {
        el =
          document.getElementById('preana-preview-cell-signatory-0') ||
          document.getElementById('preana-preview-cell-proposedBy');
      }
      if (!el && elementId === 'preana-preview-cell-reviewedBy') {
        el =
          document.getElementById('preana-preview-cell-signatory-1') ||
          document.getElementById('preana-preview-cell-reviewedBy');
      }
      if (!el && elementId === 'preana-preview-cell-approvedBy') {
        el =
          document.getElementById('preana-preview-cell-signatory-2') ||
          document.getElementById('preana-preview-cell-approvedBy');
      }
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        highlightElement(el);
      }
    }, 50);

    if (formTriggerElOrKey) {
      if (typeof formTriggerElOrKey === 'string') {
        const sel = formTriggerElOrKey.startsWith('slik-')
          ? `#preana-form-entity-${formTriggerElOrKey.replace('slik-', '')}, [data-field="${formTriggerElOrKey}"]`
          : `#preana-form-${formTriggerElOrKey}, [name="${formTriggerElOrKey}"], [data-field="${formTriggerElOrKey}"]`;
        const formEl = document.querySelector(sel) as HTMLElement;
        if (formEl) highlightElement(formEl);
      } else if (formTriggerElOrKey instanceof HTMLElement) {
        const highlightTarget =
          (formTriggerElOrKey.closest('[data-field]') as HTMLElement) || formTriggerElOrKey;
        highlightElement(highlightTarget);
      }
    }
  };

  const scrollDebounceRef = useRef<any>(null);

  const autoSyncPreview = (fieldKey: string) => {
    if (isInitialMountRef.current) return;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (isInitialMountRef.current) return;
      const targetId = 'preana-preview-cell-' + fieldKey;
      if (document.getElementById(targetId)) {
        scrollToPreviewElement(targetId);
      }
    }, 250);
  };

  return {scrollToPreviewElement, highlightElement, toggleSection, autoSyncPreview};
}

export type PreviewSyncState = ReturnType<typeof usePreviewSync>;
