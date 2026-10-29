import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Printer,
} from 'lucide-react';
import { LIUGONG_LOGO_B64 } from './liugong-logo-b64';
import { useMasterData } from './master-data';
import type { FapSheetData, FapSheetPreviewProps } from './FapSheetPreview';
import { printFapDocument } from './FapSheetPreview';

export function FapSheetPreviewApproved2025(props: FapSheetPreviewProps) {
  const master = useMasterData();
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(props.compact ? 0.85 : 1.0);
  const [paperHeight, setPaperHeight] = useState<number>(2700);
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

      const targetWidth = 1000;
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
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateFit);
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
  }, [props.activeSection, props.syncTick]);

  const raw = props.data;
  const app = props.application;
  const cust = props.customer || app?.customer;
  const prof = props.profile || app?.profile;
  const p = props.pic || (raw as any)?.pic || app?.pic || cust?.pic || prof?.pic || {};

  const d: FapSheetData = useMemo(() => {
    const rawData = raw || {};
    const picObj = props.pic || (rawData as any)?.pic || app?.pic || cust?.pic || prof?.pic || {};

    const pick = (valA: any, valB: any, valC?: any, fallback = '') => {
      if (valA !== undefined && valA !== null && String(valA).trim() !== '') return valA;
      if (valB !== undefined && valB !== null && String(valB).trim() !== '') return valB;
      if (valC !== undefined && valC !== null && String(valC).trim() !== '') return valC;
      return fallback;
    };

    const resolveLocationLabel = (groupKey: 'province' | 'city' | 'district' | 'village', val: any) => {
      if (!val) return '';
      const str = String(val).trim();
      if (!str) return '';
      const items = (master as any)?.[groupKey] || [];
      const found = items.find((x: any) => x.value === str || x.name?.toLowerCase() === str.toLowerCase());
      if (found) return found.name;
      if (/^[0-9a-f-]{32,36}$/i.test(str)) return '';
      return str;
    };

    const resolvedPicName = pick(raw?.picName, picObj.picName, picObj.name, picObj.contactName);
    const resolvedPosition = pick(raw?.position, picObj.position, picObj.picPosition);
    const resolvedPhone = pick(raw?.phone, picObj.phone, picObj.mobilePhone, picObj.picPhone);
    const resolvedPicEmail = pick(raw?.picEmail, picObj.email, picObj.picEmail);
    const resolvedCurrentAddress = pick(raw?.currentAddress, picObj.currentAddress, picObj.address, picObj.picAddress);
    const resolvedPicCity = resolveLocationLabel('city', pick(raw?.picCity, picObj.city, picObj.picCity));
    const resolvedPicProvince = resolveLocationLabel('province', pick(raw?.picProvince, picObj.province, picObj.picProvince));
    const resolvedPicPostalCode = pick(raw?.picPostalCode, picObj.postalCode, picObj.picPostalCode);

    if (raw) {
      return {
        ...raw,
        picName: resolvedPicName,
        position: resolvedPosition,
        phone: resolvedPhone,
        picEmail: resolvedPicEmail,
        currentAddress: resolvedCurrentAddress,
        picCity: resolvedPicCity,
        picProvince: resolvedPicProvince,
        picPostalCode: resolvedPicPostalCode,
      };
    }

    let branch = app?.branchCode || '';
    if (!branch && app?.branchId) {
      const bObj = master.branches.find((b: any) => b.id === app.branchId) as any;
      branch = bObj ? (bObj.code || bObj.name || app.branchId) : app.branchId;
    }

    let resolvedDeedNo = prof?.selectedDeedNo || prof?.latestDeedNo || '';
    if (!resolvedDeedNo && prof?.legalDeeds && prof.legalDeeds.length > 0) {
      const activeDeed = prof.legalDeeds.find((deed: any) => deed.isLatest) || prof.legalDeeds[0];
      if (activeDeed) resolvedDeedNo = activeDeed.deedNumber || activeDeed.number || '';
    }

    let resolvedDeedDate = prof?.latestDeedDate || '';
    if (!resolvedDeedDate && prof?.legalDeeds && prof.legalDeeds.length > 0) {
      const activeDeed = prof.legalDeeds.find((deed: any) => deed.isLatest) || prof.legalDeeds[0];
      if (activeDeed) resolvedDeedDate = activeDeed.deedDate || activeDeed.date || '';
    }

    let initialStakeholders: any[] = [];
    if (props.stakeholders && props.stakeholders.length > 0) {
      initialStakeholders = props.stakeholders;
    } else if (prof?.stakeholders && prof.stakeholders.length > 0) {
      initialStakeholders = prof.stakeholders;
    } else if (prof?.legalDeeds && prof.legalDeeds.length > 0) {
      const activeDeed = prof.legalDeeds.find((deed: any) => deed.isLatest) || prof.legalDeeds[0];
      if (activeDeed && activeDeed.shareholders) {
        initialStakeholders = activeDeed.shareholders;
      }
    }

    const mapStakeholders = (shs: any[]) => {
      return (shs || []).map((s: any) => ({
        name: s.name || s.shareholderName || s.fullName || '',
        position: s.position || s.role || s.title || '',
        shareAmount: s.shareAmount || s.amount || s.shares || '',
        sharePercent: s.sharePercent || s.percentage || s.percent || ''
      }));
    };

    let estDate = prof?.establishmentDate || '';
    let expY = prof?.experienceYears;
    let expM = prof?.experienceMonths;
    if (expY === undefined || expY === null || expY === '') {
      if (estDate) {
        try {
          const est = new Date(estDate);
          const now = new Date();
          if (!isNaN(est.getTime())) {
            let years = now.getFullYear() - est.getFullYear();
            let months = now.getMonth() - est.getMonth();
            if (months < 0) {
              years -= 1;
              months += 12;
            }
            expY = Math.max(0, years);
            expM = Math.max(0, months);
          }
        } catch {}
      }
    }

    const projectsList = (app?.projects && app.projects.length > 0)
      ? app.projects.map((proj: any) => ({
          owner: proj.owner || proj.projectOwner || proj.client || proj.customer || '',
          location: proj.location || proj.projectLocation || proj.site || '',
          role: proj.role || proj.projectRole || proj.contractType || '',
          status: proj.status || (proj.isExisting ? 'Existing' : 'New') || ''
        }))
      : (prof?.projects || []);

    const bankRefList = (app?.bankReferences && app.bankReferences.length > 0)
      ? app.bankReferences
      : (prof?.bankReferences || []);

    const finStatementsList = (app?.financialStatements && app.financialStatements.length > 0)
      ? app.financialStatements
      : (prof?.financialStatements || []);

    return {
      fapNumber: app?.fapNumber || app?.applicationNo || 'AUTO GENERATE',
      applicationDate: app?.applicationDate || app?.createdAt || new Date().toISOString(),
      branchCode: branch || 'JKT01',
      customerStatus: cust?.status || app?.customerStatus || 'EXISTING',
      companyName: cust?.name || prof?.companyName || app?.companyName || '',
      companyType: cust?.companyType || app?.businessType || 'CORPORATE',
      nib: cust?.nib || prof?.nib || app?.nib || '',
      npwp: cust?.npwp || prof?.npwp || app?.npwp || '',
      establishmentActNo: prof?.establishmentActNo || prof?.deedNo || '',
      establishmentDate: estDate,
      companyAddress: cust?.address || prof?.address || app?.address || '',
      city: prof?.city || cust?.city || '',
      province: prof?.province || cust?.province || '',
      district: prof?.district || '',
      village: prof?.village || '',
      rt: prof?.rt || '',
      rw: prof?.rw || '',
      postalCode: prof?.postalCode || cust?.postalCode || '',
      experienceYears: expY !== undefined && expY !== null ? expY : '',
      experienceMonths: expM !== undefined && expM !== null ? expM : '',
      mainBusiness: prof?.mainBusiness || cust?.businessSector || '',
      latestDeedNo: resolvedDeedNo,
      latestDeedDate: resolvedDeedDate,
      phoneFax: prof?.phoneFax || cust?.phone || '',
      website: prof?.website || '',
      email: cust?.email || prof?.email || '',
      repaymentSource: prof?.repaymentSource || 'Operating Cash Flow',
      locationStatus: prof?.locationStatus || 'OWNED',
      picName: resolvedPicName,
      position: resolvedPosition,
      phone: resolvedPhone,
      picEmail: resolvedPicEmail,
      currentAddress: resolvedCurrentAddress,
      picCity: resolvedPicCity,
      picProvince: resolvedPicProvince,
      picPostalCode: resolvedPicPostalCode,
      selectedDeedNo: resolvedDeedNo,
      stakeholders: mapStakeholders(initialStakeholders),
      facilityPurpose: app?.facilityPurpose || 'INVESTMENT',
      financingMethod: app?.financingMethod || 'FINANCIAL_LEASE',
      financingValue: app?.financingValue || app?.requestedAmount || 0,
      downPaymentValue: app?.downPaymentValue || app?.downPayment || 0,
      interestRate: app?.interestRate || 10.5,
      tenorMonths: app?.tenorMonths || app?.tenor || 36,
      paymentMethod: app?.paymentMethod || 'ARREAR',
      industrySegment: app?.industrySegment || prof?.industrySegment || 'MINING',
      businessRole: app?.businessRole || prof?.businessRole || 'CONTRACTOR',
      proposal: app?.proposal || {},
      projects: projectsList,
      bankReferences: bankRefList,
      financialStatements: finStatementsList,
      units: app?.units || [],
      assetSummaryHeLiuGong: app?.assetSummaryHeLiuGong || 0,
      assetSummaryTruckLiuGong: app?.assetSummaryTruckLiuGong || 0,
      assetSummaryHeNonLiuGong: app?.assetSummaryHeNonLiuGong || 0,
      assetSummaryTruckNonLiuGong: app?.assetSummaryTruckNonLiuGong || 0,
      documentChecks: app?.documentChecks || [],
      applicationSource: app?.applicationSource || 'Direct / Dealer',
      notes: app?.notes || ''
    };
  }, [raw, app, cust, prof, p, props.pic, props.stakeholders, master]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const m = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
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
      if (lowerKey === 'picemail' && dField === 'picemail') return true;
      if (lowerKey === 'establishmentactno' && (dField === 'establishmentactno' || dField === 'deedno')) return true;
      return false;
    });
  };

  const getDiffClass = (key: string, baseClass = '') => {
    const diff = getDiff(key);
    if (!diff) return baseClass;
    return `${baseClass} fap-diff-cell-highlight`;
  };

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

  const totalCreditFacility = useMemo(() => {
    return (d.bankReferences || []).reduce((acc: number, b: any) => acc + (Number(b.creditFacility) || 0), 0);
  }, [d.bankReferences]);

  const totalMonthlyInstallment = useMemo(() => {
    return (d.bankReferences || []).reduce((acc: number, b: any) => acc + (Number(b.monthlyInstallment) || 0), 0);
  }, [d.bankReferences]);

  const method = String(d.financingMethod || '').toUpperCase();
  const isLease = method === 'FINANCIAL_LEASE' || method === 'SEWA_PEMBIAYAAN' || (method.includes('LEASE') && !method.includes('SALE'));
  const isSaleAndLease = method === 'SALE_AND_LEASE_BACK' || method.includes('SALE');
  const isInstallment = method === 'INSTALLMENT_FINANCING' || method === 'INSTALLMENT' || method.includes('ANGSURAN') || method.includes('PEMBELIAN');

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

  const sh = d.stakeholders || [];
  const projects = d.projects || [];
  const banks = d.bankReferences || [];

  return (
    <div className={`excel-fap-viewer approved-2025-template ${props.isComparison ? 'in-comparison-mode' : ''}`}>
      {/* Excel Ribbon Header */}
      {showRibbon && (
        <div className="excel-fap-ribbon">
          <div className="excel-ribbon-left">
            <FileSpreadsheet size={16} className="excel-brand-icon" />
            <div className="excel-file-badge">
              <span className="excel-file-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                APPLICATION FORM · APPROVED v01.2025
                <span style={{ fontSize: '9.5px', background: '#10b981', color: '#ffffff', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                  OFFICIAL SPREADSHEET
                </span>
              </span>
              <span className="excel-tab-badge">Exact 1:1 Excel Grid Layout · Tanpa Watermark · Ready for PDF</span>
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
              <span className="excel-zoom-pct">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => {
                  setAutoFit(false);
                  setZoomLevel((z) => Math.min(1.4, Number((z + 0.05).toFixed(2))));
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
              title="Print Application Form to PDF"
            >
              <Printer size={13} />
              <span>Print PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Jump Navigation */}
      {showRibbon && (
        <div className="excel-fap-formula-bar" style={{ padding: '4px 12px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', width: '100%', paddingBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', marginRight: '6px', whiteSpace: 'nowrap' }}>
              Jump to:
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
            width: `${Math.round(1000 * zoomLevel)}px`,
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
              width: '1000px',
              minWidth: '1000px',
              maxWidth: '1000px',
              position: 'absolute',
              top: 0,
              left: 0,
              background: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              padding: '16px 15px',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            {/* MASTER EXCEL TABLE (1:1 CORRESPONDENCE WITH APPROVED v01.2025) */}
            <table className="excel-master-table" style={{ width: '970px', minWidth: '970px', maxWidth: '970px', tableLayout: 'fixed', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '8.5px', color: '#000000', lineHeight: 1.15 }}>
              <colgroup>
                <col style={{ width: '30px' }} />  {/* A: Left Bracket Margin / Section Names */}
                <col style={{ width: '46px' }} />  {/* B */}
                <col style={{ width: '42px' }} />  {/* C */}
                <col style={{ width: '38px' }} />  {/* D */}
                <col style={{ width: '46px' }} />  {/* E */}
                <col style={{ width: '58px' }} />  {/* F */}
                <col style={{ width: '30px' }} />  {/* G */}
                <col style={{ width: '124px' }} /> {/* H */}
                <col style={{ width: '25px' }} />  {/* I */}
                <col style={{ width: '40px' }} />  {/* J */}
                <col style={{ width: '46px' }} />  {/* K */}
                <col style={{ width: '58px' }} />  {/* L */}
                <col style={{ width: '26px' }} />  {/* M */}
                <col style={{ width: '52px' }} />  {/* N */}
                <col style={{ width: '48px' }} />  {/* O */}
                <col style={{ width: '78px' }} />  {/* P */}
                <col style={{ width: '16px' }} />  {/* Q */}
                <col style={{ width: '56px' }} />  {/* R */}
                <col style={{ width: '65px' }} />  {/* S */}
                <col style={{ width: '46px' }} />  {/* T */}
              </colgroup>

              <tbody>
                {/* ==============================================================
                    ROW 1-4: HEADER WITH LOGO, APPLICATION FORM, AND REGISTER
                    ============================================================== */}
                <tr id="fap-preview-sec-header" style={{ height: '36px' }}>
                  <td colSpan={5} style={{ verticalAlign: 'middle', padding: '0 0 4px 0' }}>
                    <img
                      src={LIUGONG_LOGO_B64.startsWith('data:') ? LIUGONG_LOGO_B64 : `data:image/png;base64,${LIUGONG_LOGO_B64}`}
                      alt="LiuGong Finance Indonesia"
                      style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }}
                    />
                  </td>
                  <td colSpan={7} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.8px', color: '#000000' }}>
                      APPLICATION FORM
                    </span>
                  </td>
                  <td colSpan={3} style={{ textAlign: 'right', verticalAlign: 'bottom', paddingRight: '4px', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    No. Register :
                  </td>
                  <td colSpan={4} style={{ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px', fontWeight: 'bold', color: '#002060', whiteSpace: 'nowrap', padding: '0 6px' }}>
                    {d.fapNumber || 'AUTO GENERATE'}
                  </td>
                  <td colSpan={1} style={{ textAlign: 'right', verticalAlign: 'bottom', fontSize: '8.5px', color: '#64748b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    1 : 1
                  </td>
                </tr>

                {/* ROW 6: SOLID DARK BLUE DIVIDER BAR */}
                <tr style={{ height: '4px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '4px', background: '#002060' }} />
                </tr>

                {/* ROW 7: SPACER */}
                <tr style={{ height: '6px' }}><td colSpan={20} style={{ padding: 0 }} /></tr>

                {/* ==============================================================
                    ROW 8-9: 4-BOX CLASSIFICATION MATRIX
                    ============================================================== */}
                <tr style={{ height: '22px' }}>
                  {/* Box 1: Date */}
                  <td colSpan={2} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Tanggal/Date
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px 4px', verticalAlign: 'middle', fontWeight: 'bold', color: '#002060' }}>
                    {formatDate(d.applicationDate)}
                  </td>

                  {/* Spacer Col E */}
                  <td style={{ padding: 0 }} />

                  {/* Box 2: New Customer */}
                  <td colSpan={2} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Customer Baru/New Customer
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {isCustNew ? '☑' : '☐'}
                  </td>

                  {/* Spacer Col I-K */}
                  <td colSpan={3} style={{ padding: 0 }} />

                  {/* Box 3: Corporate */}
                  <td colSpan={2} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Corporate
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {isCorp ? '☑' : '☐'}
                  </td>

                  {/* Spacer Col P-Q */}
                  <td colSpan={2} style={{ padding: 0 }} />

                  {/* Box 4: Micro */}
                  <td style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Micro
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {isMicro ? '☑' : '☐'}
                  </td>
                </tr>

                <tr style={{ height: '22px' }}>
                  {/* Box 1: Branch */}
                  <td colSpan={2} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Cabang/Branch
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px 4px', verticalAlign: 'middle', fontWeight: 'bold', color: '#002060' }}>
                    {d.branchCode}
                  </td>

                  {/* Spacer Col E */}
                  <td style={{ padding: 0 }} />

                  {/* Box 2: Existing Customer */}
                  <td colSpan={2} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Customer Lama /Existing Customer
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {isCustExisting ? '☑' : '☐'}
                  </td>

                  {/* Spacer Col I-K */}
                  <td colSpan={3} style={{ padding: 0 }} />

                  {/* Box 3: Commercial */}
                  <td colSpan={2} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    Commercial
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {isComm ? '☑' : '☐'}
                  </td>

                  {/* Spacer Col P-Q */}
                  <td colSpan={2} style={{ padding: 0 }} />

                  {/* Box 4: LiuGong User */}
                  <td style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px', verticalAlign: 'middle' }}>
                    LiuGong User
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {isLiugongUser ? '☑' : '☐'}
                  </td>
                </tr>

                {/* ROW 10: CRISP ORANGE HORIZONTAL DIVIDER BAR */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 11 - 45: SECTION 2 - CUSTOMER DATA & PIC & SHAREHOLDERS
                    ============================================================== */}
                {/* Row 12: Company Name | PIC Name & Phone */}
                <tr id="fap-preview-sec-company" style={{ height: '24px' }}>
                  {/* Col A: Side Bracket Column */}
                  <td rowSpan={21} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', background: '#ffffff', padding: '2px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', whiteSpace: 'nowrap', margin: '0 auto' }}>
                      Customer  Data
                    </div>
                  </td>

                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Nama Perusahaan/ Company's Name
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-companyName" className={getDiffClass('companyName')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.companyName}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right: PIC Name */}
                  <td colSpan={2} id="fap-preview-sec-pic" style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Penanggung Jawab/PIC
                  </td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-picName" className={getDiffClass('picName')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.picName}
                    </div>
                  </td>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', textAlign: 'right' }}>
                    Telepon/Phone
                  </td>
                  <td colSpan={3} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-phone" className={getDiffClass('phone')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.phone}
                    </div>
                  </td>
                </tr>

                {/* Row 14: Company Address | PIC Position & Email */}
                <tr style={{ height: '24px' }}>
                  <td colSpan={2} rowSpan={2} style={{ padding: '2px 2px', verticalAlign: 'top', fontWeight: 'bold' }}>
                    Alamat Perusahaan/ Company Address
                  </td>
                  <td rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'top' }}>:</td>
                  <td colSpan={4} rowSpan={2} style={{ padding: '1.5px 0', verticalAlign: 'top' }}>
                    <div id="fap-diff-cell-companyAddress" className={getDiffClass('companyAddress')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '44px', height: '100%', padding: '3px 4px', boxSizing: 'border-box', color: '#002060', lineHeight: 1.2, overflow: 'hidden' }}>
                      {d.companyAddress}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right: Position & Email */}
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Jabatan/ Position
                  </td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-position" className={getDiffClass('position')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.position}
                    </div>
                  </td>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', textAlign: 'right' }}>
                    Email
                  </td>
                  <td colSpan={3} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-picEmail" className={getDiffClass('picEmail')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.picEmail}
                    </div>
                  </td>
                </tr>

                {/* Row 16: PIC Current Address spanning L to T */}
                <tr style={{ height: '24px' }}>
                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Alamat Tempat Tinggal/ Current Address
                  </td>
                  <td colSpan={9} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-currentAddress" className={getDiffClass('currentAddress')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.currentAddress}
                    </div>
                  </td>
                </tr>

                {/* Row 17: Kota / City (Left) | Right side blank */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                    Kota/City
                  </td>
                  <td style={{ textAlign: 'center' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-city" className={getDiffClass('city')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.city}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right side blank (Cols J to T = 11 cols) */}
                  <td colSpan={11} style={{ padding: 0 }} />
                </tr>

                {/* Row 18: Provinsi / Province (Left) | Right side blank */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                    Provinsi/Province
                  </td>
                  <td style={{ textAlign: 'center' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-province" className={getDiffClass('province')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.province}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right side blank (Cols J to T = 11 cols) */}
                  <td colSpan={11} style={{ padding: 0 }} />
                </tr>

                {/* Row 20: Postal code (Left) | PIC Kota/City (Right: Cols P-T) */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                    Postal code
                  </td>
                  <td style={{ textAlign: 'center' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-postalCode" className={getDiffClass('postalCode')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.postalCode}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right: PIC Kota/City shifted far right (Cols J-K blank, L-O label, P-T box) */}
                  <td colSpan={2} style={{ padding: 0 }} />
                  <td colSpan={4} style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    Kota/City
                  </td>
                  <td colSpan={5} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-picCity" className={getDiffClass('picCity')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.picCity}
                    </div>
                  </td>
                </tr>

                {/* Row 22: Main Business (Left) | PIC Provinsi/Province (Right: Cols P-T) */}
                <tr id="fap-preview-sec-business" style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Bisnis Utama/ Main Business
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-mainBusiness" className={getDiffClass('mainBusiness')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.mainBusiness}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right: PIC Provinsi/Province shifted far right */}
                  <td colSpan={2} style={{ padding: 0 }} />
                  <td colSpan={4} style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    Provinsi/Province
                  </td>
                  <td colSpan={5} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-picProvince" className={getDiffClass('picProvince')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.picProvince}
                    </div>
                  </td>
                </tr>

                {/* Row 23: Blank Left | PIC Kode Post (Right: Cols P-T) */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={7} style={{ padding: 0 }} />
                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right: PIC Kode Post shifted far right */}
                  <td colSpan={2} style={{ padding: 0 }} />
                  <td colSpan={4} style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    Kode Post/Postal code
                  </td>
                  <td colSpan={5} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-picPostalCode" className={getDiffClass('picPostalCode')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.picPostalCode}
                    </div>
                  </td>
                </tr>

                {/* Row 25: Deed Establishment | Shareholder Header */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    No. Akta Pendirian/ Deed Establishment number
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={1} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-establishmentActNo" className={getDiffClass('establishmentActNo')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.establishmentActNo}
                    </div>
                  </td>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', textAlign: 'right', fontSize: '8px' }}>
                    Tanggal Pendirian/ Est Date
                  </td>
                  <td colSpan={1} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-establishmentDate" className={getDiffClass('establishmentDate')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatDate(d.establishmentDate)}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  <td colSpan={11} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9px', color: '#000000' }}>
                    Struktur Organisasi & Pemegang Saham/Organization & Shareholder Structure
                  </td>
                </tr>

                {/* Row 26: Blank Left | Shareholder Deed Reference */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={7} style={{ padding: 0 }} />
                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  <td colSpan={11} style={{ padding: '2px 2px', verticalAlign: 'middle', fontSize: '8.5px', color: '#475569' }}>
                    Berdasarkan Akta/ Based on Act No: <span style={{ fontWeight: 'bold', color: '#002060' }}>{d.selectedDeedNo || '.....................'}</span> Tanggal/Date: <span style={{ fontWeight: 'bold', color: '#002060' }}>{formatDate(d.latestDeedDate) || '.....................'}</span>
                  </td>
                </tr>

                {/* Row 27: Experience | Shareholder Table Headers */}
                <tr style={{ height: '22px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Pengalaman/Experience
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={1} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-experienceYears" className={getDiffClass('experienceYears')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#002060' }}>
                      {d.experienceYears}
                    </div>
                  </td>
                  <td style={{ padding: '2px 2px', verticalAlign: 'middle' }}>years</td>
                  <td colSpan={1} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-experienceMonths" className={getDiffClass('experienceMonths')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#002060' }}>
                      {d.experienceMonths}
                    </div>
                  </td>
                  <td style={{ padding: '2px 2px', verticalAlign: 'middle' }}>months</td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Shareholder Table Header */}
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>No</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Name</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Position</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Amount of Share</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>% share</td>
                </tr>

                {/* Row 29: Latest Deed Amendment | Shareholder Row 1 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    No. Akta Perubahan Terakhir
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={1} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-latestDeedNo" className={getDiffClass('latestDeedNo')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.latestDeedNo}
                    </div>
                  </td>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', textAlign: 'right', fontSize: '8px' }}>
                    Tgl Perubahan:
                  </td>
                  <td colSpan={1} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-latestDeedDate" className={getDiffClass('latestDeedDate')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatDate(d.latestDeedDate)}
                    </div>
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Shareholder 1 */}
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>1</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[0]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[0]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[0]?.shareAmount ? formatNumber(sh[0].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[0]?.sharePercent ? sh[0].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 30: Blank Left | Shareholder Row 2 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={7} style={{ padding: 0 }} />
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>2</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[1]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[1]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[1]?.shareAmount ? formatNumber(sh[1].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[1]?.sharePercent ? sh[1].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 32: NIB | Shareholder Row 3 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    NIB (No Induk Berusaha)
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-nib" className={getDiffClass('nib')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.nib}
                    </div>
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>3</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[2]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[2]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[2]?.shareAmount ? formatNumber(sh[2].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[2]?.sharePercent ? sh[2].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 34: NPWP | Shareholder Row 4 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    NPWP/No.Tax
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-npwp" className={getDiffClass('npwp')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.npwp}
                    </div>
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>4</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[3]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[3]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[3]?.shareAmount ? formatNumber(sh[3].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[3]?.sharePercent ? sh[3].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 36: Phone / Fax | Shareholder Row 5 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Phone / Fax
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-phoneFax" className={getDiffClass('phoneFax')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.phoneFax}
                    </div>
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>5</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[4]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[4]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[4]?.shareAmount ? formatNumber(sh[4].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[4]?.sharePercent ? sh[4].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 37: Blank Left | Shareholder Row 6 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={7} style={{ padding: 0 }} />
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>6</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[5]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[5]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[5]?.shareAmount ? formatNumber(sh[5].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[5]?.sharePercent ? sh[5].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 38: Website | Shareholder Row 7 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Website
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-website" className={getDiffClass('website')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.website || '—'}
                    </div>
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>7</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[6]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[6]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[6]?.shareAmount ? formatNumber(sh[6].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[6]?.sharePercent ? sh[6].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 40: Email | Shareholder Row 8 */}
                <tr style={{ height: '21px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Email
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-email" className={getDiffClass('email')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.email}
                    </div>
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>8</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[7]?.name || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{sh[7]?.position || ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[7]?.shareAmount ? formatNumber(sh[7].shareAmount) : ''}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'right', color: '#002060' }}>{sh[7]?.sharePercent ? sh[7].sharePercent + '%' : ''}</td>
                </tr>

                {/* Row 42: Repayment Source */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Sumber Pembayaran/ Repayment source
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div id="fap-diff-cell-repaymentSource" className={getDiffClass('repaymentSource')} style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.repaymentSource}
                    </div>
                  </td>
                  <td colSpan={12} style={{ padding: 0 }} />
                </tr>

                {/* Row 44: Business Location Status */}
                <tr style={{ height: '23px' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Status tempat usaha/Business Location Status
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={4} style={{ padding: '1.5px 0', verticalAlign: 'middle' }}>
                    <div style={{ border: '1px solid #000000', background: '#ffffff', minHeight: '19px', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                      {d.locationStatus === 'OWNED'
                        ? '☑ Milik Sendiri   /   ☐ Sewa'
                        : d.locationStatus === 'RENTED'
                        ? '☐ Milik Sendiri   /   ☑ Sewa'
                        : '  Milik Sendiri   /   Sewa'}
                    </div>
                  </td>
                  <td colSpan={12} style={{ padding: 0 }} />
                </tr>

                {/* ORANGE DIVIDER */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 46 - 54: SECTION 3 - PURPOSE & FIXED ASSETS
                    ============================================================== */}
                <tr id="fap-preview-sec-facility" style={{ height: '22px' }}>
                  {/* Col A: Side Header */}
                  <td rowSpan={6} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', background: '#ffffff', padding: '2px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap', margin: '0 auto' }}>
                      Purpose & Assets
                    </div>
                  </td>

                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Tujuan Pembiayaan/ financing purpose
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>:</td>
                  <td colSpan={3} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Investasi / Investment (√)
                  </td>
                  <td colSpan={5} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Modal Kerja/working capital  (√)
                  </td>
                  <td style={{ padding: 0 }} />
                  <td colSpan={7} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    List Fixed Assets :
                  </td>
                </tr>

                {/* Row 47: Checklists & Fixed Assets Table Header */}
                <tr style={{ height: '20px' }}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {d.facilityPurpose === 'INVESTMENT' ? '☑' : '☐'}
                  </td>
                  <td colSpan={4} style={{ padding: '1px 3px', verticalAlign: 'middle', fontSize: '8px' }}>
                    Aktivitas Usaha / Investasi
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {d.facilityPurpose === 'WORKING_CAPITAL' ? '☑' : '☐'}
                  </td>
                  <td colSpan={4} rowSpan={2} style={{ padding: '1px 3px', verticalAlign: 'top', fontSize: '7.5px', color: '#475569' }}>
                    memenuhi kebutuhan pengeluaran yang habis dalam 1 siklus usaha
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Brand</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>HE</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Truck</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Unit</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Percentage</td>
                </tr>

                {/* Row 48: Fixed Assets LiuGong */}
                <tr style={{ height: '20px' }}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {d.facilityPurpose === 'INVESTMENT' ? '☑' : '☐'}
                  </td>
                  <td colSpan={4} style={{ padding: '1px 3px', verticalAlign: 'middle', fontSize: '8px' }}>
                    Rehabilitasi (rehabilitation)
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    ☐
                  </td>
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: 'bold' }}>Liugong</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px' }}>{heLg}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px' }}>{truckLg}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{unitLg}</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px' }}>{pctLg}</td>
                </tr>

                {/* Row 49: Fixed Assets Non LiuGong */}
                <tr style={{ height: '20px' }}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    {d.facilityPurpose === 'INVESTMENT' ? '☑' : '☐'}
                  </td>
                  <td colSpan={4} style={{ padding: '1px 3px', verticalAlign: 'middle', fontSize: '8px' }}>
                    Modernisasi/Ekspansi
                  </td>
                  <td colSpan={5} style={{ padding: 0 }} />
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', padding: '2px 4px' }}>Non Liugong</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px' }}>{heNonLg}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px' }}>{truckNonLg}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{unitNonLg}</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px' }}>{pctNonLg}</td>
                </tr>

                {/* Row 50: Fixed Assets Total */}
                <tr style={{ height: '20px' }}>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                    ☐
                  </td>
                  <td colSpan={4} style={{ padding: '1px 3px', verticalAlign: 'middle', fontSize: '8px' }}>
                    Relokasi tempat usaha
                  </td>
                  <td colSpan={5} style={{ padding: 0 }} />
                  <td style={{ padding: 0 }} />
                  <td style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: 'bold' }}>Total</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{totalHe}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{totalTruck}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{grandTotalUnits}</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>100%</td>
                </tr>

                {/* Row 53: Attachment Note */}
                <tr style={{ height: '18px' }}>
                  <td colSpan={10} style={{ padding: 0 }} />
                  <td style={{ padding: 0 }} />
                  <td colSpan={8} style={{ fontSize: '8px', color: '#64748b', fontStyle: 'italic', textAlign: 'right', padding: '1px 2px' }}>
                    *daftar unit terlampir/list equipment attached
                  </td>
                </tr>

                {/* ORANGE DIVIDER */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 55 - 63: SECTION 4 - SEGMENTATION & PROJECTS
                    ============================================================== */}
                <tr id="fap-preview-sec-projects" style={{ height: '22px' }}>
                  {/* Col A: Side Header */}
                  <td rowSpan={8} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', background: '#ffffff', padding: '2px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '8px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap', margin: '0 auto' }}>
                      Business Background
                    </div>
                  </td>

                  <td colSpan={4} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Segmentasi/Segmentation :
                  </td>
                  <td colSpan={3} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    Bisnis Utama/Main Business :
                  </td>
                  <td style={{ padding: 0 }} />
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px', whiteSpace: 'nowrap' }}>
                    Pemilik Proyek/Project Owner
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px', whiteSpace: 'nowrap' }}>
                    Lokasi Proyek/Project Location
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px', whiteSpace: 'nowrap' }}>
                    Project Role
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px', whiteSpace: 'nowrap' }}>
                    Existing/New
                  </td>
                </tr>

                {/* Rows 56 to 62: Seg & Biz Rows + Project Rows */}
                {[
                  { segLabel: 'Pertambangan/Mining', segVal: 'MINING', bizLabel: 'Cons. Owner', bizVal: 'CONS_OWNER' },
                  { segLabel: 'Pertanian/Agriculture', segVal: 'AGRICULTURE', bizLabel: 'Contractors', bizVal: 'CONTRACTOR' },
                  { segLabel: 'Kehutanan/Forestry', segVal: 'FORESTRY', bizLabel: 'Sub Cont', bizVal: 'SUB_CONTRACTOR' },
                  { segLabel: 'Konstruksi/Construction', segVal: 'CONSTRUCTION', bizLabel: 'Rental', bizVal: 'RENTAL' },
                  { segLabel: 'Oil & Gas', segVal: 'OIL_GAS', bizLabel: 'Other', bizVal: 'OTHER' },
                  { segLabel: 'Lainnya/Other', segVal: 'OTHER', bizLabel: '', bizVal: '' },
                  { segLabel: '', segVal: '', bizLabel: '', bizVal: '' },
                ].map((rowItem, idx) => {
                  const proj = projects[idx];
                  const segChecked = rowItem.segVal && (d.industrySegment === rowItem.segVal || (rowItem.segVal === 'MINING' && !d.industrySegment));
                  const bizChecked = rowItem.bizVal && (d.businessRole === rowItem.bizVal || (rowItem.bizVal === 'CONTRACTOR' && !d.businessRole));

                  return (
                    <tr key={idx} style={{ height: '20px' }}>
                      {/* Segmentation */}
                      <td style={{ border: rowItem.segLabel ? '1px solid #000000' : 'none', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                        {rowItem.segLabel ? (segChecked ? '☑' : '☐') : ''}
                      </td>
                      <td colSpan={3} style={{ padding: '1px 3px', verticalAlign: 'middle' }}>
                        {rowItem.segLabel}
                      </td>

                      {/* Business Role */}
                      <td style={{ border: rowItem.bizLabel ? '1px solid #000000' : 'none', textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', fontWeight: 'bold' }}>
                        {rowItem.bizLabel ? (bizChecked ? '☑' : '☐') : ''}
                      </td>
                      <td colSpan={2} style={{ padding: '1px 3px', verticalAlign: 'middle' }}>
                        {rowItem.bizLabel}
                      </td>

                      {/* Spacer Col I */}
                      <td style={{ padding: 0 }} />

                      {/* Project Columns */}
                      <td colSpan={3} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj?.owner || ''}
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj?.location || ''}
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj?.role || ''}
                      </td>
                      <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center', color: '#002060', whiteSpace: 'nowrap' }}>
                        {proj?.status || ''}
                      </td>
                    </tr>
                  );
                })}

                {/* ORANGE DIVIDER */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 64 - 73: SECTION 5 - BANK REFERENCES
                    ============================================================== */}
                <tr id="fap-preview-sec-bank" style={{ height: '22px' }}>
                  {/* Col A: Side Header */}
                  <td rowSpan={8} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', background: '#ffffff', padding: '2px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap', margin: '0 auto' }}>
                      References
                    </div>
                  </td>

                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>No</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Bank/Fin</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Currency</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Credit Facility</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Monthly Installment</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Year Started</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Interest Rate</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Payment Recored</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Status</td>
                </tr>

                {/* 5 Bank Rows */}
                {[0, 1, 2, 3, 4].map(idx => {
                  const b = banks[idx];
                  return (
                    <tr key={idx} style={{ height: '20px' }}>
                      <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>{idx + 1}</td>
                      <td colSpan={3} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>{b?.bankName || ''}</td>
                      <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{b?.currency || (b ? 'IDR' : '')}</td>
                      <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>{b?.creditFacility ? formatNumber(b.creditFacility) : ''}</td>
                      <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>{b?.monthlyInstallment ? formatNumber(b.monthlyInstallment) : ''}</td>
                      <td style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{b?.yearStarted || ''}</td>
                      <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{b?.interestRate ? b.interestRate + '%' : ''}</td>
                      <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{b?.paymentRecord || ''}</td>
                      <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{b?.status || ''}</td>
                    </tr>
                  );
                })}

                {/* Row 70: Bank Total & Comments */}
                <tr style={{ height: '22px' }}>
                  <td colSpan={5} style={{ padding: '2px 4px', fontWeight: 'bold', textAlign: 'right' }}>
                    TOTAL
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>
                    {totalCreditFacility > 0 ? formatNumber(totalCreditFacility) : '—'}
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>
                    {totalMonthlyInstallment > 0 ? formatNumber(totalMonthlyInstallment) : '—'}
                  </td>
                  <td style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                    Comments :
                  </td>
                  <td colSpan={8} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>
                    {banks[0]?.comments || d.notes || 'Lancar / Good Standing'}
                  </td>
                </tr>

                {/* Row 71: Spacer */}
                <tr style={{ height: '4px' }}><td colSpan={19} style={{ padding: 0 }} /></tr>

                {/* ORANGE DIVIDER */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 74 - 90: SECTION 6 - FACILITY PROPOSED & CHECKLIST
                    ============================================================== */}
                <tr id="fap-preview-sec-proposal" style={{ height: '22px' }}>
                  {/* Col A: Side Header */}
                  <td rowSpan={12} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', background: '#ffffff', padding: '2px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '8px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap', margin: '0 auto' }}>
                      Financing Proposed
                    </div>
                  </td>

                  {/* Left Block: Facility Proposed Column Headers */}
                  <td colSpan={6} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9px' }}>
                    Facility Proposed :
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', fontSize: '8px', padding: '2px' }}>
                    Sewa Pembiayaan/Financial Lease
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', fontSize: '8px', padding: '2px' }}>
                    Jual dan Sewa kembali/Sale and Lease Back
                  </td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', fontSize: '8px', padding: '2px' }}>
                    Pembelian angsuran/ Installment Financing
                  </td>

                  {/* Spacer Col R */}
                  <td style={{ padding: 0 }} />

                  {/* Right: Document Requirement Header */}
                  <td colSpan={2} style={{ padding: '2px 2px', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '8.5px' }}>
                    Persyaratan Dokumen
                  </td>
                </tr>

                {/* Row 75: Investment Type & Checklist 1 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={6} style={{ padding: '2px 2px' }} />
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>
                    {isLease ? 'Investment' : '—'}
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>
                    {isSaleAndLease ? 'working capital / Investment' : '—'}
                  </td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>
                    {isInstallment ? 'working capital / Investment' : '—'}
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['COMPANY_PROFILE'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Company Profile
                  </td>
                </tr>

                {/* Row 76: Financing Method & Checklist 2 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={3} style={{ padding: '2px 2px', fontWeight: 'bold' }}>
                    Cara Pembiayaan / financing method
                  </td>
                  <td style={{ textAlign: 'center' }}>:</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>
                    {d.financingMethod || 'FINANCIAL LEASE'}
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>IDR</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>IDR</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>IDR</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['LEGALITY'] || docCheckedMap['NIB'] ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Legality (NIB, SIUP)
                  </td>
                </tr>

                {/* Row 77: Financing Value & Checklist 3 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={3} style={{ padding: '2px 2px', fontWeight: 'bold' }}>
                    Nilai Pembiayaan / financing value
                  </td>
                  <td style={{ textAlign: 'center' }}>:</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>
                    {formatCurrency(d.financingValue)}
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>{isLease ? formatCurrency(d.downPaymentValue) : '—'}</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>{isSaleAndLease ? formatCurrency(d.downPaymentValue) : '—'}</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px' }}>{isInstallment ? formatCurrency(d.downPaymentValue) : '—'}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['DEED'] || Boolean(d.establishmentActNo) ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Deed & Amendments
                  </td>
                </tr>

                {/* Row 78: Application Source & Checklist 4 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={3} style={{ padding: '2px 2px', fontWeight: 'bold' }}>
                    Application Source
                  </td>
                  <td style={{ textAlign: 'center' }}>:</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', color: '#002060' }}>
                    {d.applicationSource}
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>{d.interestRate}%</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>{d.interestRate}%</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>{d.interestRate}%</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['SK_MENKUMHAM'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Decree Ministry of Law
                  </td>
                </tr>

                {/* Row 79: Tenor & Checklist 5 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={6} style={{ padding: '2px 2px', fontWeight: 'bold' }}>
                    Jk. Waktu/Tenor
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>{d.tenorMonths} Bulan</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>{d.tenorMonths} Bulan</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', color: '#002060' }}>{d.tenorMonths} Bulan</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['BOD_KTP'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Copy ID, BOD, Shareholders
                  </td>
                </tr>

                {/* Row 80: Payment Method & Checklist 6 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={6} style={{ padding: '2px 2px', fontWeight: 'bold' }}>
                    cara pembayaran /Payment Method
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{d.paymentMethod}</td>
                  <td colSpan={3} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{d.paymentMethod}</td>
                  <td colSpan={4} style={{ border: '1px solid #000000', textAlign: 'center', padding: '2px', color: '#002060' }}>{d.paymentMethod}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['AUDITED_FS'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Audited Financial Statements
                  </td>
                </tr>

                {/* Row 81: Unit Realization Plan Header & Checklist 7 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={6} style={{ padding: '2px 2px', fontWeight: 'bold', fontSize: '8.5px' }}>
                    Rencana Realisasi Unit/Unit Realization Plan
                  </td>
                  <td colSpan={10} style={{ padding: '2px 2px', fontWeight: 'bold' }}>
                    Notes :
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['BANK_STATEMENTS'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Bank Statements
                  </td>
                </tr>

                {/* Row 82: Realization Table Header & Checklist 8 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Brand</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>HE</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Truck</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>Unit</td>
                  <td colSpan={10} rowSpan={4} style={{ border: '1px solid #000000', padding: '4px', verticalAlign: 'top', color: '#002060' }}>
                    {d.notes || 'Realisasi unit sesuai jadwal pengiriman proyek.'}
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['BANK_FACILITY'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Bank or Financing Facility
                  </td>
                </tr>

                {/* Row 83: Realization LiuGong & Checklist 9 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: 'bold' }}>Liugong</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>{heLg}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>{truckLg}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>{unitLg}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['PRODUCTION_REPORT'] || false ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Production report
                  </td>
                </tr>

                {/* Row 84: Realization Non LiuGong & Checklist 10 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px' }}>Non Liugong</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>{heNonLg}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>{truckNonLg}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>{unitNonLg}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['ASSET_LIST'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    List of fixed assets
                  </td>
                </tr>

                {/* Row 85: Realization Total & Checklist 11 */}
                <tr style={{ height: '20px' }}>
                  <td colSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: 'bold' }}>Total</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>{totalHe}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>{totalTruck}</td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', fontWeight: 'bold', color: '#002060' }}>{grandTotalUnits}</td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {docCheckedMap['PROJECT_CONTRACTS'] || true ? '☑' : '☐'}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 3px', fontSize: '8px' }}>
                    Project Contracts
                  </td>
                </tr>

                {/* ORANGE DIVIDER */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 91 - 101: SECTION 7 - FINANCIAL STATEMENTS
                    ============================================================== */}
                <tr id="fap-preview-sec-finance" style={{ height: '22px' }}>
                  {/* Col A: Side Header */}
                  <td rowSpan={9} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', background: '#ffffff', padding: '2px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap', margin: '0 auto' }}>
                      Financial Statement
                    </div>
                  </td>

                  {/* Left: Balance Sheet Header */}
                  <td colSpan={4} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px' }}>
                    Keterangan/Remarks (Neraca)
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>
                    {fsList[0]?.fiscalYear || '2023'}
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>
                    {fsList[1]?.fiscalYear || '2024'}
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>
                    {fsList[2]?.fiscalYear || '2025'}
                  </td>

                  {/* Spacer Col I */}
                  <td style={{ padding: 0 }} />

                  {/* Right: Income Statement Header */}
                  <td colSpan={6} style={{ border: '1px solid #000000', fontWeight: 'bold', padding: '2px 4px' }}>
                    Keterangan/Remarks (Laba Rugi)
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>
                    {fsList[0]?.fiscalYear || '2023'}
                  </td>
                  <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>
                    {fsList[1]?.fiscalYear || '2024'}
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '2px' }}>
                    {fsList[2]?.fiscalYear || '2025'}
                  </td>
                </tr>

                {/* 8 Financial Rows */}
                {[
                  {
                    bsLabel: 'Total Aset Lancar/Total Current Asset',
                    bsKey: 'currentAssets',
                    isLabel: 'Pendapatan/Revenue',
                    isKey: 'revenue'
                  },
                  {
                    bsLabel: 'Total Aset Tetap/Total Non Current Asset',
                    bsKey: 'nonCurrentAssets',
                    isLabel: 'Laba Kotor/Gross Margin',
                    isKey: 'grossMargin'
                  },
                  {
                    bsLabel: 'Total Aset/Total Asset',
                    bsKey: 'totalAssets',
                    isLabel: 'Laba Usaha/Operating Margin',
                    isKey: 'operatingMargin'
                  },
                  {
                    bsLabel: 'Total Liabilitas Jk Pendek/Current Liabilities',
                    bsKey: 'currentLiabilities',
                    isLabel: 'Pajak/Tax',
                    isKey: 'tax'
                  },
                  {
                    bsLabel: 'Total Liabilitas Jk Panjang/Non Current Liab',
                    bsKey: 'longTermLiabilities',
                    isLabel: 'Laba Bersih/Net Income',
                    isKey: 'netIncome'
                  },
                  {
                    bsLabel: 'Total Liabilitas/ Total Liabilities',
                    bsKey: 'totalLiabilities',
                    isLabel: '',
                    isKey: ''
                  },
                  {
                    bsLabel: 'Ekuitas/Equity',
                    bsKey: 'equity',
                    isLabel: '',
                    isKey: ''
                  },
                  {
                    bsLabel: 'Total Liabilitas & Ekuitas/Total Liab & Equity',
                    bsKey: 'totalLiabilitiesAndEquity',
                    isLabel: '',
                    isKey: ''
                  },
                ].map((row, idx) => (
                  <tr key={idx} style={{ height: '20px' }}>
                    {/* Balance Sheet Row */}
                    <td colSpan={4} style={{ border: '1px solid #000000', padding: '2px 4px', fontWeight: row.bsLabel.includes('Total') ? 'bold' : 'normal' }}>
                      {row.bsLabel}
                    </td>
                    <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>
                      {formatNumber((fsList[0] as any)?.[row.bsKey])}
                    </td>
                    <td style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>
                      {formatNumber((fsList[1] as any)?.[row.bsKey])}
                    </td>
                    <td colSpan={2} style={{ border: '1px solid #000000', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>
                      {formatNumber((fsList[2] as any)?.[row.bsKey])}
                    </td>

                    {/* Spacer Col I */}
                    <td style={{ padding: 0 }} />

                    {/* Income Statement Row */}
                    <td colSpan={6} style={{ border: row.isLabel ? '1px solid #000000' : 'none', padding: '2px 4px', fontWeight: row.isLabel.includes('Laba Bersih') || row.isLabel.includes('Pendapatan') ? 'bold' : 'normal' }}>
                      {row.isLabel}
                    </td>
                    <td style={{ border: row.isLabel ? '1px solid #000000' : 'none', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>
                      {row.isKey ? formatNumber((fsList[0] as any)?.[row.isKey]) : ''}
                    </td>
                    <td style={{ border: row.isLabel ? '1px solid #000000' : 'none', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>
                      {row.isKey ? formatNumber((fsList[1] as any)?.[row.isKey]) : ''}
                    </td>
                    <td colSpan={2} style={{ border: row.isLabel ? '1px solid #000000' : 'none', textAlign: 'right', padding: '2px 4px', color: '#002060' }}>
                      {row.isKey ? formatNumber((fsList[2] as any)?.[row.isKey]) : ''}
                    </td>
                  </tr>
                ))}

                {/* ORANGE DIVIDER */}
                <tr style={{ height: '6px' }}>
                  <td colSpan={20} style={{ padding: 0, height: '2px', borderBottom: '2px solid #ed7d31' }} />
                </tr>

                {/* ==============================================================
                    ROW 102 - 121: SECTION 8 - DECLARATION & SIGNATURES
                    ============================================================== */}
                <tr id="fap-preview-sec-decl" style={{ height: '20px' }}>
                  <td colSpan={20} style={{ padding: '4px 2px 2px 2px', fontWeight: 'bold', fontSize: '8.5px', color: '#000000' }}>
                    Dengan ini kami menyatakan dan menyetujui hal-hal sebagai berikut :
                  </td>
                </tr>

                {/* Point 1 */}
                <tr style={{ height: 'auto' }}>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', fontSize: '8px', padding: '2px 4px 2px 0', color: '#000000' }}>
                    1
                  </td>
                  <td colSpan={19} style={{ padding: '2px 2px', fontSize: '7.8px', lineHeight: 1.25, color: '#000000' }}>
                    <strong>PT LiuGong Finance Indonesia</strong> telah memberikan penjelasan mengenai karakteristik pembiayaan, risiko-risiko dan biaya-biaya yang melekat pada produk kepada Kami dan Kami telah memahami sepenuhnya produk tersebut/ <em><strong>PT LiuGong Finance Indonesia</strong> has duly provided an explanation regarding the characteristics of the financing, including the inherent risks and associated costs of the product, and we hereby declare that we fully understand the product</em>
                  </td>
                </tr>

                {/* Point 2 */}
                <tr style={{ height: 'auto' }}>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', fontSize: '8px', padding: '2px 4px 2px 0', color: '#000000' }}>
                    2
                  </td>
                  <td colSpan={19} style={{ padding: '2px 2px', fontSize: '7.8px', lineHeight: 1.25, color: '#000000' }}>
                    <div>
                      Menyatakan semua Informasi dan/atau dokumen milik kami, berikut informasi dan/atau dokumen berkaitan dengan penerima manfaat, yang telah diberikan adalah lengkap dan yang sebenar-benarnya, serta memberikan persetujuan kepada <strong>PT LiuGong Finance Indonesia</strong> dan/atau Pihak ketiga yang bekerja sama dengan <strong>PT LiuGong Finance Indonesia</strong> untuk menganalisa, memproses, menverifikasi, serta mengirimkan data dan/atau informasi tersebut sehubungan dengan pengajuan pembiayaan ini/ <em>We hereby declare that all information and/or documents provided by us, including those related to the beneficial owner, are complete and true to the best of our knowledge. We further provide our consent to <strong>PT LiuGong Finance Indonesia</strong> and/or any third party cooperating with <strong>PT LiuGong Finance Indonesia</strong> to analyze, process, verify, and transmit such data and/or information in connection with this financing application</em>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <em>We also give our consent to PT LiuGong Finance Indonesia and/or any third party in cooperation with PT LiuGong Finance Indonesia to analyze, process, verify, and transmit such data and/or information in connection with this financing application.</em>
                    </div>
                  </td>
                </tr>

                {/* Point 3 */}
                <tr style={{ height: 'auto' }}>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', fontSize: '8px', padding: '2px 4px 2px 0', color: '#000000' }}>
                    3
                  </td>
                  <td colSpan={19} style={{ padding: '2px 2px', fontSize: '7.8px', lineHeight: 1.25, color: '#000000' }}>
                    Dalam proses persetujuan pengajuan Pembiayaan, <strong>PT LiuGong Finance Indonesia</strong> berhak untuk meminta informasi dan dokumen tambahan diluar dari dokumen persyaratan pembiayaan yang di syaratkan/ <em>in the course of the financing application approval process, <strong>PT LiuGong Finance Indonesia</strong> shall entitled to request additional information and documents beyond the standard financing documentation requirements.</em>
                  </td>
                </tr>

                {/* Point 4 */}
                <tr style={{ height: 'auto' }}>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', fontSize: '8px', padding: '2px 4px 2px 0', color: '#000000' }}>
                    4
                  </td>
                  <td colSpan={19} style={{ padding: '2px 2px', fontSize: '7.8px', lineHeight: 1.25, color: '#000000' }}>
                    <strong>PT LiuGong Finance Indonesia</strong> berhak untuk menerima/ menolak permohonan ini berdasarkan kebijakan internal yang berlaku/<em><strong>PT LiuGong Finance Indonesia</strong> shall entitled to approve or reject this application at its sole discretion in accordance with its prevailing internal policies</em>
                  </td>
                </tr>

                {/* Spacer before signature boxes */}
                <tr style={{ height: '8px' }}>
                  <td colSpan={20} style={{ padding: 0 }} />
                </tr>

                {/* ==============================================================
                    SIGNATURE BOXES: DEBTOR & LFI MARKETING (1:1 EXCEL REPLICA)
                    ============================================================== */}
                {/* 1. Top Header Row */}
                <tr style={{ height: '26px' }}>
                  <td style={{ padding: 0 }} />
                  {/* Left Header */}
                  <td
                    colSpan={7}
                    style={{
                      borderTop: '1.5px solid #000000',
                      borderLeft: '1.5px solid #000000',
                      borderRight: '1.5px solid #000000',
                      borderBottom: '1.5px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontWeight: 'bold',
                      fontSize: '8.5px',
                      background: '#ffffff',
                      color: '#000000',
                      padding: '3px 4px'
                    }}
                  >
                    Di tanda tangani debitur / signed by debtor
                  </td>

                  {/* Center Gap */}
                  <td colSpan={5} style={{ padding: 0 }} />

                  {/* Right Header */}
                  <td
                    colSpan={7}
                    style={{
                      borderTop: '1.5px solid #000000',
                      borderLeft: '1.5px solid #000000',
                      borderRight: '1.5px solid #000000',
                      borderBottom: '1.5px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontWeight: 'bold',
                      fontSize: '8.5px',
                      background: '#ffffff',
                      color: '#000000',
                      padding: '3px 4px'
                    }}
                  >
                    Diverifikasi oleh pihak LFI/ verified by LFI
                  </td>
                </tr>

                {/* 2. Middle Body Row (Signature stamp area + brackets) */}
                <tr style={{ height: '125px' }}>
                  <td style={{ padding: 0 }} />
                  {/* Left Body */}
                  <td
                    colSpan={7}
                    style={{
                      borderLeft: '1.5px solid #000000',
                      borderRight: '1.5px solid #000000',
                      borderBottom: '1.5px solid #000000',
                      background: '#ffffff',
                      verticalAlign: 'top',
                      padding: '0'
                    }}
                  >
                    <div style={{ height: '100%', minHeight: '125px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 10px 4px 10px', boxSizing: 'border-box' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontStyle: 'italic', color: '#a1a1aa', fontSize: '8.5px' }}>
                          [sign &amp; company stamp]
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', color: '#000000', padding: '0 4px' }}>
                        <span>[</span>
                        <span>]</span>
                      </div>
                    </div>
                  </td>

                  {/* Center Gap */}
                  <td colSpan={5} style={{ padding: 0 }} />

                  {/* Right Body */}
                  <td
                    colSpan={7}
                    style={{
                      borderLeft: '1.5px solid #000000',
                      borderRight: '1.5px solid #000000',
                      borderBottom: '1.5px solid #000000',
                      background: '#ffffff',
                      verticalAlign: 'top',
                      padding: '0'
                    }}
                  >
                    <div style={{ height: '100%', minHeight: '125px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 10px 4px 10px', boxSizing: 'border-box' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontStyle: 'italic', color: '#a1a1aa', fontSize: '8.5px' }}>
                          [sign]
                        </span>
                      </div>
                      <div style={{ padding: '0 4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000', textAlign: 'left' }}>
                          <span>[</span>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '8.5px', color: '#000000', marginTop: '-4px' }}>
                          Marketing
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 3. Bottom PT Entity Name Row */}
                <tr style={{ height: '26px' }}>
                  <td style={{ padding: 0 }} />
                  {/* Left Footer: PT. [Company Name] */}
                  <td
                    colSpan={7}
                    style={{
                      borderLeft: '1.5px solid #000000',
                      borderRight: '1.5px solid #000000',
                      borderBottom: '1.5px solid #000000',
                      verticalAlign: 'middle',
                      padding: '3px 10px',
                      fontSize: '8.5px',
                      fontWeight: 'bold',
                      color: '#000000',
                      background: '#ffffff'
                    }}
                  >
                    PT. {d.companyName ? d.companyName.replace(/^PT\.?\s*/i, '') : ''}
                  </td>

                  {/* Center Gap */}
                  <td colSpan={5} style={{ padding: 0 }} />

                  {/* Right Footer: PT. LIUGONG FINANCE INDONESIA */}
                  <td
                    colSpan={7}
                    style={{
                      borderLeft: '1.5px solid #000000',
                      borderRight: '1.5px solid #000000',
                      borderBottom: '1.5px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      padding: '3px 6px',
                      fontSize: '8.5px',
                      fontWeight: 'bold',
                      color: '#000000',
                      background: '#ffffff'
                    }}
                  >
                    PT. LIUGONG FINANCE INDONESIA
                  </td>
                </tr>

                {/* 4. Version Tag Footer */}
                <tr style={{ height: '18px' }}>
                  <td colSpan={13} style={{ padding: 0 }} />
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'right',
                      verticalAlign: 'bottom',
                      fontSize: '8.5px',
                      fontWeight: 'bold',
                      fontStyle: 'italic',
                      color: '#000000',
                      padding: '3px 0 0 0'
                    }}
                  >
                    ver 01/2025
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
