/** Approving the physical FAP document (which submits the FAP stage) and dismissing its discrepancies. */
import {api} from '@/shared/lib/api';

export function useFapApproval({
  a,
  draft,
  onChange,
  notify,
  setBusy,
  setDraft,
  setFapComparisonModal,
}: {
  a: any;
  draft: any;
  onChange: (a: any) => void;
  notify: (s: string) => void;
  setBusy: (v: boolean) => void;
  setDraft: (v: any) => void;
  setFapComparisonModal: (v: any) => void;
}) {
  /** The stage was submitted by the server: take the application as it is now (the workflow decides what is next). */
  const handleApproveDocument = (updatedApp?: any) => {
    const nextApp = updatedApp || a;
    setDraft((prev: any) => ({...prev, ...nextApp}));
    if (onChange) onChange(nextApp);
  };

  const handleApproveFapChangesInDetail = async () => {
    setBusy(true);
    try {
      const res = await api(`/applications/${a.id}/fap-changes/approve`, 'POST', {
        remarks: a.fapRemarks || draft.fapRemarks || '',
      });
      handleApproveDocument(res?.application);
      setFapComparisonModal(null);
      notify('FAP Stage submitted. Customer & PIC details are locked and the approval has started.');
    } catch (err: any) {
      notify('Failed to submit the FAP stage: ' + err.message);
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

  return {
    handleApproveDocument,
    handleApproveFapChangesInDetail,
    handleCorrectFapDataInDetail,
  };
}
