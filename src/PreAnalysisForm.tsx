
export function getStaticAssetUrl(relativePath: string): string {
  const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/crm')) {
    return `/crm/${clean}`;
  }
  return `/${clean}`;
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Save,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Briefcase,
  Users,
  Truck,
  CheckSquare,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileSearch,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Check,
  Loader2
} from 'lucide-react';
import { api } from './api';

export interface MilestoneItem {
  year: string;
  milestone?: string;
  entity?: string;
  description?: string;
}

export interface UnitCompItem {
  kategoriAset?: string;
  brand: string;
  type?: string;
  qty: number;
}

export interface LenderExposureItem {
  lender: string;
  plafond: string;
  rate: string;
  notes?: string;
}

export interface CompetitionItem {
  finco: string;
  rate: string;
  purpose: string;
}

export interface PreAnalysisData {
  preAnalysisNo: string;
  preAnalysisDate: string;
  customerProjectName: string;
  taxId: string;
  fapNumber: string;
  leadSource: string;
  customerArea: string;
  dealerPic: string;
  lmiPic: string;
  lfiPic: string;
  customerPic: string;
  equity: string;
  paidUpCapital: string;
  sourceOfRepayment: string;

  // 2. PROJECT INFORMATION
  holdingGroup: string;
  projectName: string;
  projectLocation: string;
  existingProjects: string;
  newProjects: string;
  projectNameLocation?: string;
  customerRole: string;
  otherContractors: string;
  projectOwner: string;
  bowheerInfo: string;
  projectStatus: string;
  investmentPlan: string;
  financingSchemeRequested: string;

  // 3. CUSTOMER & GROUP BACKGROUND
  ubo?: string;
  uboInfo: string;
  companyBackground: string;
  starGroupMilestonesNarrative?: string;
  businessDevBackground?: string;
  operationalTeamInfo?: string;
  uboInformation?: string;
  milestones: MilestoneItem[];
  existingFincoBackup: string;

  // 4. EQUIPMENT POSSIBILITY OF SUCCESS
  equipmentJobFit: string;
  utilizationDuration: string;
  priorLiugongExperience: string;
  serviceAgreementFmc: string;
  unitComposition: UnitCompItem[];

  // 5. UNIT DELIVERY STATUS & QA CHECK
  deliveryStatus: string;
  deliveryDate: string;
  qaIlinkComment: string;
  qaConclusion: string;

  // 6. CROSS-CHECK WITH DEALER / LMI (quick)
  dealerCheck: string;
  topDealerToCustomer: string;
  topLmiToDealer: string;
  lmiArCheck: string;
  slikPefindoHighlight: string;
  applicantPefindoCheck: string;
  pefindoTerms: string;
  pefindoNotes: string;
  lenderExposures: LenderExposureItem[];

  // 7. EXPERT JUDGEMENT CONCLUSION
  goodProject: boolean;
  goodProjectNote: string;
  goodCustomer: boolean;
  goodCustomerNote: string;
  recommendation: string;
  briefNote: string;
  suggestions: string[];
  competitionNotes: string;
  competitionTable: CompetitionItem[];
  proposedBy: string;
  reviewedBy: string;
  approvedBy: string;
}

export const DEFAULT_COMPETITION_TABLE: CompetitionItem[] = [
  { finco: 'Komatsu Astra Finance (KAF)', rate: '9% - 11,5%', purpose: 'HE' },
  { finco: 'Astra Credit Companies (ACC)', rate: '10% - 12%', purpose: 'HE & Vehicles' },
  { finco: 'SAN Finance (SANF)', rate: '10,5% - 11,66%', purpose: 'HE & Vehicles' },
  { finco: 'Mahada Finance', rate: '10,50%', purpose: 'Truck' },
  { finco: 'Adira Finance', rate: '10,54%', purpose: 'HE & Vehicles' },
  { finco: 'Bank Mandiri', rate: '7,5% - 9,5%', purpose: 'HE & Vehicles' },
  { finco: 'BFI Finance', rate: '10,50%', purpose: 'HE' },
  { finco: 'BNI Multifinance', rate: '7,51%', purpose: 'HE' },
  { finco: 'Buana Finance', rate: '14,00%', purpose: 'HE' },
  { finco: 'Clipan Finance', rate: '12,49%', purpose: 'Truck' },
  { finco: 'Dipo Star Finance', rate: '9,66% - 13,76%', purpose: 'Truck' },
  { finco: 'IMFI', rate: '10,00%', purpose: 'HE' },
  { finco: 'SMFL', rate: '10,5% - 11,25%', purpose: 'HE' }
];

