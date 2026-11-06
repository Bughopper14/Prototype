import {ActivityPage, NibOcrModal, FapSheetPreview, PreAnalysisForm} from '@/components/crm/lazy';
import {DeedReviewDialog} from '@/components/crm/legal/DeedReviewDialog';
import {
  getStoredActivities,
  getReadActivityIds,
  saveReadActivityIds,
  recordSystemActivity,
  computeApplicationDiff,
  type SystemActivity,
} from '@/lib/system-activity';
import {deedData} from '@liugong/shared';
import {validateInput} from '@liugong/shared';
import {useEffect, useState, useRef, useMemo} from 'react';
import {
  Archive,
  Eye,
  ArrowRight,
  ArrowLeft,
  Activity,
  ChevronDown,
  Building2,
  CheckCheck,
  ShieldCheck,
  Wallet,
  Save,
  Loader2,
  Columns,
  Lock,
} from 'lucide-react';
import {
  printFapDocument,
  type FapSheetData,
  SECTION_TO_CELL_IDS_MAP,
  SECTION_TO_SCROLL_TARGET_MAP,
  resolveFieldToCellId,
} from '@/lib/fap-cells';
import {api} from '@/lib/api';
import {useMasterData, resolveWilayahUpwards} from '@/components/crm/master-data/MasterData';
import {
  type Field,
  profileFields,
  customerFields,
  picFields,
  projectFields,
  bankFields,
  proposalFields,
  unitFields,
  blank,
  label,
} from '@liugong/shared';
import {statusLabel, money, date, calculateAgeYearsMonths, deriveDeedSync} from '@/lib/format';
import {Badge, IconBox, Fields, Repeater, Modal} from '@/components/crm/common/SharedUi';
import {checkIsAdmin} from '@/lib/auth';
import {FinancialEditor} from '@/components/crm/application/FinancialEditor';
import {FapComparisonModal} from '@/components/crm/application/FapComparisonModal';
import {Documents} from '@/components/crm/application/Documents';
import {legalDeedList, StakeholderDeedView} from '@/components/crm/legal/DeedViews';
import {LegalEditor} from '@/components/crm/legal/LegalEditor';
import {FapArchiveModal} from '@/components/crm/application/FapArchiveModal';

import {stakeholderForSave} from '@/components/crm/legal/stakeholder-values';

