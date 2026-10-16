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

export function FapSheetPreview({
  data,
  compact = false,
}: {
  data: FapSheetData;
  compact?: boolean;
}) {
  const [scope, setScope] = useState<'stage' | 'full'>('stage');
  const [zoom, setZoom] = useState<number>(100); // 100 means 100% fit width
  const [selectedCell, setSelectedCell] = useState<string>('E12');
  const printRef = useRef<HTMLDivElement>(null);

  // Dynamic values mapping
  const dyn = useMemo(() => {
    const v: Record<string, string> = {};

    v.fapNumber = data.fapNumber || '0006/AF/03/2026';
    v.applicationDate = data.applicationDate
      ? new Date(data.applicationDate).toLocaleDateString('en-GB')
      : new Date().toLocaleDateString('en-GB');
    v.branchCode = data.branchCode || 'JKT01';

    const isNew = data.customerStatus === 'NEW';
    v.checkCustomerNew = isNew ? 'Customer Baru/New Customer (✓)' : 'Customer Baru/New Customer ( )';
    v.checkCustomerExisting = !isNew ? 'Customer Lama /Existing Customer (✓)' : 'Customer Lama /Existing Customer ( )';

    const cType = data.companyType || 'CORPORATE';
    v.checkCorporate = cType === 'CORPORATE' ? 'Corporate (✓)' : 'Corporate ( )';
    v.checkCommercial = cType === 'COMMERCIAL' ? 'Commercial (✓)' : 'Commercial ( )';
    v.checkMicro = cType === 'MICRO' ? 'Micro (✓)' : 'Micro ( )';
    v.checkLiuGongUser = cType === 'LIUGONG_USER' ? 'LiuGong User (✓)' : 'LiuGong User ( )';

    v.companyName = data.companyName || '';
    v.companyAddress = data.companyAddress || '';
    v.city = data.city || '';
    v.province = data.province || '';
    v.postalCode = data.postalCode || '';
    v.mainBusiness = data.mainBusiness || '';
    v.establishmentActNo = data.establishmentActNo || '';
    v.establishmentDate = data.establishmentDate || '';
    v.experienceYears = data.experienceYears !== undefined && data.experienceYears !== '' ? String(data.experienceYears) : '';
    v.experienceMonths = data.experienceMonths !== undefined && data.experienceMonths !== '' ? String(data.experienceMonths) : '';
    v.latestDeedNo = data.latestDeedNo || '';
    v.latestDeedDate = data.latestDeedDate || '';
    v.nib = data.nib || '';
    v.npwp = data.npwp || '';
    v.phoneFax = data.phoneFax || '';
    v.website = data.website || '';
    v.email = data.email || '';
    v.repaymentSource = data.repaymentSource || '';

    const isOwned = data.locationStatus === 'OWNED';
    const isRented = data.locationStatus === 'RENTED';
    v.locationStatus = `${isOwned ? '(✓)' : '( )'} Milik Sendiri  /  ${isRented ? '(✓)' : '( )'} Sewa`;

    const pic = data.pic || {};
    v.picName = pic.picName || '';
    v.picPhone = pic.phone || '';
    v.picPosition = pic.position || '';
    v.picEmail = pic.email || '';

    const addrParts = [
      pic.currentAddress,
      pic.rt ? `RT ${pic.rt}` : null,
      pic.rw ? `RW ${pic.rw}` : null,
      pic.village,
      pic.district,
    ].filter(Boolean);
    v.picAddress = addrParts.join(', ') || pic.currentAddress || '';
    v.picCity = pic.city || '';
    v.picProvince = pic.province || '';
    v.picPostalCode = pic.postalCode || '';

    v.selectedDeedNo = data.selectedDeedNo || data.latestDeedNo || data.establishmentActNo || '';

    // Stakeholders up to 8
    const shList = data.stakeholders || [];
    for (let i = 0; i < 8; i++) {
      const sh = shList[i];
      const p = `sh${i + 1}`;
      if (sh) {
        v[`${p}_name`] = sh.name || [sh.firstName, sh.lastName].filter(Boolean).join(' ') || '';
        v[`${p}_pos`] = sh.position || sh.designation || '';
        const amt = sh.depositedCapital || sh.shareAmount || 0;
        v[`${p}_amount`] = amt ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(amt)) : '';
        const pct = sh.sharePercentage || sh.percentage || 0;
        v[`${p}_pct`] = pct ? `${Number(pct).toFixed(2)}%` : '';
      } else {
        v[`${p}_name`] = '';
        v[`${p}_pos`] = '';
        v[`${p}_amount`] = '';
        v[`${p}_pct`] = '';
      }
    }

    return v;
  }, [data]);

  // Rows to display
  const displayRows = useMemo(() => {
    if (scope === 'stage') {
      return FAP_EXCEL_ROWS.filter((r) => r.r <= 45);
    }
    return FAP_EXCEL_ROWS;
  }, [scope]);

  // Current selected cell formula text
  const currentCellText = useMemo(() => {
    for (const r of FAP_EXCEL_ROWS) {
      for (const cell of r.cells) {
        if (cell.c === selectedCell) {
          if (cell.k && dyn[cell.k]) return dyn[cell.k];
          return cell.v || '';
        }
      }
    }
    return '';
  }, [selectedCell, dyn]);

  const handlePrintPdf = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FAP-Document_${data.fapNumber || 'Export'}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
            .excel-fap-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .excel-fap-table td { font-family: Calibri, 'Segoe UI', Arial, sans-serif; overflow: hidden; word-break: break-word; }
            .fap-dynamic-highlight { color: #002c5f !important; font-weight: bold !important; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="excel-fap-viewer">
      {/* Excel Title & Action Ribbon */}
      <div className="excel-fap-ribbon">
        <div className="excel-ribbon-left">
          <FileSpreadsheet size={16} className="excel-green-icon" />
          <div className="excel-file-badge">
            <span className="excel-file-name">FAP-Document · APPROVED v01.2025.xlsx</span>
            <span className="excel-tab-badge">Sheet: APPROVED v01.2025</span>
          </div>
          <div className="excel-live-tag">
            <span className="excel-live-dot" />
            <span>Live Mirror</span>
          </div>
        </div>

        <div className="excel-ribbon-right">
          <div className="excel-scope-switch">
            <button
              type="button"
              className={scope === 'stage' ? 'active' : ''}
              onClick={() => setScope('stage')}
              title="Tampilkan Tahap FAP: Profil, PIC & Legal"
            >
              FAP Stage (Hal 1)
            </button>
            <button
              type="button"
              className={scope === 'full' ? 'active' : ''}
              onClick={() => setScope('full')}
              title="Tampilkan Lembar Utuh Excel (118 Baris)"
            >
              Lembar Lengkap (Full)
            </button>
          </div>

          <div className="excel-zoom-controls">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              title="Kecilkan"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              className="excel-zoom-btn-label"
              onClick={() => setZoom(100)}
              title="Reset ke Pas Lebar 100%"
            >
              {zoom === 100 ? 'Fit Width' : `${zoom}%`}
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              title="Besarkan"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            className="excel-print-btn"
            onClick={handlePrintPdf}
            title="Cetak atau Unduh sebagai PDF"
          >
            <Printer size={13} />
            <span>Unduh / Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Excel Formula Bar */}
      <div className="excel-fap-formulabar">
        <div className="excel-cell-coord">{selectedCell}</div>
        <div className="excel-fx-label">fx</div>
        <div className="excel-fx-value">{currentCellText || '—'}</div>
      </div>

      {/* Spreadsheet Canvas (No horizontal scroll at 100% fit width) */}
      <div className="excel-fap-viewport">
        <div
          ref={printRef}
          className="excel-fap-paper"
          style={{
            width: zoom === 100 ? '100%' : `${zoom}%`,
            transition: 'width 0.15s ease',
          }}
        >
          <table className="excel-fap-table">
            <colgroup>
              {EXCEL_COL_WIDTHS_PCT.map((pct, idx) => (
                <col key={idx} style={{ width: `${pct}%` }} />
              ))}
            </colgroup>
            <tbody>
              {displayRows.map((row) => (
                <tr key={row.r}>
                  {row.cells.map((cell) => {
                    const isDynamic = Boolean(cell.k);
                    const dynamicVal = cell.k ? dyn[cell.k] : undefined;
                    const displayVal = dynamicVal !== undefined ? dynamicVal : cell.v;
                    const hasValue = Boolean(displayVal && String(displayVal).trim());
                    const isSelected = selectedCell === cell.c;

                    const inlineStyle: React.CSSProperties = {
                      fontSize: cell.fs ? `${cell.fs}px` : '9px',
                      fontWeight: cell.fw === 'bold' ? 'bold' : 'normal',
                      textAlign: (cell.ta as any) || 'left',
                      verticalAlign: (cell.va as any) || 'middle',
                      color: isDynamic && hasValue ? '#002c5f' : cell.col || '#0f172a',
                      backgroundColor: isDynamic && hasValue ? '#f0fdf4' : cell.bg || undefined,
                      padding: '2px 3px',
                      lineHeight: '1.25',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      userSelect: 'text',
                    };

                    // Parse border string
                    if (cell.b) {
                      const bParts = cell.b.split('; ');
                      for (const bp of bParts) {
                        const [prop, val] = bp.split(': ');
                        if (prop === 'border-top') inlineStyle.borderTop = val;
                        if (prop === 'border-bottom') inlineStyle.borderBottom = val;
                        if (prop === 'border-left') inlineStyle.borderLeft = val;
                        if (prop === 'border-right') inlineStyle.borderRight = val;
                      }
                    }

                    return (
                      <td
                        key={cell.c}
                        id={`cell_${cell.c}`}
                        colSpan={cell.cs}
                        rowSpan={cell.rs}
                        style={inlineStyle}
                        className={`excel-fap-cell ${isDynamic ? 'fap-dynamic-cell' : ''} ${
                          isDynamic && hasValue ? 'fap-dynamic-highlight' : ''
                        } ${isSelected ? 'excel-cell-active' : ''}`}
                        onClick={() => setSelectedCell(cell.c)}
                        title={`Sel ${cell.c}${cell.k ? ` (${cell.k})` : ''}`}
                      >
                        {displayVal || ''}
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
