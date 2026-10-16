import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Download,
  RotateCcw,
  CheckCircle2,
  Minimize2,
  Eye,
  Sliders,
} from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomMode, setZoomMode] = useState<'fit' | '100' | 'manual'>('fit');
  const [manualZoom, setManualZoom] = useState<number>(compact ? 75 : 85);
  const [viewScope, setViewScope] = useState<'profile' | 'full'>('profile');

  // Monitor container width for responsive Auto-Fit scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Standard A4 width in px at 96 DPI
  const BASE_A4_WIDTH = 794;

  // Compute scale based on zoomMode
  const effectiveScale = useMemo(() => {
    if (zoomMode === 'fit') {
      if (!containerWidth) return 0.75;
      const available = containerWidth - 36; // leave room for padding
      return Math.min(1.15, Math.max(0.35, available / BASE_A4_WIDTH));
    }
    if (zoomMode === '100') return 1;
    return manualZoom / 100;
  }, [zoomMode, manualZoom, containerWidth]);

  // Derived formatted values
  const fap = useMemo(() => {
    const isNew = data.customerStatus === 'NEW';
    const type = data.companyType || '';
    const isCorporate = type === 'CORPORATE';
    const isCommercial = type === 'COMMERCIAL';
    const isMicro = type === 'MICRO';
    const isLiuGongUser = type === 'LIUGONG_USER';

    const pic = data.pic || {};
    const addrParts = [
      pic.currentAddress,
      pic.rt ? `RT ${pic.rt}` : null,
      pic.rw ? `RW ${pic.rw}` : null,
      pic.village,
      pic.district,
    ].filter(Boolean);

    // Stakeholders up to 8 rows
    const shList = data.stakeholders || [];
    const shRows = Array.from({ length: 8 }, (_, i) => {
      const sh = shList[i];
      if (!sh) return { no: i + 1, name: '', pos: '', amount: '', pct: '' };
      const name = sh.name || [sh.firstName, sh.lastName].filter(Boolean).join(' ') || '';
      const amount = sh.depositedCapital || sh.shareAmount || 0;
      const pct = sh.sharePercentage || sh.percentage || 0;
      return {
        no: i + 1,
        name,
        pos: sh.position || sh.designation || '',
        amount: amount ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(amount)) : '',
        pct: pct ? `${Number(pct).toFixed(2)}%` : '',
      };
    });

    const isOwned = data.locationStatus === 'OWNED';
    const isRented = data.locationStatus === 'RENTED';

    return {
      fapNumber: data.fapNumber || '0006/AF/03/2026 (Auto)',
      date: data.applicationDate
        ? new Date(data.applicationDate).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB'),
      branch: data.branchCode || 'JKT01',
      isNew,
      isCorporate,
      isCommercial,
      isMicro,
      isLiuGongUser,
      companyName: data.companyName || '',
      companyAddress: data.companyAddress || '',
      city: data.city || '',
      province: data.province || '',
      postalCode: data.postalCode || '',
      mainBusiness: data.mainBusiness || '',
      estActNo: data.establishmentActNo || '',
      estDate: data.establishmentDate || '',
      expYears: data.experienceYears !== undefined && data.experienceYears !== '' ? String(data.experienceYears) : '',
      expMonths: data.experienceMonths !== undefined && data.experienceMonths !== '' ? String(data.experienceMonths) : '',
      latestDeedNo: data.latestDeedNo || '',
      latestDeedDate: data.latestDeedDate || '',
      nib: data.nib || '',
      npwp: data.npwp || '',
      phoneFax: data.phoneFax || '',
      website: data.website || '',
      email: data.email || '',
      repaymentSource: data.repaymentSource || '',
      isOwned,
      isRented,
      picName: pic.picName || '',
      picPhone: pic.phone || '',
      picPos: pic.position || '',
      picEmail: pic.email || '',
      picAddr: addrParts.join(', ') || pic.currentAddress || '',
      picCity: pic.city || '',
      picProvince: pic.province || '',
      picPostal: pic.postalCode || '',
      deedRef: data.selectedDeedNo || data.latestDeedNo || data.establishmentActNo || '—',
      shRows,
    };
  }, [data]);

  // Handle PDF Export / Print
  const handleDownloadPdf = () => {
    const printDoc = document.getElementById('fap-pdf-printable-area');
    if (!printDoc) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FAP-Document_${fap.fapNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: Calibri, 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background: #ffffff;
            }
            .fap-pdf-page {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .fap-pdf-table {
              width: 100%;
              border-collapse: collapse;
            }
            .fap-pdf-table td, .fap-pdf-table th {
              border: 1px solid #1e293b;
              padding: 3px 5px;
              font-size: 10.5px;
            }
            .fap-header-title {
              font-size: 20px;
              font-weight: bold;
              text-align: center;
              color: #002c5f;
            }
            .fap-reg-pill {
              font-family: monospace;
              font-weight: bold;
            }
            .fap-filled-cell {
              color: #002c5f !important;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${printDoc.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 350);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="pdf-viewer-shell" ref={containerRef}>
      {/* PDF Viewer Header Toolbar */}
      <div className="pdf-viewer-toolbar">
        <div className="pdf-toolbar-left">
          <div className="pdf-file-badge">
            <FileText size={15} className="pdf-file-icon" />
            <span className="pdf-filename">FAP-Document.pdf</span>
            <span className="pdf-version-tag">APPROVED v01.2025</span>
          </div>
          <span className="pdf-live-indicator">
            <span className="pdf-live-ping" />
            Live Sync
          </span>
        </div>

        <div className="pdf-toolbar-right">
          {/* Scope Toggle */}
          <div className="pdf-scope-switch">
            <button
              type="button"
              className={viewScope === 'profile' ? 'active' : ''}
              onClick={() => setViewScope('profile')}
              title="Fokus FAP Stage (Profil, PIC & Legal)"
            >
              FAP Stage
            </button>
            <button
              type="button"
              className={viewScope === 'full' ? 'active' : ''}
              onClick={() => setViewScope('full')}
              title="Tampilkan Dokumen Lengkap"
            >
              Full Form
            </button>
          </div>

          {/* Auto-Fit / Zoom controls */}
          <div className="pdf-zoom-group">
            <button
              type="button"
              className={`pdf-tool-btn ${zoomMode === 'fit' ? 'active' : ''}`}
              onClick={() => setZoomMode('fit')}
              title="Pas Lebar (Fit-to-Width) - Bebas Scroll Horizontal"
            >
              <Maximize2 size={13} />
              <span>Fit Width</span>
            </button>
            <button
              type="button"
              className={`pdf-tool-btn ${zoomMode === '100' ? 'active' : ''}`}
              onClick={() => setZoomMode('100')}
              title="Ukuran Asli 100%"
            >
              <span>100%</span>
            </button>
            <div className="pdf-zoom-stepper">
              <button
                type="button"
                onClick={() => {
                  setZoomMode('manual');
                  setManualZoom((z) => Math.max(40, z - 10));
                }}
                title="Perkecil"
              >
                <ZoomOut size={13} />
              </button>
              <span className="pdf-zoom-val">{Math.round(effectiveScale * 100)}%</span>
              <button
                type="button"
                onClick={() => {
                  setZoomMode('manual');
                  setManualZoom((z) => Math.min(140, z + 10));
                }}
                title="Perbesar"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Download / Print PDF Button */}
          <button
            type="button"
            className="pdf-download-btn"
            onClick={handleDownloadPdf}
            title="Unduh / Cetak sebagai File PDF Resmi"
          >
            <Download size={14} />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* PDF Viewport (Charcoal background) */}
      <div className="pdf-viewport">
        <div
          className="pdf-scalable-wrapper"
          style={{
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top center',
            marginBottom: `${(1 - effectiveScale) * -1100}px`,
          }}
        >
          {/* A4 Paper Canvas */}
          <div className="fap-pdf-page" id="fap-pdf-printable-area">
            {/* Header Document Block */}
            <div className="pdf-doc-header">
              <div className="pdf-brand-col">
                <div className="pdf-logo-mark">
                  <span className="pdf-logo-red">LIUGONG</span>
                  <span className="pdf-logo-sub">FINANCE INDONESIA</span>
                </div>
                <div className="pdf-company-full">PT LIUGONG FINANCE INDONESIA</div>
              </div>
              <div className="pdf-title-col">
                <h1 className="pdf-doc-title">APPLICATION FORM</h1>
                <span className="pdf-doc-type">FINANCING APPLICATION PROFILE (FAP)</span>
              </div>
              <div className="pdf-reg-col">
                <div className="pdf-reg-box">
                  <span className="pdf-reg-label">No. Register :</span>
                  <span className="pdf-reg-no">{fap.fapNumber}</span>
                </div>
              </div>
            </div>

            {/* Meta Strip: Date, Branch, Category, Segmentation */}
            <table className="fap-meta-table">
              <tbody>
                <tr>
                  <td className="meta-lbl" style={{ width: '13%' }}>Tanggal / Date</td>
                  <td className="meta-val" style={{ width: '18%' }}>
                    <span className="fap-dyn-value">{fap.date}</span>
                  </td>
                  <td className="meta-chk" style={{ width: '34%' }}>
                    <span className={`chk-box ${fap.isNew ? 'chk-active' : ''}`}>
                      {fap.isNew ? '☑' : '☐'} Customer Baru / New Customer
                    </span>
                  </td>
                  <td className="meta-chk" style={{ width: '18%' }}>
                    <span className={`chk-box ${fap.isCorporate ? 'chk-active' : ''}`}>
                      {fap.isCorporate ? '☑' : '☐'} Corporate
                    </span>
                  </td>
                  <td className="meta-chk" style={{ width: '17%' }}>
                    <span className={`chk-box ${fap.isMicro ? 'chk-active' : ''}`}>
                      {fap.isMicro ? '☑' : '☐'} Micro
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="meta-lbl">Cabang / Branch</td>
                  <td className="meta-val">
                    <span className="fap-dyn-value">{fap.branch}</span>
                  </td>
                  <td className="meta-chk">
                    <span className={`chk-box ${!fap.isNew ? 'chk-active' : ''}`}>
                      {!fap.isNew ? '☑' : '☐'} Customer Lama / Existing Customer
                    </span>
                  </td>
                  <td className="meta-chk">
                    <span className={`chk-box ${fap.isCommercial ? 'chk-active' : ''}`}>
                      {fap.isCommercial ? '☑' : '☐'} Commercial
                    </span>
                  </td>
                  <td className="meta-chk">
                    <span className={`chk-box ${fap.isLiuGongUser ? 'chk-active' : ''}`}>
                      {fap.isLiuGongUser ? '☑' : '☐'} LiuGong User
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Main Section: Two-Column Split (Company Profile on Left, PIC & Stakeholders on Right) */}
            <div className="pdf-main-split">
              {/* Left Column: Company Profile */}
              <div className="pdf-col-company">
                <div className="pdf-section-ribbon">COMPANY PROFILE</div>
                <table className="fap-fields-table">
                  <tbody>
                    <tr>
                      <td className="field-lbl" style={{ width: '38%' }}>Nama Perusahaan / Company's Name</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className={`dyn-text bold ${fap.companyName ? 'highlight' : 'empty'}`}>
                          {fap.companyName || '—'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Alamat Perusahaan / Company Address</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className={`dyn-text ${fap.companyAddress ? 'highlight' : 'empty'}`}>
                          {fap.companyAddress || '—'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Kota / City</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.city || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Provinsi / Province</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.province || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Kode Pos / Postal Code</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text font-mono">{fap.postalCode || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Bisnis Utama / Main Business</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.mainBusiness || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">No. Akta Pendirian</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <div className="sub-split">
                          <span>{fap.estActNo || '—'}</span>
                          <span className="sub-lbl">Tgl: {fap.estDate || '—'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Pengalaman / Experience</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">
                          <b>{fap.expYears || '0'}</b> thn &nbsp; <b>{fap.expMonths || '0'}</b> bln
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">No. Akta Perubahan Terakhir</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <div className="sub-split">
                          <span>{fap.latestDeedNo || '—'}</span>
                          <span className="sub-lbl">Tgl: {fap.latestDeedDate || '—'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">NIB (No Induk Berusaha)</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text font-mono bold">{fap.nib || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">NPWP / No. Tax</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text font-mono bold">{fap.npwp || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Phone / Fax</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.phoneFax || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Website</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.website || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Email Resmi</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.email || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Sumber Pembayaran / Repayment</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.repaymentSource || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Status Tempat Usaha</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-radio">
                          <b className={fap.isOwned ? 'active' : ''}>{fap.isOwned ? '●' : '○'} Milik Sendiri</b>
                          &nbsp;&nbsp;/&nbsp;&nbsp;
                          <b className={fap.isRented ? 'active' : ''}>{fap.isRented ? '●' : '○'} Sewa</b>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column: PIC & Stakeholders */}
              <div className="pdf-col-pic-stakeholder">
                {/* PIC Block */}
                <div className="pdf-section-ribbon">PENANGGUNG JAWAB (PIC)</div>
                <table className="fap-fields-table">
                  <tbody>
                    <tr>
                      <td className="field-lbl" style={{ width: '38%' }}>Nama PIC / Contact Name</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className={`dyn-text bold ${fap.picName ? 'highlight' : 'empty'}`}>
                          {fap.picName || '—'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Telepon / Phone</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text font-mono bold">{fap.picPhone || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Jabatan / Position</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.picPos || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Email PIC</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.picEmail || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Alamat Tempat Tinggal</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">{fap.picAddr || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Kota & Provinsi</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text">
                          {fap.picCity ? `${fap.picCity}, ${fap.picProvince}` : '—'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Kode Pos</td>
                      <td className="field-sep">:</td>
                      <td className="field-val">
                        <span className="dyn-text font-mono">{fap.picPostal || '—'}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Stakeholder Block */}
                <div className="pdf-section-ribbon" style={{ marginTop: '10px' }}>
                  STRUKTUR ORGANISASI & PEMEGANG SAHAM
                </div>
                <div className="pdf-deed-ref">
                  <span>Berdasarkan Akta / Based on Act No.: </span>
                  <b>{fap.deedRef}</b>
                </div>

                <table className="fap-stakeholders-table">
                  <thead>
                    <tr>
                      <th style={{ width: '7%' }}>No</th>
                      <th style={{ width: '42%' }}>Name</th>
                      <th style={{ width: '23%' }}>Position</th>
                      <th style={{ width: '18%' }}>Amount of Share</th>
                      <th style={{ width: '10%' }}>% Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fap.shRows.map((row) => (
                      <tr key={row.no} className={row.name ? 'sh-row-active' : 'sh-row-empty'}>
                        <td className="center">{row.no}</td>
                        <td className="bold">{row.name || ''}</td>
                        <td>{row.pos || ''}</td>
                        <td className="right font-mono">{row.amount || ''}</td>
                        <td className="right font-mono">{row.pct || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lower Sections (Visible in Full Form Scope) */}
            {viewScope === 'full' && (
              <div className="pdf-full-extensions">
                {/* Financing Purpose & Fixed Assets */}
                <div className="pdf-section-ribbon" style={{ marginTop: '12px' }}>
                  TUJUAN PEMBIAYAAN & RENCANA REALISASI UNIT
                </div>
                <div className="pdf-ext-grid">
                  <div className="ext-box">
                    <span className="ext-title">Tujuan Pembiayaan:</span>
                    <p className="ext-desc">
                      Investasi (Modernisasi/Ekspansi, Relokasi, Rehabilitasi) &amp; Modal Kerja.
                    </p>
                  </div>
                  <div className="ext-box">
                    <span className="ext-title">Skema Fasilitas Usulan:</span>
                    <p className="ext-desc">
                      Sewa Pembiayaan / Financial Lease · Sale and Lease Back · Installment Financing
                    </p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pdf-signature-area">
                  <div className="sig-column">
                    <span className="sig-caption">Di tanda tangani debitur / Signed by Debtor :</span>
                    <span className="sig-company-name">{fap.companyName || '[ Nama Perusahaan ]'}</span>
                    <div className="sig-space" />
                    <div className="sig-underline">
                      <span>( Tanda Tangan &amp; Cap Perusahaan )</span>
                      <small>Nama Direktur / Kuasa Direksi</small>
                    </div>
                  </div>

                  <div className="sig-column">
                    <span className="sig-caption">Diverifikasi oleh pihak LFI / Verified by LFI :</span>
                    <span className="sig-company-name">PT. LIUGONG FINANCE INDONESIA</span>
                    <div className="sig-space" />
                    <div className="sig-underline">
                      <span>Marketing Officer / BM</span>
                      <small>Branch Operations</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="pdf-doc-footer">
              <span>PT LiuGong Finance Indonesia • Origination Workspace</span>
              <span>Dokumen Aplikasi Pembiayaan Resmi • APPROVED v01.2025</span>
              <span>Halaman 1 dari 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
