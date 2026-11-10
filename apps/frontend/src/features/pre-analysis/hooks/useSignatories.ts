/** The sign-off list (propose / review / approve by): editing it and highlighting it in the document. */
import {useMemo} from 'react';
import type {SignatoryItem, PreAnalysisData} from '@/features/pre-analysis/lib/types';
import type {PreAnalysisViewState} from '@/features/pre-analysis/hooks/usePreAnalysisView';
import type {PreviewSyncState} from '@/features/pre-analysis/hooks/usePreviewSync';
import type {PreAnalysisDataState} from '@/features/pre-analysis/hooks/usePreAnalysisData';

export function useSignatories(
  {setOpenSections}: PreAnalysisViewState,
  {highlightElement, scrollToPreviewElement}: PreviewSyncState,
  {data, setData}: PreAnalysisDataState,
) {
  const highlightAllSignatureDates = () => {
    setOpenSections(prev => ({...prev, sec7: true}));
    const dateInput = document.querySelector('input[name="signatureDate"]') as HTMLElement;
    if (dateInput) {
      highlightElement(dateInput);
    }

    currentSignatories.forEach((_, idx) => {
      const cellId =
        idx === 0
          ? 'preana-preview-cell-proposedBy'
          : idx === 1
            ? 'preana-preview-cell-reviewedBy'
            : idx === 2
              ? 'preana-preview-cell-approvedBy'
              : `preana-preview-cell-signatory-${idx}`;
      const el = document.getElementById(cellId);
      if (el) highlightElement(el);
      const dateEl = document.getElementById(`preana-preview-sig-date-${idx}`);
      if (dateEl) highlightElement(dateEl);
    });

    const firstCell =
      document.getElementById('preana-preview-cell-proposedBy') ||
      document.getElementById('preana-preview-cell-signatory-0') ||
      document.getElementById('preana-preview-sec-7');
    if (firstCell) {
      firstCell.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }
  };

  const triggerSignatorySync = (idx: number) => {
    setOpenSections(prev => ({...prev, sec7: true}));

    // Highlight left side (form input card)
    const cardEl =
      document.getElementById(`preana-form-signatory-${idx}`) ||
      (document.querySelector(`[data-field="signatory-${idx}"]`) as HTMLElement);
    if (cardEl) {
      cardEl.scrollIntoView({behavior: 'smooth', block: 'center'});
      highlightElement(cardEl);
      const nameInput = cardEl.querySelector('input[type="text"]') as HTMLElement;
      if (nameInput) {
        highlightElement(nameInput);
      }
    }

    // Highlight right side (Digital Twin preview columns)
    const headEl = document.getElementById(`preana-preview-cell-sign-head-${idx}`);
    const signEl = document.getElementById(`preana-preview-cell-sign-${idx}`);
    const cellId =
      idx === 0
        ? 'preana-preview-cell-proposedBy'
        : idx === 1
          ? 'preana-preview-cell-reviewedBy'
          : idx === 2
            ? 'preana-preview-cell-approvedBy'
            : `preana-preview-cell-signatory-${idx}`;
    const infoEl =
      document.getElementById(cellId) || document.getElementById(`preana-preview-cell-signatory-${idx}`);

    if (headEl) highlightElement(headEl);
    if (signEl) highlightElement(signEl);
    if (infoEl) {
      highlightElement(infoEl);
      infoEl.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    } else if (signEl) {
      signEl.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }
  };

  const currentSignatories = useMemo<SignatoryItem[]>(() => {
    if (data.signatories && Array.isArray(data.signatories) && data.signatories.length > 0) {
      return data.signatories;
    }
    const splitProp = (data.proposedBy || 'Amanda Cynthia\nSenior Account Manager').split('\n');
    const splitRev = (data.reviewedBy || 'Maria Regina\nDept. Head Marketing').split('\n');
    const splitApp = (data.approvedBy || 'Jembar Ganda E\nDirector').split('\n');

    return [
      {
        id: 'sig-1',
        role: 'Propose by :',
        name: splitProp[0] || 'Amanda Cynthia',
        position: splitProp.slice(1).join('\n') || 'Senior Account Manager',
        date: '',
      },
      {
        id: 'sig-2',
        role: 'Reviewed by :',
        name: splitRev[0] || 'Maria Regina',
        position: splitRev.slice(1).join('\n') || 'Dept. Head Marketing',
        date: '',
      },
      {
        id: 'sig-3',
        role: 'Approved by :',
        name: splitApp[0] || 'Jembar Ganda E',
        position: splitApp.slice(1).join('\n') || 'Director',
        date: '',
      },
    ];
  }, [data.signatories, data.proposedBy, data.reviewedBy, data.approvedBy]);

  const updateSignatories = (newList: SignatoryItem[]) => {
    const patch: Partial<PreAnalysisData> = {
      signatories: newList,
    };
    if (newList[0]) patch.proposedBy = `${newList[0].name}\n${newList[0].position}`.trim();
    if (newList[1]) patch.reviewedBy = `${newList[1].name}\n${newList[1].position}`.trim();
    if (newList[2]) patch.approvedBy = `${newList[2].name}\n${newList[2].position}`.trim();

    setData(prev => ({
      ...prev,
      ...patch,
    }));
  };

  const handleUpdateSignatory = (idx: number, patch: Partial<SignatoryItem>) => {
    const updated = currentSignatories.map((sig, i) => (i === idx ? {...sig, ...patch} : sig));
    updateSignatories(updated);
  };

  const handleAddSignatory = () => {
    const defaultRole =
      currentSignatories.length === 0
        ? 'Propose by :'
        : currentSignatories.length === 1
          ? 'Reviewed by :'
          : 'Approved by :';
    const newSig: SignatoryItem = {
      id: 'sig-' + Date.now(),
      role: defaultRole,
      name: '',
      position: '',
      date: '',
    };
    const updated = [...currentSignatories, newSig];
    updateSignatories(updated);
    setTimeout(() => {
      const newIdx = updated.length - 1;
      const el =
        document.getElementById(`preana-form-signatory-${newIdx}`) ||
        document.querySelector(`[data-field="signatory-${newIdx}"]`);
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        highlightElement(el as HTMLElement);
      }
      scrollToPreviewElement(`preana-preview-cell-signatory-${newIdx}`);
    }, 100);
  };

  const handleRemoveSignatory = (idx: number) => {
    if (currentSignatories.length <= 1) return;
    const updated = currentSignatories.filter((_, i) => i !== idx);
    updateSignatories(updated);
  };

  return {
    currentSignatories,
    handleAddSignatory,
    highlightAllSignatureDates,
    triggerSignatorySync,
    handleUpdateSignatory,
    handleRemoveSignatory,
  };
}

export type SignatoriesState = ReturnType<typeof useSignatories>;
