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
  projects?: any[];
  [key: string]: any;
}

export interface FapSheetPreviewProps {
  data?: FapSheetData;
  application?: any;
  customer?: any;
  profile?: any;
  pic?: any;
  stakeholders?: any[];
  projects?: any[];
  compact?: boolean;
  readOnly?: boolean;
  activeSection?: string | null;
  activeField?: string | null;
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

  // Projects
  projectOwner: 'fap-cell-proj-0-owner',
  projectLocation: 'fap-cell-proj-0-loc',
  location: 'fap-cell-proj-0-loc',
  projectRole: 'fap-cell-proj-0-role',
  roleInProject: 'fap-cell-proj-0-role',
  contractStatus: 'fap-cell-proj-0-status',

  // Shareholders
  shareholders: 'fap-cell-sh-0-name',
  sharePercentage: 'fap-cell-sh-0-pct',
  primaryCapital: 'fap-cell-sh-0-shares',
  depositedCapital: 'fap-cell-sh-0-shares',
};

export function resolveFieldToCellId(fieldKey: string, section?: string | null, extraData?: any): string {
  if (section?.startsWith('projects') || ['projectOwner', 'projectLocation', 'location', 'projectRole', 'roleInProject', 'contractStatus'].includes(fieldKey)) {
    let rowIndex = 0;
    const m = section?.match(/projects-(\d+)/);
    if (m) rowIndex = parseInt(m[1], 10) || 0;
    if (rowIndex > 6) rowIndex = 6;
    if (fieldKey === 'projectOwner') return `fap-cell-proj-${rowIndex}-owner`;
    if (fieldKey === 'projectLocation' || fieldKey === 'location') return `fap-cell-proj-${rowIndex}-loc`;
    if (fieldKey === 'projectRole' || fieldKey === 'roleInProject') return `fap-cell-proj-${rowIndex}-role`;
    if (fieldKey === 'contractStatus') return `fap-cell-proj-${rowIndex}-status`;
    return `fap-cell-proj-${rowIndex}-owner`;
  }
  if (section === 'pic' || section === 'fap-preview-sec-pic') {
    const picMap: Record<string, string> = {
      name: 'fap-cell-picName',
      picName: 'fap-cell-picName',
      phone: 'fap-cell-phone',
      mobilePhone: 'fap-cell-phone',
      position: 'fap-cell-position',
      email: 'fap-cell-picEmail',
      picEmail: 'fap-cell-picEmail',
      currentAddress: 'fap-cell-currentAddress',
      address: 'fap-cell-currentAddress',
      city: 'fap-cell-picCity',
      picCity: 'fap-cell-picCity',
      province: 'fap-cell-picProvince',
      picProvince: 'fap-cell-picProvince',
      postalCode: 'fap-cell-picPostalCode',
      picPostalCode: 'fap-cell-picPostalCode',
      district: 'fap-cell-picCity',
      village: 'fap-cell-picCity',
      rt: 'fap-cell-currentAddress',
      rw: 'fap-cell-currentAddress',
      country: 'fap-cell-currentAddress',
    };
    if (picMap[fieldKey]) return picMap[fieldKey];
  }

  if (fieldKey === 'companyType') {
    const val = String(extraData?.companyType || '').toUpperCase();
    if (val.includes('COMMERCIAL')) return 'fap-cell-commercial';
    if (val.includes('MICRO')) return 'fap-cell-micro';
    return 'fap-cell-corporate';
  }

  if (fieldKey === 'customerCategory') {
    const cat = String(extraData?.customerCategory || '').toUpperCase();
    return cat === 'EXISTING' ? 'fap-cell-custExisting' : 'fap-cell-custNew';
  }

  if (FIELD_TO_CELL_ID_MAP[fieldKey]) {
    return FIELD_TO_CELL_ID_MAP[fieldKey];
  }

  if (fieldKey && fieldKey.startsWith('fap-cell-')) {
    return fieldKey;
  }

  return '';
}


