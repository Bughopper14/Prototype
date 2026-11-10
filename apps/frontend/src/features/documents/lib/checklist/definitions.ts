/** The documents every financing application needs, and which department owns each. */
export type DocDepartment = 'MKT' | 'BS' | 'CA' | 'LEGAL' | 'COMMITTEE';

export interface MasterDocDef {
  code: string;
  name: string;
  title: string;
  department: DocDepartment;
  isMandatory: boolean;
  defaultSection: string;
  description: string;
}

export const MASTER_DOC_DEFINITIONS: MasterDocDef[] = [
  {
    code: 'FAP',
    name: 'Formulir Aplikasi Pembiayaan',
    title: 'FAP (Financing Application Form)',
    department: 'MKT',
    isMandatory: true,
    defaultSection: 'FAP Stage · Document Comparison',
    description:
      'Dokumen formulir aplikasi pembiayaan resmi yang ditandatangani dan dicocokkan dengan sistem',
  },
  {
    code: 'NIB',
    name: 'Nomor Induk Berusaha (NIB)',
    title: 'Business Registration (NIB)',
    department: 'BS',
    isMandatory: true,
    defaultSection: 'FAP Stage · Customer & PIC',
    description: 'Surat izin berusaha 13 digit OSS dan verifikasi data profil badan usaha pemohon',
  },
  {
    code: 'NPWP',
    name: 'NPWP Badan Usaha',
    title: 'Company Tax Registration (NPWP)',
    department: 'BS',
    isMandatory: true,
    defaultSection: 'FAP Stage · Customer & PIC',
    description: 'Nomor Pokok Wajib Pajak perusahaan (15 / 16 digit) dan Surat Keterangan Terdaftar',
  },
  {
    code: 'KTP',
    name: 'KTP Pengurus / Direksi & Komisaris',
    title: "Directors' Identification (KTP)",
    department: 'BS',
    isMandatory: true,
    defaultSection: 'Legal · Stakeholders',
    description: 'Kartu Tanda Penduduk seluruh jajaran direksi, komisaris, dan PIC perseroan (KYC)',
  },
  {
    code: 'DEED',
    name: 'Akta Pendirian & Perubahan Terakhir',
    title: 'Establishment & Latest Deed',
    department: 'LEGAL',
    isMandatory: true,
    defaultSection: 'Legal · Akta Perseroan',
    description: 'Salinan Akta Pendirian, Akta Perubahan Terakhir, dan SK Pengesahan Kemenkumham RI',
  },
  {
    code: 'EKITAS',
    name: 'E-KITAS / Paspor Pemegang Saham Asing',
    title: 'E-KITAS / Passport (Foreign Stakeholders)',
    department: 'LEGAL',
    isMandatory: false, // Dinamis tergantung ada WNA atau tidak
    defaultSection: 'Legal · Stakeholders (WNA)',
    description: 'Izin tinggal terbatas (KITAS) atau paspor wajib untuk pengurus/pemegang saham WNA',
  },
  {
    code: 'PREANALYSIS',
    name: 'Lembar Dokumen Pra-Analisis Kredit',
    title: 'Pre-analysis Document',
    department: 'CA',
    isMandatory: true,
    defaultSection: 'Pre-analysis Stage',
    description: 'Lembar kerja analisis kelayakan kredit, evaluasi usaha, dan scoring oleh Credit Analyst',
  },
  {
    code: 'FINANCIALS',
    name: 'Laporan Keuangan (3 Tahun Terakhir)',
    title: 'Financial Statements (3 Years)',
    department: 'CA',
    isMandatory: true,
    defaultSection: 'Pre-analysis · Financial Statements',
    description: 'Neraca & Laba Rugi 3 tahun buku terakhir (audited atau in-house)',
  },
  {
    code: 'BANK',
    name: 'Rekening Koran Bank (3 - 6 Bulan)',
    title: 'Bank Statements (6 Months)',
    department: 'CA',
    isMandatory: true,
    defaultSection: 'Pre-analysis · Business & Banks',
    description: 'Rekening koran operasional 3 s/d 6 bulan terakhir untuk verifikasi arus kas mutasi',
  },
  {
    code: 'QUOTATION',
    name: 'Surat Penawaran Harga Unit (Quotation)',
    title: 'Equipment Quotation',
    department: 'BS',
    isMandatory: true,
    defaultSection: 'Pre-analysis · Financing & Units',
    description: 'Surat penawaran harga unit alat berat / komersial dari dealer resmi LiuGong',
  },
  {
    code: 'CONTRACT',
    name: 'Kontrak Proyek / Purchase Order (SPK)',
    title: 'Project Contracts / Purchase Orders',
    department: 'CA',
    isMandatory: false,
    defaultSection: 'Pre-analysis · Business & Banks',
    description:
      'Salinan kontrak proyek tambang/konstruksi sebagai bukti sumber pembayaran (repayment source)',
  },
  {
    code: 'LEGAL_OPINION',
    name: 'Legal Opinion (Pendapat Hukum)',
    title: 'Legal Opinion',
    department: 'LEGAL',
    isMandatory: true,
    defaultSection: 'Legal Stage',
    description: 'Pendapat hukum tertulis dari Legal Officer mengenai legalitas & wewenang penandatanganan',
  },
  {
    code: 'ICLF',
    name: 'Lembar Persetujuan Komite Kredit (ICLF)',
    title: 'ICLF (Credit Committee Review)',
    department: 'COMMITTEE',
    isMandatory: true,
    defaultSection: 'Credit Committee Stage',
    description: 'Individual Credit Limit Facility & notulen keputusan rapat komite kredit',
  },
];
