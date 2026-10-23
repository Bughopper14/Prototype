import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileSpreadsheet, ZoomIn, ZoomOut, RotateCcw, Printer } from 'lucide-react';
import { FAP_EXCEL_HTML_TEMPLATE } from './fap-html-template';
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
  activeField?: string;
  syncTick?: number;
  onSectionClick?: (sectionId: string) => void;
  onPreviewCellClick?: (fieldKey: string, sectionId?: string) => void;
  onPrint?: () => void | Promise<void>;
  hideToolbar?: boolean;
  isComparison?: boolean;
  diffs?: any[];
  diffSide?: 'system' | 'ocr';
  onDiffClick?: (field: string) => void;
  externalZoom?: number;
  onZoomChange?: (z: number) => void;
}

export const FIELD_TO_CELL_ID_MAP: Record<string, string> = {
  // Application / Header
  applicationDate: 'fap-cell-applicationDate',
  branchCode: 'fap-cell-branchCode',
  fapNumber: 'fap-cell-fapNumber',
  customerStatus: 'fap-cell-custNew',
  companyType: 'fap-cell-corporate',
  industrySegment: 'fap-cell-corporate',

  // Company Information
  companyName: 'fap-cell-companyName',
  address: 'fap-cell-companyAddress',
  companyAddress: 'fap-cell-companyAddress',
  city: 'fap-cell-city',
  province: 'fap-cell-province',
  postalCode: 'fap-cell-postalCode',
  district: 'fap-cell-city',
  village: 'fap-cell-city',
  rt: 'fap-cell-city',
  rw: 'fap-cell-city',
  phoneFax: 'fap-cell-phoneFax',
  website: 'fap-cell-website',
  email: 'fap-cell-email',
  repaymentSource: 'fap-cell-repaymentSource',
  locationStatus: 'fap-cell-locationStatus',

  // Line of Business & Legal Deeds
  mainBusiness: 'fap-cell-mainBusiness',
  establishmentActNo: 'fap-cell-establishmentActNo',
  establishmentDate: 'fap-cell-establishmentDate',
  experienceYears: 'fap-cell-experienceYears',
  experienceMonths: 'fap-cell-experienceMonths',
  latestDeedNo: 'fap-cell-latestDeedNo',
  latestDeedDate: 'fap-cell-latestDeedDate',
  nib: 'fap-cell-nib',
  nibDate: 'fap-cell-nib',
  npwp: 'fap-cell-npwp',
  sktNo: 'fap-cell-npwp',
  sppkpNo: 'fap-cell-npwp',

  // PIC Information
  picName: 'fap-cell-picName',
  name: 'fap-cell-picName',
  phone: 'fap-cell-phone',
  mobilePhone: 'fap-cell-phone',
  position: 'fap-cell-position',
  picEmail: 'fap-cell-picEmail',
  currentAddress: 'fap-cell-currentAddress',
  picCity: 'fap-cell-picCity',
  picProvince: 'fap-cell-picProvince',
  picPostalCode: 'fap-cell-picPostalCode',

  // Shareholders
  shareholders: 'fap-cell-sh-0-name',
  sharePercentage: 'fap-cell-sh-0-pct',
  primaryCapital: 'fap-cell-sh-0-shares',
  depositedCapital: 'fap-cell-sh-0-shares',
};

export const SECTION_TO_CELL_ID_MAP: Record<string, string> = {
  'fap-preview-sec-header': 'fap-cell-applicationDate',
  'fap-preview-sec-company': 'fap-cell-companyName',
  'fap-preview-sec-business': 'fap-cell-mainBusiness',
  'fap-preview-sec-pic': 'fap-cell-picName',
  'fap-preview-sec-projects': 'fap-cell-sh-0-name',
};