export const SECTION_TO_CELL_IDS_MAP: Record<string, string[]> = {
  'fap-preview-sec-header': [
    'fap-cell-applicationDate',
    'fap-cell-fapNumber',
    'fap-cell-custNew',
    'fap-cell-custExisting',
    'fap-cell-corporate',
    'fap-cell-commercial',
    'fap-cell-micro',
    'fap-cell-companyName',
    'fap-cell-nib',
    'fap-cell-npwp',
    'fap-cell-establishmentActNo',
    'fap-cell-establishmentDate',
  ],
  'fap-preview-sec-company': [
    'fap-cell-branchCode',
    'fap-cell-liugongUser',
    'fap-cell-locationStatus',
    'fap-cell-companyAddress',
    'fap-cell-city',
    'fap-cell-province',
    'fap-cell-postalCode',
    'fap-cell-phoneFax',
    'fap-cell-website',
    'fap-cell-email',
  ],
  'fap-preview-sec-business': [
    'fap-cell-mainBusiness',
    'fap-cell-repaymentSource',
    'fap-cell-experienceYears',
    'fap-cell-experienceMonths',
    'fap-cell-latestDeedNo',
    'fap-cell-latestDeedDate',
  ],
  'fap-preview-sec-pic': [
    'fap-cell-picName',
    'fap-cell-phone',
    'fap-cell-position',
    'fap-cell-picEmail',
    'fap-cell-currentAddress',
    'fap-cell-picCity',
    'fap-cell-picProvince',
    'fap-cell-picPostalCode',
  ],
  'fap-preview-sec-projects': [
    'fap-cell-proj-0-owner', 'fap-cell-proj-0-loc', 'fap-cell-proj-0-role', 'fap-cell-proj-0-status',
    'fap-cell-proj-1-owner', 'fap-cell-proj-1-loc', 'fap-cell-proj-1-role', 'fap-cell-proj-1-status',
    'fap-cell-proj-2-owner', 'fap-cell-proj-2-loc', 'fap-cell-proj-2-role', 'fap-cell-proj-2-status',
    'fap-cell-proj-3-owner', 'fap-cell-proj-3-loc', 'fap-cell-proj-3-role', 'fap-cell-proj-3-status',
    'fap-cell-proj-4-owner', 'fap-cell-proj-4-loc', 'fap-cell-proj-4-role', 'fap-cell-proj-4-status',
    'fap-cell-proj-5-owner', 'fap-cell-proj-5-loc', 'fap-cell-proj-5-role', 'fap-cell-proj-5-status',
    'fap-cell-proj-6-owner', 'fap-cell-proj-6-loc', 'fap-cell-proj-6-role', 'fap-cell-proj-6-status',
  ],
};

export const SECTION_TO_SCROLL_TARGET_MAP: Record<string, string> = {
  'fap-preview-sec-header': 'fap-cell-fapNumber',
  'fap-preview-sec-company': 'fap-cell-companyAddress',
  'fap-preview-sec-business': 'fap-cell-mainBusiness',
  'fap-preview-sec-pic': 'fap-cell-picName',
  'fap-preview-sec-projects': 'fap-cell-proj-0-owner',
};

export const SECTION_TO_CELL_ID_MAP: Record<string, string> = {
  ...SECTION_TO_SCROLL_TARGET_MAP,
};

