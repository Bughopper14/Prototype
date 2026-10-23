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
  Trash2
} from 'lucide-react';

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

  // 2. Project Information
  projectNameLocation: string;
  customerRole: string;
  otherContractors: string;
  projectOwner: string;
  bowheerInfo: string;
  projectStatus: string;
  investmentPlan: string;
  financingSchemeRequested: string;

  // 3. Customer & Group Background
  uboInfo: string;
  companyBackground: string;
  milestones: Array<{ year: string; entity: string; description: string }>;
  existingFincoBackup: string;

  // 4. Equipment Possibility of Success
  equipmentJobFit: string;
  utilizationDuration: string;
  priorLiugongExperience: string;
  serviceAgreementFmc: string;
  unitComposition: Array<{ brand: string; type: string; qty: number; remarks?: string }>;

  // 5. Unit Delivery Status & QA Check
  deliveryStatus: string;
  deliveryDate: string;
  qaIlinkComment: string;
  qaConclusion: string;

  // 6. Cross-Check with Dealer / LMI
  topDealerToCustomer: string;
  topLmiToDealer: string;
  lmiArCheck: string;
  slikPefindoHighlight: string;
  lenderExposures: Array<{ lender: string; plafond: string; rate: string; note?: string }>;

  // 7. Expert Judgement Conclusion & Recommendation
  goodProject: boolean;
  goodProjectNote: string;
  goodCustomer: boolean;
  goodCustomerNote: string;
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION' | 'RECOMMEND WITH CONDITIONS' | 'RECOMMEND';
  suggestionOverview: string;
  mitigationConditions: string[];
  competitionNotes: string;
  proposedBy: string;
  reviewedBy: string;
  approvedBy: string;
}

