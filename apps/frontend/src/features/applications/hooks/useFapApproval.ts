/** Approving the physical FAP document, dismissing its discrepancies and submitting the FAP stage. */
import {recordSystemActivity} from '@/features/activity/lib/activity-store';
import {api} from '@/shared/lib/api';

export function useFapApproval({
  a,
  draft,
  user,
  onChange,
  notify,
  setBusy,
  setError,
  setDraft,
  setActiveStage,
  setTab,
  setSubmitFapConfirm,
  setCustomerDetailLocked,
  setFapComparisonModal,
}: {
  a: any;
  draft: any;
  user: any;
  onChange: (a: any) => void;
  notify: (s: string) => void;
  setBusy: (v: boolean) => void;
  setError: (v: string) => void;
  setDraft: (v: any) => void;
  setActiveStage: (v: string) => void;
  setTab: (v: number) => void;
  setSubmitFapConfirm: (v: boolean) => void;
  setCustomerDetailLocked: (v: boolean) => void;
  setFapComparisonModal: (v: any) => void;
}) {
  const handleApproveDocument = (updatedApp?: any) => {
    localStorage.removeItem(`crm_locked_customer_${a.id}`);
    setCustomerDetailLocked(false);
    const nextApp = {...(updatedApp || a), customerDetailLocked: false, stage: 'Pre-analysis'};
    setDraft((prev: any) => ({...prev, ...nextApp, customerDetailLocked: false}));
    if (onChange) onChange(nextApp);
    setActiveStage('Pre-analysis');
    setTab(8);
    try {
      recordSystemActivity({
        applicationId: a.id,
        fapNumber: a.fapNumber,
        companyName: a.customer?.companyName || draft.customer?.companyName || 'Application',
        section: 'Documents',
        tabIndex: 8,
        actionType: 'APPROVE',
        title: `Approved Document & Locked Customer/PIC for ${a.customer?.companyName || draft.customer?.companyName || 'Application'}`,
        details:
          'Physical FAP document approved. Customer & PIC locked, application advanced to Pre-analysis.',
        actionBy: user?.name || 'System User',
        userRole: user?.displayRole || user?.role || '',
        createNotification: true,
        notificationMessage: `Application ${a.fapNumber || ''} for ${a.customer?.companyName || 'Debtor'} advanced to Pre-analysis stage.`,
      });
    } catch (actErr) {
      console.error('Activity record error:', actErr);
    }
  };

  const handleApproveFapChangesInDetail = async (extractedData?: any) => {
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
      const updated = {...draft, stage: 'Pre-analysis'};
      await api('/applications/' + a.id + '/stage', 'PUT', {stage: 'Pre-analysis'});
      setDraft(updated);
      setActiveStage('Pre-analysis');
      setTab(8);
      setSubmitFapConfirm(false);
      notify('FAP Stage submitted. Pre-analysis stage is now active.');
      if (onChange) onChange(updated);
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
