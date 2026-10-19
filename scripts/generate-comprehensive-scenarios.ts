import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { all, insert, query, transaction, close, dataDir } from '../server/db';
import { checklistTemplate, fapNumber } from '../server/domain';

function minimalPdfBuffer(title: string, sub: string): Buffer {
  const streamContent = `BT /F1 14 Tf 50 720 Td (${title}) Tj /F1 10 Tf 50 690 Td (${sub}) Tj 50 660 Td (LiuGong Finance Indonesia - Official System Evidence) Tj ET`;
  const streamLen = streamContent.length;
  const pdfStr = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${360 + streamLen}
%%EOF`;
  return Buffer.from(pdfStr);
}

interface ScenarioConfig {
  fapSeq: number;
  companyName: string;
  companyType: 'CORPORATE' | 'COMMERCIAL';
  industrySegment: string;
  city: string;
  province: string;
  branchCode: string;
  customerStatus: 'NEW' | 'EXISTING';
  status: 'DRAFT' | 'SUBMITTED_TO_BS' | 'BS_VERIFIED' | 'IN_CA_LEGAL_REVIEW' | 'CREDIT_COMMITTEE_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  businessRole: string;
  mainBusiness: string;
  experienceYears: number;
  financingValue: number;
  downPaymentPercent: number;
  tenorMonths: number;
  paymentMethod: 'In Arrear' | 'In Advance';
  units: { brand: string; unitCategory: string; modelName: string; quantity: number; unitPrice: number }[];
  stakeholders: {
    name: string;
    position: string;
    stakeholderType: 'INDIVIDUAL' | 'CORPORATE';
    nationalityType: 'WNI' | 'WNA';
    idType: 'KTP' | 'NPWP' | 'PASSPORT';
    idNumber: string;
    sharePercentage: number;
    email: string;
    mobilePhone: string;
    primaryCapital: number;
  }[];
  financials: {
    assets: number;
    liabilities: number;
    equity: number;
    revenue: number;
    netIncome: number;
  }[]; // 3 entries for [2023, 2024, 2025]
  projectOwner: string;
  bankName: string;
  approvalStory: { actionBy: string; userRole: string; prev: string; next: string; comments: string }[];
  deeds: any[];
}

const scenarios: ScenarioConfig[] = [
  // 1. DRAFT - Initial MKT Intake
  {
    fapSeq: 9,
    companyName: 'PT Borneo Mandiri Coal',
    companyType: 'CORPORATE',
    industrySegment: 'MINING',
    city: 'Balikpapan',
    province: 'Kalimantan Timur',
    branchCode: 'BPN01',
    customerStatus: 'NEW',
    status: 'DRAFT',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Jasa kontraktor penambangan dan overburden removal batubara',
    experienceYears: 6,
    financingValue: 7200000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 936E', quantity: 2, unitPrice: 3600000000 }
    ],
    stakeholders: [
      { name: 'Rudy Hartono', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6471011508820001', sharePercentage: 70, email: 'rudy@borneomandiri.co.id', mobilePhone: '08115401001', primaryCapital: 7000000000 },
      { name: 'Bambang Irawan', position: 'Komisaris', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6471022010850002', sharePercentage: 30, email: 'bambang@borneomandiri.co.id', mobilePhone: '08115401002', primaryCapital: 3000000000 }
    ],
    financials: [
      { assets: 28000000000, liabilities: 12000000000, equity: 16000000000, revenue: 35000000000, netIncome: 3800000000 },
      { assets: 34000000000, liabilities: 14000000000, equity: 20000000000, revenue: 42000000000, netIncome: 4600000000 },
      { assets: 42000000000, liabilities: 18000000000, equity: 24000000000, revenue: 51000000000, netIncome: 5500000000 }
    ],
    projectOwner: 'PT Berau Coal Energy',
    bankName: 'Bank Mandiri',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'DRAFT', comments: 'Penginputan data intake FAP awal untuk kontraktor batubara Balikpapan.' }
    ],
    deeds: [
      { id: 'deed-app-09-est', type: 'establishment', deedNumber: '28', deedDate: '2019-04-12', notaryName: 'Siti Rahmawati, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0019283.AH.01.01.TAHUN 2019', status: 'DRAFT', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Pendirian PT Borneo Mandiri Coal dengan modal dasar Rp 10.000.000.000.</li><li>Kegiatan usaha bergerak di bidang jasa penunjang pertambangan.</li></ol>' }
    ]
  },

  // 2. DRAFT - Waiting for Audited Financials
  {
    fapSeq: 10,
    companyName: 'PT Andalas Sawit Subur',
    companyType: 'COMMERCIAL',
    industrySegment: 'AGRICULTURE',
    city: 'Pekanbaru',
    province: 'Riau',
    branchCode: 'PKU01',
    customerStatus: 'NEW',
    status: 'DRAFT',
    businessRole: 'PLANTATION_OWNERS',
    mainBusiness: 'Perkebunan kelapa sawit dan pengangkutan tandan buah segar (TBS)',
    experienceYears: 8,
    financingValue: 4800000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Wheel Loader 856H', quantity: 3, unitPrice: 1600000000 }
    ],
    stakeholders: [
      { name: 'H. Syamsul Bahri', position: 'Direktur', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '1471031005740003', sharePercentage: 100, email: 'syamsul@andalassawit.com', mobilePhone: '08127508001', primaryCapital: 5000000000 }
    ],
    financials: [
      { assets: 22000000000, liabilities: 9000000000, equity: 13000000000, revenue: 26000000000, netIncome: 2800000000 },
      { assets: 25000000000, liabilities: 10000000000, equity: 15000000000, revenue: 31000000000, netIncome: 3400000000 },
      { assets: 30000000000, liabilities: 12000000000, equity: 18000000000, revenue: 38000000000, netIncome: 4100000000 }
    ],
    projectOwner: 'PT Asian Agri Lestari',
    bankName: 'Bank BRI',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'DRAFT', comments: 'Kelengkapan administrasi dan akta sudah diinput. Menunggu final audit laporan keuangan 2025.' }
    ],
    deeds: [
      { id: 'deed-app-10-est', type: 'establishment', deedNumber: '08', deedDate: '2018-09-20', notaryName: 'Muhammad Fauzi, S.H.', skMenkumhamNumber: 'AHU-0028192.AH.01.01.TAHUN 2018', status: 'DRAFT', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Andalas Sawit Subur.</li><li>Kedudukan di Kota Pekanbaru, Riau.</li></ol>' }
    ]
  },

  // 3. SUBMITTED_TO_BS - New Submission Port Logistics
  {
    fapSeq: 11,
    companyName: 'PT Celebes Samudra Logistik',
    companyType: 'CORPORATE',
    industrySegment: 'LOGISTICS',
    city: 'Makassar',
    province: 'Sulawesi Selatan',
    branchCode: 'MAK01',
    customerStatus: 'NEW',
    status: 'SUBMITTED_TO_BS',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Jasa logistik pergudangan dan bongkar muat peti kemas pelabuhan',
    experienceYears: 5,
    financingValue: 2500000000,
    downPaymentPercent: 0.2,
    tenorMonths: 24,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Wheel Loader 835H', quantity: 2, unitPrice: 1250000000 }
    ],
    stakeholders: [
      { name: 'Andi Mappaselle', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '7371052104800001', sharePercentage: 60, email: 'andi@celebeslogistik.co.id', mobilePhone: '08134211001', primaryCapital: 3000000000 },
      { name: 'Hj. Fatimah Zahra', position: 'Direktur Keuangan', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '7371081502840002', sharePercentage: 40, email: 'fatimah@celebeslogistik.co.id', mobilePhone: '08134211002', primaryCapital: 2000000000 }
    ],
    financials: [
      { assets: 18000000000, liabilities: 7000000000, equity: 11000000000, revenue: 24000000000, netIncome: 2200000000 },
      { assets: 22000000000, liabilities: 8000000000, equity: 14000000000, revenue: 29000000000, netIncome: 2900000000 },
      { assets: 27000000000, liabilities: 10000000000, equity: 17000000000, revenue: 36000000000, netIncome: 3700000000 }
    ],
    projectOwner: 'PT Pelindo Jasa Logistik',
    bankName: 'Bank BNI',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan disubmit ke Branch Support Makassar beserta FAP bertandatangan debitur.' }
    ],
    deeds: [
      { id: 'deed-app-11-est', type: 'establishment', deedNumber: '14', deedDate: '2021-01-15', notaryName: 'H. Baso Amang, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0004123.AH.01.01.TAHUN 2021', status: 'SUBMITTED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Pendirian PT Celebes Samudra Logistik di Makassar.</li><li>Fokus usaha jasa pergudangan dan bongkar muat alat berat.</li></ol>' }
    ]
  },

  // 4. SUBMITTED_TO_BS - Existing Repeat Order Construction
  {
    fapSeq: 12,
    companyName: 'PT Cipta Konstruksi Surabaya',
    companyType: 'CORPORATE',
    industrySegment: 'CONSTRUCTION',
    city: 'Surabaya',
    province: 'Jawa Timur',
    branchCode: 'SBY01',
    customerStatus: 'EXISTING',
    status: 'SUBMITTED_TO_BS',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Pekerjaan tanah, cut and fill, dan pengaspalan proyek jalan tol',
    experienceYears: 11,
    financingValue: 6800000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 922E', quantity: 4, unitPrice: 1700000000 }
    ],
    stakeholders: [
      { name: 'Ir. Hendro Wijoyo', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3578010408710001', sharePercentage: 55, email: 'hendro@ciptakonstruksi.id', mobilePhone: '08123019001', primaryCapital: 5500000000 },
      { name: 'PT Sarana Buana Holdings', position: 'Shareholder', stakeholderType: 'CORPORATE', nationalityType: 'WNI', idType: 'NPWP', idNumber: '018938291045000', sharePercentage: 45, email: 'legal@saranabuana.com', mobilePhone: '08123019002', primaryCapital: 4500000000 }
    ],
    financials: [
      { assets: 45000000000, liabilities: 19000000000, equity: 26000000000, revenue: 58000000000, netIncome: 6200000000 },
      { assets: 54000000000, liabilities: 22000000000, equity: 32000000000, revenue: 69000000000, netIncome: 7500000000 },
      { assets: 65000000000, liabilities: 26000000000, equity: 39000000000, revenue: 82000000000, netIncome: 8800000000 }
    ],
    projectOwner: 'PT Jasa Marga Gempol Pasuruan',
    bankName: 'Bank BCA',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan repeat order customer lama PT Cipta Konstruksi Surabaya. Unit 4x Excavator 922E.' }
    ],
    deeds: [
      { id: 'deed-app-12-est', type: 'establishment', deedNumber: '05', deedDate: '2015-06-10', notaryName: 'Widodo, S.H.', skMenkumhamNumber: 'AHU-0012891.AH.01.01.TAHUN 2015', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Cipta Konstruksi Surabaya.</li><li>Penyetoran modal awal Rp 5.000.000.000.</li></ol>' },
      { id: 'deed-app-12-amd', type: 'amendment', deedNumber: '19', deedDate: '2023-08-22', notaryName: 'Widodo, S.H.', skMenkumhamNumber: 'AHU-0098124.AH.01.02.TAHUN 2023', status: 'CHECKED', remarkCategoryIds: ['amendment-share-change'], remarks: '<ol><li>Peningkatan modal disetor menjadi Rp 10.000.000.000.</li><li>Masuknya pemegang saham korporasi PT Sarana Buana Holdings (45%).</li></ol>' }
    ]
  },

  // 5. BS_VERIFIED - South Kalimantan Coal Fleet
  {
    fapSeq: 13,
    companyName: 'PT Barito Mega Mining',
    companyType: 'CORPORATE',
    industrySegment: 'MINING',
    city: 'Banjarmasin',
    province: 'Kalimantan Selatan',
    branchCode: 'BJM01',
    customerStatus: 'EXISTING',
    status: 'BS_VERIFIED',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Penambangan batubara dan penyewaan alat berat tambang',
    experienceYears: 10,
    financingValue: 22500000000,
    downPaymentPercent: 0.2,
    tenorMonths: 48,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 950E', quantity: 5, unitPrice: 4500000000 }
    ],
    stakeholders: [
      { name: 'Drs. H. Mulyadi', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6371021109720002', sharePercentage: 50, email: 'mulyadi@baritomega.com', mobilePhone: '08115002001', primaryCapital: 10000000000 },
      { name: 'Hendra Setiawan', position: 'Direktur Operasional', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6371031908780003', sharePercentage: 50, email: 'hendra@baritomega.com', mobilePhone: '08115002002', primaryCapital: 10000000000 }
    ],
    financials: [
      { assets: 80000000000, liabilities: 35000000000, equity: 45000000000, revenue: 110000000000, netIncome: 13500000000 },
      { assets: 95000000000, liabilities: 40000000000, equity: 55000000000, revenue: 135000000000, netIncome: 16800000000 },
      { assets: 115000000000, liabilities: 48000000000, equity: 67000000000, revenue: 162000000000, netIncome: 20500000000 }
    ],
    projectOwner: 'PT Adaro Energy Indonesia Tbk',
    bankName: 'Bank Mandiri',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan armada 5 unit Excavator 950E lengkap dengan kontrak Adaro.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Verifikasi kepatuhan dan keaslian dokumen NIB, NPWP, dan KTP selesai dan valid 100%.' }
    ],
    deeds: [
      { id: 'deed-app-13-est', type: 'establishment', deedNumber: '21', deedDate: '2016-03-14', notaryName: 'Gusti Mahfudz, S.H.', skMenkumhamNumber: 'AHU-0008912.AH.01.01.TAHUN 2016', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Pendirian PT Barito Mega Mining.</li><li>Kedudukan di Banjarmasin.</li></ol>' }
    ]
  },

  // 6. BS_VERIFIED - PMA with Foreign Shareholder
  {
    fapSeq: 14,
    companyName: 'PT Bandung Quarry Prima',
    companyType: 'CORPORATE',
    industrySegment: 'MINING',
    city: 'Bandung',
    province: 'Jawa Barat',
    branchCode: 'BDG01',
    customerStatus: 'NEW',
    status: 'BS_VERIFIED',
    businessRole: 'MINE_OWNERS',
    mainBusiness: 'Penambangan batu split, andesit, dan pabrik stone crusher',
    experienceYears: 7,
    financingValue: 4100000000,
    downPaymentPercent: 0.25,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Bulldozer B230', quantity: 1, unitPrice: 4100000000 }
    ],
    stakeholders: [
      { name: 'Dedi Kusnadi', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3273011204780001', sharePercentage: 60, email: 'dedi@bandungquarry.com', mobilePhone: '08122001001', primaryCapital: 6000000000 },
      { name: 'Michael John Anderson', position: 'Komisaris', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNA', idType: 'PASSPORT', idNumber: 'E9812401A', sharePercentage: 40, email: 'michael@anderson-mining.com.au', mobilePhone: '08122001002', primaryCapital: 4000000000 }
    ],
    financials: [
      { assets: 25000000000, liabilities: 11000000000, equity: 14000000000, revenue: 30000000000, netIncome: 3200000000 },
      { assets: 31000000000, liabilities: 13000000000, equity: 18000000000, revenue: 38000000000, netIncome: 4100000000 },
      { assets: 39000000000, liabilities: 16000000000, equity: 23000000000, revenue: 47000000000, netIncome: 5300000000 }
    ],
    projectOwner: 'PT Kereta Cepat Indonesia China',
    bankName: 'Bank Danamon',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan PMA alat berat Bulldozer B230 untuk quarry batu split Bandung.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Passport dan dokumen legalitas PMA telah diverifikasi sesuai regulasi BKPM.' }
    ],
    deeds: [
      { id: 'deed-app-14-est', type: 'establishment', deedNumber: '33', deedDate: '2019-11-05', notaryName: 'Asep Suparman, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0045129.AH.01.01.TAHUN 2019', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian Penanaman Modal Asing (PMA) PT Bandung Quarry Prima.</li><li>Penyetoran modal asing 40% oleh warga negara Australia.</li></ol>' }
    ]
  },

  // 7. IN_CA_LEGAL_REVIEW - Parallel Analysis Jakarta Infrastructure
  {
    fapSeq: 15,
    companyName: 'PT Wijaya Graha Infrastruktur',
    companyType: 'CORPORATE',
    industrySegment: 'CONSTRUCTION',
    city: 'Jakarta Timur',
    province: 'DKI Jakarta',
    branchCode: 'JKT01',
    customerStatus: 'NEW',
    status: 'IN_CA_LEGAL_REVIEW',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Pekerjaan rekayasa sipil, grading tanah, dan drainase tol',
    experienceYears: 7,
    financingValue: 8500000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Motor Grader 4180D', quantity: 3, unitPrice: 2100000000 },
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 908E', quantity: 2, unitPrice: 1100000000 }
    ],
    stakeholders: [
      { name: 'Ir. Agus Wijaya', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3175031405760001', sharePercentage: 70, email: 'agus@wijayagraha.co.id', mobilePhone: '08118001001', primaryCapital: 7000000000 },
      { name: 'Teguh Prasetyo, S.T.', position: 'Direktur Teknik', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3175061908800002', sharePercentage: 30, email: 'teguh@wijayagraha.co.id', mobilePhone: '08118001002', primaryCapital: 3000000000 }
    ],
    financials: [
      { assets: 36000000000, liabilities: 15000000000, equity: 21000000000, revenue: 48000000000, netIncome: 5100000000 },
      { assets: 44000000000, liabilities: 18000000000, equity: 26000000000, revenue: 59000000000, netIncome: 6400000000 },
      { assets: 55000000000, liabilities: 22000000000, equity: 33000000000, revenue: 72000000000, netIncome: 7900000000 }
    ],
    projectOwner: 'PT Hutama Karya (Persero)',
    bankName: 'Bank Mandiri',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan paket alat grading dan excavator untuk proyek jalan tol.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Dokumen verified. Kelayakan administratif disetujui.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Aplikasi diserahkan ke tim Credit Analyst dan Legal untuk telaah komprehensif.' }
    ],
    deeds: [
      { id: 'deed-app-15-est', type: 'establishment', deedNumber: '11', deedDate: '2019-02-18', notaryName: 'Dr. Kartika Sari, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0012904.AH.01.01.TAHUN 2019', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Wijaya Graha Infrastruktur.</li><li>Kedudukan Jakarta Timur.</li></ol>' },
      { id: 'deed-app-15-amd', type: 'amendment', deedNumber: '24', deedDate: '2023-10-10', notaryName: 'Dr. Kartika Sari, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0081290.AH.01.02.TAHUN 2023', status: 'CHECKED', remarkCategoryIds: ['amendment-management-change'], remarks: '<ol><li>Perubahan susunan pengurus perseroan.</li><li>Pengangkatan Teguh Prasetyo sebagai Direktur Teknik.</li></ol>' }
    ]
  },

  // 8. IN_CA_LEGAL_REVIEW - CA Signoff Completed, Awaiting Legal
  {
    fapSeq: 16,
    companyName: 'PT Mahakam Sumber Mineral',
    companyType: 'CORPORATE',
    industrySegment: 'MINING',
    city: 'Kutai Kartanegara',
    province: 'Kalimantan Timur',
    branchCode: 'BPN01',
    customerStatus: 'EXISTING',
    status: 'IN_CA_LEGAL_REVIEW',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Penambangan batubara kalori tinggi dan rental heavy machinery',
    experienceYears: 9,
    financingValue: 21600000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 936E', quantity: 6, unitPrice: 3600000000 }
    ],
    stakeholders: [
      { name: 'H. Rusli Effendi', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6402011806750001', sharePercentage: 60, email: 'rusli@mahakammineral.com', mobilePhone: '08115501001', primaryCapital: 12000000000 },
      { name: 'Faisal Basri', position: 'Direktur Keuangan', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6402052003820002', sharePercentage: 40, email: 'faisal@mahakammineral.com', mobilePhone: '08115501002', primaryCapital: 8000000000 }
    ],
    financials: [
      { assets: 75000000000, liabilities: 32000000000, equity: 43000000000, revenue: 98000000000, netIncome: 11200000000 },
      { assets: 88000000000, liabilities: 36000000000, equity: 52000000000, revenue: 118000000000, netIncome: 14100000000 },
      { assets: 105000000000, liabilities: 42000000000, equity: 63000000000, revenue: 142000000000, netIncome: 17800000000 }
    ],
    projectOwner: 'PT Kideco Jaya Agung',
    bankName: 'Bank Mandiri',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan ekspansi alat berat 6 unit Excavator 936E.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Verifikasi kelengkapan dokumen sah dan lengkap.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Menyerahkan ke tim analis.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'Rekomendasi Analis Kredit (CA) disetujui. DSCR 1.85x memadai, arus kas kontrak lancar.' }
    ],
    deeds: [
      { id: 'deed-app-16-est', type: 'establishment', deedNumber: '17', deedDate: '2017-08-09', notaryName: 'Yuliana, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0019812.AH.01.01.TAHUN 2017', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Mahakam Sumber Mineral.</li><li>Modal dasar Rp 20.000.000.000.</li></ol>' }
    ]
  },

  // 9. CREDIT_COMMITTEE_REVIEW - Petrochemical Wheel Loaders
  {
    fapSeq: 17,
    companyName: 'PT Nusantara Petrochem Mandiri',
    companyType: 'CORPORATE',
    industrySegment: 'MANUFACTURING',
    city: 'Jakarta Utara',
    province: 'DKI Jakarta',
    branchCode: 'JKT01',
    customerStatus: 'NEW',
    status: 'CREDIT_COMMITTEE_REVIEW',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Penanganan bahan baku kimia, clinker semen, dan material curah',
    experienceYears: 12,
    financingValue: 12800000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Wheel Loader 870H', quantity: 4, unitPrice: 3200000000 }
    ],
    stakeholders: [
      { name: 'Edwin Soeryadjaya', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3172010804680001', sharePercentage: 65, email: 'edwin@nusantarapetro.com', mobilePhone: '08119002001', primaryCapital: 13000000000 },
      { name: 'PT Surya Kemika Prima', position: 'Badan Usaha Pemegang Saham', stakeholderType: 'CORPORATE', nationalityType: 'WNI', idType: 'NPWP', idNumber: '028918274012000', sharePercentage: 35, email: 'holding@suryakemika.co.id', mobilePhone: '08119002002', primaryCapital: 7000000000 }
    ],
    financials: [
      { assets: 62000000000, liabilities: 24000000000, equity: 38000000000, revenue: 78000000000, netIncome: 9200000000 },
      { assets: 75000000000, liabilities: 28000000000, equity: 47000000000, revenue: 95000000000, netIncome: 11800000000 },
      { assets: 92000000000, liabilities: 33000000000, equity: 59000000000, revenue: 116000000000, netIncome: 14500000000 }
    ],
    projectOwner: 'PT Chandra Asri Pacific Tbk',
    bankName: 'Bank BCA',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 4 unit Wheel Loader 870H untuk pabrik petrokimia.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Dokumen verified.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Mulai telaah paralel CA & Legal.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'CA Review disetujui: Arus kas stabil, margin 12.5% sehat.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'CREDIT_COMMITTEE_REVIEW', comments: 'Legal Opinion disetujui: Keabsahan akta dan perizinan clear. Masuk agenda rapat Komite Kredit.' }
    ],
    deeds: [
      { id: 'deed-app-17-est', type: 'establishment', deedNumber: '09', deedDate: '2014-05-12', notaryName: 'Surya Dharma, S.H.', skMenkumhamNumber: 'AHU-0010928.AH.01.01.TAHUN 2014', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Nusantara Petrochem Mandiri.</li><li>Penyetoran modal awal Rp 10.000.000.000.</li></ol>' },
      { id: 'deed-app-17-amd', type: 'amendment', deedNumber: '31', deedDate: '2022-11-20', notaryName: 'Surya Dharma, S.H.', skMenkumhamNumber: 'AHU-0078129.AH.01.02.TAHUN 2022', status: 'CHECKED', remarkCategoryIds: ['amendment-share-change'], remarks: '<ol><li>Peningkatan modal perseroan menjadi Rp 20.000.000.000.</li><li>Struktur kepemilikan saham tercatat sah sesuai AHU Kemenkumham.</li></ol>' }
    ]
  },

  // 10. CREDIT_COMMITTEE_REVIEW - Big Ticket Nickel Mining
  {
    fapSeq: 18,
    companyName: 'PT Krakatau Resources Nusantara',
    companyType: 'CORPORATE',
    industrySegment: 'MINING',
    city: 'Palembang',
    province: 'Sumatera Selatan',
    branchCode: 'PLB01',
    customerStatus: 'EXISTING',
    status: 'CREDIT_COMMITTEE_REVIEW',
    businessRole: 'MINE_OWNERS',
    mainBusiness: 'Penambangan nikel, batubara, dan operasional pelabuhan conveyor',
    experienceYears: 14,
    financingValue: 36000000000,
    downPaymentPercent: 0.25,
    tenorMonths: 48,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 950E', quantity: 8, unitPrice: 4500000000 }
    ],
    stakeholders: [
      { name: 'Ir. Ahmad Zulkarnain', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '1671041907660001', sharePercentage: 50, email: 'ahmad@krakatauresources.com', mobilePhone: '08117101001', primaryCapital: 25000000000 },
      { name: 'Denny Kusuma, M.B.A.', position: 'Komisaris Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '1671062502700002', sharePercentage: 50, email: 'denny@krakatauresources.com', mobilePhone: '08117101002', primaryCapital: 25000000000 }
    ],
    financials: [
      { assets: 140000000000, liabilities: 55000000000, equity: 85000000000, revenue: 190000000000, netIncome: 24500000000 },
      { assets: 175000000000, liabilities: 65000000000, equity: 110000000000, revenue: 235000000000, netIncome: 31000000000 },
      { assets: 215000000000, liabilities: 78000000000, equity: 137000000000, revenue: 288000000000, netIncome: 39500000000 }
    ],
    projectOwner: 'PT Bukit Asam Tbk',
    bankName: 'Bank Mandiri',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan pembiayaan armada 8 unit Excavator 950E senilai Rp 36 Miliar.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Verifikasi korporasi lengkap.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Masuk telaah CA & Legal.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'Analisis kelayakan kredit merekomendasikan persetujuan. Cashflow sangat kuat.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'CREDIT_COMMITTEE_REVIEW', comments: 'Legal Clear. Seluruh akta dan izin usaha IUP aktif. Terjadwal di rapat komite Direksi.' }
    ],
    deeds: [
      { id: 'deed-app-18-est', type: 'establishment', deedNumber: '44', deedDate: '2012-04-18', notaryName: 'Rosdiana, S.H., M.Kn.', skMenkumhamNumber: 'AHU-0004918.AH.01.01.TAHUN 2012', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Krakatau Resources Nusantara di Palembang.</li><li>Modal dasar perseroan Rp 50.000.000.000.</li></ol>' }
    ]
  },

  // 11. APPROVED - Cement Quarry Wheel Loaders
  {
    fapSeq: 19,
    companyName: 'PT Kaltim Semen Perkasa',
    companyType: 'CORPORATE',
    industrySegment: 'CONSTRUCTION',
    city: 'Balikpapan',
    province: 'Kalimantan Timur',
    branchCode: 'BPN01',
    customerStatus: 'EXISTING',
    status: 'APPROVED',
    businessRole: 'MINE_OWNERS',
    mainBusiness: 'Penambangan batu kapur dan pensuplai bahan baku pabrik semen',
    experienceYears: 13,
    financingValue: 4500000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Wheel Loader 856H', quantity: 3, unitPrice: 1500000000 }
    ],
    stakeholders: [
      { name: 'Gunawan Santoso', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6471011904730001', sharePercentage: 75, email: 'gunawan@kaltimsemen.co.id', mobilePhone: '08115403001', primaryCapital: 7500000000 },
      { name: 'Suhartono', position: 'Komisaris', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6471022209760002', sharePercentage: 25, email: 'suhartono@kaltimsemen.co.id', mobilePhone: '08115403002', primaryCapital: 2500000000 }
    ],
    financials: [
      { assets: 38000000000, liabilities: 14000000000, equity: 24000000000, revenue: 49000000000, netIncome: 5800000000 },
      { assets: 46000000000, liabilities: 16000000000, equity: 30000000000, revenue: 60000000000, netIncome: 7400000000 },
      { assets: 56000000000, liabilities: 19000000000, equity: 37000000000, revenue: 73000000000, netIncome: 9200000000 }
    ],
    projectOwner: 'PT Semen Indonesia (Persero) Tbk',
    bankName: 'Bank Mandiri',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 3 unit Wheel Loader 856H untuk quarry batu kapur.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Dokumen verified.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Mulai telaah kredit.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'CA Signoff: Laporan audited Big 4, proyeksi pembayaran lancar.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'CREDIT_COMMITTEE_REVIEW', comments: 'Legal Signoff: Semua persyaratan legalitas terpenuhi.' },
      { actionBy: 'Hendra Kusuma', userRole: 'COMMITTEE', prev: 'CREDIT_COMMITTEE_REVIEW', next: 'APPROVED', comments: 'Komite Kredit MENYETUJUI pembiayaan 3 unit Wheel Loader LiuGong 856H (Rp 4.5 Miliar, Tenor 36 bln). Surat Persetujuan Pembiayaan Kredit (SPPK) dapat diterbitkan.' }
    ],
    deeds: [
      { id: 'deed-app-19-est', type: 'establishment', deedNumber: '15', deedDate: '2013-10-08', notaryName: 'Bambang Sudiro, S.H.', skMenkumhamNumber: 'AHU-0008129.AH.01.01.TAHUN 2013', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Kaltim Semen Perkasa.</li><li>Modal disetor Rp 10.000.000.000.</li></ol>' }
    ]
  },

  // 12. APPROVED - Palm Oil Plantation Mini Excavators
  {
    fapSeq: 20,
    companyName: 'PT Sumatra Agro Plantation',
    companyType: 'COMMERCIAL',
    industrySegment: 'AGRICULTURE',
    city: 'Medan',
    province: 'Sumatera Utara',
    branchCode: 'MDN01',
    customerStatus: 'EXISTING',
    status: 'APPROVED',
    businessRole: 'PLANTATION_OWNERS',
    mainBusiness: 'Perkebunan kelapa sawit dan pengolahan minyak kelapa sawit (CPO)',
    experienceYears: 15,
    financingValue: 3500000000,
    downPaymentPercent: 0.25,
    tenorMonths: 24,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 906E', quantity: 5, unitPrice: 700000000 }
    ],
    stakeholders: [
      { name: 'dr. H. Rizal Effendi', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '1271011103680001', sharePercentage: 100, email: 'rizal@sumatraagro.com', mobilePhone: '08116001001', primaryCapital: 5000000000 }
    ],
    financials: [
      { assets: 32000000000, liabilities: 11000000000, equity: 21000000000, revenue: 41000000000, netIncome: 4800000000 },
      { assets: 39000000000, liabilities: 13000000000, equity: 26000000000, revenue: 50000000000, netIncome: 6200000000 },
      { assets: 48000000000, liabilities: 15000000000, equity: 33000000000, revenue: 63000000000, netIncome: 8100000000 }
    ],
    projectOwner: 'PT Perkebunan Nusantara IV (PTPN IV)',
    bankName: 'Bank BRI',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 5 unit Mini Excavator 906E untuk parit perkebunan sawit.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Verifikasi lengkap.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Mulai telaah paralel.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'CA Review disetujui: Hasil panen sawit melimpah, rasio profitabilitas prima.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'CREDIT_COMMITTEE_REVIEW', comments: 'Legal Review disetujui: Akta dan HGU kebun valid tanpa sengketa.' },
      { actionBy: 'Hendra Kusuma', userRole: 'COMMITTEE', prev: 'CREDIT_COMMITTEE_REVIEW', next: 'APPROVED', comments: 'Komite Kredit MENYETUJUI pembiayaan 5 unit Mini Excavator LiuGong 906E.' }
    ],
    deeds: [
      { id: 'deed-app-20-est', type: 'establishment', deedNumber: '07', deedDate: '2011-03-25', notaryName: 'Hasbullah, S.H.', skMenkumhamNumber: 'AHU-0003189.AH.01.01.TAHUN 2011', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Sumatra Agro Plantation di Medan.</li><li>Fokus usaha perkebunan dan pabrik kelapa sawit.</li></ol>' }
    ]
  },

  // 13. REJECTED - Committee Rejection: High Leverage / D/E Ratio Exceeded
  {
    fapSeq: 21,
    companyName: 'PT Global Prima Energitama',
    companyType: 'COMMERCIAL',
    industrySegment: 'MINING',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    branchCode: 'JKT01',
    customerStatus: 'NEW',
    status: 'REJECTED',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Jasa penggalian tambang batubara dan rental excavator',
    experienceYears: 4,
    financingValue: 14400000000,
    downPaymentPercent: 0.15,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 936E', quantity: 4, unitPrice: 3600000000 }
    ],
    stakeholders: [
      { name: 'Bayu Wicaksono', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3174020911850001', sharePercentage: 60, email: 'bayu@globalprimaenergi.com', mobilePhone: '08128004001', primaryCapital: 3000000000 },
      { name: 'Doni Pratama', position: 'Direktur', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3174051408870002', sharePercentage: 40, email: 'doni@globalprimaenergi.com', mobilePhone: '08128004002', primaryCapital: 2000000000 }
    ],
    financials: [
      { assets: 25000000000, liabilities: 20000000000, equity: 5000000000, revenue: 28000000000, netIncome: 650000000 },
      { assets: 29000000000, liabilities: 23500000000, equity: 5500000000, revenue: 32000000000, netIncome: 500000000 },
      { assets: 35000000000, liabilities: 29000000000, equity: 6000000000, revenue: 36000000000, netIncome: 450000000 }
    ],
    projectOwner: 'PT Tambang Batubara Sejahtera',
    bankName: 'Bank Swasta Nasional',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 4 unit Excavator 936E.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Dokumen verified.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Mulai telaah paralel.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'Catatan Analis: Rasio liabilitas terhadap ekuitas (D/E ratio) tinggi di angka 4.8x. Cashflow sangat rentan fluktuasi harga komoditas.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'CREDIT_COMMITTEE_REVIEW', comments: 'Eskalasi ke Komite Kredit dengan catatan mitigasi risiko ketat.' },
      { actionBy: 'Hendra Kusuma', userRole: 'COMMITTEE', prev: 'CREDIT_COMMITTEE_REVIEW', next: 'REJECTED', comments: 'DITOLAK KOMITE KREDIT: Tingkat hutang (leverage) debitur melampaui batas toleransi risiko (D/E > 4.0x) dan tidak memiliki kontrak penjaminan off-take jangka panjang yang memadai.' }
    ],
    deeds: [
      { id: 'deed-app-21-est', type: 'establishment', deedNumber: '19', deedDate: '2020-07-15', notaryName: 'Yanto, S.H.', skMenkumhamNumber: 'AHU-0018291.AH.01.01.TAHUN 2020', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Global Prima Energitama.</li><li>Modal dasar Rp 5.000.000.000.</li></ol>' }
    ]
  },

  // 14. REJECTED - Legal Rejection: Deed Dispute in Court
  {
    fapSeq: 22,
    companyName: 'PT Anugerah Agraria Sentosa',
    companyType: 'CORPORATE',
    industrySegment: 'FORESTRY',
    city: 'Semarang',
    province: 'Jawa Tengah',
    branchCode: 'SMG01',
    customerStatus: 'NEW',
    status: 'REJECTED',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Penebangan kayu hutan tanaman industri (HTI) dan penyiapan lahan',
    experienceYears: 6,
    financingValue: 3400000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 922E', quantity: 2, unitPrice: 1700000000 }
    ],
    stakeholders: [
      { name: 'Joko Susanto', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3374011406790001', sharePercentage: 50, email: 'joko@anugerahagraria.com', mobilePhone: '08122802001', primaryCapital: 3000000000 },
      { name: 'Tri Handoko', position: 'Direktur', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3374032009820002', sharePercentage: 50, email: 'tri@anugerahagraria.com', mobilePhone: '08122802002', primaryCapital: 3000000000 }
    ],
    financials: [
      { assets: 20000000000, liabilities: 9000000000, equity: 11000000000, revenue: 26000000000, netIncome: 2400000000 },
      { assets: 24000000000, liabilities: 10500000000, equity: 13500000000, revenue: 31000000000, netIncome: 2900000000 },
      { assets: 29000000000, liabilities: 12000000000, equity: 17000000000, revenue: 37000000000, netIncome: 3500000000 }
    ],
    projectOwner: 'PT Perhutani Anugerah Mandiri',
    bankName: 'Bank Jateng',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 2 unit Excavator 922E proyek HTI.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Verifikasi checklist selesai.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Masuk telaah CA & Legal.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'REJECTED', comments: 'DITOLAK PADA TAHAP LEGAL: Berdasarkan hasil penelusuran SIPP Pengadilan Negeri Semarang, terdapat perkara perdata sengketa kepengurusan akta notaris aktif antara para pemegang saham perseroan. Aplikasi ditolak demi mencegah sengketa hukum di kemudian hari.' }
    ],
    deeds: [
      { id: 'deed-app-22-est', type: 'establishment', deedNumber: '04', deedDate: '2018-02-11', notaryName: 'Soedirman, S.H.', skMenkumhamNumber: 'AHU-0004128.AH.01.01.TAHUN 2018', status: 'REJECTED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Anugerah Agraria Sentosa.</li><li>Terdapat gugatan pembatalan akta kepengurusan di PN Semarang.</li></ol>' }
    ]
  },

  // 15. RETURNED - Returned to Marketing: Blurry Deed Scan & Missing SK Menkumham
  {
    fapSeq: 23,
    companyName: 'PT Khatulistiwa Mineral Abadi',
    companyType: 'CORPORATE',
    industrySegment: 'MINING',
    city: 'Pontianak',
    province: 'Kalimantan Barat',
    branchCode: 'PTK01',
    customerStatus: 'NEW',
    status: 'RETURNED',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Penambangan bauksit dan pengangkutan material tambang',
    experienceYears: 5,
    financingValue: 10800000000,
    downPaymentPercent: 0.2,
    tenorMonths: 36,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Excavator 936E', quantity: 3, unitPrice: 3600000000 }
    ],
    stakeholders: [
      { name: 'Tan Kok Leong', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6171011808750001', sharePercentage: 70, email: 'kokleong@khatulistwamineral.com', mobilePhone: '08125601001', primaryCapital: 7000000000 },
      { name: 'Suryanto Wijaya', position: 'Direktur', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '6171032504820002', sharePercentage: 30, email: 'suryanto@khatulistwamineral.com', mobilePhone: '08125601002', primaryCapital: 3000000000 }
    ],
    financials: [
      { assets: 38000000000, liabilities: 16000000000, equity: 22000000000, revenue: 52000000000, netIncome: 5500000000 },
      { assets: 47000000000, liabilities: 19000000000, equity: 28000000000, revenue: 64000000000, netIncome: 6900000000 },
      { assets: 58000000000, liabilities: 23000000000, equity: 35000000000, revenue: 78000000000, netIncome: 8600000000 }
    ],
    projectOwner: 'PT Indonesia Chemical Alumina',
    bankName: 'Bank Kalbar',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 3 unit Excavator 936E tambang bauksit.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'RETURNED', comments: 'DIKEMBALIKAN KE MARKETING (MKT): Salinan Akta Perubahan Nomor 18 halaman 4 dan 5 tidak terbaca (buram), serta lembar pengesahan SK Menkumham belum terunggah. Mohon mintakan scan asli berkualitas baik kepada debitur dan submit ulang.' }
    ],
    deeds: [
      { id: 'deed-app-23-est', type: 'establishment', deedNumber: '10', deedDate: '2019-05-14', notaryName: 'Lim Thian Seng, S.H.', skMenkumhamNumber: 'AHU-0012489.AH.01.01.TAHUN 2019', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Khatulistiwa Mineral Abadi.</li><li>Kedudukan di Pontianak.</li></ol>' },
      { id: 'deed-app-23-amd', type: 'amendment', deedNumber: '18', deedDate: '2024-02-20', notaryName: 'Lim Thian Seng, S.H.', skMenkumhamNumber: 'AHU-PENDING', status: 'DRAFT', remarkCategoryIds: ['amendment-articles-change'], remarks: '<ol><li>Perubahan pasal anggaran dasar perseroan.</li><li>Scan dokumen belum lengkap, menunggu perbaikan dari MKT.</li></ol>' }
    ]
  },

  // 16. RETURNED - Returned to CA: Sensitivity & Cashflow Review
  {
    fapSeq: 24,
    companyName: 'PT Sentosa Sarana Quarry',
    companyType: 'COMMERCIAL',
    industrySegment: 'CONSTRUCTION',
    city: 'Mojokerto',
    province: 'Jawa Timur',
    branchCode: 'SBY01',
    customerStatus: 'EXISTING',
    status: 'RETURNED',
    businessRole: 'CONTRACTORS',
    mainBusiness: 'Penyedia batu split andesit dan beton ready-mix',
    experienceYears: 8,
    financingValue: 3200000000,
    downPaymentPercent: 0.2,
    tenorMonths: 24,
    paymentMethod: 'In Arrear',
    units: [
      { brand: 'LiuGong', unitCategory: 'HE', modelName: 'Wheel Loader 856H', quantity: 2, unitPrice: 1600000000 }
    ],
    stakeholders: [
      { name: 'H. Bambang Soeprapto', position: 'Direktur Utama', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3516010507740001', sharePercentage: 80, email: 'bambang@sentosaquarry.com', mobilePhone: '08123101001', primaryCapital: 4000000000 },
      { name: 'Siti Maryam', position: 'Komisaris', stakeholderType: 'INDIVIDUAL', nationalityType: 'WNI', idType: 'KTP', idNumber: '3516021409780002', sharePercentage: 20, email: 'maryam@sentosaquarry.com', mobilePhone: '08123101002', primaryCapital: 1000000000 }
    ],
    financials: [
      { assets: 24000000000, liabilities: 10000000000, equity: 14000000000, revenue: 32000000000, netIncome: 3400000000 },
      { assets: 29000000000, liabilities: 12000000000, equity: 17000000000, revenue: 39000000000, netIncome: 4200000000 },
      { assets: 36000000000, liabilities: 14500000000, equity: 21500000000, revenue: 47000000000, netIncome: 5100000000 }
    ],
    projectOwner: 'PT Waskita Beton Precast Tbk',
    bankName: 'Bank Jatim',
    approvalStory: [
      { actionBy: 'Anisa Putri', userRole: 'MKT', prev: 'DRAFT', next: 'SUBMITTED_TO_BS', comments: 'Pengajuan 2 unit Wheel Loader 856H quarry Mojokerto.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'SUBMITTED_TO_BS', next: 'BS_VERIFIED', comments: 'Kelengkapan administrasi diverifikasi.' },
      { actionBy: 'Budi Santoso', userRole: 'BS', prev: 'BS_VERIFIED', next: 'IN_CA_LEGAL_REVIEW', comments: 'Mulai telaah kredit.' },
      { actionBy: 'Dimas Pratama', userRole: 'CA', prev: 'IN_CA_LEGAL_REVIEW', next: 'IN_CA_LEGAL_REVIEW', comments: 'Rekomendasi awal CA disubmit.' },
      { actionBy: 'Rina Wijaya', userRole: 'LEGAL', prev: 'IN_CA_LEGAL_REVIEW', next: 'CREDIT_COMMITTEE_REVIEW', comments: 'Legal Clear.' },
      { actionBy: 'Hendra Kusuma', userRole: 'COMMITTEE', prev: 'CREDIT_COMMITTEE_REVIEW', next: 'RETURNED', comments: 'DIKEMBALIKAN KE ANALIS (CA): Komite meminta penyesuaian simulasi sensitivitas biaya solar dan verifikasi konfirmasi tertulis perpanjangan kontrak suplai batu split dengan BUMN Karya sebelum persetujuan definitif.' }
    ],
    deeds: [
      { id: 'deed-app-24-est', type: 'establishment', deedNumber: '12', deedDate: '2016-09-02', notaryName: 'Masdar, S.H.', skMenkumhamNumber: 'AHU-0009182.AH.01.01.TAHUN 2016', status: 'CHECKED', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta Pendirian PT Sentosa Sarana Quarry.</li><li>Modal dasar Rp 5.000.000.000.</li></ol>' }
    ]
  }
];

export async function run() {
  console.log('🚀 Menjalankan Generator 16 Skenario Komprehensif CRM2...');

  const filesDir = path.join(dataDir, 'files');
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  await transaction(async q => {
    for (const sc of scenarios) {
      const fap = fapNumber(sc.fapSeq);
      console.log(`\n📋 Memproses Skenario #${sc.fapSeq}: ${fap} - ${sc.companyName} (${sc.status})`);

      // Check if application already exists
      const existingApp = (await q('SELECT a.id, a.customer_id FROM applications a WHERE a.fap_number=$1', [fap])).rows[0];
      if (existingApp) {
        console.log(`   ⚠️ Aplikasi ${fap} sudah ada, menghapus data lama untuk refresh...`);
        const appId = existingApp.id;
        const custId = existingApp.customer_id;
        await q('DELETE FROM review_signoffs WHERE application_id=$1', [appId]);
        await q('DELETE FROM document_events WHERE application_id=$1', [appId]);
        await q('DELETE FROM approval_logs WHERE application_id=$1', [appId]);
        await q('DELETE FROM document_files WHERE checklist_id IN (SELECT id FROM document_checklists WHERE application_id=$1)', [appId]);
        await q('DELETE FROM document_checklists WHERE application_id=$1', [appId]);
        await q('DELETE FROM financial_statements WHERE application_id=$1', [appId]);
        await q('DELETE FROM financing_unit_items WHERE proposal_id IN (SELECT id FROM financing_proposals WHERE application_id=$1)', [appId]);
        await q('DELETE FROM financing_proposals WHERE application_id=$1', [appId]);
        await q('DELETE FROM bank_references WHERE application_id=$1', [appId]);
        await q('DELETE FROM project_contracts WHERE application_id=$1', [appId]);
        await q('DELETE FROM stakeholders WHERE application_id=$1', [appId]);
        await q('DELETE FROM application_pics WHERE application_id=$1', [appId]);
        await q('DELETE FROM applications WHERE id=$1', [appId]);
        await q('DELETE FROM customers WHERE id=$1', [custId]);
      }

      // 1. Insert Customer
      const cust = await insert('Customer', {
        companyName: sc.companyName,
        companyType: sc.companyType,
        nib: `990926000${String(sc.fapSeq).padStart(4, '0')}`,
        npwp: `99234567890${String(sc.fapSeq).padStart(4, '0')}`,
        establishmentActNo: sc.deeds[0]?.deedNumber || '01',
        establishmentDate: sc.deeds[0]?.deedDate || '2020-01-01'
      }, q);

      // 2. Insert Application
      const legalJson = {
        establishmentActNo: sc.deeds[0]?.deedNumber || '01',
        establishmentDate: sc.deeds[0]?.deedDate || '2020-01-01',
        selectedDeed: sc.deeds[0]?.type || 'establishment',
        deeds: sc.deeds
      };

      const app = await insert('Application', {
        customerId: cust.id,
        fapNumber: fap,
        branchCode: sc.branchCode,
        customerStatus: sc.customerStatus,
        status: sc.status,
        companyAddress: `Jl. Industri Sentral Niaga No. ${sc.fapSeq * 4}`,
        city: sc.city,
        province: sc.province,
        postalCode: '17530',
        phoneFax: `021-8989${String(sc.fapSeq).padStart(3, '0')}`,
        email: `finance@${sc.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.id`,
        mainBusiness: sc.mainBusiness,
        experienceYears: sc.experienceYears,
        experienceMonths: 6,
        locationStatus: 'OWNED',
        repaymentSource: 'Hasil termin operasional kontrak proyek & cashflow bisnis',
        industrySegment: sc.industrySegment,
        businessRole: sc.businessRole,
        applicationDate: `2026-10-${String((sc.fapSeq % 20) + 1).padStart(2, '0')}`
      }, q);

      // Update legal JSON directly
      await q('UPDATE applications SET legal=$1 WHERE id=$2', [JSON.stringify(legalJson), app.id]);

      // 3. Insert ApplicationPic
      const firstStakeholder = sc.stakeholders[0];
      await insert('ApplicationPic', {
        applicationId: app.id,
        picName: firstStakeholder.name,
        position: firstStakeholder.position,
        phone: firstStakeholder.mobilePhone,
        email: firstStakeholder.email,
        currentAddress: `Jl. Permata Indah No. ${sc.fapSeq * 2}`,
        city: sc.city,
        province: sc.province,
        postalCode: '17530',
        country: 'Indonesia'
      }, q);

      // 4. Insert Stakeholders
      for (const st of sc.stakeholders) {
        const parts = st.name.trim().split(/\s+/);
        await insert('Stakeholder', {
          applicationId: app.id,
          name: st.name,
          position: st.position,
          stakeholderType: st.stakeholderType,
          nationalityType: st.nationalityType,
          idType: st.idType,
          idNumber: st.idNumber,
          firstName: parts[0] || st.name,
          middleName: parts.slice(1, -1).join(' ') || '',
          lastName: parts.length > 1 ? parts.at(-1) : '',
          designation: st.position.toUpperCase().includes('DIR') ? 'DIRECTOR' : 'COMMISSIONER',
          email: st.email,
          mobilePhone: st.mobilePhone,
          primaryCapital: st.primaryCapital,
          shareAmount: (st.primaryCapital * (st.sharePercentage / 100)),
          sharePercentage: st.sharePercentage,
          citizenship: st.nationalityType === 'WNA' ? 'FOREIGN' : 'INDONESIAN',
          country: st.nationalityType === 'WNA' ? 'Australia' : 'Indonesia'
        }, q);
      }

      // 5. Insert ProjectContract
      await insert('ProjectContract', {
        applicationId: app.id,
        projectOwner: sc.projectOwner,
        projectLocation: sc.city,
        projectRole: 'Main contractor / primary supplier',
        contractStatus: 'EXISTING'
      }, q);

      // 6. Insert BankReference
      await insert('BankReference', {
        applicationId: app.id,
        bankOrFinInstitution: sc.bankName,
        currency: 'IDR',
        creditFacility: sc.financingValue * 1.5,
        monthlyInstallment: Math.round(sc.financingValue / 36),
        yearStarted: 2021,
        interestRate: '9.25',
        paymentRecord: 'Kol 1 / Lancar',
        facilityStatus: 'Active'
      }, q);

      // 7. Insert FinancingProposal & Unit Items
      const downPaymentValue = Math.round(sc.financingValue * sc.downPaymentPercent);
      const proposal = await insert('FinancingProposal', {
        applicationId: app.id,
        facilityPurpose: 'INVESTMENT',
        financingMethod: 'FINANCIAL_LEASE',
        financingValue: sc.financingValue,
        downPaymentValue: downPaymentValue,
        interestRate: '10.25',
        tenorMonths: sc.tenorMonths,
        paymentMethod: sc.paymentMethod
      }, q);

      for (const u of sc.units) {
        await insert('FinancingUnitItem', {
          proposalId: proposal.id,
          brand: u.brand,
          unitCategory: u.unitCategory,
          modelName: u.modelName,
          quantity: u.quantity,
          unitPrice: u.unitPrice,
          totalPrice: u.unitPrice * u.quantity
        }, q);
      }

      // 8. Insert FinancialStatements (3 Balanced Years)
      const fiscalYears = [2023, 2024, 2025];
      for (let y = 0; y < 3; y++) {
        const fin = sc.financials[y];
        const curAssets = Math.round(fin.assets * 0.4);
        const nonCurAssets = fin.assets - curAssets;
        const curLiab = Math.round(fin.liabilities * 0.45);
        const nonCurLiab = fin.liabilities - curLiab;
        const totalLiab = curLiab + nonCurLiab;
        const equity = fin.assets - totalLiab; // Guaranteed balance!

        await insert('FinancialStatement', {
          applicationId: app.id,
          fiscalYear: fiscalYears[y],
          isAudited: true,
          currentAssets: curAssets,
          nonCurrentAssets: nonCurAssets,
          totalAssets: fin.assets,
          currentLiabilities: curLiab,
          nonCurrentLiabilities: nonCurLiab,
          totalLiabilities: totalLiab,
          equity: equity,
          totalLiabAndEquity: fin.assets,
          revenue: fin.revenue,
          grossMargin: Math.round(fin.revenue * 0.28),
          operatingMargin: Math.round(fin.revenue * 0.18),
          tax: Math.round(fin.netIncome * 0.22),
          netIncome: fin.netIncome
        }, q);
      }

      // 9. Insert DocumentChecklists + 3 Studio Evidence Checklists
      const allChecklists = [
        ...checklistTemplate,
        ['FAP', 'FAP (Financing Application Form)', 'MKT', true],
        ['PREANALYSIS', 'Pre-analysis Document', 'CA', true],
        ['ICLF', 'ICLF (Credit Committee Review)', 'COMMITTEE', true]
      ];

      for (const [code, name, role, mandatory] of allChecklists) {
        const isVerifiedStage = ['BS_VERIFIED', 'IN_CA_LEGAL_REVIEW', 'CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(sc.status);
        const isDone = isVerifiedStage && ['BS', 'MKT'].includes(role as string);

        const chk = await insert('DocumentChecklist', {
          applicationId: app.id,
          documentCode: code,
          documentName: name,
          assignedRole: role,
          isMandatory: mandatory,
          status: isDone ? 'VERIFIED' : (sc.status !== 'DRAFT' ? 'UPLOADED' : 'PENDING'),
          checkedByMkt: sc.status !== 'DRAFT',
          checkedByBs: isVerifiedStage,
          checkedByCa: ['CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(sc.status),
          checkedByLegal: ['CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(sc.status)
        }, q);

        // If not DRAFT, attach real PDF file so Evidence Studio can preview
        if (sc.status !== 'DRAFT' && ['FAP', 'PREANALYSIS', 'ICLF', 'NIB', 'NPWP', 'DEED'].includes(code as string)) {
          const fileKey = crypto.randomUUID();
          const fileName = `${code}_${sc.companyName.replace(/[^A-Za-z0-9]/g, '_')}.pdf`;
          const pdfBuf = minimalPdfBuffer(`${name} · ${sc.companyName}`, `Aplikasi ${fap} - Tahapan ${sc.status}`);
          fs.writeFileSync(path.join(filesDir, fileKey), pdfBuf);

          await insert('DocumentFile', {
            checklistId: chk.id,
            fileName: fileName,
            fileKey: fileKey,
            fileSize: pdfBuf.length,
            mimeType: 'application/pdf',
            uploadedBy: role === 'MKT' ? 'Anisa Putri' : role === 'CA' ? 'Dimas Pratama' : 'Hendra Kusuma'
          }, q);
        }
      }

      // 10. Insert Review Signoffs for Advanced Stages
      if (['CREDIT_COMMITTEE_REVIEW', 'APPROVED'].includes(sc.status)) {
        await q('INSERT INTO review_signoffs(application_id, role, actor) VALUES($1, $2, $3)', [app.id, 'CA', 'Dimas Pratama']);
        await q('INSERT INTO review_signoffs(application_id, role, actor) VALUES($1, $2, $3)', [app.id, 'LEGAL', 'Rina Wijaya']);
      }

      // 11. Insert Approval Logs (Audit Trail)
      for (const log of sc.approvalStory) {
        await insert('ApprovalLog', {
          applicationId: app.id,
          actionBy: log.actionBy,
          userRole: log.userRole,
          previousStatus: log.prev,
          newStatus: log.next,
          comments: log.comments
        }, q);
      }
    }

    // Update fap_sequences to highest sequence
    await q('UPDATE fap_sequences SET value=24 WHERE year=2026');
  });

  console.log('\n✅ Sukses! 16 skenario komprehensif berhasil di-generate dan tersimpan di database CRM2.');
  await close();
}

run().catch(err => {
  console.error('❌ Error generating scenarios:', err);
  process.exit(1);
});
