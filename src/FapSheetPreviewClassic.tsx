import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Printer,
  Eye,
} from 'lucide-react';
import { LIUGONG_LOGO_B64 } from './liugong-logo-b64';
import { useMasterData } from './master-data';

export interface FapSheetData {
  fapNumber?: string;
  applicationDate?: string;
  branchCode?: string;
  customerStatus?: string;
  companyName?: string;
  companyType?: string;
  nib?: string;
  nibDate?: string;
  npwp?: string;
  establishmentActNo?: string;
  establishmentDate?: string;
  companyAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  experienceYears?: string | number;
  experienceMonths?: string | number;
  mainBusiness?: string;
  latestDeedNo?: string;
  latestDeedDate?: string;
  phoneFax?: string;
  website?: string;
  email?: string;
  repaymentSource?: string;
  locationStatus?: string;
  picName?: string;
  position?: string;
  phone?: string;
  currentAddress?: string;
  picCity?: string;
  picProvince?: string;
  picPostalCode?: string;
  selectedDeedNo?: string;
  stakeholders?: any[];
  // Extended FAP data
  facilityPurpose?: string;
  financingMethod?: string;
  financingValue?: number | string;
  downPaymentValue?: number | string;
  interestRate?: number | string;
  tenorMonths?: number | string;
  paymentMethod?: string;
  industrySegment?: string;
  businessRole?: string;
  proposal?: any;
  projects?: any[];
  bankReferences?: any[];
  financialStatements?: any[];
  units?: any[];
  assetSummaryHeLiuGong?: number | string;
  assetSummaryTruckLiuGong?: number | string;
  assetSummaryHeNonLiuGong?: number | string;
  assetSummaryTruckNonLiuGong?: number | string;
  [key: string]: any;
}

export interface FapSheetPreviewProps {
  data?: FapSheetData;
  application?: any;
  customer?: any;
  profile?: any;
  pic?: any;
  stakeholders?: any[];
  compact?: boolean;
  readOnly?: boolean;
  activeSection?: string;
  syncTick?: number;
  onSectionClick?: (sectionId: string) => void;
  onPrint?: () => void | Promise<void>;
  hideToolbar?: boolean;
  isComparison?: boolean;
  diffs?: Array<{ field: string; label: string; oldValue: string; newValue: string }>;
  diffSide?: 'system' | 'ocr';
  onDiffClick?: (field: string) => void;
  externalZoom?: number;
  onZoomChange?: (z: number) => void;
  onSwitchToApproved?: () => void;
}

