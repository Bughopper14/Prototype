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
  Loader2
} from 'lucide-react';
import { api } from './api';

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

  // 2. Project Information & Bowheer
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
  milestones: Array<{
    year: string;
    entity: string;
    description: string;
  }>;
  existingFincoBackup: string;

  // 4. Equipment Possibility of Success
  equipmentJobFit: string;
  utilizationDuration: string;
  priorLiugongExperience: string;
  serviceAgreementFmc: string;
  unitComposition: Array<{
    brand: string;
    type: string;
    quantity: number;
    remarks: string;
  }>;

  // 6. Cross-Check Dealer & LMI
  topDealerToCustomer: string;
  topLmiToDealer: string;
  lmiArCheck: string;
  slikPefindoHighlight: string;
  lenderExposures: Array<{
    lender: string;
    plafond: string;
    rate: string;
  }>;

  // 7. Expert Judgement Conclusion
  goodProject: boolean;
  goodProjectNote: string;
  goodCustomer: boolean;
  goodCustomerNote: string;
  recommendation: 'RECOMMEND' | 'NOT RECOMMEND TO FULL DOCUMENTATION' | 'CONDITIONAL';
  suggestionOverview: string;
  mitigationConditions: string[];
  competitionNotes: string;
  proposedBy: string;
  reviewedBy: string;
  approvedBy: string;
}

export function syncCustomerAndPicIntoPreAnalysis(
  current: PreAnalysisData,
  sources: {
    customer?: any;
    pic?: any;
    application?: any;
    profile?: any;
  }
): PreAnalysisData {
  const companyName = sources.customer?.companyName || sources.application?.customer?.companyName || sources.profile?.companyName || sources.application?.companyName;
  const npwp = sources.customer?.npwp || sources.application?.customer?.npwp || sources.profile?.npwp;
  const fapNumber = sources.application?.fapNumber || sources.profile?.fapNumber;
  const pic = sources.pic || sources.application?.pic || sources.profile?.pic;
  const picName = pic?.picName 
    ? `${pic.picName}${pic.position ? ` (${pic.position})` : ''}` 
    : undefined;
  const city = sources.profile?.city || sources.customer?.city || sources.application?.city;
  const province = sources.profile?.province || sources.customer?.province || sources.application?.province;
  const area = city ? `${city}${province ? `, ${province}` : ''}` : province;
  const repaymentSource = sources.profile?.repaymentSource || sources.application?.repaymentSource;

  let paidUpCapital = current.paidUpCapital;
  let equity = current.equity;
  const deeds = sources.profile?.legal?.deeds || sources.application?.legal?.deeds;
  if (deeds && Array.isArray(deeds)) {
    let totalDeposited = 0;
    deeds.forEach((d: any) => {
      (d.stakeholders || []).forEach((s: any) => {
        const val = Number(s.depositedCapital || s.primaryCapital || 0);
        if (!isNaN(val)) totalDeposited += val;
      });
    });
    if (totalDeposited > 0) {
      paidUpCapital = `IDR ${totalDeposited.toLocaleString('id-ID')}`;
      if (!equity) equity = paidUpCapital;
    }
  }

  return {
    ...current,
    ...(companyName ? { customerProjectName: companyName } : {}),
    ...(npwp ? { taxId: npwp } : {}),
    ...(fapNumber ? { fapNumber } : {}),
    ...(picName ? { customerPic: picName } : {}),
    ...(area ? { customerArea: area } : {}),
    ...(repaymentSource ? { sourceOfRepayment: repaymentSource } : {}),
    ...(paidUpCapital ? { paidUpCapital } : {}),
    ...(equity ? { equity } : {})
  };
}

