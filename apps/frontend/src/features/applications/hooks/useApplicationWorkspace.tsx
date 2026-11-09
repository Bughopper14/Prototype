/** All state, derived values and handlers of ApplicationWorkspace; shared with its sections through WorkspaceContext. */
import {
  getReadActivityIds,
  getStoredActivities,
  recordSystemActivity,
} from '@/features/activity/lib/activity-store';
import {type SystemActivity} from '@/features/activity/lib/types';
import {printFapDocument} from '@/features/fap/lib/print';
import {api} from '@/shared/lib/api';
import {checkIsAdmin, hasAuthority} from '@/shared/lib/auth';
import {calculateAgeYearsMonths, deriveDeedSync} from '@/shared/lib/format';
import {resolveWilayahUpwards, useMasterData} from '@/shared/master-data';
import {
  blank,
  customerFields,
  picFields,
  projectFields,
  proposalFields,
  validateInput,
} from '@liugong/shared';
import {useEffect, useRef, useState} from 'react';

export type ApplicationWorkspaceProps = {
  value: any;
  user: any;
  customers?: any[];
  initialTab?: number;
  onBack: () => void;
  onChange: (a: any) => void;
  onCustomerCreated?: (c: any) => void;
  notify: (s: string) => void;
};

import {useApplicationActivity} from '@/features/applications/hooks/useApplicationActivity';
import {useDeedReview} from '@/features/applications/hooks/useDeedReview';
import {useFapPreviewSync} from '@/features/applications/hooks/useFapPreviewSync';
import {useLiveFapData} from '@/features/applications/hooks/useLiveFapData';
import {useSaveApplication} from '@/features/applications/hooks/useSaveApplication';
export function useApplicationWorkspace({
  value: a,
  user,
  customers = [],
  initialTab = 0,
  onBack,
  onChange,
  onCustomerCreated,
  notify,
}: ApplicationWorkspaceProps) {
  const master = useMasterData();
  const preAnalysisSaveRef = useRef<(() => Promise<void>) | null>(null);
  const [preAnalysisSaving, setPreAnalysisSaving] = useState(false);
  const [customerCategory, setCustomerCategory] = useState<string>(
    () => a.customerCategory || a.customerStatus || (a.isNew ? 'NEW' : a.customerId ? 'EXISTING' : 'NEW'),
  );
  const [customerId, setCustomerId] = useState<string>(() =>
    a.isNew ? a.customerId || '' : a.customerId || a.customer_id || a.customer?.id || '',
  );
  const sanitizeCustomer = (c: any) => {
    if (!c) return c;
    const npwpRaw = String(c.npwp || '').replace(/\D/g, '');
    return {...c, npwp: /^0+$/.test(npwpRaw) ? '' : c.npwp};
  };
  const [customerDraft, setCustomerDraft] = useState<any>(() =>
    a.customer ? sanitizeCustomer(structuredClone(a.customer)) : blank(customerFields),
  );
  const [nibOcrOpen, setNibOcrOpen] = useState(false);
  const handleApplyNibOcr = (extracted: {
    nib?: string;
    companyName?: string;
    alamat?: string;
    email?: string;
    phone?: string;
    tanggalTerbit?: string;
    province?: string;
    city?: string;
    district?: string;
    village?: string;
    postalCode?: string;
    rt?: string;
    rw?: string;
  }) => {
    const rawComp = extracted.companyName ? String(extracted.companyName).trim() : '';
    const rawNib = extracted.nib ? String(extracted.nib).replace(/\D/g, '').slice(0, 13) : '';
    const rawDate = extracted.tanggalTerbit ? String(extracted.tanggalTerbit).trim() : '';
    if (rawNib || rawDate || rawComp) {
      setCustomerDraft((prev: any) => ({
        ...prev,
        ...(rawNib ? {nib: rawNib} : {}),
        ...(rawComp ? {companyName: rawComp} : {}),
        ...(rawDate ? {nibDate: rawDate} : {}),
      }));
    }
    setDraft((prev: any) => {
      let next = {
        ...prev,
        ...(rawNib ? {nib: rawNib} : {}),
        ...(rawComp ? {companyName: rawComp} : {}),
        ...(extracted.alamat ? {companyAddress: extracted.alamat} : {}),
        ...(extracted.email ? {email: extracted.email} : {}),
        ...(extracted.phone ? {phoneFax: extracted.phone} : {}),
        ...(rawDate ? {nibDate: rawDate} : {}),
        ...(extracted.province ? {province: extracted.province} : {}),
        ...(extracted.city ? {city: extracted.city, cityRegency: extracted.city} : {}),
        ...(extracted.district ? {district: extracted.district} : {}),
        ...(extracted.village ? {village: extracted.village} : {}),
        ...(extracted.postalCode ? {postalCode: extracted.postalCode} : {}),
        ...(extracted.rt ? {rt: extracted.rt} : {}),
        ...(extracted.rw ? {rw: extracted.rw} : {}),
        customer: {
          ...(prev.customer || {}),
          ...(rawNib ? {nib: rawNib} : {}),
          ...(rawComp ? {companyName: rawComp} : {}),
          ...(rawDate ? {nibDate: rawDate} : {}),
        },
      };
      next = resolveWilayahUpwards(next, master);
      return next;
    });
    if (customerCategory === 'EXISTING') {
      setCustomerCategory('NEW');
    }
  };
  const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
  const fapCustomerKeys = [
    'companyName',
    'companyType',
    'nib',
    'nibDate',
    'npwp',
    'establishmentActNo',
    'establishmentDate',
  ];
  const fapCustomerFields = customerFields.filter(f => fapCustomerKeys.includes(f.key));
  function changeCategory(value: string) {
    setCustomerCategory(value);
    setError('');
    setDraft((prev: any) => ({...prev, customerStatus: value, customerCategory: value}));
  }
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
        industrySegment: profileData.industrySegment || 'MINING',
        businessRole: profileData.businessRole || 'CONTRACTOR',
        ...profileData,
        customerId: id,
        customerStatus: customerCategory,
        stage: 'FAP Stage',
      };
      const application = await api('/applications', 'POST', safePayload);

      // Carry over the contact person and financing proposal typed into the initial draft.
      const hasPicData =
        draft.pic &&
        Object.values(draft.pic).some(
          (v: any) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-',
        );
      if (hasPicData) {
        try {
          await api(`/applications/${application.id}/page-1`, 'PUT', {pic: draft.pic, stage: 'FAP Stage'});
        } catch (err) {
          console.warn('Initial PIC sync:', err);
        }
      }
      if (
        draft.proposal &&
        (draft.proposal.financingValue || (draft.proposal.units && draft.proposal.units.length > 0))
      ) {
        try {
          await api(`/applications/${application.id}/page-2`, 'PUT', {
            proposal: draft.proposal,
            stage: 'FAP Stage',
          });
        } catch (err) {
          console.warn('Initial proposal sync:', err);
        }
      }

      notify(
        `Aplikasi ${application.fapNumber} berhasil dibuat. Anda dapat melanjutkan pengisian Stakeholders, Proposal, dan Pre-Analysis.`,
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
  const isPreAnalysis =
    a.stage === 'Pre-analysis' ||
    ['SUBMITTED_TO_BS', 'BS_VERIFIED', 'IN_CA_LEGAL_REVIEW', 'CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(
      a.status,
    );
  const resolvedInitialTab = initialTab === 0 && isPreAnalysis ? 8 : (initialTab ?? 0);
  const [activeStage, setActiveStage] = useState<string>(
    () =>
      a.stage ||
      ([
        'SUBMITTED_TO_BS',
        'BS_VERIFIED',
        'IN_CA_LEGAL_REVIEW',
        'CREDIT_COMMITTEE_REVIEW',
        'APPROVED',
      ].includes(a.status)
        ? 'Pre-analysis'
        : 'FAP Stage'),
  );
  const [submitFapConfirm, setSubmitFapConfirm] = useState(false);
  useEffect(() => {
    const isPre =
      a.stage === 'Pre-analysis' ||
      [
        'SUBMITTED_TO_BS',
        'BS_VERIFIED',
        'IN_CA_LEGAL_REVIEW',
        'CREDIT_COMMITTEE_REVIEW',
        'APPROVED',
      ].includes(a.status);
    if (a.stage) setActiveStage(a.stage);
    else if (isPre) setActiveStage('Pre-analysis');
    else setActiveStage('FAP Stage');
    if (isPre && tab === 0) setTab(8);
  }, [a.id, a.stage, a.status]);
  const [reviewDeedId, setReviewDeedId] = useState<string | null>(null);
  const [tab, setTab] = useState(resolvedInitialTab),
    [draft, setDraft] = useState<any>(() => {
      const base = structuredClone(a);
      if (!base.projects || base.projects.length === 0) {
        base.projects = [blank(projectFields)];
      }
      return base;
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [transition, setTransition] = useState(''),
    [comments, setComments] = useState(''),
    [saveConfirm, setSaveConfirm] = useState(false),
    [sideBySide, setSideBySide] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'fap-preview-sec-header': true,
    'fap-preview-sec-company': true,
    'fap-preview-sec-business': true,
    'fap-preview-sec-pic': true,
    'fap-preview-sec-projects': true,
  });
  const [activeSyncSection, setActiveSyncSection] = useState<string>('fap-preview-sec-header');
  const [activeSyncField, setActiveSyncField] = useState<string | null>(null);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const {syncTick, setSyncTick, handleTriggerFieldSync, handleTriggerSync, toggleSection} = useFapPreviewSync(
    {
      customerCategory,
      customerDraft,
      draft,
      sideBySide,
      setSideBySide,
      setOpenSections,
      setActiveSyncSection,
      setActiveSyncField,
      setActiveFieldKey,
    },
  );

  const handlePreviewSectionClick = (secId: string) => {
    handleTriggerSync(secId);
    setOpenSections(prev => ({...prev, [secId]: true}));
    const formTarget = document.getElementById('acc-' + secId);
    if (formTarget) {
      formTarget.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  };

  const [fapComparisonModal, setFapComparisonModal] = useState<any>(null);

  const handlePrintFap = async () => {
    if (draft.isNew) {
      notify('Please save the new application before printing the FAP document.');
      return;
    }
    setBusy(true);
    try {
      await save();
      notify('All FAP data saved to database. Opening print form...');
      printFapDocument(a.fapNumber || draft.fapNumber);
    } catch (err: any) {
      console.error('Auto-save before print error:', err);
      notify('Failed to save data to database before printing: ' + (err.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const [customerDetailLocked, setCustomerDetailLocked] = useState<boolean>(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState<boolean>(false);
  const [archivesList, setArchivesList] = useState<any[]>([]);
  const [loadingArchives, setLoadingArchives] = useState<boolean>(false);
  const [selectedArchiveIdx, setSelectedArchiveIdx] = useState<number>(0);

  const openArchiveViewer = async () => {
    setLoadingArchives(true);
    setArchiveModalOpen(true);
    try {
      const res = await api(`/applications/${a.id}/fap-archive`);
      if (res?.archives) {
        setArchivesList(res.archives);
        setSelectedArchiveIdx(0);
      }
    } catch (err: any) {
      notify('Failed to load FAP submission archive: ' + err.message);
    } finally {
      setLoadingArchives(false);
    }
  };

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
  async function submitCustomerDetail() {
    setError('');
    const missing: string[] = [];
    if (!draft.companyAddress?.trim()) missing.push('Company Address');
    if (!draft.province?.trim()) missing.push('Province');
    if (!draft.city?.trim()) missing.push('City/Regency');
    if (!draft.postalCode?.trim()) missing.push('Postal Code');
    if (!draft.mainBusiness?.trim()) missing.push('Main Business Sector');

    const pic = draft.pic || {};
    if (!pic.picName?.trim() && !pic.name?.trim()) missing.push('PIC Name');
    if (!pic.phone?.trim() && !pic.mobilePhone?.trim()) missing.push('PIC Phone Number');
    if (!pic.position?.trim()) missing.push('PIC Position');

    if (missing.length > 0) {
      setError(
        `Please complete the required Customer Detail & PIC fields before submitting: ${missing.join(', ')}.`,
      );
      return;
    }

    setBusy(true);
    try {
      const updatedDraft = {
        ...draft,
        customerDetailLocked: true,
        pic: draft.pic || blank(picFields),
        latestDeedDate:
          !draft.latestDeedDate ||
          String(draft.latestDeedDate).trim() === '' ||
          String(draft.latestDeedDate) === 'null'
            ? null
            : draft.latestDeedDate,
        latestDeedNo:
          !draft.latestDeedNo || String(draft.latestDeedNo).trim() === '' ? null : draft.latestDeedNo,
      };
      const cleanProjects = (draft.projects || []).filter(
        (p: any) =>
          p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== ''),
      );
      const customerPayload =
        customerCategory === 'NEW'
          ? {
              ...customerDraft,
              companyName: liveCompanyName,
              nib: liveNib,
              npwp: liveNpwp,
              establishmentActNo:
                (
                  liveEstablishmentActNo ||
                  customerDraft?.establishmentActNo ||
                  draft.customer?.establishmentActNo ||
                  ''
                ).trim() || null,
              establishmentDate:
                customerDraft?.establishmentDate || draft.customer?.establishmentDate || null || null,
              nibDate: customerDraft?.nibDate || draft.customer?.nibDate || null || null,
            }
          : {
              ...(selectedCustomer || {}),
              ...(draft.customer || {}),
              ...(customerDraft || {}),
              companyName: liveCompanyName,
            };
      const body = {
        profile: {...updatedDraft, companyName: liveCompanyName},
        customer: customerPayload,
        pic: updatedDraft.pic,
        projects: cleanProjects,
      };
      const v = await api(`/applications/${a.id}/page-1`, 'PUT', {...body, stage: 'Pre-analysis'});
      const nextApp = {...a, ...v, customerDetailLocked: true};
      setDraft((prev: any) => ({...prev, ...nextApp, customerDetailLocked: true}));
      setCustomerDetailLocked(true);
      localStorage.setItem(`crm_locked_customer_${a.id}`, 'true');
      onChange(nextApp);
      notify('Customer details validated and locked. Switching to the Legal tab.');
      setTab(5);
    } catch (e: any) {
      setError(e.message || 'Failed to save and lock customer details.');
    } finally {
      setBusy(false);
    }
  }
  const {
    liveCompanyName,
    liveCompanyType,
    liveNib,
    liveNpwp,
    liveEstablishmentActNo,
    liveEstablishmentDate,
    liveNibDate,
    liveDetailFapData,
  } = useLiveFapData({master, customerCategory, customerDraft, selectedCustomer, draft, a});

  useEffect(() => {
    const base = structuredClone(a);
    if (!base.projects || base.projects.length === 0) {
      base.projects = [blank(projectFields)];
    }
    // Sync deed fields from legal when loading existing data
    if (a.legal) {
      const sync = deriveDeedSync(a.legal, a);
      if (sync.establishmentActNo) base.latestDeedNo = base.latestDeedNo || sync.latestDeedNo;
      if (sync.latestDeedDate) base.latestDeedDate = base.latestDeedDate || sync.latestDeedDate;
      if (sync.establishmentDate) {
        const exp = calculateAgeYearsMonths(sync.establishmentDate);
        base.experienceYears = exp.years;
        base.experienceMonths = exp.months;
      }
      if (sync.establishmentActNo && a.customer) {
        base.customer = {
          ...(base.customer || {}),
          establishmentActNo: base.customer?.establishmentActNo || sync.establishmentActNo,
          establishmentDate: base.customer?.establishmentDate || sync.establishmentDate,
        };
      }
    }
    setDraft(base);
    if (a.customer) {
      setCustomerDraft(sanitizeCustomer(structuredClone(a.customer)));
    }
  }, [a]);
  useEffect(() => {
    if (initialTab !== undefined) {
      setTab(initialTab);
      if (initialTab === 8) setActiveStage('Pre-analysis');
      else if ([0, 5, 1].includes(initialTab) && !isPreAnalysisReached) setActiveStage('FAP Stage');
    }
  }, [initialTab, a.id]);
  const isFapStage = activeStage === 'FAP Stage';
  const fapChk = (a.documentChecks || []).find(
    (d: any) =>
      String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase() === 'fap',
  );
  const hasSignedFap = Boolean(fapChk && Array.isArray(fapChk.files) && fapChk.files.length > 0);
  const isDbLocked = a.submitLock !== undefined ? Number(a.submitLock.isLocked) === 1 : !hasSignedFap;
  const isSubmitLocked = !draft.isNew && isDbLocked;
  const isPreAnalysisReached =
    a.stage === 'Pre-analysis' ||
    draft.stage === 'Pre-analysis' ||
    ['SUBMITTED_TO_BS', 'BS_VERIFIED', 'IN_CA_LEGAL_REVIEW', 'CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(
      a.status,
    );
  const currentAppStage = isPreAnalysisReached ? 'Pre-analysis' : 'FAP Stage';

  const tabs = [
    'Customer & PIC',
    'Stakeholders',
    'Business & banks',
    'Financing & units',
    'Financial statements',
    'Legal',
    'Documents',
    'Activity',
    'Pre Analysis form',
  ];
  const tabNumbers: Record<number, number> = {0: 1, 5: 2, 1: 3, 2: 4, 4: 5, 6: 6, 8: 1};

  const stageTabOrder =
    activeStage === 'FAP Stage' ? [0, 5, 1, 6, 7] : activeStage === 'Pre-analysis' ? [8, 2, 4, 6, 7] : [6, 7];
  const tabOrder = stageTabOrder;

  const isAdminUser = checkIsAdmin(user);
  // FAP Stage is fully editable at all times per specification
  const isFapLocked = false;
  // What the user may edit comes from the authorities of their DB role (administrators have all)
  const canLegal = hasAuthority(user, 'crm_edit_app_legal');
  const canEditCustomerPic = hasAuthority(user, 'crm_edit_app_customer_pic');
  const canEdit = hasAuthority(user, 'crm_edit_app_business_banks');
  const canFinance =
    hasAuthority(user, 'crm_edit_app_financial') || hasAuthority(user, 'crm_edit_app_financing_units');

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

  const [localActivities, setLocalActivities] = useState<SystemActivity[]>(() => getStoredActivities());
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => getReadActivityIds());
  const {
    applicationActivities,
    handleMarkAppActivityRead,
    handleMarkAllAppActivitiesRead,
    handleOpenSectionFromActivity,
  } = useApplicationActivity({
    activeStage,
    setActiveStage,
    setTab,
    draft,
    setError,
    liveCompanyName,
    isPreAnalysisReached,
    localActivities,
    setLocalActivities,
    setLocalReadIds,
    a,
    notify,
  });

  let actions: string[] = [];
  if (checkIsAdmin(user)) {
    if (['DRAFT', 'RETURNED'].includes(a.status)) actions = ['SUBMIT_TO_BS'];
    else if (a.status === 'SUBMITTED_TO_BS') actions = ['VERIFY_BS', 'RETURN'];
    else if (a.status === 'BS_VERIFIED') actions = ['START_REVIEW', 'RETURN'];
    else if (a.status === 'IN_CA_LEGAL_REVIEW') actions = ['RECOMMEND_CA', 'RECOMMEND_LEGAL', 'RETURN'];
    else if (a.status === 'CREDIT_COMMITTEE_REVIEW')
      actions = ['APPROVE_COMMITTEE', 'REJECT_COMMITTEE', 'RETURN'];
  } else {
    const can = (authority: string) => hasAuthority(user, authority);
    if (['DRAFT', 'RETURNED'].includes(a.status)) {
      if (can('crm_workflow_submit')) actions = ['SUBMIT_TO_BS'];
    } else {
      if (a.status === 'SUBMITTED_TO_BS' && can('crm_workflow_verify_documents')) actions = ['VERIFY_BS'];
      if (a.status === 'BS_VERIFIED' && can('crm_workflow_start_review')) actions = ['START_REVIEW'];
      if (a.status === 'IN_CA_LEGAL_REVIEW')
        actions = [
          ...(can('crm_workflow_recommend_credit') ? ['RECOMMEND_CA'] : []),
          ...(can('crm_workflow_recommend_legal') ? ['RECOMMEND_LEGAL'] : []),
        ];
      if (a.status === 'CREDIT_COMMITTEE_REVIEW' && can('crm_workflow_final_decision'))
        actions = ['APPROVE_COMMITTEE', 'REJECT_COMMITTEE'];
      if (actions.length && can('crm_workflow_return')) actions = [...actions, 'RETURN'];
    }
  }
  const {save} = useSaveApplication({
    customerCategory,
    customerDraft,
    setCustomerDraft,
    activeStage,
    tab,
    draft,
    setDraft,
    setBusy,
    setError,
    liveCompanyName,
    liveCompanyType,
    liveNib,
    liveNpwp,
    liveEstablishmentActNo,
    liveEstablishmentDate,
    liveNibDate,
    a,
    user,
    onChange,
    notify,
  });
  const p = draft.proposal || {...blank(proposalFields), units: []};
  const principal = Number(p.financingValue) - Number(p.downPaymentValue),
    r = Number(p.interestRate) / 1200,
    monthly = p.tenorMonths
      ? (r
          ? (principal * r) / (1 - Math.pow(1 + r, -Number(p.tenorMonths)))
          : principal / Number(p.tenorMonths)) /
        (master.paymentMethod.find(x => x.value === p.paymentMethod)?.timing === 'advance' ? 1 + r : 1)
      : 0;
  const {beginDeedReview} = useDeedReview({
    setReviewDeedId,
    tab,
    draft,
    setDraft,
    setBusy,
    setError,
    canLegal,
    a,
    onChange,
  });

  return {
    a,
    user,
    customers,
    initialTab,
    onBack,
    onChange,
    onCustomerCreated,
    notify,
    master,
    preAnalysisSaveRef,
    preAnalysisSaving,
    setPreAnalysisSaving,
    customerCategory,
    setCustomerCategory,
    customerId,
    setCustomerId,
    sanitizeCustomer,
    customerDraft,
    setCustomerDraft,
    nibOcrOpen,
    setNibOcrOpen,
    handleApplyNibOcr,
    selectedCustomer,
    fapCustomerKeys,
    fapCustomerFields,
    changeCategory,
    saveNewApplication,
    isPreAnalysis,
    resolvedInitialTab,
    activeStage,
    setActiveStage,
    submitFapConfirm,
    setSubmitFapConfirm,
    reviewDeedId,
    setReviewDeedId,
    tab,
    setTab,
    draft,
    setDraft,
    busy,
    setBusy,
    error,
    setError,
    transition,
    setTransition,
    comments,
    setComments,
    saveConfirm,
    setSaveConfirm,
    sideBySide,
    setSideBySide,
    openSections,
    setOpenSections,
    activeSyncSection,
    setActiveSyncSection,
    activeSyncField,
    setActiveSyncField,
    activeFieldKey,
    setActiveFieldKey,
    syncTick,
    setSyncTick,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    handlePreviewSectionClick,
    fapComparisonModal,
    setFapComparisonModal,
    handlePrintFap,
    customerDetailLocked,
    setCustomerDetailLocked,
    archiveModalOpen,
    setArchiveModalOpen,
    archivesList,
    setArchivesList,
    loadingArchives,
    setLoadingArchives,
    selectedArchiveIdx,
    setSelectedArchiveIdx,
    openArchiveViewer,
    handleApproveDocument,
    handleApproveFapChangesInDetail,
    handleCorrectFapDataInDetail,
    submitCustomerDetail,
    liveCompanyName,
    liveCompanyType,
    liveNib,
    liveNpwp,
    liveEstablishmentActNo,
    liveEstablishmentDate,
    liveNibDate,
    liveDetailFapData,
    isFapStage,
    fapChk,
    hasSignedFap,
    isDbLocked,
    isSubmitLocked,
    isPreAnalysisReached,
    currentAppStage,
    tabs,
    tabNumbers,
    stageTabOrder,
    tabOrder,
    isAdminUser,
    isFapLocked,
    canLegal,
    canEditCustomerPic,
    canEdit,
    canFinance,
    submitFapStage,
    localActivities,
    setLocalActivities,
    localReadIds,
    setLocalReadIds,
    applicationActivities,
    handleMarkAppActivityRead,
    handleMarkAllAppActivitiesRead,
    handleOpenSectionFromActivity,
    actions,
    save,
    p,
    principal,
    r,
    monthly,
    beginDeedReview,
  };
}
