import React, { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, CheckCircle2, FileSpreadsheet, Eye } from 'lucide-react';

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
  projects?: any[];
  bankReferences?: any[];
  financialStatements?: any[];
}

interface FapSheetPreviewProps {
  data: FapSheetData;
  className?: string;
  compact?: boolean;
}

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB');
  } catch {
    return d;
  }
};

const fmtMoney = (n?: any) => {
  if (n === undefined || n === null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return 'Rp ' + num.toLocaleString('id-ID');
};

export function FapSheetPreview({ data, className = '', compact = false }: FapSheetPreviewProps) {
  const [zoom, setZoom] = useState<number>(compact ? 80 : 90);
  const [activeSection, setActiveSection] = useState<'profile' | 'full'>('profile');

  // Format PIC full address
  const fullPicAddress = useMemo(() => {
    if (!data.pic) return '—';
    const parts = [
      data.pic.currentAddress,
      data.pic.rt ? `RT ${data.pic.rt}` : null,
      data.pic.rw ? `RW ${data.pic.rw}` : null,
      data.pic.village ? `Kel. ${data.pic.village}` : null,
      data.pic.district ? `Kec. ${data.pic.district}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }, [data.pic]);

  // Compute stakeholder rows (padded to 8 rows like Excel template)
  const stakeholderRows = useMemo(() => {
    const list = Array.isArray(data.stakeholders) ? data.stakeholders : [];
    const rows = [];
    for (let i = 0; i < 8; i++) {
      if (i < list.length) {
        const s = list[i];
        const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || '—';
        const position = s.designation || s.position || 'Shareholder';
        const shareAmount = s.depositedCapital ?? s.shareAmount ?? 0;
        const sharePct = s.sharePercentage ?? 0;
        rows.push({ no: i + 1, name, position, shareAmount, sharePct, empty: false });
      } else {
        rows.push({ no: i + 1, name: '', position: '', shareAmount: null, sharePct: null, empty: true });
      }
    }
    return rows;
  }, [data.stakeholders]);

  const totalSharePct = useMemo(() => {
    if (!Array.isArray(data.stakeholders)) return 0;
    return data.stakeholders.reduce((sum, s) => sum + (Number(s.sharePercentage) || 0), 0);
  }, [data.stakeholders]);

  const isExisting = data.customerStatus === 'EXISTING';
  const isCorporate = data.companyType === 'CORPORATE';
  const isCommercial = data.companyType === 'COMMERCIAL';
  const isMicro = data.companyType === 'MICRO';
  const isLiuGongUser = data.companyType === 'LIUGONG_USER';

  return (
    <div className={`fap-preview-wrapper ${className}`}>
      {/* Top Toolbar */}
      <div className="fap-preview-toolbar">
        <div className="fap-preview-toolbar-title">
          <FileSpreadsheet size={16} className="fap-toolbar-icon" />
          <span>FAP Template Live Mirror</span>
          <span className="fap-live-badge">
            <span className="fap-live-dot" />
            Realtime
          </span>
        </div>

        <div className="fap-preview-toolbar-actions">
          <div className="fap-section-toggle">
            <button
              type="button"
              className={activeSection === 'profile' ? 'active' : ''}
              onClick={() => setActiveSection('profile')}
              title="Bagian 1: Company Profile, PIC & Legal"
            >
              Halaman 1 (Profil & Legal)
            </button>
            <button
              type="button"
              className={activeSection === 'full' ? 'active' : ''}
              onClick={() => setActiveSection('full')}
              title="Lembar Lengkap FAP"
            >
              Lembar Lengkap
            </button>
          </div>

          <div className="fap-zoom-controls">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(50, z - 10))}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="fap-zoom-val">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(130, z + 10))}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(compact ? 80 : 90)}
              aria-label="Reset zoom"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Viewport Container with Scrolling */}
      <div className="fap-sheet-viewport">
        <div
          className="fap-sheet-zoom-container"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          <div className="fap-sheet-paper">
            {/* Header: Brand & Register Number */}
            <div className="fap-header-row">
              <div className="fap-brand-col">
                <div className="fap-brand-title">APPLICATION FORM</div>
                <div className="fap-brand-subtitle">PT LIUGONG FINANCE INDONESIA · ORIGINATION</div>
              </div>
              <div className="fap-register-box">
                <span className="fap-reg-label">No. Register :</span>
                <span className="fap-reg-value">{data.fapNumber || '0006/AF/03/2026 (Auto)'}</span>
              </div>
            </div>

            {/* Meta Strip: Date, Branch, Customer Status & Classification */}
            <div className="fap-meta-strip">
              <div className="fap-meta-left">
                <div className="fap-meta-item">
                  <span className="fap-cell-label">Tanggal/Date :</span>
                  <span className="fap-cell-fill">{fmtDate(data.applicationDate || new Date().toISOString())}</span>
                </div>
                <div className="fap-meta-item">
                  <span className="fap-cell-label">Cabang/Branch :</span>
                  <span className="fap-cell-fill">{data.branchCode || '—'}</span>
                </div>
              </div>

              <div className="fap-meta-center">
                <label className="fap-checkbox-item">
                  <span className={`fap-chk ${!isExisting ? 'checked' : ''}`}>
                    {!isExisting ? '✓' : ''}
                  </span>
                  <span>Customer Baru / New Customer</span>
                </label>
                <label className="fap-checkbox-item">
                  <span className={`fap-chk ${isExisting ? 'checked' : ''}`}>
                    {isExisting ? '✓' : ''}
                  </span>
                  <span>Customer Lama / Existing Customer</span>
                </label>
              </div>

              <div className="fap-meta-right">
                <label className="fap-checkbox-item">
                  <span className={`fap-chk ${isCorporate ? 'checked' : ''}`}>
                    {isCorporate ? '✓' : ''}
                  </span>
                  <span>Corporate</span>
                </label>
                <label className="fap-checkbox-item">
                  <span className={`fap-chk ${isCommercial ? 'checked' : ''}`}>
                    {isCommercial ? '✓' : ''}
                  </span>
                  <span>Commercial</span>
                </label>
                <label className="fap-checkbox-item">
                  <span className={`fap-chk ${isMicro ? 'checked' : ''}`}>
                    {isMicro ? '✓' : ''}
                  </span>
                  <span>Micro</span>
                </label>
                <label className="fap-checkbox-item">
                  <span className={`fap-chk ${isLiuGongUser ? 'checked' : ''}`}>
                    {isLiuGongUser ? '✓' : ''}
                  </span>
                  <span>LiuGong User</span>
                </label>
              </div>
            </div>

            {/* MAIN SPLIT GRID: COMPANY PROFILE (LEFT) & PIC + STAKEHOLDERS (RIGHT) */}
            <div className="fap-main-grid">
              {/* LEFT COLUMN: COMPANY PROFILE */}
              <div className="fap-col-left">
                <div className="fap-section-header">PROFIL PERUSAHAAN / COMPANY PROFILE</div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Nama Perusahaan / Company's Name :</div>
                  <div className="fap-row-value fap-highlight-text">{data.companyName || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Alamat Perusahaan / Company Address :</div>
                  <div className="fap-row-value">{data.companyAddress || '—'}</div>
                </div>

                <div className="fap-split-row">
                  <div className="fap-split-half">
                    <span className="fap-sub-label">Kota / City :</span>
                    <span className="fap-sub-value">{data.city || '—'}</span>
                  </div>
                  <div className="fap-split-half">
                    <span className="fap-sub-label">Provinsi / Province :</span>
                    <span className="fap-sub-value">{data.province || '—'}</span>
                  </div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Postal Code :</div>
                  <div className="fap-row-value">{data.postalCode || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Bisnis Utama / Main Business :</div>
                  <div className="fap-row-value">{data.mainBusiness || '—'}</div>
                </div>

                <div className="fap-split-row">
                  <div className="fap-split-half">
                    <span className="fap-sub-label">No. Akta Pendirian :</span>
                    <span className="fap-sub-value">{data.establishmentActNo || '—'}</span>
                  </div>
                  <div className="fap-split-half">
                    <span className="fap-sub-label">Tgl Pendirian :</span>
                    <span className="fap-sub-value">{fmtDate(data.establishmentDate)}</span>
                  </div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Pengalaman / Experience :</div>
                  <div className="fap-row-value">
                    <b>{data.experienceYears ?? '—'}</b> years &nbsp;&nbsp;
                    <b>{data.experienceMonths ?? '—'}</b> months
                  </div>
                </div>

                <div className="fap-split-row">
                  <div className="fap-split-half">
                    <span className="fap-sub-label">No. Akta Perubahan Terakhir :</span>
                    <span className="fap-sub-value">{data.latestDeedNo || '—'}</span>
                  </div>
                  <div className="fap-split-half">
                    <span className="fap-sub-label">Tgl Perubahan Terakhir :</span>
                    <span className="fap-sub-value">{fmtDate(data.latestDeedDate)}</span>
                  </div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">NIB (Nomor Induk Berusaha) :</div>
                  <div className="fap-row-value fap-code-font">{data.nib || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">NPWP / No. Tax :</div>
                  <div className="fap-row-value fap-code-font">{data.npwp || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Phone / Fax :</div>
                  <div className="fap-row-value">{data.phoneFax || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Website :</div>
                  <div className="fap-row-value">{data.website || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Email :</div>
                  <div className="fap-row-value">{data.email || '—'}</div>
                </div>

                <div className="fap-field-row">
                  <div className="fap-row-label">Sumber Pembayaran / Repayment source :</div>
                  <div className="fap-row-value">{data.repaymentSource || '—'}</div>
                </div>

                <div className="fap-field-row fap-premise-status">
                  <div className="fap-row-label">Status Tempat Usaha :</div>
                  <div className="fap-row-value">
                    <label className="fap-radio-item">
                      <span className={`fap-radio ${data.locationStatus === 'OWNED' ? 'checked' : ''}`}>
                        {data.locationStatus === 'OWNED' ? '●' : '○'}
                      </span>
                      <span>Milik Sendiri</span>
                    </label>
                    <label className="fap-radio-item">
                      <span className={`fap-radio ${data.locationStatus === 'RENTED' ? 'checked' : ''}`}>
                        {data.locationStatus === 'RENTED' ? '●' : '○'}
                      </span>
                      <span>Sewa</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PIC (TOP) & STAKEHOLDERS (BOTTOM) */}
              <div className="fap-col-right">
                {/* PIC Block */}
                <div className="fap-pic-box">
                  <div className="fap-section-header">PENANGGUNG JAWAB / PIC</div>

                  <div className="fap-split-row">
                    <div className="fap-split-half">
                      <span className="fap-sub-label">PIC / Kontak :</span>
                      <span className="fap-sub-value fap-bold-text">{data.pic?.picName || '—'}</span>
                    </div>
                    <div className="fap-split-half">
                      <span className="fap-sub-label">Telepon / Phone :</span>
                      <span className="fap-sub-value">{data.pic?.phone || '—'}</span>
                    </div>
                  </div>

                  <div className="fap-split-row">
                    <div className="fap-split-half">
                      <span className="fap-sub-label">Jabatan / Position :</span>
                      <span className="fap-sub-value">{data.pic?.position || '—'}</span>
                    </div>
                    <div className="fap-split-half">
                      <span className="fap-sub-label">Email :</span>
                      <span className="fap-sub-value">{data.pic?.email || '—'}</span>
                    </div>
                  </div>

                  <div className="fap-field-row">
                    <div className="fap-row-label">Alamat Tempat Tinggal / Current Address :</div>
                    <div className="fap-row-value">{fullPicAddress}</div>
                  </div>

                  <div className="fap-split-row">
                    <div className="fap-split-half">
                      <span className="fap-sub-label">Kota / City :</span>
                      <span className="fap-sub-value">{data.pic?.city || '—'}</span>
                    </div>
                    <div className="fap-split-half">
                      <span className="fap-sub-label">Provinsi / Province :</span>
                      <span className="fap-sub-value">{data.pic?.province || '—'}</span>
                    </div>
                  </div>

                  <div className="fap-field-row">
                    <div className="fap-row-label">Kode Pos / Postal code :</div>
                    <div className="fap-row-value">{data.pic?.postalCode || '—'}</div>
                  </div>
                </div>

                {/* Stakeholders Block */}
                <div className="fap-stakeholder-box">
                  <div className="fap-section-header">
                    STRUKTUR ORGANISASI & PEMEGANG SAHAM
                  </div>
                  <div className="fap-deed-reference">
                    <span>Berdasarkan Akta / Based on Act No. :</span>
                    <b>{data.selectedDeedNo || data.establishmentActNo || '—'}</b>
                  </div>

                  <table className="fap-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>No</th>
                        <th>Name</th>
                        <th>Position</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Amount of Share</th>
                        <th style={{ width: '65px', textAlign: 'right' }}>% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stakeholderRows.map(row => (
                        <tr key={row.no} className={row.empty ? 'fap-row-empty' : ''}>
                          <td style={{ textAlign: 'center' }}>{row.no}</td>
                          <td>{row.name}</td>
                          <td>{row.position}</td>
                          <td style={{ textAlign: 'right' }}>
                            {row.empty ? '' : fmtMoney(row.shareAmount)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {row.empty ? '' : `${Number(row.sharePct).toFixed(2)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          Total Kepemilikan Saham :
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {totalSharePct ? `${totalSharePct.toFixed(2)}%` : '0.00%'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* LOWER SECTIONS (Visible when activeSection === 'full') */}
            {activeSection === 'full' && (
              <div className="fap-lower-sections">
                {/* Financing Purpose & Fixed Assets */}
                <div className="fap-section-container">
                  <div className="fap-section-header">TUJUAN PEMBIAYAAN / FINANCING PURPOSE</div>
                  <div className="fap-purpose-grid">
                    <div>
                      <div className="fap-purpose-title">Investasi / Investment</div>
                      <p className="fap-purpose-desc">Aktivitas usaha / modernisasi / ekspansi / relokasi tempat usaha</p>
                    </div>
                    <div>
                      <div className="fap-purpose-title">Modal Kerja / Working Capital</div>
                      <p className="fap-purpose-desc">Memenuhi kebutuhan pengeluaran dalam siklus usaha</p>
                    </div>
                  </div>
                </div>

                {/* Segmentation & Business Role */}
                <div className="fap-section-container">
                  <div className="fap-section-header">SEGMENTASI & BISNIS UTAMA</div>
                  <div className="fap-meta-strip">
                    <div className="fap-meta-left">
                      <span className="fap-cell-label">Segmentasi :</span>
                      <span className="fap-cell-fill">{data.industrySegment || '—'}</span>
                    </div>
                    <div className="fap-meta-center">
                      <span className="fap-cell-label">Peran Bisnis :</span>
                      <span className="fap-cell-fill">{data.businessRole || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Proposed Facility Summary */}
                {data.proposal && (
                  <div className="fap-section-container">
                    <div className="fap-section-header">USULAN FASILITAS / FACILITY PROPOSED</div>
                    <div className="fap-proposal-strip">
                      <div>
                        <span>Metode Pembiayaan</span>
                        <b>{data.proposal.financingMethod || 'FINANCIAL LEASE'}</b>
                      </div>
                      <div>
                        <span>Nilai Pembiayaan</span>
                        <b>{fmtMoney(data.proposal.financingValue)}</b>
                      </div>
                      <div>
                        <span>Tenor</span>
                        <b>{data.proposal.tenorMonths ? `${data.proposal.tenorMonths} Bulan` : '—'}</b>
                      </div>
                      <div>
                        <span>Suku Bunga</span>
                        <b>{data.proposal.interestRate ? `${data.proposal.interestRate}% / thn` : '—'}</b>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signature Block */}
                <div className="fap-signature-grid">
                  <div className="fap-sig-box">
                    <div className="fap-sig-title">Pemohon Pembiayaan (Debitur)</div>
                    <div className="fap-sig-company">{data.companyName || '—'}</div>
                    <div className="fap-sig-space" />
                    <div className="fap-sig-line">
                      <span>Nama : {data.pic?.picName || '—'}</span>
                      <span>Jabatan : {data.pic?.position || 'Direktur'}</span>
                    </div>
                  </div>

                  <div className="fap-sig-box">
                    <div className="fap-sig-title">PT LIUGONG FINANCE INDONESIA</div>
                    <div className="fap-sig-company">Origination Department</div>
                    <div className="fap-sig-space" />
                    <div className="fap-sig-line">
                      <span>Marketing / Branch Representative</span>
                      <span>Tanggal : {fmtDate(data.applicationDate || new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="fap-sheet-footer">
              <span>FAP v01.2025 · PT LIUGONG FINANCE INDONESIA</span>
              <span>Dokumen Aplikasi Pembiayaan Internal · Confidential</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
