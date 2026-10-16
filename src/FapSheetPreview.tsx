import React, { useState, useMemo, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, FileSpreadsheet, Eye, Grid } from 'lucide-react';
import { FAP_EXCEL_ROWS, EXCEL_COL_WIDTHS, EXCEL_COL_NAMES, ExcelCellDef } from './fap-excel-data';

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
  const [zoom, setZoom] = useState<number>(compact ? 80 : 90);
  const [viewScope, setViewScope] = useState<'profile' | 'all'>('profile');
  const [showHeaders, setShowHeaders] = useState<boolean>(true);
  const [selectedCoord, setSelectedCoord] = useState<string>('E12');

  const dynamicValues = useMemo(() => {
    const values: Record<string, any> = {};

    values.fapNumber = data.fapNumber || '0006/AF/03/2026';
    values.applicationDate = data.applicationDate
      ? new Date(data.applicationDate).toLocaleDateString('en-GB')
      : new Date().toLocaleDateString('en-GB');
    values.branchCode = data.branchCode || 'JKT01';

    const isNew = data.customerStatus === 'NEW';
    values.checkCustomerNew = isNew ? '[ ✓ ] Customer Baru/New Customer' : '[   ] Customer Baru/New Customer';
    values.checkCustomerExisting = !isNew ? '[ ✓ ] Customer Lama /Existing Customer' : '[   ] Customer Lama /Existing Customer';

    const type = data.companyType || '';
    values.checkCorporate = type === 'CORPORATE' ? '[ ✓ ] Corporate' : '[   ] Corporate';
    values.checkCommercial = type === 'COMMERCIAL' ? '[ ✓ ] Commercial' : '[   ] Commercial';
    values.checkMicro = type === 'MICRO' ? '[ ✓ ] Micro' : '[   ] Micro';
    values.checkLiuGongUser = type === 'LIUGONG_USER' ? '[ ✓ ] LiuGong User' : '[   ] LiuGong User';

    values.companyName = data.companyName || '';
    values.companyAddress = data.companyAddress || '';
    values.city = data.city || '';
    values.province = data.province || '';
    values.postalCode = data.postalCode || '';
    values.mainBusiness = data.mainBusiness || '';
    values.establishmentActNo = data.establishmentActNo || '';
    values.establishmentDate = data.establishmentDate || '';
    values.experienceYears =
      data.experienceYears !== undefined && data.experienceYears !== '' ? String(data.experienceYears) : '';
    values.experienceMonths =
      data.experienceMonths !== undefined && data.experienceMonths !== '' ? String(data.experienceMonths) : '';
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
    values.locationStatus = `${isOwned ? '(●)' : '(○)'} Milik Sendiri   /   ${isRented ? '(●)' : '(○)'} Sewa`;

    const pic = data.pic || {};
    values.picName = pic.picName || '';
    values.picPhone = pic.phone || '';
    values.picPosition = pic.position || '';
    values.picEmail = pic.email || '';

    const addrParts = [
      pic.currentAddress,
      pic.rt ? `RT ${pic.rt}` : null,
      pic.rw ? `RW ${pic.rw}` : null,
      pic.village,
      pic.district,
    ].filter(Boolean);
    values.picAddress = addrParts.join(', ') || pic.currentAddress || '';
    values.picCity = pic.city || '';
    values.picProvince = pic.province || '';
    values.picPostalCode = pic.postalCode || '';

    values.selectedDeedNo = data.selectedDeedNo || data.latestDeedNo || data.establishmentActNo || '';

    const shList = data.stakeholders || [];
    for (let i = 0; i < 8; i++) {
      const sh = shList[i];
      const prefix = `sh${i + 1}`;
      if (sh) {
        const name = sh.name || [sh.firstName, sh.lastName].filter(Boolean).join(' ') || '';
        values[`${prefix}_name`] = name;
        values[`${prefix}_pos`] = sh.position || sh.designation || '';
        const amount = sh.depositedCapital || sh.shareAmount || 0;
        values[`${prefix}_amount`] = amount
          ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(amount))
          : '';
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

  // Filter rows based on viewScope: profile (rows 1-45) or all (rows 1-118)
  const displayRows = useMemo(() => {
    return viewScope === 'profile' ? FAP_EXCEL_ROWS.slice(0, 45) : FAP_EXCEL_ROWS;
  }, [viewScope]);

  const activeCellValue = dynamicValues[selectedCoord] || '';

  return (
    <div className="excel-viewer-wrapper">
      {/* Excel Ribbon & Control Bar */}
      <div className="excel-ribbon">
        <div className="excel-title-group">
          <FileSpreadsheet size={16} className="excel-brand-icon" />
          <div className="excel-doc-info">
            <span className="excel-filename">APPROVED v01.2025.xlsx</span>
            <span className="excel-sheetname">Sheet: APPROVED v01.2025</span>
          </div>
          <span className="excel-sync-pill">
            <span className="excel-sync-dot" />
            Live Mirror
          </span>
        </div>

        <div className="excel-controls-group">
          {/* Scope Toggle */}
          <div className="excel-scope-toggle">
            <button
              type="button"
              className={viewScope === 'profile' ? 'active' : ''}
              onClick={() => setViewScope('profile')}
              title="Tampilkan Bagian Intake & Profile (Baris 1 - 45)"
            >
              FAP Stage (Baris 1-45)
            </button>
            <button
              type="button"
              className={viewScope === 'all' ? 'active' : ''}
              onClick={() => setViewScope('all')}
              title="Tampilkan Seluruh Lembar Kerja (Baris 1 - 118)"
            >
              Full Sheet (118 Baris)
            </button>
          </div>

          {/* Header Toggle */}
          <button
            type="button"
            className={`excel-btn-icon ${showHeaders ? 'active' : ''}`}
            onClick={() => setShowHeaders((s) => !s)}
            title="Tampilkan / Sembunyikan Header Baris & Kolom Excel"
          >
            <Grid size={13} />
          </button>

          {/* Zoom controls */}
          <div className="excel-zoom-bar">
            <button type="button" onClick={() => setZoom((z) => Math.max(50, z - 10))} title="Zoom Out">
              <ZoomOut size={13} />
            </button>
            <span className="excel-zoom-indicator">{zoom}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 10))} title="Zoom In">
              <ZoomIn size={13} />
            </button>
            <button type="button" onClick={() => setZoom(compact ? 80 : 90)} title="Reset Zoom">
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">{selectedCoord}</div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-fx-input" title="Isi Cell Aktif">
          {activeCellValue || `Cell ${selectedCoord}`}
        </div>
      </div>

      {/* Excel Sheet Scrollable Canvas */}
      <div className="excel-viewport">
        <div
          className="excel-zoom-container"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
          }}
        >
          <table className="excel-sheet-table">
            <colgroup>
              {showHeaders && <col style={{ width: '38px', minWidth: '38px' }} />}
              {EXCEL_COL_WIDTHS.map((pct, idx) => (
                <col key={idx} style={{ width: `${pct * 14}px`, minWidth: `${pct * 14}px` }} />
              ))}
            </colgroup>

            {/* Column Headers (A, B, C...) */}
            {showHeaders && (
              <thead>
                <tr className="excel-header-row">
                  <th className="excel-corner-cell"></th>
                  {EXCEL_COL_NAMES.map((colName) => (
                    <th key={colName} className="excel-col-header">
                      {colName}
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            <tbody>
              {displayRows.map((rowCells, rIdx) => {
                const rowNum = rIdx + 1;
                return (
                  <tr key={rowNum} className="excel-data-row">
                    {/* Row Header (1, 2, 3...) */}
                    {showHeaders && <td className="excel-row-header">{rowNum}</td>}

                    {/* Cells */}
                    {rowCells.map((cell) => {
                      const isDynamic = Boolean(cell.k);
                      const dynamicVal = cell.k ? dynamicValues[cell.k] : undefined;
                      const displayVal = dynamicVal !== undefined ? dynamicVal : (cell.v || '');
                      const isSelected = selectedCoord === cell.c;
                      const hasValue = Boolean(displayVal && String(displayVal).trim() !== '');

                      // Compute exact border style
                      const borderStyles: React.CSSProperties = {};
                      if (cell.b) {
                        const [bt, bb, bl, br, isDouble] = cell.b;
                        if (bt) borderStyles.borderTop = '1px solid #1e293b';
                        if (bb) borderStyles.borderBottom = isDouble ? '3px double #1e293b' : '1px solid #1e293b';
                        if (bl) borderStyles.borderLeft = '1px solid #1e293b';
                        if (br) borderStyles.borderRight = '1px solid #1e293b';
                      }

                      if (cell.bg) {
                        borderStyles.backgroundColor = cell.bg;
                      }

                      const cellStyle: React.CSSProperties = {
                        ...borderStyles,
                        fontWeight: cell.bld ? 'bold' : 'normal',
                        fontStyle: cell.it ? 'italic' : 'normal',
                        fontSize: cell.sz ? `${Math.max(9, Math.round(cell.sz * 1.05))}px` : '11px',
                        textAlign: (cell.ha as any) || (cell.bld ? 'left' : 'left'),
                        verticalAlign: (cell.va as any) || 'middle',
                      };

                      return (
                        <td
                          key={cell.c}
                          id={`excel_cell_${cell.c}`}
                          rowSpan={cell.rs}
                          colSpan={cell.cs}
                          style={cellStyle}
                          className={`excel-cell ${isDynamic ? 'excel-cell-dynamic' : ''} ${
                            isSelected ? 'excel-cell-selected' : ''
                          } ${isDynamic && hasValue ? 'excel-cell-filled' : ''}`}
                          onClick={() => setSelectedCoord(cell.c)}
                        >
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Status Bar */}
      <div className="excel-status-bar">
        <span>READY</span>
        <span>Sheet 1 of 1 · APPROVED v01.2025</span>
        <span>Total Columns: 22 (A-V) · Zoom: {zoom}%</span>
      </div>
    </div>
  );
}
