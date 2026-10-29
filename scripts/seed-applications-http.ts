import http from 'http';
import fs from 'node:fs/promises';
import path from 'node:path';

function request(options: http.RequestOptions, data?: any): Promise<{ status: number; headers: any; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = body;
        try { parsed = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const appsToCreate = [
  {
    companyName: 'PT Indo Raya Perkasa',
    companyType: 'CORPORATE',
    nib: '1209260000088',
    npwp: '012345678900088',
    establishmentActNo: 'AHU-0019283.AH.01.01.2017',
    establishmentDate: '2017-05-14',
    branchCode: 'JKT01',
    companyAddress: 'Kawasan Industri Pulogadung Blok B No. 12',
    city: 'Jakarta Timur',
    province: 'DKI Jakarta',
    postalCode: '13920',
    phoneFax: '021-4601234',
    email: 'corp@indorayaperkasa.co.id',
    mainBusiness: 'Civil Contractor & Industrial Construction',
    experienceYears: 9,
    experienceMonths: 4,
    locationStatus: 'OWNED',
    repaymentSource: 'Kontrak Konstruksi Gudang & Pabrik Unilever Cikarang',
    industrySegment: 'CONSTRUCTION',
    businessRole: 'CONTRACTORS',
    pic: {
      name: 'Ir. Agus Wijaya',
      position: 'Direktur Operasional',
      phone: '081288776655',
      email: 'agus.wijaya@indorayaperkasa.co.id',
      currentAddress: 'Jl. Boulevard Kelapa Gading Blok LA No. 15',
      city: 'Jakarta Utara',
      province: 'DKI Jakarta',
      postalCode: '14240'
    },
    proposal: {
      facilityPurpose: 'INVESTMENT',
      purposeDetail: 'Pengadaan Heavy Equipment Batch 2 Pekerjaan Cut & Fill Pabrik Cikarang',
      financingMethod: 'FINANCIAL_LEASE',
      financingValue: 9800000000,
      downPaymentValue: 1960000000,
      securityDeposit: 1960000000,
      interestRate: 7.25,
      tenorMonths: 36,
      paymentMethod: 'Monthly in Arrear',
      currency: 'IDR',
      units: [
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Excavator 922E HD', quantity: 3, unitPrice: 1800000000, totalPrice: 5400000000 },
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Wheel Loader 835H', quantity: 4, unitPrice: 1100000000, totalPrice: 4400000000 }
      ]
    },
    preAnalysis: {
      holdingGroup: 'INDO RAYA GROUP (PT Indo Raya Corpora)',
      projectName: 'Pembangunan Kompleks Logistik Cikarang & Pelabuhan Marunda',
      projectLocation: 'Head Office: Jakarta Timur | Project Sites: Cikarang Dry Port & Marunda',
      existingProjects: 'Land Development MM2100 Industrial Town Cikarang (2023-2025)\nPabrik Perakitan Otomotif KIIC Karawang (2024)',
      newProjects: 'Pembangunan Hub Logistik Unilever Cikarang seluas 18 Hektar (SPK No. 2026/LOG/UL/041)\nInfrastruktur Container Yard Marunda Center Phase 2',
      customerRole: 'Main Contractor untuk Struktur, Paving Heavy-Duty, dan Cut & Fill',
      otherContractors: 'PT Total Bangun Persada & PT Wijaya Karya Tbk',
      bowheerInfo: 'PT Unilever Enterprises Indonesia & PT Cikarang Inland Port. Blue-chip client rating AAA.',
      projectStatus: 'SPK Definitif telah terbit 12 Agustus 2026, pekerjaan fisik berjalan 15%',
      investmentPlan: 'Total kebutuhan alat berat 15 unit, tahap 1 diajukan 7 unit ke LiuGong Finance Indonesia',
      financingSchemeRequested: '36-month lease, 20% Security Deposit, Normal Installment Structure',
      ubo: 'Ir. Agus Wijaya (Founder & Direktur Utama - 55%)\nHartono Salim (Komisaris - 45%)',
      uboInfo: 'Ir. Agus Wijaya (Founder & Direktur Utama - 55%)\nHartono Salim (Komisaris - 45%)',
      companyBackground: 'PT Indo Raya Perkasa didirikan tahun 2017 berfokus pada kontraktor sipil dan spesialis pemadatan lahan industri berat.',
      starGroupMilestonesNarrative: '2017: Pendirian PT Indo Raya Perkasa di Pulogadung\n2020: Ekspansi ke pekerjaan perkerasan beton & precast\n2024: Membentuk PT Indo Raya Corpora sebagai holding investasi',
      businessDevBackground: 'Manajemen memiliki track record sukses di lebih dari 20 proyek industri multi-nasional.',
      operationalTeamInfo: 'Tim operasional dipimpin 4 Project Manager bersertifikat Madya LPJK dan 12 operator bersertifikat.',
      milestones: [
        { year: '2017', milestone: 'Pendirian & Kontrak Pertama Pulogadung' },
        { year: '2020', milestone: 'Precast Division Established' },
        { year: '2024', milestone: 'Konsolidasi Holding & Kontrak Unilever' }
      ],
      equipmentJobFit: 'Wheel Loader 835H digunakan untuk batching plant, Excavator 922E untuk perataan dan galian tanah dasar.',
      utilizationDuration: '10 jam/hari, 26 hari kerja per bulan',
      priorLiugongExperience: 'Memiliki 2 unit LiuGong CLG835 eksisting beroperasi sejak 2022 tanpa kendala mesin mayor.',
      serviceAgreementFmc: 'Full Maintenance Contract disepakati dengan Dealer PT Megatama Heavy Equipment Jakarta.',
      unitComposition: [
        { kategoriAset: 'Excavator 20 Ton', brand: 'LIUGONG 922E', qty: 3 },
        { kategoriAset: 'Wheel Loader 3 Ton', brand: 'LIUGONG 835H', qty: 4 }
      ],
      deliveryStatus: 'Ready stock di pool Cakung, siap delivery dalam 3 hari kalender',
      deliveryDate: '15-Nov-2026',
      qaIlinkComment: 'GPS Telematic iLink wajib aktif dan terpantau di dashboard LiuGong Finance',
      qaConclusion: 'Peralatan dan aplikasi kerja sesuai spesifikasi teknis pabrikan',
      dealerCheck: 'Dealer PT Megatama merekomendasikan nasabah sebagai debitur prioritas',
      topDealerToCustomer: 'Fasilitas leasing lancar dan TOP sparepart 30 hari selalu ditepati',
      topLmiToDealer: 'Dealer memiliki line of credit sehat dengan LMI',
      lmiArCheck: 'No Overdue AR',
      slikPefindoHighlight: 'Kolektibilitas 1 (Lancar) di BCA dan Bank Mandiri',
      applicantPefindoCheck: 'Bersih, tidak pernah tercatat NPL/restrukturisasi',
      pefindoTerms: 'Plafon aktif Rp 15 Miliar di Bank Mandiri (Kredit Modal Kerja)',
      pefindoNotes: 'Baki debet Rp 6.2 Miliar, pemakaian wajar untuk cash flow proyek',
      lenderExposures: [
        { lender: 'Bank Mandiri', plafond: 'Rp 15.000.000.000', rate: '9.00% eff' },
        { lender: 'BCA Finance', plafond: 'Rp 5.000.000.000', rate: '8.25% eff' }
      ],
      goodProject: true,
      goodProjectNote: 'Proyek industri Unilever berjangka multi-tahun dengan jaminan pembayaran lancar',
      goodCustomer: true,
      goodCustomerNote: 'Track record usaha 9 tahun, DSCR di atas 2.1x',
      briefNote: 'Aplikasi layak disetujui penuh dengan skema Financial Lease 36 bulan.',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      suggestions: [
        'Personal Guarantee dari Ir. Agus Wijaya dan Hartono Salim',
        'Fidusia 7 unit alat berat didaftarkan pada Kemenkumham RI'
      ],
      competitionTable: [
        { finco: 'BCA Finance', rate: '7.50% flat', purpose: 'Pengadaan Unit' },
        { finco: 'LiuGong Finance (Offered)', rate: '7.25% flat', purpose: 'Financial Lease' }
      ],
      proposedBy: 'Amanda Cynthia\nSenior Account Manager',
      reviewedBy: 'Maria Regina\nDept. Head Marketing',
      approvedBy: 'Jembar Ganda E\nDirector'
    }
  },
  {
    companyName: 'PT Samudera Tambang Nusantara',
    companyType: 'CORPORATE',
    nib: '1209260000099',
    npwp: '012345678900099',
    establishmentActNo: 'AHU-0034567.AH.01.01.2019',
    establishmentDate: '2019-08-22',
    branchCode: 'MKS01',
    companyAddress: 'Gedung Wisma Kalla Lt. 8, Jl. Dr. Sam Ratulangi No. 8',
    city: 'Makassar',
    province: 'Sulawesi Selatan',
    postalCode: '90125',
    phoneFax: '0411-876543',
    email: 'finance@samuderatambang.com',
    mainBusiness: 'Nickel Ore Mining & Hauling Contractor',
    experienceYears: 7,
    experienceMonths: 2,
    locationStatus: 'RENTED',
    repaymentSource: 'Kontrak Penambangan Nikel dengan PT Vale Indonesia Tbk Blok Pomalaa',
    industrySegment: 'MINING',
    businessRole: 'CONTRACTORS',
    pic: {
      name: 'Rahmat Hidayat, S.T.',
      position: 'Direktur Utama',
      phone: '08114455667',
      email: 'rahmat@samuderatambang.com',
      currentAddress: 'Komp. Graha Cendana No. 22',
      city: 'Makassar',
      province: 'Sulawesi Selatan',
      postalCode: '90222'
    },
    proposal: {
      facilityPurpose: 'INVESTMENT',
      purposeDetail: 'Investasi Heavy Excavator 50-Ton Tambang Nikel Pomalaa Kolaka',
      financingMethod: 'FINANCIAL_LEASE',
      financingValue: 24000000000,
      downPaymentValue: 4800000000,
      securityDeposit: 4800000000,
      interestRate: 6.95,
      tenorMonths: 36,
      paymentMethod: 'Monthly in Arrear',
      currency: 'IDR',
      units: [
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Heavy Excavator 950HD', quantity: 6, unitPrice: 4000000000, totalPrice: 24000000000 }
      ]
    },
    preAnalysis: {
      holdingGroup: 'SAMUDERA GROUP SULAWESI',
      projectName: 'Operasi Penambangan & Pemindahan Bijih Nikel Pomalaa Kolaka',
      projectLocation: 'Head Office: Makassar | Mining Sites: Kolaka & Morowali Utara',
      existingProjects: 'Hauling Nikel Morowali (2022-sekarang) kapasitas 120.000 WMT/bulan',
      newProjects: 'Kontrak Baru PT Vale Indonesia Tbk Blok Pomalaa durasi 5 tahun (2026-2031)',
      customerRole: 'Kontraktor Utama Penambangan, Loading, dan Hauling Jetty',
      otherContractors: 'PT Cipta Kridatama & PT Hillcon Mining',
      bowheerInfo: 'PT Vale Indonesia Tbk. Salah satu produsen nikel terbesar.',
      projectStatus: 'Operasi berjalan lancar, armada tambahan diperlukan untuk meningkatkan target volume',
      investmentPlan: 'Tahap 1 mengajukan 6 unit Excavator 950HD (50 Ton)',
      financingSchemeRequested: '36-month lease, 20% SD, Flat 6.95% p.a.',
      ubo: 'Rahmat Hidayat (60%)\nAndi Mallarangeng (40%)',
      uboInfo: 'Rahmat Hidayat (60%)\nAndi Mallarangeng (40%)',
      companyBackground: 'Perusahaan spesialis kontraktor tambang nikel di Sulawesi Selatan dan Tenggara.',
      starGroupMilestonesNarrative: '2019: Didirikan di Makassar\n2022: Masuk proyek nikel Morowali\n2026: Menang tender 5 tahun proyek Vale Pomalaa',
      businessDevBackground: 'Manajemen mengantongi Izin Usaha Jasa Pertambangan (IUJP) lengkap.',
      operationalTeamInfo: 'Dipimpin Kepala Teknik Tambang (KTT) bersertifikat POU & POM ESDM.',
      milestones: [
        { year: '2019', milestone: 'Pendirian Badan Usaha' },
        { year: '2022', milestone: 'Kontrak Morowali Nickel' },
        { year: '2026', milestone: 'Kontrak PT Vale Pomalaa 5 Tahun' }
      ],
      equipmentJobFit: 'Excavator 950HD sangat ideal untuk batuan nikel limonite keras dengan bucket heavy-duty 3.2 m3.',
      utilizationDuration: '18 jam/hari (2 shift operasional)',
      priorLiugongExperience: 'Telah mengoperasikan 4 unit LiuGong di Morowali selama 2 tahun dengan reliabilitas tinggi.',
      serviceAgreementFmc: 'On-site consignment sparepart & mekanik standby 24 jam oleh dealer LiuGong Makassar.',
      unitComposition: [
        { kategoriAset: 'Heavy Excavator 50 Ton', brand: 'LIUGONG 950HD', qty: 6 }
      ],
      deliveryStatus: 'Indent 2 minggu via pelabuhan Makassar',
      deliveryDate: '25-Nov-2026',
      qaIlinkComment: 'Wajib dilengkapi iLink Dual SIM Satelit untuk area remote Kolaka',
      qaConclusion: 'Heavy Excavator 950HD sesuai beban kerja overburden tambang nikel',
      dealerCheck: 'Dealer Makassar memberikan dukungan jaminan garansi powertrain 3 tahun',
      topDealerToCustomer: 'Track record pembayaran tepat waktu',
      topLmiToDealer: 'Dealer Tier 1 LiuGong Indonesia',
      lmiArCheck: 'Clear',
      slikPefindoHighlight: 'Kolektibilitas 1 di Bank Mandiri & BNI',
      applicantPefindoCheck: 'Sangat baik',
      pefindoTerms: 'Fasilitas aktif KMK Rp 20 Miliar di BNI',
      pefindoNotes: 'Pembayaran lancar tanpa ada catatan restrukturisasi',
      lenderExposures: [
        { lender: 'Bank BNI', plafond: 'Rp 20.000.000.000', rate: '8.75% eff' }
      ],
      goodProject: true,
      goodProjectNote: 'Proyek nikel strategis nasional dengan off-taker smelter global',
      goodCustomer: true,
      goodCustomerNote: 'Eksistensi usaha solid, rasio likuiditas tinggi',
      briefNote: 'Aplikasi siap diputuskan oleh Credit Committee dengan usulan persetujuan penuh.',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      suggestions: [
        'Personal Guarantee dari Rahmat Hidayat & Corporate Guarantee dari Holding',
        'Pemasangan dual GPS satellite tracking'
      ],
      competitionTable: [
        { finco: 'Orix Indonesia Finance', rate: '7.25% flat', purpose: 'Financial Lease' },
        { finco: 'LiuGong Finance (Offered)', rate: '6.95% flat', purpose: 'Financial Lease 36 Mo' }
      ],
      proposedBy: 'Surya Kencana\nSenior Account Manager MKS',
      reviewedBy: 'Maria Regina\nDept. Head Marketing',
      approvedBy: 'Jembar Ganda E\nDirector'
    }
  },
  {
    companyName: 'PT Borneo Agro Mandiri',
    companyType: 'CORPORATE',
    nib: '1209260000101',
    npwp: '012345678900101',
    establishmentActNo: 'AHU-0056123.AH.01.01.2016',
    establishmentDate: '2016-11-03',
    branchCode: 'BPN01',
    companyAddress: 'Jl. Ahmad Yani No. 108',
    city: 'Pontianak',
    province: 'Kalimantan Barat',
    postalCode: '78124',
    phoneFax: '0561-739812',
    email: 'admin@borneoagro.co.id',
    mainBusiness: 'Palm Oil Plantation Maintenance & FFB Hauling',
    experienceYears: 10,
    experienceMonths: 0,
    locationStatus: 'OWNED',
    repaymentSource: 'Kontrak Jangka Panjang Kebun Sawit PT SMART Tbk',
    industrySegment: 'AGRICULTURE',
    businessRole: 'CONTRACTORS',
    pic: {
      name: 'Drs. Hendro Pranoto',
      position: 'Direktur Keuangan',
      phone: '081345678901',
      email: 'hendro@borneoagro.co.id',
      currentAddress: 'Komp. Untan Blok B No. 4',
      city: 'Pontianak',
      province: 'Kalimantan Barat',
      postalCode: '78121'
    },
    proposal: {
      facilityPurpose: 'INVESTMENT',
      purposeDetail: 'Pengadaan Wheel Loader & Mini Excavator Perkebunan Sawit',
      financingMethod: 'FINANCIAL_LEASE',
      financingValue: 14800000000,
      downPaymentValue: 2960000000,
      securityDeposit: 2960000000,
      interestRate: 7.15,
      tenorMonths: 36,
      paymentMethod: 'Monthly in Arrear',
      currency: 'IDR',
      units: [
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Wheel Loader 856H', quantity: 6, unitPrice: 1700000000, totalPrice: 10200000000 },
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Excavator 922E HD', quantity: 4, unitPrice: 1150000000, totalPrice: 4600000000 }
      ]
    },
    preAnalysis: {
      holdingGroup: 'BORNEO SENTOSA AGRO GROUP',
      projectName: 'Pekerjaan Perawatan Parit Saluran Air & Angkutan TBS Sawit Sinar Mas Group',
      projectLocation: 'Head Office: Pontianak | Kebun Sites: Ketapang & Sanggau, Kalbar',
      existingProjects: 'Kontrak Perawatan Kebun Sawit PT SMART Tbk (2021-sekarang) luas 12.000 Ha',
      newProjects: 'Perpanjangan kontrak 3 tahun dan penambahan areal kebun seluas 8.000 Ha',
      customerRole: 'Kontraktor Perawatan Lahan, Pembersihan Parit, dan Pemuatan TBS',
      otherContractors: 'Koperasi Karyawan Perkebunan',
      bowheerInfo: 'PT Sinar Mas Agro Resources and Technology Tbk (PT SMART Tbk).',
      projectStatus: 'Kontrak telah berjalan aktif sejak 2021 dengan performa memuaskan tanpa klaim penalti',
      investmentPlan: 'Kebutuhan 10 unit alat berat untuk memenuhi target musim panen raya',
      financingSchemeRequested: '36-month lease, 20% Security Deposit',
      ubo: 'H. Sudirman (60%)\nDrs. Hendro Pranoto (40%)',
      uboInfo: 'H. Sudirman (60%)\nDrs. Hendro Pranoto (40%)',
      companyBackground: 'Perusahaan perkebunan dan kontraktor agrikultur terkemuka di Kalimantan Barat.',
      starGroupMilestonesNarrative: '2016: Pendirian PT Borneo Agro Mandiri\n2019: Menjadi vendor rekanan utama PT SMART Tbk',
      businessDevBackground: 'Manajemen sangat berpengalaman dalam operasional kebun gambut dan mineral.',
      operationalTeamInfo: 'Memiliki workshop mandiri di Ketapang dengan ketersediaan suku cadang cepat.',
      milestones: [
        { year: '2016', milestone: 'Pendirian PT BAM' },
        { year: '2019', milestone: 'Kemitraan PT SMART Tbk' }
      ],
      equipmentJobFit: 'Wheel Loader 856H dilengkapi high-lift bucket untuk loading TBS ke dump truck.',
      utilizationDuration: '12 jam/hari',
      priorLiugongExperience: 'Memiliki 3 unit Wheel Loader LiuGong 856 eksisting dengan jam kerja >6000 HM.',
      serviceAgreementFmc: 'Kontrak servis berkala dengan PT Pusaka Heavyindo Pontianak.',
      unitComposition: [
        { kategoriAset: 'Wheel Loader 5 Ton', brand: 'LIUGONG 856H', qty: 6 },
        { kategoriAset: 'Excavator 20 Ton', brand: 'LIUGONG 922E', qty: 4 }
      ],
      deliveryStatus: 'Alokasi stok dari cabang Balikpapan dan Pontianak',
      deliveryDate: '20-Nov-2026',
      qaIlinkComment: 'Monitoring jam kerja mesin dan konsumsi bahan bakar terintegrasi',
      qaConclusion: 'Sesuai untuk medan tanah perkebunan kelapa sawit',
      dealerCheck: 'Pelayanan purna jual dealer terbukti responsif di wilayah Kalbar',
      topDealerToCustomer: 'Tidak ada tunggakan suku cadang',
      topLmiToDealer: 'Dealer bereputasi baik',
      lmiArCheck: 'Lancar',
      slikPefindoHighlight: 'Kolektibilitas 1 (Lancar) di Bank Kalbar dan Bank Mandiri',
      applicantPefindoCheck: 'Bersih',
      pefindoTerms: 'Fasilitas Modal Kerja Rp 8 Miliar di Bank Kalbar',
      pefindoNotes: 'Riwayat setoran bunga dan pokok tertib',
      lenderExposures: [
        { lender: 'Bank Kalbar', plafond: 'Rp 8.000.000.000', rate: '8.50% eff' }
      ],
      goodProject: true,
      goodProjectNote: 'Komoditas CPO stabil dengan kontrak bowheer bonafid',
      goodCustomer: true,
      goodCustomerNote: 'Finansial sehat, solvabilitas terjaga',
      briefNote: 'Aplikasi lengkap, proses verifikasi dokumen di BS sedang berjalan.',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      suggestions: [
        'Personal Guarantee dari H. Sudirman',
        'Asuransi alat berat komprehensif'
      ],
      competitionTable: [
        { finco: 'Bank Mandiri Leasing', rate: '7.40% flat', purpose: 'Financial Lease' },
        { finco: 'LiuGong Finance (Offered)', rate: '7.15% flat', purpose: 'Financial Lease 36 Mo' }
      ],
      proposedBy: 'Ferry Gunawan\nSenior Account Manager BPN',
      reviewedBy: 'Maria Regina\nDept. Head Marketing',
      approvedBy: 'Jembar Ganda E\nDirector'
    }
  },
  {
    companyName: 'PT Sriwijaya Mineral Abadi',
    companyType: 'CORPORATE',
    nib: '1209260000102',
    npwp: '012345678900102',
    establishmentActNo: 'AHU-0078129.AH.01.01.2018',
    establishmentDate: '2018-02-19',
    branchCode: 'PLB01',
    companyAddress: 'Jl. R. Soekamto No. 45, Ilir Timur II',
    city: 'Palembang',
    province: 'Sumatera Selatan',
    postalCode: '30114',
    phoneFax: '0711-382910',
    email: 'corp@sriwijayamineral.com',
    mainBusiness: 'Coal Re-handling & Stockpile Management',
    experienceYears: 8,
    experienceMonths: 8,
    locationStatus: 'OWNED',
    repaymentSource: 'Kontrak Jasa Re-handling Batubara PT Bukit Asam Tbk (PTBA) Dermaga Kertapati',
    industrySegment: 'MINING',
    businessRole: 'CONTRACTORS',
    pic: {
      name: 'Iskandar Zulkarnain',
      position: 'Direktur Operasional',
      phone: '08117890123',
      email: 'iskandar@sriwijayamineral.com',
      currentAddress: 'Jl. Basuki Rahmat No. 78',
      city: 'Palembang',
      province: 'Sumatera Selatan',
      postalCode: '30127'
    },
    proposal: {
      facilityPurpose: 'INVESTMENT',
      purposeDetail: 'Pengadaan Armada Heavy Wheel Loader Muat Kereta Api Batubara',
      financingMethod: 'FINANCIAL_LEASE',
      financingValue: 31500000000,
      downPaymentValue: 6300000000,
      securityDeposit: 6300000000,
      interestRate: 6.85,
      tenorMonths: 36,
      paymentMethod: 'Monthly in Arrear',
      currency: 'IDR',
      units: [
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Wheel Loader 856H Heavy Duty', quantity: 15, unitPrice: 2100000000, totalPrice: 31500000000 }
      ]
    },
    preAnalysis: {
      holdingGroup: 'SRIWIJAYA MAKMUR GROUP',
      projectName: 'Operasi Penanganan & Pemuatan Batubara Stasiun Muat Kertapati & Tarahan',
      projectLocation: 'Head Office: Palembang | Operasional: Kertapati & Muara Enim',
      existingProjects: 'Kontrak Rehandling PTBA Tanjung Enim (2020-2025) volume 300.000 ton/bln',
      newProjects: 'Perpanjangan kontrak PTBA hingga 2030 dengan target 500.000 ton/bln',
      customerRole: 'Kontraktor Utama Stockpile Management dan Pemuatan Gerbong Batubara (Babaranjang)',
      otherContractors: 'PT Kereta Api Logistik (Kalog)',
      bowheerInfo: 'PT Bukit Asam Tbk (PTBA). BUMN pertambangan batubara terkemuka.',
      projectStatus: 'Operasi berjalan lancar dengan uptime alat 94%',
      investmentPlan: 'Pengadaan total 15 unit Wheel Loader 856H kapasitas bucket 4.2 m3',
      financingSchemeRequested: '36-month lease, 20% SD, Flat 6.85% p.a.',
      ubo: 'Iskandar Zulkarnain (53.3%)\nH. Syamsudin Noor (46.7%)',
      uboInfo: 'Iskandar Zulkarnain (53.3%)\nH. Syamsudin Noor (46.7%)',
      companyBackground: 'Spesialis kontraktor stockpile batubara dan logistik pelabuhan sungai sejak 2018.',
      starGroupMilestonesNarrative: '2018: Berdiri di Palembang\n2020: Menang tender PTBA Kertapati',
      businessDevBackground: 'Hubungan kredibel dengan PTBA dan PT Kereta Api Indonesia (KAI).',
      operationalTeamInfo: 'Didukung 60 operator berpengalaman dan 6 mekanik bersertifikat.',
      milestones: [
        { year: '2018', milestone: 'Pendirian Perusahaan' },
        { year: '2020', milestone: 'Kontrak Perdana PTBA' }
      ],
      equipmentJobFit: 'Wheel Loader 856H dengan coal bucket 4.2 m3 memiliki kecepatan siklus muat 12 detik.',
      utilizationDuration: '20 jam/hari (operasi 3 shift non-stop)',
      priorLiugongExperience: 'Telah mengoperasikan 8 unit LiuGong CLG856H sejak 2021 dengan kehandalan prima.',
      serviceAgreementFmc: 'Kontrak SLA 95% dengan dealer LiuGong Palembang.',
      unitComposition: [
        { kategoriAset: 'Heavy Wheel Loader 5 Ton', brand: 'LIUGONG 856H Coal Spec', qty: 15 }
      ],
      deliveryStatus: 'Delivery bertahap: 5 unit/bulan',
      deliveryDate: '01-Dec-2026',
      qaIlinkComment: 'Fitur telematika iLink memantau efisiensi bahan bakar',
      qaConclusion: 'Sangat cocok untuk siklus muat batubara intensitas tinggi',
      dealerCheck: 'Dealer Palembang memiliki cabang dan depo sparepart dekat lokasi kerja',
      topDealerToCustomer: 'Kolektibilitas lancar tanpa keterlambatan',
      topLmiToDealer: 'Dealer resmi Gold Provider',
      lmiArCheck: 'Lancar',
      slikPefindoHighlight: 'Kolektibilitas 1 di Bank Mandiri & Bank Sumsel Babel',
      applicantPefindoCheck: 'Bersih',
      pefindoTerms: 'Fasilitas aktif KMK Rp 25 Miliar di Bank Mandiri',
      pefindoNotes: 'Semua cicilan tepat waktu',
      lenderExposures: [
        { lender: 'Bank Mandiri', plafond: 'Rp 25.000.000.000', rate: '8.85% eff' }
      ],
      goodProject: true,
      goodProjectNote: 'Proyek BUMN energi vital nasional dengan kepastian pembayaran',
      goodCustomer: true,
      goodCustomerNote: 'Arus kas sangat stabil dan modal sendiri memadai',
      briefNote: 'Aplikasi sedang ditelaah oleh tim Credit Analyst & Legal. Rekomendasi positif.',
      recommendation: 'RECOMMEND TO FULL DOCUMENTATION',
      suggestions: [
        'Fidusia 15 unit Wheel Loader didaftarkan lengkap',
        'Corporate Guarantee PT Sriwijaya Makmur Corporindo'
      ],
      competitionTable: [
        { finco: 'Mandiri Tunas Finance', rate: '7.10% flat', purpose: 'Financial Lease' },
        { finco: 'LiuGong Finance (Offered)', rate: '6.85% flat', purpose: 'Financial Lease 36 Mo' }
      ],
      proposedBy: 'Denny Pratama\nSenior Account Manager PLB',
      reviewedBy: 'Maria Regina\nDept. Head Marketing',
      approvedBy: 'Jembar Ganda E\nDirector'
    }
  },
  {
    companyName: 'PT Java Trans Sarana',
    companyType: 'COMMERCIAL',
    nib: '1209260000103',
    npwp: '012345678900103',
    establishmentActNo: 'AHU-0091283.AH.01.01.2021',
    establishmentDate: '2021-06-11',
    branchCode: 'SBY01',
    companyAddress: 'Jl. Margomulyo Indah Blok H No. 7',
    city: 'Surabaya',
    province: 'Jawa Timur',
    postalCode: '60186',
    phoneFax: '031-7489210',
    email: 'info@javatranssarana.com',
    mainBusiness: 'Inter-island Logistics & Heavy Cargo Transport',
    experienceYears: 5,
    experienceMonths: 4,
    locationStatus: 'RENTED',
    repaymentSource: 'Pendapatan Angkutan Kontainer Tanjung Perak ke PIER & Pasuruan',
    industrySegment: 'CONSTRUCTION',
    businessRole: 'CONTRACTORS',
    pic: {
      name: 'Bambang Soeprapto',
      position: 'Direktur Utama',
      phone: '081234901823',
      email: 'bambang@javatranssarana.com',
      currentAddress: 'Komp. Rungkut Asri Timur No. 34',
      city: 'Surabaya',
      province: 'Jawa Timur',
      postalCode: '60293'
    },
    proposal: {
      facilityPurpose: 'INVESTMENT',
      purposeDetail: 'Pengadaan Forklift & Material Handling Gudang Margomulyo',
      financingMethod: 'FINANCIAL_LEASE',
      financingValue: 11200000000,
      downPaymentValue: 2240000000,
      securityDeposit: 2240000000,
      interestRate: 7.50,
      tenorMonths: 36,
      paymentMethod: 'Monthly in Arrear',
      currency: 'IDR',
      units: [
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Heavy Forklift CLG2050H', quantity: 4, unitPrice: 1600000000, totalPrice: 6400000000 },
        { brand: 'LIUGONG', unitCategory: 'HE', modelName: 'Forklift CLG2030H', quantity: 6, unitPrice: 800000000, totalPrice: 4800000000 }
      ]
    },
    preAnalysis: {
      holdingGroup: 'JAVA LOGISTICS GROUP',
      projectName: 'Pengadaan Forklift Heavy Cargo Terminal Petikemas Tanjung Perak & Depo Margomulyo',
      projectLocation: 'Head Office & Depo: Margomulyo, Surabaya',
      existingProjects: 'Distribusi Kontainer Pelabuhan Tanjung Perak (2021-sekarang)',
      newProjects: 'Penambahan kontrak bongkar muat kargo curah PT Meratus Line',
      customerRole: 'Penyedia Jasa Bongkar Muat & Pergudangan Kargo',
      otherContractors: 'Vendor Logistik Lokal Surabaya',
      bowheerInfo: 'PT Meratus Line & Mitra Swasta Logistik Jawa Timur',
      projectStatus: 'Berkas dikembalikan karena laporan keuangan 2024-2025 belum diaudit dan rasio utang tinggi',
      investmentPlan: 'Pengadaan 10 unit Forklift LiuGong',
      financingSchemeRequested: '36-month lease, 20% SD',
      ubo: 'Bambang Soeprapto (60%)\nLia Kusuma (40%)',
      uboInfo: 'Bambang Soeprapto (60%)\nLia Kusuma (40%)',
      companyBackground: 'Perusahaan logistik kargo darat di Surabaya yang baru berkembang sejak 2021.',
      starGroupMilestonesNarrative: '2021: Berdiri di Surabaya\n2023: Membuka depo kontainer Margomulyo',
      businessDevBackground: 'Persaingan logistik kontainer ketat di area Tanjung Perak dengan margin tipis.',
      operationalTeamInfo: 'Tim operasional 20 pengemudi dan operator forklift.',
      milestones: [
        { year: '2021', milestone: 'Pendirian Perusahaan' },
        { year: '2023', milestone: 'Sewa Depo Margomulyo' }
      ],
      equipmentJobFit: 'Forklift LiuGong CLG2030H & 2050H sesuai untuk pemindahan kontainer dan kargo palet.',
      utilizationDuration: '10 jam/hari',
      priorLiugongExperience: 'Belum pernah menggunakan unit LiuGong sebelumnya.',
      serviceAgreementFmc: 'Dealer PT Surya Heavyindo Surabaya.',
      unitComposition: [
        { kategoriAset: 'Heavy Forklift 5 Ton', brand: 'LIUGONG CLG2050H', qty: 4 },
        { kategoriAset: 'Forklift 3 Ton', brand: 'LIUGONG CLG2030H', qty: 6 }
      ],
      deliveryStatus: 'Stok tersedia di gudang dealer Surabaya',
      deliveryDate: 'Pending kelengkapan berkas',
      qaIlinkComment: 'iLink standar',
      qaConclusion: 'Peralatan sesuai namun aspek finansial debitur perlu pembenahan',
      dealerCheck: 'Dealer siap memberikan pendampingan teknis',
      topDealerToCustomer: 'Nasabah baru di dealer',
      topLmiToDealer: 'Dealer resmi',
      lmiArCheck: 'Baru',
      slikPefindoHighlight: 'Pernah tercatat Kol-2 di leasing swasta pada April 2026',
      applicantPefindoCheck: 'Catatan perhatian khusus Kol-2',
      pefindoTerms: 'Fasilitas leasing truk di perusahaan pembiayaan swasta',
      pefindoNotes: 'Sudah kembali lancar namun histori 12 bulan terakhir belum bersih sempurna',
      lenderExposures: [
        { lender: 'BCA Finance', plafond: 'Rp 4.000.000.000', rate: '8.50% eff' }
      ],
      goodProject: false,
      goodProjectNote: 'Margin usaha tipis dan kepastian kontrak lanjutan belum terikat definitif',
      goodCustomer: false,
      goodCustomerNote: 'Histori Kol-2 dalam 12 bulan terakhir dan laporan keuangan belum diaudit',
      briefNote: 'Aplikasi DIKEMBALIKAN (RETURNED) ke Marketing untuk melengkapi audit dan penambahan DP.',
      recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
      suggestions: [
        'Menaikkan uang muka (Down Payment) menjadi minimal 30%',
        'Melampirkan laporan keuangan tahun 2024 & 2025 yang diaudit KAP'
      ],
      competitionTable: [
        { finco: 'BCA Finance', rate: '7.85% flat', purpose: 'Financial Lease' },
        { finco: 'LiuGong Finance (Offered)', rate: '7.50% flat', purpose: 'Financial Lease' }
      ],
      proposedBy: 'Rizky Ramadhan\nAccount Manager SBY',
      reviewedBy: 'Maria Regina\nDept. Head Marketing',
      approvedBy: 'Jembar Ganda E\nDirector'
    }
  }
];

async function run() {
  console.log('Logging in to CRM backend...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@liugong.local', password: 'LiuGong2026!' });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }

  const cookie = (loginRes.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');
  console.log('Login successful! Auth cookie acquired.');

  const preAnaDir = path.join(process.cwd(), 'database', 'pre_analysis');
  await fs.mkdir(preAnaDir, { recursive: true });

  for (const appData of appsToCreate) {
    console.log(`\nCreating customer & application: ${appData.companyName}...`);

    // 1. Create or ensure customer
    const custRes = await request({
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api/v1/customers',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
    }, {
      companyName: appData.companyName,
      companyType: appData.companyType,
      nib: appData.nib,
      npwp: appData.npwp,
      establishmentActNo: appData.establishmentActNo,
      establishmentDate: appData.establishmentDate
    });

    const customerId = custRes.body.id;
    console.log(`Customer created/retrieved: ID ${customerId}`);

    // 2. Create Application
    const appRes = await request({
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api/v1/applications',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
    }, {
      customerId,
      branchCode: appData.branchCode,
      customerStatus: 'NEW',
      companyAddress: appData.companyAddress,
      city: appData.city,
      province: appData.province,
      postalCode: appData.postalCode,
      phoneFax: appData.phoneFax,
      email: appData.email,
      mainBusiness: appData.mainBusiness,
      experienceYears: appData.experienceYears,
      experienceMonths: appData.experienceMonths,
      locationStatus: appData.locationStatus,
      repaymentSource: appData.repaymentSource,
      industrySegment: appData.industrySegment,
      businessRole: appData.businessRole
    });

    const newApp = appRes.body;
    const appId = newApp.id;
    const fapNo = newApp.fapNumber || newApp.fap_number;
    console.log(`Application created: [${fapNo}] ID ${appId}`);

    // 3. Update PIC & Page 1
    await request({
      hostname: '127.0.0.1',
      port: 3001,
      path: `/api/v1/applications/${appId}/page-1`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
    }, {
      branchCode: appData.branchCode,
      companyAddress: appData.companyAddress,
      city: appData.city,
      province: appData.province,
      postalCode: appData.postalCode,
      phoneFax: appData.phoneFax,
      email: appData.email,
      mainBusiness: appData.mainBusiness,
      experienceYears: appData.experienceYears,
      experienceMonths: appData.experienceMonths,
      locationStatus: appData.locationStatus,
      repaymentSource: appData.repaymentSource,
      industrySegment: appData.industrySegment,
      businessRole: appData.businessRole,
      pic: appData.pic
    });
    console.log(`Page 1 (PIC & Business Info) updated.`);

    // 4. Update Proposal & Units
    await request({
      hostname: '127.0.0.1',
      port: 3001,
      path: `/api/v1/applications/${appId}/page-2`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
    }, {
      proposal: appData.proposal
    });
    console.log(`Page 2 (Proposal & Units) updated.`);

    // 5. Save Pre-Analysis JSON
    const fullPreAnalysis = {
      ...appData.preAnalysis,
      preAnalysisNo: `${fapNo.split('/')[0]}/PREANA/MKT/X/2026`,
      preAnalysisDate: '29-Oct-26',
      customerProjectName: appData.companyName,
      taxId: appData.npwp,
      fapNumber: fapNo,
      customerPic: `${appData.pic.name} (${appData.pic.position})`,
      customerArea: `${appData.city}, ${appData.province}`
    };
    const jsonPath = path.join(preAnaDir, `${appId}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(fullPreAnalysis, null, 2), 'utf-8');
    console.log(`Pre-analysis JSON saved at ${jsonPath}`);
  }

  // Check total applications now
  const listRes = await request({
    hostname: '127.0.0.1',
    port: 3001,
    path: '/api/v1/applications',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  console.log(`\n========================================`);
  console.log(`Total applications in CRM system: ${listRes.body.length}`);
  console.log(`Applications list:`);
  for (const a of listRes.body) {
    console.log(`- [${a.fapNumber || a.fap_number}] ${a.company_name || a.customer?.companyName} | ${a.branch_code || a.branchCode} | Rp ${Number(a.financing_value || 0).toLocaleString()} | ${a.status}`);
  }
  console.log(`========================================`);
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