export const CELL_ID_TO_SECTION_MAP: Record<string, string> = {
  // Header / Identity
  'fap-cell-applicationDate': 'fap-preview-sec-header',
  'fap-cell-fapNumber': 'fap-preview-sec-header',
  'fap-cell-custNew': 'fap-preview-sec-header',
  'fap-cell-custExisting': 'fap-preview-sec-header',
  'fap-cell-corporate': 'fap-preview-sec-header',
  'fap-cell-commercial': 'fap-preview-sec-header',
  'fap-cell-micro': 'fap-preview-sec-header',
  'fap-cell-companyName': 'fap-preview-sec-header',
  'fap-cell-nib': 'fap-preview-sec-header',
  'fap-cell-npwp': 'fap-preview-sec-header',
  'fap-cell-establishmentActNo': 'fap-preview-sec-header',
  'fap-cell-establishmentDate': 'fap-preview-sec-header',

  // Company / Domicile
  'fap-cell-branchCode': 'fap-preview-sec-company',
  'fap-cell-liugongUser': 'fap-preview-sec-company',
  'fap-cell-locationStatus': 'fap-preview-sec-company',
  'fap-cell-companyAddress': 'fap-preview-sec-company',
  'fap-cell-city': 'fap-preview-sec-company',
  'fap-cell-province': 'fap-preview-sec-company',
  'fap-cell-postalCode': 'fap-preview-sec-company',
  'fap-cell-phoneFax': 'fap-preview-sec-company',
  'fap-cell-website': 'fap-preview-sec-company',
  'fap-cell-email': 'fap-preview-sec-company',

  // Business Profile & Deeds
  'fap-cell-mainBusiness': 'fap-preview-sec-business',
  'fap-cell-repaymentSource': 'fap-preview-sec-business',
  'fap-cell-experienceYears': 'fap-preview-sec-business',
  'fap-cell-experienceMonths': 'fap-preview-sec-business',
  'fap-cell-latestDeedNo': 'fap-preview-sec-business',
  'fap-cell-latestDeedDate': 'fap-preview-sec-business',

  // PIC
  'fap-cell-picName': 'fap-preview-sec-pic',
  'fap-cell-phone': 'fap-preview-sec-pic',
  'fap-cell-position': 'fap-preview-sec-pic',
  'fap-cell-picEmail': 'fap-preview-sec-pic',
  'fap-cell-currentAddress': 'fap-preview-sec-pic',
  'fap-cell-picCity': 'fap-preview-sec-pic',
  'fap-cell-picProvince': 'fap-preview-sec-pic',
  'fap-cell-picPostalCode': 'fap-preview-sec-pic',

  // Projects (Pemilik Proyek)
  'fap-cell-proj-0-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-0-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-0-role': 'fap-preview-sec-projects',
  'fap-cell-proj-0-status': 'fap-preview-sec-projects',
  'fap-cell-proj-1-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-1-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-1-role': 'fap-preview-sec-projects',
  'fap-cell-proj-1-status': 'fap-preview-sec-projects',
  'fap-cell-proj-2-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-2-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-2-role': 'fap-preview-sec-projects',
  'fap-cell-proj-2-status': 'fap-preview-sec-projects',
  'fap-cell-proj-3-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-3-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-3-role': 'fap-preview-sec-projects',
  'fap-cell-proj-3-status': 'fap-preview-sec-projects',
  'fap-cell-proj-4-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-4-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-4-role': 'fap-preview-sec-projects',
  'fap-cell-proj-4-status': 'fap-preview-sec-projects',
  'fap-cell-proj-5-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-5-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-5-role': 'fap-preview-sec-projects',
  'fap-cell-proj-5-status': 'fap-preview-sec-projects',
  'fap-cell-proj-6-owner': 'fap-preview-sec-projects',
  'fap-cell-proj-6-loc': 'fap-preview-sec-projects',
  'fap-cell-proj-6-role': 'fap-preview-sec-projects',
  'fap-cell-proj-6-status': 'fap-preview-sec-projects',

  // Shareholders
  'fap-cell-sh-0-name': 'fap-preview-sec-projects',
  'fap-cell-sh-0-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-0-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-0-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-1-name': 'fap-preview-sec-projects',
  'fap-cell-sh-1-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-1-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-1-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-2-name': 'fap-preview-sec-projects',
  'fap-cell-sh-2-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-2-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-2-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-3-name': 'fap-preview-sec-projects',
  'fap-cell-sh-3-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-3-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-3-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-4-name': 'fap-preview-sec-projects',
  'fap-cell-sh-4-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-4-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-4-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-5-name': 'fap-preview-sec-projects',
  'fap-cell-sh-5-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-5-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-5-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-6-name': 'fap-preview-sec-projects',
  'fap-cell-sh-6-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-6-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-6-pct': 'fap-preview-sec-projects',
  'fap-cell-sh-7-name': 'fap-preview-sec-projects',
  'fap-cell-sh-7-pos': 'fap-preview-sec-projects',
  'fap-cell-sh-7-shares': 'fap-preview-sec-projects',
  'fap-cell-sh-7-pct': 'fap-preview-sec-projects',
};

