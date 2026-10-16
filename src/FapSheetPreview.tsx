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
  assetSummaryHeLiuGong?: number;
  assetSummaryTruckLiuGong?: number;
  assetSummaryHeNonLiuGong?: number;
  assetSummaryTruckNonLiuGong?: number;
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

export function FapSheetPreview(props: FapSheetPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(props.compact ? 0.88 : 1.0);
  const containerRef = useRef<HTMLDivElement>(null);

  const d: FapSheetData = useMemo(() => {
    const raw = props.data || {};
    const app = props.application || {};
    const cust = props.customer || app.customer || {};
    const prof = props.profile || app.profile || {};
    const p = props.pic || app.pic || raw.pic || {};
    const sh = props.stakeholders || app.stakeholders || raw.stakeholders || [];
    const prop = raw.proposal || app.proposal || {};

    return {
      fapNumber: raw.fapNumber || app.fapNumber || '0006/AF/03/2026',
      applicationDate: raw.applicationDate || app.applicationDate || new Date().toISOString(),
      branchCode: raw.branchCode || app.branchCode || 'JKT01',
      customerStatus: raw.customerStatus || app.customerStatus || 'EXISTING',
      companyName: raw.companyName || cust.companyName || 'PT LiuGong Customer Indonesia',
      companyType: raw.companyType || cust.companyType || 'CORPORATE',
      nib: raw.nib || cust.nib || '1234567890123',
      npwp: raw.npwp || cust.npwp || '01.234.567.8-012.000',
      establishmentActNo: raw.establishmentActNo || cust.establishmentActNo || 'AHU-0012345.AH.01.01.2018',
      establishmentDate: raw.establishmentDate || cust.establishmentDate || '2018-05-10',
      companyAddress: raw.companyAddress || prof.companyAddress || 'Jl. Jend. Sudirman Kav. 52-53, SCBD Lot 9',
      city: raw.city || prof.city || 'Jakarta Selatan',
      province: raw.province || prof.province || 'DKI Jakarta',
      postalCode: raw.postalCode || prof.postalCode || '12190',
      experienceYears: raw.experienceYears ?? prof.experienceYears ?? 8,
      experienceMonths: raw.experienceMonths ?? prof.experienceMonths ?? 6,
      mainBusiness: raw.mainBusiness || prof.mainBusiness || 'Jasa Kontraktor Tambang & Alat Berat',
      latestDeedNo: raw.latestDeedNo || prof.latestDeedNo || 'AHU-0098765.AH.01.02.2023',
      latestDeedDate: raw.latestDeedDate || prof.latestDeedDate || '2023-08-15',
      phoneFax: raw.phoneFax || prof.phoneFax || '021-52998888',
      website: raw.website || prof.website || 'www.liugong-customer.co.id',
      email: raw.email || prof.email || 'corporate@liugong-customer.co.id',
      repaymentSource: raw.repaymentSource || prof.repaymentSource || 'Pendapatan Kontrak Tambang PT Vale & Antam',
      locationStatus: raw.locationStatus || prof.locationStatus || 'Milik Sendiri',
      picName: raw.picName || p.picName || p.name || 'Budi Santoso',
      position: raw.position || p.position || 'Direktur Utama',
      phone: raw.phone || p.phone || p.mobilePhone || '081198765432',
      picEmail: raw.picEmail || p.email || 'budi.santoso@liugong-customer.co.id',
      currentAddress: raw.currentAddress || p.currentAddress || 'Jl. Senopati No. 45, Kebayoran Baru',
      picCity: raw.picCity || p.city || 'Jakarta Selatan',
      picProvince: raw.picProvince || p.province || 'DKI Jakarta',
      picPostalCode: raw.picPostalCode || p.postalCode || '12110',
      selectedDeedNo: raw.selectedDeedNo || prof.latestDeedNo || 'AHU-0098765.AH.01.02.2023',
      stakeholders: sh.length ? sh : [
        { name: 'Budi Santoso', position: 'Direktur Utama', shareAmount: 5000, sharePercentage: 50 },
        { name: 'Hendra Wijaya', position: 'Komisaris Utama', shareAmount: 3000, sharePercentage: 30 },
        { name: 'PT Investama Megah Mandiri', position: 'Pemegang Saham', shareAmount: 2000, sharePercentage: 20 },
      ],
      // Extended fields
      facilityPurpose: raw.facilityPurpose || prop.facilityPurpose || 'INVESTMENT',
      financingMethod: raw.financingMethod || prop.financingMethod || 'FINANCIAL_LEASE',
      financingValue: raw.financingValue || prop.financingValue || 12500000000,
      downPaymentValue: raw.downPaymentValue || prop.downPaymentValue || 2500000000,
      interestRate: raw.interestRate || prop.interestRate || 10.5,
      tenorMonths: raw.tenorMonths || prop.tenorMonths || 36,
      paymentMethod: raw.paymentMethod || prop.paymentMethod || 'In Arrear',
      industrySegment: raw.industrySegment || app.industrySegment || 'MINING',
      businessRole: raw.businessRole || app.businessRole || 'CONTRACTORS',
      proposal: prop,
      projects: raw.projects || app.projects || [
        { projectOwner: 'PT Vale Indonesia Tbk', projectLocation: 'Sorowako, Sulsel', projectRole: 'Main Contractor', contractStatus: 'Existing' },
        { projectOwner: 'PT Aneka Tambang Tbk', projectLocation: 'Pomalaa, Sultra', projectRole: 'Contractor', contractStatus: 'Existing' },
      ],
      bankReferences: raw.bankReferences || app.bankReferences || [
        { bankOrFinInstitution: 'Bank Mandiri', currency: 'IDR', creditFacility: 15000000000, monthlyInstallment: 450000000, yearStarted: 2021, interestRate: 9.5, paymentRecord: 'Lancar (Kol 1)', facilityStatus: 'Active' },
        { bankOrFinInstitution: 'Bank BCA', currency: 'IDR', creditFacility: 10000000000, monthlyInstallment: 310000000, yearStarted: 2022, interestRate: 9.25, paymentRecord: 'Lancar (Kol 1)', facilityStatus: 'Active' },
      ],
      financialStatements: raw.financialStatements || app.financialStatements || [
        { fiscalYear: 2023, isAudited: true, currentAssets: 28500000000, nonCurrentAssets: 45200000000, totalAssets: 73700000000, currentLiabilities: 18200000000, longTermLiabilities: 24100000000, totalLiabilities: 42300000000, equity: 31400000000, revenue: 68500000000, grossMargin: 15200000000, operatingMargin: 9800000000, tax: 2150000000, netIncome: 7650000000 },
        { fiscalYear: 2024, isAudited: true, currentAssets: 34200000000, nonCurrentAssets: 51800000000, totalAssets: 86000000000, currentLiabilities: 21400000000, longTermLiabilities: 27500000000, totalLiabilities: 48900000000, equity: 37100000000, revenue: 82400000000, grossMargin: 18700000000, operatingMargin: 12400000000, tax: 2720000000, netIncome: 9680000000 },
        { fiscalYear: 2025, isAudited: false, currentAssets: 41000000000, nonCurrentAssets: 58000000000, totalAssets: 99000000000, currentLiabilities: 24500000000, longTermLiabilities: 30500000000, totalLiabilities: 55000000000, equity: 44000000000, revenue: 98600000000, grossMargin: 22500000000, operatingMargin: 15100000000, tax: 3320000000, netIncome: 11780000000 },
      ],
      units: raw.units || prop.units || [
        { brand: 'LiuGong', unitCategory: 'HE', unitType: 'Hydraulic Excavator', modelName: '936E', quantity: 2 },
      ],
      assetSummaryHeLiuGong: raw.assetSummaryHeLiuGong ?? app.assetSummaryHeLiuGong ?? 4,
      assetSummaryTruckLiuGong: raw.assetSummaryTruckLiuGong ?? app.assetSummaryTruckLiuGong ?? 2,
      assetSummaryHeNonLiuGong: raw.assetSummaryHeNonLiuGong ?? app.assetSummaryHeNonLiuGong ?? 3,
      assetSummaryTruckNonLiuGong: raw.assetSummaryTruckNonLiuGong ?? app.assetSummaryTruckNonLiuGong ?? 5,
    };
  }, [props.data, props.application, props.customer, props.profile, props.pic, props.stakeholders]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '  /  /    ';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num?: number | string) => {
    if (num === undefined || num === null || num === '') return '0,00';
    const n = Number(num);
    if (isNaN(n)) return String(num);
    return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (num?: number | string) => {
    if (!num) return 'Rp 0';
    const n = Number(num);
    if (isNaN(n)) return String(num);
    return 'Rp ' + n.toLocaleString('id-ID');
  };

  const handlePrint = () => {
    window.print();
  };

  const isCustNew = d.customerStatus === 'NEW';
  const isCustExisting = d.customerStatus === 'EXISTING' || !isCustNew;
  const isCorp = d.companyType === 'CORPORATE';
  const isComm = d.companyType === 'COMMERCIAL';

  return (
    <div className="excel-fap-viewer">
      {/* Excel Green Ribbon Header */}
      <div className="excel-fap-ribbon">
        <div className="excel-ribbon-left">
          <FileSpreadsheet size={16} className="excel-green-icon" />
          <div className="excel-file-badge">
            <span className="excel-file-name">FAP-Document_APPROVED_v01.2025.xlsx</span>
            <span className="excel-tab-badge">Sheet: APPROVED v01.2025 (Rows 1-118)</span>
          </div>
          <span className="excel-live-tag">
            <span className="excel-live-dot" /> Live Excel Mirror
          </span>
        </div>
        <div className="excel-ribbon-right">
          <div className="excel-zoom-controls">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="excel-zoom-btn-label">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>
          <button
            type="button"
            className="excel-print-btn"
            onClick={handlePrint}
            title="Print / Unduh PDF Lembar Resmi A4"
          >
            <Printer size={13} /> Cetak Dokumen A4
          </button>
        </div>
      </div>

      {/* Spreadsheet Canvas */}
      <div className="excel-fap-viewport" ref={containerRef}>
        <div
          id="fap-excel-printable-doc"
          className="excel-fap-paper"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            width: '940px',
            minWidth: '940px',
          }}
        >
          {/* ==============================================================
              SECTION 1: HEADER & CLASSIFICATION (ROWS 1 - 10)
              ============================================================== */}
          <div className="excel-exact-header">
            <div className="exact-header-top">
              <div className="exact-header-logo">
                <img
                  src={`data:image/png;base64,${LIUGONG_LOGO_B64}`}
                  alt="LiuGong Finance Indonesia"
                />
              </div>
              <div className="exact-header-title">APPLICATION FORM</div>
              <div className="exact-header-reg">
                <span className="reg-lbl">No. Register :</span>
                <span className="reg-val highlight-dynamic">{d.fapNumber}</span>
              </div>
            </div>

            <div className="exact-navy-bar" />

            <div className="exact-matrix-grid">
              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Tanggal/ Date</span>
                  <span className="exact-matrix-val highlight-dynamic">{formatDate(d.applicationDate)}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Cabang/ Branch</span>
                  <span className="exact-matrix-val highlight-dynamic">{d.branchCode}</span>
                </div>
              </div>

              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Customer Baru/ New Customer</span>
                  <span className="exact-matrix-chk">{isCustNew ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Customer Lama / Existing Customer</span>
                  <span className="exact-matrix-chk">{isCustExisting ? '☑' : '☐'}</span>
                </div>
              </div>

              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Corporate</span>
                  <span className="exact-matrix-chk">{isCorp ? '☑' : '☐'}</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Commercial</span>
                  <span className="exact-matrix-chk">{isComm ? '☑' : '☐'}</span>
                </div>
              </div>

              <div className="exact-matrix-box">
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">Micro</span>
                  <span className="exact-matrix-chk">☐</span>
                </div>
                <div className="exact-matrix-row">
                  <span className="exact-matrix-lbl">LiuGong Used</span>
                  <span className="exact-matrix-chk">☐</span>
                </div>
              </div>
            </div>

            <div className="exact-orange-bar" />
          </div>

          {/* ==============================================================
              SECTION 2: PROFIL PERUSAHAAN & PIC / SHAREHOLDERS (ROWS 12 - 45)
              ============================================================== */}
          <div className="exact-fap-body">
            {/* Left Column: Company Details */}
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Nama Perusahaan/ Company's Name</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.companyName}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Alamat Perusahaan/ Company Address</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box multiline highlight-dynamic">{d.companyAddress}</div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">Kota/City</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.city}</div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">Provinsi/Province</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.province}</div>
              </div>

              <div className="exact-sub-row">
                <span className="exact-sub-lbl">Postal code</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.postalCode}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Bisnis Utama/ Main Business</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.mainBusiness}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">No. Akta Pendirian/ Deed Establishment</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.3 }}>{d.establishmentActNo}</div>
                  <div className="exact-inline-group" style={{ flex: 1.1 }}>
                    <span className="exact-inline-lbl">Tanggal/ Est Date :</span>
                    <div className="exact-fap-box highlight-dynamic">{formatDate(d.establishmentDate)}</div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Pengalaman/ Experience</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row" style={{ alignItems: 'center' }}>
                  <div className="exact-fap-box highlight-dynamic" style={{ maxWidth: '65px', textAlign: 'center' }}>{d.experienceYears}</div>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>years</span>
                  <div className="exact-fap-box highlight-dynamic" style={{ maxWidth: '65px', textAlign: 'center' }}>{d.experienceMonths}</div>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>months</span>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">No. Akta Perubahan Terakhir</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.3 }}>{d.latestDeedNo}</div>
                  <div className="exact-inline-group" style={{ flex: 1.1 }}>
                    <span className="exact-inline-lbl">Tanggal/ Date :</span>
                    <div className="exact-fap-box highlight-dynamic">{formatDate(d.latestDeedDate)}</div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">NIB (No Induk Berusaha)</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.nib}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">NPWP/No.Tax</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.npwp}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Phone / Fax</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.phoneFax}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Website</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.website || '-'}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Email</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.email}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Sumber Pembayaran/ Repayment source</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.repaymentSource}</div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Status tempat usaha/Business Location Status</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.locationStatus}</div>
              </div>
            </div>

            {/* Right Column: PIC & Shareholders */}
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl" style={{ width: '135px' }}>Penanggung Jawab/PIC</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.2 }}>{d.picName}</div>
                  <div className="exact-inline-group" style={{ flex: 1.2 }}>
                    <span className="exact-inline-lbl">Telepon/Phone :</span>
                    <div className="exact-fap-box highlight-dynamic">{d.phone}</div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl" style={{ width: '135px' }}>Jabatan/ Position</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic" style={{ flex: 1.2 }}>{d.position}</div>
                  <div className="exact-inline-group" style={{ flex: 1.2 }}>
                    <span className="exact-inline-lbl">Email :</span>
                    <div className="exact-fap-box highlight-dynamic">{d.picEmail}</div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl" style={{ width: '135px' }}>Alamat Tempat Tinggal/ Current Address</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box multiline highlight-dynamic">{d.currentAddress}</div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl" style={{ width: '120px' }}>Kota/City</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.picCity}</div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl" style={{ width: '120px' }}>Provinsi/Province</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.picProvince}</div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl" style={{ width: '120px' }}>Kode Pos/Postal code</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">{d.picPostalCode}</div>
              </div>

              {/* Shareholder Table */}
              <div className="exact-sh-section">
                <div className="exact-sh-title">Struktur Organisasi & Pemegang Saham/ Organization & Shareholder Structure</div>
                <div className="exact-sh-subtitle">
                  Berdasarkan Akta/ Based on Act No. <span className="highlight-dynamic" style={{ fontWeight: 600 }}>{d.selectedDeedNo || d.latestDeedNo}</span>
                </div>

                <table className="exact-sh-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }}>No</th>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th style={{ width: '110px', textAlign: 'left' }}>Position</th>
                      <th style={{ width: '105px', textAlign: 'right' }}>Amount of Share</th>
                      <th style={{ width: '55px', textAlign: 'right' }}>% share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const sh = d.stakeholders?.[i];
                      return (
                        <tr key={i}>
                          <td className="center">{i + 1}</td>
                          <td className="highlight-dynamic">{sh?.name || ''}</td>
                          <td className="highlight-dynamic">{sh?.position || ''}</td>
                          <td className="right highlight-dynamic">{sh?.shareAmount ? formatNumber(sh.shareAmount) : ''}</td>
                          <td className="right highlight-dynamic">{sh?.sharePercentage ? Number(sh.sharePercentage).toFixed(2) + '%' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ==============================================================
              SECTION 3: TUJUAN PEMBIAYAAN & FIXED ASSETS (ROWS 46 - 54)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">TUJUAN PEMBIAYAAN / FINANCING PURPOSE & FIXED ASSETS SUMMARY</div>
          </div>

          <div className="exact-fap-body" style={{ marginTop: '8px' }}>
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Tujuan Pembiayaan / Financing purpose</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box" style={{ flex: 1 }}>
                    <span>Investasi / Investment</span> <b style={{ color: '#002060', marginLeft: '6px' }}>{d.facilityPurpose === 'INVESTMENT' ? '(√)' : '( )'}</b>
                  </div>
                  <div className="exact-fap-box" style={{ flex: 1 }}>
                    <span>Modal Kerja / Working capital</span> <b style={{ color: '#002060', marginLeft: '6px' }}>{d.facilityPurpose === 'WORKING_CAPITAL' ? '(√)' : '( )'}</b>
                  </div>
                </div>
              </div>

              <div className="exact-sub-row" style={{ marginLeft: '16px' }}>
                <span className="exact-sub-lbl">Kategori Investasi</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">
                  {d.facilityPurpose === 'INVESTMENT' ? 'Aktivitas Usaha & Penambahan Unit Armada' : 'Kebutuhan Operasional & Kas Berjalan'}
                </div>
              </div>
            </div>

            <div className="exact-fap-col">
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                List Fixed Assets :
              </div>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Brand</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>HE</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Truck</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Unit</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>LiuGong</b></td>
                    <td className="center highlight-dynamic">{d.assetSummaryHeLiuGong || 0}</td>
                    <td className="center highlight-dynamic">{d.assetSummaryTruckLiuGong || 0}</td>
                    <td className="center highlight-dynamic">{(d.assetSummaryHeLiuGong || 0) + (d.assetSummaryTruckLiuGong || 0)}</td>
                    <td className="right highlight-dynamic">
                      {((((d.assetSummaryHeLiuGong || 0) + (d.assetSummaryTruckLiuGong || 0)) / Math.max(1, ((d.assetSummaryHeLiuGong || 0) + (d.assetSummaryTruckLiuGong || 0) + (d.assetSummaryHeNonLiuGong || 0) + (d.assetSummaryTruckNonLiuGong || 0)))) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td>Non LiuGong</td>
                    <td className="center highlight-dynamic">{d.assetSummaryHeNonLiuGong || 0}</td>
                    <td className="center highlight-dynamic">{d.assetSummaryTruckNonLiuGong || 0}</td>
                    <td className="center highlight-dynamic">{(d.assetSummaryHeNonLiuGong || 0) + (d.assetSummaryTruckNonLiuGong || 0)}</td>
                    <td className="right highlight-dynamic">
                      {((((d.assetSummaryHeNonLiuGong || 0) + (d.assetSummaryTruckNonLiuGong || 0)) / Math.max(1, ((d.assetSummaryHeLiuGong || 0) + (d.assetSummaryTruckLiuGong || 0) + (d.assetSummaryHeNonLiuGong || 0) + (d.assetSummaryTruckNonLiuGong || 0)))) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td>Total</td>
                    <td className="center">{(d.assetSummaryHeLiuGong || 0) + (d.assetSummaryHeNonLiuGong || 0)}</td>
                    <td className="center">{(d.assetSummaryTruckLiuGong || 0) + (d.assetSummaryTruckNonLiuGong || 0)}</td>
                    <td className="center">{(d.assetSummaryHeLiuGong || 0) + (d.assetSummaryTruckLiuGong || 0) + (d.assetSummaryHeNonLiuGong || 0) + (d.assetSummaryTruckNonLiuGong || 0)}</td>
                    <td className="right">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 4: SEGMENTASI & PROYEK KONTRAK (ROWS 55 - 63)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">SEGMENTASI INDUSTRI & PROYEK KONTRAK BERJALAN</div>
          </div>

          <div className="exact-fap-body" style={{ marginTop: '8px' }}>
            <div className="exact-fap-col" style={{ flex: 0.9 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="exact-matrix-box">
                  <div style={{ background: '#f1f5f9', padding: '3px 6px', fontWeight: 700, fontSize: '9px', borderBottom: '1px solid #000' }}>
                    Segmentasi / Segmentation :
                  </div>
                  {['MINING:Pertambangan', 'AGRICULTURE:Pertanian', 'FORESTRY:Kehutanan', 'CONSTRUCTION:Konstruksi', 'OIL_GAS:Oil & Gas', 'OTHER:Lainnya'].map(item => {
                    const [key, label] = item.split(':');
                    const isSel = d.industrySegment === key;
                    return (
                      <div key={key} className="exact-matrix-row" style={{ padding: '2px 6px', fontSize: '9px' }}>
                        <span>{label}</span>
                        <b style={{ color: isSel ? '#002060' : '#94a3b8' }}>{isSel ? '☑' : '☐'}</b>
                      </div>
                    );
                  })}
                </div>

                <div className="exact-matrix-box">
                  <div style={{ background: '#f1f5f9', padding: '3px 6px', fontWeight: 700, fontSize: '9px', borderBottom: '1px solid #000' }}>
                    Bisnis Utama / Main Business :
                  </div>
                  {['CONCESSION_OWNER:Cons. Owner', 'CONTRACTORS:Contractors', 'SUB_CONTRACTORS:Sub Cont', 'RENTAL:Rental', 'OTHER:Other'].map(item => {
                    const [key, label] = item.split(':');
                    const isSel = d.businessRole === key;
                    return (
                      <div key={key} className="exact-matrix-row" style={{ padding: '2px 6px', fontSize: '9px' }}>
                        <span>{label}</span>
                        <b style={{ color: isSel ? '#002060' : '#94a3b8' }}>{isSel ? '☑' : '☐'}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="exact-fap-col" style={{ flex: 1.1 }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                Daftar Kontrak Proyek / Project Contracts :
              </div>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Pemilik Proyek / Owner</th>
                    <th style={{ width: '120px', textAlign: 'left' }}>Lokasi / Location</th>
                    <th style={{ width: '95px', textAlign: 'left' }}>Role</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => {
                    const proj = d.projects?.[i];
                    return (
                      <tr key={i}>
                        <td className="highlight-dynamic">{proj?.projectOwner || ''}</td>
                        <td className="highlight-dynamic">{proj?.projectLocation || ''}</td>
                        <td className="highlight-dynamic">{proj?.projectRole || ''}</td>
                        <td className="center highlight-dynamic">{proj?.contractStatus || (proj ? 'Existing' : '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 5: REFERENSI BANK & PROPOSAL FASILITAS (ROWS 64 - 86)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">REFERENSI FASILITAS BANK & PROPOSAL PEMBIAYAAN</div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
              Fasilitas Kredit Bank & Lembaga Keuangan Berjalan :
            </div>
            <table className="exact-sh-table">
              <thead>
                <tr>
                  <th style={{ width: '28px' }}>No</th>
                  <th style={{ textAlign: 'left' }}>Bank/Fin</th>
                  <th style={{ width: '55px', textAlign: 'center' }}>Currency</th>
                  <th style={{ width: '115px', textAlign: 'right' }}>Credit Facility</th>
                  <th style={{ width: '105px', textAlign: 'right' }}>Monthly Installment</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Year Started</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Interest Rate</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Payment Record</th>
                  <th style={{ width: '65px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => {
                  const b = d.bankReferences?.[i];
                  return (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td className="highlight-dynamic">{b?.bankOrFinInstitution || ''}</td>
                      <td className="center highlight-dynamic">{b?.currency || (b ? 'IDR' : '')}</td>
                      <td className="right highlight-dynamic">{b?.creditFacility ? formatCurrency(b.creditFacility) : ''}</td>
                      <td className="right highlight-dynamic">{b?.monthlyInstallment ? formatCurrency(b.monthlyInstallment) : ''}</td>
                      <td className="center highlight-dynamic">{b?.yearStarted || ''}</td>
                      <td className="right highlight-dynamic">{b?.interestRate ? b.interestRate + '%' : ''}</td>
                      <td className="center highlight-dynamic">{b?.paymentRecord || ''}</td>
                      <td className="center highlight-dynamic">{b?.facilityStatus || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Proposal Facility Details */}
          <div className="exact-fap-body" style={{ marginTop: '12px' }}>
            <div className="exact-fap-col">
              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Cara Pembiayaan / Financing Method</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic">
                  {d.financingMethod === 'FINANCIAL_LEASE' ? 'Sewa Pembiayaan / Financial Lease (√)' : d.financingMethod === 'SALE_AND_LEASE_BACK' ? 'Jual dan Sewa Kembali / Sale and Lease Back (√)' : 'Pembelian Angsuran / Installment (√)'}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Nilai Pembiayaan / Financing Value</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-fap-box highlight-dynamic" style={{ fontWeight: 700 }}>
                  {formatCurrency(d.financingValue)}
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Uang Muka / Down Payment</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic">{formatCurrency(d.downPaymentValue)}</div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Bunga / Rate :</span>
                    <div className="exact-fap-box highlight-dynamic">{d.interestRate}% p.a.</div>
                  </div>
                </div>
              </div>

              <div className="exact-fap-row">
                <span className="exact-fap-lbl">Jangka Waktu / Tenor</span>
                <span className="exact-fap-colon">:</span>
                <div className="exact-dual-row">
                  <div className="exact-fap-box highlight-dynamic">{d.tenorMonths} Bulan</div>
                  <div className="exact-inline-group">
                    <span className="exact-inline-lbl">Cara Bayar :</span>
                    <div className="exact-fap-box highlight-dynamic">{d.paymentMethod}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="exact-fap-col">
              <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#002060', marginBottom: '4px' }}>
                Rencana Realisasi Unit / Unit Realization :
              </div>
              <table className="exact-sh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Brand</th>
                    <th style={{ width: '90px', textAlign: 'left' }}>Category</th>
                    <th style={{ textAlign: 'left' }}>Model / Asset</th>
                    <th style={{ width: '55px', textAlign: 'center' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.units || []).map((u: any, i: number) => (
                    <tr key={i}>
                      <td className="highlight-dynamic">{u.brand || 'LiuGong'}</td>
                      <td className="highlight-dynamic">{u.unitCategory || 'HE'}</td>
                      <td className="highlight-dynamic">{u.modelName || u.assetName || 'Excavator'}</td>
                      <td className="center highlight-dynamic">{u.quantity || 1}</td>
                    </tr>
                  ))}
                  {(!d.units || d.units.length === 0) && (
                    <tr>
                      <td className="highlight-dynamic">LiuGong</td>
                      <td className="highlight-dynamic">HE</td>
                      <td className="highlight-dynamic">Hydraulic Excavator 936E</td>
                      <td className="center highlight-dynamic">2</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              SECTION 6: RINGKASAN LAPORAN KEUANGAN (ROWS 89 - 100)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">RINGKASAN LAPORAN KEUANGAN 3 TAHUN TERAKHIR / FINANCIAL STATEMENTS</div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <table className="exact-sh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '220px' }}>Neraca / Balance Sheet (IDR)</th>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <th key={i} style={{ width: '110px', textAlign: 'right' }}>{fs.fiscalYear} {fs.isAudited ? '(Audited)' : '(In-house)'}</th>
                  ))}
                  <th style={{ textAlign: 'left', width: '200px' }}>Laba Rugi / Income Statement</th>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <th key={i} style={{ width: '110px', textAlign: 'right' }}>{fs.fiscalYear}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Aset Lancar / Current Assets</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.currentAssets)}</td>
                  ))}
                  <td>Pendapatan / Revenue</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.revenue)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Total Aset Tetap / Non Current Assets</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.nonCurrentAssets)}</td>
                  ))}
                  <td>Laba Kotor / Gross Margin</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.grossMargin)}</td>
                  ))}
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                  <td><b>Total Aset / Total Asset</b></td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.totalAssets)}</b></td>
                  ))}
                  <td>Laba Usaha / Operating Margin</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.operatingMargin)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Total Liabilitas Lancar / Current Liab.</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.currentLiabilities)}</td>
                  ))}
                  <td>Pajak / Tax</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.tax)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Total Liabilitas Jangka Panjang</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.longTermLiabilities)}</td>
                  ))}
                  <td style={{ background: '#f8fafc', fontWeight: 600 }}><b>Laba Bersih / Net Income</b></td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.netIncome)}</b></td>
                  ))}
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                  <td><b>Total Liabilitas / Total Liabilities</b></td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber(fs.totalLiabilities)}</b></td>
                  ))}
                  <td colSpan={1 + (d.financialStatements || []).length} style={{ background: '#f1f5f9' }}></td>
                </tr>
                <tr>
                  <td>Ekuitas / Equity</td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic">{formatNumber(fs.equity)}</td>
                  ))}
                  <td colSpan={1 + (d.financialStatements || []).length} style={{ background: '#f1f5f9' }}></td>
                </tr>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <td><b>Total Liabilitas & Ekuitas</b></td>
                  {(d.financialStatements || []).map((fs: any, i: number) => (
                    <td key={i} className="right highlight-dynamic"><b>{formatNumber((fs.totalLiabilities || 0) + (fs.equity || 0))}</b></td>
                  ))}
                  <td colSpan={1 + (d.financialStatements || []).length} style={{ background: '#f1f5f9' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==============================================================
              SECTION 7: PERNYATAAN & TANDA TANGAN (ROWS 102 - 118)
              ============================================================== */}
          <div className="exact-section-divider">
            <div className="exact-section-header">PERNYATAAN DEBITUR & TANDA TANGAN RESMI</div>
          </div>

          <div style={{ fontSize: '8.5px', color: '#1e293b', lineHeight: 1.35, margin: '8px 0 12px 0' }}>
            <div style={{ fontWeight: 700, marginBottom: '3px' }}>Dengan ini kami menyatakan dan menyetujui bahwa:</div>
            <div>1. PT LiuGong Finance Indonesia telah memberikan penjelasan mengenai karakteristik produk pembiayaan, hak dan kewajiban debitur, serta risiko pembiayaan.</div>
            <div>2. Menyatakan semua informasi dan/atau dokumen yang disampaikan adalah benar, lengkap dan sah sesuai dengan kondisi yang sebenarnya.</div>
            <div>3. Dalam proses persetujuan pengajuan pembiayaan, PT LiuGong Finance Indonesia berhak melakukan pengecekan data ke pihak ketiga (SLIK OJK / Biro Kredit).</div>
            <div>4. PT LiuGong Finance Indonesia berhak untuk menolak permohonan pembiayaan ini tanpa berkewajiban memberikan alasan penolakannya.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>Di tanda tangani debitur / signed by debtor</div>
              <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                [ Materai Rp 10.000 & Stempel Perusahaan ]
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                {d.picName}
              </div>
              <div style={{ fontSize: '8.5px', color: '#475569' }}>
                {d.companyName}
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>Diverifikasi oleh pihak LFI / verified by LFI</div>
              <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                [ Tanda Tangan Relationship Manager ]
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                Marketing Representative
              </div>
              <div style={{ fontSize: '8.5px', color: '#475569' }}>
                PT. LIUGONG FINANCE INDONESIA
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
