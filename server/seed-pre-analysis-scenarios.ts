import fs from 'node:fs/promises';
import path from 'node:path';

const storeDir = path.resolve('database/pre_analysis');

interface PreAnalysisScenario {
  id: string;
  data: any;
}

const scenarios: PreAnalysisScenario[] = [
  // 1. PT Agro Prima Indonesia (Approved) - Agri & Palm Oil Logistics
  {
    id: '7453ee40-6ea5-4216-b6c1-1a5a227679d4',
    data: {
      preAnalysisNo: '005/PREANA/MKT/X/2026',
      preAnalysisDate: '16-Sep-2026',
      customerProjectName: 'PT Agro Prima Indonesia',
      taxId: '01.234.567.8-005.000',
      fapNumber: '005/AF/X/2026',
      leadSource: 'Dealer Direct (PT Intraco Penta Prima Servis)',
      customerArea: 'Medan, Sumatera Utara & Riau',
      dealerPic: 'Rudi Hartono (Sales Head IPPS Medan)',
      lmiPic: 'Deny Ardhian',
      lfiPic: 'Amanda Cynthia',
      customerPic: 'Budi Santoso (Finance Director)',
      equity: 'IDR 85.000.000.000 (Akta No. 24 tgl 12 Mei 2025 Notaris Medan)',
      paidUpCapital: 'IDR 25.000.000.000',
      sourceOfRepayment: 'Arus Kas Kontrak Supply Tandan Buah Segar (TBS) PT Socfin Indonesia & PTPN IV',

      holdingGroup: 'AGRO PRIMA GROUP (PT Prima Inti Makmur)',
      projectName: 'Peremajaan (Replanting) 3.500 Ha Sawit & Pengangkutan FFB Labuhanbatu',
      projectLocation: 'Head Office: Medan | Estate: Labuhanbatu Utara & Rokan Hilir',
      existingProjects: 'A. PT Agro Prima Indonesia (Existing):\n1. PTPN IV Kebun Ajamu - Kontrak Transportasi TBS (2023 - 2027)\n2. PT Socfin Indonesia Kebun Negeri Lama - Land Prep & Replanting (2024 - 2026)\n\nB. PT Sawit Mill Pratama (Sister Co):\n1. Pengoperasian Pabrik Kelapa Sawit Kapasitas 45 Ton/Jam di Labuhanbatu (Start 2022)\n2. Suplai CPO ke Wilmar Nabati Dumai',
      newProjects: 'C. PT Agro Prima Logistik (New Expansion):\n1. Penambahan 10 unit Wheel Loader & 6 Excavator untuk perluasan area tanam Sei Mangkei\n2. Kontrak Baru Angkutan CPO Tangki Dumai',
      projectNameLocation: 'AGRO PRIMA GROUP - Replanting & Transport Kelapa Sawit | Sumatera Utara',
      customerRole: 'Perkebunan, Land Prep & Heavy Equipment Rental Contractor',
      otherContractors: 'PT Tolan Tiga Indonesia, PT Nubika Jaya',
      projectOwner: '1. PTPN IV (Persero)\n2. PT Socfin Indonesia',
      bowheerInfo: 'PTPN IV & Socfindo merupakan produsen minyak sawit dan perkebunan terkemuka di Sumatera Utara dengan luas konsesi lebih dari 150.000 Ha, rekam jejak pembayaran lancar dan tepat waktu.',
      projectStatus: 'On Going sejak 2023 dengan rekam jejak penyelesaian pekerjaan 100% on schedule',
      investmentPlan: 'Pengadaan 10 unit LiuGong Wheel Loader 835H & 6 unit Excavator 908E',
      financingSchemeRequested: '36-month lease, 15% Security Deposit, Normal Installment structure',

      ubo: 'Ir. Hermawan Sutanto (Presiden Direktur - 65%)\nDavid Sutanto (Direktur Operasional - 35%)',
      uboInfo: 'Ir. Hermawan Sutanto (Presiden Direktur - 65%)\nDavid Sutanto (Direktur Operasional - 35%)',
      companyBackground: 'PT Agro Prima Indonesia didirikan pada tahun 2018 di bawah naungan holding PT Prima Inti Makmur. Perusahaan berpengalaman lebih dari 8 tahun dalam pengelolaan perkebunan kelapa sawit dan kontraktor alat berat perkebunan.',
      starGroupMilestonesNarrative: `2018 | Pendirian PT Agro Prima Indonesia
- Memulai kegiatan usaha sebagai kontraktor land preparation perkebunan kelapa sawit di Labuhanbatu.

2021 | Pembentukan Holding PT Prima Inti Makmur
- Konsolidasi kepemilikan keluarga Bapak Ir. Hermawan Sutanto untuk mengintegrasikan unit usaha hulu ke hilir.

2023 | Ekspansi Kontrak Multi-Year PTPN IV
- Memperoleh kontrak 5 tahun pengangkutan dan peremajaan perkebunan PTPN IV dengan utilisasi armada mencapai 92%.

2025 | Pendirian Pabrik Sawit & Logistik CPO
- Akuisisi PKS mitra lokal dan ekspansi angkutan CPO terintegrasi ke pelabuhan Dumai.`,
      businessDevBackground: 'Bapak Ir. Hermawan Sutanto merupakan alumni IPB Jurusan Agronomi dengan pengalaman lebih dari 25 tahun di industri kelapa sawit Sumatera. Didukung tim manajemen teknis berlatar belakang perkebunan multinasional.',
      operationalTeamInfo: 'Tim operasional dipimpin oleh David Sutanto bersama 4 site manager perkebunan eks-PTPN dan 25 operator alat berat bersertifikasi SIO aktif.',
      uboInformation: `AGRO PRIMA GROUP Corporate Structure:
â€¢ PT Prima Inti Makmur (Holding): Modal Dasar Rp 250 M, Modal Disetor Rp 75 M
  - Ir. Hermawan Sutanto (65% - Presiden Direktur)
  - David Sutanto (35% - Direktur)
â€¢ PT Agro Prima Indonesia (Main OpCo): Modal Dasar Rp 100 M, Modal Disetor Rp 25 M
  - PT Prima Inti Makmur (80%), David Sutanto (20%)
â€¢ PT Sawit Mill Pratama (CPO Processing): Modal Dasar Rp 80 M, Modal Disetor Rp 20 M
  - PT Prima Inti Makmur (90%), Ir. Hermawan Sutanto (10%)
â€¢ PT Agro Logistik Mandiri (Fleet Transport): Modal Dasar Rp 40 M, Modal Disetor Rp 10 M
  - PT Prima Inti Makmur (100%)`,

      groupStructure: {
        holding: {
          name: 'PT Prima Inti Makmur (Agro Prima Holding)',
          authorizedCapital: 'Rp 250 Miliar',
          paidUpCapital: 'Rp 75 Miliar',
          shareholders: [
            { name: 'Ir. Hermawan Sutanto', percentage: '65%', role: 'Presdir' },
            { name: 'David Sutanto', percentage: '35%', role: 'Direktur' }
          ],
          management: 'Presdir: Ir. Hermawan Sutanto | Direktur: David Sutanto'
        },
        subsidiaries: [
          {
            name: 'PT Agro Prima Indonesia (Applicant)',
            authorizedCapital: 'Rp 100 Miliar',
            paidUpCapital: 'Rp 25 Miliar',
            shareholders: [
              { name: 'PT Prima Inti Makmur', percentage: '80%', role: 'Holding' },
              { name: 'David Sutanto', percentage: '20%', role: 'Direktur' }
            ],
            management: 'Direktur Utama: David Sutanto'
          },
          {
            name: 'PT Sawit Mill Pratama (PKS CPO)',
            authorizedCapital: 'Rp 80 Miliar',
            paidUpCapital: 'Rp 20 Miliar',
            shareholders: [
              { name: 'PT Prima Inti Makmur', percentage: '90%', role: 'Holding' },
              { name: 'Ir. Hermawan Sutanto', percentage: '10%', role: 'Komisaris' }
            ],
            management: 'Direktur: Hendra Sutanto'
          },
          {
            name: 'PT Agro Logistik Mandiri (Fleet CPO)',
            authorizedCapital: 'Rp 40 Miliar',
            paidUpCapital: 'Rp 10 Miliar',
            shareholders: [
              { name: 'PT Prima Inti Makmur', percentage: '100%', role: 'Holding' }
            ],
            management: 'Direktur: Bambang Irawan'
          }
        ]
      },

      milestones: [
        { year: '2018', entity: 'PT Agro Prima Indonesia', description: 'Didirikan dengan fokus awal land prep dan peremajaan kebun kelapa sawit' },
        { year: '2021', entity: 'PT Prima Inti Makmur', description: 'Pembentukan Holding Group keluarga Sutanto' },
        { year: '2023', entity: 'PT Agro Prima Indonesia', description: 'Penandatanganan kontrak multi-year 5 tahun dengan PTPN IV' },
        { year: '2024', entity: 'PT Sawit Mill Pratama', description: 'Komisioning PKS 45 Ton/Jam di Labuhanbatu' },
        { year: '2026', entity: 'PT Agro Prima Indonesia', description: 'Pengajuan pembiayaan armada LiuGong ekspansi perkebunan Riau & Sumut' }
      ],
      existingFincoBackup: 'BCA Finance, Mandiri Tunas Finance, SANF, CIMB Niaga Auto Finance',

      equipmentJobFit: 'Sangat sesuai (Suitable) â€” Spesifikasi LiuGong 835H Wheel Loader & 908E Excavator ideal untuk loading TBS dan perawatan parit perkebunan',
      utilizationDuration: 'Wajar (Reasonable) â€” Durasi kontrak 5 tahun menjamin utilisasi unit selama 36 bulan tenor sewa',
      priorLiugongExperience: 'Sudah berpengalaman mengoperasikan 4 unit Wheel Loader LiuGong sejak 2022 dengan feedback performa positif',
      serviceAgreementFmc: 'Full FMC disediakan oleh dealer resmi PT Intraco Penta Prima Servis (IPPS) Medan dengan garansi ketersediaan parts 48 jam',
      unitComposition: [
        { brand: 'LiuGong Wheel Loader 835H', type: 'Wheel Loader (Tandan Buah Segar)', qty: 10 },
        { brand: 'LiuGong Excavator 908E', type: 'Compact Excavator (Trenching & Replanting)', qty: 6 },
        { brand: 'Truk Mitsubishi Fuso Fighter', type: 'Dump Truck 6x4', qty: 22 },
        { brand: 'Truk Hino Ranger FM 260 JD', type: 'Dump Truck 6x4', qty: 18 },
        { brand: 'Toyota Hilux 4x4 Double Cabin', type: 'Operational Patrol', qty: 4 }
      ],

      deliveryStatus: 'Ready Stock di yard IPPS Medan, siap kirim 7 hari pasca PO & Kontrak Final',
      deliveryDate: 'Estimasi Pengiriman: Minggu ke-4 September 2026',
      qaIlinkComment: 'Unit baru dengan iLink GPS Telemetry pre-installed dan diuji aktif',
      qaConclusion: 'PDI (Pre-Delivery Inspection) lolos standar mutu manufaktur LiuGong',

      dealerCheck: 'Rekam pembayaran lancar pada dealer IPPS, track record servis rutin berkala',
      topDealerToCustomer: 'DP 15%, 85% dibiayai leasing, tenor 36 bulan',
      topLmiToDealer: 'Term of Payment 14 hari kalender pasca BAST unit',
      lmiArCheck: 'Lancar â€” Tidak pernah mengalami keterlambatan pembayaran angsuran',
      slikPefindoHighlight: 'Kolektibilitas 1 (Lancar) pada seluruh fasilitas pembiayaan bank dan non-bank',
      applicantPefindoCheck: 'PT AGRO PRIMA INDONESIA - SLIK OJK Score Kol-1, Baki Debet Rp 18,2 Miliar, Pembayaran Disiplin',
      pefindoTerms: 'Fasilitas aktif: BCA Finance (Sewa Pembiayaan Flat 7.2%), Mandiri Tunas Finance (Flat 7.5%)',
      pefindoNotes: 'Pengecekan SLIK & Pefindo per 10 September 2026',
      lenderExposures: [
        { lender: 'BCA Finance', plafond: 'IDR 12.500.000.000', rate: '7.20%', notes: 'Armada truk & wheel loader, Kol-1 lancar' },
        { lender: 'Mandiri Tunas Finance', plafond: 'IDR 9.800.000.000', rate: '7.50%', notes: 'Excavator & dump truck perkebunan, Kol-1' },
        { lender: 'Bank Mandiri (KMK)', plafond: 'IDR 15.000.000.000', rate: '9.00%', notes: 'Kredit Modal Kerja revolving lancar' },
        { lender: 'SANF', plafond: 'IDR 6.500.000.000', rate: '8.10%', notes: 'Pembiayaan alat berat, Kol-1 lancar' }
      ],

      goodProject: true,
      goodProjectNote: 'Kontrak perkebunan multi-year dengan bowheer BUMN & tier-1 swasta (PTPN IV & Socfindo). Arus kas proyek stabil dan terverifikasi.',
      goodCustomer: true,
      goodCustomerNote: 'Perusahaan berdiri sejak 2018 dengan rekam jejak keuangan sehat, ekuitas Rp 85 Miliar, dan rekam jejak SLIK Kol-1 bersih tanpa riwayat tunggakan.',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      briefNote: 'Aplikasi layak diproses ke tahap pencairan penuh. Risiko operasional termitigasi oleh kontrak jangka panjang bowheer BUMN, garansi FMC dealer, dan jaminan perusahaan holding.',
      suggestions: [
        'Corporate Guarantee dari PT Prima Inti Makmur (Holding Entity).',
        'Personal Guarantee dari Ir. Hermawan Sutanto & David Sutanto.',
        'Pemasangan iLink Telematics LiuGong dengan fitur remote cut-off engine.',
        'Standing Order / Auto-debit pada rekening operasional penerimaan PTPN IV di Bank Mandiri.'
      ],
      competitionTable: [
        { finco: 'BCA Finance', rate: '7.25% flat p.a.', purpose: 'Leasing Armada Alat Berat Sawit' },
        { finco: 'Mandiri Tunas Finance', rate: '7.50% flat p.a.', purpose: 'Sewa Pembiayaan Mesin Perkebunan' },
        { finco: 'SANF', rate: '7.75% flat p.a.', purpose: 'Pembiayaan Komersial Truk' }
      ],
      competitionNotes: 'Benchmark perbankan Medan: Flat 7.20% - 7.60% p.a., Tenor 36 bulan, SD 15-20%. Penawaran LFI kompetitif dengan benefit servis FMC dealer.',
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing & Credit',
      approvedBy: 'Jembar Ganda E\nDirector of Financing'
    }
  },

  // 2. PT Cipta Infrastruktur (Submitted to BS) - Civil & Toll Road
  {
    id: '94764fa3-f355-49cb-874c-d66974ed4b57',
    data: {
      preAnalysisNo: '002/PREANA/MKT/X/2026',
      preAnalysisDate: '22-Sep-2026',
      customerProjectName: 'PT Cipta Infrastruktur',
      taxId: '01.234.567.8-002.000',
      fapNumber: '002/AF/X/2026',
      leadSource: 'LMI Marketing',
      customerArea: 'Jakarta Pusat, DKI Jakarta & Jawa Barat',
      dealerPic: 'Ferry Gunawan (Senior Sales LMI Jakarta)',
      lmiPic: 'Ferry Gunawan',
      lfiPic: 'Amanda Cynthia',
      customerPic: 'Budi Santoso (Finance Director)',
      equity: 'IDR 120.000.000.000',
      paidUpCapital: 'IDR 40.000.000.000',
      sourceOfRepayment: 'Termin Proyek Jalan Tol Ruas Akses Patimban Paket 3 (Kementerian PUPR & PT Jasa Marga)',

      holdingGroup: 'CIPTA MEGA GROUP (PT Cipta Mega Investama)',
      projectName: 'Pembangunan Jalan Tol Akses Patimban Paket 3 Subang',
      projectLocation: 'Head Office: Jakarta | Site Proyek: Subang & Indramayu, Jawa Barat',
      existingProjects: '1. Pembangunan Jembatan Cisumdawu Seksi 4 (KSO Adhi Karya - Selesai 2024)\n2. Pelebaran Jalan Tol Cipali KM 86 - 102 (PT Lintas Marga Sedaya - On Going 2025)\n3. Struktur Box Culvert & Saluran Irigasi Citarum (Kementerian PUPR)',
      newProjects: '1. Paket 3 Akses Pelabuhan Patimban (Nilai Kontrak Rp 245 Miliar, 2026 - 2028)\n2. Pembangunan Flyover Sentolo Yogyakarta (Tahap Tender Menang)',
      projectNameLocation: 'CIPTA MEGA GROUP - Proyek Tol Akses Patimban | Jawa Barat',
      customerRole: 'Main Contractor / Sub-Contractor Spesialis Earthwork & Perkerasan Kaku',
      otherContractors: 'PT Wijaya Karya (Persero) Tbk, PT Hutama Karya',
      projectOwner: 'Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR) Ditjen Bina Marga',
      bowheerInfo: 'Pemerintah RI / Kementerian PUPR didukung pinjaman JICA dengan alokasi anggaran multi-years terjamin dalam DIPA APBN.',
      projectStatus: 'Kontrak efektif ditandatangani Agustus 2026, pekerjaan fisik cut & fill dimulai Oktober 2026',
      investmentPlan: '8 Unit Excavator LiuGong 922E, 4 Unit Soil Compactor CLG6114E, 2 Unit Motor Grader 4180D',
      financingSchemeRequested: '36-month lease, 20% Security Deposit, Step-down Installment',

      ubo: 'Hendra Wijaya (Presiden Direktur - 55%)\nFransiscus Wijaya (Direktur Operasional - 35%)\nMelina Wijaya (Komisaris - 10%)',
      uboInfo: 'Hendra Wijaya (Presiden Direktur - 55%)\nFransiscus Wijaya (Direktur Operasional - 35%)\nMelina Wijaya (Komisaris - 10%)',
      companyBackground: 'PT Cipta Infrastruktur berdiri sejak 2014 dan memegang kualifikasi Kontraktor B2 Sipil. Berpengalaman dalam pembangunan jalan bebas hambatan, jembatan bentang panjang, dan pekerjaan perbaikan tanah lunak.',
      starGroupMilestonesNarrative: `2014 | Pendirian PT Cipta Infrastruktur di Jakarta
2017 | Pengerjaan Tol Trans Jawa Kanci - Pejagan
2020 | Pembentukan Holding PT Cipta Mega Investama
2024 | Penyelesaian Proyek Struktur Tol Cisumdawu
2026 | Perolehan Kontrak Akses Tol Pelabuhan Internasional Patimban`,
      businessDevBackground: 'Bapak Hendra Wijaya memiliki rekam jejak 20 tahun di industri konstruksi sipil nasional dengan jaringan kuat ke BUMN Karya.',
      operationalTeamInfo: 'Dipimpin Ir. Fransiscus Wijaya bersama 8 Project Engineer dan 40 operator bersertifikasi LPJK.',
      uboInformation: `CIPTA MEGA GROUP Corporate Structure:
â€¢ PT Cipta Mega Investama (Holding): Modal Dasar Rp 350 M, Modal Disetor Rp 100 M
  - Hendra Wijaya (55% - Presdir)
  - Fransiscus Wijaya (35% - Direktur)
  - Melina Wijaya (10% - Komisaris)
â€¢ PT Cipta Infrastruktur (Applicant): Modal Dasar Rp 150 M, Modal Disetor Rp 40 M
  - PT Cipta Mega Investama (80%), Fransiscus Wijaya (20%)
â€¢ PT Cipta Precast Indonesia (Beton Pracetak): Modal Dasar Rp 100 M, Modal Disetor Rp 30 M
  - PT Cipta Mega Investama (90%), Hendra Wijaya (10%)
â€¢ PT Cipta Sarana Aspal (Hotmix Plant): Modal Dasar Rp 50 M, Modal Disetor Rp 15 M
  - PT Cipta Mega Investama (75%), Fransiscus Wijaya (25%)`,

      groupStructure: {
        holding: {
          name: 'PT Cipta Mega Investama (Cipta Holding)',
          authorizedCapital: 'Rp 350 Miliar',
          paidUpCapital: 'Rp 100 Miliar',
          shareholders: [
            { name: 'Hendra Wijaya', percentage: '55%', role: 'Presdir' },
            { name: 'Fransiscus Wijaya', percentage: '35%', role: 'Direktur' },
            { name: 'Melina Wijaya', percentage: '10%', role: 'Komisaris' }
          ],
          management: 'Presdir: Hendra Wijaya | Direktur: Fransiscus Wijaya'
        },
        subsidiaries: [
          {
            name: 'PT Cipta Infrastruktur (Applicant)',
            authorizedCapital: 'Rp 150 Miliar',
            paidUpCapital: 'Rp 40 Miliar',
            shareholders: [
              { name: 'PT Cipta Mega Investama', percentage: '80%', role: 'Holding' },
              { name: 'Fransiscus Wijaya', percentage: '20%', role: 'Direktur' }
            ],
            management: 'Direktur Utama: Hendra Wijaya'
          },
          {
            name: 'PT Cipta Precast Indonesia',
            authorizedCapital: 'Rp 100 Miliar',
            paidUpCapital: 'Rp 30 Miliar',
            shareholders: [
              { name: 'PT Cipta Mega Investama', percentage: '90%', role: 'Holding' },
              { name: 'Hendra Wijaya', percentage: '10%', role: 'Komisaris' }
            ],
            management: 'Direktur: Ir. Gunawan Wibowo'
          },
          {
            name: 'PT Cipta Sarana Aspal',
            authorizedCapital: 'Rp 50 Miliar',
            paidUpCapital: 'Rp 15 Miliar',
            shareholders: [
              { name: 'PT Cipta Mega Investama', percentage: '75%', role: 'Holding' },
              { name: 'Fransiscus Wijaya', percentage: '25%', role: 'Direktur' }
            ],
            management: 'Direktur: Robertus Tan'
          }
        ]
      },

      milestones: [
        { year: '2014', entity: 'PT Cipta Infrastruktur', description: 'Didirikan di Jakarta fokus konstruksi jalan' },
        { year: '2018', entity: 'PT Cipta Precast Indonesia', description: 'Ekspansi fasilitas pabrik precast di Subang' },
        { year: '2020', entity: 'PT Cipta Mega Investama', description: 'Holding didirikan mengkonsolidasikan seluruh lini konstruksi' },
        { year: '2024', entity: 'PT Cipta Infrastruktur', description: 'Penyelesaian proyek Cisumdawu tepat waktu dan nol kecelakaan' },
        { year: '2026', entity: 'PT Cipta Infrastruktur', description: 'Pengadaan armada LiuGong Proyek Tol Patimban Paket 3' }
      ],
      existingFincoBackup: 'Bank Mandiri, Bank BNI, ORIX Indonesia Finance, Tokyo Century',

      equipmentJobFit: 'Sangat cocok untuk pekerjaan galian tanah (bulk excavation) dan pemadatan subgrade jalan tol',
      utilizationDuration: 'Wajar â€” Sesuai schedule proyek konstruksi selama 30 bulan',
      priorLiugongExperience: 'Telah mengoperasikan 2 unit LiuGong Grader di proyek Tol Cipali',
      serviceAgreementFmc: 'FMC langsung dari LMI Jakarta support depo Cikampek',
      unitComposition: [
        { brand: 'LiuGong Excavator 922E', type: 'Crawler Excavator 22 Ton', qty: 8 },
        { brand: 'LiuGong Soil Compactor CLG6114E', type: 'Single Drum Compactor 14 Ton', qty: 4 },
        { brand: 'LiuGong Motor Grader 4180D', type: 'Heavy Grader 180 HP', qty: 2 },
        { brand: 'Dump Truck Hino 500 FM260TI', type: 'Dump Truck 20 M3', qty: 30 }
      ],

      deliveryStatus: 'Alokasi stok ready dari LMI Cikarang Assembly & Depot',
      deliveryDate: 'Oktober 2026 bertahap 2 batch',
      qaIlinkComment: 'Unit siap dipasangi telemetri iLink',
      qaConclusion: 'Memenuhi persyaratan teknis proyek Kementerian PUPR',

      dealerCheck: 'Customer prioritas LMI dengan riwayat pembayaran baik',
      topDealerToCustomer: 'DP 20%, 80% leasing',
      topLmiToDealer: 'Standar LMI',
      lmiArCheck: 'Lancar',
      slikPefindoHighlight: 'Kol-1 pada seluruh perbankan dan finco, total baki debet Rp 34 Miliar',
      applicantPefindoCheck: 'Track record lancar tanpa catatan NPL',
      pefindoTerms: 'Fasilitas aktif Bank Mandiri (Kredit Modal Kerja) & ORIX Leasing',
      pefindoNotes: 'Data per September 2026',
      lenderExposures: [
        { lender: 'Bank Mandiri', plafond: 'IDR 25.000.000.000', rate: '8.75%', notes: 'Kredit Modal Kerja Konstruksi' },
        { lender: 'ORIX Indonesia Finance', plafond: 'IDR 14.500.000.000', rate: '7.80%', notes: 'Pembiayaan alat berat grader & compactor' },
        { lender: 'Tokyo Century', plafond: 'IDR 8.200.000.000', rate: '7.95%', notes: 'Leasing dump truck armada proyek' }
      ],

      goodProject: true,
      goodProjectNote: 'Proyek Strategis Nasional (PSN) Pelabuhan Patimban dengan pendanaan terjamin APBN/JICA',
      goodCustomer: true,
      goodCustomerNote: 'Kontraktor B2 kredibel dengan spesialisasi pekerjaan jalan tol, ekuitas kuat Rp 120 Miliar',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      briefNote: 'Aplikasi konstruksi berkualitas tinggi dengan risiko minimal dan reputasi solid.',
      suggestions: [
        'Penerbitan Corporate Guarantee dari holding PT Cipta Mega Investama.',
        'Notifikasi pengalihan hak klaim termin proyek (Cessie) ke LFI.',
        'Asuransi All Risks (CAR) dan alat berat mencakup klausul Banker\'s Clause LFI.'
      ],
      competitionTable: [
        { finco: 'ORIX Finance', rate: '7.60% flat p.a.', purpose: 'Leasing Alat Konstruksi' },
        { finco: 'Tokyo Century', rate: '7.75% flat p.a.', purpose: 'Sewa Pembiayaan Truk & Alat Berat' }
      ],
      competitionNotes: 'Suku bunga pasar bersaing di 7.50% - 7.90% flat.',
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing & Credit',
      approvedBy: 'Jembar Ganda E\nDirector of Financing'
    }
  },

  // 3. PT Bumi Karya Nusantara (In CA & Legal Review) - Mining Contractor Balikpapan
  {
    id: '9b4ee588-1765-428c-a611-a046c19e9c7f',
    data: {
      preAnalysisNo: '001/PREANA/MKT/X/2026',
      preAnalysisDate: '05-Sep-2026',
      customerProjectName: 'PT Bumi Karya Nusantara',
      taxId: '01.234.567.8-001.000',
      fapNumber: '001/AF/X/2026',
      leadSource: 'Dealer LMI Balikpapan',
      customerArea: 'Balikpapan & Berau, Kalimantan Timur',
      dealerPic: 'Agus Setiawan (Branch Manager LMI Balikpapan)',
      lmiPic: 'Agus Setiawan',
      lfiPic: 'Amanda Cynthia',
      customerPic: 'Budi Santoso (Finance Director)',
      equity: 'IDR 150.000.000.000',
      paidUpCapital: 'IDR 50.000.000.000',
      sourceOfRepayment: 'Kontrak Penambangan Batubara PT Berau Coal Site Lati',

      holdingGroup: 'BUMI KARYA GROUP (PT Bumi Karya Corporindo)',
      projectName: 'Overburden Removal & Coal Getting PT Berau Coal Site Lati',
      projectLocation: 'Head Office: Balikpapan | Site: Tambang Batubara Lati, Berau, Kaltim',
      existingProjects: '1. PT Berau Coal Site Binungan - Kontrak Hauling Batubara 1.2M Ton/Tahun (2022 - 2027)\n2. PT Kaltim Prima Coal (KPC) Sangatta - Pekerjaan Reklamasi Lahan Pasca Tambang (2023 - 2026)',
      newProjects: '1. Overburden Removal Site Lati target 4.5 juta BCM/tahun (2026 - 2029)\n2. Kontrak Baru Tambang Nikel Morowali (Dalam tahap persiapan armada)',
      projectNameLocation: 'BUMI KARYA GROUP - Penambangan Batubara Berau | Kalimantan Timur',
      customerRole: 'Mining Contractor & Heavy Earthmoving Specialist',
      otherContractors: 'PT Madhani Talatah Nusantara, PT Bukit Makmur Mandiri Utama (BUMA)',
      projectOwner: 'PT Berau Coal Energy Tbk',
      bowheerInfo: 'PT Berau Coal merupakan salah satu produsen batubara thermal terbesar di Indonesia dengan standar keselamatan dan ketepatan pembayaran prima.',
      projectStatus: 'Kontrak aktif 5 tahun terhitung sejak Januari 2025',
      investmentPlan: '12 Unit Excavator LiuGong 950HD (50 Ton) & 6 Unit Wheel Loader 856H',
      financingSchemeRequested: '36-month lease, 20% Security Deposit, Normal Installment',

      ubo: 'Ir. Bambang Suryono, M.M. (Komisaris Utama - 60%)\nDimas Suryono, B.Eng. (Direktur Utama - 40%)',
      uboInfo: 'Ir. Bambang Suryono, M.M. (Komisaris Utama - 60%)\nDimas Suryono, B.Eng. (Direktur Utama - 40%)',
      companyBackground: 'PT Bumi Karya Nusantara didirikan tahun 2012 di Balikpapan. Perusahaan mengelola lebih dari 120 armada alat berat tambang dan berpengalaman luas di sektor batubara dan nikel.',
      starGroupMilestonesNarrative: `2012 | Pendirian di Balikpapan untuk jasa rental alat berat tambang
2016 | Kontrak perdana kontraktor overburden dengan KPC Sangatta
2020 | Pembentukan PT Bumi Karya Corporindo sebagai entitas holding
2024 | Perluasan kontrak jangka panjang dengan Berau Coal Site Lati
2026 | Peremajaan armada heavy excavator 50 Ton menggunakan LiuGong 950HD`,
      businessDevBackground: 'Bapak Ir. Bambang Suryono mantan Direktur Operasional kontraktor tambang terkemuka dengan keahlian mendalam di fleet management tambang batubara.',
      operationalTeamInfo: 'Tim operasional site Berau dipimpin 3 Project Manager tambang tersertifikasi POP/POM dan 80 personel operasional.',
      uboInformation: `BUMI KARYA GROUP Corporate Structure:
â€¢ PT Bumi Karya Corporindo (Holding): Modal Dasar Rp 500 M, Modal Disetor Rp 150 M
  - Ir. Bambang Suryono (60% - Komut)
  - Dimas Suryono (40% - Dirut)
â€¢ PT Bumi Karya Nusantara (Applicant): Modal Dasar Rp 200 M, Modal Disetor Rp 50 M
  - PT Bumi Karya Corporindo (85%), Dimas Suryono (15%)
â€¢ PT Nusantara Logistik Tambang (Fleet Hauling): Modal Dasar Rp 100 M, Modal Disetor Rp 30 M
  - PT Bumi Karya Corporindo (90%), Ir. Bambang Suryono (10%)
â€¢ PT Borneo Alat Mandiri (Workshop & Maintenance): Modal Dasar Rp 50 M, Modal Disetor Rp 15 M
  - PT Bumi Karya Corporindo (95%), Dimas Suryono (5%)`,

      groupStructure: {
        holding: {
          name: 'PT Bumi Karya Corporindo (Bumi Karya Holding)',
          authorizedCapital: 'Rp 500 Miliar',
          paidUpCapital: 'Rp 150 Miliar',
          shareholders: [
            { name: 'Ir. Bambang Suryono, M.M.', percentage: '60%', role: 'Komut' },
            { name: 'Dimas Suryono, B.Eng.', percentage: '40%', role: 'Dirut' }
          ],
          management: 'Komut: Ir. Bambang Suryono | Dirut: Dimas Suryono'
        },
        subsidiaries: [
          {
            name: 'PT Bumi Karya Nusantara (Applicant)',
            authorizedCapital: 'Rp 200 Miliar',
            paidUpCapital: 'Rp 50 Miliar',
            shareholders: [
              { name: 'PT Bumi Karya Corporindo', percentage: '85%', role: 'Holding' },
              { name: 'Dimas Suryono, B.Eng.', percentage: '15%', role: 'Dirut' }
            ],
            management: 'Direktur Utama: Dimas Suryono'
          },
          {
            name: 'PT Nusantara Logistik Tambang',
            authorizedCapital: 'Rp 100 Miliar',
            paidUpCapital: 'Rp 30 Miliar',
            shareholders: [
              { name: 'PT Bumi Karya Corporindo', percentage: '90%', role: 'Holding' },
              { name: 'Ir. Bambang Suryono', percentage: '10%', role: 'Komisaris' }
            ],
            management: 'Direktur: Wahyu Hidayat'
          },
          {
            name: 'PT Borneo Alat Mandiri',
            authorizedCapital: 'Rp 50 Miliar',
            paidUpCapital: 'Rp 15 Miliar',
            shareholders: [
              { name: 'PT Bumi Karya Corporindo', percentage: '95%', role: 'Holding' },
              { name: 'Dimas Suryono', percentage: '5%', role: 'Direktur' }
            ],
            management: 'Direktur: Ir. Joko Prasetyo'
          }
        ]
      },

      milestones: [
        { year: '2012', entity: 'PT Bumi Karya Nusantara', description: 'Didirikan di Balikpapan fokus jasa penambangan' },
        { year: '2016', entity: 'PT Bumi Karya Nusantara', description: 'Kontrak tambang perdana dengan KPC Sangatta' },
        { year: '2020', entity: 'PT Bumi Karya Corporindo', description: 'Holding didirikan untuk mengkonsolidasikan armada tambang' },
        { year: '2024', entity: 'PT Bumi Karya Nusantara', description: 'Perolehan kontrak 5 tahun Berau Coal Site Lati' },
        { year: '2026', entity: 'PT Bumi Karya Nusantara', description: 'Aplikasi pembiayaan 18 unit armada LiuGong Heavy Series' }
      ],
      existingFincoBackup: 'Komatsu Finance Indonesia, Caterpillar Financial, SANF, Bank Mandiri',

      equipmentJobFit: 'LiuGong 950HD Heavy Excavator terbukti handal untuk penggalian batuan keras overburden tambang batubara',
      utilizationDuration: 'Sangat wajar â€” Kontrak Berau Coal berdurasi 5 tahun hingga 2029',
      priorLiugongExperience: 'Memiliki 6 unit wheel loader LiuGong 856H yang beroperasi di stockpile pelabuhan Balikpapan',
      serviceAgreementFmc: 'FMC komprehensif on-site Berau oleh PT Intraco Penta dengan mekanik standby 24 jam',
      unitComposition: [
        { brand: 'LiuGong Heavy Excavator 950HD', type: 'Crawler Excavator 50 Ton (OB Digging)', qty: 12 },
        { brand: 'LiuGong Wheel Loader 856H', type: 'Wheel Loader 5 Ton (Stockpile Loading)', qty: 6 },
        { brand: 'Articulated Dump Truck Volvo A40G', type: 'ADT 40 Ton', qty: 24 },
        { brand: 'Bulldozer Komatsu D85ESS-2', type: 'Heavy Dozer 200 HP', qty: 8 }
      ],

      deliveryStatus: 'Stok unit ready di warehouse LMI Balikpapan & Jakarta',
      deliveryDate: 'Pengiriman bertahap 6 unit per batch mulai Oktober 2026',
      qaIlinkComment: 'Sudah dilengkapi sistem telemetri LiuGong iLink',
      qaConclusion: 'Lolos uji kesesuaian operasional tambang (Mine Permit Check)',

      dealerCheck: 'Rekam jejak prima, termasuk nasabah platinum di IPPS Balikpapan',
      topDealerToCustomer: 'DP 20%, 80% leasing tenor 36 bulan',
      topLmiToDealer: 'Term pembayaran normal',
      lmiArCheck: 'Lancar',
      slikPefindoHighlight: 'Kol-1 pada Bank Mandiri dan SANF, riwayat pembayaran sangat disiplin',
      applicantPefindoCheck: 'Baki debet aktif terkelola dengan baik pada rasio DSCR 2.1x',
      pefindoTerms: 'Fasilitas aktif Mandiri Leasing dan SANF',
      pefindoNotes: 'Data SLIK update September 2026',
      lenderExposures: [
        { lender: 'Bank Mandiri (Sindikasi)', plafond: 'IDR 45.000.000.000', rate: '8.50%', notes: 'Kredit investasi armada tambang, Kol-1 lancar' },
        { lender: 'SANF', plafond: 'IDR 28.000.000.000', rate: '7.95%', notes: 'Leasing heavy excavator & ADT, Kol-1 lancar' },
        { lender: 'Caterpillar Financial', plafond: 'IDR 15.000.000.000', rate: '8.20%', notes: 'Fasilitas alat berat dozer, Kol-1' }
      ],

      goodProject: true,
      goodProjectNote: 'Tambang batubara tier-1 (Berau Coal) dengan cadangan batubara terbukti lebih dari 15 tahun dan harga komoditas stabil.',
      goodCustomer: true,
      goodCustomerNote: 'Kontraktor tambang senior di Kaltim dengan ekuitas kuat Rp 150 Miliar dan rasio leverage terjaga sehat.',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      briefNote: 'Aplikasi dinilai sangat prospektif dengan profil risiko terkelola baik dan dukungan bowheer kelas satu.',
      suggestions: [
        'Corporate Guarantee dari holding PT Bumi Karya Corporindo.',
        'Escrow account penerimaan hasil kerja Berau Coal di bank rekanan.',
        'Asuransi alat berat Marine Cargo & Heavy Equipment Comprehensive.'
      ],
      competitionTable: [
        { finco: 'SANF', rate: '7.85% flat p.a.', purpose: 'Leasing Heavy Excavator 50 Ton' },
        { finco: 'Komatsu Finance', rate: '8.10% flat p.a.', purpose: 'Pembiayaan Alat Berat Tambang' }
      ],
      competitionNotes: 'Suku bunga penawaran LFI sangat bersaing dengan keunggulan paket FMC di site Berau.',
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing & Credit',
      approvedBy: 'Jembar Ganda E\nDirector of Financing'
    }
  },

  // 4. PT Sumber Alam Lestari (Draft) - Forestry Samarinda
  {
    id: 'd46a2b9c-e918-422d-afab-67246ac060c2',
    data: {
      preAnalysisNo: '003/PREANA/MKT/X/2026',
      preAnalysisDate: '20-Sep-2026',
      customerProjectName: 'PT Sumber Alam Lestari',
      taxId: '01.234.567.8-003.000',
      fapNumber: '003/AF/X/2026',
      leadSource: 'LMI Marketing Kalimantan',
      customerArea: 'Samarinda & Kutai Barat, Kalimantan Timur',
      dealerPic: 'Agus Setiawan',
      lmiPic: 'Agus Setiawan',
      lfiPic: 'Amanda Cynthia',
      customerPic: 'Budi Santoso (Finance Director)',
      equity: 'IDR 45.000.000.000',
      paidUpCapital: 'IDR 15.000.000.000',
      sourceOfRepayment: 'Kontrak Pemanenan Kayu HTI PT Tanjung Enim Lestari Pulp and Paper',

      holdingGroup: 'SAL GROUP (PT Sumber Alam Perkasa)',
      projectName: 'Harvesting & Hauling Konsesi HTI Kutai Barat',
      projectLocation: 'Head Office: Samarinda | Site: Kutai Barat, Kaltim',
      existingProjects: '1. Kontrak Land Clearing Perkebunan Sawit PT Kutai Agro Lestari (2023 - 2025)\n2. Transportasi Kayu Logistik Sungai Mahakam',
      newProjects: '1. Pemanenan Kayu Akasia & Eukaliptus 150.000 M3/tahun di Kutai Barat',
      projectNameLocation: 'SAL GROUP - Pemanenan Kayu HTI | Kalimantan Timur',
      customerRole: 'Forestry Harvesting & Logging Contractor',
      otherContractors: 'PT Rimba Perkasa, PT Mandiri Timber',
      projectOwner: 'PT Tanjung Enim Lestari Pulp & Paper / Marubeni Group',
      bowheerInfo: 'Konsorsium pulp & paper terkemuka dengan komitmen pembelian kayu jangka panjang.',
      projectStatus: 'Tahap negosiasi finalisasi addendum kontrak volume 2026',
      investmentPlan: '6 Unit LiuGong 922E Forestry Spec dengan Harvester Head & Winch',
      financingSchemeRequested: '36-month lease, 20% Security Deposit',

      ubo: 'Haji Achmad Fauzi (Komisaris - 70%)\nRizky Fauzi (Direktur - 30%)',
      uboInfo: 'Haji Achmad Fauzi (Komisaris - 70%)\nRizky Fauzi (Direktur - 30%)',
      companyBackground: 'PT Sumber Alam Lestari beroperasi sejak 2017 di bidang pengusahaan kayu dan pembersihan lahan di wilayah Kalimantan Timur.',
      starGroupMilestonesNarrative: `2017 | Pendirian PT Sumber Alam Lestari di Samarinda
2021 | Pembentukan Holding PT Sumber Alam Perkasa
2024 | Diversifikasi ke sektor pemanenan mekanis hutan tanaman industri`,
      businessDevBackground: 'Bapak Haji Achmad Fauzi adalah tokoh pengusaha kehutanan lokal di Samarinda dengan rekam jejak puluhan tahun.',
      operationalTeamInfo: 'Didukung 20 operator berpengalaman logging hutan tanaman.',
      uboInformation: `SAL GROUP Corporate Structure:
â€¢ PT Sumber Alam Perkasa (Holding): Modal Dasar Rp 180 M, Modal Disetor Rp 45 M
  - Haji Achmad Fauzi (70% - Komisaris)
  - Rizky Fauzi (30% - Direktur)
â€¢ PT Sumber Alam Lestari (Applicant): Modal Dasar Rp 60 M, Modal Disetor Rp 15 M
  - PT Sumber Alam Perkasa (85%), Rizky Fauzi (15%)`,

      groupStructure: {
        holding: {
          name: 'PT Sumber Alam Perkasa (SAL Holding)',
          authorizedCapital: 'Rp 180 Miliar',
          paidUpCapital: 'Rp 45 Miliar',
          shareholders: [
            { name: 'Haji Achmad Fauzi', percentage: '70%', role: 'Komisaris' },
            { name: 'Rizky Fauzi', percentage: '30%', role: 'Direktur' }
          ],
          management: 'Komisaris: Haji Achmad Fauzi | Direktur: Rizky Fauzi'
        },
        subsidiaries: [
          {
            name: 'PT Sumber Alam Lestari (Applicant)',
            authorizedCapital: 'Rp 60 Miliar',
            paidUpCapital: 'Rp 15 Miliar',
            shareholders: [
              { name: 'PT Sumber Alam Perkasa', percentage: '85%', role: 'Holding' },
              { name: 'Rizky Fauzi', percentage: '15%', role: 'Direktur' }
            ],
            management: 'Direktur Utama: Rizky Fauzi'
          }
        ]
      },

      milestones: [
        { year: '2017', entity: 'PT Sumber Alam Lestari', description: 'Didirikan di Samarinda' },
        { year: '2021', entity: 'PT Sumber Alam Perkasa', description: 'Holding keluarga Fauzi terbentuk' },
        { year: '2026', entity: 'PT Sumber Alam Lestari', description: 'Ekspansi mekanisasi panen HTI Kutai Barat' }
      ],
      existingFincoBackup: 'BRI Agro, Mandiri Utama Finance',

      equipmentJobFit: 'LiuGong 922E Forestry Spec dilengkapi pelindung kabin ROPS/FOPS dan undercarriage heavy duty',
      utilizationDuration: 'Wajar sesuai umur kontrak pemanenan 3 tahun',
      priorLiugongExperience: 'Baru pertama kali menjajaki LiuGong (First-time buyer)',
      serviceAgreementFmc: 'Garansi resmi LMI Samarinda dengan jaminan ketersediaan mekanik keliling',
      unitComposition: [
        { brand: 'LiuGong Excavator 922E Forestry Spec', type: 'Forestry Harvester 22 Ton', qty: 6 },
        { brand: 'Truk Logging Hino 500', type: 'Log Hauler 6x4', qty: 14 }
      ],

      deliveryStatus: 'Stok tersedia di yard LMI Balikpapan',
      deliveryDate: 'November 2026',
      qaIlinkComment: 'Unit baru siap pasang iLink',
      qaConclusion: 'Memenuhi standar keselamatan kehutanan',

      dealerCheck: 'Customer baru bagi dealer LMI, verifikasi reputasi lokal positif',
      topDealerToCustomer: 'DP 20%, 80% sewa pembiayaan',
      topLmiToDealer: 'Normal',
      lmiArCheck: 'Belum ada riwayat (Customer Baru)',
      slikPefindoHighlight: 'Kol-1 bersih pada pinjaman modal kerja BRI',
      applicantPefindoCheck: 'Tidak terdapat catatan macet atau restrukturisasi',
      pefindoTerms: 'Pinjaman bank umum lancar',
      pefindoNotes: 'Data per September 2026',
      lenderExposures: [
        { lender: 'Bank BRI', plafond: 'IDR 8.000.000.000', rate: '9.25%', notes: 'Kredit modal kerja agribisnis, Kol-1 lancar' },
        { lender: 'Mandiri Utama Finance', plafond: 'IDR 4.200.000.000', rate: '8.40%', notes: 'Leasing truk logging, Kol-1' }
      ],

      goodProject: true,
      goodProjectNote: 'Proyek pemanenan kayu HTI berkelanjutan dengan offtaker pulp mill terkemuka',
      goodCustomer: true,
      goodCustomerNote: 'Pengusaha lokal kredibel di Kaltim dengan pengalaman lapangan kuat',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      briefNote: 'Aplikasi memenuhi syarat untuk diteruskan ke tahap analisa komprehensif.',
      suggestions: [
        'Personal Guarantee dari Bapak Haji Achmad Fauzi.',
        'Penyediaan deposit cadangan pembayaran 2 bulan angsuran.'
      ],
      competitionTable: [
        { finco: 'Mandiri Utama Finance', rate: '8.25% flat p.a.', purpose: 'Leasing Alat Forestry' }
      ],
      competitionNotes: 'Tingkat suku bunga bersaing di 8.0% - 8.5%.',
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing & Credit',
      approvedBy: 'Jembar Ganda E\nDirector of Financing'
    }
  },

  // 5. PT Mitra Tambang Sejahtera (Credit Committee Review) - Coal Hauling Palembang
  {
    id: 'ff517bb8-0def-4c43-87b4-7ae8341c6c2f',
    data: {
      preAnalysisNo: '004/PREANA/MKT/X/2026',
      preAnalysisDate: '18-Sep-2026',
      customerProjectName: 'PT Mitra Tambang Sejahtera',
      taxId: '01.234.567.8-004.000',
      fapNumber: '004/AF/X/2026',
      leadSource: 'Direct Marketing LFI Palembang',
      customerArea: 'Palembang & Muara Enim, Sumatera Selatan',
      dealerPic: 'Hendra Susanto (LMI Palembang)',
      lmiPic: 'Hendra Susanto',
      lfiPic: 'Amanda Cynthia',
      customerPic: 'Budi Santoso (Finance Director)',
      equity: 'IDR 95.000.000.000',
      paidUpCapital: 'IDR 30.000.000.000',
      sourceOfRepayment: 'Kontrak Angkutan Batubara Jalur Kereta & Dermaga Sungai Musi PT Bukit Asam Tbk',

      holdingGroup: 'MITRA GROUP (PT Mitra Investama Corpora)',
      projectName: 'Hauling & Re-handling Batubara Banko Barat - Dermaga Kertapati',
      projectLocation: 'Head Office: Palembang | Site: Tanjung Enim & Kertapati, Sumsel',
      existingProjects: '1. Pengangkutan Batubara PT Bukit Asam (PTBA) 2.5 Juta Ton/Tahun (2022 - 2027)\n2. Pengoperasian Stockpile Muara Enim (2023 - 2026)',
      newProjects: '1. Kontrak Tambahan Angkutan Batubara Tambang Lahat ke Jetty Musi 1.8 Juta Ton/Tahun',
      projectNameLocation: 'MITRA GROUP - Hauling Batubara PTBA | Sumatera Selatan',
      customerRole: 'Coal Hauling & Stockpile Management Contractor',
      otherContractors: 'PT Titan Infra Energy, PT Putra Perkasa Abadi',
      projectOwner: 'PT Bukit Asam Tbk (MIND ID Group)',
      bowheerInfo: 'BUMN produsen batubara terkemuka nasional dengan kepastian pembayaran sangat tinggi.',
      projectStatus: 'Kontrak aktif tahun ke-4 dengan performa SLA di atas 95%',
      investmentPlan: '15 Unit Wheel Loader LiuGong 856H & 5 Unit Excavator 933E',
      financingSchemeRequested: '36-month lease, 15% Security Deposit, Normal Installment',

      ubo: 'Jimmy Hartanto (Komisaris Utama - 55%)\nKelvin Hartanto (Direktur Utama - 45%)',
      uboInfo: 'Jimmy Hartanto (Komisaris Utama - 55%)\nKelvin Hartanto (Direktur Utama - 45%)',
      companyBackground: 'PT Mitra Tambang Sejahtera didirikan tahun 2015 di Palembang. Mengoperasikan lebih dari 80 unit dump truck dan alat berat penunjang tambang batubara.',
      starGroupMilestonesNarrative: `2015 | Pendirian di Palembang fokus transportasi batubara
2019 | Kontrak multi-year perdana dengan PTBA
2022 | Konsolidasi di bawah holding PT Mitra Investama Corpora
2026 | Perluasan armada loader untuk handling dermaga Kertapati`,
      businessDevBackground: 'Bapak Jimmy Hartanto memiliki pengalaman 18 tahun di sektor logistik komoditas Sumatera Selatan.',
      operationalTeamInfo: 'Dipimpin Kelvin Hartanto bersama 5 koordinator lapangan dan 60 pengemudi/operator.',
      uboInformation: `MITRA GROUP Corporate Structure:
â€¢ PT Mitra Investama Corpora (Holding): Modal Dasar Rp 400 M, Modal Disetor Rp 120 M
  - Jimmy Hartanto (55% - Komut)
  - Kelvin Hartanto (45% - Dirut)
â€¢ PT Mitra Tambang Sejahtera (Applicant): Modal Dasar Rp 120 M, Modal Disetor Rp 30 M
  - PT Mitra Investama Corpora (85%), Kelvin Hartanto (15%)
â€¢ PT Mitra Trans Logistik (Barging): Modal Dasar Rp 80 M, Modal Disetor Rp 20 M
  - PT Mitra Investama Corpora (90%), Jimmy Hartanto (10%)`,

      groupStructure: {
        holding: {
          name: 'PT Mitra Investama Corpora (Mitra Holding)',
          authorizedCapital: 'Rp 400 Miliar',
          paidUpCapital: 'Rp 120 Miliar',
          shareholders: [
            { name: 'Jimmy Hartanto', percentage: '55%', role: 'Komut' },
            { name: 'Kelvin Hartanto', percentage: '45%', role: 'Dirut' }
          ],
          management: 'Komut: Jimmy Hartanto | Dirut: Kelvin Hartanto'
        },
        subsidiaries: [
          {
            name: 'PT Mitra Tambang Sejahtera (Applicant)',
            authorizedCapital: 'Rp 120 Miliar',
            paidUpCapital: 'Rp 30 Miliar',
            shareholders: [
              { name: 'PT Mitra Investama Corpora', percentage: '85%', role: 'Holding' },
              { name: 'Kelvin Hartanto', percentage: '15%', role: 'Dirut' }
            ],
            management: 'Direktur Utama: Kelvin Hartanto'
          },
          {
            name: 'PT Mitra Trans Logistik',
            authorizedCapital: 'Rp 80 Miliar',
            paidUpCapital: 'Rp 20 Miliar',
            shareholders: [
              { name: 'PT Mitra Investama Corpora', percentage: '90%', role: 'Holding' },
              { name: 'Jimmy Hartanto', percentage: '10%', role: 'Komisaris' }
            ],
            management: 'Direktur: Hendry Wijaya'
          }
        ]
      },

      milestones: [
        { year: '2015', entity: 'PT Mitra Tambang Sejahtera', description: 'Didirikan di Palembang' },
        { year: '2019', entity: 'PT Mitra Tambang Sejahtera', description: 'Kontrak angkutan batubara PTBA Tanjung Enim' },
        { year: '2022', entity: 'PT Mitra Investama Corpora', description: 'Holding didirikan' },
        { year: '2026', entity: 'PT Mitra Tambang Sejahtera', description: 'Pengajuan armada loader & excavator LiuGong' }
      ],
      existingFincoBackup: 'Dipo Star Finance, Mandiri Tunas Finance, SANF',

      equipmentJobFit: 'LiuGong 856H Wheel Loader sangat efisien untuk rehandling batubara di stockpile dan train loading station',
      utilizationDuration: 'Wajar sesuai kontrak 3 tahun',
      priorLiugongExperience: 'Pernah menggunakan 4 unit loader LiuGong generasi terdahulu',
      serviceAgreementFmc: 'FMC didukung workshop resmi LMI Palembang',
      unitComposition: [
        { brand: 'LiuGong Wheel Loader 856H', type: 'Wheel Loader 5 Ton Heavy Duty', qty: 15 },
        { brand: 'LiuGong Excavator 933E', type: 'Crawler Excavator 33 Ton', qty: 5 },
        { brand: 'Dump Truck Shacman F3000', type: 'Dump Truck 8x4 30 M3', qty: 40 }
      ],

      deliveryStatus: 'Stok ready di Jakarta, pengiriman via Roro ke Palembang',
      deliveryDate: 'Oktober 2026',
      qaIlinkComment: 'Unit siap diserahterimakan dengan GPS aktif',
      qaConclusion: 'Lolos uji kelaikan teknis',

      dealerCheck: 'Catatan pembayaran lancar',
      topDealerToCustomer: 'DP 15%, 85% leasing',
      topLmiToDealer: 'Standar LMI',
      lmiArCheck: 'Lancar',
      slikPefindoHighlight: 'Kol-1 bersih pada seluruh perbankan dan multifinance',
      applicantPefindoCheck: 'Track record kredit sangat baik',
      pefindoTerms: 'Fasilitas aktif Dipo Star Finance & MTF',
      pefindoNotes: 'Data per September 2026',
      lenderExposures: [
        { lender: 'Dipo Star Finance', plafond: 'IDR 18.000.000.000', rate: '7.50%', notes: 'Pembiayaan dump truck, Kol-1 lancar' },
        { lender: 'Mandiri Tunas Finance', plafond: 'IDR 12.000.000.000', rate: '7.65%', notes: 'Leasing wheel loader, Kol-1 lancar' },
        { lender: 'Bank Sumsel Babel', plafond: 'IDR 10.000.000.000', rate: '9.00%', notes: 'Kredit Modal Kerja revolving, Kol-1' }
      ],

      goodProject: true,
      goodProjectNote: 'Kontrak BUMN PT Bukit Asam dengan rute terjamin dan kapasitas loading maksimal',
      goodCustomer: true,
      goodCustomerNote: 'Pelaku usaha logistik batubara terkemuka di Sumsel dengan ekuitas Rp 95 Miliar',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      briefNote: 'Rekomendasi disetujui komite kredit dengan catatan jaminan fidusia unit didaftarkan tepat waktu.',
      suggestions: [
        'Corporate Guarantee PT Mitra Investama Corpora.',
        'Personal Guarantee Jimmy Hartanto & Kelvin Hartanto.',
        'Pemberitahuan resmi pengalihan pembayaran kontrak ke rekening penampungan LFI.'
      ],
      competitionTable: [
        { finco: 'Dipo Star Finance', rate: '7.45% flat p.a.', purpose: 'Leasing Dump Truck & Loader' },
        { finco: 'Mandiri Tunas Finance', rate: '7.60% flat p.a.', purpose: 'Sewa Pembiayaan Mesin Tambang' }
      ],
      competitionNotes: 'Suku bunga pasar 7.40% - 7.70%.',
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing & Credit',
      approvedBy: 'Jembar Ganda E\nDirector of Financing'
    }
  },

  // 6. PT Konstruksi Mandiri (Returned) - Warehouse Surabaya
  {
    id: 'd829ff48-28fa-438b-996a-0e76adf4f66f',
    data: {
      preAnalysisNo: '006/PREANA/MKT/X/2026',
      preAnalysisDate: '14-Sep-2026',
      customerProjectName: 'PT Konstruksi Mandiri',
      taxId: '01.234.567.8-006.000',
      fapNumber: '006/AF/X/2026',
      leadSource: 'Dealer LMI Surabaya',
      customerArea: 'Surabaya & Gresik, Jawa Timur',
      dealerPic: 'Wahyu Nugroho (LMI Surabaya)',
      lmiPic: 'Wahyu Nugroho',
      lfiPic: 'Amanda Cynthia',
      customerPic: 'Budi Santoso (Finance Director)',
      equity: 'IDR 35.000.000.000',
      paidUpCapital: 'IDR 10.000.000.000',
      sourceOfRepayment: 'Termin Pembangunan Gudang Logistik Kawasan Industri JIIPE Manyar Gresik',

      holdingGroup: 'MANDIRI GRAHA GROUP (PT Mandiri Graha Karya)',
      projectName: 'Pembangunan Kompleks Pergudangan Logistik JIIPE Gresik',
      projectLocation: 'Head Office: Surabaya | Site: Kawasan Industri JIIPE, Manyar, Gresik',
      existingProjects: '1. Pembangunan Ruko & Kompleks Komersial Sidoarjo (Selesai 2024)\n2. Perataan Lahan Pergudangan Romokalisari Surabaya',
      newProjects: '1. Paket Pembangunan Struktur Gudang Baja 4 Unit di JIIPE Manyar',
      projectNameLocation: 'MANDIRI GRAHA GROUP - Gudang Logistik JIIPE | Jawa Timur',
      customerRole: 'General Contractor Pergudangan & Struktur Baja',
      otherContractors: 'PT Total Bangun Persada, PT Tatamulia Nusantara Indah',
      projectOwner: 'PT Berkah Kawasan Manyar Sejahtera (BKMS) / JIIPE Gresik',
      bowheerInfo: 'Pengembang kawasan industri terintegrasi Jawa Timur.',
      projectStatus: 'Surat Penunjukan (LOI) diterbitkan Agustus 2026',
      investmentPlan: '4 Unit Excavator LiuGong 920E & 2 Unit Forklift CPCD30',
      financingSchemeRequested: '36-month lease, 15% Security Deposit',

      ubo: 'Soetanto Kusumo (Komisaris - 60%)\nAndreas Kusumo (Direktur - 40%)',
      uboInfo: 'Soetanto Kusumo (Komisaris - 60%)\nAndreas Kusumo (Direktur - 40%)',
      companyBackground: 'PT Konstruksi Mandiri berdiri tahun 2019 di Surabaya dengan fokus kontraktor bangunan gedung dan gudang.',
      starGroupMilestonesNarrative: `2019 | Pendirian di Surabaya
2022 | Pembentukan PT Mandiri Graha Karya
2026 | Perolehan LOI pembangunan gudang JIIPE Gresik`,
      businessDevBackground: 'Bapak Soetanto Kusumo berpengalaman di bidang konstruksi baja dan pergudangan komersial.',
      operationalTeamInfo: 'Didukung 15 staf teknis dan mandor konstruksi.',
      uboInformation: `MANDIRI GRAHA GROUP Corporate Structure:
â€¢ PT Mandiri Graha Karya (Holding): Modal Dasar Rp 150 M, Modal Disetor Rp 40 M
  - Soetanto Kusumo (60% - Komisaris)
  - Andreas Kusumo (40% - Direktur)
â€¢ PT Konstruksi Mandiri (Applicant): Modal Dasar Rp 50 M, Modal Disetor Rp 10 M
  - PT Mandiri Graha Karya (80%), Andreas Kusumo (20%)`,

      groupStructure: {
        holding: {
          name: 'PT Mandiri Graha Karya (Mandiri Holding)',
          authorizedCapital: 'Rp 150 Miliar',
          paidUpCapital: 'Rp 40 Miliar',
          shareholders: [
            { name: 'Soetanto Kusumo', percentage: '60%', role: 'Komisaris' },
            { name: 'Andreas Kusumo', percentage: '40%', role: 'Direktur' }
          ],
          management: 'Komisaris: Soetanto Kusumo | Direktur: Andreas Kusumo'
        },
        subsidiaries: [
          {
            name: 'PT Konstruksi Mandiri (Applicant)',
            authorizedCapital: 'Rp 50 Miliar',
            paidUpCapital: 'Rp 10 Miliar',
            shareholders: [
              { name: 'PT Mandiri Graha Karya', percentage: '80%', role: 'Holding' },
              { name: 'Andreas Kusumo', percentage: '20%', role: 'Direktur' }
            ],
            management: 'Direktur Utama: Andreas Kusumo'
          }
        ]
      },

      milestones: [
        { year: '2019', entity: 'PT Konstruksi Mandiri', description: 'Didirikan di Surabaya' },
        { year: '2022', entity: 'PT Mandiri Graha Karya', description: 'Holding keluarga dibentuk' },
        { year: '2026', entity: 'PT Konstruksi Mandiri', description: 'Pengajuan armada excavator dan forklift LiuGong' }
      ],
      existingFincoBackup: 'BCA Finance, Bank Jatim',

      equipmentJobFit: 'LiuGong 920E cocok untuk pekerjaan pondasi dan cut & fill pergudangan',
      utilizationDuration: 'Wajar sesuai jadwal proyek 24 bulan',
      priorLiugongExperience: 'Pengguna baru (First time)',
      serviceAgreementFmc: 'FMC didukung dealer LMI Surabaya',
      unitComposition: [
        { brand: 'LiuGong Excavator 920E', type: 'Crawler Excavator 20 Ton', qty: 4 },
        { brand: 'LiuGong Forklift CPCD30', type: 'Diesel Forklift 3 Ton', qty: 2 }
      ],

      deliveryStatus: 'Stok tersedia di LMI Surabaya',
      deliveryDate: 'November 2026',
      qaIlinkComment: 'Unit siap disiapkan',
      qaConclusion: 'Standar PDI',

      dealerCheck: 'Customer baru',
      topDealerToCustomer: 'DP 15%, 85% leasing',
      topLmiToDealer: 'Normal',
      lmiArCheck: 'Baru',
      slikPefindoHighlight: 'Terdapat catatan keterlambatan pembayaran 12 hari (Kol-2 historis) pada fasilitas pinjaman rekening koran bank swasta di tahun 2025, saat ini sudah kembali Kol-1',
      applicantPefindoCheck: 'Catatan Kol-2 historis memerlukan konfirmasi rekening koran 6 bulan terakhir',
      pefindoTerms: 'Bank Jatim & BCA Finance',
      pefindoNotes: 'Data SLIK September 2026',
      lenderExposures: [
        { lender: 'Bank Jatim', plafond: 'IDR 5.000.000.000', rate: '10.50%', notes: 'Kredit Modal Kerja Rekening Koran' },
        { lender: 'BCA Finance', plafond: 'IDR 3.200.000.000', rate: '8.10%', notes: 'Leasing dump truck armada operasional' }
      ],

      goodProject: true,
      goodProjectNote: 'Proyek kawasan industri JIIPE berkembang pesat',
      goodCustomer: false,
      goodCustomerNote: 'Terdapat catatan Kol-2 historis di tahun 2025 dan kontrak induk (SPK) definitif belum dilampirkan (masih berupa LOI). Berkas dikembalikan (Returned) untuk kelengkapan dokumen SPK dan mutasi rekening 6 bulan.',
      recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
      briefNote: 'Aplikasi dikembalikan (Returned) ke Sales Marketing untuk pemenuhan SPK definitif dan klarifikasi riwayat Kol-2 sebelum diajukan kembali ke komite.',
      suggestions: [
        'Melampirkan Surat Perjanjian Kontrak (SPK) asli bertandatangan kedua pihak.',
        'Menyertakan rekening koran 6 bulan terakhir untuk membuktikan kelancaran arus kas.',
        'Menaikkan Security Deposit menjadi 25% sebagai mitigasi risiko historis Kol-2.'
      ],
      competitionTable: [
        { finco: 'BCA Finance', rate: '8.00% flat p.a.', purpose: 'Sewa Pembiayaan Alat Berat' }
      ],
      competitionNotes: 'Suku bunga 8.00% - 8.25%.',
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing & Credit',
      approvedBy: 'Jembar Ganda E\nDirector of Financing'
    }
  }
];

async function run() {
  await fs.mkdir(storeDir, { recursive: true });
  console.log('Seeding rich pre-analysis scenarios for CRM testing...');
  for (const s of scenarios) {
    const filePath = path.join(storeDir, `${s.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(s.data, null, 2), 'utf-8');
    console.log(`Seeded Pre-Analysis scenario for [${s.data.fapNumber}] ${s.data.customerProjectName} -> ${filePath}`);
  }
  console.log('All 6 Pre-Analysis testing scenarios seeded successfully!');
}

run().catch(console.error);
