import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Printer,
  Eye,
  History,
  CheckCircle2,
} from 'lucide-react';
import { LIUGONG_LOGO_B64 } from './liugong-logo-b64';
import { useMasterData } from './master-data';
import type { FapSheetData, FapSheetPreviewProps } from './FapSheetPreview';
import { printFapDocument } from './FapSheetPreview';

export function FapSheetPreviewApproved2025(props: FapSheetPreviewProps & { onSwitchToClassic?: () => void }) {
  const master = useMasterData();
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(props.compact ? 0.85 : 1.0);
  const [paperHeight, setPaperHeight] = useState<number>(2550);
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
      const padding = 32;
      const available = Math.max(260, cWidth - padding);
      const scale = Math.min(1.15, Math.max(0.35, available / targetWidth));
      setZoomLevel(Number(scale.toFixed(3)));
    };

    updateFit();
    const ro = new ResizeObserver(() => updateFit());
    if (containerRef.current) ro.observe(containerRef.current);
    if (paperRef.current) ro.observe(paperRef.current);

    window.addEventListener('resize', updateFit);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateFit);
    }

    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handleDpiChange = () => updateFit();
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
      if (/^[0-9a-f-]{32,36}$/i.test(str)) return '';
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
      nibDate: pick(raw.nibDate, cust.nibDate, ''),
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
      documentChecks: raw.documentChecks || app.documentChecks || [],
      applicationSource: pick(raw.applicationSource, app.applicationSource, 'Direct'),
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
  const isMicro = d.companyType === 'MICRO';
  const isLiugongUser = d.companyType === 'LIUGONG_USER';

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

  // Check which mandatory / checklist documents are submitted
  const docCheckedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    const checks = d.documentChecks || [];
    for (const c of checks) {
      const code = String(c.documentCode || '').toUpperCase();
      const hasFiles = Boolean(c.files && c.files.length > 0) || c.status === 'VERIFIED' || c.status === 'COMPLETED';
      map[code] = hasFiles;
    }
    return map;
  }, [d.documentChecks]);

  // Total bank facilities
  const totalCreditFacility = useMemo(() => {
    return (d.bankReferences || []).reduce((acc: number, b: any) => acc + (Number(b.creditFacility) || 0), 0);
  }, [d.bankReferences]);

  const totalMonthlyInstallment = useMemo(() => {
    return (d.bankReferences || []).reduce((acc: number, b: any) => acc + (Number(b.monthlyInstallment) || 0), 0);
  }, [d.bankReferences]);

  // Method check
  const method = String(d.financingMethod || '').toUpperCase();
  const isLease = method === 'FINANCIAL_LEASE' || method === 'SEWA_PEMBIAYAAN' || method.includes('LEASE') && !method.includes('SALE');
  const isSaleAndLease = method === 'SALE_AND_LEASE_BACK' || method.includes('SALE');
  const isInstallment = method === 'INSTALLMENT_FINANCING' || method === 'INSTALLMENT' || method.includes('ANGSURAN') || method.includes('PEMBELIAN');

  // Fixed assets totals
  const heLg = Number(d.assetSummaryHeLiuGong) || 0;
  const truckLg = Number(d.assetSummaryTruckLiuGong) || 0;
  const unitLg = heLg + truckLg;

  const heNonLg = Number(d.assetSummaryHeNonLiuGong) || 0;
  const truckNonLg = Number(d.assetSummaryTruckNonLiuGong) || 0;
  const unitNonLg = heNonLg + truckNonLg;

  const totalHe = heLg + heNonLg;
  const totalTruck = truckLg + truckNonLg;
  const grandTotalUnits = unitLg + unitNonLg;

  const pctLg = grandTotalUnits > 0 ? ((unitLg / grandTotalUnits) * 100).toFixed(1) + '%' : '0.0%';
  const pctNonLg = grandTotalUnits > 0 ? ((unitNonLg / grandTotalUnits) * 100).toFixed(1) + '%' : '0.0%';

  return (
    <div className={`excel-fap-viewer approved-2025-template ${props.isComparison ? 'in-comparison-mode' : ''}`}>
      {/* Excel Green Ribbon Header */}
      {showRibbon && (
        <div className="excel-fap-ribbon">
          <div className="excel-ribbon-left">
            <FileSpreadsheet size={16} className="excel-brand-icon" />
            <div className="excel-file-badge">
              <span className="excel-file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                APPLICATION FORM · APPROVED v01/2025
                <span style={{ fontSize: '9.5px', background: '#10b981', color: '#ffffff', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                  ACTIVE (NEW)
                </span>
              </span>
              <span className="excel-tab-badge">Official Bilingual Format (Tanpa Watermark) · Ready for A4 PDF</span>
            </div>
          </div>
          <div className="excel-ribbon-right">
            {/* Rollback to classic toggle button */}
            {props.onSwitchToClassic && (
              <button
                type="button"
                className="excel-rollback-btn"
                onClick={props.onSwitchToClassic}
                title="Rollback / Beralih ke template FAP sebelumnya"
                style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginRight: '6px'
                }}
              >
                <History size={12} /> Rollback Template
              </button>
            )}

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
              title="Print / Download Official A4 PDF Sheet (PDF View)"
            >
              <Printer size={13} /> Print Form (PDF)
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
              { id: 'fap-preview-sec-business', label: '3. Profile' },
              { id: 'fap-preview-sec-pic', label: '4. PIC & Shareholders' },
              { id: 'fap-preview-sec-facility', label: '5. Purpose & Assets' },
              { id: 'fap-preview-sec-projects', label: '6. Projects' },
              { id: 'fap-preview-sec-bank', label: '7. Bank Reference' },
              { id: 'fap-preview-sec-proposal', label: '8. Facility Proposed' },
              { id: 'fap-preview-sec-finance', label: '9. Financials' },
              { id: 'fap-preview-sec-decl', label: '10. Signatures' },
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
            className="excel-fap-paper approved-fap-sheet"
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <div className="exact-header-reg">
                    <span className="reg-lbl">No. Register :</span>
                    <span className="reg-val highlight-dynamic">{d.fapNumber || 'AUTO GENERATE'}</span>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>1 : 1</span>
                </div>
              </div>

              <div className="exact-navy-bar" />

              {/* 4-Box Classification Grid */}
              <div className="exact-matrix-grid">
                <div className="exact-matrix-box">
                  <div className="exact-matrix-row">
                    <span className="exact-matrix-lbl">Tanggal/Date</span>
                    <span className="exact-matrix-val highlight-dynamic">{formatDate(d.applicationDate)}</span>
                  </div>
                  <div className="exact-matrix-row">
                    <span className="exact-matrix-lbl">Cabang/Branch</span>
                    <span className="exact-matrix-val highlight-dynamic">{d.branchCode}</span>
                  </div>
                </div>

                <div className="exact-matrix-box">
                  <div className="exact-matrix-row">
                    <span className="exact-matrix-lbl">Customer Baru/New Customer</span>
                    <span className="exact-matrix-chk">{isCustNew ? '☑' : '☐'}</span>
                  </div>
                  <div className="exact-matrix-row">
                    <span className="exact-matrix-lbl">Customer Lama /Existing Customer</span>
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
                    <span className="exact-matrix-chk">{isMicro ? '☑' : '☐'}</span>
                  </div>
                  <div className="exact-matrix-row">
                    <span className="exact-matrix-lbl">LiuGong User</span>
                    <span className="exact-matrix-chk">{isLiugongUser ? '☑' : '☐'}</span>
                  </div>
                </div>
              </div>

              <div className="exact-orange-bar" />
            </div>

            {/* ==============================================================
                SECTION 2: PROFIL PERUSAHAAN & PIC / SHAREHOLDERS (ROWS 11 - 45)
                ============================================================== */}
            <div className="exact-fap-body">
              {/* Left Column: Company Details */}
              <div className="exact-fap-col" id="fap-preview-sec-company">
                <div className="exact-fap-row">
                  <span className="exact-fap-lbl">Nama Perusahaan/ Company's Name</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-companyName" className={getDiffClass('companyName')}>
                    <span>{d.companyName}</span>
                    {renderDiffBadge('companyName')}
                  </div>
                </div>

                <div className="exact-fap-row">
                  <span className="exact-fap-lbl">Alamat Perusahaan/ Company Address</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-companyAddress" className={getDiffClass('companyAddress', 'exact-fap-box multiline highlight-dynamic')}>
                    <span>{d.companyAddress}</span>
                    {renderDiffBadge('companyAddress')}
                  </div>
                </div>

                <div className="exact-sub-row">
                  <span className="exact-sub-lbl">Kota/City</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-city" className={getDiffClass('city')}>
                    <span>{d.city}</span>
                    {renderDiffBadge('city')}
                  </div>
                </div>

                <div className="exact-sub-row">
                  <span className="exact-sub-lbl">Provinsi/Province</span>
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
                  <span className="exact-fap-lbl">Bisnis Utama/ Main Business</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-mainBusiness" className={getDiffClass('mainBusiness')}>
                    <span>{d.mainBusiness}</span>
                    {renderDiffBadge('mainBusiness')}
                  </div>
                </div>

                <div className="exact-fap-row">
                  <span className="exact-fap-lbl">No. Akta Pendirian/ Deed Establishment number</span>
                  <span className="exact-fap-colon">:</span>
                  <div className="exact-dual-row">
                    <div id="fap-diff-cell-establishmentActNo" className={getDiffClass('establishmentActNo')} style={{ flex: 1.2 }}>
                      <span>{d.establishmentActNo}</span>
                      {renderDiffBadge('establishmentActNo')}
                    </div>
                    <div className="exact-inline-group" style={{ flex: 1.2 }}>
                      <span className="exact-inline-lbl" style={{ fontSize: '8.5px', lineHeight: '1.1' }}>
                        Tanggal Pendirian/<br />Est Date :
                      </span>
                      <div id="fap-diff-cell-establishmentDate" className={getDiffClass('establishmentDate')}>
                        <span>{formatDate(d.establishmentDate)}</span>
                        {renderDiffBadge('establishmentDate')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="exact-fap-row">
                  <span className="exact-fap-lbl">Pengalaman/Experience</span>
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
                  <span className="exact-fap-lbl" style={{ fontSize: '9px' }}>
                    No. Akta Perubahan Terakhir / Latest Deed of Amendment number
                  </span>
                  <span className="exact-fap-colon">:</span>
                  <div className="exact-dual-row">
                    <div id="fap-diff-cell-latestDeedNo" className={getDiffClass('latestDeedNo')} style={{ flex: 1.1 }}>
                      <span>{d.latestDeedNo}</span>
                      {renderDiffBadge('latestDeedNo')}
                    </div>
                    <div className="exact-inline-group" style={{ flex: 1.3 }}>
                      <span className="exact-inline-lbl" style={{ fontSize: '8px', lineHeight: '1.1' }}>
                        Tanggal Perubahan Terakhir/<br />Date of The Latest Amendment :
                      </span>
                      <div id="fap-diff-cell-latestDeedDate" className={getDiffClass('latestDeedDate')}>
                        <span>{formatDate(d.latestDeedDate)}</span>
                        {renderDiffBadge('latestDeedDate')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="exact-fap-row">
                  <span className="exact-fap-lbl">NIB (No Induk Berusaha)</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-nib" className={getDiffClass('nib')}>
                    <span>{d.nib}</span>
                    {renderDiffBadge('nib')}
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
                  <div className="exact-fap-box highlight-dynamic">{d.website || '—'}</div>
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
                  <span className="exact-fap-lbl">Sumber Pembayaran/ Repayment source</span>
                  <span className="exact-fap-colon">:</span>
                  <div className="exact-fap-box highlight-dynamic">{d.repaymentSource}</div>
                </div>

                <div className="exact-fap-row">
                  <span className="exact-fap-lbl">Status tempat usaha/Business Location Status</span>
                  <span className="exact-fap-colon">:</span>
                  <div className="exact-fap-box highlight-dynamic" style={{ display: 'flex', gap: '12px' }}>
                    <span>{d.locationStatus === 'OWNED' ? '☑' : '☐'} Milik Sendiri</span>
                    <span>/</span>
                    <span>{d.locationStatus === 'RENTED' ? '☑' : '☐'} Sewa</span>
                  </div>
                </div>
              </div>

              {/* Right Column: PIC & Shareholders */}
              <div className="exact-fap-col" id="fap-preview-sec-pic">
                <div className="exact-fap-row">
                  <span className="exact-fap-lbl" style={{ width: '135px' }}>Penanggung Jawab/PIC</span>
                  <span className="exact-fap-colon">:</span>
                  <div className="exact-dual-row">
                    <div id="fap-diff-cell-picName" className={getDiffClass('picName')} style={{ flex: 1.2 }}>
                      <span>{d.picName}</span>
                      {renderDiffBadge('picName')}
                    </div>
                    <div className="exact-inline-group" style={{ flex: 1.2 }}>
                      <span className="exact-inline-lbl">Telepon/Phone :</span>
                      <div id="fap-diff-cell-picPhone" className={getDiff('picPhone') || getDiff('phone') ? getDiffClass('picPhone') : 'exact-fap-box highlight-dynamic'}>
                        <span>{d.phone}</span>
                        {renderDiffBadge('picPhone') || renderDiffBadge('phone')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="exact-fap-row">
                  <span className="exact-fap-lbl" style={{ width: '135px', lineHeight: '1.15' }}>
                    Jabatan/<br />Position
                  </span>
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
                  <span className="exact-fap-lbl" style={{ width: '135px' }}>Alamat Tempat Tinggal/ Current Address</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-currentAddress" className={getDiffClass('currentAddress', 'exact-fap-box multiline highlight-dynamic')}>
                    <span>{d.currentAddress}</span>
                    {renderDiffBadge('currentAddress')}
                  </div>
                </div>

                <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                  <span className="exact-sub-lbl" style={{ width: '120px' }}>Kota/City</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-picCity" className={getDiffClass('picCity')}>
                    <span>{d.picCity}</span>
                    {renderDiffBadge('picCity')}
                  </div>
                </div>

                <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                  <span className="exact-sub-lbl" style={{ width: '120px' }}>Provinsi/Province</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-picProvince" className={getDiffClass('picProvince')}>
                    <span>{d.picProvince}</span>
                    {renderDiffBadge('picProvince')}
                  </div>
                </div>

                <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                  <span className="exact-sub-lbl" style={{ width: '120px' }}>Kode Post/Postal code</span>
                  <span className="exact-fap-colon">:</span>
                  <div id="fap-diff-cell-picPostalCode" className={getDiffClass('picPostalCode')}>
                    <span>{d.picPostalCode}</span>
                    {renderDiffBadge('picPostalCode')}
                  </div>
                </div>

                {/* Shareholder Table */}
                <div className="exact-sh-section">
                  <div className="exact-sh-title">
                    Struktur Organisasi & Pemegang Saham/Organization & Shareholder Structure
                  </div>
                  <div className="exact-sh-subtitle">
                    Berdasarkan Akta/ Based on Act No: <span className="highlight-dynamic" style={{ fontWeight: 600 }}>{d.selectedDeedNo || d.latestDeedNo || '.....................'}</span> Tanggal/Date: <span className="highlight-dynamic" style={{ fontWeight: 600 }}>{formatDate(d.latestDeedDate) || '.....................'}</span>
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
                SECTION 3: TUJUAN PEMBIAYAAN & LIST FIXED ASSETS (ROWS 46 - 54)
                ============================================================== */}
            <div className="exact-section-divider" id="fap-preview-sec-facility">
              <div className="exact-section-header">TUJUAN PEMBIAYAAN & DAFTAR ASET TETAP / FINANCING PURPOSE & FIXED ASSETS</div>
            </div>

            <div className="exact-fap-body" style={{ marginTop: '8px' }}>
              <div className="exact-fap-col">
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                  Tujuan Pembiayaan/ financing purpose :
                </div>
                <div style={{ border: '1px solid #000', padding: '6px', background: '#ffffff', fontSize: '9px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <b style={{ color: '#002060' }}>{d.facilityPurpose === 'INVESTMENT' ? '☑' : '☐'} Investasi / Investment (√)</b>
                    <div style={{ marginLeft: '14px', color: '#334155', marginTop: '2px', lineHeight: 1.3 }}>
                      <div>• Aktivitas Usaha / Investasi (Business Activity/Investment)</div>
                      <div>• Rehabilitasi (rehabilitation)</div>
                      <div>• Modernisasi/Ekspansi (modernization/expansion)</div>
                      <div>• Relokasi tempat usaha(relocation of business premises)</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <b style={{ color: '#002060' }}>{d.facilityPurpose === 'WORKING_CAPITAL' ? '☑' : '☐'} Modal Kerja/working capital (√)</b>
                    <div style={{ marginLeft: '14px', color: '#334155', marginTop: '2px', lineHeight: 1.3 }}>
                      • Memenuhi kebutuhan pengeluaran yang habis dalam 1 (satu) siklus usaha / fulfilling the expenditure needs that are used up in 1 (one) business cycle
                    </div>
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
                      <th style={{ width: '70px', textAlign: 'right' }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><b>Liugong</b></td>
                      <td className="center highlight-dynamic">{heLg || '—'}</td>
                      <td className="center highlight-dynamic">{truckLg || '—'}</td>
                      <td className="center highlight-dynamic">{unitLg || '—'}</td>
                      <td className="right highlight-dynamic">{pctLg}</td>
                    </tr>
                    <tr>
                      <td>Non Liugong</td>
                      <td className="center highlight-dynamic">{heNonLg || '—'}</td>
                      <td className="center highlight-dynamic">{truckNonLg || '—'}</td>
                      <td className="center highlight-dynamic">{unitNonLg || '—'}</td>
                      <td className="right highlight-dynamic">{pctNonLg}</td>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td>Total</td>
                      <td className="center">{totalHe || '—'}</td>
                      <td className="center">{totalTruck || '—'}</td>
                      <td className="center">{grandTotalUnits || '—'}</td>
                      <td className="right">100.0%</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontSize: '8.5px', fontStyle: 'italic', color: '#64748b', marginTop: '3px' }}>
                  *daftar unit terlampir/list equipment attached
                </div>
              </div>
            </div>

            {/* ==============================================================
                SECTION 4: SEGMENTASI, BISNIS UTAMA & PROYEK (ROWS 55 - 63)
                ============================================================== */}
            <div className="exact-section-divider" id="fap-preview-sec-projects">
              <div className="exact-section-header">SEGMENTASI, BISNIS UTAMA & PROYEK / SEGMENTATION, MAIN BUSINESS & PROJECTS</div>
            </div>

            <div className="exact-fap-body" style={{ marginTop: '8px' }}>
              <div className="exact-fap-col" style={{ flex: 0.9 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '8px' }}>
                  <div className="exact-matrix-box">
                    <div style={{ background: '#f1f5f9', padding: '3px 6px', fontWeight: 700, fontSize: '9px', borderBottom: '1px solid #000' }}>
                      Segmentasi/Segmentation :
                    </div>
                    {[
                      { key: 'MINING', label: 'Pertambangan/Mining' },
                      { key: 'AGRICULTURE', label: 'Pertanian/Agriculture' },
                      { key: 'FORESTRY', label: 'Kehutanan/Forestry' },
                      { key: 'CONSTRUCTION', label: 'Konstruksi/Construction' },
                      { key: 'OIL_AND_GAS', label: 'Oil & Gas' },
                      { key: 'OTHER', label: 'Lainnya/Other' },
                    ].map(item => {
                      const isSel = d.industrySegment === item.key || (item.key === 'OIL_AND_GAS' && d.industrySegment === 'OIL_GAS');
                      return (
                        <div key={item.key} className="exact-matrix-row" style={{ padding: '2px 6px', fontSize: '8.5px' }}>
                          <span>{item.label}</span>
                          <b style={{ color: isSel ? '#002060' : '#94a3b8' }}>{isSel ? '☑' : '☐'}</b>
                        </div>
                      );
                    })}
                  </div>

                  <div className="exact-matrix-box">
                    <div style={{ background: '#f1f5f9', padding: '3px 6px', fontWeight: 700, fontSize: '9px', borderBottom: '1px solid #000' }}>
                      Bisnis Utama/Main Business :
                    </div>
                    {[
                      { key: 'CONS_OWNER', alt: 'CONCESSION_OWNER', label: 'Cons. Owner' },
                      { key: 'CONTRACTORS', alt: 'CONTRACTORS', label: 'Contractors' },
                      { key: 'SUB_CONT', alt: 'SUB_CONTRACTORS', label: 'Sub Cont' },
                      { key: 'RENTAL', alt: 'RENTAL', label: 'Rental' },
                      { key: 'OTHER', alt: 'OTHER', label: 'Other' },
                    ].map(item => {
                      const isSel = d.businessRole === item.key || d.businessRole === item.alt;
                      return (
                        <div key={item.key} className="exact-matrix-row" style={{ padding: '2px 6px', fontSize: '8.5px' }}>
                          <span>{item.label}</span>
                          <b style={{ color: isSel ? '#002060' : '#94a3b8' }}>{isSel ? '☑' : '☐'}</b>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="exact-fap-col" style={{ flex: 1.1 }}>
                <table className="exact-sh-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Pemilik Proyek/Project Owner</th>
                      <th style={{ width: '120px', textAlign: 'left' }}>Lokasi Proyek/Project Location</th>
                      <th style={{ width: '95px', textAlign: 'left' }}>Project Role</th>
                      <th style={{ width: '75px', textAlign: 'center' }}>Existing/New</th>
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
                SECTION 5: REFERENSI BANK (ROWS 64 - 72)
                ============================================================== */}
            <div className="exact-section-divider" id="fap-preview-sec-bank">
              <div className="exact-section-header">REFERENSI FASILITAS BANK / ACTIVE BANK & FINANCING FACILITIES</div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}>No</th>
                    <th style={{ textAlign: 'left' }}>Bank/Fin</th>
                    <th style={{ width: '55px', textAlign: 'center' }}>Currency</th>
                    <th style={{ width: '115px', textAlign: 'right' }}>Credit Facility</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Monthly Installment</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Year Started</th>
                    <th style={{ width: '70px', textAlign: 'right' }}>Interest Rate</th>
                    <th style={{ width: '95px', textAlign: 'center' }}>Payment Record</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => {
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
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={3} className="center">TOTAL</td>
                    <td className="right">{totalCreditFacility > 0 ? formatCurrency(totalCreditFacility) : '—'}</td>
                    <td className="right">{totalMonthlyInstallment > 0 ? formatCurrency(totalMonthlyInstallment) : '—'}</td>
                    <td colSpan={4} style={{ textAlign: 'left', fontStyle: 'italic', color: '#475569', paddingLeft: '8px' }}>
                      Comments : Facility repayment records are generally well-conducted (Kol 1 / Lancar).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ==============================================================
                SECTION 6: USULAN FASILITAS & DOKUMEN CHECKLIST (ROWS 73 - 92)
                ============================================================== */}
            <div className="exact-section-divider" id="fap-preview-sec-proposal">
              <div className="exact-section-header">USULAN FASILITAS & PERSYARATAN DOKUMEN / FACILITY PROPOSED & REQUIRED DOCUMENTS</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: '12px', marginTop: '8px' }}>
              {/* Left / Center 3-Column Product Matrix */}
              <div style={{ border: '1px solid #000000', background: '#ffffff' }}>
                <table className="exact-sh-table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '135px', textAlign: 'left' }}>Facility Proposed :</th>
                      <th style={{ textAlign: 'center', width: '31%', background: isLease ? '#dbeafe' : '#f1f5f9' }}>
                        Sewa Pembiayaan/<br />Financial Lease {isLease ? '☑' : '☐'}
                      </th>
                      <th style={{ textAlign: 'center', width: '31%', background: isSaleAndLease ? '#dbeafe' : '#f1f5f9' }}>
                        Jual dan Sewa kembali/<br />Sale and Lease Back {isSaleAndLease ? '☑' : '☐'}
                      </th>
                      <th style={{ textAlign: 'center', width: '31%', background: isInstallment ? '#dbeafe' : '#f1f5f9' }}>
                        Pembelian dgn angsuran/<br />Installment Financing {isInstallment ? '☑' : '☐'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Tipe Fasilitas / Purpose</td>
                      <td className="center" style={{ fontSize: '8.5px' }}>Investment</td>
                      <td className="center" style={{ fontSize: '8.5px' }}>working capital / Investment</td>
                      <td className="center" style={{ fontSize: '8.5px' }}>working capital / Investment</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Cara Pembiayaan / Method</td>
                      <td className="center highlight-dynamic">{isLease ? 'Financial Lease' : '—'}</td>
                      <td className="center highlight-dynamic">{isSaleAndLease ? 'Sale & Lease Back' : '—'}</td>
                      <td className="center highlight-dynamic">{isInstallment ? 'Installment' : '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Nilai Pembiayaan / Value</td>
                      <td colSpan={3} className="center highlight-dynamic" style={{ fontWeight: 700, fontSize: '10.5px' }}>
                        {formatCurrency(d.financingValue)} (IDR)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Mata Uang / Currency</td>
                      <td className="center">IDR</td>
                      <td className="center">IDR</td>
                      <td className="center">IDR</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>
                        {isInstallment ? 'Uang Muka / Down Payment' : 'Simpanan Jaminan / Security Deposit'}
                      </td>
                      <td className="center highlight-dynamic">{isLease ? formatCurrency(d.downPaymentValue) : '—'}</td>
                      <td className="center highlight-dynamic">{isSaleAndLease ? formatCurrency(d.downPaymentValue) : '—'}</td>
                      <td className="center highlight-dynamic">{isInstallment ? formatCurrency(d.downPaymentValue) : '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Bunga/Interest Rate</td>
                      <td colSpan={3} className="center highlight-dynamic">
                        {d.interestRate ? `${d.interestRate}% p.a.` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Jk. Waktu/Tenor</td>
                      <td colSpan={3} className="center highlight-dynamic">
                        {d.tenorMonths ? `${d.tenorMonths} Bulan / Months` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Cara Pembayaran / Method</td>
                      <td colSpan={3} className="center highlight-dynamic">
                        {d.paymentMethod || 'In Arrear'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Application Source</td>
                      <td colSpan={3} className="center highlight-dynamic">
                        {d.applicationSource || 'Direct / Dealer'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Notes :</td>
                      <td colSpan={3} style={{ fontSize: '8.5px', color: '#475569', padding: '4px' }}>
                        Heavy equipment unit delivery scheduled upon approval sign-off.
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Mini Unit Realization Plan */}
                <div style={{ padding: '6px', borderTop: '1px solid #000' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#002060', marginBottom: '3px' }}>
                    Rencana Realisasi Unit/Unit Realization Plan :
                  </div>
                  <table className="exact-sh-table" style={{ fontSize: '8.5px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Brand</th>
                        <th style={{ width: '45px', textAlign: 'center' }}>HE</th>
                        <th style={{ width: '45px', textAlign: 'center' }}>Truck</th>
                        <th style={{ width: '45px', textAlign: 'center' }}>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Liugong</td>
                        <td className="center highlight-dynamic">{heLg || '—'}</td>
                        <td className="center highlight-dynamic">{truckLg || '—'}</td>
                        <td className="center highlight-dynamic">{unitLg || '—'}</td>
                      </tr>
                      <tr>
                        <td>Non Liugong</td>
                        <td className="center highlight-dynamic">{heNonLg || '—'}</td>
                        <td className="center highlight-dynamic">{truckNonLg || '—'}</td>
                        <td className="center highlight-dynamic">{unitNonLg || '—'}</td>
                      </tr>
                      <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                        <td>Total</td>
                        <td className="center">{totalHe || '—'}</td>
                        <td className="center">{totalTruck || '—'}</td>
                        <td className="center">{grandTotalUnits || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Required Document Checklist */}
              <div style={{ border: '1px solid #000000', padding: '6px 8px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#002060', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '4px' }}>
                  Document Requirements Checklist :
                </div>

                {[
                  { label: 'Company Profile', checked: true },
                  { label: 'Legality (e.g. NIB, SIUJK, SIUP, etc)', checked: Boolean(docCheckedMap['NIB'] || d.nib) },
                  { label: 'Deed establishment & Deed Amendments', checked: Boolean(docCheckedMap['DEED'] || d.establishmentActNo) },
                  { label: 'Decree of the ministry of law', checked: Boolean(docCheckedMap['LEGAL_OPINION'] || d.selectedDeedNo) },
                  { label: 'Copy of ID, BOD, and Shareholder', checked: Boolean(docCheckedMap['KTP'] || (d.stakeholders && d.stakeholders.length > 0)) },
                  { label: 'Audited Financial Statements', checked: Boolean(docCheckedMap['FINANCIALS'] || (d.financialStatements && d.financialStatements.length > 0)) },
                  { label: 'Bank Statements', checked: Boolean(docCheckedMap['BANK'] || (d.bankReferences && d.bankReferences.length > 0)) },
                  { label: 'Bank or Financing Facility', checked: Boolean(d.bankReferences && d.bankReferences.length > 0) },
                  { label: 'Production report', checked: true },
                  { label: 'List of fixed assets', checked: Boolean(grandTotalUnits > 0) },
                  { label: 'Project Contracts', checked: Boolean(docCheckedMap['CONTRACT'] || (d.projects && d.projects.length > 0)) },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '8.5px', padding: '1.5px 0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: item.checked ? '#002060' : '#94a3b8' }}>
                      {item.checked ? '☑' : '☐'}
                    </span>
                    <span style={{ color: item.checked ? '#0f172a' : '#64748b' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ==============================================================
                SECTION 7: RINGKASAN LAPORAN KEUANGAN (ROWS 93 - 105)
                ============================================================== */}
            <div className="exact-section-divider" id="fap-preview-sec-finance">
              <div className="exact-section-header">LAPORAN KEUANGAN / FINANCIAL STATEMENTS — LAST 3 YEARS</div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '9px', fontWeight: 600 }}>
                <span>Audited (Yes/No) : <b>{fsList.some((f: any) => f.isAudited) ? 'Yes' : 'No'}</b></span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                {/* Balance Sheet Table */}
                <table className="exact-sh-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Keterangan/Remarks</th>
                      {fsList.map((fs: any, i: number) => (
                        <th key={i} style={{ width: '80px', textAlign: 'right' }}>
                          {fs.fiscalYear || `20${23 + i}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Aset Lancar/Total Current Asset</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.currentAssets)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Total Aset Tetap/Total Non Current Asset</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.nonCurrentAssets)}</td>
                      ))}
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td>Total Aset/Total Asset</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.totalAssets)}</b></td>
                      ))}
                    </tr>
                    <tr>
                      <td>Total Liabilitas Jk Pendek/Current Liabilities</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.currentLiabilities)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Total Liabilitas Jk Panjang/Non Current Liab.</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.longTermLiabilities || fs.nonCurrentLiabilities)}</td>
                      ))}
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td>Total Liabilitas/ Total Liabilities</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.totalLiabilities)}</b></td>
                      ))}
                    </tr>
                    <tr>
                      <td>Ekuitas/Equity</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.equity)}</td>
                      ))}
                    </tr>
                    <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                      <td>Total Liabilitas & Ekuitas/Total Liab. & Equity</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic"><b>{formatNumber((fs.totalLiabilities || 0) + (fs.equity || 0))}</b></td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                {/* Income Statement Table */}
                <table className="exact-sh-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Keterangan/Remarks</th>
                      {fsList.map((fs: any, i: number) => (
                        <th key={i} style={{ width: '80px', textAlign: 'right' }}>
                          {fs.fiscalYear || `20${23 + i}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Pendapatan/Revenue</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.revenue)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Laba Kotor/Gross Margin</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.grossMargin)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Laba Usaha/Operating Margin</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.operatingMargin)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Pajak/Tax</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic">{formatNumber(fs.tax)}</td>
                      ))}
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td>Laba Bersih/Net Income</td>
                      {fsList.map((fs: any, i: number) => (
                        <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.netIncome)}</b></td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ==============================================================
                SECTION 8: PERNYATAAN & TANDA TANGAN (ROWS 106 - 122)
                ============================================================== */}
            <div className="exact-section-divider" id="fap-preview-sec-decl">
              <div className="exact-section-header">PERNYATAAN & TANDA TANGAN / DECLARATION & SIGNATURES</div>
            </div>

            <div style={{ fontSize: '8.5px', color: '#1e293b', lineHeight: 1.35, margin: '8px 0 10px 0' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Dengan ini kami menyatakan dan menyetujui hal-hal sebagai berikut :</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700 }}>1.</span>
                <span>PT LiuGong Finance Indonesia telah memberikan penjelasan mengenai karakteristik pembiayaan, risiko-risiko dan biaya-biaya yang melekat pada produk kepada Kami dan Kami telah memahami sepenuhnya produk tersebut/ PT LiuGong Finance Indonesia has duly provided an explanation regarding the characteristics of the financing, including the inherent risks and associated costs of the product, and we hereby declare that we fully understand the product.</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700 }}>2.</span>
                <span>Menyatakan semua Informasi dan/atau dokumen milik kami, berikut informasi dan/atau dokumen berkaitan dengan penerima manfaat, yang telah diberikan adalah lengkap dan yang sebenar-benarnya, serta memberikan persetujuan kepada PT LiuGong Finance Indonesia dan/atau Pihak ketiga yang bekerja sama dengan PT LiuGong Finance Indonesia untuk menganalisa, memproses, menverifikasi, serta mengirimkan data dan/atau informasi tersebut sehubungan dengan pengajuan pembiayaan ini/ We hereby declare that all information and/or documents provided by us, including those related to the beneficial owner, are complete and true to the best of our knowledge. We further provide our consent to PT LiuGong Finance Indonesia and/or any third party cooperating with PT LiuGong Finance Indonesia to analyze, process, verify, and transmit such data and/or information in connection with this financing application.</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700 }}>3.</span>
                <span>Dalam proses persetujuan pengajuan Pembiayaan, PT LiuGong Finance Indonesia berhak untuk meminta informasi dan dokumen tambahan diluar dari dokumen persyaratan pembiayaan yang di syaratkan/ In the course of the financing application approval process, PT LiuGong Finance Indonesia shall entitled to request additional information and documents beyond the standard financing documentation requirements.</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700 }}>4.</span>
                <span>PT LiuGong Finance Indonesia berhak untuk menerima/ menolak permohonan ini berdasarkan kebijakan internal yang berlaku/PT LiuGong Finance Indonesia shall entitled to approve or reject this application at its sole discretion in accordance with its prevailing internal policies.</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
              <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#ffffff' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700 }}>Di tanda tangani debitur / signed by debtor</div>
                <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                  [sign & company stamp]
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                  [ {d.picName || '                                                              '} ]
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#002060', marginTop: '2px' }}>
                  PT. {d.companyName || '                                          '}
                </div>
              </div>

              <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#ffffff' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700 }}>Diverifikasi oleh pihak LFI/ verified by LFI</div>
                <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                  [sign]
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                  [                                                               ]
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#002060', marginTop: '2px' }}>
                  Marketing · PT. LIUGONG FINANCE INDONESIA
                </div>
              </div>
            </div>

            {/* Form Version Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', fontSize: '9px', fontWeight: 600, color: '#64748b' }}>
              ver 01/2025
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