const defaultInitialData: PreAnalysisData = {
  preAnalysisNo: '001/PREANA/MKT/IX/2026',
  preAnalysisDate: '07-Sep-2026',
  customerProjectName: 'PT Handalan Putramas Santosa (HPS)',
  taxId: '27.817.616.9-041.000',
  fapNumber: '070/AF/VIII/2026',
  leadSource: 'LMI',
  customerArea: 'Head Office: Jakarta | Site Operation: Sumatera Area',
  dealerPic: 'Direct to LMI',
  lmiPic: 'Deny Ardhian',
  lfiPic: 'Amanda Cynthia - no history with customer (new customer)',
  customerPic: 'Mr. Abraham (Business Director)',
  equity: 'IDR 130.000.000.000 (as of Last deed no 8, 8 June 2026)',
  paidUpCapital: 'IDR 32.500.000.000',
  sourceOfRepayment: 'Income / Others',

  projectNameLocation: 'STAR GROUP Project Portfolio:\nA. PT Handalan Putramas Santosa (HPS) - RAPP, SBA Wood, BMH (Start Dec 2024 / Nov 2025)\nB. PT Pangan Sejahtera Santosa (PASS) - FMCG (Sosro, FKS, Mondelez) (Start 2022)\nC. PT Harta Putramas Santosa (HTPS) - NEW Harvesting Project (Est. Sept/Oct 2026)',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\n2. Oki Pulp & Paper (APP / Sinarmas)',
  bowheerInfo: 'PT Riau Andalan Pulp and Paper (RAPP) - APRIL Group (RGE Group). One of the largest pulp and paper producers in the world located in Pangkalan Kerinci, Riau. Mill capacity 2.8M tons pulp and 1.15M tons paper/yr. Upstream fiber plantation management planting 200M saplings/yr.',
  projectStatus: 'On Going with RAPP since 2025 for logistics and harvesting support',
  investmentPlan: '20-30 units nearest plan: 20 units LIUGONG Excavator for RAPP & 30 units for Sinarmas',
  financingSchemeRequested: '36-month lease, 15-20% Security Deposit, Normal Installment structure',

  uboInfo: '1. Mr. Oky Santosa (Father)\n2. Mr. Hansen Santosa (Owner)\n3. Mr. Leonard Santosa (Brother)',
  companyBackground: 'STAR Group operates in logistics, transportation, and industrial forestry harvesting. Group holding PT PASS established 2022 handling FMCG, expanding into PT HPS and PT HTPS for forestry concessions.',
  milestones: [
    { year: '2022', entity: 'PT PASS', description: 'Established for FMCG transport (Sinar Sosro, FKS, Perfetti)' },
    { year: 'Q1 2024', entity: 'PT HPS', description: 'Formed to expand heavy logistics for RAPP & APP Sinarmas' },
    { year: 'Nov 2024', entity: 'PT HPS', description: 'Commenced Land Clearing & Logging operations in Riau & Jambi' },
    { year: 'End 2025', entity: 'PT HPS', description: 'Contract extension with RAPP for wood hauling' },
    { year: 'Mid 2026', entity: 'PT HTPS', description: 'New entity established specifically for harvesting concessions in East Kalimantan' }
  ],
  existingFincoBackup: 'ACC, SANF, MTF, RADANA, SMFL, BCA, Bank Saqu, Bank Nano Syariah, Mitsui Leasing',

  equipmentJobFit: 'Suitable - Excavator 20-ton class for harvesting in Sumatera & East Kalimantan areas',
  utilizationDuration: 'Reasonable — 3 years contract duration aligned with 36-month financing term',
  priorLiugongExperience: 'Never invest LiuGong prior to this proposal (First LiuGong fleet entry)',
  serviceAgreementFmc: 'Standard warranty from LMI + local dealer parts consignment support',
  unitComposition: [
    { brand: 'ISUZU', type: 'Truk GIGA FVM U', qty: 45, remarks: 'Logistics Fleet' },
    { brand: 'FAW', type: 'Truk Heavy Hauler', qty: 41, remarks: 'Hauling Fleet' },
    { brand: 'SHACMAN', type: 'Truk Dump / Cargo', qty: 25, remarks: 'Site Hauling' },
    { brand: 'ISUZU', type: 'Truk CDE L Light Truck', qty: 10, remarks: 'Support Fleet' },
    { brand: 'ISUZU', type: 'Commercial D-Max 4x4', qty: 3, remarks: 'Operational Support' },
    { brand: 'TOYOTA', type: 'Calya / Innova', qty: 2, remarks: 'Management' }
  ],

  deliveryStatus: 'Not Yet Delivered (Pending Credit Committee & PO Issuance)',
  deliveryDate: 'Demand units Sept 2026, delivery estimated Week 3 after PO confirmation',
  qaIlinkComment: 'No Records / Pre-Delivery Inspection Pending',
  qaConclusion: 'Standard PDI and telematics GPS activation required upon delivery',

  topDealerToCustomer: '20% DP, 80% covered by Leasing',
  topLmiToDealer: 'Standard LMI Consignment Terms',
  lmiArCheck: 'No Records Payment - New LiuGong Customer',
  slikPefindoHighlight: 'Pefindo Check 4 Sept 2026: 9 active facilities total IDR 80.67 Bio, 100% Kol 1 Current, zero historical write-offs, all leasing contracts currently active.',
  lenderExposures: [
    { lender: 'PT Astra Sedaya Finance (ACC)', plafond: 'IDR 11.737.642.751', rate: '6.24%', note: 'Fleet financing' },
    { lender: 'PT Bank Central Asia Tbk', plafond: 'IDR 13.533.553.504', rate: '9.50%', note: 'Working capital & fleet' },
    { lender: 'PT Bank Nano Syariah', plafond: 'IDR 6.163.669.402', rate: 'Market', note: 'Sharia lease' },
    { lender: 'PT Bank Saqu Indonesia', plafond: 'IDR 2.738.552.586', rate: '10.41%', note: 'Equipment loan' },
    { lender: 'PT Mandiri Tunas Finance (MTF)', plafond: 'IDR 14.993.647.840', rate: '9.50%', note: 'Truck & heavy unit lease' },
    { lender: 'PT Mitsui Leasing Capital Indonesia', plafond: 'IDR 392.806.826', rate: '10.63%', note: 'Light commercial' },
    { lender: 'PT Radana Bhaskara Finance', plafond: 'IDR 3.273.898.464', rate: '7.20%', note: 'Asset backed' },
    { lender: 'PT SMFL Leasing Indonesia', plafond: 'IDR 4.301.044.800', rate: '12.49%', note: 'Equipment lease' },
    { lender: 'PT Surya Artha Nusantara Finance (SANF)', plafond: 'IDR 23.538.710.000', rate: '11.25%', note: 'Major heavy equipment fleet' }
  ],

  goodProject: true,
  goodProjectNote: 'Harvesting Contractor for PT RAPP - APRIL Group & APP Sinarmas. Reputable bowheers with proven cashflow stability.',
  goodCustomer: false,
  goodCustomerNote: 'PT HPS was newly established in 2024 with all active contracts still unseasoned (no closed track record). Borrowing entity PT HTPS is newly formed with zero credit bureau footprint and entering harvesting diversification without prior operational history.',
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
  suggestionOverview: 'Legal & financial data confirm PT HPS was established in 2024 and PT HTPS in 2026. Not recommend to process in this stage without strict corporate mitigations.',
  mitigationConditions: [
    'Corporate Guarantee from PT PASS (Parent FMCG cashflow generator).',
    'Personal Guarantee from Hansen Santosa (Key UBO).',
    'Project scope strictly limited to approved Sinarmas / RAPP main contracts.',
    'No unverified financing support for unvetted harvesting concessions.',
    'Payment structure: Escrow account agreement + Post-Dated Checks (PDC) for entire 36-month tenor.',
    'PT HTPS must maintain active factoring facility with Bank Nano Syariah as designated payment source.',
    'If Bank Nano Syariah cannot covenant the facility, secure 3x monthly installment Cash Collateral.',
    'Strict covenants as determined by LFI Credit Committee.'
  ],
  competitionNotes: 'Pefindo check 4 Sept 2026. Rate benchmark: Flat 7% p.a., 20% Security Deposit, 36-month lease tenor, 1% provision fee, IDR 5.000.000 admin fee per contract.',
  proposedBy: 'Amanda Cynthia (Senior Account Manager)',
  reviewedBy: 'Maria Regina (Dept. Head)',
  approvedBy: 'Jembar Ganda E (Director)'
};

