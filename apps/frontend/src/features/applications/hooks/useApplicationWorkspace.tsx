/** All state, derived values and handlers of ApplicationWorkspace; shared with its sections through WorkspaceContext. */
import {getReadActivityIds, getStoredActivities} from '@/features/activity/lib/activity-store';
import {type SystemActivity} from '@/features/activity/lib/types';
import {useApplicationActivity} from '@/features/applications/hooks/useApplicationActivity';
import {useCustomerDetailSubmit} from '@/features/applications/hooks/useCustomerDetailSubmit';
import {useDeedReview} from '@/features/applications/hooks/useDeedReview';
import {useFapApproval} from '@/features/applications/hooks/useFapApproval';
import {useFapArchive} from '@/features/applications/hooks/useFapArchive';
import {useFapPreviewSync} from '@/features/applications/hooks/useFapPreviewSync';
import {useLiveFapData} from '@/features/applications/hooks/useLiveFapData';
import {useNewApplication} from '@/features/applications/hooks/useNewApplication';
import {useNibOcr} from '@/features/applications/hooks/useNibOcr';
import {usePrintFap} from '@/features/applications/hooks/usePrintFap';
import {useSaveApplication} from '@/features/applications/hooks/useSaveApplication';
import {useStageSync} from '@/features/applications/hooks/useStageSync';
import {useWorkspaceAccess} from '@/features/applications/hooks/useWorkspaceAccess';
import {initDraftBase} from '@/features/applications/lib/financing-proposal';
import {
  applyMasterCustomerToDraft,
  clearMasterCustomerFromDraft,
  emptyCustomerRecord,
  sanitizeCustomerForDraft,
} from '@/features/applications/lib/master-customer-fill';
import {draftFromApplication} from '@/features/applications/lib/workspace/draft-from-application';
import {calculateInstallment} from '@/features/applications/lib/workspace/loan-calc';
import {initialStage, isPreAnalysisApplication} from '@/features/applications/lib/workspace/stage';
import {useMasterData} from '@/shared/master-data';
import {blank, customerFields, proposalFields} from '@liugong/shared';
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

