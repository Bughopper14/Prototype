import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Printer,
  Eye,
} from 'lucide-react';
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
  application,
  customer,
  profile,
  pic,
  stakeholders = [],
  compact = false,
}: FapSheetPreviewProps) {
  const [zoom, setZoom] = useState<number>(100);
  const printRef = useRef<HTMLDivElement>(null);

  // Dynamic values binding
  const dynamicValues = useMemo(() => {
    const d = data || {};
    const p = profile || d || {};
    const c = customer || d || {};
    const a = application || d || {};
    const pc = pic || d || {};
    const shList = (stakeholders && stakeholders.length) ? stakeholders : (d.stakeholders || a.stakeholders || []);

    const rawDate = a.applicationDate || d.applicationDate || new Date().toISOString();
    let formattedDate = '';
    try {
      const dt = new Date(rawDate);
      if (!isNaN(dt.getTime())) {
        formattedDate = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
      }
    } catch {
      formattedDate = String(rawDate).slice(0, 10);
    }

    const fmtEstDate = (dtStr?: string) => {
      if (!dtStr) return '';
      try {
        const dt = new Date(dtStr);
        if (!isNaN(dt.getTime())) {
          return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
        }
      } catch {}
      return String(dtStr).slice(0, 10);
    };

    return {
      fapNumber: a.fapNumber || d.fapNumber || '0006/AF/03/2026',
      applicationDate: formattedDate || '16/10/2026',
      branchCode: a.branchCode || p.branchCode || d.branchCode || 'JKT01',
      customerStatus: (c.customerStatus || p.customerStatus || d.customerStatus || 'NEW').toUpperCase(),
      companyType: (c.companyType || d.companyType || 'CORPORATE').toUpperCase(),
      companyName: c.companyName || d.companyName || '',
      companyAddress: p.companyAddress || d.companyAddress || '',
      city: p.city || d.city || '',
      province: p.province || d.province || '',
      postalCode: p.postalCode || d.postalCode || '',
      mainBusiness: p.mainBusiness || d.mainBusiness || '',
      establishmentActNo: c.establishmentActNo || d.establishmentActNo || '',
      establishmentDate: fmtEstDate(c.establishmentDate || d.establishmentDate),
      experienceYears: p.experienceYears ?? d.experienceYears ?? '',
      experienceMonths: p.experienceMonths ?? d.experienceMonths ?? '',
      latestDeedNo: p.latestDeedNo || d.latestDeedNo || '',
      latestDeedDate: fmtEstDate(p.latestDeedDate || d.latestDeedDate),
      nib: c.nib || d.nib || '',
      npwp: c.npwp || d.npwp || '',
      phoneFax: p.phoneFax || d.phoneFax || '',
      website: p.website || d.website || '',
      email: p.email || c.email || d.email || '',
      repaymentSource: p.repaymentSource || d.repaymentSource || '',
      locationStatus: p.locationStatus || d.locationStatus || '',
      picName: pc.picName || d.picName || '',
      position: pc.position || d.position || '',
      phone: pc.phone || d.phone || '',
      picEmail: pc.email || d.picEmail || '',
      currentAddress: pc.currentAddress || d.currentAddress || '',
      picCity: pc.city || d.picCity || '',
      picProvince: pc.province || d.picProvince || '',
      picPostalCode: pc.postalCode || d.picPostalCode || '',
      selectedDeedNo: p.selectedDeedNo || d.selectedDeedNo || c.establishmentActNo || d.establishmentActNo || '',
      stakeholders: Array.isArray(shList) ? shList : [],
    };
  }, [data, application, customer, profile, pic, stakeholders]);

  const isNew = dynamicValues.customerStatus !== 'EXISTING';
  const isCorporate = dynamicValues.companyType === 'CORPORATE';
  const isCommercial = dynamicValues.companyType === 'COMMERCIAL';
  const isMicro = dynamicValues.companyType === 'MICRO';
  const isLiuGongUser = dynamicValues.companyType === 'LIUGONG_USER';

  const handlePrint = () => {
    window.print();
  };

  const formatNumber = (num?: number | string) => {
    if (num === undefined || num === null || num === '') return '';
    const n = Number(num);
    if (isNaN(n)) return String(num);
    return n.toLocaleString('id-ID');
  };

  const formatPct = (num?: number | string) => {
    if (num === undefined || num === null || num === '') return '';
    const n = Number(num);
    if (isNaN(n)) return String(num);
    return `${n.toFixed(2)}%`;
  };

  return (
    <div className="excel-fap-viewer">
      {/* Excel Ribbon Toolbar */}
      <div className="excel-fap-ribbon">
        <div className="excel-ribbon-left">
          <FileSpreadsheet size={16} className="excel-green-icon" />
          <div className="excel-file-badge">
            <span className="excel-file-name">FAP-Document_APPROVED_v01.2025.xlsx</span>
            <span className="excel-tab-badge">Sheet: APPROVED v01.2025</span>
          </div>
          <span className="excel-live-tag">
            <span className="excel-live-dot" /> LIVE MIRROR
          </span>
        </div>

        <div className="excel-ribbon-right">
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

      {/* Spreadsheet Canvas & Viewport */}
      <div className="excel-fap-viewport">
        <div
          ref={printRef}
          id="fap-excel-printable-doc"
          className="excel-fap-paper"
          style={{ width: zoom === 100 ? '100%' : `${zoom}%` }}
        >
          {/* Header Section */}
          <div className="excel-exact-header">
            <div className="exact-header-top">
              <div className="exact-header-logo">
                <img src={LIUGONG_LOGO_B64} alt="LiuGong Finance Indonesia" />
              </div>
              <div className="exact-header-title">APPLICATION FORM</div>
              <div className="exact-header-reg">
                <span className="reg-lbl">No. Register :</span>
                <span className="reg-val">{dynamicValues.fapNumber}</span>
              </div>
            </div>

            {/* Solid Navy Blue Bar */}
            <div className="exact-navy-bar" />

            {/* 4 Classification Boxes */}
            <div className="exact-matrix-grid">
              {/* Box 1 */}
              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Tanggal/ Date</span>
                  <span className="exact-matrix-val">{dynamicValues.applicationDate}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Cabang/ Branch</span>
                  <span className="exact-matrix-val">{dynamicValues.branchCode}</span>
                </div>
              </div>

              {/* Box 2 */}
              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Customer Baru/ New Customer</span>
                  <span className="exact-matrix-chk">{isNew ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Customer Lama / Existing Customer</span>
                  <span className="exact-matrix-chk">{!isNew ? '☑' : '☐'}</span>
                </div>
              </div>

              {/* Box 3 */}
              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Corporate</span>
                  <span className="exact-matrix-chk">{isCorporate ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Commercial</span>
                  <span className="exact-matrix-chk">{isCommercial ? '☑' : '☐'}</span>
                </div>
              </div>

              {/* Box 4 */}
              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Micro</span>
                  <span className="exact-matrix-chk">{isMicro ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">LiuGong Used</span>
                  <span className="exact-matrix-chk">{isLiuGongUser ? '☑' : '☐'}</span>
                </div>
              </div>
            </div>

            {/* Solid Orange Divider Bar */}
            <div className="exact-orange-bar" />
          </div>

          {/* Form Main Body: Two-Column Grid matching img_2e4e6503caa5.jpg */}
          <div className="exact-fap-body">
            {/* Left Column: Company Information */}
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Nama Perusahaan/<br />Company’s Name</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">
                  {dynamicValues.companyName || ''}
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Alamat Perusahaan/<br />Company Address</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box multiline highlight-dynamic">
                  {dynamicValues.companyAddress || ''}
                </div>
              </div>

              <div className="exact-sub-row">
                <div className="exact-sub-lbl">Kota/ City</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.city || ''}</div>
              </div>

              <div className="exact-sub-row">
                <div className="exact-sub-lbl">Provinsi/ Province</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.province || ''}</div>
              </div>

              <div className="exact-sub-row">
                <div className="exact-sub-lbl">Postal code</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.postalCode || ''}</div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Bisnis Utama/<br />Main Business</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">
                  {dynamicValues.mainBusiness || ''}
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">No. Akta Pendirian/<br />Deed Establishment</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.2 }}>
                    {dynamicValues.establishmentActNo || ''}
                  </div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Tanggal/ Est Date :</span>
                    <div className="exact-fap-box highlight-dynamic" style={{ width: '75px', flex: 'none' }}>
                      {dynamicValues.establishmentDate || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Pengalaman/<br />Experience</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-inline-group">
                  <div className="exact-fap-box highlight-dynamic" style={{ width: '45px', flex: 'none', justifyContent: 'center' }}>
                    {dynamicValues.experienceYears !== '' ? dynamicValues.experienceYears : ''}
                  </div>
                  <span className="exact-inline-lbl">years</span>
                  <div className="exact-fap-box highlight-dynamic" style={{ width: '45px', flex: 'none', justifyContent: 'center' }}>
                    {dynamicValues.experienceMonths !== '' ? dynamicValues.experienceMonths : ''}
                  </div>
                  <span className="exact-inline-lbl">months</span>
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">No. Akta Perubahan Terakhir/<br />Latest Deed Amendment</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.2 }}>
                    {dynamicValues.latestDeedNo || ''}
                  </div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Tanggal/ Date :</span>
                    <div className="exact-fap-box highlight-dynamic" style={{ width: '75px', flex: 'none' }}>
                      {dynamicValues.latestDeedDate || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">NIB (No Induk Berusaha)</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.nib || ''}</div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">NPWP/ No. Tax</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.npwp || ''}</div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Phone / Fax</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.phoneFax || ''}</div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Website</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.website || ''}</div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Email</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.email || ''}</div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Sumber Pembayaran/<br />Repayment source</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">
                  {dynamicValues.repaymentSource || ''}
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl">Status tempat usaha/<br />Business Location Status</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">
                  {dynamicValues.locationStatus || ''}
                </div>
              </div>
            </div>

            {/* Right Column: PIC Details & Shareholder Table */}
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <div className="exact-fap-lbl" style={{ width: '115px' }}>
                  Penanggung Jawab/<br />PIC
                </div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.4 }}>
                    {dynamicValues.picName || ''}
                  </div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Telepon/ Phone :</span>
                    <div className="exact-fap-box highlight-dynamic" style={{ flex: 1 }}>
                      {dynamicValues.phone || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl" style={{ width: '115px' }}>
                  Jabatan/<br />Position
                </div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.4 }}>
                    {dynamicValues.position || ''}
                  </div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Email :</span>
                    <div className="exact-fap-box highlight-dynamic" style={{ flex: 1 }}>
                      {dynamicValues.picEmail || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <div className="exact-fap-lbl" style={{ width: '115px' }}>
                  Alamat Tempat Tinggal/<br />Current Address
                </div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box multiline highlight-dynamic">
                  {dynamicValues.currentAddress || ''}
                </div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '12px' }}>
                <div className="exact-sub-lbl" style={{ width: '107px' }}>Kota/ City</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.picCity || ''}</div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '12px' }}>
                <div className="exact-sub-lbl" style={{ width: '107px' }}>Provinsi/ Province</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.picProvince || ''}</div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '12px' }}>
                <div className="exact-sub-lbl" style={{ width: '107px' }}>Kode Pos/ Postal code</div>
                <div className="exact-fap-colon">:</div>
                <div className="exact-fap-box highlight-dynamic">{dynamicValues.picPostalCode || ''}</div>
              </div>

              {/* Shareholder Structure Table */}
              <div className="exact-sh-section">
                <div className="exact-sh-title">
                  Struktur Organisasi & Pemegang Saham / Organization & Shareholder Structure
                </div>
                <div className="exact-sh-subtitle">
                  Berdasarkan Akta / Based on Act No.{' '}
                  <u>{dynamicValues.selectedDeedNo || '________________________'}</u>
                </div>

                <table className="exact-sh-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }}>No</th>
                      <th style={{ width: '38%' }}>Name</th>
                      <th style={{ width: '22%' }}>Position</th>
                      <th style={{ width: '24%' }}>Amount of Share</th>
                      <th style={{ width: '16%' }}>% share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => {
                      const sh = dynamicValues.stakeholders[idx];
                      return (
                        <tr key={idx}>
                          <td className="center">{idx + 1}</td>
                          <td className="highlight-dynamic">{sh?.name || sh?.shareholderName || ''}</td>
                          <td className="highlight-dynamic">{sh?.position || ''}</td>
                          <td className="right highlight-dynamic">
                            {sh ? formatNumber(sh.amount || sh.amountOfShare) : ''}
                          </td>
                          <td className="right highlight-dynamic">
                            {sh ? formatPct(sh.sharePercentage || sh.pctShare) : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
