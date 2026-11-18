import {useCanManageMasterData} from '@/features/master-data/hooks/useCanManageMasterData';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Edit2,
  FileCheck2,
  FileText,
  FolderPlus,
  GitBranch,
  Layers,
  MoveRight,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {useMandatoryRules} from '@/shared/master-data';
import {useEffect, useState} from 'react';

// =============================================================================
// INTERFACES & DATA MODELS (ALIGNED WITH CRM MODULAR DATABASE DESIGN V3.0)
// =============================================================================

export interface WorkflowComponentItem {
  id: string;
  code: string;
  name: string;
  domain: 'MARKETING' | 'CREDIT_RISK' | 'LEGAL' | 'COMMITTEE' | 'OPERATIONS' | 'CUSTOM';
  targetTables?: string;
  description?: string;
  allowConcurrentEdit?: boolean;
}

export interface StageDocumentRequirement {
  id: string;
  code: string;
  name: string;
  category: 'LEGAL' | 'COMMERCIAL' | 'FINANCIAL' | 'TECHNICAL' | 'RISK';
  canUpload: boolean;
  isMandatory: boolean;
}

export interface StageMandatoryColumnItem {
  id: string;
  submoduleId: string;
  submoduleCode?: string;
  submoduleName?: string;
  sectionName: string;
  columnKey: string;
  columnLabel: string;
  isMandatory: boolean;
}

export interface WorkflowStageBox {
  id: string;
  code: string;
  name: string;
  sequence: number;
  executionMode: 'PARALLEL' | 'SEQUENTIAL';
  passGateRule: 'ALL_COMPLETED' | 'ANY_COMPLETED';
  requiredRole: string;
  departmentId?: number | null;
  departmentCode?: string;
  departmentName?: string;
  assignedUserId?: number | null;
  assignedUserName?: string;
  slaDays?: number;
  componentIds: string[]; // List of component IDs assigned to this stage
  color: string;
  documents?: StageDocumentRequirement[];
  mandatoryColumns?: StageMandatoryColumnItem[];
}

