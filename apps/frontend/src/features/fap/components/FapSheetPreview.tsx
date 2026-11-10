import {useState, useEffect, useRef, useMemo} from 'react';
import {FileSpreadsheet, ZoomIn, ZoomOut, RotateCcw, Printer, ChevronLeft, ChevronRight} from 'lucide-react';
import {FAP_EXCEL_HTML_TEMPLATE} from '../lib/fap-html-template';
import {useMasterData} from '@/shared/master-data';
import {formatStakeholderPosition} from '@liugong/shared';

import type {FapSheetPreviewProps} from '@/features/fap/lib/types';
import {FIELD_TO_CELL_ID_MAP, resolveFieldToCellId} from '@/features/fap/lib/field-cells';
import {
  SECTION_TO_CELL_IDS_MAP,
  SECTION_TO_SCROLL_TARGET_MAP,
  SECTION_TO_CELL_ID_MAP,
  CELL_ID_TO_SECTION_MAP,
} from '@/features/fap/lib/section-cells';

const isNoneVal = (val: any) => {
  if (val === undefined || val === null) return true;
  const s = String(val).trim().toUpperCase();
  return !s || s === 'NONE' || s === 'N/A' || s === '-' || s === '—';
};

export function FapSheetPreview(props: FapSheetPreviewProps) {
  const master = useMasterData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.15);

  const scrollChips = (dir: 'left' | 'right') => {
    if (chipsScrollRef.current) {
      const offset = dir === 'left' ? -180 : 180;
      chipsScrollRef.current.scrollBy({left: offset, behavior: 'smooth'});
    }
  };

  useEffect(() => {
    if (props.activeSection && chipsScrollRef.current) {
      const activeEl = chipsScrollRef.current.querySelector<HTMLElement>('.excel-chip-btn.active');
      if (activeEl) {
        activeEl.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
      }
    }
  }, [props.activeSection]);

  // Compute normalized values from props
  const d = useMemo(() => {
    const raw = props.data || {};
    const app = props.application || {};
    const cust = props.customer || app.customer || {};
    const prof = props.profile || app.profile || {};
    const p = props.pic || app.pic || raw.pic || {};
    const sh = props.stakeholders || app.stakeholders || raw.stakeholders || [];
    const proj = props.projects || (raw as any).projects || (app as any).projects || [];

    const isOcrSide = props.diffSide === 'ocr';

    const pick = (vA: any, vB: any, vC?: any, fallback = '') => {
      if (isOcrSide) {
        if (vA !== undefined && vA !== null) return vA;
        return fallback;
      }
      if (vA !== undefined && vA !== null && vA !== '') return vA;
      if (vB !== undefined && vB !== null && vB !== '') return vB;
      if (vC !== undefined && vC !== null && vC !== '') return vC;
      return fallback;
    };

    const resolveLoc = (grp: 'province' | 'city' | 'district' | 'village', val: any) => {
      if (!val) return '';
      const str = String(val).trim();
      const items = (master as any)?.[grp] || [];
      const found = items.find((x: any) => x.value === str || x.name.toLowerCase() === str.toLowerCase());
      if (found) return found.name;
      if (/^[0-9a-f-]{32,36}$/i.test(str)) return '';
      return str;
    };

    const formatDate = (val: any) => {
      if (!val) return '';
      try {
        const dt = new Date(val);
        if (isNaN(dt.getTime())) return String(val).slice(0, 10);
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return String(val).slice(0, 10);
      }
    };

    return {
      fapNumber: isOcrSide ? raw.fapNumber || '' : pick(raw.fapNumber, app.fapNumber, '0006/AF/03/2026'),
      applicationDate: isOcrSide
        ? raw.applicationDate
          ? formatDate(raw.applicationDate)
          : ''
        : formatDate(pick(raw.applicationDate, app.applicationDate, new Date().toISOString())),
      branchCode: isOcrSide ? raw.branchCode || '' : pick(raw.branchCode, app.branchCode, 'JKT01'),
      customerStatus: isOcrSide
        ? (raw.customerStatus || '').toUpperCase()
        : pick(raw.customerStatus, app.customerStatus, 'EXISTING').toUpperCase(),
      companyType: pick(raw.companyType, cust.companyType, '').toUpperCase(),
      companyName: pick(raw.companyName, cust.companyName, ''),
      companyAddress: pick(raw.companyAddress, prof.companyAddress, ''),
      city: resolveLoc('city', pick(raw.city, prof.city, '')),
      province: resolveLoc('province', pick(raw.province, prof.province, '')),
      postalCode: pick(raw.postalCode, prof.postalCode, ''),
      mainBusiness: pick(raw.mainBusiness, prof.mainBusiness, ''),
      establishmentActNo: pick(raw.establishmentActNo, cust.establishmentActNo, ''),
      establishmentDate: formatDate(pick(raw.establishmentDate, cust.establishmentDate, '')),
      experienceYears: (() => {
        if (isOcrSide) {
          return raw.experienceYears != null ? raw.experienceYears : '';
        }
        const val = pick(raw.experienceYears, prof.experienceYears, '');
        if (val !== '' && val != null) return val;
        const eDate = pick(raw.establishmentDate, cust.establishmentDate, '');
        if (!eDate) return '';
        const parts = String(eDate).slice(0, 10).split('-').map(Number);
        if (parts.length === 3 && parts[0] > 1900) {
          const dob = new Date(parts[0], parts[1] - 1, parts[2]);
          const today = new Date();
          let y = today.getFullYear() - dob.getFullYear();
          let m = today.getMonth() - dob.getMonth();
          if (today.getDate() < dob.getDate()) m--;
          if (m < 0) {
            y--;
            m += 12;
          }
          return Math.max(0, y);
        }
        return '';
      })(),
      experienceMonths: (() => {
        if (isOcrSide) {
          return raw.experienceMonths != null ? raw.experienceMonths : '';
        }
        const val = pick(raw.experienceMonths, prof.experienceMonths, '');
        if (val !== '' && val != null) return val;
        const eDate = pick(raw.establishmentDate, cust.establishmentDate, '');
        if (!eDate) return '';
        const parts = String(eDate).slice(0, 10).split('-').map(Number);
        if (parts.length === 3 && parts[0] > 1900) {
          const dob = new Date(parts[0], parts[1] - 1, parts[2]);
          const today = new Date();
          let y = today.getFullYear() - dob.getFullYear();
          let m = today.getMonth() - dob.getMonth();
          if (today.getDate() < dob.getDate()) m--;
          if (m < 0) {
            y--;
            m += 12;
          }
          return Math.max(0, m);
        }
        return '';
      })(),
      latestDeedNo: pick(raw.latestDeedNo, prof.latestDeedNo, ''),
      latestDeedDate: formatDate(pick(raw.latestDeedDate, prof.latestDeedDate, '')),
      nib: pick(raw.nib, cust.nib, ''),
      npwp: pick(raw.npwp, cust.npwp, ''),
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
      picCity: resolveLoc('city', pick(raw.picCity, p.city, '')),
      picProvince: resolveLoc('province', pick(raw.picProvince, p.province, '')),
      picPostalCode: pick(raw.picPostalCode, p.postalCode, ''),
      stakeholders: isOcrSide ? raw.stakeholders || [] : sh,
      projects: isOcrSide ? (raw as any).projects || [] : proj,

      // Sections 05 - 09 data derivation
      financingPurposeDetail: pick(raw.financingPurposeDetail, app.financingPurposeDetail, ''),
      facilityPurpose: pick(raw.facilityPurpose, (raw.proposal || app.proposal)?.facilityPurpose || app.facilityPurpose, 'INVESTMENT'),
      assetSummaryHeLiuGong: raw.assetSummaryHeLiuGong !== undefined ? raw.assetSummaryHeLiuGong : app.assetSummaryHeLiuGong,
      assetSummaryTruckLiuGong: raw.assetSummaryTruckLiuGong !== undefined ? raw.assetSummaryTruckLiuGong : app.assetSummaryTruckLiuGong,
      assetSummaryHeNonLiuGong: raw.assetSummaryHeNonLiuGong !== undefined ? raw.assetSummaryHeNonLiuGong : app.assetSummaryHeNonLiuGong,
      assetSummaryTruckNonLiuGong: raw.assetSummaryTruckNonLiuGong !== undefined ? raw.assetSummaryTruckNonLiuGong : app.assetSummaryTruckNonLiuGong,
      industrySegment: pick(raw.industrySegment, app.industrySegment, ''),
      businessRole: pick(raw.businessRole, app.businessRole, ''),
      bankReferences: isOcrSide ? raw.bankReferences || [] : (raw.bankReferences || app.bankReferences || []),
      referenceComments: pick(raw.referenceComments, app.referenceComments, ''),
      financingProposal: raw.financingProposal || raw.proposal || app.financingProposal || app.proposal || {},
      financialAudited: raw.financialAudited !== undefined ? raw.financialAudited : app.financialAudited,
      financialStatements: isOcrSide ? raw.financialStatements || [] : (raw.financialStatements || app.financialStatements || []),
      documentRequirements: raw.documentRequirements || raw.financingProposal?.documentRequirements || app.financingProposal?.documentRequirements || (raw.proposal || app.proposal)?.documentRequirements || {},
    };
  }, [
    props.data,
    props.application,
    props.customer,
    props.profile,
    props.pic,
    props.stakeholders,
    props.projects,
    master,
  ]);

  // Push values into iframe DOM
  const syncIframeValues = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    // Apply zoom
    if (doc.body) {
      doc.body.style.zoom = String(zoomLevel);
      doc.body.style.background = '#ffffff';
    }

    if (iframe.contentWindow) {
      iframe.contentWindow.onbeforeprint = () => {
        if (doc.body) doc.body.style.zoom = '0.175';
      };
      iframe.contentWindow.onafterprint = () => {
        if (doc.body) doc.body.style.zoom = String(zoomLevel);
      };
    }

    const setText = (id: string, text: any) => {
      const el = doc.getElementById(id);
      if (el) {
        el.textContent =
          text !== undefined && text !== null && String(text).trim() !== '' ? String(text) : '';
      }
    };

    const formatFapDate = (dateStr?: string) => {
      if (!dateStr) return '';
      const m = String(dateStr)
        .trim()
        .match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (m) return `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[1]}`;
      return String(dateStr).trim();
    };

    // SECTION 01: Application / Header
    setText('fap-cell-fapNumber', d.fapNumber);
    setText('fap-cell-applicationDate', formatFapDate(d.applicationDate));
    setText('fap-cell-branchCode', d.branchCode);

    const custStatusUpper = String(d.customerStatus || '').toUpperCase();
    if (props.diffSide === 'ocr' && !custStatusUpper) {
      setText('fap-cell-custNew', '');
      setText('fap-cell-custExisting', '');
    } else {
      const isNew = custStatusUpper.includes('NEW') || custStatusUpper.includes('BARU');
      const isExisting = custStatusUpper.includes('EXISTING') || custStatusUpper.includes('LAMA');
      setText('fap-cell-custNew', isNew ? '✓' : '');
      setText('fap-cell-custExisting', isExisting ? '✓' : '');
    }

    const compTypeUpper = String(d.companyType || '').toUpperCase();
    const isCorp =
      compTypeUpper.includes('CORPORATE') ||
      compTypeUpper.includes('PT') ||
      compTypeUpper.includes('PERSEROAN');
    const isComm =
      compTypeUpper.includes('COMMERCIAL') || compTypeUpper.includes('CV') || compTypeUpper.includes('FIRMA');
    const isMicro = compTypeUpper.includes('MICRO') || compTypeUpper.includes('MIKRO');
    const isLiuGongUser =
      compTypeUpper.includes('LIUGONG') || compTypeUpper.includes('USER') || compTypeUpper.includes('USED');

    setText('fap-cell-corporate', isCorp ? '✓' : '');
    setText('fap-cell-commercial', isComm ? '✓' : '');
    setText('fap-cell-micro', isMicro ? '✓' : '');
    setText('fap-cell-liugongUser', isLiuGongUser ? '✓' : '');

    // SECTION 02 & 03: Company Details, Domicile, Business & Legality
    setText('fap-cell-companyName', d.companyName);
    setText('fap-cell-companyAddress', d.companyAddress);
    setText('fap-cell-city', d.city);
    setText('fap-cell-province', d.province);
    setText('fap-cell-postalCode', d.postalCode);
    setText('fap-cell-mainBusiness', d.mainBusiness);
    setText('fap-cell-establishmentActNo', d.establishmentActNo);
    setText('fap-cell-establishmentDate', d.establishmentDate);
    setText('fap-cell-experienceYears', d.experienceYears);
    setText('fap-cell-experienceMonths', d.experienceMonths);
    setText('fap-cell-latestDeedNo', d.latestDeedNo);
    setText('fap-cell-latestDeedDate', d.latestDeedDate);
    setText('fap-cell-nib', d.nib);
    setText('fap-cell-npwp', d.npwp);
    setText('fap-cell-phoneFax', d.phoneFax);
    setText('fap-cell-website', d.website);
    setText('fap-cell-email', d.email);
    setText('fap-cell-repaymentSource', d.repaymentSource);

    const locStatus = String(d.locationStatus || '').toUpperCase().trim();
    const displayLocationStatus =
      locStatus === 'OWNED'
        ? 'Owned'
        : locStatus === 'RENTED'
          ? 'Rented'
          : locStatus === 'OTHERS' || locStatus === 'OTHER'
            ? 'Others'
            : isNoneVal(locStatus)
              ? ''
              : d.locationStatus || '';
    setText('fap-cell-locationStatus', displayLocationStatus);

    // SECTION 04: PIC
    setText('fap-cell-picName', d.picName);
    setText('fap-cell-position', d.position);
    setText('fap-cell-phone', d.phone);
    setText('fap-cell-picEmail', d.picEmail);
    setText('fap-cell-currentAddress', d.currentAddress);
    setText('fap-cell-picCity', d.picCity);
    setText('fap-cell-picProvince', d.picProvince);
    setText('fap-cell-picPostalCode', d.picPostalCode);

    // SECTION 05: Tujuan Pembiayaan / Financing Purpose & List Fixed Assets
    const rawPurpose = d.financingPurposeDetail;
    const purposeList = Array.isArray(rawPurpose)
      ? rawPurpose.map((s: any) => String(s).toUpperCase())
      : String(rawPurpose || '')
          .split(',')
          .map((s: string) => s.trim().toUpperCase());
    const facilityPurp = String(d.facilityPurpose || '').toUpperCase();
    const isBiz = purposeList.some(
      (p: string) => p.includes('BUSINESS') || p.includes('USAHA') || p.includes('AKTIVITAS'),
    );
    const isRehab = purposeList.some((p: string) => p.includes('REHAB'));
    const isExp = purposeList.some(
      (p: string) => p.includes('EXPANSION') || p.includes('MODERNISASI') || p.includes('EKSPANSI'),
    );
    const isReloc = purposeList.some((p: string) => p.includes('RELOCATION') || p.includes('RELOKASI'));
    const isWorkCap =
      purposeList.some(
        (p: string) =>
          p.includes('WORKING') ||
          p.includes('MODAL_KERJA') ||
          p.includes('MODAL KERJA') ||
          p.includes('SIKLUS'),
      ) || facilityPurp === 'WORKING_CAPITAL';

    setText('fap-cell-purpose-business', isBiz ? '✓' : '');
    setText('fap-cell-purpose-rehab', isRehab ? '✓' : '');
    setText('fap-cell-purpose-expansion', isExp ? '✓' : '');
    setText('fap-cell-purpose-relocation', isReloc ? '✓' : '');
    setText('fap-cell-purpose-working-cap', isWorkCap ? '✓' : '');

    // List Fixed Assets Summary Table
    const lgHe = Number((d as any).assetSummaryHeLiuGong) || 0;
    const lgTruck = Number((d as any).assetSummaryTruckLiuGong) || 0;
    const nlgHe = Number((d as any).assetSummaryHeNonLiuGong) || 0;
    const nlgTruck = Number((d as any).assetSummaryTruckNonLiuGong) || 0;

    const lgUnit = lgHe + lgTruck;
    const nlgUnit = nlgHe + nlgTruck;
    const totHe = lgHe + nlgHe;
    const totTruck = lgTruck + nlgTruck;
    const totUnit = lgUnit + nlgUnit;

    const lgPct = totUnit > 0 ? ((lgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';
    const nlgPct = totUnit > 0 ? ((nlgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';
    const totPct = totUnit > 0 ? '100.0%' : '0.0%';

    const hasAnyAssets = Boolean(
      (d as any).assetSummaryHeLiuGong !== undefined ||
        (d as any).assetSummaryTruckLiuGong !== undefined ||
        (d as any).assetSummaryHeNonLiuGong !== undefined ||
        (d as any).assetSummaryTruckNonLiuGong !== undefined ||
        totUnit > 0,
    );

    if (hasAnyAssets && !(props.diffSide === 'ocr' && totUnit === 0)) {
      setText('fap-cell-asset-lg-he', lgHe > 0 || (d as any).assetSummaryHeLiuGong !== undefined ? String(lgHe) : '');
      setText('fap-cell-asset-lg-truck', lgTruck > 0 || (d as any).assetSummaryTruckLiuGong !== undefined ? String(lgTruck) : '');
      setText('fap-cell-asset-lg-unit', totUnit > 0 ? String(lgUnit) : '');
      setText('fap-cell-asset-lg-pct', totUnit > 0 ? lgPct : '');
      setText('fap-cell-asset-nlg-he', nlgHe > 0 || (d as any).assetSummaryHeNonLiuGong !== undefined ? String(nlgHe) : '');
      setText('fap-cell-asset-nlg-truck', nlgTruck > 0 || (d as any).assetSummaryTruckNonLiuGong !== undefined ? String(nlgTruck) : '');
      setText('fap-cell-asset-nlg-unit', totUnit > 0 ? String(nlgUnit) : '');
      setText('fap-cell-asset-nlg-pct', totUnit > 0 ? nlgPct : '');
      setText('fap-cell-asset-tot-he', totUnit > 0 ? String(totHe) : '');
      setText('fap-cell-asset-tot-truck', totUnit > 0 ? String(totTruck) : '');
      setText('fap-cell-asset-tot-unit', totUnit > 0 ? String(totUnit) : '');
      setText('fap-cell-asset-tot-pct', totUnit > 0 ? totPct : '');
    } else {
      setText('fap-cell-asset-lg-he', '');
      setText('fap-cell-asset-lg-truck', '');
      setText('fap-cell-asset-lg-unit', '');
      setText('fap-cell-asset-lg-pct', '');
      setText('fap-cell-asset-nlg-he', '');
      setText('fap-cell-asset-nlg-truck', '');
      setText('fap-cell-asset-nlg-unit', '');
      setText('fap-cell-asset-nlg-pct', '');
      setText('fap-cell-asset-tot-he', '');
      setText('fap-cell-asset-tot-truck', '');
      setText('fap-cell-asset-tot-unit', '');
      setText('fap-cell-asset-tot-pct', '');
    }

    // SECTION 06: Industry Segmentation, Role & Projects
    const segUpper = String(d.industrySegment || '').toUpperCase().trim();
    setText(
      'fap-cell-seg-mining',
      !segUpper ? '' : segUpper === 'MINING' || segUpper.includes('TAMBANG') ? '✓' : '',
    );
    setText(
      'fap-cell-seg-agriculture',
      !segUpper ? '' : segUpper === 'AGRICULTURE' || segUpper.includes('TANI') || segUpper.includes('AGRI') ? '✓' : '',
    );
    setText(
      'fap-cell-seg-forestry',
      !segUpper ? '' : segUpper === 'FORESTRY' || segUpper.includes('HUTAN') ? '✓' : '',
    );
    setText(
      'fap-cell-seg-construction',
      !segUpper ? '' : segUpper === 'CONSTRUCTION' || segUpper.includes('KONSTRUKSI') ? '✓' : '',
    );
    setText(
      'fap-cell-seg-oilgas',
      !segUpper ? '' : segUpper === 'OIL_AND_GAS' || segUpper.includes('OIL') || segUpper.includes('GAS') ? '✓' : '',
    );
    setText(
      'fap-cell-seg-other',
      !segUpper ? '' : segUpper === 'OTHER' || segUpper.includes('LAIN') ? '✓' : '',
    );

    const roleUpper = String(d.businessRole || '').toUpperCase().trim();
    setText(
      'fap-cell-role-consowner',
      !roleUpper ? '' : roleUpper === 'CONS_OWNER' || roleUpper.includes('CONS') || roleUpper.includes('OWNER') ? '✓' : '',
    );
    setText(
      'fap-cell-role-contractors',
      !roleUpper ? '' : roleUpper === 'CONTRACTORS' || roleUpper === 'CONTRACTOR' || roleUpper.includes('KONTRAKTOR') ? '✓' : '',
    );
    setText(
      'fap-cell-role-subcont',
      !roleUpper ? '' : roleUpper === 'SUB_CONT' || roleUpper === 'SUB CONT' || roleUpper.startsWith('SUB') ? '✓' : '',
    );
    setText(
      'fap-cell-role-rental',
      !roleUpper ? '' : roleUpper === 'RENTAL' || roleUpper.includes('SEWA') ? '✓' : '',
    );
    setText(
      'fap-cell-role-other',
      !roleUpper ? '' : roleUpper === 'OTHER' || roleUpper.includes('LAIN') ? '✓' : '',
    );

    // Projects (Pemilik Proyek / Project Owner table)
    const projList = d.projects || [];
    for (let i = 0; i < 7; i++) {
      const item = projList[i] || {};
      setText(`fap-cell-proj-${i}-owner`, item.projectOwner || '');
      setText(`fap-cell-proj-${i}-loc`, item.projectLocation || item.location || '');
      const rawRole = (item.projectRole || item.roleInProject || '').trim();
      const displayRole = !isNoneVal(rawRole) ? rawRole : '';
      setText(`fap-cell-proj-${i}-role`, displayRole);
      const rawStatus = (item.contractStatus || item.status || '').trim();
      const displayStatus = !isNoneVal(rawStatus)
        ? rawStatus.toUpperCase() === 'EXISTING'
          ? 'Existing'
          : rawStatus.toUpperCase() === 'NEW'
            ? 'New'
            : rawStatus
        : '';
      setText(`fap-cell-proj-${i}-status`, displayStatus);
    }

    // Shareholders up to 8
    const shList = d.stakeholders || [];
    for (let i = 0; i < 8; i++) {
      const item = shList[i] || {};
      const shName = item.name || [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ');
      const shareVal = item.depositedCapital || item.primaryCapital || item.shareAmount || item.shares || item.amount;
      const pctVal =
        item.sharePercentage !== undefined && item.sharePercentage !== null && item.sharePercentage !== ''
          ? item.sharePercentage
          : item.sharePercent || item.percent || item.percentage;
      setText(`fap-cell-sh-${i}-name`, shName || '');
      setText(`fap-cell-sh-${i}-pos`, formatStakeholderPosition(item.positions || item.position));
      setText(
        `fap-cell-sh-${i}-shares`,
        shareVal !== undefined && shareVal !== null && shareVal !== ''
          ? Number(shareVal).toLocaleString('id-ID')
          : '',
      );
      setText(
        `fap-cell-sh-${i}-pct`,
        pctVal !== undefined && pctVal !== null && pctVal !== '' ? `${pctVal}%` : '',
      );
    }

    // SECTION 07: References (Bank Facilities / Fasilitas Bank table) up to 5 rows
    const refList = d.bankReferences || [];
    let totalMonthlyInstallment = 0;
    for (let i = 0; i < 5; i++) {
      const item = refList[i];
      if (item) {
        setText(`fap-cell-ref-${i}-no`, String(i + 1));
        setText(`fap-cell-ref-${i}-bank`, item.bankOrFinInstitution || '');
        setText(`fap-cell-ref-${i}-currency`, item.currency || 'IDR');
        setText(
          `fap-cell-ref-${i}-credit`,
          item.creditFacility ? Number(item.creditFacility).toLocaleString('id-ID') : '',
        );
        const instVal = Number(item.monthlyInstallment) || 0;
        totalMonthlyInstallment += instVal;
        setText(`fap-cell-ref-${i}-installment`, instVal ? instVal.toLocaleString('id-ID') : '');
        setText(`fap-cell-ref-${i}-year`, item.yearStarted ? String(item.yearStarted) : '');
        setText(
          `fap-cell-ref-${i}-rate`,
          item.interestRate !== undefined && item.interestRate !== '' ? `${item.interestRate}%` : '',
        );
        setText(`fap-cell-ref-${i}-record`, item.paymentRecord || '');
        const facStatus = (item.facilityStatus || item.status || '').trim();
        setText(`fap-cell-ref-${i}-status`, isNoneVal(facStatus) ? '' : facStatus);
      } else {
        setText(`fap-cell-ref-${i}-no`, '');
        setText(`fap-cell-ref-${i}-bank`, '');
        setText(`fap-cell-ref-${i}-currency`, '');
        setText(`fap-cell-ref-${i}-credit`, '');
        setText(`fap-cell-ref-${i}-installment`, '');
        setText(`fap-cell-ref-${i}-year`, '');
        setText(`fap-cell-ref-${i}-rate`, '');
        setText(`fap-cell-ref-${i}-record`, '');
        setText(`fap-cell-ref-${i}-status`, '');
      }
    }
    setText(
      'fap-cell-ref-total-installment',
      totalMonthlyInstallment > 0 ? totalMonthlyInstallment.toLocaleString('id-ID') : '',
    );
    setText('fap-cell-ref-comments', d.referenceComments || '');

    // SECTION 08: Financing Proposal & Terms and Conditions
    const prop = d.financingProposal || {};
    const facProp = prop.facilityProposed || {};
    const tcFl = prop.termsFinancialLease || {};
    const tcSlb = prop.termsSaleAndLeaseBack || {};
    const tcIf = prop.termsInstallmentFinancing || {};

    setText('fap-cell-prop-method', facProp.financingMethod);
    setText('fap-cell-prop-app-source', facProp.applicationSource);
    setText('fap-cell-prop-val', facProp.financingValue);

    // Currency selector with double strikethrough for unselected currency
    const currCell = doc.getElementById('fap-cell-prop-curr-choice');
    if (currCell) {
      const choice = String(facProp.currencyChoice || '').toUpperCase().trim();
      if (choice === 'USD') {
        currCell.innerHTML = `: (<span style="text-decoration:line-through;text-decoration-style:double;">IDR</span> / USD)`;
      } else if (choice === 'IDR') {
        currCell.innerHTML = `: (IDR / <span style="text-decoration:line-through;text-decoration-style:double;">USD</span>)`;
      } else {
        currCell.innerHTML = `: (IDR / USD)`;
      }
    }

    const setBoxText = (id: string, text: any, defaultLabel = '') => {
      const el = doc.getElementById(id);
      if (el) {
        const valStr = text !== undefined && text !== null ? String(text).trim() : '';
        if (valStr) {
          el.textContent = valStr;
          el.style.textAlign = 'center';
          el.style.fontWeight = 'bold';
          el.style.color = '#002060';
          if (valStr.length > 5) {
            el.style.fontSize = '14pt';
          } else {
            el.style.fontSize = '20pt';
          }
        } else {
          el.textContent = defaultLabel;
          el.style.textAlign = '';
          el.style.fontWeight = '';
          el.style.color = '';
        }
      }
    };

    setBoxText('fap-cell-tc-fl-purpose', tcFl.workingCapitalInvestment || tcFl.investment, 'Investment');
    setBoxText('fap-cell-tc-fl-curr', tcFl.currency);
    setBoxText('fap-cell-tc-fl-deposit', tcFl.securityDeposit);
    setBoxText('fap-cell-tc-fl-rate', tcFl.interestRate);
    setBoxText('fap-cell-tc-fl-tenor', tcFl.tenor);
    setBoxText('fap-cell-tc-fl-payment', tcFl.paymentMethod);

    setBoxText('fap-cell-tc-slb-purpose', tcSlb.workingCapitalInvestment);
    setBoxText('fap-cell-tc-slb-curr', tcSlb.currency);
    setBoxText('fap-cell-tc-slb-deposit', tcSlb.securityDeposit);
    setBoxText('fap-cell-tc-slb-rate', tcSlb.interestRate);
    setBoxText('fap-cell-tc-slb-tenor', tcSlb.tenor);
    setBoxText('fap-cell-tc-slb-payment', tcSlb.paymentMethod);

    setBoxText('fap-cell-tc-if-purpose', tcIf.workingCapitalInvestment);
    setBoxText('fap-cell-tc-if-curr', tcIf.currency);
    setBoxText('fap-cell-tc-if-dp', tcIf.downPayment);
    setBoxText('fap-cell-tc-if-rate', tcIf.interestRate);
    setBoxText('fap-cell-tc-if-tenor', tcIf.tenor);
    setBoxText('fap-cell-tc-if-payment', tcIf.paymentMethod);

    // Unit Realization Plan
    const rPlan = prop.realizationPlan || {};
    const rpLgHe = Number(rPlan.lgHe) || 0;
    const rpLgTruck = Number(rPlan.lgTruck) || 0;
    const rpLgUnit = rpLgHe + rpLgTruck;
    const rpNlgHe = Number(rPlan.nlgHe) || 0;
    const rpNlgTruck = Number(rPlan.nlgTruck) || 0;
    const rpNlgUnit = rpNlgHe + rpNlgTruck;
    const rpTotUnit = rpLgUnit + rpNlgUnit;

    setText('fap-cell-prop-asset-lg-he', rpLgHe ? String(rpLgHe) : '');
    setText('fap-cell-prop-asset-lg-truck', rpLgTruck ? String(rpLgTruck) : '');
    setText('fap-cell-prop-asset-lg-unit', rpLgUnit ? String(rpLgUnit) : '');
    setText('fap-cell-prop-asset-nlg-he', rpNlgHe ? String(rpNlgHe) : '');
    setText('fap-cell-prop-asset-nlg-truck', rpNlgTruck ? String(rpNlgTruck) : '');
    setText('fap-cell-prop-asset-nlg-unit', rpNlgUnit ? String(rpNlgUnit) : '');
    setText('fap-cell-prop-asset-tot-unit', rpTotUnit ? String(rpTotUnit) : '');

    // Notes
    const notesCell = doc.getElementById('fap-cell-prop-notes');
    if (notesCell) {
      notesCell.innerHTML = prop.notes || '';
    }

    // Document Requirements Checklist
    const docReq = prop.documentRequirements || (d as any).documentRequirements || {};
    const setDocBox = (id: string, isChecked: boolean) => {
      const el = doc.getElementById(id);
      if (el) {
        el.innerHTML = isChecked
          ? '<div style="text-align:center;font-weight:bold;font-size:48pt;color:#002060;line-height:1;font-family:-apple-system,BlinkMacSystemFont,\\"Segoe UI\\",Roboto,Arial,sans-serif;">✓</div>'
          : '';
      }
    };

    setDocBox('fap-cell-doc-company-profile', !!docReq.companyProfile);
    setDocBox('fap-cell-doc-legality', !!docReq.legality);
    setDocBox('fap-cell-doc-deed', !!docReq.deedEstablishment);
    setDocBox('fap-cell-doc-decree', !!docReq.decreeMinistryOfLaw);
    setDocBox('fap-cell-doc-copy-id', !!docReq.copyIdBodShareholder);
    setDocBox('fap-cell-doc-audited-financial', !!docReq.auditedFinancialStatements);
    setDocBox('fap-cell-doc-bank-statements', !!docReq.bankStatements);
    setDocBox('fap-cell-doc-bank-facility', !!docReq.bankFinancingFacility);
    setDocBox('fap-cell-doc-production-report', !!docReq.productionReport);
    setDocBox('fap-cell-doc-fixed-assets', !!docReq.listOfFixedAssets);
    setDocBox('fap-cell-doc-project-contracts', !!docReq.projectContracts);

    // SECTION 09: Financial Audited & Financial Statements
    const isAudited = Boolean(
      d.financialAudited ||
      (d.financialStatements && d.financialStatements.some((fs: any) => fs.isAudited))
    );
    const auditedCell = doc.getElementById('fap-cell-fin-audited');
    if (auditedCell) {
      if (isAudited) {
        auditedCell.textContent = '✓';
        auditedCell.style.textAlign = 'center';
        auditedCell.style.fontSize = '56pt';
        auditedCell.style.fontWeight = '900';
        auditedCell.style.lineHeight = '1';
        auditedCell.style.color = '#002060';
      } else {
        auditedCell.textContent = '';
      }
    }

    // Financial Statements (Balance Sheet & Income Statement) up to 3 fiscal years
    const finList = d.financialStatements || [];
    const fmtFinVal = (val: any) => {
      if (val === undefined || val === null || val === '') return '';
      const num = Number(val);
      if (isNaN(num) || num === 0) return '';
      return num.toLocaleString('id-ID');
    };

    for (let i = 0; i < 3; i++) {
      const item = finList[i];
      if (item) {
        const yr = item.fiscalYear ? String(item.fiscalYear) : '';
        setText(`fap-cell-fin-bs-yr-${i}`, yr || '20….');
        setText(`fap-cell-fin-is-yr-${i}`, yr || '20….');
        setText(`fap-cell-fin-cur-asset-${i}`, fmtFinVal(item.currentAssets));
        setText(`fap-cell-fin-noncur-asset-${i}`, fmtFinVal(item.nonCurrentAssets));
        setText(`fap-cell-fin-tot-asset-${i}`, fmtFinVal(item.totalAssets));
        setText(`fap-cell-fin-cur-liab-${i}`, fmtFinVal(item.currentLiabilities));
        setText(`fap-cell-fin-noncur-liab-${i}`, fmtFinVal(item.nonCurrentLiabilities));
        setText(`fap-cell-fin-tot-liab-${i}`, fmtFinVal(item.totalLiabilities));
        setText(`fap-cell-fin-equity-${i}`, fmtFinVal(item.equity));
        setText(`fap-cell-fin-tot-liab-equity-${i}`, fmtFinVal(item.totalLiabAndEquity));
        setText(`fap-cell-fin-revenue-${i}`, fmtFinVal(item.revenue));
        setText(`fap-cell-fin-gross-profit-${i}`, fmtFinVal(item.grossMargin ?? item.grossProfit));
        setText(`fap-cell-fin-op-profit-${i}`, fmtFinVal(item.operatingMargin ?? item.operatingProfit));
        setText(`fap-cell-fin-tax-${i}`, fmtFinVal(item.tax));
        setText(`fap-cell-fin-net-income-${i}`, fmtFinVal(item.netIncome));
      } else {
        setText(`fap-cell-fin-bs-yr-${i}`, '20….');
        setText(`fap-cell-fin-is-yr-${i}`, '20….');
        setText(`fap-cell-fin-cur-asset-${i}`, '');
        setText(`fap-cell-fin-noncur-asset-${i}`, '');
        setText(`fap-cell-fin-tot-asset-${i}`, '');
        setText(`fap-cell-fin-cur-liab-${i}`, '');
        setText(`fap-cell-fin-noncur-liab-${i}`, '');
        setText(`fap-cell-fin-tot-liab-${i}`, '');
        setText(`fap-cell-fin-equity-${i}`, '');
        setText(`fap-cell-fin-tot-liab-equity-${i}`, '');
        setText(`fap-cell-fin-revenue-${i}`, '');
        setText(`fap-cell-fin-gross-profit-${i}`, '');
        setText(`fap-cell-fin-op-profit-${i}`, '');
        setText(`fap-cell-fin-tax-${i}`, '');
        setText(`fap-cell-fin-net-income-${i}`, '');
      }
    }

    // Debtor signature company name
    const debtorComp = String(d.companyName || '').trim();
    let debtorDisplay = 'PT.';
    if (debtorComp) {
      debtorDisplay = /^PT[\.\s]/i.test(debtorComp) ? debtorComp.toUpperCase() : `PT. ${debtorComp.toUpperCase()}`;
    }
    setText('fap-cell-sign-debtor-company', debtorDisplay);

    // Attach click listeners to all data cells
    const cells = doc.querySelectorAll('[id^="fap-cell-"]');
    cells.forEach(cell => {
      (cell as HTMLElement).style.cursor = 'pointer';
      (cell as HTMLElement).title = 'Click to focus this field in form';
      (cell as HTMLElement).onclick = e => {
        e.stopPropagation();
        const id = (cell as HTMLElement).id;
        let matchedField = Object.entries(FIELD_TO_CELL_ID_MAP).find(([_, v]) => v === id)?.[0] || '';
        let matchedSection = CELL_ID_TO_SECTION_MAP[id] || '';
        let extraMeta: any = undefined;

        // Project contracts
        const projMatch = id.match(/^fap-cell-proj-(\d+)-(owner|loc|role|status)$/);
        if (projMatch) {
          const rowIndex = parseInt(projMatch[1], 10);
          const ftype = projMatch[2];
          matchedSection = 'fap-preview-sec-projects';
          extraMeta = {rowIndex, sectionContext: `projects-${rowIndex}`, repeater: 'projects'};
          if (ftype === 'owner') matchedField = 'projectOwner';
          else if (ftype === 'loc') matchedField = 'projectLocation';
          else if (ftype === 'role') matchedField = 'projectRole';
          else if (ftype === 'status') matchedField = 'contractStatus';
        }

        // Bank references
        const refMatch = id.match(/^fap-cell-ref-(\d+)-(no|bank|currency|credit|installment|year|rate|record|status)$/);
        if (refMatch) {
          const rowIndex = parseInt(refMatch[1], 10);
          const ftype = refMatch[2];
          matchedSection = 'fap-preview-sec-banks';
          extraMeta = {rowIndex, sectionContext: `banks-${rowIndex}`, repeater: 'banks'};
          if (ftype === 'no' || ftype === 'bank') matchedField = 'bankOrFinInstitution';
          else if (ftype === 'currency') matchedField = 'currency';
          else if (ftype === 'credit') matchedField = 'creditFacility';
          else if (ftype === 'installment') matchedField = 'monthlyInstallment';
          else if (ftype === 'year') matchedField = 'yearStarted';
          else if (ftype === 'rate') matchedField = 'interestRate';
          else if (ftype === 'record') matchedField = 'paymentRecord';
          else if (ftype === 'status') matchedField = 'facilityStatus';
        }

        // Financial Statements
        if (id === 'fap-cell-fin-audited') {
          matchedSection = 'fap-preview-sec-financial';
          matchedField = 'financialAudited';
          extraMeta = {sectionContext: 'financial'};
        }

        const finMatch = id.match(
          /^fap-cell-fin-(bs-yr|is-yr|cur-asset|noncur-asset|tot-asset|cur-liab|noncur-liab|tot-liab|equity|tot-liab-equity|revenue|gross-profit|op-profit|tax|net-income)-(\d+)$/,
        );
        if (finMatch) {
          const metric = finMatch[1];
          const colIdx = parseInt(finMatch[2], 10);
          matchedSection = 'fap-preview-sec-financial';
          extraMeta = {rowIndex: colIdx, sectionContext: `financial-${colIdx}`, repeater: 'financial'};
          if (metric === 'bs-yr' || metric === 'is-yr') matchedField = 'fiscalYear';
          else if (metric === 'cur-asset') matchedField = 'currentAssets';
          else if (metric === 'noncur-asset') matchedField = 'nonCurrentAssets';
          else if (metric === 'tot-asset') matchedField = 'totalAssets';
          else if (metric === 'cur-liab') matchedField = 'currentLiabilities';
          else if (metric === 'noncur-liab') matchedField = 'nonCurrentLiabilities';
          else if (metric === 'tot-liab') matchedField = 'totalLiabilities';
          else if (metric === 'equity') matchedField = 'equity';
          else if (metric === 'tot-liab-equity') matchedField = 'totalLiabAndEquity';
          else if (metric === 'revenue') matchedField = 'revenue';
          else if (metric === 'gross-profit') matchedField = 'grossMargin';
          else if (metric === 'op-profit') matchedField = 'operatingMargin';
          else if (metric === 'tax') matchedField = 'tax';
          else if (metric === 'net-income') matchedField = 'netIncome';
        }

        // Fixed assets & Purpose
        if (id.startsWith('fap-cell-asset-')) {
          matchedSection = 'fap-preview-sec-purpose-assets';
          extraMeta = {sectionContext: 'purpose-assets'};
          if (id === 'fap-cell-asset-lg-he') matchedField = 'assetSummaryHeLiuGong';
          else if (id === 'fap-cell-asset-lg-truck') matchedField = 'assetSummaryTruckLiuGong';
          else if (id === 'fap-cell-asset-nlg-he') matchedField = 'assetSummaryHeNonLiuGong';
          else if (id === 'fap-cell-asset-nlg-truck') matchedField = 'assetSummaryTruckNonLiuGong';
        }

        if (id.startsWith('fap-cell-purpose-')) {
          matchedSection = 'fap-preview-sec-purpose-assets';
          matchedField = 'financingPurposeDetail';
          extraMeta = {sectionContext: 'purpose-assets'};
        }

        if (id.startsWith('fap-cell-seg-')) {
          matchedSection = 'fap-preview-sec-business';
          matchedField = 'industrySegment';
        }

        if (id.startsWith('fap-cell-role-')) {
          matchedSection = 'fap-preview-sec-business';
          matchedField = 'businessRole';
        }

        // Proposal details
        const propCellMap: Record<string, string> = {
          'fap-cell-prop-method': 'financingMethod',
          'fap-cell-prop-curr-choice': 'currencyChoice',
          'fap-cell-prop-val': 'financingValueProp',
          'fap-cell-prop-app-source': 'applicationSource',
          'fap-cell-tc-fl-purpose': 'flInvestment',
          'fap-cell-tc-fl-curr': 'flCurrency',
          'fap-cell-tc-fl-deposit': 'flDeposit',
          'fap-cell-tc-fl-rate': 'flRate',
          'fap-cell-tc-fl-tenor': 'flTenor',
          'fap-cell-tc-fl-payment': 'flPayment',
          'fap-cell-tc-slb-purpose': 'slbPurpose',
          'fap-cell-tc-slb-curr': 'slbCurrency',
          'fap-cell-tc-slb-deposit': 'slbDeposit',
          'fap-cell-tc-slb-rate': 'slbRate',
          'fap-cell-tc-slb-tenor': 'slbTenor',
          'fap-cell-tc-slb-payment': 'slbPayment',
          'fap-cell-tc-if-purpose': 'ifPurpose',
          'fap-cell-tc-if-curr': 'ifCurrency',
          'fap-cell-tc-if-dp': 'ifDownPayment',
          'fap-cell-tc-if-rate': 'ifRate',
          'fap-cell-tc-if-tenor': 'ifTenor',
          'fap-cell-tc-if-payment': 'ifPayment',
          'fap-cell-prop-notes': 'notes',
        };

        if (propCellMap[id]) {
          matchedSection = 'fap-preview-sec-proposal';
          matchedField = propCellMap[id];
        }

        if (id.startsWith('fap-cell-doc-')) {
          matchedSection = 'fap-preview-sec-proposal';
          matchedField = 'documentRequirements';
        }

        if (id.startsWith('fap-cell-prop-asset-')) {
          matchedSection = 'fap-preview-sec-proposal';
          matchedField = 'realizationPlan';
        }

        if (id === 'fap-cell-sign-debtor-company') {
          matchedSection = 'fap-preview-sec-header';
          matchedField = 'companyName';
        }

        if (props.onPreviewCellClick) {
          props.onPreviewCellClick(matchedField || id, matchedSection, extraMeta);
        }
      };
    });
  };

  // Re-sync on prop change
  useEffect(() => {
    syncIframeValues();
  }, [d, zoomLevel, props.syncTick]);

  // Handle active field/section scroll & highlighting inside iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    // Clear previous highlights
    doc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(el => {
      el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
    });

    if (!props.activeSection && !props.activeField) return;

    if (props.activeSection === 'all') {
      win.scrollTo({top: 0, behavior: 'smooth'});
      doc.documentElement.scrollTo({top: 0, behavior: 'smooth'});
      doc.body.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }

    let cellIdsToHighlight: string[] = [];
    let scrollTargetCellId: string | null = null;

    if (props.activeField) {
      const cid =
        resolveFieldToCellId(props.activeField, props.activeSection || undefined, props.data) ||
        FIELD_TO_CELL_ID_MAP[props.activeField] ||
        (props.activeField.startsWith('fap-cell-') ? props.activeField : null);
      if (cid) {
        cellIdsToHighlight.push(cid);
        scrollTargetCellId = cid;
      }
    } else if (props.activeSection) {
      const sectionCells = SECTION_TO_CELL_IDS_MAP[props.activeSection];
      if (sectionCells && sectionCells.length > 0) {
        cellIdsToHighlight = sectionCells;
        scrollTargetCellId = SECTION_TO_SCROLL_TARGET_MAP[props.activeSection] || sectionCells[0];
      } else {
        const single = SECTION_TO_CELL_ID_MAP[props.activeSection] || props.activeSection;
        if (single) {
          cellIdsToHighlight.push(single);
          scrollTargetCellId = single;
        }
      }
    }

    if (cellIdsToHighlight.length === 0 && !scrollTargetCellId) return;

    // Highlight all target cells with blue theme
    cellIdsToHighlight.forEach(cid => {
      const cel = doc.getElementById(cid);
      if (cel) {
        cel.classList.add('fap-cell-highlight');
      }
    });

    // Robust pixel-level scroll calculation inside iframe
    const scrollTargetEl = scrollTargetCellId ? doc.getElementById(scrollTargetCellId) : null;
    if (scrollTargetEl) {
      const rect = scrollTargetEl.getBoundingClientRect();
      const currentScrollY = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      const targetY = Math.max(0, currentScrollY + rect.top - 60);

      win.scrollTo({top: targetY, behavior: 'smooth'});
      doc.documentElement.scrollTo({top: targetY, behavior: 'smooth'});
      doc.body.scrollTo({top: targetY, behavior: 'smooth'});
    }

    const timer = setTimeout(() => {
      cellIdsToHighlight.forEach(cid => {
        const cel = doc.getElementById(cid);
        if (cel) cel.classList.remove('fap-cell-highlight');
      });
    }, 3200);

    return () => clearTimeout(timer);
  }, [props.activeSection, props.activeField, props.syncTick]);

  // Diffs highlighting for comparison mode
  useEffect(() => {
    if (!props.isComparison || !props.diffs || props.diffs.length === 0) return;
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    doc.querySelectorAll('.fap-diff-mismatch, .fap-diff-match').forEach(el => {
      el.classList.remove('fap-diff-mismatch', 'fap-diff-match');
    });

    props.diffs.forEach(diff => {
      const cellId = FIELD_TO_CELL_ID_MAP[diff.field];
      if (cellId) {
        const el = doc.getElementById(cellId);
        if (el) {
          if (diff.isMatch) {
            el.classList.add('fap-diff-match');
          } else {
            el.classList.add('fap-diff-mismatch');
          }
        }
      }
    });
  }, [props.isComparison, props.diffs, zoomLevel]);

  // Responsive initial zoom calculation based on container width
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.03, 0.45));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.03, 0.08));

  useEffect(() => {
    if (props.externalZoom !== undefined && props.externalZoom > 0) {
      setZoomLevel(props.externalZoom);
    }
  }, [props.externalZoom]);

  useEffect(() => {
    if (!containerRef.current || (props.externalZoom !== undefined && props.externalZoom > 0)) return;
    const updateWidth = () => {
      if (containerRef.current && (!props.externalZoom || props.externalZoom <= 0)) {
        const w = containerRef.current.clientWidth;
        const targetZoom = Math.min(0.5, Math.max(0.08, Number(((w - 40) / 4410).toFixed(2))));
        setZoomLevel(targetZoom);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [props.externalZoom]);

  useEffect(() => {
    if (props.onZoomChange) {
      props.onZoomChange(zoomLevel);
    }
  }, [zoomLevel, props.onZoomChange]);

  const handleResetZoom = () => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const targetZoom = Math.min(0.5, Math.max(0.08, Number(((w - 40) / 4410).toFixed(2))));
      setZoomLevel(targetZoom);
    } else {
      setZoomLevel(0.15);
    }
  };

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow && iframe.contentDocument) {
      const doc = iframe.contentDocument;
      const prevZoom = doc.body.style.zoom;

      const restoreZoom = () => {
        if (doc.body) {
          doc.body.style.zoom = prevZoom || String(zoomLevel);
        }
        iframe.contentWindow?.removeEventListener('afterprint', restoreZoom);
      };

      iframe.contentWindow.addEventListener('afterprint', restoreZoom);
      doc.body.style.zoom = '0.175';
      iframe.contentWindow.print();

      setTimeout(restoreZoom, 30000);
    } else {
      window.print();
    }
  };

  return (
    <div
      className="excel-fap-viewer"
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#f1f5f9',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
      }}
    >
      {!props.hideToolbar && (
        <div className="excel-fap-ribbon">
          {/* Top Utility Tier: Document Info, Zoom, Print */}
          <div className="excel-ribbon-top-tier">
            <div className="excel-ribbon-left">
              <FileSpreadsheet size={16} className="excel-brand-icon" />
              <div className="excel-file-badge">
                <span className="excel-file-name">Application Form APPROVED.xlsx</span>
                <span className="excel-tab-badge">Sheet: APPROVED v01.2025</span>
              </div>
              <span className="excel-live-tag">
                <i className="excel-live-dot" />
                LIVE AUTOFILLED
              </span>
            </div>

            <div className="excel-ribbon-right">
              <div className="excel-zoom-controls">
                <button onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut size={13} />
                </button>
                <span className="excel-zoom-btn-label">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn size={13} />
                </button>
                <button onClick={handleResetZoom} title="Reset Zoom">
                  <RotateCcw size={13} />
                </button>
              </div>
              <button className="excel-print-btn" onClick={handlePrint} title="Print Document">
                <Printer size={13} />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Sub Tier: Harmonious Section Quick-Jump Tabs with Slider */}
          <div className="excel-ribbon-sub-tier">
            <button
              type="button"
              className="excel-chips-scroll-btn left"
              onClick={() => scrollChips('left')}
              title="Slide Left (View Earlier Sections)"
            >
              <ChevronLeft size={14} />
            </button>
            <div
              className="excel-section-chips"
              ref={chipsScrollRef}
              onWheel={e => {
                if (chipsScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  chipsScrollRef.current.scrollLeft += e.deltaY;
                }
              }}
            >
              {[
                {id: 'fap-preview-sec-header', label: '1. Identity'},
                {id: 'fap-preview-sec-company', label: '2. Domicile'},
                {id: 'fap-preview-sec-business', label: '3. Profile'},
                {id: 'fap-preview-sec-pic', label: '4. PIC'},
                {id: 'fap-preview-sec-purpose-assets', label: '5. Purpose & Assets'},
                {id: 'fap-preview-sec-projects', label: '6. Projects'},
                {id: 'fap-preview-sec-banks', label: '7. References'},
                {id: 'fap-preview-sec-proposal', label: '8. Financing Proposal'},
                {id: 'fap-preview-sec-financial', label: '9. Financial Statements'},
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  className={`excel-chip-btn ${props.activeSection === chip.id ? 'active' : ''}`}
                  onClick={() => props.onSectionClick?.(chip.id)}
                  title={`Jump to ${chip.label}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="excel-chips-scroll-btn right"
              onClick={() => scrollChips('right')}
              title="Slide Right (View Further Sections)"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Embedded Native HTML Template Frame */}
      <div
        style={{
          flex: 1,
          width: '100%',
          height: props.hideToolbar ? '100%' : 'calc(100% - 40px)',
          background: '#525659',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={FAP_EXCEL_HTML_TEMPLATE}
          title="Application Form APPROVED"
          onLoad={syncIframeValues}
          style={{width: '100%', height: '100%', border: 'none', background: '#525659', display: 'block'}}
        />
      </div>
    </div>
  );
}

export default FapSheetPreview;