export function FapSheetPreviewClassic(props: FapSheetPreviewProps & { onSwitchToApproved?: () => void }) {
  const master = useMasterData();
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(props.compact ? 0.85 : 1.0);
  const [paperHeight, setPaperHeight] = useState<number>(2400);
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (props.externalZoom !== undefined && props.externalZoom > 0) {
      setZoomLevel(props.externalZoom);
      setAutoFit(false);
    }
  }, [props.externalZoom]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [props.application?.id, props.data?.fapNumber]);

  useEffect(() => {
    const updateFit = () => {
      if (!containerRef.current) return;
      const cWidth = containerRef.current.clientWidth;
      if (paperRef.current) {
        const h = paperRef.current.offsetHeight;
        if (h > 0) setPaperHeight(h);
      }
      if (!autoFit) return;
      
      const targetWidth = 940;
      // Account for viewport padding (14px * 2 = 28px) plus 8px safety
      const padding = 32;
      const available = Math.max(260, cWidth - padding);
      const scale = Math.min(1.15, Math.max(0.35, available / targetWidth));
      setZoomLevel(Number(scale.toFixed(3)));
    };

    updateFit();

    // Use ResizeObserver on container and paper
    const ro = new ResizeObserver(() => {
      updateFit();
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    if (paperRef.current) {
      ro.observe(paperRef.current);
    }

    // Window resize & Windows Zoom / Display Scaling listener
    window.addEventListener('resize', updateFit);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateFit);
    }

    // Also listen to devicePixelRatio / Windows scale changes
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handleDpiChange = () => {
      updateFit();
    };
    try {
      mq.addEventListener('change', handleDpiChange);
    } catch {}

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateFit);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateFit);
      }
      try {
        mq.removeEventListener('change', handleDpiChange);
      } catch {}
    };
  }, [autoFit]);

  useEffect(() => {
    if (!props.activeSection || !containerRef.current) return;
    const target = document.getElementById(props.activeSection);
    if (!target) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;
    const relativeOffset = targetRect.top - containerRect.top;
    const targetScroll = Math.max(0, currentScrollTop + relativeOffset - 28);

    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });

    target.classList.remove('fap-preview-sync-highlight');
    void target.offsetWidth;
    target.classList.add('fap-preview-sync-highlight');
    const timer = setTimeout(() => {
      target.classList.remove('fap-preview-sync-highlight');
    }, 2500);

    return () => clearTimeout(timer);
  }, [props.activeSection, props.syncTick]);

  const d: FapSheetData = useMemo(() => {
    const raw = props.data || {};
    const app = props.application || {};
    const cust = props.customer || app.customer || {};
    const prof = props.profile || app.profile || {};
    const p = props.pic || app.pic || raw.pic || {};
    const sh = props.stakeholders || app.stakeholders || raw.stakeholders || [];
    const prop = raw.proposal || app.proposal || {};

    const pick = (valA: any, valB: any, valC?: any, fallback = '') => {
      if (valA !== undefined && valA !== null && valA !== '') return valA;
      if (valB !== undefined && valB !== null && valB !== '') return valB;
      if (valC !== undefined && valC !== null && valC !== '') return valC;
      return fallback;
    };

    const resolveLocationLabel = (groupKey: 'province' | 'city' | 'district' | 'village', val: any) => {
      if (!val) return '';
      const str = String(val).trim();
      if (!str) return '';
      const items = (master as any)?.[groupKey] || [];
      const found = items.find((x: any) => x.value === str || x.name.toLowerCase() === str.toLowerCase());
      if (found) return found.name;
      // If it's a UUID and not found in master data, avoid showing hashcode
      if (/^[0-9a-f-]{32,36}$/i.test(str)) {
        return '';
      }
      return str;
    };

    return {
      fapNumber: pick(raw.fapNumber, app.fapNumber, '', '—'),
      applicationDate: pick(raw.applicationDate, app.applicationDate, ''),
      branchCode: pick(raw.branchCode, app.branchCode, ''),
      customerStatus: pick(raw.customerStatus, app.customerStatus, ''),
      companyName: pick(raw.companyName, cust.companyName, ''),
      companyType: pick(raw.companyType, cust.companyType, ''),
      nib: pick(raw.nib, cust.nib, ''),
      npwp: pick(raw.npwp, cust.npwp, ''),
      establishmentActNo: pick(raw.establishmentActNo, cust.establishmentActNo, ''),
      establishmentDate: pick(raw.establishmentDate, cust.establishmentDate, ''),
      companyAddress: pick(raw.companyAddress, prof.companyAddress, ''),
      city: resolveLocationLabel('city', pick(raw.city, prof.city, '')),
      province: resolveLocationLabel('province', pick(raw.province, prof.province, '')),
      district: resolveLocationLabel('district', pick(raw.district, prof.district, '')),
      village: resolveLocationLabel('village', pick(raw.village, prof.village, '')),
      rt: pick(raw.rt, prof.rt, ''),
      rw: pick(raw.rw, prof.rw, ''),
      postalCode: pick(raw.postalCode, prof.postalCode, ''),
      experienceYears: pick(raw.experienceYears, prof.experienceYears, ''),
      experienceMonths: pick(raw.experienceMonths, prof.experienceMonths, ''),
      mainBusiness: pick(raw.mainBusiness, prof.mainBusiness, ''),
      latestDeedNo: pick(raw.latestDeedNo, prof.latestDeedNo, ''),
      latestDeedDate: pick(raw.latestDeedDate, prof.latestDeedDate, ''),
      phoneFax: pick(raw.phoneFax, prof.phoneFax, ''),
      website: pick(raw.website, prof.website, ''),
      email: pick(raw.email, prof.email, ''),
      repaymentSource: pick(raw.repaymentSource, prof.repaymentSource, ''),
      locationStatus: pick(raw.locationStatus, prof.locationStatus, ''),
      picName: pick(raw.picName, p.picName, p.name, ''),
      position: pick(raw.position, p.position, ''),
      phone: pick(raw.phone, p.phone, p.mobilePhone, ''),
      picEmail: pick(raw.picEmail, p.email, ''),
      currentAddress: pick(raw.currentAddress, p.currentAddress, ''),
      picCity: resolveLocationLabel('city', pick(raw.picCity, p.city, '')),
      picProvince: resolveLocationLabel('province', pick(raw.picProvince, p.province, '')),
      picPostalCode: pick(raw.picPostalCode, p.postalCode, ''),
      selectedDeedNo: pick(raw.selectedDeedNo, prof.latestDeedNo, ''),
      stakeholders: sh.length ? sh : (raw.stakeholders || app.stakeholders || []),
      // Extended fields
      facilityPurpose: pick(raw.facilityPurpose, prop.facilityPurpose, ''),
      financingMethod: pick(raw.financingMethod, prop.financingMethod, ''),
      financingValue: pick(raw.financingValue, prop.financingValue, ''),
      downPaymentValue: pick(raw.downPaymentValue, prop.downPaymentValue, ''),
      interestRate: pick(raw.interestRate, prop.interestRate, ''),
      tenorMonths: pick(raw.tenorMonths, prop.tenorMonths, ''),
      paymentMethod: pick(raw.paymentMethod, prop.paymentMethod, ''),
      industrySegment: pick(raw.industrySegment, app.industrySegment, ''),
      businessRole: pick(raw.businessRole, app.businessRole, ''),
      proposal: prop,
      projects: raw.projects || app.projects || [],
      bankReferences: raw.bankReferences || app.bankReferences || [],
      financialStatements: raw.financialStatements || app.financialStatements || [],
      units: raw.units || prop.units || [],
      assetSummaryHeLiuGong: pick(raw.assetSummaryHeLiuGong, app.assetSummaryHeLiuGong, ''),
      assetSummaryTruckLiuGong: pick(raw.assetSummaryTruckLiuGong, app.assetSummaryTruckLiuGong, ''),
      assetSummaryHeNonLiuGong: pick(raw.assetSummaryHeNonLiuGong, app.assetSummaryHeNonLiuGong, ''),
      assetSummaryTruckNonLiuGong: pick(raw.assetSummaryTruckNonLiuGong, app.assetSummaryTruckNonLiuGong, ''),
    };
  }, [props.data, props.application, props.customer, props.profile, props.pic, props.stakeholders, master]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '  /  /    ';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num?: number | string) => {
    if (num === undefined || num === null || num === '' || num === 0) return '—';
    const n = Number(num);
    if (isNaN(n) || n === 0) return '—';
    return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (num?: number | string) => {
    if (num === undefined || num === null || num === '' || num === 0) return '—';
    const n = Number(num);
    if (isNaN(n) || n === 0) return '—';
    return 'Rp ' + n.toLocaleString('id-ID');
  };

  const fsList = (d.financialStatements && d.financialStatements.length > 0)
    ? d.financialStatements
    : [
        { fiscalYear: 2023, isAudited: false, currentAssets: '', nonCurrentAssets: '', totalAssets: '', currentLiabilities: '', longTermLiabilities: '', totalLiabilities: '', equity: '', revenue: '', grossMargin: '', operatingMargin: '', tax: '', netIncome: '' },
        { fiscalYear: 2024, isAudited: false, currentAssets: '', nonCurrentAssets: '', totalAssets: '', currentLiabilities: '', longTermLiabilities: '', totalLiabilities: '', equity: '', revenue: '', grossMargin: '', operatingMargin: '', tax: '', netIncome: '' },
        { fiscalYear: 2025, isAudited: false, currentAssets: '', nonCurrentAssets: '', totalAssets: '', currentLiabilities: '', longTermLiabilities: '', totalLiabilities: '', equity: '', revenue: '', grossMargin: '', operatingMargin: '', tax: '', netIncome: '' },
      ];

  const handlePrint = () => {
    printFapDocument(d.fapNumber);
  };

  const isCustNew = d.customerStatus === 'NEW';
  const isCustExisting = d.customerStatus === 'EXISTING' || !isCustNew;
  const isCorp = d.companyType === 'CORPORATE';
  const isComm = d.companyType === 'COMMERCIAL';

  const showRibbon = !props.hideToolbar && !props.isComparison;

  const getDiff = (key: string) => {
    if (!props.diffs || props.diffs.length === 0) return null;
    const lowerKey = key.toLowerCase();
    return props.diffs.find((item: any) => {
      const dField = (item.field || '').toLowerCase();
      if (dField === lowerKey) return true;
      if (lowerKey === 'phone' && (dField === 'picphone' || dField === 'phonefax')) return true;
      if (lowerKey === 'picphone' && (dField === 'phone' || dField === 'picphone')) return true;
      if (lowerKey === 'position' && (dField === 'picposition' || dField === 'position')) return true;
      if (lowerKey === 'picposition' && (dField === 'picposition' || dField === 'position')) return true;
      if (lowerKey === 'picemail' && (dField === 'picemail' || dField === 'email')) return true;
      if (lowerKey === 'establishmentactno' && (dField === 'establishmentactno' || dField === 'deedno')) return true;
      return false;
    });
  };

  const getDiffClass = (key: string, baseClass = 'exact-fap-box highlight-dynamic') => {
    const diff = getDiff(key);
    if (!diff) return baseClass;
    return `${baseClass} fap-diff-cell-highlight`;
  };

  const renderDiffBadge = (_key: string) => null;

  return (
    <div className={`excel-fap-viewer ${props.isComparison ? 'in-comparison-mode' : ''}`}>
      {/* Excel Green Ribbon Header (Hidden in 50/50 comparison mode for perfect vertical alignment) */}
      {showRibbon && (
        <div className="excel-fap-ribbon">
          <div className="excel-ribbon-left">
            <FileSpreadsheet size={16} className="excel-brand-icon" />
            <div className="excel-file-badge">
              <span className="excel-file-name">FAP-Document_APPROVED_v01.2025.xlsx</span>
              <span className="excel-tab-badge">Sheet1 · Official Bilingual Format</span>
            </div>
          </div>
          <div className="excel-ribbon-right">
            <div className="excel-zoom-controls">
              <button
                type="button"
                className={`excel-zoom-mode-btn ${autoFit ? 'active' : ''}`}
                onClick={() => setAutoFit(!autoFit)}
                title={autoFit ? 'Auto-fit active: document automatically fits the view width' : 'Enable Auto-fit view'}
              >
                Auto Fit
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoFit(false);
                  setZoomLevel((z) => Math.max(0.35, Number((z - 0.05).toFixed(2))));
                }}
                title="Zoom Out (-)"
              >
                <ZoomOut size={13} />
              </button>
              <span className="excel-zoom-btn-label">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setAutoFit(false);
                  setZoomLevel((z) => Math.min(1.5, Number((z + 0.05).toFixed(2))));
                }}
                title="Zoom In (+)"
              >
                <ZoomIn size={13} />
              </button>
            </div>
            <button
              type="button"
              className="excel-print-btn"
              onClick={handlePrint}
              title="Print / Download Official A4 PDF Sheet"
            >
              <Printer size={13} /> Print A4 Document
            </button>
          </div>

          {/* Quick Jump & Auto-Sync Bar */}
          <div className="excel-section-chips">
            <span className="excel-sync-bar-label">
              <Eye size={12} /> Auto-Sync Focus:
            </span>
            {[
              { id: 'fap-preview-sec-header', label: '1. Identity' },
              { id: 'fap-preview-sec-company', label: '2. Domicile' },
              { id: 'fap-preview-sec-business', label: '3. Business Profile' },
              { id: 'fap-preview-sec-pic', label: '4. PIC' },
              { id: 'fap-preview-sec-projects', label: '5. Projects' },
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                className={`excel-chip-btn ${props.activeSection === chip.id ? 'active' : ''}`}
                onClick={() => props.onSectionClick?.(chip.id)}
                title={`Jump to section ${chip.label}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spreadsheet Canvas */}
      <div className="excel-fap-viewport" ref={containerRef}>
        <div
          className="excel-fap-paper-scaler"
          style={{
            width: `${Math.round(940 * zoomLevel)}px`,
            minHeight: `${Math.round(paperHeight * zoomLevel) + 24}px`,
            margin: '0 auto',
            position: 'relative',
            overflow: 'visible',
            flexShrink: 0
          }}
        >
          <div
            id="fap-excel-printable-doc"
            ref={paperRef}
            className="excel-fap-paper"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              width: '940px',
              minWidth: '940px',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
          {/* ==============================================================
              SECTION 1: HEADER & CLASSIFICATION (ROWS 1 - 10)
              ============================================================== */}
          <div className="excel-exact-header" id="fap-preview-sec-header">
            <div className="exact-header-top">
              <div className="exact-header-logo">
                <img
                  src={LIUGONG_LOGO_B64.startsWith('data:') ? LIUGONG_LOGO_B64 : `data:image/png;base64,${LIUGONG_LOGO_B64}`}
                  alt="LiuGong Finance Indonesia"
                />
              </div>
              <div className="exact-header-title">APPLICATION FORM</div>
              <div className="exact-header-reg">
                <span className="reg-lbl">No. Register :</span>
                <span className="reg-val highlight-dynamic">{d.fapNumber}</span>
              </div>
            </div>

            <div className="exact-navy-bar" />

            <div className="exact-matrix-grid">
              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Date</span>
                  <span className="exact-matrix-val highlight-dynamic">{formatDate(d.applicationDate)}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Branch</span>
                  <span className="exact-matrix-val highlight-dynamic">{d.branchCode}</span>
                </div>
              </div>

              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">New Customer</span>
                  <span className="exact-matrix-chk">{isCustNew ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Existing Customer</span>
                  <span className="exact-matrix-chk">{isCustExisting ? '☑' : '☐'}</span>
                </div>
              </div>

              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Corporate</span>
                  <span className="exact-matrix-chk">{isCorp ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Commercial</span>
                  <span className="exact-matrix-chk">{isComm ? '☑' : '☐'}</span>
                </div>
              </div>

              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Micro</span>
                  <span className="exact-matrix-chk">☐</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">LiuGong Used</span>
                  <span className="exact-matrix-chk">☐</span>
                </div>
              </div>
            </div>

            <div className="exact-orange-bar" />
          </div>

          {/* ==============================================================
              SECTION 2: PROFIL PERUSAHAAN & PIC / SHAREHOLDERS (ROWS 12 - 45)
              ============================================================== */}
          <div className="exact-fap-body">
            {/* Left Column: Company Details */}
            <div className="exact-fap-col" id="fap-preview-sec-company">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Company Name</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-companyName" className={getDiffClass('companyName')}>
                  <span>{d.companyName}</span>
                  {renderDiffBadge('companyName')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Company Address</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-companyAddress" className={getDiffClass('companyAddress', 'exact-fap-box multiline highlight-dynamic')}>
                  <span>{d.companyAddress}</span>
                  {renderDiffBadge('companyAddress')}
                </div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">City</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-city" className={getDiffClass('city')}>
                  <span>{d.city}</span>
                  {renderDiffBadge('city')}
                </div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">District</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-district" className={getDiffClass('district')}>
                  <span>{d.district || '—'}</span>
                  {renderDiffBadge('district')}
                </div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">Village</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-village" className={getDiffClass('village')}>
                  <span>{d.village || '—'}</span>
                  {renderDiffBadge('village')}
                </div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">RT / RW</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-rt" className={getDiff('rt') || getDiff('rw') ? getDiffClass('rt') : 'exact-fap-box highlight-dynamic'}>
                  <span>{d.rt && d.rw ? `${d.rt} / ${d.rw}` : d.rt || d.rw || '—'}</span>
                  {renderDiffBadge('rt') || renderDiffBadge('rw')}
                </div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">Province</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-province" className={getDiffClass('province')}>
                  <span>{d.province}</span>
                  {renderDiffBadge('province')}
                </div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">Postal code</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-postalCode" className={getDiffClass('postalCode')}>
                  <span>{d.postalCode}</span>
                  {renderDiffBadge('postalCode')}
                </div>
              </div>

              <div className="exact-fap-row" id="fap-preview-sec-business">
                <span className="exact-fap-lbl">Main Business</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-mainBusiness" className={getDiffClass('mainBusiness')}>
                  <span>{d.mainBusiness}</span>
                  {renderDiffBadge('mainBusiness')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Establishment Deed No.</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-establishmentActNo" className={getDiffClass('establishmentActNo')} style={{ flex: 1.3 }}>
                    <span>{d.establishmentActNo}</span>
                    {renderDiffBadge('establishmentActNo')}
                  </div>
                  <div className="exact-inline-group" style={{ flex: 1.1 }}>
                    <span className="exact-inline-lbl">Est. Date :</span>
                    <div id="fap-diff-cell-establishmentDate" className={getDiffClass('establishmentDate')}>
                      <span>{formatDate(d.establishmentDate)}</span>
                      {renderDiffBadge('establishmentDate')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Experience</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row" style={{ alignItems: 'center' }}>
                  <div id="fap-diff-cell-experienceYears" className={getDiffClass('experienceYears')} style={{ maxWidth: '65px', textAlign: 'center' }}>
                    <span>{d.experienceYears}</span>
                    {renderDiffBadge('experienceYears')}
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>years</span>
                  <div id="fap-diff-cell-experienceMonths" className={getDiffClass('experienceMonths')} style={{ maxWidth: '65px', textAlign: 'center' }}>
                    <span>{d.experienceMonths}</span>
                    {renderDiffBadge('experienceMonths')}
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>months</span>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Latest Amendment Deed No.</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-latestDeedNo" className={getDiffClass('latestDeedNo')} style={{ flex: 1.3 }}>
                    <span>{d.latestDeedNo}</span>
                    {renderDiffBadge('latestDeedNo')}
                  </div>
                  <div className="exact-inline-group" style={{ flex: 1.1 }}>
                    <span className="exact-inline-lbl">Date :</span>
                    <div id="fap-diff-cell-latestDeedDate" className={getDiffClass('latestDeedDate')}>
                      <span>{formatDate(d.latestDeedDate)}</span>
                      {renderDiffBadge('latestDeedDate')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">NIB (Business Registration Number)</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-nib" className={getDiffClass('nib')} style={{ flex: 1.3 }}>
                    <span>{d.nib}</span>
                    {renderDiffBadge('nib')}
                  </div>
                  <div className="exact-inline-group" style={{ flex: 1.1 }}>
                    <span className="exact-inline-lbl">Est. Date :</span>
                    <div id="fap-diff-cell-nibDate" className={getDiffClass('nibDate')}>
                      <span>{formatDate(d.nibDate)}</span>
                      {renderDiffBadge('nibDate')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">NPWP/No.Tax</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-npwp" className={getDiffClass('npwp')}>
                  <span>{d.npwp}</span>
                  {renderDiffBadge('npwp')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Phone / Fax</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-phoneFax" className={getDiffClass('phoneFax')}>
                  <span>{d.phoneFax}</span>
                  {renderDiffBadge('phoneFax')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Website</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.website || '-'}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Email</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-email" className={getDiffClass('email')}>
                  <span>{d.email}</span>
                  {renderDiffBadge('email')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Repayment Source</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.repaymentSource}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Business Location Status</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.locationStatus}</div>
              </div>
            </div>

            {/* Right Column: PIC & Shareholders */}
            <div className="exact-fap-col" id="fap-preview-sec-pic">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl" style={{ width: '135px' }}>Person in Charge / PIC</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-picName" className={getDiffClass('picName')} style={{ flex: 1.2 }}>
                    <span>{d.picName}</span>
                    {renderDiffBadge('picName')}
                  </div>
                  <div className="exact-inline-group" style={{ flex: 1.2 }}>
                    <span className="exact-inline-lbl">Phone :</span>
                    <div id="fap-diff-cell-picPhone" className={getDiff('picPhone') || getDiff('phone') ? getDiffClass('picPhone') : 'exact-fap-box highlight-dynamic'}>
                      <span>{d.phone}</span>
                      {renderDiffBadge('picPhone') || renderDiffBadge('phone')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl" style={{ width: '135px' }}>Position</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-picPosition" className={getDiff('picPosition') || getDiff('position') ? getDiffClass('picPosition') : 'exact-fap-box highlight-dynamic'} style={{ flex: 1.2 }}>
                    <span>{d.position}</span>
                    {renderDiffBadge('picPosition') || renderDiffBadge('position')}
                  </div>
                  <div className="exact-inline-group" style={{ flex: 1.2 }}>
                    <span className="exact-inline-lbl">Email :</span>
                    <div id="fap-diff-cell-picEmail" className={getDiffClass('picEmail')}>
                      <span>{d.picEmail}</span>
                      {renderDiffBadge('picEmail')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl" style={{ width: '135px' }}>Current Address</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-currentAddress" className={getDiffClass('currentAddress', 'exact-fap-box multiline highlight-dynamic')}>
                  <span>{d.currentAddress}</span>
                  {renderDiffBadge('currentAddress')}
                </div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl" style={{ width: '120px' }}>City</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-picCity" className={getDiffClass('picCity')}>
                  <span>{d.picCity}</span>
                  {renderDiffBadge('picCity')}
                </div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl" style={{ width: '120px' }}>Province</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-picProvince" className={getDiffClass('picProvince')}>
                  <span>{d.picProvince}</span>
                  {renderDiffBadge('picProvince')}
                </div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl" style={{ width: '120px' }}>Postal Code</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-picPostalCode" className={getDiffClass('picPostalCode')}>
                  <span>{d.picPostalCode}</span>
                  {renderDiffBadge('picPostalCode')}
                </div>
              </div>

              {/* Shareholder Table */}
              <div className="exact-sh-section">
                <div className="exact-sh-title">Organization & Shareholder Structure</div>
                <div className="exact-sh-subtitle">
                  Based on Deed No. <span className="highlight-dynamic" style={{ fontWeight: 600 }}>{d.selectedDeedNo || d.latestDeedNo}</span>
                </div>

                <table className="exact-sh-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }}>No</th>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th style={{ width: '110px', textAlign: 'left' }}>Position</th>
                      <th style={{ width: '105px', textAlign: 'right' }}>Amount of Share</th>
                      <th style={{ width: '55px', textAlign: 'right' }}>% share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const sh = d.stakeholders?.[i];
                      return (
                        <tr key={i}>
                          <td className="center">{i + 1}</td>
                          <td className="highlight-dynamic">{sh?.name || ''}</td>
                          <td className="highlight-dynamic">{sh?.position || ''}</td>
                          <td className="right highlight-dynamic">{sh?.shareAmount ? formatNumber(sh.shareAmount) : ''}</td>
                          <td className="right highlight-dynamic">{sh?.sharePercentage ? Number(sh.sharePercentage).toFixed(2) + '%' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ==============================================================
              SECTION 3: TUJUAN PEMBIAYAAN & FIXED ASSETS (ROWS 46 - 54)
              ============================================================== */}
          <div className="exact-section-divider" id="fap-preview-sec-facility">
            <div className="exact-section-header">FINANCING PURPOSE & FIXED ASSETS SUMMARY</div>
          </div>

          <div className="exact-fap-body" style={{ marginTop: '8px' }}>
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Financing Purpose</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row" id="fap-diff-cell-facilityPurpose">
                  <div className={`exact-fap-box ${getDiff('facilityPurpose') ? 'fap-diff-cell-highlight' : ''}`} style={{ flex: 1 }}>
                    <span>Investment</span> <b style={{ color: '#002060', marginLeft: '6px' }}>{d.facilityPurpose === 'INVESTMENT' ? '(√)' : '( )'}</b>
                    {getDiff('facilityPurpose') && renderDiffBadge('facilityPurpose')}
                  </div>
                  <div className={`exact-fap-box ${getDiff('facilityPurpose') ? 'fap-diff-cell-highlight' : ''}`} style={{ flex: 1 }}>
                    <span>Working Capital</span> <b style={{ color: '#002060', marginLeft: '6px' }}>{d.facilityPurpose === 'WORKING_CAPITAL' ? '(√)' : '( )'}</b>
                  </div>
                </div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl">Investment Category</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">
                  {d.facilityPurpose === 'INVESTMENT' ? 'Business Activity & Fleet Unit Addition' : 'Operational Needs & Working Cash'}
                </div>
              </div>
            </div>

            <div className="exact-fap-col">
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                List Fixed Assets :
              </div>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Brand</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>HE</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Truck</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Unit</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>LiuGong</b></td>
                    <td className="center highlight-dynamic">{d.assetSummaryHeLiuGong !== '' && d.assetSummaryHeLiuGong !== undefined ? d.assetSummaryHeLiuGong : '—'}</td>
                    <td className="center highlight-dynamic">{d.assetSummaryTruckLiuGong !== '' && d.assetSummaryTruckLiuGong !== undefined ? d.assetSummaryTruckLiuGong : '—'}</td>
                    <td className="center highlight-dynamic">{(Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0) || '—'}</td>
                    <td className="right highlight-dynamic">
                      {((Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0) + (Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0)) > 0
                        ? (((((Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0)) / Math.max(1, ((Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0) + (Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0)))) * 100).toFixed(1) + '%')
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td>Non LiuGong</td>
                    <td className="center highlight-dynamic">{d.assetSummaryHeNonLiuGong !== '' && d.assetSummaryHeNonLiuGong !== undefined ? d.assetSummaryHeNonLiuGong : '—'}</td>
                    <td className="center highlight-dynamic">{d.assetSummaryTruckNonLiuGong !== '' && d.assetSummaryTruckNonLiuGong !== undefined ? d.assetSummaryTruckNonLiuGong : '—'}</td>
                    <td className="center highlight-dynamic">{(Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0) || '—'}</td>
                    <td className="right highlight-dynamic">
                      {((Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0) + (Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0)) > 0
                        ? (((((Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0)) / Math.max(1, ((Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0) + (Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0)))) * 100).toFixed(1) + '%')
                        : '—'}
                    </td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td>Total</td>
                    <td className="center">{(Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryHeNonLiuGong) || 0) || '—'}</td>
                    <td className="center">{(Number(d.assetSummaryTruckLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0) || '—'}</td>
                    <td className="center">{(Number(d.assetSummaryHeLiuGong) || 0) + (Number(d.assetSummaryTruckLiuGong) || 0) + (Number(d.assetSummaryHeNonLiuGong) || 0) + (Number(d.assetSummaryTruckNonLiuGong) || 0) || '—'}</td>
                    <td className="right">100.0%</td>
                  </tr>
                </tbody></table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 4: SEGMENTASI & PROYEK KONTRAK (ROWS 55 - 63)
              ============================================================== */}
          <div className="exact-section-divider" id="fap-preview-sec-projects">
            <div className="exact-section-header">INDUSTRY SEGMENTATION & ACTIVE PROJECT CONTRACTS</div>
          </div>

          <div className="exact-fap-body" style={{ marginTop: '8px' }}>
            <div className="exact-fap-col" style={{ flex: 0.9 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="exact-matrix-box">
                  <div style={{ background: '#f1f5f9', padding: '3px 6px', fontWeight: 700, fontSize: '9px', borderBottom: '1px solid #000' }}>
                    Segmentation :
                  </div>
                  {['MINING:Mining', 'AGRICULTURE:Agriculture', 'FORESTRY:Forestry', 'CONSTRUCTION:Construction', 'OIL_GAS:Oil & Gas', 'OTHER:Other'].map(item => {
                    const [key, label] = item.split(':');
                    const isSel = d.industrySegment === key;
                    return (
                      <div key={key} className="exact-matrix-row" style={{ padding: '2px 6px', fontSize: '9px' }}>
                        <span>{label}</span>
                        <b style={{ color: isSel ? '#002060' : '#94a3b8' }}>{isSel ? '☑' : '☐'}</b>
                      </div>
                    );
                  })}
                </div>

                <div className="exact-matrix-box">
                  <div style={{ background: '#f1f5f9', padding: '3px 6px', fontWeight: 700, fontSize: '9px', borderBottom: '1px solid #000' }}>
                    Main Business :
                  </div>
                  {['CONCESSION_OWNER:Cons. Owner', 'CONTRACTORS:Contractors', 'SUB_CONTRACTORS:Sub Cont', 'RENTAL:Rental', 'OTHER:Other'].map(item => {
                    const [key, label] = item.split(':');
                    const isSel = d.businessRole === key;
                    return (
                      <div key={key} className="exact-matrix-row" style={{ padding: '2px 6px', fontSize: '9px' }}>
                        <span>{label}</span>
                        <b style={{ color: isSel ? '#002060' : '#94a3b8' }}>{isSel ? '☑' : '☐'}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="exact-fap-col" style={{ flex: 1.1 }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                Project Contracts :
              </div>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Project Owner</th>
                    <th style={{ width: '120px', textAlign: 'left' }}>Location</th>
                    <th style={{ width: '95px', textAlign: 'left' }}>Role</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => {
                    const proj = d.projects?.[i];
                    return (
                      <tr key={i}>
                        <td className="highlight-dynamic">{proj?.projectOwner || ''}</td>
                        <td className="highlight-dynamic">{proj?.projectLocation || ''}</td>
                        <td className="highlight-dynamic">{proj?.projectRole || ''}</td>
                        <td className="center highlight-dynamic">{proj?.contractStatus || (proj ? 'Existing' : '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 5: REFERENSI BANK & PROPOSAL FASILITAS (ROWS 64 - 86)
              ============================================================== */}
          <div className="exact-section-divider" id="fap-preview-sec-proposal">
            <div className="exact-section-header">BANK FACILITY REFERENCES & FINANCING PROPOSAL</div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
              Active Bank & Financial Institution Credit Facilities :
            </div>
            <table className="exact-sh-table">
              <thead>
                <tr>
                  <th style={{ width: '28px' }}>No</th>
                  <th style={{ textAlign: 'left' }}>Bank/Fin</th>
                  <th style={{ width: '55px', textAlign: 'center' }}>Currency</th>
                  <th style={{ width: '115px', textAlign: 'right' }}>Credit Facility</th>
                  <th style={{ width: '105px', textAlign: 'right' }}>Monthly Installment</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Year Started</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Interest Rate</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Payment Record</th>
                  <th style={{ width: '65px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => {
                  const b = d.bankReferences?.[i];
                  return (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td className="highlight-dynamic">{b?.bankOrFinInstitution || ''}</td>
                      <td className="center highlight-dynamic">{b?.currency || (b ? 'IDR' : '')}</td>
                      <td className="right highlight-dynamic">{b?.creditFacility ? formatCurrency(b.creditFacility) : ''}</td>
                      <td className="right highlight-dynamic">{b?.monthlyInstallment ? formatCurrency(b.monthlyInstallment) : ''}</td>
                      <td className="center highlight-dynamic">{b?.yearStarted || ''}</td>
                      <td className="right highlight-dynamic">{b?.interestRate ? b.interestRate + '%' : ''}</td>
                      <td className="center highlight-dynamic">{b?.paymentRecord || ''}</td>
                      <td className="center highlight-dynamic">{b?.facilityStatus || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Proposal Facility Details */}
          <div className="exact-fap-body" style={{ marginTop: '12px' }}>
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Financing Method</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-financingMethod" className={getDiffClass('financingMethod')}>
                  <span>
                    {d.financingMethod === 'FINANCIAL_LEASE' ? 'Financial Lease (√)' : d.financingMethod === 'SALE_AND_LEASE_BACK' ? 'Sale and Lease Back (√)' : 'Installment Purchase (√)'}
                  </span>
                  {renderDiffBadge('financingMethod')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Financing Value</span>
                <span className="exact-fap-colon">:</span>
                <div id="fap-diff-cell-financingValue" className={getDiffClass('financingValue')} style={{ fontWeight: 700 }}>
                  <span>{formatCurrency(d.financingValue)}</span>
                  {renderDiffBadge('financingValue')}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Down Payment</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-downPaymentValue" className={getDiffClass('downPaymentValue')}>
                    <span>{formatCurrency(d.downPaymentValue)}</span>
                    {renderDiffBadge('downPaymentValue')}
                  </div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Rate :</span>
                    <div id="fap-diff-cell-interestRate" className={getDiffClass('interestRate')}>
                      <span>{d.interestRate ? `${d.interestRate}% p.a.` : '—'}</span>
                      {renderDiffBadge('interestRate')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Tenor / Duration</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div id="fap-diff-cell-tenorMonths" className={getDiffClass('tenorMonths')}>
                    <span>{d.tenorMonths ? `${d.tenorMonths} Months` : '—'}</span>
                    {renderDiffBadge('tenorMonths')}
                  </div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Payment Method :</span>
                    <div className="exact-fap-box highlight-dynamic">{d.paymentMethod || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="exact-fap-col">
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                Unit Realization Plan :
              </div>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Brand</th>
                    <th style={{ width: '90px', textAlign: 'left' }}>Category</th>
                    <th style={{ textAlign: 'left' }}>Model / Asset</th>
                    <th style={{ width: '55px', textAlign: 'center' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.units || []).map((u: any, i: number) => (
                    <tr key={i}>
                      <td className="highlight-dynamic">{u.brand || 'LiuGong'}</td>
                      <td className="highlight-dynamic">{u.unitCategory || 'HE'}</td>
                      <td className="highlight-dynamic">{u.modelName || u.assetName || 'Excavator'}</td>
                      <td className="center highlight-dynamic">{u.quantity || 1}</td>
                    </tr>
                  ))}
                  {(!d.units || d.units.length === 0) && (
                    <>
                      <tr>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                      </tr>
                      <tr>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                        <td className="center" style={{ color: '#94a3b8' }}>—</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 6: RINGKASAN LAPORAN KEUANGAN (ROWS 89 - 100)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">FINANCIAL STATEMENTS — LAST 3 YEARS</div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <table className="exact-sh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '220px' }}>Balance Sheet (IDR)</th>
                  {fsList.map((fs: any, i: number) => (
                    <th key={i} style={{ width: '110px', textAlign: 'right' }}>{fs.fiscalYear} {fs.isAudited ? '(Audited)' : '(In-house)'}</th>
                  ))}
                  <th style={{ textAlign: 'left', width: '200px' }}>Income Statement</th>
                  {fsList.map((fs: any, i: number) => (
                    <th key={i} style={{ width: '110px', textAlign: 'right' }}>{fs.fiscalYear}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Current Assets</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.currentAssets)}</td>
                  ))}
                  <td>Revenue</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.revenue)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Non-Current Assets</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.nonCurrentAssets)}</td>
                  ))}
                  <td>Gross Profit</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.grossMargin)}</td>
                  ))}
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                  <td><b>Total Assets</b></td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.totalAssets)}</b></td>
                  ))}
                  <td>Operating Profit (EBIT)</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.operatingMargin)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Current Liabilities</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.currentLiabilities)}</td>
                  ))}
                  <td>Tax</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.tax)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Long-Term Liabilities</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.longTermLiabilities)}</td>
                  ))}
                  <td style={{ background: '#f8fafc', fontWeight: 600 }}><b>Net Income</b></td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.netIncome)}</b></td>
                  ))}
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                  <td><b>Total Liabilities</b></td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.totalLiabilities)}</b></td>
                  ))}
                  <td colSpan={1 + fsList.length} style={{ background: '#f1f5f9' }}></td>
                </tr>
                <tr>
                  <td>Equity</td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.equity)}</td>
                  ))}
                  <td colSpan={1 + fsList.length} style={{ background: '#f1f5f9' }}></td>
                </tr>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <td><b>Total Liabilities & Equity</b></td>
                  {fsList.map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber((fs.totalLiabilities || 0) + (fs.equity || 0))}</b></td>
                  ))}
                  <td colSpan={1 + fsList.length} style={{ background: '#f1f5f9' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==============================================================
              SECTION 7: PERNYATAAN & TANDA TANGAN (ROWS 102 - 118)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">DEBTOR DECLARATION & OFFICIAL SIGNATURES</div>
          </div>

          <div style={{ fontSize: '8.5px', color: '#1e293b', lineHeight: 1.35, margin: '8px 0 12px 0' }}>
            <div style={{ fontWeight: 700, marginBottom: '3px' }}>We hereby declare and agree that:</div>
            <div>1. PT LiuGong Finance Indonesia has provided an explanation of the financing product characteristics, debtor rights and obligations, and financing risks.</div>
            <div>2. We declare that all information and/or documents submitted are true, complete and valid in accordance with the actual conditions.</div>
            <div>3. During the financing approval process, PT LiuGong Finance Indonesia reserves the right to conduct data checks with third parties (SLIK OJK / Credit Bureau).</div>
            <div>4. PT LiuGong Finance Indonesia reserves the right to reject this financing application without obligation to provide a reason for rejection.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>Signed by debtor</div>
              <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                [ Revenue Stamp Rp 10,000 & Company Seal ]
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                {d.picName}
              </div>
              <div style={{ fontSize: '8.5px', color: '#475569' }}>
                {d.companyName}
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>Verified by LFI</div>
              <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                [ Relationship Manager Signature ]
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                Marketing Representative
              </div>
              <div style={{ fontSize: '8.5px', color: '#475569' }}>
                PT. LIUGONG FINANCE INDONESIA
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export function printFapDocument(fapNumber?: string) {
  const el = document.getElementById('fap-excel-printable-doc');
  if (!el) {
    window.print();
    return;
  }

  // Remove existing print iframe if any
  const existingIframe = document.getElementById('fap-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create an invisible iframe for isolated printing
  const iframe = document.createElement('iframe');
  iframe.id = 'fap-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Deep clone the printable sheet and strip screen zoom/transforms
  const clone = el.cloneNode(true) as HTMLElement;
  clone.id = 'fap-excel-printable-doc-cloned';
  clone.removeAttribute('style');
  clone.className = 'excel-fap-paper fap-print-sheet';

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Application Form - ${fapNumber || 'Print'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 6mm 6mm 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      visibility: visible !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      font-size: 8.5pt !important;
      line-height: 1.25 !important;
    }
    .fap-print-sheet {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      transform: none !important;
      position: static !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .exact-header-top {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 5px !important;
    }
    .exact-header-logo img {
      height: 38px !important;
      width: auto !important;
      display: block !important;
    }
    .exact-header-title {
      font-size: 19px !important;
      font-weight: 900 !important;
      color: #002060 !important;
      letter-spacing: 0.8px !important;
      text-align: center !important;
    }
    .exact-header-reg {
      border: 1px solid #000000 !important;
      padding: 3px 8px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: #ffffff !important;
    }
    .exact-header-reg .reg-val {
      color: #002060 !important;
      font-family: monospace !important;
    }
    .exact-navy-bar {
      background: #002060 !important;
      height: 5px !important;
      width: 100% !important;
      margin: 4px 0 8px 0 !important;
    }
    .exact-matrix-grid {
      display: grid !important;
      grid-template-columns: 1.15fr 1.35fr 1.05fr 1fr !important;
      gap: 8px !important;
      margin-bottom: 8px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .exact-matrix-box {
      border: 1px solid #000000 !important;
      background: #ffffff !important;
    }
    .exact-matrix-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 2.5px 6px !important;
      border-bottom: 1px solid #000000 !important;
      font-size: 10px !important;
      min-height: 22px !important;
    }
    .exact-matrix-row:last-child {
      border-bottom: none !important;
    }
    .exact-matrix-lbl {
      font-weight: 600 !important;
      color: #000000 !important;
    }
    .exact-matrix-val {
      font-weight: 700 !important;
      color: #002060 !important;
    }
    .exact-matrix-chk {
      font-size: 13px !important;
      font-weight: bold !important;
      color: #002060 !important;
    }
    .exact-orange-bar {
      background: #eaa358 !important;
      height: 2.5px !important;
      width: 100% !important;
      margin: 4px 0 12px 0 !important;
    }
    .exact-fap-body {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 16px !important;
    }
    .exact-fap-col {
      display: flex !important;
      flex-direction: column !important;
      gap: 7px !important;
    }
    .exact-fap-row {
      display: flex !important;
      align-items: flex-start !important;
      font-size: 9.5px !important;
      gap: 4px !important;
    }
    .exact-fap-lbl {
      width: 155px !important;
      flex-shrink: 0 !important;
      font-weight: 500 !important;
      line-height: 1.25 !important;
      color: #000000 !important;
    }
    .exact-fap-colon {
      width: 8px !important;
      flex-shrink: 0 !important;
      font-weight: 600 !important;
      text-align: center !important;
    }
    .exact-fap-box {
      flex: 1 !important;
      border: 1px solid #000000 !important;
      background: #ffffff !important;
      min-height: 21px !important;
      padding: 2px 6px !important;
      display: flex !important;
      align-items: center !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      color: #002060 !important;
    }
    .exact-fap-box.multiline {
      min-height: 48px !important;
      align-items: flex-start !important;
      line-height: 1.3 !important;
    }
    .exact-sub-row {
      display: flex !important;
      align-items: center !important;
      font-size: 9.5px !important;
      margin-left: 24px !important;
      gap: 4px !important;
    }
    .exact-sub-lbl {
      width: 131px !important;
      flex-shrink: 0 !important;
      font-weight: 500 !important;
    }
    .exact-dual-row {
      display: flex !important;
      gap: 6px !important;
      flex: 1 !important;
    }
    .exact-inline-group {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      flex: 1 !important;
    }
    .exact-inline-lbl {
      font-size: 9px !important;
      font-weight: 500 !important;
      white-space: nowrap !important;
    }
    .exact-sh-section {
      margin-top: 4px !important;
      border-top: 1px solid #cbd5e1 !important;
      padding-top: 6px !important;
    }
    .exact-sh-title {
      font-size: 10.5px !important;
      font-weight: 700 !important;
      color: #002060 !important;
      line-height: 1.2 !important;
    }
    .exact-sh-subtitle {
      font-size: 9px !important;
      font-style: italic !important;
      color: #475569 !important;
      margin: 2px 0 5px 0 !important;
    }
    .exact-sh-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 9px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .exact-sh-table th, .exact-sh-table td {
      border: 1px solid #000000 !important;
      padding: 2px 4px !important;
    }
    .exact-sh-table th {
      background: #f1f5f9 !important;
      font-weight: 700 !important;
      text-align: center !important;
      color: #000000 !important;
    }
    .exact-sh-table td {
      background: #ffffff !important;
    }
    .exact-sh-table td.center {
      text-align: center !important;
    }
    .exact-sh-table td.right {
      text-align: right !important;
      font-family: monospace !important;
    }
    .exact-section-divider {
      margin-top: 14px !important;
      margin-bottom: 6px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .exact-section-header {
      background: #002060 !important;
      color: #ffffff !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      padding: 3.5px 8px !important;
      letter-spacing: 0.5px !important;
    }
    .highlight-dynamic {
      color: #002060 !important;
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('iframe print failed, using window.print()', e);
      window.print();
    }
    setTimeout(() => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {}
    }, 4000);
  }, 250);
}