export interface WorkflowTypeItem {
  id: string;
  code: string;
  name: string;
  version: number;
  description: string;
  isDefault: boolean;
  isActive: boolean; // Soft-delete flag (1 = Active, 0 = Soft Deleted)
  stages: WorkflowStageBox[];
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// DEFAULT INITIAL DATA PRESETS
// =============================================================================

const DEFAULT_DEPARTMENTS = [
  {dept_id: 1, department_code: 'HR', department_name: 'Human Resources'},
  {dept_id: 2, department_code: 'CA', department_name: 'Credit Analyst'},
  {dept_id: 3, department_code: 'RISK_MGT', department_name: 'Risk Management'},
  {dept_id: 4, department_code: 'AML', department_name: 'Anti-Money Laundering'},
  {dept_id: 5, department_code: 'QA', department_name: 'Quality Assurance'},
  {dept_id: 6, department_code: 'BP', department_name: 'Business Partner'},
  {dept_id: 7, department_code: 'DS', department_name: 'Decision Support'},
  {dept_id: 8, department_code: 'MARKETING', department_name: 'Marketing & Commercial'},
  {dept_id: 9, department_code: 'LEGAL_COMP', department_name: 'Legal Compliance'},
  {dept_id: 10, department_code: 'LEGAL_BIZ', department_name: 'Legal Business'},
  {dept_id: 11, department_code: 'INTERNAL_AUDIT', department_name: 'Internal Audit'},
  {dept_id: 12, department_code: 'IT', department_name: 'IT Department'},
  {dept_id: 13, department_code: 'FIN_ANALYST', department_name: 'Finance Analyst'},
  {dept_id: 14, department_code: 'ACCOUNTING', department_name: 'Accounting & Tax'},
];

const DEFAULT_COMPONENTS_POOL: WorkflowComponentItem[] = [
  {
    id: 'comp-fap',
    code: 'FAP_STAGE',
    name: 'FAP Stage (Customer & Unit Profiling)',
    domain: 'MARKETING',
    targetTables: 'crm_fap_application_profiles, crm_fap_equipment_units',
    description: 'Debtor profiling, PIC details, heavy equipment financing simulation, and survey attachments.',
    allowConcurrentEdit: true,
  },
  {
    id: 'comp-prean',
    code: 'PRE_ANALYSIS',
    name: 'Pre-Analysis (Bowheer & SLIK OJK)',
    domain: 'MARKETING',
    targetTables: 'crm_pre_analysis_forms, crm_pre_analysis_slik_reviews',
    description: 'Mining project bowheer investigation, job scope, UBO structure, and OJK SLIK credit check.',
    allowConcurrentEdit: true,
  },
  {
    id: 'comp-iclf',
    code: 'ICLF',
    name: 'ICLF (Credit Committee & Risk Review)',
    domain: 'COMMITTEE',
    targetTables: 'crm_application_approvals, crm_fap_financial_statements',
    description: 'Financial ratio analysis, fiduciary legal opinion, and executive credit committee e-voting session.',
    allowConcurrentEdit: false,
  },
  {
    id: 'comp-ca',
    code: 'CA_REVIEW',
    name: 'Credit Analyst Risk Memo (DSCR)',
    domain: 'CREDIT_RISK',
    targetTables: 'crm_application_signoffs',
    description: 'Debt Service Coverage Ratio (DSCR >= 1.25x) calculation and credit ceiling recommendation.',
    allowConcurrentEdit: false,
  },
  {
    id: 'comp-legal',
    code: 'LEGAL_REVIEW',
    name: 'Legal Deed & Fiduciary Opinion',
    domain: 'LEGAL',
    targetTables: 'crm_fap_legal_deeds, crm_fap_legal_deed_reviews',
    description: 'Verification of notary deeds, Ministry of Law approvals, and fiduciary agreements.',
    allowConcurrentEdit: false,
  },
  {
    id: 'comp-survey',
    code: 'FIELD_SURVEY',
    name: 'Field Survey & GPS Investigation',
    domain: 'OPERATIONS',
    targetTables: 'crm_application_document_files',
    description: 'On-site physical inspection at mine/plantation site and equipment chassis serial number verification.',
    allowConcurrentEdit: false,
  },
];

const DEFAULT_STAGE_DOCS_MKT: StageDocumentRequirement[] = [
  {id: 'doc-ktp', code: 'DOC_LEGAL_KTP_NPWP', name: 'Board of Directors Identity Card & Tax ID (KTP/NPWP)', category: 'LEGAL', canUpload: true, isMandatory: true},
  {id: 'doc-akta', code: 'DOC_LEGAL_AKTA', name: 'Deed of Establishment & Articles of Association', category: 'LEGAL', canUpload: true, isMandatory: true},
  {id: 'doc-spk', code: 'DOC_PREAN_CONTRACT', name: 'Cooperation Agreement / Bowheer Work Order (SPK)', category: 'COMMERCIAL', canUpload: true, isMandatory: true},
  {id: 'doc-slik', code: 'DOC_PREAN_SLIK', name: 'Debtor SLIK OJK Credit Bureau Report', category: 'RISK', canUpload: true, isMandatory: true},
  {id: 'doc-po', code: 'DOC_UNIT_PO', name: 'Unit Quotation Letter / Purchase Order (PO)', category: 'COMMERCIAL', canUpload: true, isMandatory: false},
];

const DEFAULT_STAGE_DOCS_ICLF: StageDocumentRequirement[] = [
  {id: 'doc-fin-audit', code: 'DOC_FIN_AUDITED_REPORT', name: 'Audited Financial Statements (Last 2 Years)', category: 'FINANCIAL', canUpload: true, isMandatory: true},
  {id: 'doc-bank', code: 'DOC_FIN_BANK_STATEMENT', name: 'Bank Account Statements (Last 6 Months)', category: 'FINANCIAL', canUpload: true, isMandatory: true},
  {id: 'doc-legal-op', code: 'DOC_LEGAL_OPINION', name: 'Legal Due Diligence & Collateral Deed Opinion', category: 'LEGAL', canUpload: true, isMandatory: true},
];

const DEFAULT_MANDATORY_COLS_MKT: StageMandatoryColumnItem[] = [
  {id: 'mand-1', submoduleId: 'comp-fap', sectionName: 'Debtor Profile', columnKey: 'customer_name', columnLabel: 'Company Debtor Legal Name', isMandatory: true},
  {id: 'mand-2', submoduleId: 'comp-fap', sectionName: 'Debtor Profile', columnKey: 'npwp_number', columnLabel: 'Tax ID Number (NPWP)', isMandatory: true},
  {id: 'mand-3', submoduleId: 'comp-fap', sectionName: 'Equipment Unit', columnKey: 'unit_model', columnLabel: 'Heavy Equipment Unit Model / Type', isMandatory: true},
  {id: 'mand-4', submoduleId: 'comp-fap', sectionName: 'Loan Simulation', columnKey: 'down_payment_pct', columnLabel: 'Down Payment (DP %)', isMandatory: true},
  {id: 'mand-5', submoduleId: 'comp-prean', sectionName: 'Bowheer Info', columnKey: 'bowheer_name', columnLabel: 'Mining Bowheer Company Name', isMandatory: true},
  {id: 'mand-6', submoduleId: 'comp-prean', sectionName: 'Project Info', columnKey: 'contract_value', columnLabel: 'Bowheer Project Contract Value', isMandatory: true},
];

const DEFAULT_MANDATORY_COLS_ICLF: StageMandatoryColumnItem[] = [
  {id: 'mand-7', submoduleId: 'comp-iclf', submoduleCode: 'ICLF', submoduleName: 'ICLF (Credit Committee & Risk Review)', sectionName: 'Credit Committee', columnKey: 'dscr_ratio', columnLabel: 'DSCR (Debt Service Coverage Ratio)', isMandatory: true},
  {id: 'mand-8', submoduleId: 'comp-iclf', submoduleCode: 'ICLF', submoduleName: 'ICLF (Credit Committee & Risk Review)', sectionName: 'Credit Committee', columnKey: 'interest_rate_effective', columnLabel: 'Effective Interest Rate (% p.a.)', isMandatory: true},
  {id: 'mand-9', submoduleId: 'comp-iclf', submoduleCode: 'ICLF', submoduleName: 'ICLF (Credit Committee & Risk Review)', sectionName: 'Credit Committee', columnKey: 'approval_decision', columnLabel: 'Credit Committee Resolution Verdict', isMandatory: true},
];

export function buildDefaultMandatoryColumnsForSingleComponent(
  comp: WorkflowComponentItem | undefined,
  masterRules: any[],
): StageMandatoryColumnItem[] {
  if (!comp) return [];
  const compCode = (comp.code || '').toUpperCase();
  const compId = comp.id;
  const compName = comp.name;

  // 1. FAP Stage (161 fields in master rules)
  if (compCode === 'FAP_STAGE' || compId === 'comp-fap' || compCode.includes('FAP')) {
    const fapRules = (masterRules || []).filter(r => (r.stage || 'FAP').toUpperCase() === 'FAP');
    if (fapRules.length > 0) {
      return fapRules.map((r, idx) => ({
        id: `mand-fap-${r.id || idx}`,
        submoduleId: compId,
        submoduleCode: 'FAP_STAGE',
        submoduleName: compName || 'FAP Stage (Customer & Unit Profiling)',
        sectionName: r.section || 'General',
        columnKey: r.field_key,
        columnLabel: r.field_label || r.field_key,
        isMandatory: Boolean(r.mandatory),
      }));
    }
    return DEFAULT_MANDATORY_COLS_MKT.filter(c => c.submoduleId === 'comp-fap').map(c => ({
      ...c,
      submoduleId: compId,
      submoduleCode: 'FAP_STAGE',
      submoduleName: compName || 'FAP Stage (Customer & Unit Profiling)',
    }));
  }

  // 2. Pre-Analysis (42 fields in master rules)
  if (compCode === 'PRE_ANALYSIS' || compId === 'comp-prean' || compCode.includes('PRE')) {
    const preRules = (masterRules || []).filter(r => {
      const stg = String(r.stage || '').toUpperCase();
      return stg === 'PRE-AN' || stg === 'PRE' || stg === 'PRE_ANALYSIS';
    });
    if (preRules.length > 0) {
      return preRules.map((r, idx) => ({
        id: `mand-pre-${r.id || idx}`,
        submoduleId: compId,
        submoduleCode: 'PRE_ANALYSIS',
        submoduleName: compName || 'Pre-Analysis (Bowheer & SLIK OJK)',
        sectionName: r.section || 'General Information',
        columnKey: r.field_key,
        columnLabel: r.field_label || r.field_key,
        isMandatory: Boolean(r.mandatory),
      }));
    }
    return DEFAULT_MANDATORY_COLS_MKT.filter(c => c.submoduleId === 'comp-prean').map(c => ({
      ...c,
      submoduleId: compId,
      submoduleCode: 'PRE_ANALYSIS',
      submoduleName: compName || 'Pre-Analysis (Bowheer & SLIK OJK)',
    }));
  }

  // 3. ICLF Fallback
  if (compCode === 'ICLF' || compId === 'comp-iclf') {
    return DEFAULT_MANDATORY_COLS_ICLF.map(col => ({
      ...col,
      submoduleId: compId,
      submoduleCode: 'ICLF',
      submoduleName: compName || 'ICLF (Credit Committee & Risk Review)',
    }));
  }

  // 4. CA_REVIEW Fallback
  if (compCode === 'CA_REVIEW' || compId === 'comp-ca') {
    return [
      {
        id: `mand-ca-1`,
        submoduleId: compId,
        submoduleCode: 'CA_REVIEW',
        submoduleName: compName || 'Credit Analyst Risk Memo (DSCR)',
        sectionName: 'Credit Analysis',
        columnKey: 'dscr_calculation',
        columnLabel: 'DSCR Calculation Sheet',
        isMandatory: true,
      },
      {
        id: `mand-ca-2`,
        submoduleId: compId,
        submoduleCode: 'CA_REVIEW',
        submoduleName: compName || 'Credit Analyst Risk Memo (DSCR)',
        sectionName: 'Credit Analysis',
        columnKey: 'risk_mitigation_note',
        columnLabel: 'Risk Mitigation Memo',
        isMandatory: true,
      },
    ];
  }

  // 5. LEGAL_REVIEW Fallback
  if (compCode === 'LEGAL_REVIEW' || compId === 'comp-legal') {
    return [
      {
        id: `mand-leg-1`,
        submoduleId: compId,
        submoduleCode: 'LEGAL_REVIEW',
        submoduleName: compName || 'Legal Deed & Fiduciary Opinion',
        sectionName: 'Legal Verification',
        columnKey: 'notary_deed_verified',
        columnLabel: 'Notary Deed Verification Note',
        isMandatory: true,
      },
      {
        id: `mand-leg-2`,
        submoduleId: compId,
        submoduleCode: 'LEGAL_REVIEW',
        submoduleName: compName || 'Legal Deed & Fiduciary Opinion',
        sectionName: 'Legal Verification',
        columnKey: 'fiduciary_registration',
        columnLabel: 'Fiduciary Deed Registration Status',
        isMandatory: true,
      },
    ];
  }

  // 6. FIELD_SURVEY Fallback
  if (compCode === 'FIELD_SURVEY' || compId === 'comp-survey') {
    return [
      {
        id: `mand-surv-1`,
        submoduleId: compId,
        submoduleCode: 'FIELD_SURVEY',
        submoduleName: compName || 'Field Survey & GPS Investigation',
        sectionName: 'Survey Investigation',
        columnKey: 'gps_coordinate_verified',
        columnLabel: 'GPS Coordinates & Site Geofence',
        isMandatory: true,
      },
      {
        id: `mand-surv-2`,
        submoduleId: compId,
        submoduleCode: 'FIELD_SURVEY',
        submoduleName: compName || 'Field Survey & GPS Investigation',
        sectionName: 'Survey Investigation',
        columnKey: 'unit_chassis_sn_match',
        columnLabel: 'Equipment Serial Number Match',
        isMandatory: true,
      },
    ];
  }

  return [];
}

const DEFAULT_WORKFLOW_REGISTRY: WorkflowTypeItem[] = [
  {
    id: 'wf-001',
    code: 'WF-001',
    name: 'Standard Heavy Equipment Financing (Dual-Stage)',
    version: 1,
    description: 'Standard LiuGong financing pipeline. Stage 1 executes FAP and Pre-Analysis concurrently (MKT_STAGE), followed by Head Office Credit Committee review (ICLF).',
    isDefault: true,
    isActive: true,
    stages: [
      {
        id: 'stg-mkt',
        code: 'MKT_STAGE',
        name: 'Marketing Dual-Stage (MKT)',
        sequence: 1,
        executionMode: 'PARALLEL',
        passGateRule: 'ALL_COMPLETED',
        requiredRole: 'Branch Manager (BM)',
        departmentId: 8,
        departmentCode: 'MARKETING',
        departmentName: 'Marketing & Commercial',
        assignedUserId: null,
        slaDays: 3,
        componentIds: ['comp-fap', 'comp-prean'],
        color: '#2563EB',
        documents: DEFAULT_STAGE_DOCS_MKT,
        mandatoryColumns: DEFAULT_MANDATORY_COLS_MKT,
      },
      {
        id: 'stg-iclf',
        code: 'ICLF',
        name: 'ICLF Stage (Komite Pusat)',
        sequence: 2,
        executionMode: 'SEQUENTIAL',
        passGateRule: 'ALL_COMPLETED',
        requiredRole: 'ICLF Committee (Direksi)',
        departmentId: 3,
        departmentCode: 'RISK_MGT',
        departmentName: 'Risk Management',
        assignedUserId: null,
        slaDays: 5,
        componentIds: ['comp-iclf'],
        color: '#7C3AED',
        documents: DEFAULT_STAGE_DOCS_ICLF,
        mandatoryColumns: DEFAULT_MANDATORY_COLS_ICLF,
      },
    ],
    createdAt: '2026-11-16 09:00:00',
    updatedAt: '2026-11-17 08:00:00',
  },
  {
    id: 'wf-002',
    code: 'WF-002',
    name: 'Fast-Track Repeat Order Financing (Single-Gate)',
    version: 1,
    description: 'Express pipeline for repeat-order borrowers with prime credit records and ceiling ≤ IDR 2 Billion. All verifications execute concurrently under a single gate.',
    isDefault: false,
    isActive: true,
    stages: [
      {
        id: 'stg-fasttrack',
        code: 'FAST_TRACK_STAGE',
        name: 'Fast-Track Collaborative Review',
        sequence: 1,
        executionMode: 'PARALLEL',
        passGateRule: 'ALL_COMPLETED',
        requiredRole: 'Commercial Credit Head',
        departmentId: 8,
        departmentCode: 'MARKETING',
        departmentName: 'Marketing & Commercial',
        assignedUserId: null,
        slaDays: 2,
        componentIds: ['comp-fap', 'comp-prean', 'comp-ca', 'comp-legal'],
        color: '#059669',
        documents: [...DEFAULT_STAGE_DOCS_MKT, ...DEFAULT_STAGE_DOCS_ICLF],
        mandatoryColumns: [...DEFAULT_MANDATORY_COLS_MKT, ...DEFAULT_MANDATORY_COLS_ICLF],
      },
    ],
    createdAt: '2026-11-16 11:30:00',
    updatedAt: '2026-11-16 11:30:00',
  },
  {
    id: 'wf-003',
    code: 'WF-003',
    name: 'Independent Pre-Analysis (Risk-First Pipeline)',
    version: 1,
    description: 'Pipeline separating Pre-Analysis from Marketing into an independent gate prior to physical survey and Credit Committee review.',
    isDefault: false,
    isActive: true,
    stages: [
      {
        id: 'stg-fap-only',
        code: 'FAP_STAGE',
        name: 'Commercial & Unit Profiling',
        sequence: 1,
        executionMode: 'SEQUENTIAL',
        passGateRule: 'ALL_COMPLETED',
        requiredRole: 'Sales Manager',
        departmentId: 8,
        departmentCode: 'MARKETING',
        departmentName: 'Marketing & Commercial',
        assignedUserId: null,
        slaDays: 2,
        componentIds: ['comp-fap'],
        color: '#2563EB',
        documents: DEFAULT_STAGE_DOCS_MKT.slice(0, 3),
        mandatoryColumns: DEFAULT_MANDATORY_COLS_MKT.slice(0, 4),
      },
      {
        id: 'stg-preana-only',
        code: 'PRE_ANALYSIS_STAGE',
        name: 'Bowheer & Mine Project Risk Investigation',
        sequence: 2,
        executionMode: 'SEQUENTIAL',
        passGateRule: 'ALL_COMPLETED',
        requiredRole: 'Risk Officer',
        departmentId: 3,
        departmentCode: 'RISK_MGT',
        departmentName: 'Risk Management',
        assignedUserId: null,
        slaDays: 3,
        componentIds: ['comp-prean'],
        color: '#D97706',
        documents: DEFAULT_STAGE_DOCS_MKT.slice(2),
        mandatoryColumns: DEFAULT_MANDATORY_COLS_MKT.slice(4),
      },
      {
        id: 'stg-iclf-ind',
        code: 'ICLF_STAGE',
        name: 'Central Credit Committee & Legal Opinion',
        sequence: 3,
        executionMode: 'SEQUENTIAL',
        passGateRule: 'ALL_COMPLETED',
        requiredRole: 'ICLF Committee (Direksi)',
        departmentId: 7,
        departmentCode: 'DS',
        departmentName: 'Decision Support',
        assignedUserId: null,
        slaDays: 4,
        componentIds: ['comp-iclf', 'comp-ca', 'comp-legal'],
        color: '#7C3AED',
        documents: DEFAULT_STAGE_DOCS_ICLF,
        mandatoryColumns: DEFAULT_MANDATORY_COLS_ICLF,
      },
    ],
    createdAt: '2026-11-16 14:00:00',
    updatedAt: '2026-11-16 14:00:00',
  },
];

const STORAGE_KEY_REGISTRY = 'liugong_crm_modular_workflow_registry_v4';
const STORAGE_KEY_POOL = 'liugong_crm_modular_components_pool_v3';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WorkflowConfigurationView({canManage = true}: {canManage?: boolean}) {
  // Navigation State: 'GALLERY' (Tampilan Luar Box-Box) | 'EDITOR' (Tampilan Edit Stage & Sub-Modul)
  const [currentView, setCurrentView] = useState<'GALLERY' | 'EDITOR'>('GALLERY');
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('wf-001');

  // Master Mandatory Rules fetched from crm_master_field_mandatory_rules
  const masterRules = useMandatoryRules();

  // Toggle to show/hide soft-deleted workflows
  const [showInactiveWorkflows, setShowInactiveWorkflows] = useState(true);

  // 1. Workflows Registry State
  const [workflows, setWorkflows] = useState<WorkflowTypeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REGISTRY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_WORKFLOW_REGISTRY;
    } catch {
      return DEFAULT_WORKFLOW_REGISTRY;
    }
  });

  // 2. Components Pool State
  const [componentPool, setComponentPool] = useState<WorkflowComponentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POOL);
      return saved ? JSON.parse(saved) : DEFAULT_COMPONENTS_POOL;
    } catch {
      return DEFAULT_COMPONENTS_POOL;
    }
  });

  // Active Selected Workflow Object for Editor
  const currentWorkflow = workflows.find(w => w.id === activeWorkflowId) || workflows[0];
  const stages = currentWorkflow ? currentWorkflow.stages : [];

  // Dialog & Modal States
  const [showAddWorkflowModal, setShowAddWorkflowModal] = useState(false);
  const [showEditWorkflowModal, setShowEditWorkflowModal] = useState(false);
  const [editingWorkflowTarget, setEditingWorkflowTarget] = useState<WorkflowTypeItem | null>(null);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [inspectingStageDetails, setInspectingStageDetails] = useState<WorkflowStageBox | null>(null);

  // Stage Gate Rules Modal Filter & Search States
  const [modalSubmoduleFilter, setModalSubmoduleFilter] = useState<string>('ALL');
  const [modalStatusFilter, setModalStatusFilter] = useState<'ALL' | 'MANDATORY' | 'OPTIONAL'>('ALL');
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  // Reset modal filters on opening another stage
  useEffect(() => {
    setModalSubmoduleFilter('ALL');
    setModalStatusFilter('ALL');
    setModalSearchQuery('');
  }, [inspectingStageDetails?.id]);

  // Form states for New Workflow
  const [newWfName, setNewWfName] = useState('');
  const [newWfCode, setNewWfCode] = useState('');
  const [newWfDesc, setNewWfDesc] = useState('');
  const [newWfTemplate, setNewWfTemplate] = useState<'BLANK' | 'DUAL_STAGE' | 'SINGLE_GATE'>('DUAL_STAGE');

  // Form states for Edit Workflow
  const [editWfName, setEditWfName] = useState('');
  const [editWfCode, setEditWfCode] = useState('');
  const [editWfDesc, setEditWfDesc] = useState('');
  const [editWfIsDefault, setEditWfIsDefault] = useState(false);

  // Form states for New Stage
  const [newStageName, setNewStageName] = useState('');
  const [newStageCode, setNewStageCode] = useState('');
  const [newStageMode, setNewStageMode] = useState<'PARALLEL' | 'SEQUENTIAL'>('PARALLEL');
  const [newStageRole, setNewStageRole] = useState('Branch Manager (BM)');
  const [newStageSla, setNewStageSla] = useState(3);

  // Form states for New Component
  const [newCompName, setNewCompName] = useState('');
  const [newCompCode, setNewCompCode] = useState('');
  const [newCompDomain, setNewCompDomain] = useState<WorkflowComponentItem['domain']>('MARKETING');
  const [newCompTables, setNewCompTables] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompConcurrent, setNewCompConcurrent] = useState(true);

  // Inline editing state for stage title
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineTitleValue, setInlineTitleValue] = useState('');

  // Toast
  const [toast, setToast] = useState('');

  // Approver lookup from User Management API
  const [lookupDepartments, setLookupDepartments] = useState<Array<{dept_id: number; department_code: string; department_name: string}>>(DEFAULT_DEPARTMENTS);
  const [lookupUsers, setLookupUsers] = useState<Array<{id: number; username: string; full_name: string; dept_id: number | null; position: string}>>([]);

  // Approver Modal States
  const [approverModalStage, setApproverModalStage] = useState<WorkflowStageBox | null>(null);
  const [approverDeptId, setApproverDeptId] = useState<number | null>(8);
  const [approverTargetType, setApproverTargetType] = useState<'DEPT_POOL' | 'SPECIFIC_USER'>('DEPT_POOL');
  const [approverUserId, setApproverUserId] = useState<number | null>(null);
  const [approverRoleAlias, setApproverRoleAlias] = useState<string>('');

  // New stage form additional state
  const [newStageDeptId, setNewStageDeptId] = useState<number>(8);

  useEffect(() => {
    fetch('/api/v1/workflow-approvers')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.departments?.length) setLookupDepartments(data.departments);
        if (data?.users?.length) setLookupUsers(data.users);
      })
      .catch(err => {
        console.warn('Approvers lookup fallback to preset', err);
      });
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(workflows));
      localStorage.setItem(STORAGE_KEY_POOL, JSON.stringify(componentPool));
    } catch (e) {
      console.error('Failed to save workflow state to localStorage', e);
    }
  }, [workflows, componentPool]);

  // Synchronize master rules with stage mandatory columns if stages have legacy or unpopulated rules
  useEffect(() => {
    if (!masterRules || masterRules.length === 0) return;
    setWorkflows(prevWfs => {
      let anyChanged = false;
      const updatedWfs = prevWfs.map(wf => {
        let wfChanged = false;
        const updatedStages = wf.stages.map(stg => {
          const isLegacyOrEmpty = !stg.mandatoryColumns || stg.mandatoryColumns.length <= 6;
          if (stg.componentIds.length > 0 && isLegacyOrEmpty) {
            wfChanged = true;
            anyChanged = true;
            const fullCols: StageMandatoryColumnItem[] = [];
            for (const compId of stg.componentIds) {
              const comp = componentPool.find(c => c.id === compId);
              fullCols.push(...buildDefaultMandatoryColumnsForSingleComponent(comp, masterRules));
            }
            return {...stg, mandatoryColumns: fullCols};
          }
          return stg;
        });
        if (wfChanged) return {...wf, stages: updatedStages};
        return wf;
      });
      return anyChanged ? updatedWfs : prevWfs;
    });
  }, [masterRules, componentPool]);

  // Keep inspectingStageDetails synchronized with stages in currentWorkflow
  useEffect(() => {
    if (inspectingStageDetails) {
      const liveStage = stages.find(s => s.id === inspectingStageDetails.id);
      if (
        liveStage &&
        (liveStage.mandatoryColumns?.length !== inspectingStageDetails.mandatoryColumns?.length ||
          liveStage.componentIds.length !== inspectingStageDetails.componentIds.length)
      ) {
        setInspectingStageDetails(liveStage);
      }
    }
  }, [stages, inspectingStageDetails]);

  function showToastMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // =============================================================================
  // GALLERY ACTIONS: SELECT, CLONE, CREATE, SOFT DELETE, RESTORE, SET DEFAULT
  // =============================================================================

  // Open Stage & Submodule Editor for a Workflow
  function handleOpenWorkflowEditor(wf: WorkflowTypeItem) {
    setActiveWorkflowId(wf.id);
    setCurrentView('EDITOR');
  }

  // Deep Clone Workflow directly from Gallery
  function handleCloneWorkflowFromGallery(sourceWf: WorkflowTypeItem) {
    if (!canManage) return;

    const timestamp = Date.now();
    const shortRand = Math.floor(100 + Math.random() * 900);
    const newWfId = `wf-clone-${timestamp}`;
    const newWfCode = `${sourceWf.code}-CLONE-${shortRand}`;
    const newWfName = `${sourceWf.name} (Copy)`;

    // Deep copy stages
    const clonedStages: WorkflowStageBox[] = sourceWf.stages.map((stg, idx) => {
      const newStageId = `stg-clone-${timestamp}-${idx + 1}`;
      return {
        ...stg,
        id: newStageId,
        sequence: idx + 1,
        documents: stg.documents
          ? stg.documents.map((doc, dIdx) => ({
              ...doc,
              id: `doc-clone-${timestamp}-${dIdx + 1}`,
            }))
          : [],
        mandatoryColumns: stg.mandatoryColumns
          ? stg.mandatoryColumns.map((col, cIdx) => ({
              ...col,
              id: `mand-clone-${timestamp}-${cIdx + 1}`,
            }))
          : [],
      };
    });

    const newWorkflow: WorkflowTypeItem = {
      id: newWfId,
      code: newWfCode,
      name: newWfName,
      version: 1,
      description: `Autonomous clone of workflow ${sourceWf.code}. All stage gates, document requirements, and mandatory fields can be customized independently.`,
      isDefault: false,
      isActive: true,
      stages: clonedStages,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    setWorkflows(prev => [newWorkflow, ...prev]);
    showToastMessage(
      `Workflow "${newWorkflow.name}" successfully cloned! You can click "✏️ Manage Stages & Sub-Modules" on the card to customize it.`,
    );
  }

  // Soft Delete Workflow (is_active = false)
  function handleSoftDeleteWorkflow(wf: WorkflowTypeItem) {
    if (!canManage) return;
    if (wf.isDefault) {
      alert('System default workflow cannot be deactivated. Please set another workflow as default first.');
      return;
    }
    if (workflows.filter(w => w.isActive).length <= 1) {
      alert('The system must maintain at least one active workflow pipeline.');
      return;
    }

    if (!confirm(`Deactivate workflow pipeline "${wf.name}" (${wf.code})? This workflow will be hidden from new application origination, while data is preserved in the database (is_active = 0).`)) return;

    setWorkflows(prev =>
      prev.map(w => (w.id === wf.id ? {...w, isActive: false, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)} : w)),
    );
    showToastMessage(`Workflow "${wf.name}" has been deactivated (Soft Deleted: is_active = 0).`);
  }

  // Restore Soft-Deleted Workflow (is_active = true)
  function handleRestoreWorkflow(wf: WorkflowTypeItem) {
    if (!canManage) return;
    setWorkflows(prev =>
      prev.map(w => (w.id === wf.id ? {...w, isActive: true, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)} : w)),
    );
    showToastMessage(`Workflow "${wf.name}" reactivated successfully (is_active = 1).`);
  }

  // Set as Default Workflow
  function handleSetAsDefault(wf: WorkflowTypeItem) {
    if (!canManage) return;
    if (!wf.isActive) {
      alert('Cannot set an inactive workflow as default.');
      return;
    }
    setWorkflows(prev =>
      prev.map(w => ({
        ...w,
        isDefault: w.id === wf.id,
      })),
    );
    showToastMessage(`Workflow "${wf.name}" is now the default financing workflow.`);
  }

  // Open Edit Metadata Modal
  function handleOpenEditWorkflowModal(wf: WorkflowTypeItem) {
    setEditingWorkflowTarget(wf);
    setEditWfName(wf.name);
    setEditWfCode(wf.code);
    setEditWfDesc(wf.description);
    setEditWfIsDefault(wf.isDefault);
    setShowEditWorkflowModal(true);
  }

  function handleSaveWorkflowEdit() {
    if (!editingWorkflowTarget) return;
    if (!editWfName.trim() || !editWfCode.trim()) {
      alert('Workflow Name and Workflow Code cannot be empty.');
      return;
    }

    setWorkflows(prev =>
      prev.map(w => {
        if (w.id === editingWorkflowTarget.id) {
          return {
            ...w,
            name: editWfName.trim(),
            code: editWfCode.toUpperCase().replace(/\s+/g, '_'),
            description: editWfDesc.trim(),
            isDefault: editWfIsDefault,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };
        }
        if (editWfIsDefault && w.id !== editingWorkflowTarget.id) {
          return {...w, isDefault: false};
        }
        return w;
      }),
    );

    setShowEditWorkflowModal(false);
    showToastMessage(`Workflow details for "${editWfName}" saved successfully.`);
  }

  // Create New Workflow
  function handleCreateNewWorkflow() {
    if (!newWfName.trim() || !newWfCode.trim()) {
      alert('Workflow Name and Workflow Code are required.');
      return;
    }

    const newId = `wf-${Date.now()}`;
    let templateStages: WorkflowStageBox[] = [];

    if (newWfTemplate === 'DUAL_STAGE') {
      templateStages = [
        {
          id: `stg-${Date.now()}-1`,
          code: 'MKT_STAGE',
          name: 'Marketing Dual-Stage (MKT)',
          sequence: 1,
          executionMode: 'PARALLEL',
          passGateRule: 'ALL_COMPLETED',
          requiredRole: 'Branch Manager (BM)',
          slaDays: 3,
          componentIds: ['comp-fap', 'comp-prean'],
          color: '#2563EB',
          documents: DEFAULT_STAGE_DOCS_MKT,
          mandatoryColumns: DEFAULT_MANDATORY_COLS_MKT,
        },
        {
          id: `stg-${Date.now()}-2`,
          code: 'ICLF',
          name: 'ICLF Stage (Komite Pusat)',
          sequence: 2,
          executionMode: 'SEQUENTIAL',
          passGateRule: 'ALL_COMPLETED',
          requiredRole: 'ICLF Committee (Direksi)',
          slaDays: 5,
          componentIds: ['comp-iclf'],
          color: '#7C3AED',
          documents: DEFAULT_STAGE_DOCS_ICLF,
          mandatoryColumns: DEFAULT_MANDATORY_COLS_ICLF,
        },
      ];
    } else if (newWfTemplate === 'SINGLE_GATE') {
      templateStages = [
        {
          id: `stg-${Date.now()}-1`,
          code: 'COLLAB_STAGE',
          name: 'Collaborative Single Gate',
          sequence: 1,
          executionMode: 'PARALLEL',
          passGateRule: 'ALL_COMPLETED',
          requiredRole: 'Credit Committee',
          slaDays: 3,
          componentIds: ['comp-fap', 'comp-prean', 'comp-ca'],
          color: '#059669',
          documents: DEFAULT_STAGE_DOCS_MKT,
          mandatoryColumns: DEFAULT_MANDATORY_COLS_MKT,
        },
      ];
    }

    const newWorkflow: WorkflowTypeItem = {
      id: newId,
      code: newWfCode.toUpperCase().replace(/\s+/g, '_'),
      name: newWfName.trim(),
      version: 1,
      description: newWfDesc.trim() || 'Workflow pipa pembiayaan kustom.',
      isDefault: workflows.length === 0,
      isActive: true,
      stages: templateStages,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    setWorkflows([newWorkflow, ...workflows]);
    setShowAddWorkflowModal(false);
    setNewWfName('');
    setNewWfCode('');
    setNewWfDesc('');
    showToastMessage(`New workflow pipeline "${newWorkflow.name}" created successfully.`);
  }

  // Reset to Factory Presets
  function handleResetDefault() {
    if (!confirm('Reset all workflow pipelines to factory defaults (Standard Dual-Stage, Fast-Track, and Independent Pre-Analysis)?')) return;
    setWorkflows(DEFAULT_WORKFLOW_REGISTRY);
    setComponentPool(DEFAULT_COMPONENTS_POOL);
    setActiveWorkflowId('wf-001');
    localStorage.removeItem(STORAGE_KEY_REGISTRY);
    localStorage.removeItem(STORAGE_KEY_POOL);
    showToastMessage('All workflow pipelines have been reset to factory defaults.');
  }

  // =============================================================================
  // EDITOR ACTIONS: STAGES & SUBMODULES (SCOPED TO ACTIVE WORKFLOW)
  // =============================================================================

  function updateStagesForCurrentWorkflow(updater: (prevStages: WorkflowStageBox[]) => WorkflowStageBox[]) {
    setWorkflows(prev =>
      prev.map(w => {
        if (w.id === currentWorkflow.id) {
          const newStages = updater(w.stages);
          return {
            ...w,
            stages: newStages,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };
        }
        return w;
      }),
    );
  }

  function handleOpenApproverModal(stg: WorkflowStageBox) {
    if (!canManage) return;
    setApproverModalStage(stg);
    const existingDeptId = stg.departmentId ?? (lookupDepartments.find(d => d.department_name.toLowerCase().includes((stg.requiredRole || '').toLowerCase()) || d.department_code.toLowerCase().includes((stg.requiredRole || '').toLowerCase()))?.dept_id ?? (stg.code === 'MKT_STAGE' ? 8 : stg.code === 'ICLF' ? 3 : lookupDepartments[0]?.dept_id ?? 1));
    setApproverDeptId(existingDeptId);
    setApproverTargetType(stg.assignedUserId ? 'SPECIFIC_USER' : 'DEPT_POOL');
    setApproverUserId(stg.assignedUserId ?? null);
    setApproverRoleAlias(stg.requiredRole || '');
  }

  function handleSaveApproverConfig() {
    if (!approverModalStage) return;
    const dept = lookupDepartments.find(d => d.dept_id === Number(approverDeptId));
    const assignedUser = approverTargetType === 'SPECIFIC_USER' 
      ? lookupUsers.find(u => u.id === Number(approverUserId))
      : null;

    const newDeptId = dept?.dept_id ?? null;
    const newDeptCode = dept?.department_code ?? '';
    const newDeptName = dept?.department_name ?? '';
    const newUserId = assignedUser?.id ?? null;
    const newUserName = assignedUser?.full_name || assignedUser?.username || '';
    const newRole = approverRoleAlias.trim() || (assignedUser ? assignedUser.position || assignedUser.full_name : dept ? `${dept.department_name} (Tim)` : approverModalStage.requiredRole);

    const updatedStage: WorkflowStageBox = {
      ...approverModalStage,
      departmentId: newDeptId,
      departmentCode: newDeptCode,
      departmentName: newDeptName,
      assignedUserId: newUserId,
      assignedUserName: newUserName,
      requiredRole: newRole,
    };

    updateStagesForCurrentWorkflow(prev =>
      prev.map(s => (s.id === updatedStage.id ? updatedStage : s))
    );

    setApproverModalStage(null);
    showToastMessage(`Approver authority for Stage ${updatedStage.sequence} (${updatedStage.name}) updated successfully.`);
  }

  function startInlineEdit(stg: WorkflowStageBox) {
    if (!canManage) return;
    setInlineEditingId(stg.id);
    setInlineTitleValue(stg.name);
  }

  function saveInlineEdit(id: string) {
    if (!inlineTitleValue.trim()) return;
    updateStagesForCurrentWorkflow(prev =>
      prev.map(s => (s.id === id ? {...s, name: inlineTitleValue.trim()} : s)),
    );
    setInlineEditingId(null);
    showToastMessage('Workflow stage name updated successfully.');
  }

  function moveStage(idx: number, direction: 'left' | 'right') {
    if (!canManage) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    const cloned = [...stages];
    const temp = cloned[idx];
    cloned[idx] = cloned[targetIdx];
    cloned[targetIdx] = temp;
    const updated = cloned.map((s, i) => ({...s, sequence: i + 1}));
    updateStagesForCurrentWorkflow(() => updated);
    showToastMessage('Workflow stage order updated.');
  }

  function toggleExecutionMode(stageId: string) {
    if (!canManage) return;
    updateStagesForCurrentWorkflow(prev =>
      prev.map(s =>
        s.id === stageId
          ? {
              ...s,
              executionMode: s.executionMode === 'PARALLEL' ? 'SEQUENTIAL' : 'PARALLEL',
            }
          : s,
      ),
    );
    showToastMessage('Stage execution mode updated.');
  }

  function removeComponentFromStage(stageId: string, compId: string) {
    if (!canManage) return;
    const comp = componentPool.find(c => c.id === compId);
    updateStagesForCurrentWorkflow(prev =>
      prev.map(s =>
        s.id === stageId
          ? {
              ...s,
              componentIds: s.componentIds.filter(id => id !== compId),
              mandatoryColumns: (s.mandatoryColumns || []).filter(c => c.submoduleId !== compId),
            }
          : s,
      ),
    );
    setInspectingStageDetails(prev => {
      if (!prev || prev.id !== stageId) return prev;
      return {
        ...prev,
        componentIds: prev.componentIds.filter(id => id !== compId),
        mandatoryColumns: (prev.mandatoryColumns || []).filter(c => c.submoduleId !== compId),
      };
    });
    showToastMessage(`Component "${comp?.name || compId}" removed from stage.`);
  }

  function addComponentToStage(stageId: string, compId: string) {
    if (!canManage) return;
    const comp = componentPool.find(c => c.id === compId);
    const newFields = buildDefaultMandatoryColumnsForSingleComponent(comp, masterRules);
    updateStagesForCurrentWorkflow(prev =>
      prev.map(s => {
        if (s.id === stageId) {
          if (s.componentIds.includes(compId)) return s;
          const existingCols = s.mandatoryColumns || [];
          const existingKeys = new Set(existingCols.map(c => `${c.submoduleId}:${c.columnKey}`));
          const colsToAdd = newFields.filter(f => !existingKeys.has(`${f.submoduleId}:${f.columnKey}`));
          return {
            ...s,
            componentIds: [...s.componentIds, compId],
            mandatoryColumns: [...existingCols, ...colsToAdd],
          };
        }
        return s;
      }),
    );
    setInspectingStageDetails(prev => {
      if (!prev || prev.id !== stageId) return prev;
      if (prev.componentIds.includes(compId)) return prev;
      const existingCols = prev.mandatoryColumns || [];
      const existingKeys = new Set(existingCols.map(c => `${c.submoduleId}:${c.columnKey}`));
      const colsToAdd = newFields.filter(f => !existingKeys.has(`${f.submoduleId}:${f.columnKey}`));
      return {
        ...prev,
        componentIds: [...prev.componentIds, compId],
        mandatoryColumns: [...existingCols, ...colsToAdd],
      };
    });
    showToastMessage(`Component "${comp?.name || compId}" added to stage.`);
  }

  function moveComponentWithinStage(stageId: string, compIndex: number, direction: 'up' | 'down') {
    if (!canManage) return;
    const stg = stages.find(s => s.id === stageId);
    if (!stg) return;
    const targetIndex = direction === 'up' ? compIndex - 1 : compIndex + 1;
    if (targetIndex < 0 || targetIndex >= stg.componentIds.length) return;

    const newComponentIds = [...stg.componentIds];
    const temp = newComponentIds[compIndex];
    newComponentIds[compIndex] = newComponentIds[targetIndex];
    newComponentIds[targetIndex] = temp;

    updateStagesForCurrentWorkflow(prev =>
      prev.map(s => (s.id === stageId ? {...s, componentIds: newComponentIds} : s)),
    );

    // Sync to backend database crm_master_workflow_stage_submodules
    const subCodes = newComponentIds
      .map(id => componentPool.find(c => c.id === id)?.code)
      .filter((code): code is string => !!code);

    fetch('/api/v1/workflow-stage-submodules/reorder', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({stageCode: stg.code, submoduleCodes: subCodes}),
    }).catch(err => {
      console.warn('Background sync of stage submodules sequence to database failed', err);
    });

    showToastMessage(`Component execution sequence updated for ${stg.name}.`);
  }

  function deleteStageBox(stageId: string) {
    if (!canManage) return;
    const stg = stages.find(s => s.id === stageId);
    if (!confirm(`Delete workflow stage "${stg?.name}"? Assigned components will remain intact in the catalog pool.`)) return;
    updateStagesForCurrentWorkflow(prev =>
      prev.filter(s => s.id !== stageId).map((s, i) => ({...s, sequence: i + 1})),
    );
    showToastMessage(`Stage "${stg?.name}" deleted successfully.`);
  }

  function handleCreateNewStage() {
    if (!newStageName.trim() || !newStageCode.trim()) {
      alert('Stage Name and Stage Code are required.');
      return;
    }
    const colorPalette = ['#002C5F', '#7C3AED', '#059669', '#D97706', '#DB2777', '#0891B2'];
    const selDept = lookupDepartments.find(d => d.dept_id === newStageDeptId);
    const newStage: WorkflowStageBox = {
      id: `stg-${Date.now()}`,
      code: newStageCode.toUpperCase().replace(/\s+/g, '_'),
      name: newStageName.trim(),
      sequence: stages.length + 1,
      executionMode: newStageMode,
      passGateRule: 'ALL_COMPLETED',
      requiredRole: newStageRole,
      departmentId: selDept?.dept_id ?? null,
      departmentCode: selDept?.department_code,
      departmentName: selDept?.department_name,
      assignedUserId: null,
      slaDays: newStageSla,
      componentIds: [],
      color: colorPalette[stages.length % colorPalette.length],
      documents: DEFAULT_STAGE_DOCS_MKT,
      mandatoryColumns: [],
    };
    updateStagesForCurrentWorkflow(prev => [...prev, newStage]);
    setShowAddStageModal(false);
    setNewStageName('');
    setNewStageCode('');
    showToastMessage(`New stage "${newStage.name}" created successfully in this workflow.`);
  }

  function handleCreateNewComponent() {
    if (!newCompName.trim() || !newCompCode.trim()) {
      alert('Component Name and Component Code are required.');
      return;
    }
    const newComp: WorkflowComponentItem = {
      id: `comp-${Date.now()}`,
      code: newCompCode.toUpperCase().replace(/\s+/g, '_'),
      name: newCompName.trim(),
      domain: newCompDomain,
      targetTables: newCompTables.trim() || 'crm_custom_trans_tables',
      description: newCompDesc.trim() || 'Custom workflow business component.',
      allowConcurrentEdit: newCompConcurrent,
    };
    setComponentPool([...componentPool, newComp]);
    setShowAddComponentModal(false);
    setNewCompName('');
    setNewCompCode('');
    setNewCompTables('');
    setNewCompDesc('');
    showToastMessage(`New component "${newComp.name}" registered to catalog pool.`);
  }

  function toggleStageDocumentMandatory(stageId: string, docId: string) {
    if (!canManage) return;
    updateStagesForCurrentWorkflow(prev =>
      prev.map(s => {
        if (s.id !== stageId) return s;
        const docs = s.documents || [];
        const updatedDocs = docs.map(d => (d.id === docId ? {...d, isMandatory: !d.isMandatory} : d));
        return {...s, documents: updatedDocs};
      }),
    );
    setInspectingStageDetails(prev => {
      if (!prev || prev.id !== stageId) return prev;
      const docs = prev.documents || [];
      return {...prev, documents: docs.map(d => (d.id === docId ? {...d, isMandatory: !d.isMandatory} : d))};
    });
    showToastMessage('Document mandatory requirement updated.');
  }

  function toggleStageMandatoryColumn(stageId: string, colId: string) {
    if (!canManage) return;
    updateStagesForCurrentWorkflow(prev =>
      prev.map(s => {
        if (s.id !== stageId) return s;
        const cols = s.mandatoryColumns || [];
        const updatedCols = cols.map(c => (c.id === colId ? {...c, isMandatory: !c.isMandatory} : c));
        return {...s, mandatoryColumns: updatedCols};
      }),
    );
    setInspectingStageDetails(prev => {
      if (!prev || prev.id !== stageId) return prev;
      const cols = prev.mandatoryColumns || [];
      return {...prev, mandatoryColumns: cols.map(c => (c.id === colId ? {...c, isMandatory: !c.isMandatory} : c))};
    });
    showToastMessage('Form field mandatory requirement updated.');
  }

  const displayedWorkflows = showInactiveWorkflows
    ? workflows
    : workflows.filter(w => w.isActive);

  return (
    <div className="master-content" style={{width: '100%', padding: '24px 32px', boxSizing: 'border-box'}}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#002C5F',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 99999,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toast}</span>
        </div>
      )}

      {/* ============================================================================= */}
      {/* VIEW 1: WORKFLOW PIPELINES CATALOG (CARD GALLERY)                             */}
      {/* ============================================================================= */}
      {currentView === 'GALLERY' ? (
        <div>
          {/* Main Header & Actions */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20}}>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{padding: 9, background: '#EFF6FF', borderRadius: 8, color: '#1E40AF'}}>
                  <Layers size={24} />
                </div>
                <div>
                  <h3 style={{fontSize: 22, color: '#002C5F', fontWeight: 800, margin: 0}}>
                    Financing Workflow Pipelines Catalog
                  </h3>
                  <p className="muted" style={{fontSize: 12, marginTop: 4, marginBottom: 0}}>
                    Select a financing workflow pipeline below to <strong>manage its stages and sub-modules</strong>, or use <strong>Clone</strong> to create independent workflow variants.
                  </p>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer', marginRight: 6}}>
                <input
                  type="checkbox"
                  checked={showInactiveWorkflows}
                  onChange={e => setShowInactiveWorkflows(e.target.checked)}
                  style={{cursor: 'pointer'}}
                />
                Show Inactive Pipelines (Soft-Deleted)
              </label>

              <button
                type="button"
                className="button secondary small"
                onClick={handleResetDefault}
                title="Reset all workflows to factory defaults"
                style={{color: '#64748B'}}
              >
                <RotateCcw size={14} /> Reset Factory Defaults
              </button>

              {canManage && (
                <button
                  type="button"
                  className="button primary small"
                  onClick={() => setShowAddWorkflowModal(true)}
                  style={{padding: '8px 16px', fontWeight: 700}}
                >
                  <Plus size={15} /> + Create New Workflow Pipeline
                </button>
              )}
            </div>
          </div>

          {/* Guidance Banner */}
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '12px 18px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <Sparkles size={18} color="#16A34A" />
              <span style={{fontSize: 12, color: '#166534', fontWeight: 500}}>
                <strong>Modular Architecture:</strong> Each workflow pipeline below defines independent gate stages and mandatory documents. You can <strong>clone</strong> any pipeline to create custom variants (e.g. Coal Mining Fast-Track), then customize stages and sub-modules without affecting default standard workflows.
              </span>
            </div>
            <span style={{fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 4, fontWeight: 700}}>
              {workflows.filter(w => w.isActive).length} Active Pipelines Available
            </span>
          </div>

          {/* GRID OF WORKFLOW BOXES (BOX-BOX PICKER) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 22,
              alignItems: 'stretch',
            }}
          >
            {displayedWorkflows.map(wf => {
              const totalStages = wf.stages.length;
              const totalModules = wf.stages.reduce((acc, s) => acc + s.componentIds.length, 0);

              return (
                <div
                  key={wf.id}
                  style={{
                    background: wf.isActive ? '#FFFFFF' : '#F8FAFC',
                    borderRadius: 12,
                    border: wf.isDefault
                      ? '2px solid #2563EB'
                      : wf.isActive
                      ? '1px solid #CBD5E1'
                      : '1px dashed #94A3B8',
                    boxShadow: wf.isActive ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '20px 22px',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    opacity: wf.isActive ? 1 : 0.75,
                  }}
                >
                  <div>
                    {/* Header: Code & Badges */}
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <code
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#1E40AF',
                            background: '#EFF6FF',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {wf.code}
                        </code>
                        <span style={{fontSize: 11, color: '#64748B', fontWeight: 600}}>
                          v{wf.version}
                        </span>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        {wf.isDefault && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              background: '#FEF3C7',
                              color: '#92400E',
                              padding: '2px 8px',
                              borderRadius: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Star size={11} fill="#F59E0B" color="#F59E0B" /> DEFAULT
                          </span>
                        )}

                        {wf.isActive ? (
                          <span style={{fontSize: 10, fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 12}}>
                            ACTIVE
                          </span>
                        ) : (
                          <span style={{fontSize: 10, fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: 12}}>
                            NON-ACTIVE (SOFT DELETED)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Workflow Name */}
                    <h4
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: wf.isActive ? '#0F172A' : '#64748B',
                        margin: '0 0 8px 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {wf.name}
                    </h4>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 12,
                        color: '#64748B',
                        margin: '0 0 16px 0',
                        lineHeight: 1.45,
                        minHeight: 36,
                      }}
                    >
                      {wf.description}
                    </p>

                    {/* Stage Flow Preview Chips */}
                    <div
                      style={{
                        background: '#F1F5F9',
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 16,
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6}}>
                        Pipeline Stage Gates ({totalStages} Stages, {totalModules} Sub-Modules):
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                        {wf.stages.map((stg, idx) => (
                          <span key={stg.id} style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                background: '#FFFFFF',
                                border: `1px solid ${stg.color || '#CBD5E1'}`,
                                color: stg.color || '#002C5F',
                                padding: '2px 7px',
                                borderRadius: 4,
                              }}
                            >
                              {idx + 1}. {stg.code} ({stg.executionMode === 'PARALLEL' ? '⚡ Parallel' : '🔒 Sequential'})
                            </span>
                            {idx < wf.stages.length - 1 && (
                              <ChevronRight size={12} color="#94A3B8" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div style={{borderTop: '1px solid #E2E8F0', paddingTop: 14, marginTop: 8}}>
                    {/* Primary Button to Open Editor */}
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => handleOpenWorkflowEditor(wf)}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '8px 12px',
                        marginBottom: 10,
                        background: '#002C5F',
                      }}
                    >
                      <Pencil size={14} /> Manage Stages & Sub-Modules ({totalStages})
                    </button>

                    {/* Secondary Management Row */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6}}>
                      {/* Clone Button */}
                      {canManage && (
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => handleCloneWorkflowFromGallery(wf)}
                          style={{fontSize: 11, padding: '4px 8px', color: '#B45309', borderColor: '#FDE68A'}}
                          title="Clone this workflow pipeline autonomously"
                        >
                          <Copy size={12} /> Clone
                        </button>
                      )}

                      {/* Edit Details */}
                      {canManage && (
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => handleOpenEditWorkflowModal(wf)}
                          style={{fontSize: 11, padding: '4px 8px'}}
                          title="Edit workflow name, code, and description"
                        >
                          <Edit2 size={12} /> Info
                        </button>
                      )}

                      {/* Set As Default */}
                      {canManage && !wf.isDefault && wf.isActive && (
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => handleSetAsDefault(wf)}
                          style={{fontSize: 11, padding: '4px 8px', color: '#2563EB', borderColor: '#BFDBFE'}}
                          title="Jadikan sebagai workflow default sistem"
                        >
                          <Star size={12} /> Default
                        </button>
                      )}

                      {/* Soft Delete / Restore */}
                      {canManage && (
                        wf.isActive ? (
                          <button
                            type="button"
                            className="button secondary small"
                            onClick={() => handleSoftDeleteWorkflow(wf)}
                            disabled={wf.isDefault}
                            style={{
                              fontSize: 11,
                              padding: '4px 8px',
                              color: wf.isDefault ? '#CBD5E1' : '#DC2626',
                              borderColor: wf.isDefault ? '#F1F5F9' : '#FECACA',
                              cursor: wf.isDefault ? 'not-allowed' : 'pointer',
                            }}
                            title={wf.isDefault ? 'Default workflow cannot be deactivated' : 'Deactivate pipeline (is_active = 0)'}
                          >
                            <Trash2 size={12} /> Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button secondary small"
                            onClick={() => handleRestoreWorkflow(wf)}
                            style={{fontSize: 11, padding: '4px 8px', color: '#16A34A', borderColor: '#BBF7D0'}}
                            title="Reactivate this pipeline (is_active = 1)"
                          >
                            <Undo2 size={12} /> Reactivate
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ADD NEW WORKFLOW CARD PLACEHOLDER */}
            {canManage && (
              <div
                onClick={() => setShowAddWorkflowModal(true)}
                style={{
                  borderRadius: 12,
                  border: '2px dashed #94A3B8',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 20px',
                  cursor: 'pointer',
                  minHeight: 280,
                  transition: 'all 0.2s ease',
                }}
                title="Create a new workflow pipeline"
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Plus size={24} />
                </div>
                <span style={{fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 4}}>
                  + Create New Workflow Pipeline
                </span>
                <span style={{fontSize: 11, color: '#64748B', textAlign: 'center', maxWidth: 260}}>
                  Register a new financing workflow pipeline (e.g. SOE tender track, mining fast-track, or consignment flow).
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================================= */
        /* VIEW 2: STAGE & SUB-MODULE EDITOR FOR SELECTED WORKFLOW                       */
        /* ============================================================================= */
        <div>
          {/* Top Breadcrumb & Navigation Bar */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              boxShadow: '0 3px 12px rgba(0,0,0,0.06)',
              padding: '16px 22px',
              marginBottom: 24,
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14}}>
              {/* Back button & Breadcrumb */}
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setCurrentView('GALLERY')}
                  style={{display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700}}
                >
                  <ArrowLeft size={14} /> Back to All Workflows
                </button>

                <div style={{height: 20, width: 1, background: '#CBD5E1'}} />

                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <code style={{fontSize: 12, fontWeight: 800, color: '#1E40AF', background: '#DBEAFE', padding: '2px 6px', borderRadius: 4}}>
                      {currentWorkflow.code}
                    </code>
                    <h3 style={{margin: 0, fontSize: 17, fontWeight: 800, color: '#002C5F'}}>
                      {currentWorkflow.name}
                    </h3>
                    {currentWorkflow.isDefault && (
                      <span style={{fontSize: 10, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 12}}>
                        ⭐ DEFAULT
                      </span>
                    )}
                  </div>
                  <p style={{fontSize: 11, color: '#64748B', margin: '3px 0 0 0'}}>
                    {currentWorkflow.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons inside Editor */}
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                {canManage && (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => handleCloneWorkflowFromGallery(currentWorkflow)}
                    style={{color: '#B45309', borderColor: '#FDE68A', fontWeight: 700}}
                    title="Duplicate this workflow into a new pipeline"
                  >
                    <Copy size={13} /> Clone Pipeline
                  </button>
                )}

                {canManage && (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => handleOpenEditWorkflowModal(currentWorkflow)}
                  >
                    <Edit2 size={13} /> Edit Details
                  </button>
                )}

                {canManage && (
                  <button
                    type="button"
                    className="button primary small"
                    onClick={() => setShowAddStageModal(true)}
                  >
                    <Plus size={14} /> + Add Stage to Pipeline
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Instructional Hint Box */}
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '12px 18px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <Sparkles size={18} color="#16A34A" />
              <span style={{fontSize: 12, color: '#166534', fontWeight: 500}}>
                <strong>Editing Pipeline {currentWorkflow.code}:</strong> Use the <strong>▲ / ▼ arrows</strong> to adjust sequential execution order. Click the pencil icon to rename stages inline. Detach components with ✕ or bind new business modules via <strong>"+ Add Component"</strong>.
              </span>
            </div>
            <span style={{fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 4, fontWeight: 700}}>
              Auto-Saved to Database
            </span>
          </div>

          {/* HORIZONTAL PIPELINE FLOW (STAGE BOXES & CONNECTING ARROWS)                   */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 24,
              paddingTop: 8,
              fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {stages.map((stg, sIndex) => {
              const stageComponents = stg.componentIds
                .map(id => componentPool.find(c => c.id === id))
                .filter((c): c is WorkflowComponentItem => !!c);

              const unassignedComponents = componentPool.filter(
                c => !stg.componentIds.includes(c.id),
              );

              const approverLabel = stg.departmentName
                ? `${stg.departmentName} ${stg.assignedUserName ? `• PIC: ${stg.assignedUserName}` : '• Pool Team'}`
                : (stg.requiredRole || 'Configure Approver');

              return (
                <div key={stg.id} style={{display: 'flex', alignItems: 'center', flexShrink: 0}}>
                  {/* STAGE CARD (USER MANAGEMENT STYLING) */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 30px rgba(0, 44, 95, 0.05)',
                      width: 430,
                      minWidth: 430,
                      maxWidth: 430,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      borderTop: `4px solid ${stg.color || '#002C5F'}`,
                    }}
                  >
                    {/* STAGE BOX HEADER */}
                    <div
                      style={{
                        background: '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                        padding: '14px 18px',
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: '#002C5F',
                              color: '#FFFFFF',
                              padding: '3px 10px',
                              borderRadius: 999,
                              letterSpacing: '0.04em',
                            }}
                          >
                            STAGE {stg.sequence}
                          </span>
                          <code
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#475569',
                              background: '#E2E8F0',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {stg.code}
                          </code>
                        </div>

                        {/* Reorder & Action Controls */}
                        {canManage && (
                          <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                            <button
                              type="button"
                              onClick={() => moveStage(sIndex, 'left')}
                              disabled={sIndex === 0}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: 6,
                                cursor: sIndex === 0 ? 'not-allowed' : 'pointer',
                                padding: '4px 6px',
                                color: sIndex === 0 ? '#CBD5E1' : '#002C5F',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                              title="Move stage left (earlier in pipeline)"
                            >
                              <ArrowLeft size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveStage(sIndex, 'right')}
                              disabled={sIndex === stages.length - 1}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: 6,
                                cursor: sIndex === stages.length - 1 ? 'not-allowed' : 'pointer',
                                padding: '4px 6px',
                                color: sIndex === stages.length - 1 ? '#CBD5E1' : '#002C5F',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                              title="Move stage right (later in pipeline)"
                            >
                              <ArrowRight size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteStageBox(stg.id)}
                              style={{
                                background: '#FEE2E2',
                                border: '1px solid #FECACA',
                                borderRadius: 6,
                                cursor: 'pointer',
                                padding: '4px 6px',
                                color: '#EF4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                              title="Delete this workflow stage"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* STAGE NAME (CAN BE INLINE EDITED) */}
                      <div style={{marginTop: 6}}>
                        {inlineEditingId === stg.id ? (
                          <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                            <input
                              type="text"
                              value={inlineTitleValue}
                              onChange={e => setInlineTitleValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveInlineEdit(stg.id)}
                              autoFocus
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                padding: '6px 10px',
                                border: '2px solid #002C5F',
                                borderRadius: 6,
                                width: '100%',
                                fontFamily: "'Outfit', sans-serif",
                              }}
                            />
                            <button
                              type="button"
                              className="button primary small"
                              onClick={() => saveInlineEdit(stg.id)}
                              style={{padding: '7px 10px', background: '#002C5F'}}
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              cursor: canManage ? 'pointer' : 'default',
                            }}
                            onClick={() => startInlineEdit(stg)}
                            title={canManage ? 'Click to rename stage' : ''}
                          >
                            <h4
                              style={{
                                margin: 0,
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#002C5F',
                                lineHeight: 1.3,
                                fontFamily: "'Outfit', sans-serif",
                              }}
                            >
                              {stg.name}
                            </h4>
                            {canManage && <Pencil size={13} color="#94A3B8" />}
                          </div>
                        )}
                      </div>

                      {/* Mode & Approver Selector Bar */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 12,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                          <span style={{color: '#64748B', fontSize: 11, fontWeight: 600}}>Mode:</span>
                          <button
                            type="button"
                            onClick={() => toggleExecutionMode(stg.id)}
                            disabled={!canManage}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              border: 'none',
                              cursor: canManage ? 'pointer' : 'default',
                              background: stg.executionMode === 'PARALLEL' ? '#EFF6FF' : '#F3E8FF',
                              color: stg.executionMode === 'PARALLEL' ? '#1E40AF' : '#6B21A8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Click to toggle execution mode (PARALLEL = Simultaneous / SEQUENTIAL = Step-by-Step)"
                          >
                            {stg.executionMode} ⇋
                          </button>
                        </div>

                        {/* Interactive Approver Badge Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenApproverModal(stg)}
                          disabled={!canManage}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            cursor: canManage ? 'pointer' : 'default',
                            fontSize: 11,
                            color: '#002C5F',
                            fontWeight: 600,
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            if (canManage) {
                              e.currentTarget.style.borderColor = '#FF9900';
                              e.currentTarget.style.background = '#FFFBEB';
                            }
                          }}
                          onMouseLeave={e => {
                            if (canManage) {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.background = '#F8FAFC';
                            }
                          }}
                          title={canManage ? 'Click to configure Department / PIC Approver' : ''}
                        >
                          <i className="fas fa-user-check" style={{color: '#FF9900', fontSize: 11}} />
                          <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {approverLabel}
                          </span>
                          {canManage && <Pencil size={11} color="#64748B" />}
                        </button>
                      </div>
                    </div>

                    {/* STAGE BODY */}
                    <div style={{padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6}}>
                        <span style={{fontSize: 12, fontWeight: 700, color: '#002C5F'}}>
                          Stage Components & Sub-Modules ({stageComponents.length}):
                        </span>
                        {stg.executionMode === 'PARALLEL' ? (
                          stageComponents.length > 1 && (
                            <span style={{fontSize: 10, color: '#166534', fontWeight: 700, background: '#DCFCE7', padding: '2px 8px', borderRadius: 999}}>
                              ⚡ Concurrent Execution Active
                            </span>
                          )
                        ) : (
                          <span style={{fontSize: 10, color: '#6B21A8', fontWeight: 700, background: '#F3E8FF', padding: '2px 8px', borderRadius: 999}}>
                            🔒 Sequential: Step-by-Step Order
                          </span>
                        )}
                      </div>

                      {stageComponents.length === 0 ? (
                        <div
                          style={{
                            background: '#FFFBEB',
                            border: '1px dashed #FCD34D',
                            borderRadius: 10,
                            padding: '16px 14px',
                            textAlign: 'center',
                            color: '#92400E',
                            fontSize: 12,
                            marginBottom: 12,
                          }}
                        >
                          This stage has no components yet. Select from the dropdown below to assign modules.
                        </div>
                      ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12}}>
                          {stageComponents.map((comp, cIdx) => (
                            <div
                              key={comp.id}
                              style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: 10,
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                {stg.executionMode === 'SEQUENTIAL' ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      background: '#002C5F',
                                      color: '#FFFFFF',
                                      borderRadius: 4,
                                      padding: '2px 6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                    title={`Step ${cIdx + 1} of ${stageComponents.length} in sequential execution`}
                                  >
                                    Step {cIdx + 1}
                                  </span>
                                ) : (
                                  <div
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: comp.domain === 'MARKETING' ? '#002C5F' : comp.domain === 'COMMITTEE' ? '#7C3AED' : '#059669',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <div>
                                  <div style={{fontSize: 12, fontWeight: 700, color: '#002C5F'}}>
                                    {comp.name}
                                  </div>
                                  <div style={{fontSize: 10, color: '#64748B', display: 'flex', gap: 6, marginTop: 2, alignItems: 'center', flexWrap: 'wrap'}}>
                                    <code>{comp.code}</code>
                                    <span>•</span>
                                    <span style={{fontWeight: 700, color: '#FF9900'}}>{comp.domain}</span>
                                    {comp.allowConcurrentEdit && (
                                      <>
                                        <span>•</span>
                                        <span style={{color: '#16A34A', fontWeight: 600}}>Concurrent: ON</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div style={{display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0}}>
                                {/* Sequential Reorder Controls (▲ / ▼) */}
                                {canManage && stageComponents.length > 1 && (
                                  <div style={{display: 'flex', alignItems: 'center', gap: 2}}>
                                    <button
                                      type="button"
                                      onClick={() => moveComponentWithinStage(stg.id, cIdx, 'up')}
                                      disabled={cIdx === 0}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: 4,
                                        cursor: cIdx === 0 ? 'not-allowed' : 'pointer',
                                        padding: '2px 4px',
                                        color: cIdx === 0 ? '#CBD5E1' : '#002C5F',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 24,
                                        width: 24,
                                        transition: 'all 0.15s ease',
                                      }}
                                      title="Move step up (Execute earlier in sequence)"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveComponentWithinStage(stg.id, cIdx, 'down')}
                                      disabled={cIdx === stageComponents.length - 1}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: 4,
                                        cursor: cIdx === stageComponents.length - 1 ? 'not-allowed' : 'pointer',
                                        padding: '2px 4px',
                                        color: cIdx === stageComponents.length - 1 ? '#CBD5E1' : '#002C5F',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 24,
                                        width: 24,
                                        transition: 'all 0.15s ease',
                                      }}
                                      title="Move step down (Execute later in sequence)"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                )}

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => removeComponentFromStage(stg.id, comp.id)}
                                    style={{
                                      background: '#FEE2E2',
                                      border: 'none',
                                      color: '#DC2626',
                                      borderRadius: 4,
                                      width: 24,
                                      height: 24,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                    }}
                                    title={`Detach "${comp.name}" from ${stg.name}`}
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ADD COMPONENT DROPDOWN */}
                      {canManage && unassignedComponents.length > 0 && (
                        <div style={{marginTop: 'auto'}}>
                          <select
                            value=""
                            onChange={e => {
                              if (e.target.value) addComponentToStage(stg.id, e.target.value);
                            }}
                            style={{
                              width: '100%',
                              fontSize: 11,
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: '1px dashed #002C5F',
                              background: '#F0F7FF',
                              color: '#002C5F',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: "'Outfit', sans-serif",
                            }}
                          >
                            <option value="">+ Add Component to this Stage...</option>
                            {unassignedComponents.map(c => (
                              <option key={c.id} value={c.id}>
                                + {c.name} ({c.domain})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* DOCUMENT & MANDATORY RULES BUTTON */}
                      <div style={{marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <button
                          type="button"
                          onClick={() => setInspectingStageDetails(stg)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#002C5F',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 6px',
                            borderRadius: 6,
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#FF9900')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#002C5F')}
                          title="Configure required documents and mandatory fields"
                        >
                          <FileCheck2 size={14} color="#FF9900" />
                          <span>
                            Configure Documents & Mandatory Rules ({stg.documents?.length || 0} Docs,{' '}
                            {(stg.mandatoryColumns || []).filter(c => c.isMandatory).length} Mandatory Fields)
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CONNECTING ARROW BADGE (Render between stages) */}
                  {sIndex < stages.length - 1 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 12px',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #002C5F 0%, #0369A1 100%)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(0, 44, 95, 0.25)',
                          border: '3px solid #FFFFFF',
                          transition: 'transform 0.2s ease',
                        }}
                        title={`Proceed to Stage ${stg.sequence + 1}`}
                      >
                        <ArrowRight size={20} strokeWidth={2.8} />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: '#002C5F',
                          marginTop: 6,
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          background: '#E0F2FE',
                          padding: '3px 10px',
                          borderRadius: 999,
                          border: '1px solid #BAE6FD',
                        }}
                      >
                        PROCEED TO STAGE {stg.sequence + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ADD STAGE CARD AT THE END OF PIPELINE */}
            {canManage && (
              <div
                onClick={() => setShowAddStageModal(true)}
                style={{
                  borderRadius: 16,
                  border: '2px dashed #CBD5E1',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 24px',
                  cursor: 'pointer',
                  width: 320,
                  minWidth: 320,
                  maxWidth: 320,
                  flexShrink: 0,
                  minHeight: 280,
                  transition: 'all 0.2s ease',
                  alignSelf: 'stretch',
                  fontFamily: "'Outfit', sans-serif",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#002C5F';
                  e.currentTarget.style.background = '#F0F7FF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
                title="Add new workflow stage to pipeline"
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#E0F2FE',
                    color: '#002C5F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Plus size={24} strokeWidth={2.5} />
                </div>
                <span style={{fontSize: 14, fontWeight: 800, color: '#002C5F', marginBottom: 4}}>
                  + Add New Workflow Stage
                </span>
                <span style={{fontSize: 11, color: '#64748B', textAlign: 'center', maxWidth: 220}}>
                  Insert a new gate stage into this pipeline (e.g. Field Survey, Pre-Analysis, or Asset Delivery/BAST).
                </span>
              </div>
            )}
          </div>

          {/* ============================================================================= */}
          {/* REGISTERED BUSINESS COMPONENTS & SUB-MODULES CATALOG (POOL SYSTEM) */}
          {/* ============================================================================= */}
          <div style={{marginTop: 40}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <div>
                <h4 style={{fontSize: 16, fontWeight: 800, color: '#002C5F', margin: 0}}>
                  Registered Business Components & Sub-Modules Catalog ({componentPool.length})
                </h4>
                <span className="muted" style={{fontSize: 12}}>
                  Master catalog of autonomous business components. Any component can be attached to any stage gate.
                </span>
              </div>

              {canManage && (
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setShowAddComponentModal(true)}
                  style={{borderColor: '#CBD5E1', color: '#1E293B'}}
                >
                  <Plus size={14} /> + Register New Component
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: 14,
              }}
            >
              {componentPool.map(comp => (
                <div
                  key={comp.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6}}>
                      <h5 style={{fontSize: 13, fontWeight: 800, color: '#0F172A', margin: 0}}>
                        {comp.name}
                      </h5>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: comp.domain === 'MARKETING' ? '#EFF6FF' : comp.domain === 'COMMITTEE' ? '#F3E8FF' : '#ECFDF5',
                          color: comp.domain === 'MARKETING' ? '#1E40AF' : comp.domain === 'COMMITTEE' ? '#6B21A8' : '#047857',
                        }}
                      >
                        {comp.domain}
                      </span>
                    </div>
                    <code style={{fontSize: 10, color: '#475569', display: 'block', marginBottom: 6}}>
                      {comp.code}
                    </code>
                    <p style={{fontSize: 11, color: '#64748B', margin: 0, lineHeight: 1.4}}>
                      {comp.description}
                    </p>
                  </div>

                  <div style={{marginTop: 10, paddingTop: 8, borderTop: '1px solid #F1F5F9', fontSize: 10, color: '#94A3B8'}}>
                    Target Tables: <code style={{color: '#475569'}}>{comp.targetTables}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 1: CREATE NEW WORKFLOW PIPELINE                                        */}
      {/* ============================================================================= */}
      {showAddWorkflowModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{padding: 8, background: '#EFF6FF', borderRadius: 8, color: '#2563EB'}}>
                  <GitBranch size={20} />
                </div>
                <h3 style={{margin: 0, fontSize: 17, fontWeight: 800, color: '#002C5F'}}>
                  Create New Workflow Pipeline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWorkflowModal(false)}
                style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8'}}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Workflow Code (crm_master_workflow.workflow_code) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. WF_MINING_FASTTRACK"
                  value={newWfCode}
                  onChange={e => setNewWfCode(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mining Heavy Equipment Expedite"
                  value={newWfName}
                  onChange={e => setNewWfName(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Pipeline Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose of this workflow (e.g. for mining contractors with special terms)..."
                  value={newWfDesc}
                  onChange={e => setNewWfDesc(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Initial Stage Template
                </label>
                <select
                  value={newWfTemplate}
                  onChange={e => setNewWfTemplate(e.target.value as any)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                >
                  <option value="DUAL_STAGE">Standard Dual-Stage (Stage 1: MKT Parallel, Stage 2: ICLF Sequential)</option>
                  <option value="SINGLE_GATE">Single-Gate Collaborative (Stage 1: Multi-Maker Concurrent)</option>
                  <option value="BLANK">Start from Blank (No Initial Stages)</option>
                </select>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20}}>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setShowAddWorkflowModal(false)}
              >Cancel</button>
              <button
                type="button"
                className="button primary small"
                onClick={handleCreateNewWorkflow}
              >
                <Plus size={14} /> Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 2: EDIT DETAIL WORKFLOW METADATA                                        */}
      {/* ============================================================================= */}
      {showEditWorkflowModal && editingWorkflowTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{padding: 8, background: '#EFF6FF', borderRadius: 8, color: '#2563EB'}}>
                  <Edit2 size={20} />
                </div>
                <h3 style={{margin: 0, fontSize: 17, fontWeight: 800, color: '#002C5F'}}>
                  Edit Detail: {editingWorkflowTarget.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditWorkflowModal(false)}
                style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8'}}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Workflow Code *
                </label>
                <input
                  type="text"
                  value={editWfCode}
                  onChange={e => setEditWfCode(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={editWfName}
                  onChange={e => setEditWfName(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Pipeline Description
                </label>
                <textarea
                  rows={3}
                  value={editWfDesc}
                  onChange={e => setEditWfDesc(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 4}}>
                <input
                  type="checkbox"
                  id="chk-default-wf-modal"
                  checked={editWfIsDefault}
                  onChange={e => setEditWfIsDefault(e.target.checked)}
                  style={{width: 16, height: 16, cursor: 'pointer'}}
                />
                <label htmlFor="chk-default-wf-modal" style={{fontSize: 13, fontWeight: 600, color: '#1E293B', cursor: 'pointer'}}>
                  Set as system default pipeline (is_default = 1)
                </label>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20}}>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setShowEditWorkflowModal(false)}
              >Cancel</button>
              <button
                type="button"
                className="button primary small"
                onClick={handleSaveWorkflowEdit}
              >
                <Check size={14} />Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 3: ADD NEW WORKFLOW STAGE                                            */}
      {/* ============================================================================= */}
      {showAddStageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 500,
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <h3 style={{margin: 0, fontSize: 17, fontWeight: 800, color: '#002C5F'}}>
                + Add Workflow Stage to {currentWorkflow.code}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStageModal(false)}
                style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8'}}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Stage Code (crm_master_workflow_stages.stage_code) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PRE_ANALYSIS_STAGE, SURVEY_STAGE"
                  value={newStageCode}
                  onChange={e => setNewStageCode(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Stage / Gate Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pre-Analysis & Risk Verification"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Component Execution Mode in this Stage
                </label>
                <select
                  value={newStageMode}
                  onChange={e => setNewStageMode(e.target.value as any)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                >
                  <option value="PARALLEL">PARALLEL (Components executed simultaneously)</option>
                  <option value="SEQUENTIAL">SEQUENTIAL (Components executed strictly step-by-step)</option>
                </select>
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Responsible Department
                </label>
                <select
                  value={newStageDeptId}
                  onChange={e => {
                    const dId = Number(e.target.value);
                    setNewStageDeptId(dId);
                    const dept = lookupDepartments.find(d => d.dept_id === dId);
                    if (dept && !newStageRole) setNewStageRole(`${dept.department_name} PIC`);
                  }}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                >
                  {lookupDepartments.map(d => (
                    <option key={d.dept_id} value={d.dept_id}>
                      [{d.department_code}] {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Stage Gatekeeper Approval Authority (Role Title)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Branch Manager (BM), Credit Risk Head, ICLF Committee"
                  value={newStageRole}
                  onChange={e => setNewStageRole(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Target SLA Completion (Working Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newStageSla}
                  onChange={e => setNewStageSla(parseInt(e.target.value) || 3)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20}}>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setShowAddStageModal(false)}
              >Cancel</button>
              <button
                type="button"
                className="button primary small"
                onClick={handleCreateNewStage}
              >
                <Plus size={14} /> Create Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 4: REGISTER NEW COMPONENT TO POOL CATALOG                            */}
      {/* ============================================================================= */}
      {showAddComponentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <h3 style={{margin: 0, fontSize: 17, fontWeight: 800, color: '#002C5F'}}>
                + Daftarkan Sub-Modul Bisnis Baru ke Pool
              </h3>
              <button
                type="button"
                onClick={() => setShowAddComponentModal(false)}
                style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8'}}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Kode Sub-Modul (crm_master_workflow_submodules.submodule_code) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. COLLATERAL_VALUATION"
                  value={newCompCode}
                  onChange={e => setNewCompCode(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Business Component / Form Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Collateral Valuation & Mining Appraisal"
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div>
                  <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                    Domain Category
                  </label>
                  <select
                    value={newCompDomain}
                    onChange={e => setNewCompDomain(e.target.value as any)}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                  >
                    <option value="MARKETING">MARKETING</option>
                    <option value="CREDIT_RISK">CREDIT_RISK</option>
                    <option value="LEGAL">LEGAL</option>
                    <option value="COMMITTEE">COMMITTEE</option>
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>

                <div>
                  <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                    Editing Mode
                  </label>
                  <select
                    value={newCompConcurrent ? 'true' : 'false'}
                    onChange={e => setNewCompConcurrent(e.target.value === 'true')}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                  >
                    <option value="true">Allow Concurrent (Concurrent ON)</option>
                    <option value="false">Exclusive Lock (Concurrent OFF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Physical Database Tables (Target Tables)
                </label>
                <input
                  type="text"
                  placeholder="e.g. crm_app_appraisals, crm_app_collaterals"
                  value={newCompTables}
                  onChange={e => setNewCompTables(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>

              <div>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4}}>
                  Module Functional Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this component's role in the financing workflow..."
                  value={newCompDesc}
                  onChange={e => setNewCompDesc(e.target.value)}
                  style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13}}
                />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20}}>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setShowAddComponentModal(false)}
              >Cancel</button>
              <button
                type="button"
                className="button primary small"
                onClick={handleCreateNewComponent}
              >
                <Plus size={14} /> Register to Catalog Pool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 5: STAGE DOCUMENT & MANDATORY FIELD RULES MODAL                     */}
      {/* ============================================================================= */}
      {inspectingStageDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{padding: 8, background: '#EFF6FF', borderRadius: 8, color: '#2563EB'}}>
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <h3 style={{margin: 0, fontSize: 17, fontWeight: 800, color: '#002C5F'}}>
                    Stage Gate Rules: {inspectingStageDetails.name}
                  </h3>
                  <span style={{fontSize: 12, color: '#64748B'}}>
                    Stage: <code>{inspectingStageDetails.code}</code> in Workflow <strong>{currentWorkflow.code}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingStageDetails(null)}
                style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8'}}
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB SECTION A: STAGE REQUIRED DOCUMENTS */}
            <div style={{marginBottom: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <h5 style={{margin: 0, fontSize: 14, fontWeight: 800, color: '#1E293B'}}>
                  1. Required Document Uploads (crm_master_workflow_stage_documents)
                </h5>
                <span style={{fontSize: 11, color: '#64748B'}}>
                  Click badge to toggle Mandatory / Optional requirement
                </span>
              </div>

              {(!inspectingStageDetails.documents || inspectingStageDetails.documents.length === 0) ? (
                <div style={{padding: 12, background: '#F8FAFC', borderRadius: 6, fontSize: 12, color: '#64748B', textAlign: 'center'}}>
                  No documents mapped to this stage gate yet.
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                  {inspectingStageDetails.documents.map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{fontSize: 12, fontWeight: 700, color: '#1E293B'}}>
                          {doc.name}
                        </div>
                        <div style={{fontSize: 10, color: '#64748B', display: 'flex', gap: 6, marginTop: 2}}>
                          <code>{doc.code}</code>
                          <span>•</span>
                          <span style={{fontWeight: 600, color: '#002C5F'}}>{doc.category}</span>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <button
                          type="button"
                          onClick={() => toggleStageDocumentMandatory(inspectingStageDetails.id, doc.id)}
                          disabled={!canManage}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            cursor: canManage ? 'pointer' : 'default',
                            background: doc.isMandatory ? '#FEE2E2' : '#F1F5F9',
                            color: doc.isMandatory ? '#DC2626' : '#64748B',
                          }}
                          title="Click to toggle whether this document is mandatory to pass this stage"
                        >
                          {doc.isMandatory ? '★ MANDATORY UPLOAD' : 'OPTIONAL'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TAB SECTION B: STAGE MANDATORY COLUMNS */}
            {(() => {
              const inspectingStageComponents = inspectingStageDetails.componentIds
                .map(id => componentPool.find(c => c.id === id))
                .filter((c): c is WorkflowComponentItem => Boolean(c));
              const allMandatoryCols = inspectingStageDetails.mandatoryColumns || [];
              const totalMandatoryCount = allMandatoryCols.filter(c => c.isMandatory).length;

              const filteredMandatoryCols = allMandatoryCols.filter(col => {
                if (modalSubmoduleFilter !== 'ALL' && col.submoduleId !== modalSubmoduleFilter) {
                  return false;
                }
                if (modalStatusFilter === 'MANDATORY' && !col.isMandatory) return false;
                if (modalStatusFilter === 'OPTIONAL' && col.isMandatory) return false;
                if (modalSearchQuery.trim()) {
                  const q = modalSearchQuery.toLowerCase().trim();
                  const matchLabel = (col.columnLabel || '').toLowerCase().includes(q);
                  const matchKey = (col.columnKey || '').toLowerCase().includes(q);
                  const matchSection = (col.sectionName || '').toLowerCase().includes(q);
                  const matchSub = (col.submoduleName || '').toLowerCase().includes(q);
                  if (!matchLabel && !matchKey && !matchSection && !matchSub) return false;
                }
                return true;
              });

              return (
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8}}>
                    <div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                        <h5 style={{margin: 0, fontSize: 14, fontWeight: 800, color: '#1E293B'}}>
                          2. Mandatory Form Fields (crm_master_stage_mandatory_columns)
                        </h5>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: '#FEF3C7',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          {totalMandatoryCount} Mandatory / {allMandatoryCols.length} Total
                        </span>
                      </div>
                      <span style={{fontSize: 11, color: '#64748B', marginTop: 4, display: 'block'}}>
                        Field validations enforced before the "Submit Stage" action is unlocked. Combined across all active sub-modules in this stage.
                      </span>
                    </div>
                  </div>

                  {allMandatoryCols.length === 0 ? (
                    <div style={{padding: 24, background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#64748B', textAlign: 'center', border: '1px dashed #CBD5E1'}}>
                      No form fields mapped to this stage yet. Assign sub-modules (e.g. FAP Stage or Pre-Analysis) to load their fields.
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                      {/* FILTER TOOLBAR */}
                      <div
                        style={{
                          background: '#F8FAFC',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {/* Row 1: Submodule and Status pills */}
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10}}>
                          {/* Submodule filter pills */}
                          <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                            <span style={{fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 2}}>
                              Sub-Module:
                            </span>
                            <button
                              type="button"
                              onClick={() => setModalSubmoduleFilter('ALL')}
                              style={{
                                padding: '3px 10px',
                                borderRadius: 14,
                                fontSize: 11,
                                fontWeight: modalSubmoduleFilter === 'ALL' ? 700 : 500,
                                background: modalSubmoduleFilter === 'ALL' ? '#002C5F' : '#FFFFFF',
                                color: modalSubmoduleFilter === 'ALL' ? '#FFFFFF' : '#475569',
                                border: modalSubmoduleFilter === 'ALL' ? '1px solid #002C5F' : '1px solid #CBD5E1',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              All ({allMandatoryCols.length})
                            </button>
                            {inspectingStageComponents.map(comp => {
                              const count = allMandatoryCols.filter(c => c.submoduleId === comp.id).length;
                              const isSel = modalSubmoduleFilter === comp.id;
                              const badgeColor =
                                comp.id === 'comp-fap'
                                  ? '#2563EB'
                                  : comp.id === 'comp-prean'
                                  ? '#0D9488'
                                  : '#7C3AED';
                              return (
                                <button
                                  key={comp.id}
                                  type="button"
                                  onClick={() => setModalSubmoduleFilter(comp.id)}
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: 14,
                                    fontSize: 11,
                                    fontWeight: isSel ? 700 : 500,
                                    background: isSel ? badgeColor : '#FFFFFF',
                                    color: isSel ? '#FFFFFF' : '#475569',
                                    border: isSel ? `1px solid ${badgeColor}` : '1px solid #CBD5E1',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {comp.name.split('(')[0].trim()} ({count})
                                </button>
                              );
                            })}
                          </div>

                          {/* Status filter pills */}
                          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                            <span style={{fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 2}}>
                              Status:
                            </span>
                            {(['ALL', 'MANDATORY', 'OPTIONAL'] as const).map(st => {
                              const isSel = modalStatusFilter === st;
                              const count =
                                st === 'ALL'
                                  ? allMandatoryCols.length
                                  : st === 'MANDATORY'
                                  ? totalMandatoryCount
                                  : allMandatoryCols.length - totalMandatoryCount;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setModalStatusFilter(st)}
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: 14,
                                    fontSize: 11,
                                    fontWeight: isSel ? 700 : 500,
                                    background: isSel
                                      ? st === 'MANDATORY'
                                        ? '#D97706'
                                        : st === 'OPTIONAL'
                                        ? '#64748B'
                                        : '#1E293B'
                                      : '#FFFFFF',
                                    color: isSel ? '#FFFFFF' : '#475569',
                                    border: isSel ? 'none' : '1px solid #CBD5E1',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {st === 'ALL' ? 'All' : st === 'MANDATORY' ? 'Mandatory' : 'Optional'} ({count})
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Row 2: Search Input */}
                        <div style={{position: 'relative', width: '100%'}}>
                          <Search
                            size={14}
                            color="#94A3B8"
                            style={{position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)'}}
                          />
                          <input
                            type="text"
                            placeholder="Search form fields by label, key (e.g. npwp, debtor), or section..."
                            value={modalSearchQuery}
                            onChange={e => setModalSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 30px 7px 32px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              fontSize: 12,
                              outline: 'none',
                              background: '#FFFFFF',
                              boxSizing: 'border-box',
                            }}
                          />
                          {modalSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setModalSearchQuery('')}
                              style={{
                                position: 'absolute',
                                right: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94A3B8',
                                fontSize: 13,
                                padding: 2,
                              }}
                              title="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* FIELD LIST OR EMPTY SEARCH RESULT */}
                      {filteredMandatoryCols.length === 0 ? (
                        <div
                          style={{
                            padding: '24px 16px',
                            background: '#F8FAFC',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#64748B',
                            textAlign: 'center',
                            border: '1px dashed #CBD5E1',
                          }}
                        >
                          No form fields match the selected filter or search query.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            maxHeight: '380px',
                            overflowY: 'auto',
                            paddingRight: 4,
                          }}
                        >
                          {filteredMandatoryCols.map(col => {
                            const isFap = col.submoduleId === 'comp-fap' || col.submoduleCode === 'FAP_STAGE';
                            const isPre = col.submoduleId === 'comp-prean' || col.submoduleCode === 'PRE_ANALYSIS';
                            return (
                              <div
                                key={col.id}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 8,
                                  border: col.isMandatory ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                                  background: col.isMandatory ? '#FFFDF5' : '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0}}>
                                  <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                                    {/* Submodule Badge */}
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '1px 7px',
                                        borderRadius: 4,
                                        background: isFap ? '#EFF6FF' : isPre ? '#F0FDFA' : '#F5F3FF',
                                        color: isFap ? '#1D4ED8' : isPre ? '#0F766E' : '#6D28D9',
                                        border: isFap ? '1px solid #BFDBFE' : isPre ? '1px solid #99F6E4' : '1px solid #DDD6FE',
                                      }}
                                    >
                                      {col.submoduleName || (isFap ? 'FAP Stage' : isPre ? 'Pre-Analysis' : 'Sub-Module')}
                                    </span>

                                    {/* Section Badge */}
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        background: '#F1F5F9',
                                        color: '#475569',
                                        border: '1px solid #E2E8F0',
                                      }}
                                    >
                                      {col.sectionName}
                                    </span>
                                  </div>

                                  {/* Label & Key */}
                                  <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 1}}>
                                    <span style={{fontSize: 12, fontWeight: 700, color: '#0F172A'}}>
                                      {col.columnLabel}
                                    </span>
                                    <code
                                      style={{
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        color: '#64748B',
                                        background: '#F8FAFC',
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        border: '1px solid #E2E8F0',
                                      }}
                                    >
                                      {col.columnKey}
                                    </code>
                                  </div>
                                </div>

                                <div style={{display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0}}>
                                  <button
                                    type="button"
                                    onClick={() => toggleStageMandatoryColumn(inspectingStageDetails.id, col.id)}
                                    disabled={!canManage}
                                    style={{
                                      padding: '5px 12px',
                                      borderRadius: 6,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      border: col.isMandatory ? '1px solid #FCD34D' : '1px solid #CBD5E1',
                                      cursor: canManage ? 'pointer' : 'default',
                                      background: col.isMandatory ? '#FEF3C7' : '#F1F5F9',
                                      color: col.isMandatory ? '#B45309' : '#64748B',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      transition: 'all 0.15s ease',
                                    }}
                                    title="Click to toggle whether this field is mandatory to complete this stage"
                                  >
                                    {col.isMandatory ? '★ MANDATORY' : 'OPTIONAL'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 24}}>
              <button
                type="button"
                className="button primary small"
                onClick={() => setInspectingStageDetails(null)}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================= */}
      {/* MODAL 6: CONFIGURE STAGE APPROVER (DEPARTMENT & SPECIFIC USER / POOL)        */}
      {/* ============================================================================= */}
      {approverModalStage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1070,
            padding: 16,
            fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          onClick={() => setApproverModalStage(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0, 44, 95, 0.2)',
              width: '100%',
              maxWidth: 540,
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Gradient Bar */}
            <div
              style={{
                height: 4,
                background: 'linear-gradient(90deg, #002C5F, #FF9900)',
                borderRadius: '20px 20px 0 0',
              }}
            />

            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px 16px',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #002C5F, #0050A0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF9900',
                  }}
                >
                  <i className="fas fa-user-check" style={{fontSize: 18}} />
                </div>
                <div>
                  <h4 style={{margin: 0, fontSize: 16, fontWeight: 800, color: '#002C5F'}}>
                    Configure Stage Approver & Authority
                  </h4>
                  <small style={{color: '#64748B', fontSize: 12}}>
                    Stage {approverModalStage.sequence}: <strong>{approverModalStage.name}</strong> ({approverModalStage.code})
                  </small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproverModalStage(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 16,
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18}}>
              {/* Field 1: Responsible Department */}
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 700, color: '#002C5F', marginBottom: 6}}>
                  Responsible Department <span style={{color: '#EF4444'}}>*</span>
                </label>
                <select
                  value={approverDeptId ?? ''}
                  onChange={e => {
                    const dId = e.target.value ? Number(e.target.value) : null;
                    setApproverDeptId(dId);
                    if (approverUserId) {
                      const userInDept = lookupUsers.find(u => u.id === approverUserId && u.dept_id === dId);
                      if (!userInDept) setApproverUserId(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    color: '#002C5F',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="">-- Select Responsible Department --</option>
                  {lookupDepartments.map(d => (
                    <option key={d.dept_id} value={d.dept_id}>
                      [{d.department_code}] {d.department_name}
                    </option>
                  ))}
                </select>
                <span style={{fontSize: 11, color: '#64748B', marginTop: 4, display: 'block'}}>
                  Department master data synchronizes automatically with User Management console.
                </span>
              </div>

              {/* Field 2: Approver Assignment Type (Radio Cards) */}
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 700, color: '#002C5F', marginBottom: 8}}>
                  Approval Authority Model <span style={{color: '#EF4444'}}>*</span>
                </label>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                  {/* Option 1: Pool Approval */}
                  <div
                    onClick={() => {
                      setApproverTargetType('DEPT_POOL');
                      setApproverUserId(null);
                    }}
                    style={{
                      border: approverTargetType === 'DEPT_POOL' ? '2px solid #002C5F' : '1px solid #E2E8F0',
                      background: approverTargetType === 'DEPT_POOL' ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: approverTargetType === 'DEPT_POOL' ? '0 4px 12px rgba(0, 44, 95, 0.08)' : 'none',
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: approverTargetType === 'DEPT_POOL' ? '5px solid #002C5F' : '2px solid #CBD5E1',
                          background: '#FFFFFF',
                        }}
                      />
                      <span style={{fontSize: 13, fontWeight: 700, color: '#002C5F'}}>
                        Department Pool (All Team Members)
                      </span>
                    </div>
                    <p style={{margin: '4px 0 0', fontSize: 11, color: '#64748B', lineHeight: 1.4}}>
                      Any active staff or analyst in this department is authorized to review and approve the stage gate.
                    </p>
                  </div>

                  {/* Option 2: Specific PIC User */}
                  <div
                    onClick={() => setApproverTargetType('SPECIFIC_USER')}
                    style={{
                      border: approverTargetType === 'SPECIFIC_USER' ? '2px solid #FF9900' : '1px solid #E2E8F0',
                      background: approverTargetType === 'SPECIFIC_USER' ? '#FFFBEB' : '#FFFFFF',
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: approverTargetType === 'SPECIFIC_USER' ? '0 4px 12px rgba(255, 153, 0, 0.1)' : 'none',
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: approverTargetType === 'SPECIFIC_USER' ? '5px solid #FF9900' : '2px solid #CBD5E1',
                          background: '#FFFFFF',
                        }}
                      />
                      <span style={{fontSize: 13, fontWeight: 700, color: '#92400E'}}>
                        Specific PIC User (Designated Account)
                      </span>
                    </div>
                    <p style={{margin: '4px 0 0', fontSize: 11, color: '#64748B', lineHeight: 1.4}}>
                      Designate a specific user account (e.g. Branch Manager, Lead Analyst) as primary PIC.
                    </p>
                  </div>
                </div>
              </div>

              {/* Field 3: Designated User Dropdown (Visible only in SPECIFIC_USER mode) */}
              {approverTargetType === 'SPECIFIC_USER' && (
                <div>
                  <label style={{display: 'block', fontSize: 12, fontWeight: 700, color: '#002C5F', marginBottom: 6}}>
                    Select Designated PIC User ({lookupDepartments.find(d => d.dept_id === approverDeptId)?.department_name || 'Department'}) <span style={{color: '#EF4444'}}>*</span>
                  </label>
                  {lookupUsers.filter(u => !approverDeptId || u.dept_id === approverDeptId).length === 0 ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#92400E',
                      }}
                    >
                      <i className="fas fa-exclamation-triangle" style={{marginRight: 6}} />
                      No users are currently assigned to this department in User Management. Please assign users to this department first, or use the <strong>Pool Approval</strong> option.
                    </div>
                  ) : (
                    <select
                      value={approverUserId ?? ''}
                      onChange={e => {
                        const uId = e.target.value ? Number(e.target.value) : null;
                        setApproverUserId(uId);
                        const selUser = lookupUsers.find(u => u.id === uId);
                        if (selUser && !approverRoleAlias) {
                          setApproverRoleAlias(selUser.position || selUser.full_name);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        color: '#002C5F',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="">-- Select PIC User Account --</option>
                      {lookupUsers
                        .filter(u => !approverDeptId || u.dept_id === approverDeptId)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.username}) {u.position ? `— ${u.position}` : ''}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {/* Field 4: Role Alias / Display Label */}
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 700, color: '#002C5F', marginBottom: 6}}>
                  Official Document Role Title (Role Display)
                </label>
                <input
                  type="text"
                  value={approverRoleAlias}
                  onChange={e => setApproverRoleAlias(e.target.value)}
                  placeholder="e.g. Branch Manager (BM), Risk Officer, etc."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                />
                <span style={{fontSize: 11, color: '#64748B', marginTop: 4, display: 'block'}}>
                  Role title printed on official financing contracts and approval audit trails.
                </span>
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                <div style={{fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6}}>
                  <CheckCircle2 size={14} color="#16A34A" />
                  <span>Approval Authority Summary:</span>
                </div>
                <div style={{fontSize: 12, color: '#14532D', lineHeight: 1.5}}>
                  Stage <strong>{approverModalStage.sequence} ({approverModalStage.name})</strong> will be assigned to:
                  <div style={{marginTop: 4, fontWeight: 600}}>
                    🏢 Department: <span style={{color: '#002C5F'}}>{lookupDepartments.find(d => d.dept_id === approverDeptId)?.department_name || '(No department selected)'}</span>
                  </div>
                  <div style={{marginTop: 2, fontWeight: 600}}>
                    👤 Designated Approver / PIC: <span style={{color: '#FF9900'}}>
                      {approverTargetType === 'DEPT_POOL'
                        ? 'All Active Team Members (Department Pool Approval)'
                        : (lookupUsers.find(u => u.id === approverUserId)?.full_name || '(No user selected)')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="button secondary"
                onClick={() => setApproverModalStage(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >Cancel</button>
              <button
                type="button"
                className="button primary"
                onClick={handleSaveApproverConfig}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: '#002C5F',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Check size={14} /> Save Approver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
