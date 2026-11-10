/** What happens when a cell of the live document is clicked. */
import type {SignatoriesState} from '@/features/pre-analysis/hooks/useSignatories';
import type {PreAnalysisViewState} from '@/features/pre-analysis/hooks/usePreAnalysisView';
import type {PreviewSyncState} from '@/features/pre-analysis/hooks/usePreviewSync';

export function usePreviewActions(
  {triggerSignatorySync}: SignatoriesState,
  {setOpenSections}: PreAnalysisViewState,
  {highlightElement}: PreviewSyncState,
) {
  const handlePreviewCellClick = (fieldKey: string, sectionId?: string) => {
    if (fieldKey && fieldKey.startsWith('signatory-')) {
      const sIdx = parseInt(fieldKey.replace('signatory-', ''), 10);
      if (!isNaN(sIdx)) {
        triggerSignatorySync(sIdx);
        return;
      }
    }

    if (sectionId) {
      setOpenSections(prev => ({...prev, [sectionId]: true}));
      const formTarget = document.getElementById('acc-' + sectionId);
      if (formTarget) {
        formTarget.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      }
    }

    // Also highlight the preview cell itself
    const previewCell = document.getElementById('preana-preview-cell-' + fieldKey);
    if (previewCell) {
      highlightElement(previewCell);
    }

    if (fieldKey) {
      setTimeout(() => {
        let lookupKey = fieldKey;
        if (fieldKey === 'projectNameLocation') lookupKey = 'projectName';
        if (fieldKey === 'proposedBy') lookupKey = 'signatory-0';
        if (fieldKey === 'reviewedBy') lookupKey = 'signatory-1';
        if (fieldKey === 'approvedBy') lookupKey = 'signatory-2';
        const targetSelector = lookupKey.startsWith('slik-')
          ? `#preana-form-entity-${lookupKey.replace('slik-', '')}, [data-field="${lookupKey}"]`
          : `#preana-form-${lookupKey}, [name="${lookupKey}"], [data-field="${lookupKey}"]`;
        const targetEl = document.querySelector(targetSelector) as HTMLElement;
        if (targetEl) {
          targetEl.scrollIntoView({behavior: 'smooth', block: 'center'});
          highlightElement(targetEl);
          const firstInput = targetEl.querySelector('input, select, textarea') as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          } else {
            targetEl.focus();
          }
        }
      }, 100);
    }
  };

  return {handlePreviewCellClick};
}

export type PreviewActionsState = ReturnType<typeof usePreviewActions>;