export function ApplicationWorkspace({
  value: a,
  user,
  customers = [],
  initialTab = 0,
  onBack,
  onChange,
  onCustomerCreated,
  notify,
}: {
  value: any;
  user: any;
  customers?: any[];
  initialTab?: number;
  onBack: () => void;
  onChange: (a: any) => void;
  onCustomerCreated?: (c: any) => void;
  notify: (s: string) => void;
}) {
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
  const [syncTick, setSyncTick] = useState<number>(() => Date.now());

  const handleTriggerFieldSync = (fieldKey: string, sectionContext?: string) => {
    if (!sideBySide) setSideBySide(true);
    const cellId = resolveFieldToCellId(fieldKey, sectionContext, {
      companyType: customerDraft?.companyType || draft?.customer?.companyType || draft?.companyType,
      customerCategory,
    });

    setActiveFieldKey(fieldKey);
    setActiveSyncField(cellId || fieldKey);
    setActiveSyncSection('');
    setSyncTick(Date.now());

    // Instant direct highlight & scroll on live preview iframe if mounted
    const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-detail-preview-col iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (!iDoc || !win) return;

        iDoc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
          el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
        });

        if (cellId) {
          const cel = iDoc.getElementById(cellId);
          if (cel) {
            cel.classList.add('fap-cell-highlight');
            const rect = cel.getBoundingClientRect();
            const currentScrollY = win.scrollY || iDoc.documentElement.scrollTop || iDoc.body.scrollTop || 0;
            const targetY = Math.max(0, currentScrollY + rect.top - 80);
            win.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
            iDoc.body.scrollTo({top: targetY, behavior: 'smooth'});
          }
        }

        setTimeout(() => {
          if (cellId) {
            const cel = iDoc.getElementById(cellId);
            if (cel) cel.classList.remove('fap-cell-highlight');
          }
        }, 3200);
      } catch (_) {}
    });
  };

  const handleTriggerSync = (secId: string) => {
    if (!sideBySide) setSideBySide(true);
    setActiveSyncSection(secId);
    setActiveSyncField(null);
    setActiveFieldKey(null);
    setSyncTick(Date.now());

    // Instant direct highlight & scroll on live preview iframe if mounted
    const iframes = document.querySelectorAll<HTMLIFrameElement>('.fap-detail-preview-col iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const win = iframe.contentWindow;
        if (!iDoc || !win) return;

        iDoc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
          el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
        });

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
      } catch (_) {}
    });
  };

  const toggleSection = (secId: string) => {
    setOpenSections(prev => {
      const willOpen = !prev[secId];
      if (willOpen) {
        handleTriggerSync(secId);
      }
      return {...prev, [secId]: willOpen};
    });
  };

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
        userRole: user?.role || 'BS',
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
  const liveCompanyName = String(
    draft.customer?.companyName ||
      customerDraft.companyName ||
      draft.companyName ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.companyName : '') ||
      a.customer?.companyName ||
      a.companyName ||
      '',
  ).trim();

  const liveCompanyType = String(
    draft.customer?.companyType ||
      customerDraft.companyType ||
      draft.companyType ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.companyType : '') ||
      a.customer?.companyType ||
      'CORPORATE',
  ).trim();

  const liveNib = String(
    draft.customer?.nib ||
      customerDraft.nib ||
      draft.nib ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.nib : '') ||
      a.customer?.nib ||
      '',
  ).trim();

  const liveNpwp = (() => {
    const raw = String(
      draft.customer?.npwp ||
        customerDraft.npwp ||
        draft.npwp ||
        (customerCategory === 'EXISTING' ? selectedCustomer?.npwp : '') ||
        a.customer?.npwp ||
        '',
    ).trim();
    // If it contains only zeros (e.g. '000000000000000'), treat as empty
    return /^0+$/.test(raw) ? '' : raw;
  })();

  const liveEstablishmentActNo = String(
    draft.customer?.establishmentActNo ||
      customerDraft.establishmentActNo ||
      draft.establishmentActNo ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.establishmentActNo : '') ||
      a.customer?.establishmentActNo ||
      '',
  ).trim();

  const liveEstablishmentDate = String(
    draft.customer?.establishmentDate ||
      customerDraft.establishmentDate ||
      draft.establishmentDate ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.establishmentDate : '') ||
      a.customer?.establishmentDate ||
      '',
  ).trim();

  const liveNibDate = String(
    draft.customer?.nibDate ||
      customerDraft.nibDate ||
      draft.nibDate ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.nibDate : '') ||
      a.customer?.nibDate ||
      '',
  ).trim();

  const liveDetailFapData: FapSheetData = {
    fapNumber: draft.isNew ? 'Auto (Generated on save)' : draft.fapNumber || a.fapNumber || '—',
    applicationDate: draft.applicationDate || a.applicationDate || new Date().toISOString(),
    branchCode: draft.branchCode || a.branchCode || '',
    customerStatus: customerCategory || draft.customerStatus || a.customerStatus || 'EXISTING',
    companyName: liveCompanyName,
    companyType: liveCompanyType,
    nib: liveNib,
    nibDate: liveNibDate || '',
    npwp: liveNpwp,
    establishmentActNo: liveEstablishmentActNo,
    establishmentDate: liveEstablishmentDate || '',
    companyAddress: draft.companyAddress,
    province:
      master.province?.find(
        x =>
          x.value === draft.province || x.name.toLowerCase() === String(draft.province || '').toLowerCase(),
      )?.name || draft.province,
    city:
      master.city?.find(
        x => x.value === draft.city || x.name.toLowerCase() === String(draft.city || '').toLowerCase(),
      )?.name || draft.city,
    district:
      master.district?.find(
        x =>
          x.value === draft.district || x.name.toLowerCase() === String(draft.district || '').toLowerCase(),
      )?.name || (/^[0-9a-f-]{36}$/i.test(String(draft.district || '')) ? '' : draft.district),
    village:
      master.village?.find(
        x => x.value === draft.village || x.name.toLowerCase() === String(draft.village || '').toLowerCase(),
      )?.name || (/^[0-9a-f-]{36}$/i.test(String(draft.village || '')) ? '' : draft.village),
    rt: draft.rt,
    rw: draft.rw,
    postalCode: draft.postalCode,
    mainBusiness: draft.mainBusiness,
    experienceYears:
      draft.experienceYears != null && draft.experienceYears !== ''
        ? draft.experienceYears
        : liveEstablishmentDate
          ? calculateAgeYearsMonths(liveEstablishmentDate).years
          : '',
    experienceMonths:
      draft.experienceMonths != null && draft.experienceMonths !== ''
        ? draft.experienceMonths
        : liveEstablishmentDate
          ? calculateAgeYearsMonths(liveEstablishmentDate).months
          : '',
    latestDeedNo: draft.latestDeedNo,
    latestDeedDate: draft.latestDeedDate,
    phoneFax: draft.phoneFax,
    website: draft.website,
    email: draft.email,
    repaymentSource: draft.repaymentSource,
    locationStatus: draft.locationStatus,
    industrySegment: draft.industrySegment || a.industrySegment,
    pic: draft.pic || a.pic,
    picName: draft.pic?.picName || draft.pic?.name || a.pic?.picName || a.pic?.name || a.picName || '',
    position: draft.pic?.position || a.pic?.position || a.position || '',
    phone: draft.pic?.phone || draft.pic?.mobilePhone || a.pic?.phone || a.phone || '',
    picEmail: draft.pic?.email || draft.pic?.picEmail || a.pic?.email || a.picEmail || '',
    currentAddress:
      draft.pic?.currentAddress || draft.pic?.address || a.pic?.currentAddress || a.currentAddress || '',
    picCity:
      master.city?.find(
        x =>
          x.value === (draft.pic?.city || a.pic?.city) ||
          x.name?.toLowerCase() === String(draft.pic?.city || a.pic?.city || '').toLowerCase(),
      )?.name ||
      draft.pic?.city ||
      a.pic?.city ||
      '',
    picProvince:
      master.province?.find(
        x =>
          x.value === (draft.pic?.province || a.pic?.province) ||
          x.name?.toLowerCase() === String(draft.pic?.province || a.pic?.province || '').toLowerCase(),
      )?.name ||
      draft.pic?.province ||
      a.pic?.province ||
      '',
    picPostalCode: draft.pic?.postalCode || a.pic?.postalCode || a.picPostalCode || '',
    selectedDeedNo: draft.legal?.selectedDeedNo || draft.latestDeedNo || a.customer?.establishmentActNo,
    proposal: draft.proposal || a.proposal,
    projects: draft.projects || a.projects,
    bankReferences: draft.bankReferences || a.bankReferences,
    financialStatements: draft.financialStatements || a.financialStatements,
    facilityPurpose: (draft.proposal || a.proposal)?.facilityPurpose || a.facilityPurpose || 'INVESTMENT',
    financingMethod: (draft.proposal || a.proposal)?.financingMethod,
    financingValue: (draft.proposal || a.proposal)?.financingValue,
    downPaymentValue: (draft.proposal || a.proposal)?.downPaymentValue,
    interestRate: (draft.proposal || a.proposal)?.interestRate,
    tenorMonths: (draft.proposal || a.proposal)?.tenorMonths,
    paymentMethod: (draft.proposal || a.proposal)?.paymentMethod,
    units: (draft.proposal || a.proposal)?.units,
    assetSummaryHeLiuGong: a.assetSummaryHeLiuGong,
    assetSummaryTruckLiuGong: a.assetSummaryTruckLiuGong,
    assetSummaryHeNonLiuGong: a.assetSummaryHeNonLiuGong,
    assetSummaryTruckNonLiuGong: a.assetSummaryTruckNonLiuGong,
  };

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
  const canLegal = true;
  const canEditCustomerPic = true;
  const canEdit = true;
  const canFinance = true;

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

  useEffect(() => {
    const handleActivitySync = () => {
      setLocalActivities(getStoredActivities());
      setLocalReadIds(getReadActivityIds());
    };
    window.addEventListener('crm-activity-state-change', handleActivitySync);
    return () => {
      window.removeEventListener('crm-activity-state-change', handleActivitySync);
    };
  }, []);

  const applicationActivities = useMemo(() => {
    const currentAppId = String(a.id || '');
    const currentFapNo = String(a.fapNumber || '')
      .trim()
      .toLowerCase();
    const currentCompanyName = String(
      a.customer?.companyName || draft.customer?.companyName || liveCompanyName || '',
    )
      .trim()
      .toLowerCase();

    const matched = localActivities.filter(act => {
      if (act.applicationId && String(act.applicationId) === currentAppId) return true;
      if (act.fapNumber && currentFapNo && String(act.fapNumber).trim().toLowerCase() === currentFapNo)
        return true;
      if (!act.applicationId && !act.fapNumber && act.companyName && currentCompanyName) {
        if (String(act.companyName).trim().toLowerCase() === currentCompanyName) return true;
      }
      return false;
    });

    const existingTitles = new Set(matched.map(m => `${m.title}_${m.timestamp}`));
    const workflowLogs: SystemActivity[] = (a.approvalLogs || [])
      .map((l: any, idx: number) => {
        const timestamp = l.actionTimestamp
          ? new Date(l.actionTimestamp).toISOString()
          : new Date().toISOString();
        const actionLabel = statusLabel[l.newStatus] || l.newStatus || 'Updated';
        const title = `Workflow: ${actionLabel} by ${l.actionBy || 'User'}`;
        return {
          id: `app-log-${l.id || idx}-${currentAppId}`,
          applicationId: a.id,
          fapNumber: a.fapNumber,
          companyName: a.customer?.companyName || draft.customer?.companyName || 'Application',
          section: 'Documents',
          tabIndex: 6,
          actionType: (l.newStatus === 'APPROVED'
            ? 'APPROVE'
            : l.newStatus?.includes('SUBMIT')
              ? 'SUBMIT'
              : 'UPDATE') as any,
          title,
          details: l.comments
            ? `Comments: "${l.comments}" (Transition: ${statusLabel[l.previousStatus] || l.previousStatus} ➔ ${statusLabel[l.newStatus] || l.newStatus})`
            : `Application moved to ${statusLabel[l.newStatus] || l.newStatus}.`,
          actionBy: l.actionBy || 'System',
          userRole: l.userRole || 'Workflow',
          timestamp,
          read: true,
        };
      })
      .filter((wl: any) => !existingTitles.has(`${wl.title}_${wl.timestamp}`));

    return [...matched, ...workflowLogs].sort(
      (x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime(),
    );
  }, [
    localActivities,
    a.id,
    a.fapNumber,
    a.customer?.companyName,
    draft.customer?.companyName,
    liveCompanyName,
    a.approvalLogs,
  ]);

  const handleMarkAppActivityRead = (id: string) => {
    setLocalReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadActivityIds(next);
      return next;
    });
  };

  const handleMarkAllAppActivitiesRead = () => {
    setLocalReadIds(prev => {
      const next = new Set(prev);
      for (const act of applicationActivities) {
        next.add(act.id);
      }
      saveReadActivityIds(next);
      return next;
    });
    notify('All activities for this application marked as seen');
  };

  const handleOpenSectionFromActivity = (_appId: string, targetTabIndex?: number) => {
    if (targetTabIndex !== undefined) {
      if (targetTabIndex === 8) {
        setActiveStage('Pre-analysis');
      } else if ([0, 5, 1].includes(targetTabIndex)) {
        if (activeStage !== 'FAP Stage' && !isPreAnalysisReached) {
          setActiveStage('FAP Stage');
        }
      } else if ([2, 4].includes(targetTabIndex)) {
        setActiveStage('Pre-analysis');
      }
      setTab(targetTabIndex);
      setError('');
    }
  };

  let actions: string[] = [];
  if (checkIsAdmin(user)) {
    if (['DRAFT', 'RETURNED'].includes(a.status)) actions = ['SUBMIT_TO_BS'];
    else if (a.status === 'SUBMITTED_TO_BS') actions = ['VERIFY_BS', 'RETURN'];
    else if (a.status === 'BS_VERIFIED') actions = ['START_REVIEW', 'RETURN'];
    else if (a.status === 'IN_CA_LEGAL_REVIEW') actions = ['RECOMMEND_CA', 'RECOMMEND_LEGAL', 'RETURN'];
    else if (a.status === 'CREDIT_COMMITTEE_REVIEW')
      actions = ['APPROVE_COMMITTEE', 'REJECT_COMMITTEE', 'RETURN'];
  } else {
    if (user.role === 'MKT' && ['DRAFT', 'RETURNED'].includes(a.status)) actions = ['SUBMIT_TO_BS'];
    if (user.role === 'BS' && a.status === 'SUBMITTED_TO_BS') actions = ['VERIFY_BS', 'RETURN'];
    if (user.role === 'BS' && a.status === 'BS_VERIFIED') actions = ['START_REVIEW', 'RETURN'];
    if (['CA', 'LEGAL'].includes(user.role) && a.status === 'IN_CA_LEGAL_REVIEW')
      actions = [user.role === 'CA' ? 'RECOMMEND_CA' : 'RECOMMEND_LEGAL', 'RETURN'];
    if (user.role === 'COMMITTEE' && a.status === 'CREDIT_COMMITTEE_REVIEW')
      actions = ['APPROVE_COMMITTEE', 'REJECT_COMMITTEE', 'RETURN'];
  }

  async function save() {
    // FAP Stage is fully editable per specification
    setBusy(true);
    setError('');
    try {
      const stakeholdersChanged = JSON.stringify(draft.stakeholders) !== JSON.stringify(a.stakeholders);
      const hasPicData =
        draft.pic &&
        Object.values(draft.pic).some(
          v => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-',
        );
      const cleanProjects = (draft.projects || []).filter(
        (p: any) =>
          p && Object.values(p).some((v: any) => v !== undefined && v !== null && String(v).trim() !== ''),
      );
      const safeProfileData = Object.fromEntries(
        Object.entries(draft).filter(
          ([k]) =>
            ![
              'proposal',
              'financialStatements',
              'legal',
              'stakeholders',
              'documentChecks',
              'approvalLogs',
              'signoffs',
              'ratios',
            ].includes(k),
        ),
      );
      if (
        !safeProfileData.latestDeedDate ||
        String(safeProfileData.latestDeedDate).trim() === '' ||
        String(safeProfileData.latestDeedDate) === 'null'
      ) {
        safeProfileData.latestDeedDate = null;
      }
      if (!safeProfileData.latestDeedNo || String(safeProfileData.latestDeedNo).trim() === '') {
        safeProfileData.latestDeedNo = null;
      }

      const resolvedName =
        liveCompanyName ||
        customerDraft?.companyName ||
        draft.customer?.companyName ||
        draft.companyName ||
        'New Company (Draft)';
      const customerPayload = {
        ...(draft.customer || {}),
        ...(customerDraft || {}),
        companyName: resolvedName,
        companyType: liveCompanyType || 'CORPORATE',
        nib: liveNib || customerDraft?.nib || draft.customer?.nib || '',
        npwp: liveNpwp || customerDraft?.npwp || draft.customer?.npwp || '',
        establishmentActNo:
          (
            liveEstablishmentActNo ||
            customerDraft?.establishmentActNo ||
            draft.customer?.establishmentActNo ||
            ''
          ).trim() || null,
        establishmentDate:
          liveEstablishmentDate ||
          customerDraft?.establishmentDate ||
          draft.customer?.establishmentDate ||
          null ||
          null,
        nibDate: liveNibDate || customerDraft?.nibDate || draft.customer?.nibDate || null || null,
      };

      const deedsWithStakeholders = (draft.legal?.deeds || []).map((d: any) => ({
        ...d,
        stakeholders:
          d.id === (draft.legal.selectedDeedId || draft.legal?.deeds?.[0]?.id)
            ? draft.stakeholders || d.stakeholders || []
            : d.stakeholders || [],
      }));
      const legalPayload = {
        ...(draft.legal || {}),
        deeds: deedsWithStakeholders,
      };
      const body =
        tab === 0
          ? {
              profile: {
                ...safeProfileData,
                companyName: resolvedName,
                customerStatus: customerCategory,
              },
              customer: customerPayload,
              customerCategory: customerCategory,
              ...(hasPicData ? {pic: draft.pic} : {}),
              projects: cleanProjects,
            }
          : tab === 2
            ? {
                projects: cleanProjects,
                bankReferences: draft.bankReferences,
                proposal: draft.proposal,
              }
            : tab === 3
              ? {
                  proposal: draft.proposal,
                }
              : tab === 4
                ? {
                    financialStatements: draft.financialStatements,
                  }
                : {
                    legal: legalPayload,
                    stakeholders: (draft.stakeholders || []).map(stakeholderForSave),
                  };

      const currentStage = activeStage || draft.stage || a.stage || 'FAP Stage';
      const v = await api(`/applications/${a.id}/page-${tab < 3 ? 1 : tab === 5 ? 'legal' : 2}`, 'PUT', {
        ...body,
        stage: currentStage,
      });
      const nextApp = {
        ...a,
        ...v,
        stage: currentStage,
        customer: {
          ...(a.customer || {}),
          ...(v?.customer || {}),
          ...customerPayload,
        },
      };
      setDraft((prev: any) => ({...prev, ...nextApp}));
      setCustomerDraft((prev: any) => ({...prev, ...customerPayload}));
      onChange(nextApp);
      notify('Changes saved successfully');
      try {
        const tabNamesList: Record<number, string> = {
          0: 'Customer & PIC',
          1: 'Stakeholders',
          2: 'Business & banks',
          3: 'Financing & units',
          4: 'Financial statements',
          5: 'Legal',
          6: 'Documents',
          8: 'Pre Analysis form',
        };
        const activeSectionName = tabNamesList[tab] || 'Application details';

        let diffResult = {changes: [] as any[], details: '', summaryTitle: ''};
        try {
          diffResult = computeApplicationDiff({
            tab,
            beforeApp: a,
            draft,
            customerPayload,
            customerDraft,
            resolvedName,
            customerCategory,
          });
        } catch (diffErr) {
          console.error('Diff computation error:', diffErr);
        }

        let changeSnippet = diffResult.details;
        if (!changeSnippet) {
          if (tab === 0)
            changeSnippet = `Saved company profile, contact details, NIB (${customerPayload.nib || 'N/A'}), and NPWP (${customerPayload.npwp || 'N/A'}).`;
          else if (tab === 1) changeSnippet = `Saved share ownership and stakeholder list.`;
          else if (tab === 2)
            changeSnippet = `Updated business operations, industry segment, and bank reference info.`;
          else if (tab === 3 || tab === 4)
            changeSnippet = `Updated financing value (${money(draft.proposal?.financingValue)}) and equipment unit terms.`;
          else if (tab === 5) changeSnippet = `Updated legal deeds and shareholder registers.`;
          else if (tab === 6) changeSnippet = `Updated document desk checklist records.`;
          else if (tab === 8)
            changeSnippet = `Saved Pre-Analysis evaluation, greyed-out checklist, and TinyMCE remarks.`;
        }

        recordSystemActivity({
          applicationId: a.id,
          fapNumber: a.fapNumber,
          companyName: resolvedName,
          section: activeSectionName,
          tabIndex: tab,
          actionType: 'UPDATE',
          title: diffResult.summaryTitle
            ? `${diffResult.summaryTitle} for ${resolvedName}`
            : `Updated ${activeSectionName} for ${resolvedName}`,
          details: changeSnippet,
          changes: diffResult.changes,
          actionBy: user?.name || 'System User',
          userRole: user?.role || 'User',
        });
      } catch (actErr) {
        console.error('Activity record error:', actErr);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  }
  const p = draft.proposal || {...blank(proposalFields), units: []};
  const principal = Number(p.financingValue) - Number(p.downPaymentValue),
    r = Number(p.interestRate) / 1200,
    monthly = p.tenorMonths
      ? (r
          ? (principal * r) / (1 - Math.pow(1 + r, -Number(p.tenorMonths)))
          : principal / Number(p.tenorMonths)) /
        (master.paymentMethod.find(x => x.value === p.paymentMethod)?.timing === 'advance' ? 1 + r : 1)
      : 0;

  async function beginDeedReview(id: string) {
    setError('');
    setBusy(true);
    try {
      if (canLegal) {
        const list = legalDeedList(draft.legal || {}, a),
          selected =
            draft.legal?.selectedDeedId ||
            list.find(x => x.type === (draft.legal?.selectedDeed || 'establishment'))?.id ||
            list[0]?.id,
          target = list.find(d => d.id === id);
        if (!target) throw Error('Deed not found.');
        const deed = deedData({
          ...target,
          stakeholders: Array.isArray(target.stakeholders) ? target.stakeholders : draft.stakeholders || [],
        });
        const v = await api(`/applications/${a.id}/deeds/${id}/draft`, 'PUT', {deed});
        onChange(v);
        setDraft(structuredClone(v));
      }
      setReviewDeedId(id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (tab !== 1) return;
    const timer = setInterval(
      () =>
        api('/applications/' + a.id)
          .then(onChange)
          .catch(() => {}),
      15000,
    );
    return () => clearInterval(timer);
  }, [tab, a.id]);
  const renderCustomerDetailSections = () => (
    <div className="fap-accordion-group">
      {/* 01: Debtor Identity & Classification */}
      <div
        className={`fap-accordion-card ${openSections['fap-preview-sec-header'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-header"
      >
        <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-header')}>
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">01</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Debtor Identity & Classification</h4>
                <span className={`fap-acc-badge ${liveCompanyName ? 'success' : ''}`}>
                  {customerCategory === 'EXISTING'
                    ? selectedCustomer
                      ? selectedCustomer.companyName
                      : 'Select Debtor'
                    : liveCompanyName || 'New Debtor'}
                </span>
              </div>
              <p className="fap-acc-subtitle">
                Customer category (Existing / New), FAP registration number, NIB, and NPWP
              </p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button
              type="button"
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={e => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-header');
                setOpenSections(s => ({...s, ['fap-preview-sec-header']: true}));
              }}
            >
              <Eye size={12} /> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-header'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-header'] && (
          <div className="fap-accordion-content">
            <div
              className="intake-system-fields"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{cursor: 'pointer'}}
                onClick={() => handleTriggerFieldSync('applicationDate', 'header')}
                title="Click to sync view Tanggal/Date di formulir aplikasi"
              >
                <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block'}}>
                  Application date
                </span>
                <b
                  style={{
                    fontSize: '0.875rem',
                    color: activeFieldKey === 'applicationDate' ? '#2563eb' : '#0f172a',
                  }}
                >
                  {new Date(draft.applicationDate || Date.now()).toLocaleDateString('en-GB')}
                </b>
              </div>
              <div
                style={{cursor: 'pointer'}}
                onClick={() => handleTriggerFieldSync('fapNumber', 'header')}
                title="Click to sync view No. Register FAP di formulir aplikasi"
              >
                <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block'}}>
                  FAP Registration Number
                </span>
                <b
                  style={{
                    fontSize: '0.875rem',
                    color: activeFieldKey === 'fapNumber' ? '#2563eb' : '#0f172a',
                  }}
                >
                  {draft.isNew
                    ? 'Generated automatically upon saving'
                    : draft.fapNumber || a.fapNumber || '—'}
                </b>
              </div>
            </div>
            <div className="customer-category-selector-box" style={{marginBottom: 16, width: '100%'}}>
              <label
                className="customer-category-label"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: '#334155',
                  marginBottom: 6,
                }}
                onClick={() => handleTriggerFieldSync('customerCategory', 'header')}
              >
                Customer Category
              </label>
              <select
                className="customer-category-select-input"
                value={customerCategory}
                disabled={!canEditCustomerPic || (!draft.isNew && Boolean(a.customerId || a.customer_id))}
                onFocus={() => handleTriggerFieldSync('customerCategory', 'header')}
                onChange={e => {
                  changeCategory(e.target.value);
                  handleTriggerFieldSync(
                    e.target.value === 'EXISTING' ? 'fap-cell-custExisting' : 'fap-cell-custNew',
                    'header',
                  );
                }}
                style={{
                  width: '100%',
                  display: 'block',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <option value="EXISTING">Existing Customer</option>
                <option value="NEW">New Customer</option>
              </select>
            </div>
            <div className="new-customer-fields-block" style={{marginTop: 12}}>
              <Fields
                fields={fapCustomerFields}
                onNibOcr={canEditCustomerPic ? () => setNibOcrOpen(true) : undefined}
                value={customerDraft}
                disabled={!canEditCustomerPic}
                section="customer"
                onFieldFocus={k => handleTriggerFieldSync(k, 'customer')}
                onFieldSync={k => handleTriggerFieldSync(k, 'customer')}
                activeFieldKey={activeFieldKey}
                onChange={c => {
                  setCustomerDraft(c);
                  // Sync establishment deed to latestDeed and experience if no deeds in legal yet
                  const legalDeeds: any[] = Array.isArray(draft.legal?.deeds) ? draft.legal.deeds : [];
                  const hasLegalEstablishment = legalDeeds.some((d: any) => d.type === 'establishment');
                  const hasLegalAmendment = legalDeeds.some((d: any) => d.type === 'amendment');
                  const estDate = String(c.establishmentDate || '').slice(0, 10);
                  const exp = calculateAgeYearsMonths(estDate);
                  setDraft((prev: any) => ({
                    ...prev,
                    customer: c,
                    // If no establishment deed in legal yet, use manual input as latest
                    ...(!hasLegalAmendment && !hasLegalEstablishment
                      ? {
                          latestDeedNo: c.establishmentActNo || prev.latestDeedNo || '',
                          latestDeedDate: estDate || prev.latestDeedDate || '',
                        }
                      : {}),
                    // Experience always calculated from establishmentDate
                    ...(estDate ? {experienceYears: exp.years, experienceMonths: exp.months} : {}),
                  }));
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 02: Registration Office & Domicile */}
      <div
        className={`fap-accordion-card ${openSections['fap-preview-sec-company'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-company"
      >
        <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-company')}>
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">02</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Registration Office & Company Domicile</h4>
                <span className={`fap-acc-badge ${draft.city && draft.companyAddress ? 'success' : ''}`}>
                  {draft.city ? `${draft.city} (${draft.branchCode || 'Branch'})` : 'Not filled'}
                </span>
              </div>
              <p className="fap-acc-subtitle">
                Application branch, domicile ownership, full address, and official contact
              </p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button
              type="button"
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={e => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-company');
                setOpenSections(s => ({...s, ['fap-preview-sec-company']: true}));
              }}
            >
              <Eye size={12} /> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-company'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-company'] && (
          <div className="fap-accordion-content">
            <div style={{marginBottom: 14}}>
              <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
                Office & Branch Status
              </h5>
              <Fields
                fields={profileFields.filter(f =>
                  ['branchCode', 'customerStatus', 'locationStatus'].includes(f.key),
                )}
                value={draft}
                disabled={!canEditCustomerPic}
                section="company"
                onFieldFocus={k => handleTriggerFieldSync(k, 'company')}
                onFieldSync={k => handleTriggerFieldSync(k, 'company')}
                activeFieldKey={activeFieldKey}
                onChange={setDraft}
              />
            </div>
            <div style={{borderTop: '1px dashed #e2e8f0', paddingTop: 14}}>
              <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
                Office Address & Official Contact
              </h5>
              <Fields
                fields={profileFields.filter(f =>
                  [
                    'companyAddress',
                    'province',
                    'city',
                    'district',
                    'village',
                    'rt',
                    'rw',
                    'postalCode',
                    'phoneFax',
                    'email',
                    'website',
                  ].includes(f.key),
                )}
                value={draft}
                disabled={!canEditCustomerPic}
                section="company"
                onFieldFocus={k => handleTriggerFieldSync(k, 'company')}
                onFieldSync={k => handleTriggerFieldSync(k, 'company')}
                activeFieldKey={activeFieldKey}
                onChange={setDraft}
              />
            </div>
          </div>
        )}
      </div>

      {/* 03: Business Profile & Deed Legality */}
      <div
        className={`fap-accordion-card ${openSections['fap-preview-sec-business'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-business"
      >
        <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-business')}>
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">03</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Business Profile & Deed Legality</h4>
                <span className={`fap-acc-badge ${draft.mainBusiness ? 'success' : ''}`}>
                  {draft.mainBusiness || 'Not filled'}
                </span>
              </div>
              <p className="fap-acc-subtitle">
                Main business sector, operational experience, source of funds, and latest deed number
              </p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button
              type="button"
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={e => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-business');
                setOpenSections(s => ({...s, ['fap-preview-sec-business']: true}));
              }}
            >
              <Eye size={12} /> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-business'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-business'] && (
          <div className="fap-accordion-content">
            <div style={{marginBottom: 14}}>
              <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
                Business Experience & Operations
              </h5>
              {(() => {
                const calculatedExp = liveEstablishmentDate
                  ? calculateAgeYearsMonths(liveEstablishmentDate)
                  : null;
                const operationalValues = {
                  ...draft,
                  experienceYears: calculatedExp
                    ? String(calculatedExp.years)
                    : (draft.experienceYears ?? ''),
                  experienceMonths: calculatedExp
                    ? String(calculatedExp.months)
                    : (draft.experienceMonths ?? ''),
                };
                const opFields: Field[] = [
                  profileFields.find(f => f.key === 'mainBusiness')!,
                  profileFields.find(f => f.key === 'repaymentSource')!,
                  profileFields.find(f => f.key === 'industrySegment')!,
                  profileFields.find(f => f.key === 'businessRole')!,
                  {...profileFields.find(f => f.key === 'experienceYears')!, type: 'text'},
                  {...profileFields.find(f => f.key === 'experienceMonths')!, type: 'text'},
                ].filter(Boolean);
                return (
                  <>
                    <Fields
                      fields={opFields}
                      value={operationalValues}
                      disabled={!canEditCustomerPic}
                      section="business"
                      onFieldFocus={k => handleTriggerFieldSync(k, 'business')}
                      onFieldSync={k => handleTriggerFieldSync(k, 'business')}
                      activeFieldKey={activeFieldKey}
                      onChange={v => {
                        const exp = liveEstablishmentDate
                          ? calculateAgeYearsMonths(liveEstablishmentDate)
                          : null;
                        setDraft({
                          ...v,
                          experienceYears: exp
                            ? exp.years
                            : (v.experienceYears ?? draft.experienceYears ?? 0),
                          experienceMonths: exp
                            ? exp.months
                            : (v.experienceMonths ?? draft.experienceMonths ?? 0),
                        });
                      }}
                    />
                    <small style={{color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: 6}}>
                      * Experience years & months are calculated automatically from the Establishment Deed
                      Date
                    </small>
                  </>
                );
              })()}
            </div>
            <div style={{borderTop: '1px dashed #e2e8f0', paddingTop: 14}}>
              <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
                Amendment Deed Legal Summary
              </h5>
              <Fields
                fields={profileFields.filter(f => ['latestDeedNo', 'latestDeedDate'].includes(f.key))}
                value={draft}
                disabled={!canEditCustomerPic}
                section="business"
                onFieldFocus={k => handleTriggerFieldSync(k, 'business')}
                onFieldSync={k => handleTriggerFieldSync(k, 'business')}
                activeFieldKey={activeFieldKey}
                onChange={v => {
                  const exp = calculateAgeYearsMonths(liveEstablishmentDate);
                  setDraft({...v, experienceYears: exp.years, experienceMonths: exp.months});
                }}
              />
              {liveEstablishmentDate && (
                <small style={{color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginTop: 4}}>
                  Latest deed synced automatically from the Legal tab.
                </small>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 04: Primary Contact / PIC */}
      <div
        className={`fap-accordion-card ${openSections['fap-preview-sec-pic'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-pic"
      >
        <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-pic')}>
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">04</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Primary Contact / Person in Charge (PIC)</h4>
                <span className={`fap-acc-badge ${draft.pic?.picName ? 'success' : ''}`}>
                  {draft.pic?.picName
                    ? `${draft.pic.picName} (${draft.pic.position || 'PIC'})`
                    : 'Not filled'}
                </span>
              </div>
              <p className="fap-acc-subtitle">
                PIC personal data, position/title, mobile number, and PIC domicile address
              </p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button
              type="button"
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={e => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-pic');
                setOpenSections(s => ({...s, ['fap-preview-sec-pic']: true}));
              }}
            >
              <Eye size={12} /> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-pic'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-pic'] && (
          <div className="fap-accordion-content">
            <Fields
              fields={picFields}
              value={draft.pic || {}}
              disabled={!canEditCustomerPic}
              section="pic"
              onFieldFocus={k => handleTriggerFieldSync(k, 'pic')}
              onFieldSync={k => handleTriggerFieldSync(k, 'pic')}
              activeFieldKey={activeFieldKey}
              onChange={pic => setDraft({...draft, pic})}
            />
          </div>
        )}
      </div>

      {/* 05: Segmentation & Active Projects */}
      <div
        className={`fap-accordion-card ${openSections['fap-preview-sec-projects'] ? 'is-open' : 'is-closed'}`}
        id="acc-fap-preview-sec-projects"
      >
        <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-projects')}>
          <div className="fap-acc-header-left">
            <span className="fap-acc-step-badge">05</span>
            <div className="fap-acc-titles">
              <div className="fap-acc-title-row">
                <h4 className="fap-acc-title">Industry Segmentation & Active Projects</h4>
                <span className={`fap-acc-badge ${(draft.projects?.length || 0) > 0 ? 'success' : ''}`}>
                  {draft.projects?.length || 0} Projects
                </span>
              </div>
              <p className="fap-acc-subtitle">Debtor's active project contracts and business activities</p>
            </div>
          </div>
          <div className="fap-acc-header-right">
            <button
              type="button"
              className="fap-acc-sync-btn"
              title="Sync preview document to this section"
              onClick={e => {
                e.stopPropagation();
                handleTriggerSync('fap-preview-sec-projects');
                setOpenSections(s => ({...s, ['fap-preview-sec-projects']: true}));
              }}
            >
              <Eye size={12} /> Sync View
            </button>
            <span className={`fap-acc-chevron ${openSections['fap-preview-sec-projects'] ? 'rotate' : ''}`}>
              <ChevronDown size={17} />
            </span>
          </div>
        </div>
        {openSections['fap-preview-sec-projects'] && (
          <div className="fap-accordion-content">
            <Repeater
              title="Project Contracts"
              description="Active project contracts and business activities (filled by Marketing)."
              fields={projectFields}
              rows={draft.projects || []}
              disabled={!canEditCustomerPic}
              carousel
              section="projects"
              onFieldFocus={k => handleTriggerFieldSync(k, 'projects')}
              onFieldSync={k => handleTriggerFieldSync(k, 'projects')}
              activeFieldKey={activeFieldKey}
              onChange={projects => setDraft({...draft, projects})}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button className="text-link back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to workspace
      </button>
      <div className="detail-heading">
        <IconBox>
          <Building2 size={25} />
        </IconBox>
        <div>
          <div className="eyebrow">
            {draft.isNew ? (
              <span>NEW APPLICATION · FAP INTAKE</span>
            ) : a.fapNumber ? (
              <>
                {a.fapNumber}
                {a.branchCode && <span> / {a.branchCode}</span>}
              </>
            ) : (
              a.branchCode || null
            )}
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
            <h1>
              {liveCompanyName || (draft.isNew ? 'New Financing Application' : 'Financing Application')}
            </h1>
            <span
              className={`stage-pill-indicator ${currentAppStage === 'FAP Stage' ? 'stage-fap' : 'stage-preanalysis'}`}
            >
              Active Stage: {currentAppStage}
            </span>
          </div>
          <p>
            {draft.isNew ? (
              <>
                FAP Intake Stage <span>·</span> {draft.city || draft.branchCode || 'Draft'} <span>·</span>{' '}
                {new Date().toLocaleDateString('en-GB')}
              </>
            ) : (
              <>
                {label(draft.industrySegment || a.industrySegment)} <span>·</span>{' '}
                {draft.city || a.city || '—'} <span>·</span> Created{' '}
                {date(draft.applicationDate || a.applicationDate)}
              </>
            )}
          </p>
        </div>
        <Badge status={draft.isNew ? 'DRAFT' : a.status} />
      </div>
      <div className="chevron-stepper">
        {['FAP Stage', 'Pre-analysis', 'ICLF'].map((st, i) => (
          <div
            key={st}
            className={`chevron-step ${i === 0 ? 'first' : ''} ${activeStage === st ? 'active' : 'inactive'}`}
            style={{cursor: draft.isNew && st !== 'FAP Stage' ? 'not-allowed' : 'pointer'}}
            title={
              draft.isNew && st !== 'FAP Stage'
                ? 'Please save the application first'
                : `Switch to ${st} view tab`
            }
            onClick={() => {
              if (draft.isNew && st !== 'FAP Stage') {
                notify('Please save the application (FAP Stage) first to unlock the next stage.');
                return;
              }
              setActiveStage(st);
              if (tab !== 7) {
                if (st === 'FAP Stage') setTab(0);
                else if (st === 'Pre-analysis') setTab(8);
                else if (st === 'ICLF') setTab(6);
              }
            }}
          >
            {st}
          </div>
        ))}
      </div>
      <div className="detail-summary">
        <div>
          <span>Proposed Financing</span>
          <b>{money(draft.proposal?.financingValue || a.proposal?.financingValue)}</b>
        </div>
        <div>
          <span>Financing Term</span>
          <b>{draft.proposal?.tenorMonths || a.proposal?.tenorMonths || '—'} months</b>
        </div>
        <div>
          <span>Customer Category</span>
          <b>
            {customerCategory === 'EXISTING'
              ? 'Existing Customer'
              : customerCategory === 'NEW'
                ? 'New Customer'
                : label(a.customer?.companyType || '—')}
          </b>
        </div>
        <div>
          <span>Documents Verified</span>
          <b>
            {a.documentChecks
              ? `${a.documentChecks.filter((d: any) => d.status === 'VERIFIED').length} / ${a.documentChecks.length}`
              : '0 / 0'}
          </b>
        </div>
      </div>
      <div className="detail-tabs">
        {tabOrder.map(id => (
          <button
            key={tabs[id]}
            className={tab === id ? 'active' : ''}
            onClick={() => {
              if (draft.isNew && id !== 0) {
                notify('Please save the application (FAP Stage) before opening other tabs.');
                return;
              }
              setTab(id);
              setError('');
            }}
            title={draft.isNew && id !== 0 ? 'Save application first' : undefined}
            style={draft.isNew && id !== 0 ? {opacity: 0.6, cursor: 'not-allowed'} : undefined}
          >
            {tabs[id]}
          </button>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      {tab < 6 && (
        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <h2>{tabs[tab]}</h2>
              <p>
                {
                  [
                    'Company profile and primary point of contact',
                    'View ownership and stakeholder information. Edit these fields in Legal.',
                    'Business details, bank facilities, financing terms, and equipment units',
                    'Equipment, financing terms, and estimated monthly installment',
                    'Three years of financial performance. All figures in IDR.',
                    'Deeds, related parties, and ownership structure.',
                  ][tab]
                }
              </p>
            </div>
            {!(tab === 1
              ? false
              : tab === 5
                ? canLegal
                : tab === 2
                  ? canFinance
                  : tab < 3
                    ? canEdit
                    : canFinance) && (
              <span className="subtle-chip">
                <ShieldCheck size={14} />
                Read only
              </span>
            )}
          </div>
          <div className="form-body">
            {tab === 0 && (
              <>
                <div
                  className="customer-reference"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Building2 size={18} />
                    <span>
                      <b>
                        {customerCategory === 'EXISTING'
                          ? selectedCustomer?.companyName || 'No debtor selected'
                          : liveCompanyName || 'New Applicant'}
                      </b>{' '}
                      · NIB {customerCategory === 'EXISTING' ? selectedCustomer?.nib || '—' : liveNib || '—'}{' '}
                      · NPWP{' '}
                      {customerCategory === 'EXISTING' ? selectedCustomer?.npwp || '—' : liveNpwp || '—'}
                    </span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <button
                      type="button"
                      className="button small"
                      style={{
                        background: '#f8fafc',
                        color: '#002c5f',
                        borderColor: '#cbd5e1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onClick={openArchiveViewer}
                      title="View immutable FAP submission archive, OCR differences, notes, and document storage path"
                    >
                      <Archive size={14} />
                      <span>Submission Archive &amp; OCR</span>
                    </button>
                    <div className="fap-tab-layout-toggle" style={{margin: 0}}>
                      <button
                        type="button"
                        className={`fap-tab-toggle-btn ${sideBySide ? 'active' : ''}`}
                        onClick={() => setSideBySide(s => !s)}
                        title={sideBySide ? 'Close Side-by-side' : 'Open Side-by-side Live FAP'}
                      >
                        <Columns size={14} />
                        {sideBySide ? 'Side-by-side Live FAP (Active)' : 'Open Side-by-side FAP'}
                      </button>
                    </div>
                  </div>
                </div>
                {!sideBySide && (
                  <div style={{display: 'none'}} className="print-hidden-doc">
                    <FapSheetPreview
                      data={liveDetailFapData}
                      application={a}
                      customer={draft.customer || a.customer}
                      profile={draft}
                      pic={draft.pic || a.pic}
                      onPrint={handlePrintFap}
                    />
                  </div>
                )}
                {sideBySide ? (
                  <div className="fap-detail-split-container">
                    <div className="fap-detail-form-col">{renderCustomerDetailSections()}</div>
                    <div className="fap-detail-preview-col">
                      <FapSheetPreview
                        data={liveDetailFapData}
                        application={a}
                        customer={draft.customer || a.customer}
                        profile={draft}
                        pic={draft.pic || a.pic}
                        activeSection={activeSyncSection}
                        activeField={activeSyncField || undefined}
                        syncTick={syncTick}
                        onSectionClick={handlePreviewSectionClick}
                        onPreviewCellClick={(fKey, sId) => handleTriggerFieldSync(fKey, sId)}
                        onPrint={handlePrintFap}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="business-sections" style={{marginTop: 14}}>
                    {renderCustomerDetailSections()}
                  </div>
                )}
              </>
            )}
            {tab === 1 && (
              <>
                <StakeholderDeedView
                  legal={draft.legal || {}}
                  application={a}
                  fallbackRows={draft.stakeholders}
                />
              </>
            )}
            {tab === 2 && (
              <div className="business-sections">
                <section className="business-section">
                  <Repeater
                    title="Bank Facilities"
                    description="Existing company credit facilities and loans."
                    fields={bankFields}
                    rows={draft.bankReferences}
                    disabled={!canEdit}
                    carousel
                    onChange={bankReferences => setDraft({...draft, bankReferences})}
                  />
                </section>
                <section className="business-section">
                  <div className="business-section-heading">
                    <div>
                      <h3>Financing Details</h3>
                      <p className="muted">Set the financing value, tenor, and terms.</p>
                    </div>
                  </div>
                  <Fields
                    fields={proposalFields}
                    value={p}
                    disabled={!canFinance}
                    onChange={proposal => setDraft({...draft, proposal})}
                  />
                  <div className="simulation">
                    <div>
                      <Wallet size={22} />
                      <span>
                        Estimated monthly installment<strong>{money(monthly)}</strong>
                      </span>
                    </div>
                    <p>
                      Reducing balance estimate. Excludes fees, insurance, and taxes.
                      <br />
                      Net principal: {money(principal)} · {p.paymentMethod || 'In Arrear'}
                    </p>
                  </div>
                </section>
                <section className="business-section">
                  <Repeater
                    title="Equipment Units"
                    description="Register details for each financed equipment unit."
                    fields={unitFields}
                    rows={p.units || []}
                    disabled={!canFinance}
                    onChange={units => setDraft({...draft, proposal: {...p, units}})}
                  />
                </section>
              </div>
            )}
            {tab === 4 && (
              <FinancialEditor
                rows={draft.financialStatements}
                disabled={!canFinance}
                onChange={financialStatements => setDraft({...draft, financialStatements})}
              />
            )}
            {tab === 5 && (
              <LegalEditor
                value={draft.legal || {}}
                application={a}
                stakeholders={draft.stakeholders}
                disabled={!canLegal}
                user={user}
                onReview={beginDeedReview}
                onChange={legal => {
                  const sync = deriveDeedSync(legal, a);
                  const updCustomer = {
                    ...(draft.customer || {}),
                    establishmentActNo: sync.establishmentActNo || draft.customer?.establishmentActNo || '',
                    establishmentDate: sync.establishmentDate || draft.customer?.establishmentDate || '',
                  };
                  if (sync.establishmentActNo) setCustomerDraft((prev: any) => ({...prev, ...updCustomer}));
                  setDraft({
                    ...draft,
                    legal,
                    latestDeedNo: sync.latestDeedNo || draft.latestDeedNo || '',
                    latestDeedDate: sync.latestDeedDate || draft.latestDeedDate || '',
                    experienceYears: sync.experienceYears,
                    experienceMonths: sync.experienceMonths,
                    customer: sync.establishmentActNo ? updCustomer : draft.customer || {},
                  });
                }}
                onStakeholdersChange={(legal, stakeholders) => {
                  const sync = deriveDeedSync(legal, a);
                  const updCustomer = {
                    ...(draft.customer || {}),
                    establishmentActNo: sync.establishmentActNo || draft.customer?.establishmentActNo || '',
                    establishmentDate: sync.establishmentDate || draft.customer?.establishmentDate || '',
                  };
                  if (sync.establishmentActNo) setCustomerDraft((prev: any) => ({...prev, ...updCustomer}));
                  setDraft({
                    ...draft,
                    legal,
                    stakeholders,
                    latestDeedNo: sync.latestDeedNo || draft.latestDeedNo || '',
                    latestDeedDate: sync.latestDeedDate || draft.latestDeedDate || '',
                    experienceYears: sync.experienceYears,
                    experienceMonths: sync.experienceMonths,
                    customer: sync.establishmentActNo ? updCustomer : draft.customer || {},
                  });
                }}
              />
            )}
          </div>
          <div className="form-bottom-actions">
            <div className="form-bottom-left">
              {draft.isNew ? (
                <button type="button" className="button" onClick={onBack}>
                  <ArrowLeft size={15} />
                  Cancel / Return to Workspace
                </button>
              ) : null}
            </div>
            <div className="form-bottom-right">
              {draft.isNew ? (
                <button type="button" className="button primary" disabled={busy} onClick={saveNewApplication}>
                  {busy ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save & Create
                  Application
                </button>
              ) : (
                (tab === 0 || tab === 2 || tab === 3 || tab === 4 || tab === 5) && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={tab === 5 ? () => setSaveConfirm(true) : save}
                  >
                    {busy ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save changes
                  </button>
                )
              )}
              {actions.length > 0 && (
                <div className="workflow-buttons">
                  {actions.map(action => {
                    const isSubmitFap = isFapStage && action === 'SUBMIT_TO_BS';
                    const isActionLocked = (isSubmitFap || action === 'SUBMIT_TO_BS') && isSubmitLocked;
                    return (
                      <button
                        key={action}
                        className={
                          'button ' + (action === 'RETURN' || action === 'REJECT_COMMITTEE' ? '' : 'primary')
                        }
                        disabled={isActionLocked}
                        title={
                          isActionLocked
                            ? 'Please upload the signed FAP Stage document in the Documents tab first to proceed.'
                            : undefined
                        }
                        onClick={() => {
                          if (isSubmitFap) {
                            setSubmitFapConfirm(true);
                          } else {
                            setComments('');
                            setTransition(action);
                            setError('');
                          }
                        }}
                      >
                        {isActionLocked && <Lock size={13} style={{marginRight: 4}} />}
                        {isSubmitFap
                          ? 'Submit'
                          : (
                              {
                                SUBMIT_TO_BS: 'Submit to BS',
                                VERIFY_BS: 'Complete BS verification',
                                START_REVIEW: 'Start CA & Legal review',
                                RECOMMEND_CA: 'Sign off · CA',
                                RECOMMEND_LEGAL: 'Sign off · Legal',
                                APPROVE_COMMITTEE: 'Approve',
                                REJECT_COMMITTEE: 'Reject',
                                RETURN: 'Return',
                              } as any
                            )[action]}
                        {!['RETURN', 'REJECT_COMMITTEE'].includes(action) && <ArrowRight size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {tab === 8 && (
        <PreAnalysisForm
          applicationId={a.id}
          application={a}
          customer={draft.customer}
          pic={draft.pic}
          profile={draft}
          onSaved={(preDiffs?: any[]) => {
            notify('Pre-Analysis saved successfully');
            try {
              const changesToRecord =
                preDiffs && preDiffs.length > 0
                  ? preDiffs
                  : [
                      {
                        section: 'Pre Analysis form',
                        subSection: 'Credit Evaluation & Analyst Remarks',
                        field: 'creditRemarks',
                        label: 'Catatan Analisis Kredit & Mitigasi Risiko',
                        oldValue: 'Drafting initial evaluation',
                        newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.',
                      },
                      {
                        section: 'Pre Analysis form',
                        subSection: 'Facility Structure & Proposed Terms',
                        field: 'proposedTerms',
                        label: 'Verifikasi Syarat Fasilitas Kredit',
                        oldValue: 'Pending term verification',
                        newValue: 'Verified active vs proposed credit facility terms.',
                      },
                    ];

              const snippet = changesToRecord
                .map(
                  (c: any) =>
                    `Bagian ${c.section} › Sub Section "${c.subSection}" › Kolom "${c.label}": diubah dari "${c.oldValue}" menjadi "${c.newValue}"`,
                )
                .join(' | ');

              recordSystemActivity({
                applicationId: a.id,
                fapNumber: a.fapNumber,
                companyName: a.customer?.companyName || draft.customer?.companyName || 'Application',
                section: 'Pre Analysis form',
                tabIndex: 8,
                actionType: 'UPDATE',
                title: `Perubahan Data Pre Analysis form (${changesToRecord.length} kolom)`,
                details: snippet,
                changes: changesToRecord,
                actionBy: user?.name || 'System User',
                userRole: user?.role || 'CA',
              });
            } catch (actErr) {
              console.error('Activity record error:', actErr);
            }
          }}
          notify={notify}
          registerSave={fn => {
            preAnalysisSaveRef.current = fn;
          }}
          onSavingChange={setPreAnalysisSaving}
        />
      )}
      {tab === 6 && (
        <Documents
          a={a}
          user={user}
          onChange={onChange}
          notify={notify}
          filterStage={activeStage}
          onApproveDocument={handleApproveDocument}
          isFapLocked={isFapLocked}
        />
      )}
      {tab === 7 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          <ActivityPage
            activities={applicationActivities}
            readActivityIds={localReadIds}
            onOpen={handleOpenSectionFromActivity}
            onMarkRead={handleMarkAppActivityRead}
            onMarkAllRead={handleMarkAllAppActivitiesRead}
            title="Recent System Activity"
            subtitle={`Live record of application changes, form submissions, and section updates for ${a.fapNumber || liveCompanyName || 'this application'}.`}
            emptyMessage="No activity history for this application yet"
          />
          {a.signoffs && a.signoffs.length > 0 && (
            <section className="panel" style={{padding: '16px 20px', borderRadius: 10}}>
              <h4 style={{margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a'}}>
                Signoff Records
              </h4>
              <div className="signoffs">
                {a.signoffs.map((s: any) => (
                  <div key={s.role}>
                    <CheckCheck size={16} />
                    {s.role} signed off by {s.actor} · {date(s.signed_at)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      {tab > 6 && tab !== 8 && actions.length > 0 && (
        <div className="form-bottom-actions">
          <div className="form-bottom-left"></div>
          <div className="form-bottom-right">
            {actions.length > 0 && (
              <div className="workflow-buttons">
                {actions.map(action => {
                  const isSubmitFap = isFapStage && action === 'SUBMIT_TO_BS';
                  const isActionLocked = (isSubmitFap || action === 'SUBMIT_TO_BS') && isSubmitLocked;
                  return (
                    <button
                      key={action}
                      className={
                        'button ' + (action === 'RETURN' || action === 'REJECT_COMMITTEE' ? '' : 'primary')
                      }
                      disabled={isActionLocked}
                      title={
                        isActionLocked
                          ? 'Please upload the signed FAP Stage document in the Documents tab first to proceed.'
                          : undefined
                      }
                      onClick={() => {
                        if (isSubmitFap) {
                          setSubmitFapConfirm(true);
                        } else {
                          setComments('');
                          setTransition(action);
                          setError('');
                        }
                      }}
                    >
                      {isActionLocked && <Lock size={13} style={{marginRight: 4}} />}
                      {
                        (
                          {
                            SUBMIT_TO_BS: 'Submit',
                            VERIFY_BS: 'Complete BS verification',
                            START_REVIEW: 'Start CA & Legal review',
                            RECOMMEND_CA: 'Sign off · CA',
                            RECOMMEND_LEGAL: 'Sign off · Legal',
                            APPROVE_COMMITTEE: 'Approve',
                            REJECT_COMMITTEE: 'Reject',
                            RETURN: 'Return',
                          } as any
                        )[action]
                      }
                      {!['RETURN', 'REJECT_COMMITTEE'].includes(action) && <ArrowRight size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {reviewDeedId && (
        <DeedReviewDialog
          application={a}
          user={user}
          deedId={reviewDeedId}
          onClose={() => setReviewDeedId(null)}
          onUpdated={onChange}
        />
      )}
      {saveConfirm && (
        <Modal title="Save Legal changes" onClose={() => setSaveConfirm(false)}>
          <div className="modal-body">
            <p>Save deed changes and Stakeholders on this application?</p>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setSaveConfirm(false)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                setSaveConfirm(false);
                save();
              }}
            >
              <Save size={15} />
              Save changes
            </button>
          </div>
        </Modal>
      )}
      {submitFapConfirm && (
        <Modal title="Submit FAP Stage" onClose={() => setSubmitFapConfirm(false)}>
          <div className="modal-body">
            <p className="muted">
              {a.customer?.companyName || draft.customer?.companyName} · {a.fapNumber}
            </p>
            <p>
              Submit FAP Stage data and proceed to <strong>Pre-analysis</strong>?
            </p>
            <p className="muted">
              Once submitted, the Pre-analysis stage (Business & banks, Financial statements, Documents) will
              be unlocked for data entry.
            </p>
            {isSubmitLocked && (
              <div
                className="error"
                style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12}}
              >
                <Lock size={15} />{' '}
                <span>
                  Please upload the signed FAP form document on the Documents tab first to unlock the submit
                  button.
                </span>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setSubmitFapConfirm(false)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || isSubmitLocked} onClick={submitFapStage}>
              {busy ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}Submit to Pre-analysis
            </button>
          </div>
        </Modal>
      )}
      {transition && (
        <Modal title={label(transition)} onClose={() => setTransition('')}>
          <div className="modal-body">
            <p className="muted">
              {a.customer.companyName} · {a.fapNumber}
            </p>
            <p>Required information and documents will be checked before this action is recorded.</p>
            <label>
              Decision notes
              <textarea
                rows={4}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add context for the next reviewer…"
              />
            </label>
            {error && <div className="error">{error}</div>}
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setTransition('')}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  onChange(
                    await api(`/applications/${a.id}/transition`, 'POST', {action: transition, comments}),
                  );
                  setTransition('');
                  notify('Workflow action recorded');
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm {label(transition).toLowerCase()}
            </button>
          </div>
        </Modal>
      )}
      <NibOcrModal
        open={nibOcrOpen}
        onClose={() => setNibOcrOpen(false)}
        onApply={handleApplyNibOcr}
        notify={notify}
      />
      {fapComparisonModal && (
        <FapComparisonModal
          comparison={fapComparisonModal}
          onClose={() => setFapComparisonModal(null)}
          onApprove={handleApproveFapChangesInDetail}
          onCorrect={handleCorrectFapDataInDetail}
          busy={busy}
        />
      )}
      {archiveModalOpen && (
        <FapArchiveModal
          application={a}
          archives={archivesList}
          loading={loadingArchives}
          selectedIndex={selectedArchiveIdx}
          onSelectIndex={setSelectedArchiveIdx}
          onClose={() => setArchiveModalOpen(false)}
          notify={notify}
        />
      )}
    </>
  );
}