export const defaultInitialData: PreAnalysisData = {
  preAnalysisNo: '047/PREANA/MKT/IX/2026',
  preAnalysisDate: '07-Sep-26',
  customerProjectName: 'PT Handalan Putra Santosa (HPS)',
  taxId: '27.817.616.9-041.000',
  fapNumber: '070/AF/VIII/2026',
  leadSource: 'LMI',
  customerArea: 'Head Office : Jakarta\nSite Operation : Sumatera Area',
  dealerPic: 'Direct to LMI',
  lmiPic: 'Deny Ardhian',
  lfiPic: 'Amanda - no history with customer (new customer)',
  customerPic: 'Mr. Abraham (Business Director)',
  equity: '130.000.000.000  as of Last deed no 8, 8 June 2026',
  paidUpCapital: '32.500.000.000',
  sourceOfRepayment: 'Income / Others',

  // 2. PROJECT INFORMATION
  holdingGroup: 'STAR GROUP (PT Sentosa Abadi Raja)',
  projectName: 'Land Clearing, Wood Hauling & Forestry Harvesting Operations',
  projectLocation: 'Head Office: Jakarta | Sites: Sumatera Area (Riau, Pelalawan, South Sumatra) & Kalimantan Timur',
  existingProjects: `A. PT Handalan Putramas Santosa (HPS) (Existing Project):
1. PT Bumi Andalas Permai (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging - project start from November 2025
2. PT Bumi Mekar Hijau (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging - project start from November 2025
3. PT Sebangun Bumi Andalas Wood Industries (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging - project start from November 2025
4. PT Riau Andalan Pulp & Paper (RAPP) - Wood Hauling & Logging Project - Project start from December 2024

B. PT Pangan Sejahtera Santosa (PASS) (Existing Project):
1. PT Sinar Sosro - FMCG distributor - Start from 2022
2. PT FKS Pangan Nusantara - Start from 2022
3. PT Perfetti Van Melle - Start from 2022
4. PT Mondelez Indonesia Trading - Start from 2022`,
  newProjects: `C. PT Harta Putramas Santosa (HTPS) - NEW (Proposed Project):
1. PT Industrial Forest Plantation - Harvesting project - Project start estimated around Sept / Oct 2026 (Kalimantan Timur)
2. PT SBA Wood Industries - Land Clearing - Project start estimated around Oct 2026 (Lebong Hitam)
3. RAPP - Mayawana (for next year)`,
  projectNameLocation: 'STAR GROUP (PT Sentosa Abadi Raja) - Land Clearing, Wood Hauling & Harvesting | Sumatera & Kalimantan',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\n2. Oki Pulp & Paper',
  bowheerInfo: `1. PT Riau Andalan Pulp and Paper (RAPP) is one of the world's largest producers of sustainable pulp and paper, operating in Pangkalan Kerinci, Pelalawan Regency, Riau Province.\n- Parent Company: The core business unit of APRIL Group (Asia Pacific Resources International Limited) under the RGE (Royal Golden Eagle) Group.\n- Operational Location: Pangkalan Kerinci, Riau, Sumatra, Indonesia.\n- Production Capacity: Capable of producing up to 2.8 million tons of pulp and 1.15 million tons of paper annually.\n- Flagship Product: PaperOne™\nEstablishment: Founded May 15, 1989. Integrated mill in Pangkalan Kerinci with 11 MW solar array and self-sufficient power.\n\n2. OKI Pulp & Paper - Sinar Mas Forestry Group\nStrategic subsidiary of Asia Pulp & Paper (APP) Group located in Air Sugihan, Ogan Komering Ilir Regency, South Sumatra, supported by Tanjung Tapa Seaport. Integrated upstream-to-downstream sustainable fiber supply network.`,
  projectStatus: 'on Going with RAPP since 2025 for logistic',
  investmentPlan: `- nearest plan : 20 units LIUGONG Excavator for RAPP & 30 units LIUGONG Excavator for Sinarmas Project (combine 13 & 20 ton)\nTotal demand will be around 100 units until end of 2026.\nOther info : 20-30 unit (1st batch) estimated will delivery on W3 September 2026`,
  financingSchemeRequested: 'Tenor : 36-month lease\nSD : 15%',

  ubo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  uboInfo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  companyBackground: 'PT Handalan Putramas Santosa (HPS) is family company belongs to Mr. Hansen Santosa & family, under holding named PT Santosa Abadi Raja (STAR).',
  starGroupMilestonesNarrative: `2022 | PT PASS Established – FMCG Distribution Business
- PT Pangan Sejahtera Santosa (PT PASS) was established by Mr. Hansen Santosa, son of Mr. Oky Santosa, marking the beginning of the STAR Group's business operations.
- PT PASS focuses on urban FMCG distribution, operating warehouses and providing next-day delivery services while generating revenue from distribution margins.
- In 2022, PT PASS supported the distribution activities of several major FMCG companies, including PT Sinar Sosro, PT FKS Pangan Nusantara, PT Perfetti Van Melle, and PT Mondelez Indonesia Trading.

Q1 2024 | PT STAR Established as Holding Company
- PT Sentosa Abadi Raja (STAR) was established by Mr. Hansen Santosa as a holding company to consolidate and manage the businesses of Mr. Hansen.

November 2024 | PT HPS Established – Entry into Forestry Logistics and Hauling
- PT HPS was established as the vehicle for STAR Group's entry into forestry, following Mr. Herry Tho's former experience. The initial business focus was forestry logistics and wood hauling.
- PT HPS secured a five-year contract with RAPP, with operations commencing in December 2024.

Late 2025 | Expansion into Land Clearing and Harvesting
- After approximately one year of forestry operations, Mr. Herry Tho proposed further expansion into land clearing and harvesting.
- In November 2025, PT HPS commenced land clearing, maintenance, and logging projects with three APP Group/Sinar Mas companies:
  1. PT Bumi Andalas Permai
  2. PT Bumi Mekar Hijau
  3. PT Sebangun Bumi Andalas Wood Industries

End-2025 | PT HTPS Established – Harvesting Business
- PT HTPS was established by Mr. Hansen Santosa to focus specifically on harvesting projects.
- The establishment of a separate entity was intended to differentiate and streamline the diversification of each business/project within the STAR Group and to focusing on land clearing & harvesting contractor.`,
  businessDevBackground: `While seeking a partner to develop wingbox trucking services to support his FMCG distribution business, Mr. Hansen Santosa met Mr. Herry Tho.
- Mr. Herry Tho is based from Pekanbaru and has a background in logistics and hauling, with business connections within the forestry sector, including contacts at RAPP and APP/Sinar Mas. Through this relationship, he introduced Mr. Hansen to investment opportunities in forestry logistics and wood hauling.
- Mr. Herry previously worked at DNR Logistics (Dos Ni Roha). According to the information provided, the business he was involved in reportedly failed. His experience during that period appears to have been primarily in logistics and hauling, with no established harvesting track record.`,
  operationalTeamInfo: `Mr. Herry Tho is expected to lead the harvesting project. The planned operational team will include personnel formerly employed by RAPP, Sarindo, and CIS who have experience in forestry operations.`,
  uboInformation: `STAR GROUP Corporate Shareholding & Governance Structure:
• PT Sentosa Abadi Raja (Holding Company): Modal Dasar Rp 240 M, Modal Disetor Rp 60 M
  - Hansen Santosa (54% - Presiden Direktur)
  - Leonard Santosa (34% - Direktur)
  - Oky Santosa (12% - Komisaris)
• PT Pangan Sejahtera Santosa (PASS - FMCG): Modal Dasar Rp 50 M, Modal Disetor Rp 17,5 M
  - PT STAR (99,994%), Leonard Santosa (0,006%)
• PT Handalan Putramas Santosa (HPS - Sister Co): Modal Dasar Rp 130 M, Modal Disetor Rp 32,5 M
  - PT STAR (99,997%), Leonard Santosa (0,003%)
• PT Harta Putramas Santosa (HTPS - Applicant): Modal Dasar Rp 500 Juta, Modal Disetor Rp 500 Juta
  - PT STAR (99,98%), Leonard Santosa (0,02%)`,
  milestones: [
    { year: '2022', milestone: "PT Pangan Sejahtera Santosa (PASS) established – Started the Group's business through urban FMCG distribution and supported major FMCG principals." },
    { year: 'Q1 2024', milestone: "PT Santosa Abadi Raja (STAR) established – Set up as a holding company to consolidate businesses owned by Mr. Hansen and his family." },
    { year: 'Nov-24', milestone: "PT Handalan Putra Santosa (HPS) established – Focused on logging and land clearing projects; secured a 5-year RAPP contract and three APP Group contracts: 1. PT Bumi Andalas Permai, 2. PT Bumi Mekar Hijau, 3. PT Sebangun Bumi Andalas Wood Industries" },
    { year: 'End-2025', milestone: "PT Harta Putra Santosa (HTPS) established – Created to focus specifically on harvesting projects and further diversify the Group's business activities." },
    { year: 'Mid-2026', milestone: "New RAPP harvesting contract – New harvesting project to be executed through PT HTPS." }
  ],
  existingFincoBackup: 'ACC, SANF, MTF, RADANA, SMFL, BCA',

  equipmentJobFit: 'Suitable - for harvesting  in Sumatera Area',
  utilizationDuration: 'Reasonable — 3 years contract duration',
  priorLiugongExperience: 'Never invest Liugong prior this proposal',
  serviceAgreementFmc: 'Standard warranty from LMI',
  unitComposition: [
    { kategoriAset: 'Truk ISUZU GIGA FVM U', brand: 'ISUZU', qty: 45 },
    { kategoriAset: 'Truk FAW', brand: 'FAW', qty: 41 },
    { kategoriAset: 'Truk Shacman', brand: 'Shacman', qty: 25 },
    { kategoriAset: 'Truk ISUZU CDE L', brand: 'ISUZU', qty: 10 },
    { kategoriAset: 'Vehicle Commercial Dmax', brand: 'ISUZU', qty: 3 },
    { kategoriAset: 'Vehicle Commercial Toyota Calya - G AT 1.2 Lux', brand: 'Toyota', qty: 1 },
    { kategoriAset: 'Vehicle Commercial Toyota Innova All New', brand: 'Toyota', qty: 1 }
  ],

  deliveryStatus: 'Not yet Deliver',
  deliveryDate: 'demand units Sept 2026, will be delivery estimate on W3 & after receive PO from Finco',
  qaIlinkComment: 'No Records / Pre-Delivery Inspection Pending',
  qaConclusion: 'Standard PDI required upon delivery and iLink telemetry activation',

  dealerCheck: 'No Records Payment - New Liugong Customer',
  topDealerToCustomer: '20% DP, 80% cover by Leasing',
  topLmiToDealer: '-',
  lmiArCheck: 'No Records Payment - New Liugong Customer',
  slikPefindoHighlight: 'Based on Pefindo Checking on 4 Sept 2026',
  applicantPefindoCheck: 'NO RECORD SINCE ITS NEWLY ESTABLISHED',
  pefindoTerms: 'Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract',
  pefindoNotes: `- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.\n- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank,\n- New business diversification, PT HTPS doesnt have any experience in Harvesting.`,
  lenderExposures: [
    { lender: 'PT Astra Sedaya Finance (ACC)', plafond: '11.737.642.751,00', rate: '6,24' },
    { lender: 'PT Bank Central Asia Tbk', plafond: '13.533.553.504,00', rate: '9,50' },
    { lender: 'PT Bank Nano Syariah', plafond: '6.163.669.402,00', rate: '-' },
    { lender: 'PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)', plafond: '2.738.552.586,00', rate: '10,41' },
    { lender: 'PT Mandiri Tunas Finance (MTF)', plafond: '14.993.647.840,00', rate: '9,50' },
    { lender: 'PT Mitsui Leasing Capital Indonesia', plafond: '392.806.826,00', rate: '10,63' },
    { lender: 'PT Radana Bhaskara Finance', plafond: '3.273.898.464,00', rate: '7,20' },
    { lender: 'PT SMFL Leasing Indonesia', plafond: '4.301.044.800,00', rate: '12,49' },
    { lender: 'PT Surya Artha Nusantara Finance (SANF)', plafond: '23.538.710.000,00', rate: '11,25' }
  ],

  goodProject: true,
  goodProjectNote: 'Harvesting Contractor, PT RAPP - APRIL Group',
  goodCustomer: false,
  goodCustomerNote: 'PT HPS was newly established company since 2024. Group (HTPS) newly established since 2025.',
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
  briefNote: `- Based on documents (Legal & financial data), PT HPS is newly established company since 2024.\n- It's Group (PT Harta Putramas Santosa / PT HTPS) also newly established company since 2025.\nNot recommend to process in this stage`,
  suggestions: [
    'If still want to process with FPG, can be consider with the limitations :',
    'Corporate Guarantee from PT PASS',
    'Personal Guarantee from Hansen Santosa',
    'Project limited only for Sinarmas',
    'Not support for harvesting project',
    'Payment method : escrow + cover PDC for full tenor',
    'HTPS must have factoring facility for Nano Bank, as a source of payment to LFI',
    'If Nano Bank can not support, then need cover by 3 x Cash Collateral',
    'Other condition base on LFI Credit Committee'
  ],
  competitionNotes: 'Pefindo check 4 Sept 2026. Rate benchmark: Flat 7% p.a., 20% Security Deposit, 36-month lease tenor, 1% provision fee, IDR 5.000.000 admin fee per contract.',
  competitionTable: DEFAULT_COMPETITION_TABLE,
  proposedBy: 'Amanda Cynthia\nSenior Account Manager',
  reviewedBy: 'Maria Regina\nDept. Head',
  approvedBy: 'Jembar Ganda E\nDirector'
};

