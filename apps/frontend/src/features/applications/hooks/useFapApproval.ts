/** Approving the physical FAP document, dismissing its discrepancies and submitting the FAP stage. */
import {api} from '@/shared/lib/api';
import {STAGE} from '@/shared/master-data';

export function useFapApproval({
  a,
  draft,
  onChange,
  notify,
  setBusy,
  setError,
  setDraft,
  setActiveStage,
  setTab,
  setSubmitFapConfirm,
  setFapComparisonModal,
}: {
  a: any;
  draft: any;
  onChange: (a: any) => void;
  notify: (s: string) => void;
  setBusy: (v: boolean) => void;
  setError: (v: string) => void;
  setDraft: (v: any) => void;
  setActiveStage: (v: string) => void;
  setTab: (v: number) => void;
  setSubmitFapConfirm: (v: boolean) => void;
  setFapComparisonModal: (v: any) => void;
}) {
  const handleApproveDocument = (updatedApp?: any) => {
    const nextApp = {...(updatedApp || a), stage: STAGE.PRE_ANALYSIS};
    setDraft((prev: any) => ({...prev, ...nextApp}));
    if (onChange) onChange(nextApp);
    setActiveStage(STAGE.PRE_ANALYSIS);
    setTab(8);
    // The server logs the stage submission in the activity feed.
  };

  const handleApproveFapChangesInDetail = async () => {
    setBusy(true);
    try {
      const res = await api(`/applications/${a.id}/fap-changes/approve`, 'POST', {
        remarks: a.fapRemarks || draft.fapRemarks || '',
      });
      handleApproveDocument(res?.application);
      setFapComparisonModal(null);
      notify('FAP document approved. Customer & PIC details locked, proceeding to Pre-analysis.');
    } catch (err: any) {
      notify('Failed to approve document: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCorrectFapDataInDetail = async () => {
    try {
      await api(`/applications/${a.id}/fap-changes/dismiss`, 'POST');
    } catch {}
    setFapComparisonModal(null);
    notify('Data discrepancies noted. You may review and record remarks in the Documents tab.');
  };

  async function submitFapStage() {
    setBusy(true);
    setError('');
    try {
      const updated = {...draft, stage: STAGE.PRE_ANALYSIS};
      await api(`/applications/${a.id}/stage`, 'PUT', {});
      const fresh = await api(`/applications/${a.id}`);
      setDraft(updated);
      setActiveStage(STAGE.PRE_ANALYSIS);
      setTab(8);
      setSubmitFapConfirm(false);
      notify('FAP Stage submitted. Pre-analysis stage is now active.');
      if (onChange) onChange(fresh);
    } catch (e: any) {
      setError(e.message || 'Failed to submit FAP stage.');
    } finally {
      setBusy(false);
    }
  }

  return {
    handleApproveDocument,
    handleApproveFapChangesInDetail,
    handleCorrectFapDataInDetail,
    submitFapStage,
  };
}