export const CELL_ID_TO_SECTION_MAP: Record<string, string> = {
  'fap-cell-fapNumber': 'fap-preview-sec-header',
  'fap-cell-applicationDate': 'fap-preview-sec-header',
  'fap-cell-branchCode': 'fap-preview-sec-header',
  'fap-cell-custNew': 'fap-preview-sec-header',
  'fap-cell-custExisting': 'fap-preview-sec-header',
  'fap-cell-corporate': 'fap-preview-sec-header',
  'fap-cell-commercial': 'fap-preview-sec-header',
  'fap-cell-micro': 'fap-preview-sec-header',
  'fap-cell-liugongUser': 'fap-preview-sec-header',

  'fap-cell-companyName': 'fap-preview-sec-company',
  'fap-cell-companyAddress': 'fap-preview-sec-company',
  'fap-cell-city': 'fap-preview-sec-company',
  'fap-cell-province': 'fap-preview-sec-company',
  'fap-cell-postalCode': 'fap-preview-sec-company',
  'fap-cell-phoneFax': 'fap-preview-sec-company',
  'fap-cell-website': 'fap-preview-sec-company',
  'fap-cell-email': 'fap-preview-sec-company',
  'fap-cell-repaymentSource': 'fap-preview-sec-company',
  'fap-cell-locationStatus': 'fap-preview-sec-company',

  'fap-cell-mainBusiness': 'fap-preview-sec-business',
  'fap-cell-establishmentActNo': 'fap-preview-sec-business',
  'fap-cell-establishmentDate': 'fap-preview-sec-business',
  'fap-cell-experienceYears': 'fap-preview-sec-business',
  'fap-cell-experienceMonths': 'fap-preview-sec-business',
  'fap-cell-latestDeedNo': 'fap-preview-sec-business',
  'fap-cell-latestDeedDate': 'fap-preview-sec-business',
  'fap-cell-nib': 'fap-preview-sec-business',
  'fap-cell-npwp': 'fap-preview-sec-business',

  'fap-cell-picName': 'fap-preview-sec-pic',
  'fap-cell-phone': 'fap-preview-sec-pic',
  'fap-cell-position': 'fap-preview-sec-pic',
  'fap-cell-picEmail': 'fap-preview-sec-pic',
  'fap-cell-currentAddress': 'fap-preview-sec-pic',
  'fap-cell-picCity': 'fap-preview-sec-pic',
  'fap-cell-picProvince': 'fap-preview-sec-pic',
  'fap-cell-picPostalCode': 'fap-preview-sec-pic',

  'fap-cell-sh-0-name': 'fap-preview-sec-projects',
};

