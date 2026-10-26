import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Eye,
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
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileSearch,
  ExternalLink,
  ShieldCheck,
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
  projectNameLocation: string;
  customerRole: string;
  otherContractors: string;
  projectOwner: string;
  bowheerInfo: string;
  projectStatus: string;
  investmentPlan: string;
  financingSchemeRequested: string;

  // 3. CUSTOMER & GROUP BACKGROUND
  uboInfo: string;
  companyBackground: string;
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
  topDealerToCustomer: string;
  topLmiToDealer: string;
  lmiArCheck: string;
  slikPefindoHighlight: string;
  applicantPefindoCheck: string;
  pefindoTerms: string;
  pefindoNotes: string;
  lenderExposures: LenderExposureItem[];

  // 7. EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION
  goodProject: boolean;
  goodProjectNote: string;
  goodCustomer: boolean;
  goodCustomerNote: string;
  recommendation: 'RECOMMEND' | 'NOT RECOMMEND TO FULL DOCUMENTATION' | 'CONDITIONAL' | string;
  briefNote: string;
  suggestionOverview: string;
  suggestions: string[];
  mitigationConditions: string[];
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

export function syncCustomerAndPicIntoPreAnalysis(
  current: PreAnalysisData,
  sources: {
    customer?: any;
    pic?: any;
    application?: any;
    profile?: any;
  }
): PreAnalysisData {
  const companyName = sources.customer?.companyName || sources.application?.customer?.companyName || sources.profile?.customer?.companyName || current.customerProjectName;
  const npwp = sources.customer?.npwp || sources.application?.customer?.npwp || sources.profile?.customer?.npwp || current.taxId;
  const fapNumber = sources.application?.fapNumber || current.fapNumber;

  const pic = sources.pic || sources.application?.pic || sources.profile?.pic;
  const customerPic = pic?.picName
    ? `${pic.picName}${pic.position ? ` (${pic.position})` : ''}`
    : current.customerPic;

  const city = sources.customer?.city || sources.application?.customer?.city || '';
  const province = sources.customer?.province || sources.application?.customer?.province || '';
  const customerArea = city ? `${city}${province ? `, ${province}` : ''}` : (province || current.customerArea);

  const sourceOfRepayment = sources.application?.repaymentSource || current.sourceOfRepayment;

  return {
    ...current,
    customerProjectName: companyName,
    taxId: npwp,
    fapNumber,
    customerPic,
    customerArea,
    sourceOfRepayment
  };
}