export function syncCustomerAndPicIntoPreAnalysis(
  prevData: PreAnalysisData,
  sources: { customer?: any; pic?: any; profile?: any; application?: any }
): PreAnalysisData {
  const companyName = sources.customer?.companyName || sources.application?.customer?.companyName;
  const npwp = sources.customer?.npwp || sources.application?.customer?.npwp;
  const fapNumber = sources.application?.fapNumber;
  const rawPicName = sources.pic?.picName || sources.application?.pic?.picName;
  const rawPicPos = sources.pic?.position || sources.application?.pic?.position;
  const city = sources.profile?.city || sources.application?.city;
  const province = sources.profile?.province || sources.application?.province;

  let customerPic = prevData.customerPic;
  if (rawPicName) {
    customerPic = rawPicPos ? `${rawPicName} (${rawPicPos})` : rawPicName;
  }

  let customerArea = prevData.customerArea;
  if (city || province) {
    customerArea = [city, province].filter(Boolean).join(', ');
  }

  return {
    ...prevData,
    customerProjectName: companyName || prevData.customerProjectName,
    taxId: npwp || prevData.taxId,
    fapNumber: fapNumber || prevData.fapNumber,
    customerPic,
    customerArea
  };
}

interface PreAnalysisFormProps {
  applicationId: string;
  application?: any;
  customer?: any;
  pic?: any;
  profile?: any;
  onSaved?: () => void;
  notify?: (msg: string) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  onSavingChange?: (saving: boolean) => void;
}

