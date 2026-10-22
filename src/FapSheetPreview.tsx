import React, { useState, useEffect } from 'react';
import { FapSheetPreviewApproved2025 } from './FapSheetPreviewApproved2025';
import { FapSheetPreviewClassic } from './FapSheetPreviewClassic';

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
  district?: string;
  village?: string;
  rt?: string;
  rw?: string;
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
  picEmail?: string;
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
  documentChecks?: any[];
  applicationSource?: string;
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
  templateVersion?: 'approved_2025' | 'classic';
}

export function FapSheetPreview(props: FapSheetPreviewProps) {
  // Rollback logic: allows switching between new approved 2025 template and previous classic template
  const [version, setVersion] = useState<'approved_2025' | 'classic'>(() => {
    if (props.templateVersion) return props.templateVersion;
    try {
      const saved = localStorage.getItem('fap_sheet_template_version');
      if (saved === 'classic' || saved === 'approved_2025') return saved;
    } catch {}
    return 'approved_2025';
  });

  useEffect(() => {
    if (props.templateVersion) {
      setVersion(props.templateVersion);
    }
  }, [props.templateVersion]);

  const handleSwitchToClassic = () => {
    setVersion('classic');
    try {
      localStorage.setItem('fap_sheet_template_version', 'classic');
    } catch {}
  };

  const handleSwitchToApproved = () => {
    setVersion('approved_2025');
    try {
      localStorage.setItem('fap_sheet_template_version', 'approved_2025');
    } catch {}
  };

  if (version === 'classic') {
    return <FapSheetPreviewClassic {...props} onSwitchToApproved={handleSwitchToApproved} />;
  }

  return <FapSheetPreviewApproved2025 {...props} onSwitchToClassic={handleSwitchToClassic} />;
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
      font-size: 9.5px !important;
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
      background: #2563eb !important;
      height: 2.5px !important;
      width: 100% !important;
      margin: 4px 0 10px 0 !important;
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
      font-size: 9.5px !important;
      font-weight: 600 !important;
      color: #002060 !important;
    }
    .exact-fap-box.multiline {
      min-height: 44px !important;
      align-items: flex-start !important;
      line-height: 1.3 !important;
    }
    .exact-sub-row {
      display: flex !important;
      align-items: center !important;
      font-size: 9.5px !important;
      margin-left: 20px !important;
      gap: 4px !important;
    }
    .exact-sub-lbl {
      width: 135px !important;
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
      font-size: 10px !important;
      font-weight: 700 !important;
      color: #002060 !important;
      line-height: 1.2 !important;
    }
    .exact-sh-subtitle {
      font-size: 8.5px !important;
      font-style: italic !important;
      color: #475569 !important;
      margin: 2px 0 5px 0 !important;
    }
    .exact-sh-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 8.5px !important;
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
      margin-top: 10px !important;
      margin-bottom: 5px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .exact-section-header {
      background: #002060 !important;
      color: #ffffff !important;
      font-size: 9.5px !important;
      font-weight: 700 !important;
      padding: 3px 8px !important;
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
