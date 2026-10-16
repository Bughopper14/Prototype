import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Download,
  Eye,
} from 'lucide-react';
import {
  FAP_EXCEL_ROWS,
  EXCEL_COL_WIDTHS_PCT,
  EXCEL_COL_NAMES,
  type ExcelCellData,
} from './fap-excel-data';
import { LIUGONG_LOGO_B64 } from './liugong-logo-b64';

export interface FapSheetData {
  fapNumber?: string;
  applicationDate?: string;
  branchCode?: string;
  customerStatus?: 'NEW' | 'EXISTING' | string;
  companyName?: string;
  companyType?: 'CORPORATE' | 'COMMERCIAL' | 'MICRO' | 'LIUGONG_USER' | string;
  nib?: string;
  npwp?: string;
  establishmentActNo?: string;
  establishmentDate?: string;
  latestDeedNo?: string;
  latestDeedDate?: string;
  companyAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  village?: string;
  mainBusiness?: string;
  experienceYears?: number | string;
  experienceMonths?: number | string;
  phoneFax?: string;
  website?: string;
  email?: string;
  repaymentSource?: string;
  locationStatus?: 'OWNED' | 'RENTED' | string;
  industrySegment?: string;
  businessRole?: string;
  pic?: {
    picName?: string;
    position?: string;
    phone?: string;
    email?: string;
    currentAddress?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    district?: string;
    village?: string;
    rt?: string;
    rw?: string;
  };
  stakeholders?: any[];
  selectedDeedNo?: string;
  proposal?: any;
}