export function FapSheetPreview(props: FapSheetPreviewProps) {
  const master = useMasterData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.15);

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
        // On OCR side, strictly use vA (the OCR extracted value). Do not fall back to system data (vB, vC).
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
      fapNumber: isOcrSide ? (raw.fapNumber || '') : pick(raw.fapNumber, app.fapNumber, '0006/AF/03/2026'),
      applicationDate: isOcrSide ? (raw.applicationDate ? formatDate(raw.applicationDate) : '') : formatDate(pick(raw.applicationDate, app.applicationDate, new Date().toISOString())),
      branchCode: isOcrSide ? (raw.branchCode || '') : pick(raw.branchCode, app.branchCode, 'JKT01'),
      customerStatus: isOcrSide ? (raw.customerStatus || '').toUpperCase() : pick(raw.customerStatus, app.customerStatus, 'EXISTING').toUpperCase(),
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
          if (m < 0) { y--; m += 12; }
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
          if (m < 0) { y--; m += 12; }
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
      stakeholders: isOcrSide ? (raw.stakeholders || []) : sh,
      projects: isOcrSide ? ((raw as any).projects || []) : proj,
    };
  }, [props.data, props.application, props.customer, props.profile, props.pic, props.stakeholders, props.projects, master]);

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
        el.textContent = text !== undefined && text !== null && String(text).trim() !== '' ? String(text) : '';
      }
    };

    setText('fap-cell-fapNumber', d.fapNumber);
    setText('fap-cell-applicationDate', d.applicationDate);
    setText('fap-cell-branchCode', d.branchCode);

    if (props.diffSide === 'ocr' && !d.customerStatus) {
      setText('fap-cell-custNew', '');
      setText('fap-cell-custExisting', '');
    } else {
      const isNew = d.customerStatus.includes('NEW');
      const isExisting = d.customerStatus.includes('EXISTING') || d.customerStatus.includes('LAMA');
      setText('fap-cell-custNew', isNew ? '✓' : '');
      setText('fap-cell-custExisting', isExisting ? '✓' : '');
    }

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

    // Projects (Pemilik Proyek / Project Owner table)
    const projList = d.projects || [];
    for (let i = 0; i < 7; i++) {
      const item = projList[i] || {};
      setText(`fap-cell-proj-${i}-owner`, item.projectOwner || '');
      setText(`fap-cell-proj-${i}-loc`, item.projectLocation || item.location || '');
      setText(`fap-cell-proj-${i}-role`, item.projectRole || item.roleInProject || '');
      setText(`fap-cell-proj-${i}-status`, item.contractStatus || '');
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

    // Highlight cells that have differences
    doc.querySelectorAll('.fap-diff-warning-cell').forEach(c => {
      c.classList.remove('fap-diff-warning-cell');
      (c as HTMLElement).style.backgroundColor = '';
      (c as HTMLElement).style.outline = '';
    });

    if (props.diffs && props.diffs.length > 0) {
      props.diffs.forEach((item: any) => {
        const cid = resolveFieldToCellId(item.field, undefined, props.data) || FIELD_TO_CELL_ID_MAP[item.field];
        if (cid) {
          const el = doc.getElementById(cid);
          if (el) {
            el.classList.add('fap-diff-warning-cell');
            (el as HTMLElement).style.backgroundColor = props.diffSide === 'ocr' ? '#fff7ed' : '#fef2f2';
            (el as HTMLElement).style.outline = props.diffSide === 'ocr' ? '2px solid #f97316' : '2px solid #ef4444';
          }
        }
      });
    }

    // Sync customer data box height to reach just above Email
    try {
      const box = doc.getElementById('fap-customer-data-box');
      const comp = doc.getElementById('fap-preview-sec-company');
      const emailTd = doc.getElementById('fap-email-label');
      if (box && comp && emailTd) {
        const emailTr = emailTd.closest('tr');
        if (emailTr) {
          const h = (emailTr.offsetTop - comp.offsetTop) - 4;
          if (h > 1000) {
            box.style.height = `${h}px`;
          }
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    syncIframeValues();
    const timer = setTimeout(syncIframeValues, 150);
    return () => clearTimeout(timer);
  }, [d, zoomLevel, props.diffs]);

  // Handle field/section focus and scroll sync
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    // Clear old highlights
    doc.querySelectorAll('.fap-cell-highlight, .fap-section-highlight').forEach(h => {
      h.classList.remove('fap-cell-highlight', 'fap-section-highlight');
    });

    if (!props.activeSection && !props.activeField) return;

    if (props.activeSection === 'all') {
      win.scrollTo({ top: 0, behavior: 'smooth' });
      doc.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      doc.body.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let cellIdsToHighlight: string[] = [];
    let scrollTargetCellId: string | null = null;

    if (props.activeField) {
      const cid = resolveFieldToCellId(props.activeField, props.activeSection || undefined, props.data) || FIELD_TO_CELL_ID_MAP[props.activeField] || (props.activeField.startsWith('fap-cell-') ? props.activeField : null);
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

      win.scrollTo({ top: targetY, behavior: 'smooth' });
      doc.documentElement.scrollTo({ top: targetY, behavior: 'smooth' });
      doc.body.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    const timer = setTimeout(() => {
      cellIdsToHighlight.forEach(cid => {
        const cel = doc.getElementById(cid);
        if (cel) cel.classList.remove('fap-cell-highlight');
      });
    }, 3200);
    return () => clearTimeout(timer);
  }, [props.activeSection, props.activeField, props.syncTick]);

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

  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.05, Number((z - 0.05).toFixed(2))));
  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.5, Number((z + 0.05).toFixed(2))));
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
      <div style={{ flex: 1, width: '100%', height: props.hideToolbar ? '100%' : 'calc(100% - 40px)', background: '#525659', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          srcDoc={FAP_EXCEL_HTML_TEMPLATE}
          title="Application Form APPROVED"
          onLoad={syncIframeValues}
          style={{ width: '100%', height: '100%', border: 'none', background: '#525659', display: 'block' }}
        />
      </div>
    </div>
  );
}

export function printFapDocument(_fapNumber?: string) {
  window.print();
}

export default FapSheetPreview;