export function PreAnalysisForm(props: PreAnalysisFormProps) {
  const [data, setData] = useState<PreAnalysisData>(() => {
    return syncCustomerAndPicIntoPreAnalysis(defaultInitialData, props);
  });

  const [viewMode, setViewMode] = useState<'digital-twin' | 'original-pdf'>('digital-twin');
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Accordion section toggles - All 7 sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: false,
    sec4: false,
    sec5: false,
    sec6: false,
    sec7: true
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Sync scroll & highlight helper
  const scrollToPreviewElement = (elementId: string) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('fap-preview-sync-highlight');
        void el.offsetWidth;
        el.classList.add('fap-preview-sync-highlight');
        setTimeout(() => {
          el.classList.remove('fap-preview-sync-highlight');
        }, 2500);
      }
    }, 50);
  };

  const handleTriggerSync = (secId: string, previewSecId: string) => {
    setOpenSections(prev => ({ ...prev, [secId]: true }));
    scrollToPreviewElement(previewSecId);
  };

  const handlePreviewCellClick = (fieldKey: string, sectionId?: string) => {
    if (sectionId) {
      setOpenSections(prev => ({ ...prev, [sectionId]: true }));
      const formTarget = document.getElementById('acc-' + sectionId);
      if (formTarget) {
        formTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    if (fieldKey) {
      setTimeout(() => {
        const input = document.querySelector(`[name="${fieldKey}"], [data-field="${fieldKey}"]`) as HTMLElement;
        if (input) {
          input.focus();
        }
      }, 100);
    }
  };

  const handleSyncCustomerPicData = () => {
    setData(prev => syncCustomerAndPicIntoPreAnalysis(prev, props));
    props.notify?.('Customer & PIC data synced into Pre-Analysis!');
    scrollToPreviewElement('preana-preview-sec-1');
  };

  // Fetch saved pre-analysis data from server
  useEffect(() => {
    if (!props.applicationId) return;
    let isMounted = true;
    api(`/applications/${props.applicationId}/pre-analysis`)
      .then(res => {
        if (isMounted && res && res.success && res.data) {
          setData(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(err => {
        console.warn('Failed to load pre-analysis data:', err);
      });
    return () => { isMounted = false; };
  }, [props.applicationId]);

  const handleSave = async () => {
    setSaving(true);
    props.onSavingChange?.(true);
    try {
      const json = await api(`/applications/${props.applicationId}/pre-analysis`, 'PUT', data);
      if (json && json.success) {
        setSaveStatus('saved');
        props.notify?.('Pre-Analysis Form saved successfully!');
        props.onSaved?.();
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      props.onSavingChange?.(false);
    }
  };

  useEffect(() => {
    if (props.registerSave) {
      props.registerSave(handleSave);
    }
  });

  const updateField = (key: keyof PreAnalysisData, val: any) => {
    setData(prev => ({ ...prev, [key]: val }));
  };

  const totalUnits = useMemo(() => {
    return (data.unitComposition || []).reduce((acc, u) => acc + (Number(u.qty) || 0), 0);
  }, [data.unitComposition]);

  return (
    <div className="fap-detail-split-container pre-analysis-container" style={{ height: 'calc(100vh - 170px)', minHeight: '620px', overflow: 'hidden' }}>
      {/* LEFT COLUMN: 50% EDITABLE FORM */}
      <div className="fap-detail-form-col" style={{ flex: '1 1 50%', width: '50%', minWidth: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
        {/* Sticky Action Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          marginBottom: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#1e3a8a" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Pre-Analysis Form
              </h3>
              <span style={{
                background: data.recommendation === 'CONDITIONAL' ? '#fef9c3' : data.recommendation.includes('NOT RECOMMEND') ? '#fee2e2' : '#dcfce7',
                color: data.recommendation === 'CONDITIONAL' ? '#a16207' : data.recommendation.includes('NOT RECOMMEND') ? '#b91c1c' : '#15803d',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                border: `1px solid ${data.recommendation === 'CONDITIONAL' ? '#fde047' : data.recommendation.includes('NOT RECOMMEND') ? '#fca5a5' : '#86efac'}`
              }}>
                {data.recommendation}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Ref: {data.preAnalysisNo} • FAP No: {data.fapNumber}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveStatus === 'saved' && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#1e3a8a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* ACCORDION SECTIONS 1 TO 7 */}
        <div className="fap-accordion-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* SECTION 1: 1. GENERAL INFORMATION */}
          <div id="acc-sec1" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec1')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec1 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>01</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  1. GENERAL INFORMATION
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Pull latest Customer & PIC from FAP stage"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSyncCustomerPicData();
                  }}
                >
                  <RefreshCw size={12} /> Sync Customer Data
                </button>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec1', 'preana-preview-sec-1');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec1 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec1 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pre-Analysis No</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>000/PREANA/MKT/IX/YYYY</span>
                  </label>
                  <input
                    type="text"
                    name="preAnalysisNo"
                    data-field="preAnalysisNo"
                    value={data.preAnalysisNo}
                    onChange={e => updateField('preAnalysisNo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisNo')}
                    placeholder="047/PREANA/MKT/IX/2026"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Pre-Analysis Date</label>
                  <input
                    type="text"
                    name="preAnalysisDate"
                    data-field="preAnalysisDate"
                    value={data.preAnalysisDate}
                    onChange={e => updateField('preAnalysisDate', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisDate')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer / Project</label>
                  <input
                    type="text"
                    name="customerProjectName"
                    data-field="customerProjectName"
                    value={data.customerProjectName}
                    onChange={e => updateField('customerProjectName', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-customerProjectName')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Tax ID (NPWP)</label>
                  <input
                    type="text"
                    name="taxId"
                    data-field="taxId"
                    value={data.taxId}
                    onChange={e => updateField('taxId', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-taxId')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>FAP No</label>
                  <input
                    type="text"
                    name="fapNumber"
                    data-field="fapNumber"
                    value={data.fapNumber}
                    onChange={e => updateField('fapNumber', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-fapNumber')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Lead Source</label>
                  <input
                    type="text"
                    name="leadSource"
                    data-field="leadSource"
                    value={data.leadSource}
                    onChange={e => updateField('leadSource', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-leadSource')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Area</label>
                  <input
                    type="text"
                    name="customerArea"
                    data-field="customerArea"
                    value={data.customerArea}
                    onChange={e => updateField('customerArea', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-customerArea')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Dealer PIC</label>
                  <input
                    type="text"
                    name="dealerPic"
                    data-field="dealerPic"
                    value={data.dealerPic}
                    onChange={e => updateField('dealerPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-dealerPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LMI PIC</label>
                  <input
                    type="text"
                    name="lmiPic"
                    data-field="lmiPic"
                    value={data.lmiPic}
                    onChange={e => updateField('lmiPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-lmiPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LFI PIC</label>
                  <input
                    type="text"
                    name="lfiPic"
                    data-field="lfiPic"
                    value={data.lfiPic}
                    onChange={e => updateField('lfiPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-lfiPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer PIC</label>
                  <input
                    type="text"
                    name="customerPic"
                    data-field="customerPic"
                    value={data.customerPic}
                    onChange={e => updateField('customerPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-customerPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Equity</label>
                  <input
                    type="text"
                    name="equity"
                    data-field="equity"
                    value={data.equity}
                    onChange={e => updateField('equity', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-equity')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Paid up Capital</label>
                  <input
                    type="text"
                    name="paidUpCapital"
                    data-field="paidUpCapital"
                    value={data.paidUpCapital}
                    onChange={e => updateField('paidUpCapital', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-paidUpCapital')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Source of Repayment</label>
                  <input
                    type="text"
                    name="sourceOfRepayment"
                    data-field="sourceOfRepayment"
                    value={data.sourceOfRepayment}
                    onChange={e => updateField('sourceOfRepayment', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-sourceOfRepayment')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: 2. PROJECT INFORMATION */}
          <div id="acc-sec2" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec2')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec2 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>02</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  2. PROJECT INFORMATION
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec2', 'preana-preview-sec-2');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec2 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec2 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Holding Group / Parent Company (Perusahaan Utama)</label>
                  <input
                    type="text"
                    name="holdingGroup"
                    data-field="holdingGroup"
                    value={data.holdingGroup || ''}
                    onChange={e => updateField('holdingGroup', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-holdingGroup')}
                    placeholder="STAR GROUP (PT Sentosa Abadi Raja)"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Name (Nama Objek Proyek)</label>
                    <input
                      type="text"
                      name="projectName"
                      data-field="projectName"
                      value={data.projectName || ''}
                      onChange={e => updateField('projectName', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-projectName')}
                      placeholder="Land Clearing, Wood Hauling & Harvesting"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Location (Lokasi Proyek)</label>
                    <input
                      type="text"
                      name="projectLocation"
                      data-field="projectLocation"
                      value={data.projectLocation || ''}
                      onChange={e => updateField('projectLocation', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-projectLocation')}
                      placeholder="Sumatera Area & Kalimantan Timur"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Existing Projects (Proyek Yang Sedang Berjalan - PT HPS & PT PASS)</span>
                    <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 600 }}>Active Contracts</span>
                  </label>
                  <textarea
                    rows={6}
                    name="existingProjects"
                    data-field="existingProjects"
                    value={data.existingProjects || ''}
                    onChange={e => updateField('existingProjects', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-existingProjects')}
                    placeholder="A. PT Handalan Putramas Santosa (HPS)...\nB. PT Pangan Sejahtera Santosa (PASS)..."
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>New Projects (Pipeline Proyek Baru / Diajukan - PT HTPS)</span>
                    <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 600 }}>Proposed Pipeline</span>
                  </label>
                  <textarea
                    rows={4}
                    name="newProjects"
                    data-field="newProjects"
                    value={data.newProjects || ''}
                    onChange={e => updateField('newProjects', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-newProjects')}
                    placeholder="C. PT Harta Putramas Santosa (HTPS)..."
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Role of Customer</label>
                    <input
                      type="text"
                      name="customerRole"
                      data-field="customerRole"
                      value={data.customerRole}
                      onChange={e => updateField('customerRole', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-customerRole')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Contractor work in the same bowheer</label>
                    <input
                      type="text"
                      name="otherContractors"
                      data-field="otherContractors"
                      value={data.otherContractors}
                      onChange={e => updateField('otherContractors', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-otherContractors')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Owner</label>
                  <textarea
                    rows={2}
                    name="projectOwner"
                    data-field="projectOwner"
                    value={data.projectOwner}
                    onChange={e => updateField('projectOwner', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-projectOwner')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Bowheer Information</label>
                  <textarea
                    rows={4}
                    name="bowheerInfo"
                    data-field="bowheerInfo"
                    value={data.bowheerInfo}
                    onChange={e => updateField('bowheerInfo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-bowheerInfo')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Status</label>
                  <input
                    type="text"
                    name="projectStatus"
                    data-field="projectStatus"
                    value={data.projectStatus}
                    onChange={e => updateField('projectStatus', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-projectStatus')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Investment Plan</label>
                  <textarea
                    rows={3}
                    name="investmentPlan"
                    data-field="investmentPlan"
                    value={data.investmentPlan}
                    onChange={e => updateField('investmentPlan', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-investmentPlan')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Financing Scheme Requested</label>
                  <input
                    type="text"
                    name="financingSchemeRequested"
                    data-field="financingSchemeRequested"
                    value={data.financingSchemeRequested}
                    onChange={e => updateField('financingSchemeRequested', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-financingSchemeRequested')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: 3. CUSTOMER & GROUP BACKGROUND */}
          <div id="acc-sec3" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec3')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec3 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>03</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  3. CUSTOMER & GROUP BACKGROUND
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec3', 'preana-preview-sec-3');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec3 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec3 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBO (Ultimate Beneficiary Owner)</label>
                  <textarea
                    rows={3}
                    name="uboInfo"
                    data-field="uboInfo"
                    value={data.uboInfo}
                    onChange={e => updateField('uboInfo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInfo')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Background (Profil Singkat Entitas & Holding)</label>
                  <textarea
                    rows={3}
                    name="companyBackground"
                    data-field="companyBackground"
                    value={data.companyBackground}
                    onChange={e => updateField('companyBackground', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-companyBackground')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>STAR Group – Key Milestones Narrative (Riwayat & Narasi Ekspansi)</span>
                    <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600 }}>2022 - 2026 Expansion</span>
                  </label>
                  <textarea
                    rows={7}
                    name="starGroupMilestonesNarrative"
                    data-field="starGroupMilestonesNarrative"
                    value={data.starGroupMilestonesNarrative || ''}
                    onChange={e => updateField('starGroupMilestonesNarrative', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-starGroupMilestonesNarrative')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Business Development Background (Kemitraan Herry Tho & Rekam Jejak)</span>
                    <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>Key Risk Factor</span>
                  </label>
                  <textarea
                    rows={5}
                    name="businessDevBackground"
                    data-field="businessDevBackground"
                    value={data.businessDevBackground || ''}
                    onChange={e => updateField('businessDevBackground', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-businessDevBackground')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Information (Kesiapan Tim Lapangan & Personel Harvesting)</label>
                  <textarea
                    rows={3}
                    name="operationalTeamInfo"
                    data-field="operationalTeamInfo"
                    value={data.operationalTeamInfo || ''}
                    onChange={e => updateField('operationalTeamInfo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-operationalTeamInfo')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      UBO Information (Bagan Struktur Kepemilikan & Legalitas Saham Group)
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600, background: '#dbeafe', padding: '1px 6px', borderRadius: '3px' }}>
                      Kolom Terpisah Sebelum Milestones
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    name="uboInformation"
                    data-field="uboInformation"
                    value={data.uboInformation || ''}
                    onChange={e => updateField('uboInformation', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                    placeholder="STAR GROUP Corporate Ownership Structure..."
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '6px', lineHeight: 1.35 }}
                  />
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                      Diagram Struktur Kepemilikan STAR Group (Lampiran Resmi Halaman 3):
                    </div>
                    <img
                      src={getStaticAssetUrl("pre_analysis/star_group_structure.jpg")}
                      alt="STAR Group Structure"
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/pre_analysis/star_group_structure.jpg';
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Milestones</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.milestones || []), { year: '', milestone: '' }];
                        updateField('milestones', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ width: '18%', padding: '6px 8px', textAlign: 'left' }}>Year</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Milestone</th>
                          <th style={{ width: '40px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.milestones || []).map((m, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={m.year || ''}
                                onChange={e => {
                                  const copy = [...data.milestones];
                                  copy[idx] = { ...copy[idx], year: e.target.value };
                                  updateField('milestones', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <textarea
                                rows={2}
                                value={m.milestone || m.description || ''}
                                onChange={e => {
                                  const copy = [...data.milestones];
                                  copy[idx] = { ...copy[idx], milestone: e.target.value };
                                  updateField('milestones', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = data.milestones.filter((_, i) => i !== idx);
                                  updateField('milestones', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Existing Finco Backup</label>
                  <input
                    type="text"
                    name="existingFincoBackup"
                    data-field="existingFincoBackup"
                    value={data.existingFincoBackup}
                    onChange={e => updateField('existingFincoBackup', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-existingFincoBackup')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
          <div id="acc-sec4" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec4')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec4 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>04</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  4. EQUIPMENT POSSIBILITY OF SUCCESS
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec4', 'preana-preview-sec-4');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec4 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec4 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Equipment-to-Job Fit</label>
                    <input
                      type="text"
                      name="equipmentJobFit"
                      data-field="equipmentJobFit"
                      value={data.equipmentJobFit}
                      onChange={e => updateField('equipmentJobFit', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-equipmentJobFit')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Utilization vs Project Duration</label>
                    <input
                      type="text"
                      name="utilizationDuration"
                      data-field="utilizationDuration"
                      value={data.utilizationDuration}
                      onChange={e => updateField('utilizationDuration', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-utilizationDuration')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Current Unit Composition Table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Current Unit Composition (Total: {totalUnits} units)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.unitComposition || []), { kategoriAset: '', brand: '', qty: 0 }];
                        updateField('unitComposition', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Unit
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Kategori Aset</th>
                          <th style={{ width: '25%', padding: '6px 8px', textAlign: 'left' }}>Merk</th>
                          <th style={{ width: '18%', padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ width: '40px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.unitComposition || []).map((u, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={u.kategoriAset || ''}
                                onChange={e => {
                                  const copy = [...data.unitComposition];
                                  copy[idx] = { ...copy[idx], kategoriAset: e.target.value };
                                  updateField('unitComposition', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={u.brand || ''}
                                onChange={e => {
                                  const copy = [...data.unitComposition];
                                  copy[idx] = { ...copy[idx], brand: e.target.value };
                                  updateField('unitComposition', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              <input
                                type="number"
                                value={u.qty || 0}
                                onChange={e => {
                                  const copy = [...data.unitComposition];
                                  copy[idx] = { ...copy[idx], qty: Number(e.target.value) || 0 };
                                  updateField('unitComposition', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = data.unitComposition.filter((_, i) => i !== idx);
                                  updateField('unitComposition', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontWeight: 700 }}>
                        <tr>
                          <td colSpan={2} style={{ padding: '6px 8px' }}>TOTAL</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{totalUnits}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Prior LiuGong Experience</label>
                    <input
                      type="text"
                      name="priorLiugongExperience"
                      data-field="priorLiugongExperience"
                      value={data.priorLiugongExperience}
                      onChange={e => updateField('priorLiugongExperience', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-priorLiugongExperience')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Have Service Agreement / FMC</label>
                    <input
                      type="text"
                      name="serviceAgreementFmc"
                      data-field="serviceAgreementFmc"
                      value={data.serviceAgreementFmc}
                      onChange={e => updateField('serviceAgreementFmc', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-serviceAgreementFmc')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
          <div id="acc-sec5" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec5')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec5 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>05</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  5. UNIT DELIVERY STATUS & QA CHECK
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec5', 'preana-preview-sec-5');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec5 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec5 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Delivery Status</label>
                    <input
                      type="text"
                      name="deliveryStatus"
                      data-field="deliveryStatus"
                      value={data.deliveryStatus}
                      onChange={e => updateField('deliveryStatus', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-deliveryStatus')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Delivery Date</label>
                    <input
                      type="text"
                      name="deliveryDate"
                      data-field="deliveryDate"
                      value={data.deliveryDate}
                      onChange={e => updateField('deliveryDate', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-deliveryDate')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>QA Comment — iLink/GPS Performance Check</label>
                  <input
                    type="text"
                    name="qaIlinkComment"
                    data-field="qaIlinkComment"
                    value={data.qaIlinkComment}
                    onChange={e => updateField('qaIlinkComment', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-qaIlinkComment')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>QA Conclusion</label>
                  <input
                    type="text"
                    name="qaConclusion"
                    data-field="qaConclusion"
                    value={data.qaConclusion}
                    onChange={e => updateField('qaConclusion', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-qaConclusion')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
          <div id="acc-sec6" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec6')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec6 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>06</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  6. CROSS-CHECK WITH DEALER / LMI (quick)
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec6', 'preana-preview-sec-6');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec6 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec6 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dealer Check</span>
                    <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600 }}>Dealer Verification</span>
                  </label>
                  <input
                    type="text"
                    name="dealerCheck"
                    data-field="dealerCheck"
                    value={data.dealerCheck || ''}
                    onChange={e => updateField('dealerCheck', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-dealerCheck')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP from Dealer to Customer</label>
                    <input
                      type="text"
                      name="topDealerToCustomer"
                      data-field="topDealerToCustomer"
                      value={data.topDealerToCustomer}
                      onChange={e => updateField('topDealerToCustomer', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-topDealerToCustomer')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP from LMI to Dealer</label>
                    <input
                      type="text"
                      name="topLmiToDealer"
                      data-field="topLmiToDealer"
                      value={data.topLmiToDealer}
                      onChange={e => updateField('topLmiToDealer', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-topLmiToDealer')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LMI Internal AR Check</label>
                  <input
                    type="text"
                    name="lmiArCheck"
                    data-field="lmiArCheck"
                    value={data.lmiArCheck}
                    onChange={e => updateField('lmiArCheck', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-lmiArCheck')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* Subheading: 1. Sister Company SLIK / Pefindo */}
                <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a' }}>
                      1. PT HANDALAN PUTRAMAS SANTOSA (SISTER COMPANY) :
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.lenderExposures || []), { lender: '', plafond: '', rate: '' }];
                        updateField('lenderExposures', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Lender
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                    {data.slikPefindoHighlight}
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Row Labels</th>
                          <th style={{ width: '32%', padding: '6px 8px', textAlign: 'right' }}>Sum of plafon</th>
                          <th style={{ width: '20%', padding: '6px 8px', textAlign: 'right' }}>Interest Rate</th>
                          <th style={{ width: '36px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.lenderExposures || []).map((lex, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={lex.lender || ''}
                                onChange={e => {
                                  const copy = [...data.lenderExposures];
                                  copy[idx] = { ...copy[idx], lender: e.target.value };
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              <input
                                type="text"
                                value={lex.plafond || ''}
                                onChange={e => {
                                  const copy = [...data.lenderExposures];
                                  copy[idx] = { ...copy[idx], plafond: e.target.value };
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              <input
                                type="text"
                                value={lex.rate || ''}
                                onChange={e => {
                                  const copy = [...data.lenderExposures];
                                  copy[idx] = { ...copy[idx], rate: e.target.value };
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = data.lenderExposures.filter((_, i) => i !== idx);
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Pefindo Analysis Notes</label>
                    <textarea
                      rows={3}
                      name="pefindoNotes"
                      data-field="pefindoNotes"
                      value={data.pefindoNotes}
                      onChange={e => updateField('pefindoNotes', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Commercial Terms on Other Fincos</label>
                    <textarea
                      rows={2}
                      name="pefindoTerms"
                      data-field="pefindoTerms"
                      value={data.pefindoTerms}
                      onChange={e => updateField('pefindoTerms', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Subheading: 2. Applicant Company Check */}
                <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a' }}>
                    2. PT HARTA PUTRA SANTOSA (REQUEST USING THIS COMPANY)
                  </span>
                  <input
                    type="text"
                    name="applicantPefindoCheck"
                    data-field="applicantPefindoCheck"
                    value={data.applicantPefindoCheck}
                    onChange={e => updateField('applicantPefindoCheck', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: 7. EXPERT JUDGEMENT CONCLUSION */}
          <div id="acc-sec7" className="fap-accordion-card" style={{ background: '#ffffff', border: '2px solid #1e3a8a', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec7')}
              style={{
                padding: '10px 14px',
                background: '#eff6ff',
                borderBottom: openSections.sec7 ? '1px solid #bfdbfe' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#1e3a8a', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>07</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  7. EXPERT JUDGEMENT CONCLUSION
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  title="Sync preview document to this section"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerSync('sec7', 'preana-preview-sec-7');
                  }}
                >
                  <Eye size={12} /> Sync View
                </button>
                <span className={`fap-acc-chevron ${openSections.sec7 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec7 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Good Project & Good Customer Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${data.goodProject ? '#86efac' : '#fca5a5'}`, background: data.goodProject ? '#f0fdf4' : '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: data.goodProject ? '#15803d' : '#b91c1c' }}>
                        Good Project? {data.goodProject ? 'YES' : 'NO'}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateField('goodProject', !data.goodProject)}
                        style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      >
                        Toggle
                      </button>
                    </div>
                    <input
                      type="text"
                      value={data.goodProjectNote}
                      onChange={e => updateField('goodProjectNote', e.target.value)}
                      placeholder="e.g. Harvesting Contractor, PT RAPP - APRIL Group"
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${data.goodCustomer ? '#86efac' : '#fca5a5'}`, background: data.goodCustomer ? '#f0fdf4' : '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: data.goodCustomer ? '#15803d' : '#b91c1c' }}>
                        Good Customer? {data.goodCustomer ? 'YES' : 'NO'}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateField('goodCustomer', !data.goodCustomer)}
                        style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      >
                        Toggle
                      </button>
                    </div>
                    <input
                      type="text"
                      value={data.goodCustomerNote}
                      onChange={e => updateField('goodCustomerNote', e.target.value)}
                      placeholder="Customer assessment notes"
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Brief Note</label>
                  <textarea
                    rows={3}
                    name="briefNote"
                    data-field="briefNote"
                    value={data.briefNote}
                    onChange={e => updateField('briefNote', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>RECOMMENDATION</label>
                  <input
                    type="text"
                    name="recommendation"
                    data-field="recommendation"
                    value={data.recommendation}
                    onChange={e => updateField('recommendation', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-recommendation')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: data.recommendation.includes('NOT RECOMMEND') ? '2px solid #ef4444' : '2px solid #22c55e',
                      color: data.recommendation === 'CONDITIONAL' ? '#a16207' : data.recommendation.includes('NOT RECOMMEND') ? '#b91c1c' : '#15803d',
                      background: data.recommendation.includes('NOT RECOMMEND') ? '#fef2f2' : '#f0fdf4'
                    }}
                  />
                </div>

                {/* Suggestions List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Suggestions / Mitigation Limitations</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.suggestions || []), ''];
                        updateField('suggestions', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Item
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(data.suggestions || []).map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={s}
                          onChange={e => {
                            const copy = [...data.suggestions];
                            copy[idx] = e.target.value;
                            updateField('suggestions', copy);
                          }}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = data.suggestions.filter((_, i) => i !== idx);
                            updateField('suggestions', copy);
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competition Information Table */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Competition Information</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.competitionTable || []), { finco: '', rate: '', purpose: '' }];
                        updateField('competitionTable', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Finco
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Finco</th>
                          <th style={{ width: '28%', padding: '6px 8px', textAlign: 'left' }}>Rate (effective)</th>
                          <th style={{ width: '25%', padding: '6px 8px', textAlign: 'left' }}>Purpose</th>
                          <th style={{ width: '36px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={c.finco || ''}
                                onChange={e => {
                                  const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                  copy[idx] = { ...copy[idx], finco: e.target.value };
                                  updateField('competitionTable', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={c.rate || ''}
                                onChange={e => {
                                  const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                  copy[idx] = { ...copy[idx], rate: e.target.value };
                                  updateField('competitionTable', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={c.purpose || ''}
                                onChange={e => {
                                  const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                  copy[idx] = { ...copy[idx], purpose: e.target.value };
                                  updateField('competitionTable', copy);
                                }}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = (data.competitionTable || DEFAULT_COMPETITION_TABLE).filter((_, i) => i !== idx);
                                  updateField('competitionTable', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sign-offs (Area Tanda Tangan Diperlebar & Terstruktur) */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>Area Tanda Tangan & Otorisasi Komite</span>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Kolom tanda tangan diperluas untuk otorisasi formal (Propose, Review, Approve)</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      3 Komite Wajib
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Propose by Card */}
                    <div style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>1. Propose by :</span>
                        <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Marketing / Sales
                        </span>
                      </div>
                      <div style={{
                        height: '75px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>( Ruang Tanda Tangan Basah / Digital & Stempel )</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Area tanda tangan diperlebar</span>
                      </div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Nama & Jabatan Pengusul :</label>
                      <textarea
                        rows={2}
                        name="proposedBy"
                        data-field="proposedBy"
                        value={data.proposedBy}
                        onChange={e => updateField('proposedBy', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-proposedBy')}
                        placeholder="Amanda Cynthia&#10;Senior Account Manager"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', lineHeight: 1.4 }}
                      />
                    </div>

                    {/* Reviewed by Card */}
                    <div style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>2. Reviewed by :</span>
                        <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Risk & Credit Dept Head
                        </span>
                      </div>
                      <div style={{
                        height: '75px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>( Ruang Tanda Tangan Basah / Digital & Stempel )</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Area tanda tangan diperlebar</span>
                      </div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Nama & Jabatan Reviewer :</label>
                      <textarea
                        rows={2}
                        name="reviewedBy"
                        data-field="reviewedBy"
                        value={data.reviewedBy}
                        onChange={e => updateField('reviewedBy', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-reviewedBy')}
                        placeholder="Maria Regina&#10;Dept. Head"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', lineHeight: 1.4 }}
                      />
                    </div>

                    {/* Approved by Card */}
                    <div style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>3. Approved by :</span>
                        <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Director / Credit Committee
                        </span>
                      </div>
                      <div style={{
                        height: '75px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>( Ruang Tanda Tangan Basah / Digital & Stempel )</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Area tanda tangan diperlebar</span>
                      </div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Nama & Jabatan Approver :</label>
                      <textarea
                        rows={2}
                        name="approvedBy"
                        data-field="approvedBy"
                        value={data.approvedBy}
                        onChange={e => updateField('approvedBy', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-approvedBy')}
                        placeholder="Jembar Ganda E&#10;Director"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', lineHeight: 1.4 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: 50% LIVE DOCUMENT PREVIEW (DIGITAL TWIN 1:1 WITH PDF) */}
      <div className="fap-detail-preview-col" style={{ flex: '1 1 50%', width: '50%', minWidth: 0, height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Ribbon Toolbar */}
        <div style={{
          height: '42px',
          background: '#1b365d',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderRadius: '8px 8px 0 0',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} />
            <span>PRE-ANALYSIS — EXPERT JUDGEMENT</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>Ref: {data.preAnalysisNo}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setViewMode('digital-twin')}
                style={{
                  background: viewMode === 'digital-twin' ? '#ffffff' : 'transparent',
                  color: viewMode === 'digital-twin' ? '#1b365d' : '#ffffff',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Digital Twin
              </button>
              <button
                type="button"
                onClick={() => setViewMode('original-pdf')}
                style={{
                  background: viewMode === 'original-pdf' ? '#ffffff' : 'transparent',
                  color: viewMode === 'original-pdf' ? '#1b365d' : '#ffffff',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Original PDF
              </button>
            </div>

            {viewMode === 'digital-twin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.4, Number((prev - 0.05).toFixed(2))))}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <span style={{ fontSize: '0.72rem', minWidth: '32px', textAlign: 'center' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(1.2, Number((prev + 0.05).toFixed(2))))}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px' }}
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(0.75)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px' }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                color: '#1b365d',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div style={{
          flex: 1,
          height: 'calc(100% - 42px)',
          overflowY: 'auto',
          overflowX: 'auto',
          background: '#f1f5f9',
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {viewMode === 'original-pdf' ? (
            <iframe
              src={`${getStaticAssetUrl("pre_analysis/pre_analysis_sample.pdf")}#toolbar=1`}
              title="Original Pre-Analysis PDF"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '700px',
                border: 'none',
                borderRadius: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}
            />
          ) : (
            /* Digital Twin Document Render */
            <div
              style={{
                width: '840px',
                minWidth: '840px',
                zoom: zoomLevel,
                background: '#ffffff',
                boxShadow: '0 4px 24px rgba(15, 23, 42, 0.12)',
                border: '1px solid #cbd5e1',
                padding: '36px 40px',
                fontFamily: 'Calibri, Arial, sans-serif',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* Document Header */}
              <div style={{ marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '18pt', fontWeight: 800, color: '#1b365d', letterSpacing: '-0.2px' }}>
                  PRE-ANALYSIS — EXPERT JUDGEMENT
                </h1>
                <div style={{ fontSize: '11pt', fontWeight: 700, color: '#1b365d', marginTop: '2px' }}>
                  (Quick Screening, Interview Base)
                </div>
                <div id="preana-preview-cell-preAnalysisNo" style={{ fontSize: '10pt', color: '#000000', marginTop: '4px' }}>
                  No. : {data.preAnalysisNo}
                </div>
              </div>

              {/* Top Thick Navy Divider */}
              <div style={{ height: '3px', background: '#1b365d', marginBottom: '8px' }} />

              {/* SECTION 1: 1. GENERAL INFORMATION TABLE */}
              <table
                id="preana-preview-sec-1"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '16px' }}
              >
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '22%', padding: '4px 6px', fontWeight: 700 }}>Customer / Project</td>
                    <td id="preana-preview-cell-customerProjectName" onClick={() => handlePreviewCellClick('customerProjectName', 'sec1')} style={{ width: '48%', padding: '4px 6px', fontWeight: 700, color: '#1b365d', cursor: 'pointer' }}>{data.customerProjectName}</td>
                    <td style={{ width: '14%', padding: '4px 6px', fontWeight: 700 }}>Dealer PIC</td>
                    <td id="preana-preview-cell-dealerPic" onClick={() => handlePreviewCellClick('dealerPic', 'sec1')} style={{ width: '16%', padding: '4px 6px', cursor: 'pointer' }}>{data.dealerPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Tax ID (NPWP)</td>
                    <td id="preana-preview-cell-taxId" onClick={() => handlePreviewCellClick('taxId', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.taxId}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LMI PIC</td>
                    <td id="preana-preview-cell-lmiPic" onClick={() => handlePreviewCellClick('lmiPic', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.lmiPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>FAP No</td>
                    <td id="preana-preview-cell-fapNumber" onClick={() => handlePreviewCellClick('fapNumber', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.fapNumber}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LFI PIC</td>
                    <td id="preana-preview-cell-lfiPic" onClick={() => handlePreviewCellClick('lfiPic', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.lfiPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Lead Source</td>
                    <td id="preana-preview-cell-leadSource" onClick={() => handlePreviewCellClick('leadSource', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.leadSource}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Customer PIC</td>
                    <td id="preana-preview-cell-customerPic" onClick={() => handlePreviewCellClick('customerPic', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.customerPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Customer Area</td>
                    <td id="preana-preview-cell-customerArea" onClick={() => handlePreviewCellClick('customerArea', 'sec1')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.customerArea}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Pre-Analysis Date</td>
                    <td id="preana-preview-cell-preAnalysisDate" onClick={() => handlePreviewCellClick('preAnalysisDate', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.preAnalysisDate}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Equity</td>
                    <td id="preana-preview-cell-equity" onClick={() => handlePreviewCellClick('equity', 'sec1')} colSpan={3} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.equity}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Paid up Capital</td>
                    <td id="preana-preview-cell-paidUpCapital" onClick={() => handlePreviewCellClick('paidUpCapital', 'sec1')} colSpan={3} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.paidUpCapital}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Source of Repayment</td>
                    <td id="preana-preview-cell-sourceOfRepayment" onClick={() => handlePreviewCellClick('sourceOfRepayment', 'sec1')} colSpan={3} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.sourceOfRepayment}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 2: 2. PROJECT INFORMATION */}
              <div
                id="preana-preview-sec-2"
                onClick={() => handlePreviewCellClick('projectNameLocation', 'sec2')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                2. PROJECT INFORMATION
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Holding Group / Main Company</td>
                    <td id="preana-preview-cell-holdingGroup" onClick={() => handlePreviewCellClick('holdingGroup', 'sec2')} style={{ width: '74%', padding: '4px 6px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer' }}>
                      {data.holdingGroup || 'STAR GROUP (PT Sentosa Abadi Raja)'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Name</td>
                    <td id="preana-preview-cell-projectName" onClick={() => handlePreviewCellClick('projectName', 'sec2')} style={{ padding: '4px 6px', fontWeight: 600, cursor: 'pointer' }}>
                      {data.projectName || 'Land Clearing, Wood Hauling & Forestry Harvesting Operations'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Location</td>
                    <td id="preana-preview-cell-projectLocation" onClick={() => handlePreviewCellClick('projectLocation', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>
                      {data.projectLocation || 'Head Office: Jakarta | Sites: Sumatera Area (Riau, Pelalawan, South Sumatra) & Kalimantan Timur'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Existing Projects</td>
                    <td id="preana-preview-cell-existingProjects" onClick={() => handlePreviewCellClick('existingProjects', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#f8fafc' }}>
                      {data.existingProjects}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>New Projects</td>
                    <td id="preana-preview-cell-newProjects" onClick={() => handlePreviewCellClick('newProjects', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#fffbeb' }}>
                      {data.newProjects}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Role of Customer</td>
                    <td id="preana-preview-cell-customerRole" onClick={() => handlePreviewCellClick('customerRole', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.customerRole}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Other Contractor work in the same bowheer</td>
                    <td id="preana-preview-cell-otherContractors" onClick={() => handlePreviewCellClick('otherContractors', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.otherContractors}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Owner</td>
                    <td id="preana-preview-cell-projectOwner" onClick={() => handlePreviewCellClick('projectOwner', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.projectOwner}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Bowheer Information</td>
                    <td id="preana-preview-cell-bowheerInfo" onClick={() => handlePreviewCellClick('bowheerInfo', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.bowheerInfo}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Status</td>
                    <td id="preana-preview-cell-projectStatus" onClick={() => handlePreviewCellClick('projectStatus', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.projectStatus}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Investment Plan</td>
                    <td id="preana-preview-cell-investmentPlan" onClick={() => handlePreviewCellClick('investmentPlan', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.investmentPlan}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Financing Scheme Requested</td>
                    <td id="preana-preview-cell-financingSchemeRequested" onClick={() => handlePreviewCellClick('financingSchemeRequested', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.financingSchemeRequested}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 3: 3. CUSTOMER & GROUP BACKGROUND */}
              <div
                id="preana-preview-sec-3"
                onClick={() => handlePreviewCellClick('uboInfo', 'sec3')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                3. CUSTOMER & GROUP BACKGROUND
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>UBO (Ultimate Beneficiary Owner)</td>
                    <td id="preana-preview-cell-uboInfo" onClick={() => handlePreviewCellClick('uboInfo', 'sec3')} style={{ width: '74%', padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>
                      {data.ubo || data.uboInfo}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Company Background</td>
                    <td id="preana-preview-cell-companyBackground" onClick={() => handlePreviewCellClick('companyBackground', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', fontWeight: 600, color: '#1e3a8a' }}>
                      {data.companyBackground}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>STAR Group – Key Milestones</td>
                    <td id="preana-preview-cell-starGroupMilestonesNarrative" onClick={() => handlePreviewCellClick('starGroupMilestonesNarrative', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#f8fafc' }}>
                      {data.starGroupMilestonesNarrative}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Business Development Background</td>
                    <td id="preana-preview-cell-businessDevBackground" onClick={() => handlePreviewCellClick('businessDevBackground', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#fffbeb' }}>
                      {data.businessDevBackground}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Other information :</td>
                    <td id="preana-preview-cell-operationalTeamInfo" onClick={() => handlePreviewCellClick('operationalTeamInfo', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>
                      {data.operationalTeamInfo}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700, verticalAlign: 'top' }}>
                      UBO Information
                    </td>
                    <td id="preana-preview-cell-uboInformation" onClick={() => handlePreviewCellClick('uboInformation', 'sec3')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>
                      <div style={{ fontSize: '8.5pt', color: '#1e293b', whiteSpace: 'pre-line', marginBottom: '8px', lineHeight: 1.4 }}>
                        {data.uboInformation}
                      </div>
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', background: '#f8fafc' }}>
                        <div style={{ fontSize: '8pt', fontWeight: 700, color: '#1e3a8a', marginBottom: '4px' }}>
                          BAGAN STRUKTUR KEPEMILIKAN SAHAM GROUP (HALAMAN 3):
                        </div>
                        <img
                          src={getStaticAssetUrl("pre_analysis/star_group_structure.jpg")}
                          alt="STAR Group Corporate Structure"
                          style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '3px' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/pre_analysis/star_group_structure.jpg';
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Company Milestones</td>
                    <td style={{ padding: '4px 6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ width: '20%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Year</th>
                            <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Milestone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.milestones || []).map((m, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{m.year}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{m.milestone || m.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Existing Finco Backup</td>
                    <td id="preana-preview-cell-existingFincoBackup" onClick={() => handlePreviewCellClick('existingFincoBackup', 'sec3')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.existingFincoBackup}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
              <div
                id="preana-preview-sec-4"
                onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                4. EQUIPMENT POSSIBILITY OF SUCCESS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Equipment-to-Job Fit</td>
                    <td id="preana-preview-cell-equipmentJobFit" onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.equipmentJobFit}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Utilization vs Project Duration</td>
                    <td id="preana-preview-cell-utilizationDuration" onClick={() => handlePreviewCellClick('utilizationDuration', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.utilizationDuration}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Current Unit Composition</td>
                    <td style={{ padding: '4px 6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Kategori Aset</th>
                            <th style={{ width: '25%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Merk</th>
                            <th style={{ width: '18%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.unitComposition || []).map((u, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{u.kategoriAset || '-'}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{u.brand}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{u.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td colSpan={2} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>TOTAL</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{totalUnits}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Prior LiuGong Experience</td>
                    <td id="preana-preview-cell-priorLiugongExperience" onClick={() => handlePreviewCellClick('priorLiugongExperience', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.priorLiugongExperience}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Have Service Agreement / FMC</td>
                    <td id="preana-preview-cell-serviceAgreementFmc" onClick={() => handlePreviewCellClick('serviceAgreementFmc', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.serviceAgreementFmc}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
              <div
                id="preana-preview-sec-5"
                onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                5. UNIT DELIVERY STATUS & QA CHECK
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Delivery Status</td>
                    <td id="preana-preview-cell-deliveryStatus" onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.deliveryStatus}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Delivery Date</td>
                    <td id="preana-preview-cell-deliveryDate" onClick={() => handlePreviewCellClick('deliveryDate', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.deliveryDate}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>QA Comment — iLink/GPS Performance Check</td>
                    <td id="preana-preview-cell-qaIlinkComment" onClick={() => handlePreviewCellClick('qaIlinkComment', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.qaIlinkComment}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>QA Conclusion</td>
                    <td id="preana-preview-cell-qaConclusion" onClick={() => handlePreviewCellClick('qaConclusion', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.qaConclusion}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
              <div
                id="preana-preview-sec-6"
                onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                6. CROSS-CHECK WITH DEALER / LMI (quick)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Dealer Check</td>
                    <td id="preana-preview-cell-dealerCheck" onClick={() => handlePreviewCellClick('dealerCheck', 'sec6')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer', fontWeight: 600 }}>{data.dealerCheck}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>TOP from Dealer to Customer</td>
                    <td id="preana-preview-cell-topDealerToCustomer" onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.topDealerToCustomer}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>TOP from LMI to Dealer</td>
                    <td id="preana-preview-cell-topLmiToDealer" onClick={() => handlePreviewCellClick('topLmiToDealer', 'sec6')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.topLmiToDealer}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LMI Internal AR Check</td>
                    <td id="preana-preview-cell-lmiArCheck" onClick={() => handlePreviewCellClick('lmiArCheck', 'sec6')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.lmiArCheck}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>SLIK/Bureau Highlight</td>
                    <td style={{ padding: '4px 6px' }}>
                      <div style={{ fontWeight: 700, color: '#1b365d', marginBottom: '4px' }}>
                        1. PT HANDALAN PUTRAMAS SANTOSA (SISTER COMPANY) :
                      </div>
                      <div style={{ fontStyle: 'italic', marginBottom: '6px', fontSize: '8pt', color: '#475569' }}>
                        {data.slikPefindoHighlight}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '8px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Row Labels</th>
                            <th style={{ width: '35%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Sum of plafon</th>
                            <th style={{ width: '22%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Interest Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.lenderExposures || []).map((lex, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{lex.lender}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{lex.plafond}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{lex.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>Grand Total</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>80.673.526.173,00</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>-</td>
                          </tr>
                        </tfoot>
                      </table>
                      <div style={{ whiteSpace: 'pre-line', fontSize: '8pt', color: '#334155', marginBottom: '6px' }}>
                        {data.pefindoNotes}
                      </div>
                      <div style={{ fontSize: '8pt', color: '#334155', fontWeight: 600, background: '#f8fafc', padding: '4px', border: '1px solid #e2e8f0' }}>
                        {data.pefindoTerms}
                      </div>
                      <div style={{ fontWeight: 700, color: '#1b365d', marginTop: '10px' }}>
                        2. PT HARTA PUTRA SANTOSA (REQUEST USING THIS COMPANY) - {data.applicantPefindoCheck}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 7: 7. EXPERT JUDGEMENT CONCLUSION */}
              <div
                id="preana-preview-sec-7"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                7. EXPERT JUDGEMENT CONCLUSION
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ width: '30%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Aspect</th>
                    <th style={{ width: '20%', padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Assessment</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Good Project?</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: data.goodProject ? '#16a34a' : '#dc2626' }}>
                      {data.goodProject ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0' }}>{data.goodProjectNote}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Good Customer?</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: data.goodCustomer ? '#16a34a' : '#dc2626' }}>
                      {data.goodCustomer ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0' }}>{data.goodCustomerNote}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: '10px', fontSize: '9pt' }}>
                <span style={{ fontWeight: 700 }}>Brief Note:</span>
                <div style={{ whiteSpace: 'pre-line', marginTop: '2px', color: '#1e293b' }}>
                  {data.briefNote}
                </div>
              </div>

              {/* Recommendation Callout */}
              <div
                id="preana-preview-cell-recommendation"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                style={{
                  background: data.recommendation === 'CONDITIONAL' ? '#fef9c3' : data.recommendation.includes('NOT RECOMMEND') ? '#fee2e2' : '#dcfce7',
                  border: `2px solid ${data.recommendation.includes('NOT RECOMMEND') ? '#ef4444' : '#22c55e'}`,
                  color: data.recommendation.includes('NOT RECOMMEND') ? '#991b1b' : '#166534',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '11pt',
                  textAlign: 'center',
                  marginBottom: '12px',
                  letterSpacing: '0.3px',
                  cursor: 'pointer'
                }}
              >
                RECOMMENDATION: {data.recommendation}
              </div>

              {/* Suggestion Bullet Points */}
              <div style={{ marginBottom: '14px', fontSize: '8.5pt' }}>
                <span style={{ fontWeight: 700 }}>Suggestion:</span>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  {(data.suggestions || []).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '2px' }}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Competition Information Table */}
              <div style={{ marginTop: '14px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '4px' }}>
                  Competition Information
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Finco</th>
                      <th style={{ width: '25%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Rate (effective)</th>
                      <th style={{ width: '25%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{c.finco}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{c.rate}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{c.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Approvals / Sign-off Footer - Widened & Formal Executive Format */}
              <div style={{ marginTop: '36px', marginBottom: '28px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '9pt',
                  border: '1.5px solid #000000',
                  background: '#ffffff'
                }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #000000' }}>
                      <th style={{ width: '33.33%', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '9pt', color: '#000000', borderRight: '1.5px solid #000000' }}>
                        Propose by :
                      </th>
                      <th style={{ width: '33.33%', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '9pt', color: '#000000', borderRight: '1.5px solid #000000' }}>
                        Reviewed by :
                      </th>
                      <th style={{ width: '33.34%', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '9pt', color: '#000000' }}>
                        Approved by :
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Generous signature clearance - 95px height */}
                    <tr style={{ height: '95px' }}>
                      <td
                        id="preana-preview-cell-sign-propose"
                        onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
                        style={{ padding: '10px', verticalAlign: 'bottom', borderRight: '1.5px solid #000000', cursor: 'pointer', height: '95px' }}
                      >
                        <div style={{ minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '7.5pt' }}>
                          ( Tanda Tangan / Stempel )
                        </div>
                      </td>
                      <td
                        id="preana-preview-cell-sign-review"
                        onClick={() => handlePreviewCellClick('reviewedBy', 'sec7')}
                        style={{ padding: '10px', verticalAlign: 'bottom', borderRight: '1.5px solid #000000', cursor: 'pointer', height: '95px' }}
                      >
                        <div style={{ minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '7.5pt' }}>
                          ( Tanda Tangan / Stempel )
                        </div>
                      </td>
                      <td
                        id="preana-preview-cell-sign-approve"
                        onClick={() => handlePreviewCellClick('approvedBy', 'sec7')}
                        style={{ padding: '10px', verticalAlign: 'bottom', cursor: 'pointer', height: '95px' }}
                      >
                        <div style={{ minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '7.5pt' }}>
                          ( Tanda Tangan / Stempel )
                        </div>
                      </td>
                    </tr>
                    {/* Signatory Names & Positions */}
                    <tr style={{ borderTop: '1px solid #000000' }}>
                      <td
                        id="preana-preview-cell-proposedBy"
                        onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
                        style={{ padding: '8px 10px', verticalAlign: 'top', borderRight: '1.5px solid #000000', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#000000', textDecoration: 'underline' }}>
                          {data.proposedBy.split('\n')[0] || data.proposedBy}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#1e293b', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {data.proposedBy.split('\n').slice(1).join('\n') || 'Senior Account Manager'}
                        </div>
                        <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '6px' }}>Date: ____ / ____ / 2026</div>
                      </td>
                      <td
                        id="preana-preview-cell-reviewedBy"
                        onClick={() => handlePreviewCellClick('reviewedBy', 'sec7')}
                        style={{ padding: '8px 10px', verticalAlign: 'top', borderRight: '1.5px solid #000000', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#000000', textDecoration: 'underline' }}>
                          {data.reviewedBy.split('\n')[0] || data.reviewedBy}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#1e293b', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {data.reviewedBy.split('\n').slice(1).join('\n') || 'Dept. Head'}
                        </div>
                        <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '6px' }}>Date: ____ / ____ / 2026</div>
                      </td>
                      <td
                        id="preana-preview-cell-approvedBy"
                        onClick={() => handlePreviewCellClick('approvedBy', 'sec7')}
                        style={{ padding: '8px 10px', verticalAlign: 'top', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#000000', textDecoration: 'underline' }}>
                          {data.approvedBy.split('\n')[0] || data.approvedBy}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#1e293b', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {data.approvedBy.split('\n').slice(1).join('\n') || 'Director'}
                        </div>
                        <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '6px' }}>Date: ____ / ____ / 2026</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    

</div>
  );
}