interface PreAnalysisFormProps {
  applicationId: string;
  application?: any;
  customer?: any;
  pic?: any;
  profile?: any;
  onSaved?: () => void;
  notify?: (msg: string) => void;
}

export function PreAnalysisForm(props: PreAnalysisFormProps) {
  const [data, setData] = useState<PreAnalysisData>(() => {
    return {
      ...defaultInitialData,
      customerProjectName: props.customer?.companyName || props.application?.customer?.companyName || defaultInitialData.customerProjectName,
      taxId: props.customer?.npwp || props.application?.customer?.npwp || defaultInitialData.taxId,
      fapNumber: props.application?.fapNumber || defaultInitialData.fapNumber,
      customerPic: props.pic?.picName ? `${props.pic.picName} (${props.pic.position || 'Director'})` : defaultInitialData.customerPic,
      customerArea: props.profile?.city ? `${props.profile.city}, ${props.profile.province}` : defaultInitialData.customerArea
    };
  });

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
    sec6: true,
    sec7: true
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch saved pre-analysis data from server
  useEffect(() => {
    if (!props.applicationId) return;
    let isMounted = true;
    fetch(`/api/v1/applications/${props.applicationId}/pre-analysis`)
      .then(res => res.json())
      .then(res => {
        if (isMounted && res.success && res.data) {
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
    try {
      const res = await fetch(`/api/v1/applications/${props.applicationId}/pre-analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
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
    }
  };

  const updateField = (key: keyof PreAnalysisData, val: any) => {
    setData(prev => ({ ...prev, [key]: val }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fap-detail-split-container" style={{ margin: 0, height: 'calc(100vh - 165px)' }}>
      {/* LEFT COLUMN: 50% EDITABLE FORM */}
      <div className="fap-detail-form-col" style={{ paddingRight: '10px' }}>
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
                background: data.recommendation === 'RECOMMEND' ? '#dcfce7' : '#fee2e2',
                color: data.recommendation === 'RECOMMEND' ? '#15803d' : '#b91c1c',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                border: `1px solid ${data.recommendation === 'RECOMMEND' ? '#86efac' : '#fca5a5'}`
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

        {/* ACCORDION SECTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* SECTION 1: GENERAL & CUSTOMER SCREENING */}
          <div className="preana-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
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
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                1. General Information & Quick Screening
              </span>
              {openSections.sec1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openSections.sec1 && (
              <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pre-Analysis No</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>000/PREANA/MKT/IX/YYYY</span>
                  </label>
                  <input
                    type="text"
                    value={data.preAnalysisNo}
                    onChange={e => updateField('preAnalysisNo', e.target.value)}
                    placeholder="001/PREANA/MKT/IX/2026"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Pre-Analysis Date</label>
                  <input
                    type="text"
                    value={data.preAnalysisDate}
                    onChange={e => updateField('preAnalysisDate', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer / Project Name</label>
                  <input
                    type="text"
                    value={data.customerProjectName}
                    onChange={e => updateField('customerProjectName', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Tax ID (NPWP)</label>
                  <input
                    type="text"
                    value={data.taxId}
                    onChange={e => updateField('taxId', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>FAP No</label>
                  <input
                    type="text"
                    value={data.fapNumber}
                    onChange={e => updateField('fapNumber', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Lead Source</label>
                  <input
                    type="text"
                    value={data.leadSource}
                    onChange={e => updateField('leadSource', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Area</label>
                  <input
                    type="text"
                    value={data.customerArea}
                    onChange={e => updateField('customerArea', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Dealer PIC</label>
                  <input
                    type="text"
                    value={data.dealerPic}
                    onChange={e => updateField('dealerPic', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LMI PIC</label>
                  <input
                    type="text"
                    value={data.lmiPic}
                    onChange={e => updateField('lmiPic', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LFI PIC</label>
                  <input
                    type="text"
                    value={data.lfiPic}
                    onChange={e => updateField('lfiPic', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer PIC</label>
                  <input
                    type="text"
                    value={data.customerPic}
                    onChange={e => updateField('customerPic', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Equity</label>
                  <input
                    type="text"
                    value={data.equity}
                    onChange={e => updateField('equity', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Paid up Capital</label>
                  <input
                    type="text"
                    value={data.paidUpCapital}
                    onChange={e => updateField('paidUpCapital', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Source of Repayment</label>
                  <input
                    type="text"
                    value={data.sourceOfRepayment}
                    onChange={e => updateField('sourceOfRepayment', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PROJECT INFORMATION */}
          <div className="preana-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
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
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                2. Project Information & Bowheer
              </span>
              {openSections.sec2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openSections.sec2 && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Name & Location</label>
                  <textarea
                    rows={3}
                    value={data.projectNameLocation}
                    onChange={e => updateField('projectNameLocation', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Role of Customer</label>
                    <input
                      type="text"
                      value={data.customerRole}
                      onChange={e => updateField('customerRole', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Contractor in Same Bowheer</label>
                    <input
                      type="text"
                      value={data.otherContractors}
                      onChange={e => updateField('otherContractors', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Owner</label>
                  <textarea
                    rows={2}
                    value={data.projectOwner}
                    onChange={e => updateField('projectOwner', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Bowheer Information (Due Diligence)</label>
                  <textarea
                    rows={3}
                    value={data.bowheerInfo}
                    onChange={e => updateField('bowheerInfo', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Status</label>
                    <input
                      type="text"
                      value={data.projectStatus}
                      onChange={e => updateField('projectStatus', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Investment Plan</label>
                    <input
                      type="text"
                      value={data.investmentPlan}
                      onChange={e => updateField('investmentPlan', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Financing Scheme Requested</label>
                  <input
                    type="text"
                    value={data.financingSchemeRequested}
                    onChange={e => updateField('financingSchemeRequested', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: CUSTOMER & GROUP BACKGROUND */}
          <div className="preana-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
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
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                3. Customer & Group Background
              </span>
              {openSections.sec3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openSections.sec3 && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBO (Ultimate Beneficiary Owner) Information</label>
                  <textarea
                    rows={2}
                    value={data.uboInfo}
                    onChange={e => updateField('uboInfo', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Background</label>
                  <textarea
                    rows={3}
                    value={data.companyBackground}
                    onChange={e => updateField('companyBackground', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Existing Finco Backup</label>
                  <input
                    type="text"
                    value={data.existingFincoBackup}
                    onChange={e => updateField('existingFincoBackup', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: EQUIPMENT POSSIBILITY OF SUCCESS */}
          <div className="preana-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
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
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                4. Equipment Possibility of Success
              </span>
              {openSections.sec4 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openSections.sec4 && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Equipment-to-Job Fit</label>
                    <input
                      type="text"
                      value={data.equipmentJobFit}
                      onChange={e => updateField('equipmentJobFit', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Utilization vs Duration</label>
                    <input
                      type="text"
                      value={data.utilizationDuration}
                      onChange={e => updateField('utilizationDuration', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Prior LiuGong Experience</label>
                    <input
                      type="text"
                      value={data.priorLiugongExperience}
                      onChange={e => updateField('priorLiugongExperience', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Service Agreement / FMC</label>
                    <input
                      type="text"
                      value={data.serviceAgreementFmc}
                      onChange={e => updateField('serviceAgreementFmc', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: CROSS-CHECK DEALER & LMI */}
          <div className="preana-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
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
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                6. Cross-Check with Dealer / LMI & Bureau SLIK
              </span>
              {openSections.sec6 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openSections.sec6 && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP Dealer to Customer</label>
                    <input
                      type="text"
                      value={data.topDealerToCustomer}
                      onChange={e => updateField('topDealerToCustomer', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LMI AR Check</label>
                    <input
                      type="text"
                      value={data.lmiArCheck}
                      onChange={e => updateField('lmiArCheck', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>SLIK / Pefindo Bureau Highlight</label>
                  <textarea
                    rows={2}
                    value={data.slikPefindoHighlight}
                    onChange={e => updateField('slikPefindoHighlight', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION */}
          <div className="preana-accordion-card" style={{ background: '#ffffff', border: '2px solid #1e3a8a', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              onClick={() => toggleSection('sec7')}
              style={{
                padding: '10px 14px',
                background: '#1e3a8a',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                7. Expert Judgement Conclusion & Recommendation
              </span>
              {openSections.sec7 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {openSections.sec7 && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Aspect 1: Good Project */}
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Good Project?</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => updateField('goodProject', true)}
                        style={{
                          padding: '3px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: data.goodProject ? '#16a34a' : '#e2e8f0',
                          color: data.goodProject ? '#ffffff' : '#64748b'
                        }}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('goodProject', false)}
                        style={{
                          padding: '3px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: !data.goodProject ? '#dc2626' : '#e2e8f0',
                          color: !data.goodProject ? '#ffffff' : '#64748b'
                        }}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Brief note for Project assessment..."
                    value={data.goodProjectNote}
                    onChange={e => updateField('goodProjectNote', e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* Aspect 2: Good Customer */}
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Good Customer?</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => updateField('goodCustomer', true)}
                        style={{
                          padding: '3px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: data.goodCustomer ? '#16a34a' : '#e2e8f0',
                          color: data.goodCustomer ? '#ffffff' : '#64748b'
                        }}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('goodCustomer', false)}
                        style={{
                          padding: '3px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: !data.goodCustomer ? '#dc2626' : '#e2e8f0',
                          color: !data.goodCustomer ? '#ffffff' : '#64748b'
                        }}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Brief note for Customer assessment..."
                    value={data.goodCustomerNote}
                    onChange={e => updateField('goodCustomerNote', e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* Final Recommendation Selector */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>RECOMMENDATION</label>
                  <select
                    value={data.recommendation}
                    onChange={e => updateField('recommendation', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '2px solid #dc2626',
                      color: data.recommendation === 'RECOMMEND' ? '#16a34a' : '#dc2626',
                      background: '#ffffff'
                    }}
                  >
                    <option value="NOT RECOMMEND TO FULL DOCUMENTATION">NOT RECOMMEND TO FULL DOCUMENTATION</option>
                    <option value="RECOMMEND WITH CONDITIONS">RECOMMEND WITH CONDITIONS</option>
                    <option value="RECOMMEND">RECOMMEND</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Suggestion / Risk Evaluation</label>
                  <textarea
                    rows={3}
                    value={data.suggestionOverview}
                    onChange={e => updateField('suggestionOverview', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Proposed by</label>
                    <input
                      type="text"
                      value={data.proposedBy}
                      onChange={e => updateField('proposedBy', e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Reviewed by</label>
                    <input
                      type="text"
                      value={data.reviewedBy}
                      onChange={e => updateField('reviewedBy', e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Approved by</label>
                    <input
                      type="text"
                      value={data.approvedBy}
                      onChange={e => updateField('approvedBy', e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 50% LIVE DOCUMENT PREVIEW */}
      <div className="fap-detail-preview-col" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Document Header Ribbon */}
        <div style={{
          background: '#1b365d',
          color: '#ffffff',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={16} color="#93c5fd" />
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block' }}>
                PRE-ANALYSIS — EXPERT JUDGEMENT
              </span>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                Ref: {data.preAnalysisNo}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setViewMode('digital-twin')}
                style={{
                  border: 'none',
                  background: viewMode === 'digital-twin' ? '#ffffff' : 'transparent',
                  color: viewMode === 'digital-twin' ? '#1b365d' : '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Digital Twin
              </button>
              <button
                type="button"
                onClick={() => setViewMode('original-pdf')}
                style={{
                  border: 'none',
                  background: viewMode === 'original-pdf' ? '#ffffff' : 'transparent',
                  color: viewMode === 'original-pdf' ? '#1b365d' : '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Original PDF
              </button>
            </div>

            {/* Zoom Controls (only for Digital Twin) */}
            {viewMode === 'digital-twin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setZoomLevel(z => Math.max(0.5, Number((z - 0.05).toFixed(2))))}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                >
                  <ZoomOut size={12} />
                </button>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '32px', textAlign: 'center' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(z => Math.min(1.3, Number((z + 0.05).toFixed(2))))}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                >
                  <ZoomIn size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(0.75)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                  title="Reset Zoom (75%)"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                color: '#1b365d',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Printer size={12} /> Print
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div style={{
          flex: 1,
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
              src="/pre_analysis/pre_analysis_sample.pdf#toolbar=1"
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
                <div style={{ fontSize: '10pt', color: '#000000', marginTop: '4px' }}>
                  No. : {data.preAnalysisNo}
                </div>
              </div>

              {/* Top Thick Navy Divider */}
              <div style={{ height: '3px', background: '#1b365d', marginBottom: '8px' }} />

              {/* Section 1: Customer Profile & Financial Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '22%', padding: '4px 6px', fontWeight: 700 }}>Customer / Project</td>
                    <td style={{ width: '48%', padding: '4px 6px', fontWeight: 700, color: '#1b365d' }}>{data.customerProjectName}</td>
                    <td style={{ width: '14%', padding: '4px 6px', fontWeight: 700 }}>Dealer PIC</td>
                    <td style={{ width: '16%', padding: '4px 6px' }}>{data.dealerPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Tax ID (NPWP)</td>
                    <td style={{ padding: '4px 6px' }}>{data.taxId}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LMI PIC</td>
                    <td style={{ padding: '4px 6px' }}>{data.lmiPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>FAP No</td>
                    <td style={{ padding: '4px 6px' }}>{data.fapNumber}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LFI PIC</td>
                    <td style={{ padding: '4px 6px' }}>{data.lfiPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Lead Source</td>
                    <td style={{ padding: '4px 6px' }}>{data.leadSource}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Customer PIC</td>
                    <td style={{ padding: '4px 6px' }}>{data.customerPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Customer Area</td>
                    <td style={{ padding: '4px 6px' }}>{data.customerArea}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Pre-Analysis Date</td>
                    <td style={{ padding: '4px 6px' }}>{data.preAnalysisDate}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Equity</td>
                    <td style={{ padding: '4px 6px' }}>{data.equity}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Paid up Capital</td>
                    <td style={{ padding: '4px 6px' }}>{data.paidUpCapital}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Source of Repayment</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.sourceOfRepayment}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 2 Banner: 2. PROJECT INFORMATION */}
              <div style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '2px' }}>
                2. PROJECT INFORMATION
              </div>
              <div style={{ background: '#254b82', color: '#ffffff', padding: '4px 10px', fontWeight: 700, fontSize: '9pt', marginBottom: '8px' }}>
                Project Name & Location
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '25%', padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>Project Portfolio</td>
                    <td style={{ width: '75%', padding: '6px', whiteSpace: 'pre-line' }}>{data.projectNameLocation}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Role of Customer</td>
                    <td style={{ padding: '6px' }}>{data.customerRole}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Other Contractor work in the same bowheer</td>
                    <td style={{ padding: '6px' }}>{data.otherContractors}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>Project Owner</td>
                    <td style={{ padding: '6px', whiteSpace: 'pre-line' }}>{data.projectOwner}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>Bowheer Information</td>
                    <td style={{ padding: '6px', textAlign: 'justify', lineHeight: 1.35 }}>{data.bowheerInfo}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Project Status</td>
                    <td style={{ padding: '6px' }}>{data.projectStatus}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Investment Plan</td>
                    <td style={{ padding: '6px' }}>{data.investmentPlan}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Financing Scheme Requested</td>
                    <td style={{ padding: '6px' }}>{data.financingSchemeRequested}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 3 Banner: 3. CUSTOMER & GROUP BACKGROUND */}
              <div style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px' }}>
                3. CUSTOMER & GROUP BACKGROUND
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '25%', padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>UBO Information</td>
                    <td style={{ width: '75%', padding: '6px', whiteSpace: 'pre-line' }}>{data.uboInfo}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>Company Background</td>
                    <td style={{ padding: '6px', textAlign: 'justify', lineHeight: 1.35 }}>{data.companyBackground}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>Company Milestones</td>
                    <td style={{ padding: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'left', width: '20%' }}>Year</th>
                            <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'left', width: '25%' }}>Entity</th>
                            <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.milestones.map((m, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '4px', border: '1px solid #e2e8f0', fontWeight: 700 }}>{m.year}</td>
                              <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{m.entity}</td>
                              <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{m.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Existing Finco Backup</td>
                    <td style={{ padding: '6px' }}>{data.existingFincoBackup}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 4 Banner: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
              <div style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px' }}>
                4. EQUIPMENT POSSIBILITY OF SUCCESS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '25%', padding: '6px', fontWeight: 700 }}>Equipment-to-Job Fit</td>
                    <td style={{ width: '75%', padding: '6px' }}>{data.equipmentJobFit}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Utilization vs Project Duration</td>
                    <td style={{ padding: '6px' }}>{data.utilizationDuration}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Prior LiuGong Experience</td>
                    <td style={{ padding: '6px' }}>{data.priorLiugongExperience}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Service Agreement / FMC</td>
                    <td style={{ padding: '6px' }}>{data.serviceAgreementFmc}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 6 Banner: 6. CROSS-CHECK WITH DEALER / LMI & PEFINDO */}
              <div style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px' }}>
                6. CROSS-CHECK WITH DEALER / LMI & BUREAU SLIK
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '25%', padding: '6px', fontWeight: 700 }}>TOP Dealer to Customer</td>
                    <td style={{ width: '75%', padding: '6px' }}>{data.topDealerToCustomer}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>LMI Internal AR Check</td>
                    <td style={{ padding: '6px' }}>{data.lmiArCheck}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>SLIK / Pefindo Highlight</td>
                    <td style={{ padding: '6px' }}>{data.slikPefindoHighlight}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 700, verticalAlign: 'top' }}>Existing Lenders Exposure</td>
                    <td style={{ padding: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                        <thead>
                          <tr style={{ background: '#254b82', color: '#ffffff' }}>
                            <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Financial Institution</th>
                            <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Plafond</th>
                            <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.lenderExposures.map((l, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                              <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{l.lender}</td>
                              <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{l.plafond}</td>
                              <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{l.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 7 Banner: 7. EXPERT JUDGEMENT CONCLUSION */}
              <div style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px' }}>
                7. EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION
              </div>

              {/* Aspect Evaluation Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ background: '#3b5998', color: '#ffffff' }}>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '25%', textAlign: 'left' }}>Aspect</th>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '20%', textAlign: 'center' }}>Assessment</th>
                    <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '55%', textAlign: 'left' }}>Brief Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Good Project?</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <span style={{
                        background: data.goodProject ? '#16a34a' : '#dc2626',
                        color: '#ffffff',
                        padding: '2px 14px',
                        borderRadius: '4px',
                        fontWeight: 800
                      }}>
                        {data.goodProject ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ padding: '6px' }}>{data.goodProjectNote}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '6px', fontWeight: 700 }}>Good Customer?</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <span style={{
                        background: data.goodCustomer ? '#16a34a' : '#dc2626',
                        color: '#ffffff',
                        padding: '2px 14px',
                        borderRadius: '4px',
                        fontWeight: 800
                      }}>
                        {data.goodCustomer ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ padding: '6px' }}>{data.goodCustomerNote}</td>
                  </tr>
                </tbody>
              </table>

              {/* Formal Recommendation Highlight Banner */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '25%', fontWeight: 800, fontSize: '10pt', color: '#000000' }}>
                  RECOMMENDATION
                </div>
                <div style={{
                  flex: 1,
                  background: data.recommendation === 'RECOMMEND' ? '#16a34a' : '#dc2626',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '8px 12px',
                  fontWeight: 900,
                  fontSize: '11pt',
                  borderRadius: '4px',
                  letterSpacing: '0.5px'
                }}>
                  {data.recommendation}
                </div>
              </div>

              {/* Suggestions & Risk Mitigations */}
              <div style={{ marginBottom: '14px', fontSize: '9pt' }}>
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>Suggestion:</div>
                <div style={{ marginBottom: '6px', lineHeight: 1.35 }}>{data.suggestionOverview}</div>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
                  Mitigation conditions required if proceeding:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.35 }}>
                  {data.mitigationConditions.map((cond, i) => (
                    <li key={i} style={{ marginBottom: '2px' }}>{cond}</li>
                  ))}
                </ul>
              </div>

              {/* Sign-off Approval Block */}
              <div style={{ border: '1px solid #000000', padding: '10px 14px', marginTop: '16px' }}>
                <div style={{ fontSize: '9pt', fontWeight: 700, marginBottom: '30px' }}>
                  Propose by :
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', fontSize: '9pt' }}>
                  <div>
                    <div style={{ borderTop: '1px solid #000000', paddingTop: '4px', fontWeight: 700 }}>
                      {data.proposedBy}
                    </div>
                    <div style={{ fontSize: '8pt', color: '#475569' }}>Senior Account Manager</div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #000000', paddingTop: '4px', fontWeight: 700 }}>
                      {data.reviewedBy}
                    </div>
                    <div style={{ fontSize: '8pt', color: '#475569' }}>Dept. Head</div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #000000', paddingTop: '4px', fontWeight: 700 }}>
                      {data.approvedBy}
                    </div>
                    <div style={{ fontSize: '8pt', color: '#475569' }}>Director</div>
                  </div>
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