/** Customer fields of the FAP form (section 02). */
const FAP_CUSTOMER_KEYS = [
  'companyName',
  'companyType',
  'nib',
  'nibDate',
  'npwp',
  'establishmentActNo',
  'establishmentDate',
];

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

  // Customer being worked on
  const [customerCategory, setCustomerCategory] = useState<string>(
    () => a.customerCategory || a.customerStatus || (a.isNew ? 'NEW' : a.customerId ? 'EXISTING' : 'NEW'),
  );
  const [customerId, setCustomerId] = useState<string>(() =>
    a.isNew ? a.customerId || '' : a.customerId || a.customer_id || a.customer?.id || '',
  );
  const [customerDraft, setCustomerDraft] = useState<any>(() =>
    a.customer ? sanitizeCustomerForDraft(structuredClone(a.customer)) : emptyCustomerRecord(),
  );
  const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
  const fapCustomerFields = customerFields.filter(f => FAP_CUSTOMER_KEYS.includes(f.key));

  // Stage, tab and the draft being edited
  const isPreAnalysis = isPreAnalysisApplication(a);
  const resolvedInitialTab = initialTab === 0 && isPreAnalysis ? 8 : (initialTab ?? 0);
  const [activeStage, setActiveStage] = useState<string>(() => initialStage(a));
  const [submitFapConfirm, setSubmitFapConfirm] = useState(false);
  const [reviewDeedId, setReviewDeedId] = useState<string | null>(null);
  // "Edit" asked from the review dialog: the Legal editor opens that deed (or its stakeholder list)
  const [editRequest, setEditRequest] = useState<{id: string; what: 'deed' | 'stakeholders'} | null>(null);
  // The review dialog stays mounted (comments typed, scroll) but hidden while the editor is on screen
  const [reviewHidden, setReviewHidden] = useState(false);
  const [tab, setTab] = useState(resolvedInitialTab),
    [draft, setDraft] = useState<any>(() => initDraftBase(a)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [transition, setTransition] = useState(''),
    [comments, setComments] = useState(''),
    [saveConfirm, setSaveConfirm] = useState(false),
    [sideBySide, setSideBySide] = useState(true);

  useStageSync({a, draft, tab, setTab, setActiveStage, initialTab});

  function changeCategory(value: string) {
    setCustomerCategory(value);
    setError('');
    if (value === 'NEW' && draft.isNew) {
      setCustomerId('');
      setCustomerDraft(emptyCustomerRecord());
      setDraft((prev: any) => clearMasterCustomerFromDraft(prev, 'NEW'));
    } else {
      setDraft((prev: any) => ({...prev, customerStatus: value, customerCategory: value}));
    }
  }

  function selectExistingCustomer(customer: any | null) {
    setError('');
    if (!customer) {
      setCustomerId('');
      setCustomerDraft(emptyCustomerRecord());
      setDraft((prev: any) => clearMasterCustomerFromDraft(prev, customerCategory));
      return;
    }
    setCustomerCategory('EXISTING');
    setCustomerId(customer.id);
    setCustomerDraft(sanitizeCustomerForDraft(customer));
    setDraft((prev: any) => applyMasterCustomerToDraft(customer, prev));
  }

  const {nibOcrOpen, setNibOcrOpen, handleApplyNibOcr} = useNibOcr({
    master,
    customerCategory,
    setCustomerCategory,
    setCustomerDraft,
    setDraft,
  });

  // Live document sync
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'fap-preview-sec-header': true,
    'fap-preview-sec-company': true,
    'fap-preview-sec-business': true,
    'fap-preview-sec-pic': true,
    'fap-preview-sec-purpose-assets': true,
    'fap-preview-sec-projects': true,
    'fap-preview-sec-banks': true,
    'fap-preview-sec-proposal': true,
    'fap-preview-sec-financial': true,
  });
  const [activeSyncSection, setActiveSyncSection] = useState<string>('fap-preview-sec-header');
  const [activeSyncField, setActiveSyncField] = useState<string | null>(null);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const {
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
  } = useFapPreviewSync({
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
  });

  const handlePreviewSectionClick = (secId: string) => {
    handleTriggerSync(secId);
    setOpenSections(prev => ({...prev, [secId]: true}));
    const formTarget = document.getElementById('acc-' + secId);
    if (formTarget) {
      formTarget.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  };

  const [fapComparisonModal, setFapComparisonModal] = useState<any>(null);
  const [customerDetailLocked, setCustomerDetailLocked] = useState<boolean>(false);
  const archive = useFapArchive({a, notify});

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
    setDraft(draftFromApplication(a));
    if (a.customer) {
      setCustomerDraft(sanitizeCustomerForDraft(structuredClone(a.customer)));
    }
    const nextCustId = a.isNew ? a.customerId || '' : a.customerId || a.customer_id || a.customer?.id || '';
    setCustomerId(nextCustId);
    setCustomerCategory(
      a.customerCategory || a.customerStatus || (a.isNew ? 'NEW' : a.customerId ? 'EXISTING' : 'NEW'),
    );
  }, [a]);

  const access = useWorkspaceAccess({a, user, draft, activeStage, tab, setTab});

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
    isPreAnalysisReached: access.isPreAnalysisReached,
    localActivities,
    setLocalActivities,
    setLocalReadIds,
    a,
    notify,
  });

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

  const {handlePrintFap} = usePrintFap({a, draft, tab, notify, setBusy, save});

  const newApplication = useNewApplication({
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
    canEdit: access.canEdit,
    canFinance: access.canFinance,
    setBusy,
    setError,
    setTab,
    onChange,
    onCustomerCreated,
    notify,
  });

  const approval = useFapApproval({
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
  });

  const {submitCustomerDetail} = useCustomerDetailSubmit({
    a,
    draft,
    customerDraft,
    customerCategory,
    selectedCustomer,
    liveCompanyName,
    liveNib,
    liveNpwp,
    liveEstablishmentActNo,
    onChange,
    notify,
    setBusy,
    setError,
    setDraft,
    setTab,
    setCustomerDetailLocked,
  });

  const p = draft.proposal || {...blank(proposalFields), units: []};
  const {principal, r, monthly} = calculateInstallment(p, master);

  const {beginDeedReview} = useDeedReview({
    setReviewDeedId,
    tab,
    draft,
    setDraft,
    setBusy,
    setError,
    canLegal: access.canLegal,
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
    sanitizeCustomer: sanitizeCustomerForDraft,
    customerDraft,
    setCustomerDraft,
    nibOcrOpen,
    setNibOcrOpen,
    handleApplyNibOcr,
    selectedCustomer,
    selectExistingCustomer,
    fapCustomerKeys: FAP_CUSTOMER_KEYS,
    fapCustomerFields,
    changeCategory,
    saveNewApplication: newApplication.saveNewApplication,
    preAnalysisDraft: newApplication.preAnalysisDraft,
    setPreAnalysisDraft: newApplication.setPreAnalysisDraft,
    assignedPreAnalysisNo: newApplication.assignedPreAnalysisNo,
    isPreAnalysis,
    resolvedInitialTab,
    activeStage,
    setActiveStage,
    submitFapConfirm,
    setSubmitFapConfirm,
    reviewDeedId,
    setReviewDeedId,
    editRequest,
    setEditRequest,
    reviewHidden,
    setReviewHidden,
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
    scrollToFormElement,
    handlePreviewCellClick,
    formColumnHandlers,
    targetProjectRow,
    setTargetProjectRow,
    targetBankRow,
    setTargetBankRow,
    financialActiveIndex,
    setFinancialActiveIndex,
    fapComparisonModal,
    setFapComparisonModal,
    handlePrintFap,
    customerDetailLocked,
    setCustomerDetailLocked,
    ...archive,
    handleApproveDocument: approval.handleApproveDocument,
    handleApproveFapChangesInDetail: approval.handleApproveFapChangesInDetail,
    handleCorrectFapDataInDetail: approval.handleCorrectFapDataInDetail,
    submitCustomerDetail,
    liveCompanyName,
    liveCompanyType,
    liveNib,
    liveNpwp,
    liveEstablishmentActNo,
    liveEstablishmentDate,
    liveNibDate,
    liveDetailFapData,
    ...access,
    submitFapStage: approval.submitFapStage,
    localActivities,
    setLocalActivities,
    localReadIds,
    setLocalReadIds,
    applicationActivities,
    handleMarkAppActivityRead,
    handleMarkAllAppActivitiesRead,
    handleOpenSectionFromActivity,
    save,
    p,
    principal,
    r,
    monthly,
    beginDeedReview,
  };
}