export const defaultInitialData: PreAnalysisData = {
  preAnalysisNo: '001/PREANA/MKT/IX/2026',
  preAnalysisDate: '07-Sep-2026',
  customerProjectName: 'PT Handalan Putramas Santosa (HPS)',
  taxId: '27.817.616.9-041.000',
  fapNumber: '070/AF/VIII/2026',
  leadSource: 'LMI',
  customerArea: 'Sumatera Area / Riau / Jakarta',
  dealerPic: 'Direct to LMI',
  lmiPic: 'Deny Ardhian',
  lfiPic: 'Amanda Cynthia',
  customerPic: 'Mr. Abraham (Business Director)',
  equity: 'IDR 130.000.000.000 (as of Last deed no 8, 8 June 2026)',
  paidUpCapital: 'IDR 32.500.000.000',
  sourceOfRepayment: 'Income / Others',

  projectNameLocation: 'STAR GROUP Project Portfolio:\nA. PT Handalan Putramas Santosa (HPS) - RAPP, SBA Wood, BMH (Start Dec 2024 - ongoing)\nB. PT Pelayaran Andalan Santosa (PAS) - Transport (Ongoing)\nC. PT Harta Putramas Santosa (HTPS) - Harvesting (Start Oct 2026)',
  customerRole: 'Main Contractor / Sub-Contractor',
  otherContractors: 'KAP, BAP, HJM, RPP, WBS, etc.',
  projectOwner: 'PT Riau Andalan Pulp & Paper (APRIL Group)',
  bowheerInfo: 'RAPP Pelalawan Concession, Riau Province. Long-term concession license valid through 2045.',
  projectStatus: 'Active harvesting & hauling contract for wood fiber supplying Pangkalan Kerinci mill.',
  investmentPlan: 'Procurement of 10 Units Heavy Equipment for capacity ramp-up Q4 2026.',
  financingSchemeRequested: 'Leasing with balloon payment or normal installment 36 months tenor, 20% down payment.',

  uboInfo: 'Mr. Hansen Santosa (80% shares via holding PT PASS), Mr. Hendry Santosa (20% shares). Ultimate Beneficial Owner is Mr. Hansen Santosa.',
  companyBackground: 'HPS established in 2024 as dedicated forestry contractor unit under Star Group. Star Group itself has operated logistics & maritime transport since 2012 across Sumatera and Java.',
  milestones: [
    { year: '2012', entity: 'PT Pelayaran Andalan Santosa (PAS)', description: 'Established transport & barging company with 8 tug & barges.' },
    { year: '2018', entity: 'Star Logistics Holding', description: 'Consolidation of FMCG distribution fleet across Riau and Jambi.' },
    { year: '2024', entity: 'PT Handalan Putramas Santosa (HPS)', description: 'Established forestry contractor division and entered RAPP supplier network.' },
    { year: '2026', entity: 'PT Harta Putramas Santosa (HTPS)', description: 'Formed new legal entity for harvesting operation expansion.' }
  ],
  existingFincoBackup: 'SAN Finance, Astra Credit Companies (ACC), Dipo Star Finance, Komatsu Astra Finance (KAF).',

  equipmentJobFit: 'Forestry Excavators (922E/920E forestry package) with log grapple & high-ground clearance track shoes.',
  utilizationDuration: 'Planned 18-20 hours/day across 2 shifts in concession blocks.',
  priorLiugongExperience: 'Customer has operated 4 units LiuGong 922E with zero major powertrain breakdown over 3,500 hours.',
  serviceAgreementFmc: 'Full Maintenance Contract (FMC) backed by PT LiuGong Machinery Indonesia & authorized regional dealer.',
  unitComposition: [
    { kategoriAset: 'Forestry Excavator', brand: 'LiuGong', type: '922E Forestry Spec', qty: 6 },
    { kategoriAset: 'Wheel Loader', brand: 'LiuGong', type: '856H Log Handler', qty: 2 },
    { kategoriAset: 'Motor Grader', brand: 'LiuGong', type: '4180D Concession Road', qty: 2 }
  ],

  deliveryStatus: 'Not yet Deliver',
  deliveryDate: 'Waiting DP and Contract Signing',
  qaIlinkComment: 'GPS iLink unit ready for installation upon delivery to RAPP concession.',
  qaConclusion: 'Passed preliminary unit check.',

  topDealerToCustomer: '30 days after unit commissioning on site',
  topLmiToDealer: '45 days invoice settlement backed by LFI commitment letter',
  lmiArCheck: 'Clear record, no overdue or write-off history with LMI or dealers.',
  slikPefindoHighlight: 'SLIK Kol 1 Smooth across all commercial lenders. Total facility IDR 80.67 Bio.',
  applicantPefindoCheck: 'NO RECORD SINCE ITS NEWLY ESTABLISHED',
  pefindoTerms: 'Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract',
  pefindoNotes: '- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.\n- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank,\n- New business diversification, PT HTPS doesnt have any experience in Harvesting.',
  lenderExposures: [
    { lender: 'SANF', plafond: 'IDR 35.000.000.000', rate: 'Flat 7.25% p.a.' },
    { lender: 'ACC', plafond: 'IDR 24.500.000.000', rate: 'Flat 7.00% p.a.' },
    { lender: 'Dipo Star Finance', plafond: 'IDR 12.000.000.000', rate: 'Flat 7.50% p.a.' },
    { lender: 'Bank Mandiri', plafond: 'IDR 9.173.526.173', rate: 'Floating 9.25% eff' }
  ],

  goodProject: true,
  goodProjectNote: 'Long-term captive wood supply contract with APRIL Group (RAPP). High off-taker reliability.',
  goodCustomer: false,
  goodCustomerNote: 'Entity newly incorporated in 2024 with limited standalone financial track record; relies heavily on Group operational experience.',
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
  briefNote: 'Key risks identified: Customer newly established (2024) with lack of harvesting experience; sister company PT PASS focuses only on FMCG transport; no closed contracts yet in Pefindo.',
  suggestionOverview: 'Corporate Guarantee from PT PASS and Personal Guarantee from Mr. Hansen Santosa are mandatory.',
  suggestions: [
    'Corporate Guarantee from PT PASS (Star Group parent holding with proven revenue).',
    'Personal Guarantee from Mr. Hansen Santosa (ultimate beneficial owner) with asset pledge.',
    'Escrow Account mechanism with Bowheer (RAPP) or direct payment split agreement.',
    'Pre-Delivery inspection and strict iLink GPS tracking with remote immobilizer protocol.'
  ],
  mitigationConditions: [
    'Corporate Guarantee from PT PASS (Star Group parent holding with proven revenue).',
    'Personal Guarantee from Mr. Hansen Santosa (ultimate beneficial owner) with asset pledge.',
    'Escrow Account mechanism with Bowheer (RAPP) or direct payment split agreement.',
    'Pre-Delivery inspection and strict iLink GPS tracking with remote immobilizer protocol.'
  ],
  competitionTable: DEFAULT_COMPETITION_TABLE,
  competitionNotes: 'Pefindo check 4 Sept 2026. Rate benchmark: Flat 7% p.a., 20% Security Deposit, 36-month lease tenor, 1% provision fee, IDR 5.000.000 admin fee per contract.',
  proposedBy: 'Amanda Cynthia (Senior Account Manager)',
  reviewedBy: 'Maria Regina (Dept. Head)',
  approvedBy: 'Jembar Ganda E (Director)'
};