export function FapSheetPreview(props: FapSheetPreviewProps) {
  const master = useMasterData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.44);

  // Compute normalized values from props
  const d = useMemo(() => {
    const raw = props.data || {};
    const app = props.application || {};
    const cust = props.customer || app.customer || {};
    const prof = props.profile || app.profile || {};
    const p = props.pic || app.pic || raw.pic || {};
    const sh = props.stakeholders || app.stakeholders || raw.stakeholders || [];

    const pick = (vA: any, vB: any, vC?: any, fallback = '') => {
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
      fapNumber: pick(raw.fapNumber, app.fapNumber, '0006/AF/03/2026'),
      applicationDate: formatDate(pick(raw.applicationDate, app.applicationDate, new Date().toISOString())),
      branchCode: pick(raw.branchCode, app.branchCode, 'JKT01'),
      customerStatus: pick(raw.customerStatus, app.customerStatus, 'EXISTING').toUpperCase(),
      companyType: pick(raw.companyType, cust.companyType, '').toUpperCase(),
      companyName: pick(raw.companyName, cust.companyName, ''),
      companyAddress: pick(raw.companyAddress, prof.companyAddress, ''),
      city: resolveLoc('city', pick(raw.city, prof.city, '')),
      province: resolveLoc('province', pick(raw.province, prof.province, '')),
      postalCode: pick(raw.postalCode, prof.postalCode, ''),
      mainBusiness: pick(raw.mainBusiness, prof.mainBusiness, ''),
      establishmentActNo: pick(raw.establishmentActNo, cust.establishmentActNo, ''),
      establishmentDate: formatDate(pick(raw.establishmentDate, cust.establishmentDate, '')),
      experienceYears: pick(raw.experienceYears, prof.experienceYears, ''),
      experienceMonths: pick(raw.experienceMonths, prof.experienceMonths, ''),
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
      stakeholders: sh,
    };
  }, [props.data, props.application, props.customer, props.profile, props.pic, props.stakeholders, master]);

  // Push values into iframe DOM
  const syncIframeValues = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    // Apply zoom and centering
    if (doc.body) {
      doc.body.style.zoom = String(zoomLevel);
      doc.body.style.background = '#f8fafc';
      doc.body.style.textAlign = 'center';
      doc.body.style.padding = '20px 0';
      doc.body.style.margin = '0';
      doc.body.style.minWidth = '100%';
    }

    const mainTable = doc.getElementById('fap-main-table') || doc.querySelector('table');
    if (mainTable) {
      (mainTable as HTMLElement).style.marginLeft = 'auto';
      (mainTable as HTMLElement).style.marginRight = 'auto';
      (mainTable as HTMLElement).style.backgroundColor = '#ffffff';
      (mainTable as HTMLElement).style.boxShadow = '0 4px 24px rgba(15, 23, 42, 0.08)';
      (mainTable as HTMLElement).style.textAlign = 'left';
      (mainTable as HTMLElement).style.display = 'table';
    }

    const setText = (id: string, text: any) => {
      const el = doc.getElementById(id);
      if (el) {
        el.textContent = text !== undefined && text !== null && String(text).trim() !== '' ? String(text) : '';
      }
    };

    setText('fap-cell-fapNumber', d.fapNumber);
    setText('fap-cell-applicationDate', d.applicationDate);
    setText('fap-cell-branchCode', d.branchCode);

    const isNew = d.customerStatus.includes('NEW') || (!d.customerStatus.includes('EXISTING') && !d.customerStatus.includes('LAMA'));
    setText('fap-cell-custNew', isNew ? '✓' : '');
    setText('fap-cell-custExisting', !isNew ? '✓' : '');

    const isCorp = d.companyType.includes('CORPORATE') || d.companyType.includes('PT') || d.companyType.includes('PERSEROAN');
    const isComm = d.companyType.includes('COMMERCIAL') || d.companyType.includes('CV') || d.companyType.includes('FIRMA');
    const isMicro = d.companyType.includes('MICRO') || d.companyType.includes('MIKRO');
    const isLiuGongUser = d.companyType.includes('LIUGONG') || d.companyType.includes('USER');

    setText('fap-cell-corporate', isCorp ? '✓' : '');
    setText('fap-cell-commercial', isComm ? '✓' : '');
    setText('fap-cell-micro', isMicro ? '✓' : '');
    setText('fap-cell-liugongUser', isLiuGongUser ? '✓' : '');

    setText('fap-cell-companyName', d.companyName);
    setText('fap-cell-picName', d.picName);
    setText('fap-cell-phone', d.phone);
    setText('fap-cell-companyAddress', d.companyAddress);
    setText('fap-cell-position', d.position);
    setText('fap-cell-picEmail', d.picEmail);
    setText('fap-cell-city', d.city);
    setText('fap-cell-currentAddress', d.currentAddress);
    setText('fap-cell-province', d.province);
    setText('fap-cell-postalCode', d.postalCode);
    setText('fap-cell-picCity', d.picCity);
    setText('fap-cell-mainBusiness', d.mainBusiness);
    setText('fap-cell-picProvince', d.picProvince);
    setText('fap-cell-picPostalCode', d.picPostalCode);
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
    setText('fap-cell-locationStatus', d.locationStatus);

    // Ensure all address, location, legal deed, and profile fields have complete 4-sided black borders
    [
      'fap-cell-province', 'fap-cell-picProvince', 'fap-cell-city', 'fap-cell-picCity', 
      'fap-cell-postalCode', 'fap-cell-picPostalCode', 'fap-cell-website',
      'fap-cell-establishmentActNo', 'fap-cell-establishmentDate',
      'fap-cell-experienceYears', 'fap-cell-experienceMonths',
      'fap-cell-latestDeedNo', 'fap-cell-latestDeedDate'
    ].forEach(id => {
      const el = doc.getElementById(id);
      if (el) {
        el.style.border = '.5pt solid black';
      }
    });

    // Ensure closing boundary lines at end of Page 1 and Page 2
    const tableEl = doc.getElementById('fap-main-table') as HTMLTableElement | null;
    if (tableEl && tableEl.rows) {
      const r76 = tableEl.rows[76];
      if (r76) {
        for (let i = 0; i < r76.cells.length; i++) {
          r76.cells[i].style.borderBottom = '2.5pt solid black';
        }
      }
      const rEnd = tableEl.rows[131] || tableEl.rows[tableEl.rows.length - 1];
      if (rEnd) {
        for (let i = 0; i < rEnd.cells.length; i++) {
          rEnd.cells[i].style.borderBottom = '2.5pt solid black';
        }
      }
    }

    // Shareholders up to 8
    const shList = d.stakeholders || [];
    for (let i = 0; i < 8; i++) {
      const item = shList[i] || {};
      const shName = item.name || [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ');
      setText(`fap-cell-sh-${i}-name`, shName || '');
      setText(`fap-cell-sh-${i}-pos`, item.position || item.representativeType || '');
      setText(`fap-cell-sh-${i}-shares`, item.shares ? Number(item.shares).toLocaleString('id-ID') : '');
      setText(`fap-cell-sh-${i}-pct`, item.sharePercentage ? `${item.sharePercentage}%` : '');
    }

    // Attach click listeners to all data cells
    const cells = doc.querySelectorAll('[id^="fap-cell-"]');
    cells.forEach((cell) => {
      (cell as HTMLElement).style.cursor = 'pointer';
      (cell as HTMLElement).title = 'Click to focus this field in form';
      (cell as HTMLElement).onclick = (e) => {
        e.stopPropagation();
        const id = (cell as HTMLElement).id;
        const matchedField = Object.entries(FIELD_TO_CELL_ID_MAP).find(([_, v]) => v === id)?.[0] || '';
        const matchedSection = CELL_ID_TO_SECTION_MAP[id] || '';
        if (props.onPreviewCellClick) {
          props.onPreviewCellClick(matchedField, matchedSection);
        } else if (matchedSection && props.onSectionClick) {
          props.onSectionClick(matchedSection);
        }
      };
    });
  };

  useEffect(() => {
    syncIframeValues();
    const timer = setTimeout(syncIframeValues, 150);
    return () => clearTimeout(timer);
  }, [d, zoomLevel]);

  // Handle field/section focus and scroll sync
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    const targetCellId = (props.activeField && FIELD_TO_CELL_ID_MAP[props.activeField]) ||
                         (props.activeSection && (SECTION_TO_CELL_ID_MAP[props.activeSection] || props.activeSection)) ||
                         (props.activeSection && FIELD_TO_CELL_ID_MAP[props.activeSection]);

    if (!targetCellId) return;

    const el = doc.getElementById(targetCellId);
    if (el) {
      // Clear old highlights
      doc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(h => {
        h.classList.remove('fap-cell-highlight', 'fap-section-highlight');
      });

      // Highlight target with blue theme
      const isSection = targetCellId.startsWith('fap-preview-sec-') || el.tagName === 'TR';
      el.classList.add(isSection ? 'fap-section-highlight' : 'fap-cell-highlight');

      // Robust pixel-level scroll calculation inside iframe
      const rect = el.getBoundingClientRect();
      const currentScrollY = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      const targetY = Math.max(0, currentScrollY + rect.top - 60);

      win.scrollTo({ top: targetY, behavior: 'smooth' });
      doc.documentElement.scrollTo({ top: targetY, behavior: 'smooth' });
      doc.body.scrollTo({ top: targetY, behavior: 'smooth' });

      const timer = setTimeout(() => {
        el.classList.remove('fap-cell-highlight', 'fap-section-highlight');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [props.activeSection, props.activeField, props.syncTick]);

  // Auto-fit initial zoom based on container width
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        // Native Excel table width in sheet001.htm is 3443px
        // Deduct 36px so the table has breathing room (18px left & right) and centers smoothly
        const availableWidth = Math.max(260, w - 36);
        const targetZoom = Math.min(0.65, Math.max(0.10, availableWidth / 3443));
        setZoomLevel(Number(targetZoom.toFixed(2)));
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.10, Number((z - 0.05).toFixed(2))));
  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.0, Number((z + 0.05).toFixed(2))));
  const handleResetZoom = () => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const availableWidth = Math.max(260, w - 36);
      const targetZoom = Math.min(0.65, Math.max(0.10, availableWidth / 3443));
      setZoomLevel(Number(targetZoom.toFixed(2)));
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const win = iframeRef.current.contentWindow;
      const doc = win.document;
      const prevZoom = doc.body.style.zoom;
      const prevPadding = doc.body.style.padding;
      const prevMargin = doc.body.style.margin;

      // Scale cleanly to A4 portrait (fits exactly 2 pages)
      doc.body.style.zoom = '0.185';
      doc.body.style.padding = '0';
      doc.body.style.margin = '0 auto';
      doc.body.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      doc.body.style.setProperty('print-color-adjust', 'exact', 'important');

      win.print();

      setTimeout(() => {
        if (doc && doc.body) {
          doc.body.style.zoom = prevZoom;
          doc.body.style.padding = prevPadding;
          doc.body.style.margin = prevMargin;
        }
      }, 500);
    } else {
      window.print();
    }
  };

  return (
    <div className="excel-fap-viewer" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
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
                <button onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={13} /></button>
                <span className="excel-zoom-btn-label">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={handleZoomIn} title="Zoom In"><ZoomIn size={13} /></button>
                <button onClick={handleResetZoom} title="Reset Zoom"><RotateCcw size={13} /></button>
              </div>
              <button className="excel-print-btn" onClick={handlePrint} title="Print Document">
                <Printer size={13} />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Sub Tier: Harmonious Section Quick-Jump Tabs */}
          <div className="excel-ribbon-sub-tier">
            <div className="excel-section-chips">
              {[
                { id: 'fap-preview-sec-header', label: '1. Identity' },
                { id: 'fap-preview-sec-company', label: '2. Domicile' },
                { id: 'fap-preview-sec-business', label: '3. Profile' },
                { id: 'fap-preview-sec-pic', label: '4. PIC' },
                { id: 'fap-preview-sec-projects', label: '5. Projects' },
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
          </div>
        </div>
      )}

      {/* Embedded Native HTML Template Frame */}
      <div style={{ flex: 1, width: '100%', height: 'calc(100% - 67px)', background: '#f8fafc', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          srcDoc={FAP_EXCEL_HTML_TEMPLATE}
          title="Application Form APPROVED"
          onLoad={syncIframeValues}
          style={{ width: '100%', height: '100%', border: 'none', background: '#f8fafc', display: 'block' }}
        />
      </div>
    </div>
  );
}

export function printFapDocument(_fapNumber?: string) {
  const iframe = document.querySelector('.excel-fap-viewer iframe') as HTMLIFrameElement;
  if (iframe && iframe.contentWindow) {
    const win = iframe.contentWindow;
    const doc = win.document;
    const prevZoom = doc.body.style.zoom;
    const prevPadding = doc.body.style.padding;
    const prevMargin = doc.body.style.margin;

    // Scale cleanly to A4 portrait (fits exactly 2 pages)
    doc.body.style.zoom = '0.185';
    doc.body.style.padding = '0';
    doc.body.style.margin = '0 auto';
    doc.body.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
    doc.body.style.setProperty('print-color-adjust', 'exact', 'important');

    win.print();

    setTimeout(() => {
      if (doc && doc.body) {
        doc.body.style.zoom = prevZoom;
        doc.body.style.padding = prevPadding;
        doc.body.style.margin = prevMargin;
      }
    }, 500);
  } else {
    window.print();
  }
}

export default FapSheetPreview;
