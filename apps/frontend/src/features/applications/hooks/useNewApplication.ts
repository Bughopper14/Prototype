/** Creating a new application: its customer, the FAP form data typed so far and the Pre-Analysis draft. */
import {useState} from 'react';
import {recordSystemActivity} from '@/features/activity/lib/activity-store';
import {
  bankReferencesWithComments,
  mergedProposal,
  proposalProfileValues,
} from '@/features/applications/lib/financing-proposal';
import {api} from '@/shared/lib/api';
import {validateInput} from '@liugong/shared';

export function useNewApplication({
  user,
  customers,
  customerId,
  setCustomerId,
  customerCategory,
  customerDraft,
  selectedCustomer,
  draft,
  setDraft,
  activeStage,
  liveCompanyName,
  canEdit,
  canFinance,
  setBusy,
  setError,
  setTab,
  onChange,
  onCustomerCreated,
  notify,
}: {
  user: any;
  customers: any[];
  customerId: string;
  setCustomerId: (v: string) => void;
  customerCategory: string;
  customerDraft: any;
  selectedCustomer: any;
  draft: any;
  setDraft: (v: any) => void;
  activeStage: string;
  liveCompanyName: string;
  canEdit: boolean;
  canFinance: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string) => void;
  setTab: (v: number) => void;
  onChange: (a: any) => void;
  onCustomerCreated?: (c: any) => void;
  notify: (s: string) => void;
}) {
  // Pre-Analysis typed on a new application before its first save, and the number it got on that save
  const [preAnalysisDraft, setPreAnalysisDraft] = useState<any>(null);
  const [assignedPreAnalysisNo, setAssignedPreAnalysisNo] = useState<string>('');
  async function saveNewApplication() {
    setBusy(true);
    setError('');
    try {
      let id = customerId;
      const nibClean = String(customerDraft?.nib || draft?.nib || '').replace(/\D/g, '');
      const npwpClean = String(customerDraft?.npwp || draft?.npwp || '').replace(/\D/g, '');
      const matchedExisting = customers.find((c: any) => {
        const cNib = String(c.nib || '').replace(/\D/g, '');
        const cNpwp = String(c.npwp || '').replace(/\D/g, '');
        return (nibClean && cNib === nibClean) || (npwpClean && cNpwp === npwpClean);
      });

      if (customerCategory === 'EXISTING') {
        id = selectedCustomer?.id || matchedExisting?.id;
        if (!id) {
          const resolvedName =
            liveCompanyName ||
            customerDraft?.companyName ||
            draft?.customer?.companyName ||
            draft?.companyName ||
            '';
          if (!resolvedName.trim()) throw new Error('Company name of the debtor is required.');
          const customerToSave = {
            ...customerDraft,
            companyName: resolvedName,
            nib: nibClean,
            npwp: npwpClean,
          };
          validateInput(customerToSave);
          const createdCust = await api('/customers', 'POST', customerToSave);
          id = createdCust.id;
          setCustomerId(id);
          if (onCustomerCreated) onCustomerCreated(createdCust);
        }
      } else {
        if (matchedExisting) {
          id = matchedExisting.id;
          setCustomerId(id);
        } else {
          const resolvedName =
            liveCompanyName ||
            customerDraft?.companyName ||
            draft?.customer?.companyName ||
            draft?.companyName ||
            '';
          if (!resolvedName.trim()) throw new Error('Company name of the new debtor is required.');
          const customerToSave = {
            ...customerDraft,
            companyName: resolvedName,
            nib: nibClean,
            npwp: npwpClean,
          };
          validateInput(customerToSave);
          const createdCust = await api('/customers', 'POST', customerToSave);
          id = createdCust.id;
          setCustomerId(id);
          if (onCustomerCreated) onCustomerCreated(createdCust);
        }
      }
      const {isNew, customer, id: _draftId, ...profileData} = draft;
      const finalCompanyName =
        liveCompanyName ||
        customerDraft?.companyName ||
        draft?.customer?.companyName ||
        draft?.companyName ||
        '';
      const safePayload = {
        branchCode: profileData.branchCode || 'JKT01',
        companyName: finalCompanyName,
        companyAddress: profileData.companyAddress || '',
        city: profileData.city || '',
        province: profileData.province || '',
        postalCode: profileData.postalCode || '',
        phoneFax: profileData.phoneFax || '',
        email: profileData.email || customerDraft.email || '',
        mainBusiness: profileData.mainBusiness || '',
        locationStatus: profileData.locationStatus || 'OWNED',
        repaymentSource: profileData.repaymentSource || 'Operating Cash Flow',
        // Segment and main business start unticked on the FAP form (section 06)
        industrySegment: profileData.industrySegment ?? '',
        businessRole: profileData.businessRole ?? '',
        ...profileData,
        customerId: id,
        customerStatus: customerCategory,
        stage: activeStage || 'FAP Stage',
      };
      const application = await api('/applications', 'POST', safePayload);

      // Carry over everything typed before the first save: PIC, sections 05-09, then the Pre-Analysis draft.
      const hasPicData =
        draft.pic &&
        Object.values(draft.pic).some(
          (v: any) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-',
        );
      try {
        const cleanProjects = (draft.projects || []).filter(
          (p: any) =>
            p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== ''),
        );
        await api(`/applications/${application.id}/page-1`, 'PUT', {
          profile: {...safePayload, ...proposalProfileValues(draft)},
          customer: customerDraft,
          customerCategory,
          ...(hasPicData ? {pic: draft.pic} : {}),
          projects: cleanProjects,
          ...(canEdit ? {bankReferences: bankReferencesWithComments(draft)} : {}),
          ...(canFinance
            ? {proposal: mergedProposal(draft), financialStatements: draft.financialStatements || []}
            : {}),
          stage: activeStage || 'FAP Stage',
        });
      } catch (err) {
        console.warn('Initial FAP form sync:', err);
      }
      let assignedPreNo = '';
      try {
        const savedPre = preAnalysisDraft
          ? await api(`/applications/${application.id}/pre-analysis`, 'PUT', {
              ...preAnalysisDraft,
              fapNumber: application.fapNumber,
              customerProjectName: preAnalysisDraft.customerProjectName || finalCompanyName,
            })
          : await api(`/applications/${application.id}/pre-analysis`);
        assignedPreNo = savedPre?.data?.preAnalysisNo || '';
        if (assignedPreNo) setAssignedPreAnalysisNo(assignedPreNo);
      } catch (err) {
        console.warn('Initial Pre-Analysis sync:', err);
      }

      notify(
        `Aplikasi ${application.fapNumber}${assignedPreNo ? ` · Pre-Analysis ${assignedPreNo}` : ''} berhasil dibuat. Anda dapat melanjutkan pengisian Stakeholders, Proposal, dan Pre-Analysis.`,
      );
      try {
        recordSystemActivity({
          applicationId: application.id,
          fapNumber: application.fapNumber,
          companyName: finalCompanyName,
          section: 'Customer & PIC',
          tabIndex: 0,
          actionType: 'CREATE',
          title: `Created new application for ${finalCompanyName}`,
          details: `Initiated FAP Stage (${application.fapNumber || 'Draft'}), Category: ${customerCategory === 'EXISTING' ? 'Existing Customer' : 'New Customer'}. Ready for data entry.`,
          changes: [
            {label: 'Application Number', newValue: application.fapNumber || 'Draft'},
            {
              label: 'Customer Category',
              newValue: customerCategory === 'EXISTING' ? 'Existing Customer' : 'New Customer',
            },
            {label: 'Company Name', newValue: finalCompanyName},
            {label: 'Initial Stage', newValue: 'FAP Stage'},
          ],
          actionBy: user?.name || 'System User',
          userRole: user?.role || 'MKT',
          createNotification: true,
          notificationMessage: `New application ${application.fapNumber || ''} created for ${finalCompanyName}. Ready for review.`,
        });
      } catch (actErr) {
        console.error('Activity record error:', actErr);
      }
      let fullApp: any;
      try {
        fullApp = await api(`/applications/${application.id}`);
      } catch {
        fullApp = application;
      }
      setDraft(structuredClone(fullApp));
      onChange(fullApp);
      // Stay on the new application with every tab unlocked instead of returning to the list.
      setTab(0);
    } catch (e: any) {
      const msg = e.message || 'Failed to create new application. Please try again.';
      setError(msg);
      notify(msg);
      if (typeof window !== 'undefined') window.scrollTo({top: 0, behavior: 'smooth'});
    } finally {
      setBusy(false);
    }
  }

  return {preAnalysisDraft, setPreAnalysisDraft, assignedPreAnalysisNo, saveNewApplication};
}