export const defaultInitialData: PreAnalysisData = {
  preAnalysisNo: '',
  preAnalysisDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
  customerProjectName: '',
  taxId: '',
  fapNumber: '',
  leadSource: '',
  customerArea: '',
  dealerPic: '',
  lmiPic: '',
  lfiPic: '',
  customerPic: '',
  equity: '',
  paidUpCapital: '',
  sourceOfRepayment: '',

  projectNameLocation: '',
  customerRole: '',
  otherContractors: '',
  projectOwner: '',
  bowheerInfo: '',
  projectStatus: '',
  investmentPlan: '',
  financingSchemeRequested: '',

  uboInfo: '',
  companyBackground: '',
  milestones: [],
  existingFincoBackup: '',

  equipmentJobFit: '',
  utilizationDuration: '',
  priorLiugongExperience: '',
  serviceAgreementFmc: '',
  unitComposition: [],


  topDealerToCustomer: '',
  topLmiToDealer: '',
  lmiArCheck: '',
  slikPefindoHighlight: '',
  lenderExposures: [],

  goodProject: false,
  goodProjectNote: '',
  goodCustomer: false,
  goodCustomerNote: '',
  recommendation: '' as any,
  suggestionOverview: '',
  mitigationConditions: [],
  competitionNotes: '',
  proposedBy: '',
  reviewedBy: '',
  approvedBy: ''
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
    return syncCustomerAndPicIntoPreAnalysis(defaultInitialData, {
      customer: props.customer,
      pic: props.pic,
      application: props.application,
      profile: props.profile
    });
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

  const previewContainerRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
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

      vp.scrollTo({
        top: vp.scrollTop + delta - 20,
        behavior: 'smooth'
      });

      target.classList.remove('fap-preview-sync-highlight');
      void target.offsetWidth;
      target.classList.add('fap-preview-sync-highlight');
      setTimeout(() => {
        target.classList.remove('fap-preview-sync-highlight');
      }, 2500);
    }, 40);
  };

  const handleTriggerSync = (secId: string, previewTargetId: string) => {
    setOpenSections(prev => ({ ...prev, [secId]: true }));
    scrollToPreviewElement(previewTargetId);
  };

  const handlePreviewCellClick = (fieldKey: string, sectionKey: string) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: true }));
    setTimeout(() => {
      const formInput = document.querySelector(`[name="${fieldKey}"], [data-field="${fieldKey}"]`) as HTMLElement;
      if (formInput) {
        formInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        formInput.classList.remove('fap-preview-sync-highlight');
        void formInput.offsetWidth;
        formInput.classList.add('fap-preview-sync-highlight');
        formInput.focus();
        setTimeout(() => {
          formInput.classList.remove('fap-preview-sync-highlight');
        }, 2500);
      }
    }, 50);
  };

  const handleSyncCustomerPicData = () => {
    setData(prev => syncCustomerAndPicIntoPreAnalysis(prev, {
      customer: props.customer,
      pic: props.pic,
      application: props.application,
      profile: props.profile
    }));
    props.notify?.('Synced Customer & PIC data from FAP Application!');
    handleTriggerSync('sec1', 'preana-preview-sec-1');
  };

  // Fetch saved pre-analysis data from server
  useEffect(() => {
    if (!props.applicationId) return;
    let isMounted = true;
    api(`/applications/${props.applicationId}/pre-analysis`)
      .then(res => {
        if (isMounted && res && res.success && res.data) {
          setData(res.data);
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
    }
  };

  const updateField = (key: keyof PreAnalysisData, val: any) => {
    setData(prev => ({ ...prev, [key]: val }));
  };

  const handlePrint = () => {
    const docEl = document.getElementById('preana-digital-twin-doc');
    if (!docEl) {
      window.print();
      return;
    }

    // Reuse or create invisible print iframe
    let printFrame = document.getElementById('preana-print-frame') as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'preana-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Clone digital twin and remove screen-only UI/zoom
    const clone = docEl.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    clone.style.minWidth = '0';
    clone.style.maxWidth = '100%';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.padding = '0';
    clone.style.zoom = '1';
    clone.style.margin = '0 auto';

    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pre-Analysis Expert Judgement - ${data.preAnalysisNo || 'Form'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 3mm 3mm 3mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Calibri, Arial, sans-serif;
    }
    #preana-print-wrapper {
      width: 100% !important;
      margin: 0 auto !important;
      padding: 2mm 3mm !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    tr, td, th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    button, .fap-acc-sync-btn, .fap-acc-actions {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="preana-print-wrapper">
    ${clone.outerHTML}
  </div>
</body>
</html>`);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame?.contentWindow?.focus();
        printFrame?.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
        window.print();
      }
    }, 200);
  };

  return (
    <div className="fap-detail-split-container" style={{ margin: 0, height: 'calc(100vh - 165px)' }}>
      {/* LEFT COLUMN: 50% EDITABLE FORM */}
      <div className="fap-detail-form-col" style={{ paddingRight: '10px' }}>
        {/* Sticky Action Header */}
        <div style={{
          padding: '10px 14px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          marginBottom: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Left Info: Title + Ref & FAP No stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={17} color="#1b365d" style={{ flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                Pre-Analysis Form
              </h3>
            </div>
            <div style={{ fontSize: '0.73rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
              <div><span style={{ color: '#475569', fontWeight: 600 }}>Ref No:</span> {data.preAnalysisNo || '—'}</div>
              <div><span style={{ color: '#475569', fontWeight: 600 }}>FAP No:</span> {data.fapNumber || '—'}</div>
            </div>
          </div>

          {/* Right Actions: Unified Buttons + Recommendation status pill */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSyncCustomerPicData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Sync Customer, NPWP, PIC, and Area from FAP Application"
              >
                <RefreshCw size={12} color="#475569" />
                <span>Sync Customer Data</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Print Pre-Analysis Document"
              >
                <Printer size={12} color="#475569" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#1b365d',
                  color: '#ffffff',
                  border: '1px solid #1b365d',
                  padding: '5px 12px',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
                title="Save Pre-Analysis Draft"
              >
                {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>
            </div>

            {/* Status & Recommendation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {saveStatus === 'saved' && (
                <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginRight: '6px' }}>
                  <CheckCircle2 size={13} /> Saved
                </span>
              )}
              <span style={{
                whiteSpace: 'nowrap',
                background: data.recommendation === 'RECOMMEND' ? '#ecfdf5' : data.recommendation === 'CONDITIONAL' ? '#fffbeb' : '#fef2f2',
                color: data.recommendation === 'RECOMMEND' ? '#047857' : data.recommendation === 'CONDITIONAL' ? '#b45309' : '#b91c1c',
                fontSize: '0.67rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                border: `1px solid ${data.recommendation === 'RECOMMEND' ? '#a7f3d0' : data.recommendation === 'CONDITIONAL' ? '#fde68a' : '#fecaca'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: data.recommendation === 'RECOMMEND' ? '#10b981' : data.recommendation === 'CONDITIONAL' ? '#f59e0b' : '#ef4444'
                }} />
                {data.recommendation}
              </span>
            </div>
          </div>
        </div>

        {/* ACCORDION SECTIONS */}
        <div className="fap-accordion-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* SECTION 1: GENERAL & CUSTOMER SCREENING */}
          <div 
            className={`fap-accordion-card ${openSections.sec1 ? 'is-open' : 'is-closed'}`}
            id="acc-preana-sec-1"
          >
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec1')}
            >
              <div className="fap-acc-title-group">
                <span className="fap-acc-badge">01</span>
                <div>
                  <h4>1. General Information & Quick Screening</h4>
                  <p>Customer profile, NPWP, PIC assignments, and capital overview</p>
                </div>
              </div>
              <div className="fap-acc-actions">
                <button
                  type="button"
                  className="fap-acc-sync-btn"
                  
                  title="Sync Customer, NPWP, PIC, and Area from FAP Application"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSyncCustomerPicData();
                  }}
                >
                  <RefreshCw size={11} /> Sync Customer Data
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
                <div style={{ gridColumn: 'span 2' }}>
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

          {/* SECTION 2: PROJECT INFORMATION */}
          <div 
            className={`fap-accordion-card ${openSections.sec2 ? 'is-open' : 'is-closed'}`}
            id="acc-preana-sec-2"
          >
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec2')}
            >
              <div className="fap-acc-title-group">
                <span className="fap-acc-badge">02</span>
                <div>
                  <h4>2. Project Information & Bowheer</h4>
                  <p>Contractor role, project portfolio, bowheer DD, and financing scheme</p>
                </div>
              </div>
              <div className="fap-acc-actions">
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
                  <input
                    type="text"
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Role in Project</label>
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Contractors Involved</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Information on Bowheer (Track Record, Terms, Escrow)</label>
                  <textarea
                    rows={2}
                    name="bowheerInfo"
                    data-field="bowheerInfo"
                    value={data.bowheerInfo}
                    onChange={e => updateField('bowheerInfo', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-bowheerInfo')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Status & Contract Term</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Investment / Procurement Plan</label>
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
            )}
          </div>

          {/* SECTION 3: CUSTOMER & GROUP BACKGROUND */}
          <div 
            className={`fap-accordion-card ${openSections.sec3 ? 'is-open' : 'is-closed'}`}
            id="acc-preana-sec-3"
          >
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec3')}
            >
              <div className="fap-acc-title-group">
                <span className="fap-acc-badge">03</span>
                <div>
                  <h4>3. Customer & Group Background</h4>
                  <p>UBO hierarchy, company background, milestones, and finco partners</p>
                </div>
              </div>
              <div className="fap-acc-actions">
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Ultimate Beneficial Owner (UBO) & Shareholding</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Background & History</label>
                  <textarea
                    rows={2}
                    name="companyBackground"
                    data-field="companyBackground"
                    value={data.companyBackground}
                    onChange={e => updateField('companyBackground', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-companyBackground')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Key Milestones / Business Growth</label>
                    <button
                      type="button"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          milestones: [...prev.milestones, { year: '2026', entity: '', description: '' }]
                        }));
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Add Milestone
                    </button>
                  </div>
                  {data.milestones.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        placeholder="Year"
                        value={m.year}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.milestones];
                            arr[idx].year = val;
                            return { ...prev, milestones: arr };
                          });
                        }}
                        style={{ width: '70px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Entity / Project"
                        value={m.entity}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.milestones];
                            arr[idx].entity = val;
                            return { ...prev, milestones: arr };
                          });
                        }}
                        style={{ width: '140px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Milestone description..."
                        value={m.description}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.milestones];
                            arr[idx].description = val;
                            return { ...prev, milestones: arr };
                          });
                        }}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            milestones: prev.milestones.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', padding: '0 6px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Existing Finco / Bank Facilities Backup</label>
                  <textarea
                    rows={2}
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
          <div 
            className={`fap-accordion-card ${openSections.sec4 ? 'is-open' : 'is-closed'}`}
            id="acc-preana-sec-4"
          >
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec4')}
            >
              <div className="fap-acc-title-group">
                <span className="fap-acc-badge">04</span>
                <div>
                  <h4>4. Equipment Possibility of Success</h4>
                  <p>Job fit, utilization duration, LiuGong experience, and unit fleet</p>
                </div>
              </div>
              <div className="fap-acc-actions">
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
                  <textarea
                    rows={2}
                    name="equipmentJobFit"
                    data-field="equipmentJobFit"
                    value={data.equipmentJobFit}
                    onChange={e => updateField('equipmentJobFit', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-equipmentJobFit')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Utilization & Duration Expectations</label>
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
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Unit Composition & Target Equipment</label>
                    <button
                      type="button"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          unitComposition: [...prev.unitComposition, { brand: 'LiuGong', type: '', quantity: 1, remarks: '' }]
                        }));
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Add Unit
                    </button>
                  </div>
                  {data.unitComposition.map((u, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        placeholder="Brand"
                        value={u.brand}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.unitComposition];
                            arr[idx].brand = val;
                            return { ...prev, unitComposition: arr };
                          });
                        }}
                        style={{ width: '90px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Model / Type"
                        value={u.type}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.unitComposition];
                            arr[idx].type = val;
                            return { ...prev, unitComposition: arr };
                          });
                        }}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={u.quantity}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setData(prev => {
                            const arr = [...prev.unitComposition];
                            arr[idx].quantity = val;
                            return { ...prev, unitComposition: arr };
                          });
                        }}
                        style={{ width: '55px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Application remarks..."
                        value={u.remarks}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.unitComposition];
                            arr[idx].remarks = val;
                            return { ...prev, unitComposition: arr };
                          });
                        }}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            unitComposition: prev.unitComposition.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', padding: '0 6px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: CROSS-CHECK DEALER & LMI */}
          <div 
            className={`fap-accordion-card ${openSections.sec6 ? 'is-open' : 'is-closed'}`}
            id="acc-preana-sec-6"
          >
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec6')}
            >
              <div className="fap-acc-title-group">
                <span className="fap-acc-badge">06</span>
                <div>
                  <h4>6. Cross-Check with Dealer / LMI & Bureau SLIK</h4>
                  <p>Terms of payment, AR track record, SLIK/Pefindo, and lender exposures</p>
                </div>
              </div>
              <div className="fap-acc-actions">
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP Dealer to Customer</label>
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP LMI to Dealer</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LMI AR & Payment Track Record Check</label>
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
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>SLIK OJK / Pefindo Bureau Highlights</label>
                  <textarea
                    rows={2}
                    name="slikPefindoHighlight"
                    data-field="slikPefindoHighlight"
                    value={data.slikPefindoHighlight}
                    onChange={e => updateField('slikPefindoHighlight', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-slikPefindoHighlight')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Existing Lender Exposures (Bank & Multi-Finance)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          lenderExposures: [...prev.lenderExposures, { lender: '', plafond: '', rate: '' }]
                        }));
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Add Lender
                    </button>
                  </div>
                  {data.lenderExposures.map((l, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        placeholder="Lender / Bank"
                        value={l.lender}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.lenderExposures];
                            arr[idx].lender = val;
                            return { ...prev, lenderExposures: arr };
                          });
                        }}
                        style={{ flex: 1.5, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Plafond"
                        value={l.plafond}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.lenderExposures];
                            arr[idx].plafond = val;
                            return { ...prev, lenderExposures: arr };
                          });
                        }}
                        style={{ flex: 1.2, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Rate / Terms"
                        value={l.rate}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.lenderExposures];
                            arr[idx].rate = val;
                            return { ...prev, lenderExposures: arr };
                          });
                        }}
                        style={{ width: '110px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            lenderExposures: prev.lenderExposures.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', padding: '0 6px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: EXPERT JUDGEMENT CONCLUSION & RECOMMENDATION */}
          <div 
            className={`fap-accordion-card ${openSections.sec7 ? 'is-open' : 'is-closed'}`}
            id="acc-preana-sec-7"
            style={{ border: '2px solid #1e3a8a' }}
          >
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec7')}
              style={{ background: '#eff6ff' }}
            >
              <div className="fap-acc-title-group">
                <span className="fap-acc-badge" style={{ background: '#1e3a8a', color: '#ffffff' }}>07</span>
                <div>
                  <h4 style={{ color: '#1e3a8a' }}>7. Expert Judgement Conclusion & Recommendation</h4>
                  <p>Project & customer evaluation, risk mitigation, and executive sign-offs</p>
                </div>
              </div>
              <div className="fap-acc-actions">
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
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Good Project?</span>
                      <button
                        type="button"
                        onClick={() => updateField('goodProject', !data.goodProject)}
                        style={{
                          background: data.goodProject ? '#16a34a' : '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {data.goodProject ? 'YES' : 'NO'}
                      </button>
                    </div>
                    <input
                      type="text"
                      name="goodProjectNote"
                      data-field="goodProjectNote"
                      placeholder="Project justification..."
                      value={data.goodProjectNote}
                      onChange={e => updateField('goodProjectNote', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-goodProject')}
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Good Customer?</span>
                      <button
                        type="button"
                        onClick={() => updateField('goodCustomer', !data.goodCustomer)}
                        style={{
                          background: data.goodCustomer ? '#16a34a' : '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {data.goodCustomer ? 'YES' : 'NO'}
                      </button>
                    </div>
                    <input
                      type="text"
                      name="goodCustomerNote"
                      data-field="goodCustomerNote"
                      placeholder="Customer credibility note..."
                      value={data.goodCustomerNote}
                      onChange={e => updateField('goodCustomerNote', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-goodCustomer')}
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>
                    Final Recommendation
                  </label>
                  <select
                    name="recommendation"
                    data-field="recommendation"
                    value={data.recommendation}
                    onChange={e => updateField('recommendation', e.target.value as any)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-recommendation')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '2px solid #1e3a8a',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">— Select Recommendation —</option>
                    <option value="RECOMMEND">RECOMMEND</option>
                    <option value="NOT RECOMMEND TO FULL DOCUMENTATION">NOT RECOMMEND TO FULL DOCUMENTATION</option>
                    <option value="CONDITIONAL">CONDITIONAL</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Suggestion & Analytical Overview</label>
                  <textarea
                    rows={2}
                    name="suggestionOverview"
                    data-field="suggestionOverview"
                    value={data.suggestionOverview}
                    onChange={e => updateField('suggestionOverview', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-suggestionOverview')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Required Mitigation Conditions</label>
                    <button
                      type="button"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          mitigationConditions: [...prev.mitigationConditions, '']
                        }));
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Add Condition
                    </button>
                  </div>
                  {data.mitigationConditions.map((cond, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        placeholder="Mitigation requirement..."
                        value={cond}
                        onChange={e => {
                          const val = e.target.value;
                          setData(prev => {
                            const arr = [...prev.mitigationConditions];
                            arr[idx] = val;
                            return { ...prev, mitigationConditions: arr };
                          });
                        }}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            mitigationConditions: prev.mitigationConditions.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', padding: '0 6px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Market Competition & Benchmark Terms</label>
                  <textarea
                    rows={2}
                    name="competitionNotes"
                    data-field="competitionNotes"
                    value={data.competitionNotes}
                    onChange={e => updateField('competitionNotes', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-competitionNotes')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Proposed By</label>
                    <input
                      type="text"
                      name="proposedBy"
                      data-field="proposedBy"
                      value={data.proposedBy}
                      onChange={e => updateField('proposedBy', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-proposedBy')}
                      style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Reviewed By</label>
                    <input
                      type="text"
                      name="reviewedBy"
                      data-field="reviewedBy"
                      value={data.reviewedBy}
                      onChange={e => updateField('reviewedBy', e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Approved By</label>
                    <input
                      type="text"
                      name="approvedBy"
                      data-field="approvedBy"
                      value={data.approvedBy}
                      onChange={e => updateField('approvedBy', e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: 50% LIVE DOCUMENT PREVIEW */}
      <div className="fap-detail-preview-col" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Ribbon Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0'
        }}>
          {/* Segmented View Mode */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', gap: '4px' }}>
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

          {/* Zoom and Fullscreen Actions */}
          {viewMode === 'digital-twin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                title="Zoom Out"
                style={{ padding: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '40px', textAlign: 'center', color: '#475569' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                title="Zoom In"
                style={{ padding: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(0.75)}
                title="Reset Zoom to 75%"
                style={{ padding: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                <RotateCcw size={14} />
              </button>
              <div style={{ width: '1px', height: '18px', background: '#cbd5e1', margin: '0 2px' }} />
              <button
                type="button"
                onClick={handlePrint}
                title="Print Pre-Analysis Document (A4 Portrait)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: '#1b365d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Printer size={13} />
                <span>Print</span>
              </button>
            </div>
          )}
        </div>

        {/* Viewport Canvas */}
        <div 
          ref={previewContainerRef}
          id="preana-preview-viewport"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            background: '#f1f5f9',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
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
              id="preana-digital-twin-doc"
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
              <div 
                id="preana-preview-cell-preAnalysisNo"
                style={{ marginBottom: '16px', transition: 'all 0.2s ease' }}
              >
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
              <table 
                id="preana-preview-sec-1"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '16px', transition: 'all 0.2s ease' }}
              >
                <tbody>
                  <tr 
                    id="preana-preview-cell-customerProjectName"
                    onClick={() => handlePreviewCellClick('customerProjectName', 'sec1')}
                    title="Click to focus Customer / Project in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ width: '22%', padding: '4px 6px', fontWeight: 700 }}>Customer / Project</td>
                    <td style={{ width: '48%', padding: '4px 6px', fontWeight: 700, color: '#1b365d' }}>{data.customerProjectName}</td>
                    <td style={{ width: '14%', padding: '4px 6px', fontWeight: 700 }}>Dealer PIC</td>
                    <td style={{ width: '16%', padding: '4px 6px' }}>{data.dealerPic}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-taxId"
                    onClick={() => handlePreviewCellClick('taxId', 'sec1')}
                    title="Click to focus Tax ID in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Tax ID (NPWP)</td>
                    <td style={{ padding: '4px 6px' }}>{data.taxId}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LMI PIC</td>
                    <td style={{ padding: '4px 6px' }}>{data.lmiPic}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-fapNumber"
                    onClick={() => handlePreviewCellClick('fapNumber', 'sec1')}
                    title="Click to focus FAP No in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>FAP No</td>
                    <td style={{ padding: '4px 6px' }}>{data.fapNumber}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LFI PIC</td>
                    <td style={{ padding: '4px 6px' }}>{data.lfiPic}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-customerPic"
                    onClick={() => handlePreviewCellClick('customerPic', 'sec1')}
                    title="Click to focus Customer PIC in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Lead Source</td>
                    <td style={{ padding: '4px 6px' }}>{data.leadSource}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Customer PIC</td>
                    <td style={{ padding: '4px 6px' }}>{data.customerPic}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-customerArea"
                    onClick={() => handlePreviewCellClick('customerArea', 'sec1')}
                    title="Click to focus Customer Area in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Customer Area</td>
                    <td style={{ padding: '4px 6px' }}>{data.customerArea}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Date</td>
                    <td style={{ padding: '4px 6px' }}>{data.preAnalysisDate}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-equity"
                    onClick={() => handlePreviewCellClick('equity', 'sec1')}
                    title="Click to focus Equity in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Equity</td>
                    <td style={{ padding: '4px 6px' }}>{data.equity}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Paid up Cap.</td>
                    <td style={{ padding: '4px 6px' }}>{data.paidUpCapital}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-sourceOfRepayment"
                    onClick={() => handlePreviewCellClick('sourceOfRepayment', 'sec1')}
                    title="Click to focus Source of Repayment in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Source of Repayment</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.sourceOfRepayment}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 2 Banner: 2. PROJECT INFORMATION */}
              <div 
                id="preana-preview-sec-2"
                style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px', transition: 'all 0.2s ease' }}
              >
                2. PROJECT INFORMATION
              </div>

              {/* Section 2 Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr 
                    id="preana-preview-cell-projectNameLocation"
                    onClick={() => handlePreviewCellClick('projectNameLocation', 'sec2')}
                    title="Click to focus Project Name & Location in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ width: '28%', padding: '4px 6px', fontWeight: 700 }}>Project Name & Location</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.projectNameLocation}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-customerRole"
                    onClick={() => handlePreviewCellClick('customerRole', 'sec2')}
                    title="Click to focus Customer Role in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Role in Project</td>
                    <td style={{ width: '32%', padding: '4px 6px' }}>{data.customerRole}</td>
                    <td style={{ width: '18%', padding: '4px 6px', fontWeight: 700 }}>Other Contractors</td>
                    <td style={{ width: '22%', padding: '4px 6px' }}>{data.otherContractors}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-projectOwner"
                    onClick={() => handlePreviewCellClick('projectOwner', 'sec2')}
                    title="Click to focus Project Owner in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Owner / Bowheer</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.projectOwner}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-bowheerInfo"
                    onClick={() => handlePreviewCellClick('bowheerInfo', 'sec2')}
                    title="Click to focus Bowheer Info in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Info on Bowheer</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.bowheerInfo}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-projectStatus"
                    onClick={() => handlePreviewCellClick('projectStatus', 'sec2')}
                    title="Click to focus Project Status in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Status</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.projectStatus}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-investmentPlan"
                    onClick={() => handlePreviewCellClick('investmentPlan', 'sec2')}
                    title="Click to focus Investment Plan in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Investment Plan</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.investmentPlan}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-financingSchemeRequested"
                    onClick={() => handlePreviewCellClick('financingSchemeRequested', 'sec2')}
                    title="Click to focus Financing Scheme in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Financing Scheme Requested</td>
                    <td colSpan={3} style={{ padding: '4px 6px' }}>{data.financingSchemeRequested}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 3 Banner: 3. CUSTOMER & GROUP BACKGROUND */}
              <div 
                id="preana-preview-sec-3"
                style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px', transition: 'all 0.2s ease' }}
              >
                3. CUSTOMER & GROUP BACKGROUND
              </div>

              {/* Section 3 Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr 
                    id="preana-preview-cell-uboInfo"
                    onClick={() => handlePreviewCellClick('uboInfo', 'sec3')}
                    title="Click to focus UBO Info in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ width: '28%', padding: '4px 6px', fontWeight: 700 }}>UBO / Ownership</td>
                    <td style={{ padding: '4px 6px' }}>{data.uboInfo}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-companyBackground"
                    onClick={() => handlePreviewCellClick('companyBackground', 'sec3')}
                    title="Click to focus Company Background in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Company Background</td>
                    <td style={{ padding: '4px 6px' }}>{data.companyBackground}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-milestones"
                    onClick={() => handlePreviewCellClick('milestones', 'sec3')}
                    title="Click to focus Milestones in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700, verticalAlign: 'top' }}>Milestones / Growth</td>
                    <td style={{ padding: '4px 6px' }}>
                      {(!data.milestones || data.milestones.length === 0) ? (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '8pt' }}>— Belum ada milestone —</span>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                          <tbody>
                            {data.milestones.map((m, i) => (
                              <tr key={i}>
                                <td style={{ width: '15%', fontWeight: 700, padding: '2px 4px', borderBottom: '1px dotted #cbd5e1' }}>{m.year}</td>
                                <td style={{ width: '25%', fontWeight: 600, padding: '2px 4px', borderBottom: '1px dotted #cbd5e1' }}>{m.entity}</td>
                                <td style={{ padding: '2px 4px', borderBottom: '1px dotted #cbd5e1' }}>{m.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-existingFincoBackup"
                    onClick={() => handlePreviewCellClick('existingFincoBackup', 'sec3')}
                    title="Click to focus Finco Backup in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Existing Finco / Bank</td>
                    <td style={{ padding: '4px 6px' }}>{data.existingFincoBackup}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 4 Banner: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
              <div 
                id="preana-preview-sec-4"
                style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px', transition: 'all 0.2s ease' }}
              >
                4. EQUIPMENT POSSIBILITY OF SUCCESS
              </div>

              {/* Section 4 Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr 
                    id="preana-preview-cell-equipmentJobFit"
                    onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')}
                    title="Click to focus Equipment Job Fit in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ width: '28%', padding: '4px 6px', fontWeight: 700 }}>Equipment Job Fit</td>
                    <td style={{ padding: '4px 6px' }}>{data.equipmentJobFit}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-utilizationDuration"
                    onClick={() => handlePreviewCellClick('utilizationDuration', 'sec4')}
                    title="Click to focus Utilization in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Utilization & Duration</td>
                    <td style={{ padding: '4px 6px' }}>{data.utilizationDuration}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-priorLiugongExperience"
                    onClick={() => handlePreviewCellClick('priorLiugongExperience', 'sec4')}
                    title="Click to focus Prior LiuGong Exp in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Prior LiuGong Exp.</td>
                    <td style={{ padding: '4px 6px' }}>{data.priorLiugongExperience}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-serviceAgreementFmc"
                    onClick={() => handlePreviewCellClick('serviceAgreementFmc', 'sec4')}
                    title="Click to focus Service Agreement in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Service Agreement / FMC</td>
                    <td style={{ padding: '4px 6px' }}>{data.serviceAgreementFmc}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section 6 Banner: 6. CROSS-CHECK WITH DEALER / LMI & PEFINDO */}
              <div 
                id="preana-preview-sec-6"
                style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px', transition: 'all 0.2s ease' }}
              >
                6. CROSS-CHECK WITH DEALER / LMI & PEFINDO
              </div>

              {/* Section 6 Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr 
                    id="preana-preview-cell-topDealerToCustomer"
                    onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')}
                    title="Click to focus TOP Dealer in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ width: '28%', padding: '4px 6px', fontWeight: 700 }}>TOP Dealer to Customer</td>
                    <td style={{ padding: '4px 6px' }}>{data.topDealerToCustomer}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-topLmiToDealer"
                    onClick={() => handlePreviewCellClick('topLmiToDealer', 'sec6')}
                    title="Click to focus TOP LMI in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>TOP LMI to Dealer</td>
                    <td style={{ padding: '4px 6px' }}>{data.topLmiToDealer}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-lmiArCheck"
                    onClick={() => handlePreviewCellClick('lmiArCheck', 'sec6')}
                    title="Click to focus LMI AR in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LMI AR Payment Track</td>
                    <td style={{ padding: '4px 6px' }}>{data.lmiArCheck}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-slikPefindoHighlight"
                    onClick={() => handlePreviewCellClick('slikPefindoHighlight', 'sec6')}
                    title="Click to focus SLIK in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>SLIK / Pefindo Status</td>
                    <td style={{ padding: '4px 6px' }}>{data.slikPefindoHighlight}</td>
                  </tr>
                  <tr 
                    id="preana-preview-cell-lenderExposures"
                    onClick={() => handlePreviewCellClick('lenderExposures', 'sec6')}
                    title="Click to focus Lender Exposures in form"
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700, verticalAlign: 'top' }}>Existing Lenders</td>
                    <td style={{ padding: '4px 6px' }}>
                      {(!data.lenderExposures || data.lenderExposures.length === 0) ? (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '8pt' }}>— Belum ada lender exposure —</span>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Lender</th>
                              <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Plafond</th>
                              <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Rate / Terms</th>
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
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 7 Banner: 7. EXPERT JUDGEMENT CONCLUSION */}
              <div 
                id="preana-preview-sec-7"
                style={{ background: '#1b365d', color: '#ffffff', padding: '6px 10px', fontWeight: 800, fontSize: '10.5pt', marginBottom: '8px', transition: 'all 0.2s ease' }}
              >
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
                  <tr 
                    id="preana-preview-cell-goodProject"
                    onClick={() => handlePreviewCellClick('goodProjectNote', 'sec7')}
                    title="Click to focus Good Project in form"
                    style={{ borderBottom: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
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
                  <tr 
                    id="preana-preview-cell-goodCustomer"
                    onClick={() => handlePreviewCellClick('goodCustomerNote', 'sec7')}
                    title="Click to focus Good Customer in form"
                    style={{ borderBottom: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
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
              <div 
                id="preana-preview-cell-recommendation"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                title="Click to focus Recommendation in form"
                style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <div style={{ width: '25%', fontWeight: 800, fontSize: '10pt', color: '#000000' }}>
                  RECOMMENDATION
                </div>
                <div style={{
                  flex: 1,
                  background: !data.recommendation ? '#94a3b8' : (data.recommendation === 'RECOMMEND' ? '#16a34a' : '#dc2626'),
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '8px 12px',
                  fontWeight: 900,
                  fontSize: '11pt',
                  borderRadius: '4px',
                  letterSpacing: '0.5px'
                }}>
                  {data.recommendation || '— BELUM ADA REKOMENDASI —'}
                </div>
              </div>

              {/* Suggestions & Risk Mitigations */}
              <div 
                id="preana-preview-cell-suggestionOverview"
                onClick={() => handlePreviewCellClick('suggestionOverview', 'sec7')}
                title="Click to focus Suggestions in form"
                style={{ marginBottom: '14px', fontSize: '9pt', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>Suggestion:</div>
                <div style={{ marginBottom: '6px', lineHeight: 1.35 }}>{data.suggestionOverview}</div>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
                  Mitigation conditions required if proceeding:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.35 }}>
                  {(!data.mitigationConditions || data.mitigationConditions.length === 0) ? (
                    <li style={{ color: '#94a3b8', fontStyle: 'italic', listStyleType: 'none', marginLeft: '-20px' }}>— Belum ada kondisi mitigasi —</li>
                  ) : (
                    data.mitigationConditions.map((cond, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>{cond}</li>
                    ))
                  )}
                </ul>
              </div>

              {/* Sign-off Approval Block */}
              <div 
                id="preana-preview-cell-proposedBy"
                onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
                title="Click to focus Proposed By in form"
                style={{ border: '1px solid #000000', padding: '10px 14px', marginTop: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
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