export interface PreAnalysisFormProps {
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


const getStaticAssetUrl = (relativePath: string) => {
  const isCrmPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/crm-dashboard');
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return isCrmPath ? `/crm-dashboard/${cleanPath}` : `/${cleanPath}`;
};

export function PreAnalysisForm(props: PreAnalysisFormProps) {
  const [data, setData] = useState<PreAnalysisData>(() => {
    return syncCustomerAndPicIntoPreAnalysis(defaultInitialData, {
      customer: props.customer || props.profile?.customer,
      pic: props.pic || props.profile?.pic,
      application: props.application,
      profile: props.profile
    });
  });

  const [activeSyncSection, setActiveSyncSection] = useState<string>('sec1');
  const [viewMode, setViewMode] = useState<'digital-twin' | 'original-pdf'>('digital-twin');
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Accordion section toggles
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: false,
    sec4: false,
    sec5: false,
    sec6: false,
    sec7: false
  });

  const previewContainerRef = useRef<HTMLDivElement>(null);

  const toggleSection = (secKey: string) => {
    setOpenSections(prev => ({ ...prev, [secKey]: !prev[secKey] }));
  };

  const scrollToPreviewElement = (targetId: string) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    setTimeout(() => {
      const vp = previewContainerRef.current;
      const target = document.getElementById(targetId);
      if (!vp || !target) return;

      const vpRect = vp.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const delta = targetRect.top - vpRect.top;

      vp.scrollBy({ top: delta - 80, behavior: 'smooth' });

      target.classList.remove('fap-preview-sync-highlight');
      void target.offsetWidth;
      target.classList.add('fap-preview-sync-highlight');
      setTimeout(() => {
        target.classList.remove('fap-preview-sync-highlight');
      }, 1500);
    }, 100);
  };

  const handleTriggerSync = (secKey: string, previewElementId: string) => {
    setActiveSyncSection(secKey);
    scrollToPreviewElement(previewElementId);
  };

  const handlePreviewCellClick = (fieldName: string, secKey: string) => {
    setOpenSections(prev => ({ ...prev, [secKey]: true }));
    setTimeout(() => {
      const fieldEl = document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement;
      if (fieldEl) {
        fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldEl.focus();
        fieldEl.classList.add('fap-preview-sync-highlight');
        setTimeout(() => fieldEl.classList.remove('fap-preview-sync-highlight'), 1200);
      }
    }, 120);
  };

  const handlePrintPreAnalysis = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      props.notify?.('Pop-up window blocked. Please allow popups to print the form.');
      return;
    }

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pre-Analysis Form - ${data.preAnalysisNo}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 8.5pt; color: #000; margin: 0; padding: 0; line-height: 1.35; }
    h2 { font-size: 11pt; margin: 0 0 4px 0; color: #1b365d; }
    .banner { background: #1b365d; color: #fff; font-weight: bold; font-size: 9pt; padding: 4px 8px; margin: 10px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8pt; }
    td, th { padding: 4px 6px; border: 1px solid #94a3b8; vertical-align: top; }
    .rec-box { padding: 6px; text-align: center; font-weight: bold; font-size: 10pt; margin: 8px 0; border: 2px solid #000; }
    .rec-box.recommend { background: #dcfce7; border-color: #16a34a; color: #166534; }
    .rec-box.not-recommend { background: #fee2e2; border-color: #dc2626; color: #991b1b; }
    .rec-box.conditional { background: #facc15; border-color: #eab308; color: #000000; }
    .sign-table td { height: 45px; vertical-align: bottom; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h2>PRE-ANALYSIS &mdash; EXPERT JUDGEMENT</h2>
  <div style="font-size: 8pt; margin-bottom: 6px;">
    No: <b>${data.preAnalysisNo}</b> &bull; FAP No: <b>${data.fapNumber}</b> &bull; Date: <b>${data.preAnalysisDate}</b>
  </div>

  <div class="banner">1. GENERAL INFORMATION & QUICK SCREENING</div>
  <table>
    <tr><td style="width:25%"><b>Customer / Project</b></td><td style="width:25%">${data.customerProjectName}</td><td style="width:25%"><b>Dealer PIC</b></td><td style="width:25%">${data.dealerPic}</td></tr>
    <tr><td><b>Tax ID (NPWP)</b></td><td>${data.taxId}</td><td><b>LMI PIC</b></td><td>${data.lmiPic}</td></tr>
    <tr><td><b>Customer Area</b></td><td>${data.customerArea}</td><td><b>LFI PIC</b></td><td>${data.lfiPic}</td></tr>
    <tr><td><b>Customer PIC</b></td><td>${data.customerPic}</td><td><b>Lead Source</b></td><td>${data.leadSource}</td></tr>
    <tr><td><b>Equity</b></td><td>${data.equity}</td><td><b>Paid-up Capital</b></td><td>${data.paidUpCapital}</td></tr>
    <tr><td><b>Source of Repayment</b></td><td colspan="3">${data.sourceOfRepayment}</td></tr>
  </table>

  <div class="banner">2. PROJECT INFORMATION</div>
  <table>
    <tr><td style="width:25%"><b>Project Name & Location</b></td><td colspan="3">${data.projectNameLocation.replace(/\n/g, '<br/>')}</td></tr>
    <tr><td><b>Role in Project</b></td><td>${data.customerRole}</td><td><b>Project Owner</b></td><td>${data.projectOwner}</td></tr>
    <tr><td><b>Project Status</b></td><td>${data.projectStatus}</td><td><b>Investment Plan</b></td><td>${data.investmentPlan}</td></tr>
  </table>

  <div class="banner">3. CUSTOMER & GROUP BACKGROUND</div>
  <table>
    <tr><td style="width:25%"><b>UBO / Ownership</b></td><td colspan="3">${data.uboInfo.replace(/\n/g, '<br/>')}</td></tr>
    <tr><td><b>Company Background</b></td><td colspan="3">${data.companyBackground}</td></tr>
  </table>

  <div class="banner">4. EQUIPMENT & JOB FIT</div>
  <table>
    <tr><td style="width:25%"><b>Equipment Job Fit</b></td><td>${data.equipmentJobFit}</td><td style="width:25%"><b>Utilization</b></td><td>${data.utilizationDuration}</td></tr>
    <tr><td><b>Prior LiuGong Exp</b></td><td>${data.priorLiugongExperience}</td><td><b>FMC Service</b></td><td>${data.serviceAgreementFmc}</td></tr>
  </table>

  <div class="banner">5. UNIT DELIVERY STATUS & QA CHECK</div>
  <table>
    <tr><td style="width:25%"><b>Delivery Status</b></td><td>${data.deliveryStatus}</td><td style="width:25%"><b>Delivery Date</b></td><td>${data.deliveryDate}</td></tr>
    <tr><td><b>QA iLink Comment</b></td><td colspan="3">${data.qaIlinkComment}</td></tr>
    <tr><td><b>QA Conclusion</b></td><td colspan="3">${data.qaConclusion}</td></tr>
  </table>

  <div class="banner">6. CROSS-CHECK WITH DEALER / LMI / PEFINDO</div>
  <table>
    <tr><td style="width:25%"><b>TOP Dealer &rarr; Cust</b></td><td>${data.topDealerToCustomer}</td><td style="width:25%"><b>TOP LMI &rarr; Dealer</b></td><td>${data.topLmiToDealer}</td></tr>
    <tr><td><b>LMI AR Check</b></td><td colspan="3">${data.lmiArCheck}</td></tr>
    <tr><td><b>SLIK / Pefindo</b></td><td colspan="3">${data.slikPefindoHighlight}</td></tr>
  </table>

  <div class="banner">7. EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION</div>
  <div class="rec-box ${data.recommendation === 'RECOMMEND' ? 'recommend' : data.recommendation === 'CONDITIONAL' ? 'conditional' : 'not-recommend'}">
    RECOMMENDATION: ${data.recommendation}
  </div>

  <table class="sign-table" style="margin-top: 24px;">
    <tr>
      <td style="width: 33%; text-align: center;"><b>Proposed By</b><br/><br/><br/>${data.proposedBy}</td>
      <td style="width: 33%; text-align: center;"><b>Reviewed By</b><br/><br/><br/>${data.reviewedBy}</td>
      <td style="width: 33%; text-align: center;"><b>Approved By</b><br/><br/><br/>${data.approvedBy}</td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  useEffect(() => {
    let isMounted = true;
    const loadSaved = async () => {
      try {
        const res = await api(`/applications/${props.applicationId}/pre-analysis`);
        if (res && res.data && isMounted) {
          setData(prev => ({
            ...prev,
            ...res.data,
            customerProjectName: res.data.customerProjectName || prev.customerProjectName,
            taxId: res.data.taxId || prev.taxId,
            fapNumber: res.data.fapNumber || prev.fapNumber
          }));
        }
      } catch (e) {
        console.warn('Could not load existing pre-analysis from server:', e);
      }
    };
    loadSaved();
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
    <div className="pre-analysis-container" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* LEFT COLUMN: 50% EDITABLE FORM ACCORDIONS */}
      <div className="fap-detail-form-col" style={{ flex: '1 1 50%', minWidth: 0, paddingRight: '4px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <FileText size={18} color="#1e3a8a" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
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
                {data.recommendation || 'DRAFT'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
              Ref No: <b style={{ color: '#1e293b' }}>{data.preAnalysisNo || 'Auto-generated'}</b> &nbsp;&bull;&nbsp; FAP No: <b style={{ color: '#1e293b' }}>{data.fapNumber || '-'}</b>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="fap-acc-sync-btn"
              title="Sync customer profile, NPWP, and PIC data from FAP stage"
              onClick={() => {
                setData(prev => syncCustomerAndPicIntoPreAnalysis(prev, {
                  customer: props.customer || props.profile?.customer,
                  pic: props.pic || props.profile?.pic,
                  application: props.application,
                  profile: props.profile
                }));
                props.notify?.('Customer, Tax ID, and PIC successfully synchronized into form');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} /> Sync Customer Data
            </button>

            <button
              type="button"
              onClick={handlePrintPreAnalysis}
              className="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer'
              }}
              title="Print Pre-Analysis Form"
            >
              <Printer size={12} /> Print
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="button primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              title="Save Pre-Analysis Draft"
            >
              {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          </div>
        </div>

        {/* Form Accordion Stack */}
        <div className="fap-accordion-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* SECTION 1: GENERAL INFORMATION */}
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
                  1. GENERAL INFORMATION & QUICK SCREENING
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px', height: '18px', lineHeight: '18px' }}>
                      Pre-Analysis No
                    </label>
                    <input
                      type="text"
                      name="preAnalysisNo"
                      data-field="preAnalysisNo"
                      value={data.preAnalysisNo}
                      onChange={e => updateField('preAnalysisNo', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisNo')}
                      placeholder="000/PREANA/MKT/IX/YYYY"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', height: '34px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px', height: '18px', lineHeight: '18px' }}>
                      Pre-Analysis Date
                    </label>
                    <input
                      type="text"
                      name="preAnalysisDate"
                      data-field="preAnalysisDate"
                      value={data.preAnalysisDate}
                      onChange={e => updateField('preAnalysisDate', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisDate')}
                      placeholder="DD-Mon-YYYY"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', height: '34px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer / Project Name</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
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

          {/* SECTION 2: PROJECT INFORMATION */}
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Name & Location</label>
                  <textarea
                    rows={3}
                    name="projectNameLocation"
                    data-field="projectNameLocation"
                    value={data.projectNameLocation}
                    onChange={e => updateField('projectNameLocation', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-projectNameLocation')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Role in Project</label>
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Contractors</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Owner / Bowheer</label>
                    <input
                      type="text"
                      name="projectOwner"
                      data-field="projectOwner"
                      value={data.projectOwner}
                      onChange={e => updateField('projectOwner', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-projectOwner')}
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
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Info on Bowheer</label>
                  <input
                    type="text"
                    name="bowheerInfo"
                    data-field="bowheerInfo"
                    value={data.bowheerInfo}
                    onChange={e => updateField('bowheerInfo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-bowheerInfo')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Investment Plan</label>
                    <input
                      type="text"
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
              </div>
            )}
          </div>

          {/* SECTION 3: CUSTOMER & GROUP BACKGROUND */}
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBO / Ownership</label>
                  <textarea
                    rows={2}
                    name="uboInfo"
                    data-field="uboInfo"
                    value={data.uboInfo}
                    onChange={e => updateField('uboInfo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInfo')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Background</label>
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

                {/* Milestones Repeater */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Milestones / Growth History</label>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...(data.milestones || []), { year: '', entity: '', description: '' }];
                        updateField('milestones', copy);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ width: '20%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Year</th>
                        <th style={{ width: '40%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Entity / Business</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Description</th>
                        <th style={{ width: '10%', padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.milestones || []).map((m, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={m.year}
                              onChange={e => {
                                const copy = [...data.milestones];
                                copy[idx] = { ...copy[idx], year: e.target.value };
                                updateField('milestones', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={m.entity || m.milestone || ''}
                              onChange={e => {
                                const copy = [...data.milestones];
                                copy[idx] = { ...copy[idx], entity: e.target.value };
                                updateField('milestones', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={m.description || ''}
                              onChange={e => {
                                const copy = [...data.milestones];
                                copy[idx] = { ...copy[idx], description: e.target.value };
                                updateField('milestones', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
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

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Existing Finco / Bank</label>
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

          {/* SECTION 4: EQUIPMENT POSSIBILITY OF SUCCESS */}
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
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Equipment Job Fit</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Utilization & Duration</label>
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
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Prior LiuGong Exp.</label>
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
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Service Agreement / FMC</label>
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

                {/* Unit Composition Repeater */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      Unit Composition (Existing Fleet & Request) &bull; Total: <b>{totalUnits} Units</b>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.unitComposition || []), { kategoriAset: '', brand: '', type: '', qty: 1 }];
                        updateField('unitComposition', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Unit
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ width: '35%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Asset Category</th>
                        <th style={{ width: '30%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Brand & Type</th>
                        <th style={{ width: '20%', padding: '4px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Qty</th>
                        <th style={{ width: '15%', padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.unitComposition || []).map((u, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={u.kategoriAset || ''}
                              placeholder="e.g. Excavator"
                              onChange={e => {
                                const copy = [...data.unitComposition];
                                copy[idx] = { ...copy[idx], kategoriAset: e.target.value };
                                updateField('unitComposition', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={u.brand || u.type || ''}
                              placeholder="e.g. LiuGong 922E"
                              onChange={e => {
                                const copy = [...data.unitComposition];
                                copy[idx] = { ...copy[idx], brand: e.target.value };
                                updateField('unitComposition', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
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
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
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
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: UNIT DELIVERY STATUS & QA CHECK */}
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>QA Comment &bull; iLink / GPS Performance Check</label>
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

          {/* SECTION 6: CROSS-CHECK WITH DEALER / LMI / PEFINDO */}
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
                <div style={{ marginTop: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e3a8a', marginBottom: '6px' }}>
                    1. Sister Company SLIK / Pefindo Check
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>SLIK / Bureau Overview Highlight</label>
                    <input
                      type="text"
                      name="slikPefindoHighlight"
                      data-field="slikPefindoHighlight"
                      value={data.slikPefindoHighlight}
                      onChange={e => updateField('slikPefindoHighlight', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px' }}
                    />
                  </div>

                  {/* Lender Exposures Repeater */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Lender Exposures</span>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...(data.lenderExposures || []), { lender: '', plafond: '', rate: '' }];
                          updateField('lenderExposures', copy);
                        }}
                        style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        + Add Lender Exposure
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ width: '30%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Lender</th>
                          <th style={{ width: '35%', padding: '4px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Plafond</th>
                          <th style={{ width: '25%', padding: '4px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Rate</th>
                          <th style={{ width: '10%', padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.lenderExposures || []).map((lex, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={lex.lender}
                                onChange={e => {
                                  const copy = [...data.lenderExposures];
                                  copy[idx] = { ...copy[idx], lender: e.target.value };
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              <input
                                type="text"
                                value={lex.plafond}
                                onChange={e => {
                                  const copy = [...data.lenderExposures];
                                  copy[idx] = { ...copy[idx], plafond: e.target.value };
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ width: '100%', padding: '3px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              <input
                                type="text"
                                value={lex.rate}
                                onChange={e => {
                                  const copy = [...data.lenderExposures];
                                  copy[idx] = { ...copy[idx], rate: e.target.value };
                                  updateField('lenderExposures', copy);
                                }}
                                style={{ width: '100%', padding: '3px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
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
                <div style={{ marginTop: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    2. Applicant Company Check (Request Using This Entity)
                  </label>
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

          {/* SECTION 7: EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION */}
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
                  7. EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION
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
                      placeholder="e.g. Newly established company in 2024"
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

                {/* Recommendation Selector with Yellow CONDITIONAL styling */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>RECOMMENDATION</label>
                  <select
                    name="recommendation"
                    data-field="recommendation"
                    value={data.recommendation}
                    onChange={e => updateField('recommendation', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: data.recommendation === 'CONDITIONAL' ? '2px solid #eab308' : data.recommendation.includes('NOT RECOMMEND') ? '2px solid #ef4444' : '2px solid #22c55e',
                      background: data.recommendation === 'CONDITIONAL' ? '#fefce8' : data.recommendation.includes('NOT RECOMMEND') ? '#fef2f2' : '#f0fdf4',
                      color: data.recommendation === 'CONDITIONAL' ? '#854d0e' : data.recommendation.includes('NOT RECOMMEND') ? '#b91c1c' : '#15803d',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="RECOMMEND">RECOMMEND</option>
                    <option value="CONDITIONAL">CONDITIONAL (Syarat Tambahan & Mitigasi)</option>
                    <option value="NOT RECOMMEND TO FULL DOCUMENTATION">NOT RECOMMEND TO FULL DOCUMENTATION</option>
                  </select>
                </div>

                {/* Suggestions / Mitigation Conditions Repeater */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Suggestions / Mitigation Conditions</label>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...(data.suggestions || data.mitigationConditions || []), ''];
                        updateField('suggestions', copy);
                        updateField('mitigationConditions', copy);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Condition
                    </button>
                  </div>
                  {(data.suggestions || data.mitigationConditions || []).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        value={s}
                        onChange={e => {
                          const copy = [...(data.suggestions || data.mitigationConditions || [])];
                          copy[idx] = e.target.value;
                          updateField('suggestions', copy);
                          updateField('mitigationConditions', copy);
                        }}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const copy = (data.suggestions || data.mitigationConditions || []).filter((_, i) => i !== idx);
                          updateField('suggestions', copy);
                          updateField('mitigationConditions', copy);
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Competition Information Table */}
                <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a' }}>
                      Competition Information Benchmark (13 Fincos)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE), { finco: '', rate: '', purpose: '' }];
                        updateField('competitionTable', copy);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Competitor
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ width: '50%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Finco Name</th>
                        <th style={{ width: '25%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Rate (effective)</th>
                        <th style={{ width: '15%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Purpose</th>
                        <th style={{ width: '10%', padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={c.finco}
                              onChange={e => {
                                const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                copy[idx] = { ...copy[idx], finco: e.target.value };
                                updateField('competitionTable', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={c.rate}
                              onChange={e => {
                                const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                copy[idx] = { ...copy[idx], rate: e.target.value };
                                updateField('competitionTable', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={c.purpose}
                              onChange={e => {
                                const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                copy[idx] = { ...copy[idx], purpose: e.target.value };
                                updateField('competitionTable', copy);
                              }}
                              style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
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

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Competition Notes</label>
                    <textarea
                      rows={2}
                      name="competitionNotes"
                      data-field="competitionNotes"
                      value={data.competitionNotes}
                      onChange={e => updateField('competitionNotes', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Sign-offs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Propose by :</label>
                    <textarea
                      rows={2}
                      value={data.proposedBy}
                      onChange={e => updateField('proposedBy', e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Reviewed by :</label>
                    <textarea
                      rows={2}
                      value={data.reviewedBy}
                      onChange={e => updateField('reviewedBy', e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Approved by :</label>
                    <textarea
                      rows={2}
                      value={data.approvedBy}
                      onChange={e => updateField('approvedBy', e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Bottom Save Draft action */}
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title="Save Pre-Analysis Draft"
            >
              {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: 50% PREVIEW & DIGITAL TWIN / ORIGINAL PDF */}
      <div className="fap-detail-preview-col" style={{
        flex: '1 1 50%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 165px)',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {/* Preview Control Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          zIndex: 5
        }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setViewMode('digital-twin')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: viewMode === 'digital-twin' ? '#ffffff' : 'transparent',
                color: viewMode === 'digital-twin' ? '#1e3a8a' : '#64748b',
                boxShadow: viewMode === 'digital-twin' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={13} />
              Digital Twin (Pre-Analysis)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('original-pdf')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: viewMode === 'original-pdf' ? '#ffffff' : 'transparent',
                color: viewMode === 'original-pdf' ? '#1e3a8a' : '#64748b',
                boxShadow: viewMode === 'original-pdf' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              <FileSearch size={13} />
              Original Expert Judgement PDF
            </button>
          </div>

          {/* Zoom and Actions */}
          {viewMode === 'digital-twin' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                title="Zoom Out"
                style={{ padding: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '0.75rem', minWidth: '40px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                title="Zoom In"
                style={{ padding: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(0.75)}
                title="Reset Zoom"
                style={{ padding: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={handlePrintPreAnalysis}
                title="Print Document"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                <Printer size={12} /> Print
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Pedoman Patokan Pribadi (View-Only)
              </span>
              <a
                href={getStaticAssetUrl("pre_analysis/pre_analysis_sample.pdf")}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: '#f1f5f9',
                  color: '#1e3a8a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={12} /> Open in New Tab
              </a>
            </div>
          )}
        </div>

        {/* Viewport Content */}
        <div
          ref={previewContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
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
            /* Digital Twin Document A4 Canvas */
            <div
              className="preana-preview-canvas"
              style={{
                width: '794px',
                minHeight: '1123px',
                background: '#ffffff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                padding: '36px 44px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                fontSize: '9pt',
                color: '#000000',
                lineHeight: 1.35,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease'
              }}
            >
              {/* Document Header */}
              <div style={{ marginBottom: '14px', borderBottom: '2px solid #1b365d', paddingBottom: '8px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '13pt', color: '#1b365d', fontWeight: 800 }}>
                  PRE-ANALYSIS &mdash; EXPERT JUDGEMENT
                </h2>
                <div style={{ fontSize: '9pt', color: '#334155', fontWeight: 600 }}>
                  (Quick Screening, Interview Base)
                </div>
                <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '2px' }}>
                  No. : <b style={{ color: '#0f172a' }}>{data.preAnalysisNo}</b>
                </div>
              </div>

              {/* Section 1: Quick Screening Table */}
              <div id="preana-preview-sec-1">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', marginBottom: '14px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ width: '22%', padding: '4px 6px', fontWeight: 700 }}>Customer / Project</td>
                      <td id="preana-preview-cell-customerProjectName" onClick={() => handlePreviewCellClick('customerProjectName', 'sec1')} style={{ width: '28%', padding: '4px 6px', cursor: 'pointer' }}>{data.customerProjectName}</td>
                      <td style={{ width: '22%', padding: '4px 6px', fontWeight: 700 }}>Dealer PIC</td>
                      <td id="preana-preview-cell-dealerPic" onClick={() => handlePreviewCellClick('dealerPic', 'sec1')} style={{ width: '28%', padding: '4px 6px', cursor: 'pointer' }}>{data.dealerPic}</td>
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
                      <td id="preana-preview-cell-customerArea" onClick={() => handlePreviewCellClick('customerArea', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.customerArea}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 700 }}>Date</td>
                      <td id="preana-preview-cell-preAnalysisDate" onClick={() => handlePreviewCellClick('preAnalysisDate', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.preAnalysisDate}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 700 }}>Equity</td>
                      <td id="preana-preview-cell-equity" onClick={() => handlePreviewCellClick('equity', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.equity}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 700 }}>Paid up Cap.</td>
                      <td id="preana-preview-cell-paidUpCapital" onClick={() => handlePreviewCellClick('paidUpCapital', 'sec1')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.paidUpCapital}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 6px', fontWeight: 700 }}>Source of Repayment</td>
                      <td id="preana-preview-cell-sourceOfRepayment" onClick={() => handlePreviewCellClick('sourceOfRepayment', 'sec1')} colSpan={3} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.sourceOfRepayment}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: 2. PROJECT INFORMATION */}
              <div
                id="preana-preview-sec-2"
                onClick={() => handlePreviewCellClick('projectNameLocation', 'sec2')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                2. PROJECT INFORMATION
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '14px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Project Name & Location</td>
                    <td id="preana-preview-cell-projectNameLocation" onClick={() => handlePreviewCellClick('projectNameLocation', 'sec2')} style={{ width: '74%', padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.projectNameLocation}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Role in Project</td>
                    <td id="preana-preview-cell-customerRole" onClick={() => handlePreviewCellClick('customerRole', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>
                      {data.customerRole} {data.otherContractors ? `(${data.otherContractors})` : ''}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Owner / Bowheer</td>
                    <td id="preana-preview-cell-projectOwner" onClick={() => handlePreviewCellClick('projectOwner', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.projectOwner}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Info on Bowheer</td>
                    <td id="preana-preview-cell-bowheerInfo" onClick={() => handlePreviewCellClick('bowheerInfo', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.bowheerInfo}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Status</td>
                    <td id="preana-preview-cell-projectStatus" onClick={() => handlePreviewCellClick('projectStatus', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.projectStatus}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Investment Plan</td>
                    <td id="preana-preview-cell-investmentPlan" onClick={() => handlePreviewCellClick('investmentPlan', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.investmentPlan}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Financing Scheme Requested</td>
                    <td id="preana-preview-cell-financingSchemeRequested" onClick={() => handlePreviewCellClick('financingSchemeRequested', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.financingSchemeRequested}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 3: 3. CUSTOMER & GROUP BACKGROUND */}
              <div
                id="preana-preview-sec-3"
                onClick={() => handlePreviewCellClick('uboInfo', 'sec3')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                3. CUSTOMER & GROUP BACKGROUND
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '10px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>UBO (Ultimate Beneficiary Owner)</td>
                    <td id="preana-preview-cell-uboInfo" onClick={() => handlePreviewCellClick('uboInfo', 'sec3')} style={{ width: '74%', padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.uboInfo}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Company Background</td>
                    <td id="preana-preview-cell-companyBackground" onClick={() => handlePreviewCellClick('companyBackground', 'sec3')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.companyBackground}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Milestones / Growth</td>
                    <td style={{ padding: '4px 6px' }}>
                      {(!data.milestones || data.milestones.length === 0) ? (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&mdash; Belum ada milestone &mdash;</span>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                          <tbody>
                            {data.milestones.map((m, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ width: '15%', padding: '3px 4px', fontWeight: 700, color: '#1e3a8a' }}>{m.year}</td>
                                <td style={{ width: '40%', padding: '3px 4px', fontWeight: 600 }}>{m.entity || m.milestone}</td>
                                <td style={{ padding: '3px 4px', color: '#475569' }}>{m.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Existing Finco / Bank</td>
                    <td id="preana-preview-cell-existingFincoBackup" onClick={() => handlePreviewCellClick('existingFincoBackup', 'sec3')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.existingFincoBackup}</td>
                  </tr>
                </tbody>
              </table>

              {/* Star Group Corporate Structure Diagram Preview */}
              <div style={{ marginTop: '6px', marginBottom: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '4px 8px', fontSize: '8pt', fontWeight: 700, color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
                  Corporate Group Structure Diagram (Star Group)
                </div>
                <img
                  src={getStaticAssetUrl("pre_analysis/star_group_structure.jpg")}
                  alt="Star Group Corporate Structure"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              {/* Section 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
              <div
                id="preana-preview-sec-4"
                onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                4. EQUIPMENT POSSIBILITY OF SUCCESS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '14px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Equipment-to-Job Fit</td>
                    <td id="preana-preview-cell-equipmentJobFit" onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.equipmentJobFit}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Utilization & Duration</td>
                    <td id="preana-preview-cell-utilizationDuration" onClick={() => handlePreviewCellClick('utilizationDuration', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.utilizationDuration}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Prior LiuGong Experience</td>
                    <td id="preana-preview-cell-priorLiugongExperience" onClick={() => handlePreviewCellClick('priorLiugongExperience', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.priorLiugongExperience}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Service Agreement / FMC</td>
                    <td id="preana-preview-cell-serviceAgreementFmc" onClick={() => handlePreviewCellClick('serviceAgreementFmc', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.serviceAgreementFmc}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Unit Composition (Fleet)</td>
                    <td style={{ padding: '4px 6px' }}>
                      {(!data.unitComposition || data.unitComposition.length === 0) ? (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>&mdash; Belum ada unit composition &mdash;</span>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Asset Category</th>
                              <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Brand & Spec</th>
                              <th style={{ width: '15%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.unitComposition.map((u, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{u.kategoriAset || '-'}</td>
                                <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{u.brand || u.type}</td>
                                <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>{u.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                              <td colSpan={2} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>Total Units</td>
                              <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#1e3a8a' }}>{totalUnits}</td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
              <div
                id="preana-preview-sec-5"
                onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                5. UNIT DELIVERY STATUS & QA CHECK
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '14px' }}>
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
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>QA Comment &bull; iLink/GPS Performance Check</td>
                    <td id="preana-preview-cell-qaIlinkComment" onClick={() => handlePreviewCellClick('qaIlinkComment', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.qaIlinkComment}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>QA Conclusion</td>
                    <td id="preana-preview-cell-qaConclusion" onClick={() => handlePreviewCellClick('qaConclusion', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.qaConclusion}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
              <div
                id="preana-preview-sec-6"
                onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                6. CROSS-CHECK WITH DEALER / LMI (quick)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '14px' }}>
                <tbody>
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
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>SLIK / Bureau Highlight</td>
                    <td style={{ padding: '4px 6px' }}>
                      <div style={{ fontWeight: 700, color: '#1b365d', marginBottom: '4px' }}>
                        1. Sister Company SLIK / Pefindo Highlight :
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
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>IDR 80.673.526.173,00</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>&mdash;</td>
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
                        2. Applicant Company Check &mdash; {data.applicantPefindoCheck}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 7: 7. EXPERT JUDGEMENT CONCLUSION */}
              <div
                id="preana-preview-sec-7"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                7. EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION
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

              {/* Recommendation Callout (Yellow for CONDITIONAL) */}
              <div
                id="preana-preview-cell-recommendation"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                style={{
                  background: data.recommendation === 'CONDITIONAL' ? '#facc15' : data.recommendation.includes('NOT RECOMMEND') ? '#fee2e2' : '#dcfce7',
                  border: `2px solid ${data.recommendation === 'CONDITIONAL' ? '#eab308' : data.recommendation.includes('NOT RECOMMEND') ? '#ef4444' : '#22c55e'}`,
                  color: data.recommendation === 'CONDITIONAL' ? '#000000' : data.recommendation.includes('NOT RECOMMEND') ? '#991b1b' : '#166534',
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
                RECOMMENDATION: {data.recommendation || '— BELUM ADA REKOMENDASI —'}
              </div>

              {/* Suggestion Bullet Points */}
              <div style={{ marginBottom: '14px', fontSize: '8.5pt' }}>
                <span style={{ fontWeight: 700 }}>Suggestion:</span>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  {(data.suggestions || data.mitigationConditions || []).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '2px' }}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Competition Information Table */}
              <div style={{ marginTop: '14px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '4px' }}>
                  Competition Information Benchmark
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

              {/* Approvals / Sign-off Footer */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '28px',
                borderTop: '1px solid #000000',
                paddingTop: '8px',
                fontSize: '9pt'
              }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '24px' }}>Propose by :</div>
                  <div style={{ fontWeight: 700, whiteSpace: 'pre-line' }}>{data.proposedBy}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '24px' }}>Reviewed by :</div>
                  <div style={{ fontWeight: 700, whiteSpace: 'pre-line' }}>{data.reviewedBy}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '24px' }}>Approved by :</div>
                  <div style={{ fontWeight: 700, whiteSpace: 'pre-line' }}>{data.approvedBy}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PreAnalysisForm;
