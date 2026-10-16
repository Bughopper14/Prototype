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
  EXCEL_COL_WIDTHS_PCT,
  FAP_EXCEL_ROWS,
  type ExcelRowData,
  type ExcelCellData,
} from './fap-excel-data';
import { LIUGONG_LOGO_B64 } from './liugong-logo-b64';

export interface FapSheetData {
  fapNumber?: string;
  applicationDate?: string;
  branchCode?: string;
  customerStatus?: string;
  companyName?: string;
  companyType?: string;
  nib?: string;
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
}

export function FapSheetPreview({
  data,
  application = {},
  customer = {},
  profile = {},
  pic = {},
  stakeholders = [],
  compact = false,
}: FapSheetPreviewProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [activeCell, setActiveCell] = useState<{ coord: string; val: string }>({
    coord: 'A3',
    val: 'APPLICATION FORM',
  });
  const [scope, setScope] = useState<'fap' | 'full'>('fap');
  const printRef = useRef<HTMLDivElement>(null);

  // Map dynamic inputs to Excel coordinates
  const dynamicValues = useMemo(() => {
    const d = data || {};
    const p = profile || {};
    const c = customer || {};
    const a = application || {};
    const pc = pic || {};
    const shList = stakeholders.length ? stakeholders : (d.stakeholders || []);

    const custStatus = d.customerStatus || p.customerStatus || c.customerStatus || a.customerStatus || '';
    const isNew = custStatus !== 'EXISTING';
    const compType = (d.companyType || c.companyType || p.companyType || a.companyType || '').toUpperCase();
    const isCorporate = compType.includes('CORPORATE');
    const isCommercial = compType.includes('COMMERCIAL');
    const isMicro = compType.includes('MICRO');
    const isLiuGongUser = compType.includes('LIUGONG') || compType.includes('USER');

    const appDateRaw = d.applicationDate || a.applicationDate;
    const estDateRaw = d.establishmentDate || p.establishmentDate;
    const deedDateRaw = d.latestDeedDate || p.latestDeedDate;

    const result: Record<string, string> = {
      fapNumber: d.fapNumber || a.fapNumber || '0006/AF/03/2026',
      applicationDate: appDateRaw
        ? new Date(appDateRaw).toLocaleDateString('id-ID')
        : '16/10/2026',
      branchCode: d.branchCode || p.branchCode || a.branchCode || 'JKT01',
      checkCustomerNew: isNew ? '☑' : '☐',
      checkCustomerExisting: !isNew ? '☑' : '☐',
      checkCorporate: isCorporate ? '☑' : '☐',
      checkCommercial: isCommercial ? '☑' : '☐',
      checkMicro: isMicro ? '☑' : '☐',
      checkLiuGongUser: isLiuGongUser ? '☑' : '☐',
      companyName: d.companyName || c.companyName || p.companyName || a.companyName || '',
      companyAddress: d.companyAddress || p.companyAddress || c.address || '',
      city: d.city || p.city || c.city || '',
      province: d.province || p.province || c.province || '',
      postalCode: d.postalCode || p.postalCode || c.postalCode || '',
      mainBusiness: d.mainBusiness || p.mainBusiness || '',
      establishmentActNo: d.establishmentActNo || p.establishmentActNo || '',
      establishmentDate: estDateRaw
        ? new Date(estDateRaw).toLocaleDateString('id-ID')
        : '',
      experienceYears: d.experienceYears
        ? `${d.experienceYears} Tahun`
        : (p.experienceYears ? `${p.experienceYears} Tahun` : ''),
      experienceMonths: d.experienceMonths
        ? `${d.experienceMonths} Bulan`
        : (p.experienceMonths ? `${p.experienceMonths} Bulan` : ''),
      latestDeedNo: d.latestDeedNo || p.latestDeedNo || '',
      latestDeedDate: deedDateRaw
        ? new Date(deedDateRaw).toLocaleDateString('id-ID')
        : '',
      nib: d.nib || c.nib || p.nib || '',
      npwp: d.npwp || c.npwp || p.npwp || '',
      phoneFax: d.phoneFax || p.phoneFax || '',
      website: d.website || p.website || '',
      email: d.email || p.email || c.email || '',
      repaymentSource: d.repaymentSource || p.repaymentSource || '',
      locationStatus: d.locationStatus || p.locationStatus || '',
      picName: d.picName || pc.picName || '',
      picPhone: d.phone || pc.phone || '',
      picPosition: d.position || pc.position || '',
      picEmail: d.email || pc.email || '',
      picAddress: d.currentAddress || pc.currentAddress || '',
      picCity: d.picCity || pc.city || '',
      picProvince: d.picProvince || pc.province || '',
      picPostalCode: d.picPostalCode || pc.postalCode || '',
      selectedDeedNo: d.selectedDeedNo || p.selectedDeedNo || p.latestDeedNo || '',
    };

    // Populate up to 8 stakeholders
    shList.slice(0, 8).forEach((sh: any, idx: number) => {
      const num = idx + 1;
      result[`sh${num}_name`] = sh.name || '';
      result[`sh${num}_pos`] = sh.position || '';
      result[`sh${num}_amount`] = sh.shareAmount
        ? Number(sh.shareAmount).toLocaleString('id-ID')
        : '';
      result[`sh${num}_pct`] = sh.sharePercentage ? `${sh.sharePercentage}%` : '';
    });

    return result;
  }, [data, application, customer, profile, pic, stakeholders]);

  // Rows to display based on scope: Rows 1 to 45 (FAP) or 1 to 118 (Full Sheet)
  const displayRows = useMemo(() => {
    return scope === 'fap'
      ? FAP_EXCEL_ROWS.filter(r => r.r <= 45)
      : FAP_EXCEL_ROWS;
  }, [scope]);

  const handlePrint = () => {
    window.print();
  };

  const getRowHeight = (rowNum: number): string | undefined => {
    if (rowNum === 6) return '5px';
    if (rowNum === 10) return '3px';
    if (rowNum === 1 || rowNum === 5 || rowNum === 7 || rowNum === 11) return '10px';
    if (rowNum === 3) return '36px';
    if (rowNum === 4) return '24px';
    if (rowNum === 8 || rowNum === 9) return '26px';
    return undefined;
  };

  return (
    <div className="excel-fap-viewer">
      {/* Excel Green Ribbon Toolbar */}
      <div className="excel-fap-ribbon">
        <div className="excel-ribbon-left">
          <FileSpreadsheet size={16} className="excel-green-icon" />
          <div className="excel-file-badge">
            <span className="excel-file-name">FAP-Document_APPROVED_v01.2025.xlsx</span>
            <span className="excel-tab-badge">Sheet: APPROVED v01.2025 (100% Exact Grid)</span>
          </div>
          <span className="excel-live-tag">
            <span className="excel-live-dot" /> LIVE MIRROR
          </span>
        </div>

        <div className="excel-ribbon-right">
          <div className="excel-scope-switch">
            <button
              type="button"
              className={scope === 'fap' ? 'active' : ''}
              onClick={() => setScope('fap')}
            >
              FAP Stage (1-45)
            </button>
            <button
              type="button"
              className={scope === 'full' ? 'active' : ''}
              onClick={() => setScope('full')}
            >
              Lembar Lengkap (1-118)
            </button>
          </div>

          <div className="excel-zoom-controls">
            <button
              type="button"
              title="Perkecil (-10%)"
              onClick={() => setZoom(z => Math.max(60, z - 10))}
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              className="excel-zoom-btn-label"
              title="Reset ke Fit Width"
              onClick={() => setZoom(100)}
            >
              {zoom === 100 ? 'Fit Width' : `${zoom}%`}
            </button>
            <button
              type="button"
              title="Perbesar (+10%)"
              onClick={() => setZoom(z => Math.min(160, z + 10))}
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            className="excel-print-btn"
            title="Cetak / Simpan PDF Dokumen Excel FAP"
            onClick={handlePrint}
          >
            <Printer size={13} />
            <span>Unduh / Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Excel Formula Bar */}
      <div className="excel-fap-formulabar">
        <div className="excel-cell-coord">{activeCell.coord}</div>
        <div className="excel-fx-label">fx</div>
        <div className="excel-fx-value">{activeCell.val}</div>
      </div>

      {/* Spreadsheet Canvas & Viewport */}
      <div className="excel-fap-viewport">
        <div
          ref={printRef}
          id="fap-excel-printable-doc"
          className="excel-fap-paper"
          style={{ width: zoom === 100 ? '100%' : `${zoom}%` }}
        >
          {/* Pure 100% Excel Matrix Table */}
          <table className="excel-fap-table">
            <colgroup>
              {EXCEL_COL_WIDTHS_PCT.map((w, i) => (
                <col key={i} style={{ width: `${w}%` }} />
              ))}
            </colgroup>
            <tbody>
              {displayRows.map(row => (
                <tr key={row.r} style={{ height: getRowHeight(row.r) }}>
                  {row.cells.map(cell => {
                    let cellValue = cell.v || '';
                    const isDynamic = Boolean(cell.k && dynamicValues[cell.k]);

                    if (isDynamic) {
                      cellValue = dynamicValues[cell.k!] || cell.v || '';
                    }

                    // Special rendering for official LiuGong logo in cell B2
                    const isLogoCell = cell.c === 'B2';
                    const isAppFormTitle = cell.c === 'A3';

                    // Parse custom cell styling
                    const style: React.CSSProperties = {
                      fontSize: cell.fs ? `${cell.fs}pt` : '8.5pt',
                      fontWeight: cell.fw === 'bold' ? 700 : 400,
                      color: isDynamic ? '#002060' : (cell.col || '#0f172a'),
                      backgroundColor: cell.bg || (row.r === 6 ? '#002060' : row.r === 10 ? '#eaa358' : undefined),
                      textAlign: (cell.ta as any) || 'left',
                      verticalAlign: (cell.va as any) || 'middle',
                    };

                    if (cell.b) {
                      cell.b.split(';').forEach(rule => {
                        const [prop, val] = rule.split(':').map(s => s.trim());
                        if (prop && val) {
                          if (prop === 'border-top') style.borderTop = val;
                          if (prop === 'border-bottom') style.borderBottom = val;
                          if (prop === 'border-left') style.borderLeft = val;
                          if (prop === 'border-right') style.borderRight = val;
                        }
                      });
                    }

                    if (row.r === 6) {
                      style.backgroundColor = '#002060';
                      style.height = '5px';
                      style.padding = 0;
                      style.lineHeight = '5px';
                    } else if (row.r === 10) {
                      style.backgroundColor = '#eaa358';
                      style.height = '3px';
                      style.padding = 0;
                      style.lineHeight = '3px';
                    }

                    const isSelected = activeCell.coord === cell.c;

                    return (
                      <td
                        key={cell.c}
                        colSpan={cell.cs || 1}
                        rowSpan={cell.rs || 1}
                        style={style}
                        className={`excel-fap-cell ${isSelected ? 'excel-cell-active' : ''} ${
                          isDynamic ? 'fap-dynamic-highlight' : ''
                        }`}
                        onClick={() =>
                          setActiveCell({
                            coord: cell.c,
                            val: cellValue || '(kosong)',
                          })
                        }
                      >
                        {isLogoCell ? (
                          <div style={{ padding: '2px 0' }}>
                            <img
                              src={LIUGONG_LOGO_B64}
                              alt="LiuGong Finance Indonesia"
                              style={{
                                height: '36px',
                                width: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                              }}
                            />
                          </div>
                        ) : isAppFormTitle ? (
                          <div
                            style={{
                              fontSize: '18px',
                              fontWeight: 900,
                              color: '#002060',
                              textAlign: 'center',
                              letterSpacing: '0.8px',
                              padding: '4px 0',
                            }}
                          >
                            APPLICATION FORM
                          </div>
                        ) : (
                          cellValue
                        )}
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