export function FapSheetPreview({ data, compact = false }: { data: FapSheetData; compact?: boolean }) {
  const [zoom, setZoom] = useState<number>(100);
  const [scope, setScope] = useState<'stage' | 'full'>('stage');
  const [selectedCell, setSelectedCell] = useState<{ coord: string; val: string }>({ coord: 'E12', val: data.companyName || '' });

  const isNew = data.customerStatus === 'NEW';
  const cType = data.companyType || '';
  const isCorporate = cType === 'CORPORATE';
  const isCommercial = cType === 'COMMERCIAL';
  const isMicro = cType === 'MICRO';
  const isLiuGongUser = cType === 'LIUGONG_USER';

  // Compute live mapped dynamic values
  const dynamicValues = useMemo(() => {
    const values: Record<string, any> = {};

    values.fapNumber = data.fapNumber || '0006/AF/03/2026';
    values.applicationDate = data.applicationDate
      ? new Date(data.applicationDate).toLocaleDateString('en-GB')
      : new Date().toLocaleDateString('en-GB');
    values.branchCode = data.branchCode || 'JKT01';

    // Left Column - Company Profile
    values.companyName = data.companyName || '';
    values.companyAddress = data.companyAddress || '';
    values.city = data.city || '';
    values.province = data.province || '';
    values.postalCode = data.postalCode || '';
    values.mainBusiness = data.mainBusiness || '';
    values.establishmentActNo = data.establishmentActNo || '';
    values.establishmentDate = data.establishmentDate || '';
    values.experienceYears = data.experienceYears !== undefined && data.experienceYears !== '' ? String(data.experienceYears) : '';
    values.experienceMonths = data.experienceMonths !== undefined && data.experienceMonths !== '' ? String(data.experienceMonths) : '';
    values.latestDeedNo = data.latestDeedNo || '';
    values.latestDeedDate = data.latestDeedDate || '';
    values.nib = data.nib || '';
    values.npwp = data.npwp || '';
    values.phoneFax = data.phoneFax || '';
    values.website = data.website || '';
    values.email = data.email || '';
    values.repaymentSource = data.repaymentSource || '';

    const isOwned = data.locationStatus === 'OWNED';
    const isRented = data.locationStatus === 'RENTED';
    values.locationStatus = `${isOwned ? '●' : '○'} Milik Sendiri   /   ${isRented ? '●' : '○'} Sewa`;

    // Right Column - PIC
    const pic = data.pic || {};
    values.picName = pic.picName || '';
    values.picPhone = pic.phone || '';
    values.picPosition = pic.position || '';
    values.picEmail = pic.email || '';

    const addrParts = [pic.currentAddress, pic.rt ? `RT ${pic.rt}` : null, pic.rw ? `RW ${pic.rw}` : null, pic.village, pic.district].filter(Boolean);
    values.picAddress = addrParts.join(', ') || pic.currentAddress || '';
    values.picCity = pic.city || '';
    values.picProvince = pic.province || '';
    values.picPostalCode = pic.postalCode || '';

    values.selectedDeedNo = data.selectedDeedNo || data.latestDeedNo || data.establishmentActNo || '';

    // Right Column - Stakeholders (up to 8 rows)
    const shList = data.stakeholders || [];
    for (let i = 0; i < 8; i++) {
      const sh = shList[i];
      const prefix = `sh${i + 1}`;
      if (sh) {
        const name = sh.name || [sh.firstName, sh.lastName].filter(Boolean).join(' ') || '';
        values[`${prefix}_name`] = name;
        values[`${prefix}_pos`] = sh.position || sh.designation || '';
        const amount = sh.depositedCapital || sh.shareAmount || 0;
        values[`${prefix}_amount`] = amount ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(amount)) : '';
        const pct = sh.sharePercentage || sh.percentage || 0;
        values[`${prefix}_pct`] = pct ? `${Number(pct).toFixed(2)}%` : '';
      } else {
        values[`${prefix}_name`] = '';
        values[`${prefix}_pos`] = '';
        values[`${prefix}_amount`] = '';
        values[`${prefix}_pct`] = '';
      }
    }

    return values;
  }, [data]);

  // Rows starting from Row 12 onwards (since rows 1-11 are in the dedicated pixel-perfect header)
  const renderedRows = useMemo(() => {
    const bodyRows = FAP_EXCEL_ROWS.filter(r => r.r >= 12);
    if (scope === 'stage') {
      return bodyRows.filter(r => r.r <= 45);
    }
    return bodyRows;
  }, [scope]);

  // Handle native print / download PDF
  const handlePrint = () => {
    const el = document.getElementById('fap-excel-printable-doc');
    if (!el) return;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FAP-Document_${dynamicValues.fapNumber || '0006/AF/03/2026'}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm 6mm; }
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .excel-fap-paper { width: 100% !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
            table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
            .excel-header-navy-bar { background: #002060 !important; height: 5px !important; margin: 8px 0 !important; }
            .excel-header-orange-bar { background: #eaa358 !important; height: 2.5px !important; margin: 8px 0 !important; }
            ${document.querySelector('style')?.innerHTML || ''}
          </style>
          <link rel="stylesheet" href="/crm/assets/index.css" />
        </head>
        <body>
          <div class="excel-fap-paper">
            ${el.innerHTML}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 350);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="excel-fap-viewer">
      {/* 1. Ribbon Bar */}
      <div className="excel-fap-ribbon">
        <div className="excel-ribbon-left">
          <FileSpreadsheet size={16} className="excel-green-icon" />
          <div className="excel-file-badge">
            <span className="excel-file-name">APPROVED v01.2025.xlsx</span>
            <span className="excel-tab-badge">Sheet: APPROVED v01.2025</span>
          </div>
          <span className="excel-live-tag">
            <span className="excel-live-dot" /> Live Mirror
          </span>
        </div>

        <div className="excel-ribbon-right">
          <div className="excel-scope-switch">
            <button
              type="button"
              className={scope === 'stage' ? 'active' : ''}
              onClick={() => setScope('stage')}
            >
              FAP Stage (Rows 1–45)
            </button>
            <button
              type="button"
              className={scope === 'full' ? 'active' : ''}
              onClick={() => setScope('full')}
            >
              Full Sheet (118 Rows)
            </button>
          </div>

          <div className="excel-zoom-controls">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(70, z - 10))}
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span
              className="excel-zoom-btn-label"
              onClick={() => setZoom(100)}
              title="Click to reset to 100% Fit"
              style={{ cursor: 'pointer' }}
            >
              {zoom}% {zoom === 100 ? '(Fit)' : ''}
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            className="excel-print-btn"
            onClick={handlePrint}
            title="Download PDF atau Cetak lembar FAP resmi"
          >
            <Printer size={13} /> Unduh / Cetak PDF
          </button>
        </div>
      </div>

      {/* 2. Formula Bar */}
      <div className="excel-fap-formulabar">
        <span className="excel-cell-coord">{selectedCell.coord}</span>
        <span className="excel-fx-label">fx</span>
        <span className="excel-fx-value">{selectedCell.val || ' '}</span>
      </div>

      {/* 3. Worksheet Body Viewport */}
      <div className="excel-fap-viewport">
        <div
          id="fap-excel-printable-doc"
          className="excel-fap-paper"
          style={{ width: zoom === 100 ? '100%' : `${zoom}%` }}
        >
          {/* ============================================================== */}
          {/* EXACT EXCEL HEADER SECTION (Matching Rows 1-11 from Excel)     */}
          {/* ============================================================== */}
          <div className="excel-document-header">
            {/* Top Band: Logo (Left), APPLICATION FORM (Center), No. Register (Right) */}
            <div className="excel-header-top-band">
              <div className="excel-header-logo-col">
                <img
                  src={LIUGONG_LOGO_B64}
                  alt="LiuGong Finance Indonesia"
                  className="excel-liugong-logo-img"
                />
              </div>

              <div className="excel-header-title-col">
                <h1 className="excel-fap-title">APPLICATION FORM</h1>
              </div>

              <div className="excel-header-reg-col">
                <div className="excel-fap-reg-box">
                  <span className="excel-fap-reg-label">No. Register :</span>
                  <span className="excel-fap-reg-val">{dynamicValues.fapNumber}</span>
                </div>
              </div>
            </div>

            {/* Row 6: Solid Dark Navy Blue Dividing Bar */}
            <div className="excel-header-navy-bar" />

            {/* Rows 8 & 9: Four Information & Classification Boxes */}
            <div className="excel-header-boxes-grid">
              {/* Box 1: Tanggal & Cabang */}
              <div className="excel-meta-box">
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Tanggal/ Date</span>
                  <span className="excel-meta-val highlight">{dynamicValues.applicationDate}</span>
                </div>
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Cabang/ Branch</span>
                  <span className="excel-meta-val highlight">{dynamicValues.branchCode}</span>
                </div>
              </div>

              {/* Box 2: Customer Baru / Customer Lama */}
              <div className="excel-meta-box">
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Customer Baru/ New Customer</span>
                  <span className={`excel-meta-chk ${isNew ? 'checked' : ''}`}>
                    {isNew ? '☑' : '☐'}
                  </span>
                </div>
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Customer Lama / Existing Customer</span>
                  <span className={`excel-meta-chk ${!isNew ? 'checked' : ''}`}>
                    {!isNew ? '☑' : '☐'}
                  </span>
                </div>
              </div>

              {/* Box 3: Corporate & Commercial */}
              <div className="excel-meta-box">
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Corporate</span>
                  <span className={`excel-meta-chk ${isCorporate ? 'checked' : ''}`}>
                    {isCorporate ? '☑' : '☐'}
                  </span>
                </div>
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Commercial</span>
                  <span className={`excel-meta-chk ${isCommercial ? 'checked' : ''}`}>
                    {isCommercial ? '☑' : '☐'}
                  </span>
                </div>
              </div>

              {/* Box 4: Micro & LiuGong Used */}
              <div className="excel-meta-box">
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">Micro</span>
                  <span className={`excel-meta-chk ${isMicro ? 'checked' : ''}`}>
                    {isMicro ? '☑' : '☐'}
                  </span>
                </div>
                <div className="excel-meta-row">
                  <span className="excel-meta-lbl">LiuGong Used</span>
                  <span className={`excel-meta-chk ${isLiuGongUser ? 'checked' : ''}`}>
                    {isLiuGongUser ? '☑' : '☐'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 10: Solid Corporate Orange Line */}
            <div className="excel-header-orange-bar" />
          </div>

          {/* ============================================================== */}
          {/* EXACT EXCEL TABLE GRID (Rows 12 to 118 from openpyxl matrix)    */}
          {/* ============================================================== */}
          <table className="excel-fap-table">
            <colgroup>
              {EXCEL_COL_WIDTHS_PCT.map((pct, idx) => (
                <col key={idx} style={{ width: `${pct}%` }} />
              ))}
            </colgroup>

            <tbody>
              {renderedRows.map(row => (
                <tr key={row.r}>
                  {row.cells.map(cell => {
                    const dynamicVal = cell.k ? dynamicValues[cell.k] : undefined;
                    const displayVal = dynamicVal !== undefined ? dynamicVal : cell.v;
                    const isFilled = cell.k && dynamicVal;
                    const isSelected = selectedCell.coord === cell.c;

                    return (
                      <td
                        key={cell.c}
                        id={`cell_${cell.c}`}
                        colSpan={cell.cs || 1}
                        rowSpan={cell.rs || 1}
                        className={`excel-fap-cell ${cell.k ? 'excel-cell-dynamic' : ''} ${
                          isFilled ? 'fap-dynamic-highlight' : ''
                        } ${isSelected ? 'excel-cell-active' : ''}`}
                        style={{
                          ...(cell.b
                            ? cell.b.split(';').reduce((acc: any, item: string) => {
                                const [prop, val] = item.split(':').map(s => s.trim());
                                if (prop && val) {
                                  const camel = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
                                  acc[camel] = val;
                                }
                                return acc;
                              }, {})
                            : {}),
                          backgroundColor: cell.bg ? cell.bg : undefined,
                          color: cell.c ? cell.c : undefined,
                          fontSize: cell.fs ? `${cell.fs}px` : undefined,
                          fontWeight: cell.fw ? cell.fw : undefined,
                          textAlign: cell.ta ? cell.ta : undefined,
                          verticalAlign: cell.va ? cell.va : 'middle',
                        }}
                        onClick={() =>
                          setSelectedCell({
                            coord: cell.c,
                            val: String(displayVal || ''),
                          })
                        }
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
