import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { query, transaction, dataDir } from './db';

async function seedScenarios() {
  console.log('Seeding rich scenario dummy data into database for ALL 6 scenarios...');

  const fapBytes = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/fap.pdf');
  const preBytes = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/preanalysis.pdf');
  const iclfBytes = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/iclf.pdf');
  const ktpB64 = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/ktp_b64.txt', 'utf8').trim();

  // Ensure files directory exists
  const filesDir = path.join(dataDir, 'files');
  fs.mkdirSync(filesDir, { recursive: true });

  const scenarios = [
    {
      fapNumber: '001/AF/IX/2026',
      status: 'IN_CA_LEGAL_REVIEW',
      companyName: 'PT Nusantara Mining Pratama',
      companyType: 'CORPORATE',
      nib: '1209260000012',
      npwp: '0123456789012000',
      establishmentActNo: 'AHU-0012890.AH.01.01.2018',
      establishmentDate: '2018-03-15',
      branchCode: 'JKT01',
      customerStatus: 'EXISTING',
      companyAddress: 'Gedung Menara Batavia Lt. 18, Jl. K.H. Mas Mansyur Kav. 126',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      postalCode: '10220',
      phoneFax: '021-5727188',
      email: 'corporate.finance@nusantaraming.co.id',
      website: 'www.nusantaraming.co.id',
      mainBusiness: 'Kontraktor Penambangan & Penyewaan Alat Berat',
      experienceYears: 8,
      experienceMonths: 6,
      locationStatus: 'OWNED',
      repaymentSource: 'Arus Kas Operasional Kontrak Tambang PT Vale Indonesia Tbk & PT Antam Tbk',
      latestDeedNo: 'AHU-0045612.AH.01.02.2024',
      latestDeedDate: '2024-06-20',
      industrySegment: 'MINING',
      businessRole: 'CONTRACTORS',
      assetHeLiu: 4, assetTruckLiu: 2, assetHeNon: 3, assetTruckNon: 5,
      pic: { name: 'Budi Santoso, S.E.', pos: 'Direktur Keuangan / CFO', phone: '08118899223', email: 'budi.santoso@nusantaraming.co.id', addr: 'Jl. Senopati No. 45, RT 05 / RW 02', city: 'Jakarta Selatan', prov: 'DKI Jakarta', zip: '12190' },
      stakeholders: [
        { name: 'Guohui Chen', pos: 'Direktur Utama', type: 'INDIVIDUAL', nat: 'WNA', idType: 'KTP', idNum: '3203012503770011', amount: 4500000000, pct: 45.0, email: 'guohui.chen@nusantaraming.co.id', phone: '08119988221', cap: 4500000000, fn: 'Guohui', ln: 'Chen', cit: 'CHINESE', ktp: true },
        { name: 'Hendra Wijaya', pos: 'Komisaris Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '3171052010850002', amount: 3500000000, pct: 35.0, email: 'hendra.wijaya@nusantaraming.co.id', phone: '08129988771', cap: 3500000000, fn: 'Hendra', ln: 'Wijaya', cit: 'INDONESIAN', ktp: false },
        { name: 'PT Investama Karya Mandiri', pos: 'Pemegang Saham Badan', type: 'CORPORATE', nat: 'WNI', idType: 'NPWP', idNum: '019887766554000', amount: 2000000000, pct: 20.0, email: 'legal@investamakarya.com', phone: '021-5299881', cap: 2000000000, fn: 'PT Investama', ln: 'Karya Mandiri', cit: 'INDONESIAN', ktp: false }
      ],
      deeds: [
        { id: 'deed-est-001', type: 'establishment', deedNo: 'AHU-0012890.AH.01.01.2018', deedDate: '2018-03-15', notaryName: 'Siti Aminah, S.H., M.Kn.', notaryLocation: 'Jakarta Pusat', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta pendirian perseroan terbatas PT Nusantara Mining Pratama dihadapan Notaris Siti Aminah.</li><li>Modal dasar perseroan ditetapkan sebesar Rp 50 Miliar dan modal disetor Rp 15 Miliar.</li></ol>' },
        { id: 'deed-amd-002', type: 'amendment', deedNo: 'AHU-0045612.AH.01.02.2024', deedDate: '2024-06-20', notaryName: 'Bambang Soeprapto, S.H., M.Kn.', notaryLocation: 'Jakarta Selatan', remarkCategoryIds: ['amendment-share-change', 'amendment-management-change'], remarks: '<ol><li>Peningkatan modal disetor perseroan menjadi Rp 25 Miliar sehubungan penambahan setoran modal pemegang saham.</li><li>Penetapan Guohui Chen selaku Direktur Utama perseroan menggantikan pejabat sebelumnya.</li></ol>' }
      ],
      projects: [
        { owner: 'PT Vale Indonesia Tbk', loc: 'Sorowako, Sulawesi Selatan', role: 'Main Contractor Penambangan Nikel', status: 'EXISTING' },
        { owner: 'PT Aneka Tambang Tbk', loc: 'Pomalaa, Sulawesi Tenggara', role: 'Kontraktor Hauling & Overburden', status: 'EXISTING' },
        { owner: 'PT Bukit Asam Tbk', loc: 'Tanjung Enim, Sumatera Selatan', role: 'Subkontraktor Rental Alat Berat', status: 'NEW' }
      ],
      banks: [
        { name: 'Bank Mandiri', curr: 'IDR', facility: 15000000000, inst: 485000000, yr: 2021, rate: 9.75, record: 'Lancar (Kol-1)', status: 'ACTIVE' },
        { name: 'Bank BCA', curr: 'IDR', facility: 10000000000, inst: 320000000, yr: 2022, rate: 9.50, record: 'Lancar (Kol-1)', status: 'ACTIVE' }
      ],
      proposal: { purpose: 'INVESTMENT', method: 'FINANCIAL_LEASE', value: 12500000000, dp: 2500000000, rate: 10.50, tenor: 36, pay: 'In Arrear' },
      units: [
        { brand: 'LiuGong', cat: 'HE', model: '936E', qty: 2, price: 6250000000, total: 12500000000 }
      ],
      financials: [
        { yr: 2023, ca: 18500000000, nca: 32000000000, ta: 50500000000, cl: 12000000000, ncl: 15000000000, tl: 27000000000, eq: 23500000000, rev: 68000000000, gm: 18500000000, om: 12200000000, tax: 2440000000, net: 9760000000 },
        { yr: 2024, ca: 24000000000, nca: 41000000000, ta: 65000000000, cl: 14500000000, ncl: 18000000000, tl: 32500000000, eq: 32500000000, rev: 85000000000, gm: 23800000000, om: 16500000000, tax: 3300000000, net: 13200000000 },
        { yr: 2025, ca: 31000000000, nca: 52000000000, ta: 83000000000, cl: 17000000000, ncl: 22000000000, tl: 39000000000, eq: 44000000000, rev: 108000000000, gm: 31200000000, om: 22400000000, tax: 4480000000, net: 17920000000 }
      ],
      docs: { fap: true, pre: true, iclf: false }
    },
    {
      fapNumber: '002/AF/IX/2026',
      status: 'SUBMITTED_TO_BS',
      companyName: 'PT Cipta Infrastruktur Nusantara',
      companyType: 'CORPORATE',
      nib: '1209260000023',
      npwp: '0234567890123000',
      establishmentActNo: 'AHU-0019234.AH.01.01.2019',
      establishmentDate: '2019-05-12',
      branchCode: 'SBY01',
      customerStatus: 'EXISTING',
      companyAddress: 'Jl. Mayjen Sungkono No. 88, Dukuh Pakis',
      city: 'Surabaya',
      province: 'Jawa Timur',
      postalCode: '60225',
      phoneFax: '031-5678901',
      email: 'finance@ciptainfrastruktur.co.id',
      website: 'www.ciptainfrastruktur.co.id',
      mainBusiness: 'Konstruksi Jalan Raya, Jembatan & Saluran Irigasi',
      experienceYears: 6,
      experienceMonths: 4,
      locationStatus: 'OWNED',
      repaymentSource: 'Termin Proyek APBN & BUMN Karya (Waskita Karya & Jasa Marga)',
      latestDeedNo: 'AHU-0038910.AH.01.02.2023',
      latestDeedDate: '2023-08-14',
      industrySegment: 'CONSTRUCTION',
      businessRole: 'CONTRACTORS',
      assetHeLiu: 3, assetTruckLiu: 4, assetHeNon: 2, assetTruckNon: 6,
      pic: { name: 'Ir. Bambang Soepomo', pos: 'Direktur Operasional', phone: '08123456789', email: 'bambang.soepomo@ciptainfrastruktur.co.id', addr: 'Jl. Darmo Permai Timur No. 12', city: 'Surabaya', prov: 'Jawa Timur', zip: '60226' },
      stakeholders: [
        { name: 'Ir. Bambang Soepomo', pos: 'Direktur Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '3578011204750001', amount: 5500000000, pct: 55.0, email: 'bambang.soepomo@ciptainfrastruktur.co.id', phone: '08123456789', cap: 5500000000, fn: 'Bambang', ln: 'Soepomo', cit: 'INDONESIAN', ktp: true },
        { name: 'Agus Hartono', pos: 'Komisaris', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '3578051908780002', amount: 4500000000, pct: 45.0, email: 'agus.hartono@ciptainfrastruktur.co.id', phone: '08133344455', cap: 4500000000, fn: 'Agus', ln: 'Hartono', cit: 'INDONESIAN', ktp: false }
      ],
      deeds: [
        { id: 'deed-est-002', type: 'establishment', deedNo: 'AHU-0019234.AH.01.01.2019', deedDate: '2019-05-12', notaryName: 'Hartanto, S.H., M.Kn.', notaryLocation: 'Surabaya', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta pendirian perseroan terbatas PT Cipta Infrastruktur Nusantara.</li><li>Modal disetor ditempatkan sebesar Rp 10 Miliar.</li></ol>' },
        { id: 'deed-amd-002', type: 'amendment', deedNo: 'AHU-0038910.AH.01.02.2023', deedDate: '2023-08-14', notaryName: 'Hartanto, S.H., M.Kn.', notaryLocation: 'Surabaya', remarkCategoryIds: ['amendment-articles-change'], remarks: '<ol><li>Peningkatan modal dasar dan disetor menjadi Rp 17 Miliar sehubungan penambahan proyek jalan tol.</li></ol>' }
      ],
      projects: [
        { owner: 'PT Jasa Marga Tbk', loc: 'Probolinggo - Banyuwangi, Jatim', role: 'Main Contractor Sub-Seksi 1', status: 'EXISTING' },
        { owner: 'PT Waskita Karya Tbk', loc: 'Trenggalek, Jawa Timur', role: 'Subkontraktor Bendungan Bagong', status: 'EXISTING' },
        { owner: 'PT Wijaya Karya Tbk', loc: 'Sidoarjo, Jawa Timur', role: 'Kontraktor Pengecoran Flyover', status: 'NEW' }
      ],
      banks: [
        { name: 'Bank BCA', curr: 'IDR', facility: 8000000000, inst: 260000000, yr: 2020, rate: 9.50, record: 'Lancar (Kol-1)', status: 'ACTIVE' },
        { name: 'Bank Jatim', curr: 'IDR', facility: 5000000000, inst: 165000000, yr: 2022, rate: 9.80, record: 'Lancar (Kol-1)', status: 'ACTIVE' }
      ],
      proposal: { purpose: 'INVESTMENT', method: 'FINANCIAL_LEASE', value: 8500000000, dp: 1700000000, rate: 10.25, tenor: 36, pay: 'In Arrear' },
      units: [
        { brand: 'LiuGong', cat: 'HE', model: '856H Max', qty: 2, price: 3200000000, total: 6400000000 },
        { brand: 'LiuGong', cat: 'HE', model: '4180D', qty: 1, price: 2100000000, total: 2100000000 }
      ],
      financials: [
        { yr: 2023, ca: 14000000000, nca: 22000000000, ta: 36000000000, cl: 9000000000, ncl: 11000000000, tl: 20000000000, eq: 16000000000, rev: 45000000000, gm: 12000000000, om: 7500000000, tax: 1500000000, net: 6000000000 },
        { yr: 2024, ca: 19000000000, nca: 28000000000, ta: 47000000000, cl: 11000000000, ncl: 14000000000, tl: 25000000000, eq: 22000000000, rev: 58000000000, gm: 16000000000, om: 10200000000, tax: 2040000000, net: 8160000000 },
        { yr: 2025, ca: 25000000000, nca: 35000000000, ta: 60000000000, cl: 13000000000, ncl: 17000000000, tl: 30000000000, eq: 30000000000, rev: 72000000000, gm: 20500000000, om: 13500000000, tax: 2700000000, net: 10800000000 }
      ],
      docs: { fap: true, pre: false, iclf: false }
    },
    {
      fapNumber: '003/AF/IX/2026',
      status: 'DRAFT',
      companyName: 'PT Sumber Alam Lestari',
      companyType: 'COMMERCIAL',
      nib: '1209260000034',
      npwp: '0345678901234000',
      establishmentActNo: 'AHU-0028192.AH.01.01.2021',
      establishmentDate: '2021-04-18',
      branchCode: 'BPN01',
      customerStatus: 'NEW',
      companyAddress: 'Jl. Jenderal Sudirman No. 102, Klandasan Ilir',
      city: 'Balikpapan',
      province: 'Kalimantan Timur',
      postalCode: '76113',
      phoneFax: '0542-765432',
      email: 'office@sumberalamlestari.co.id',
      website: 'www.sumberalamlestari.co.id',
      mainBusiness: 'Kehutanan, Hutan Tanaman Industri & Log Hauling',
      experienceYears: 4,
      experienceMonths: 8,
      locationStatus: 'RENTED',
      repaymentSource: 'Arus Kas Kontrak Kerja Suplai Kayu Bulat ke Pabrik Pulp & Paper',
      latestDeedNo: 'AHU-0028192.AH.01.01.2021',
      latestDeedDate: '2021-04-18',
      industrySegment: 'FORESTRY',
      businessRole: 'CONTRACTORS',
      assetHeLiu: 2, assetTruckLiu: 2, assetHeNon: 4, assetTruckNon: 8,
      pic: { name: 'Denny Kurniawan, S.E.', pos: 'Direktur Keuangan', phone: '08115566778', email: 'denny.k@sumberalamlestari.co.id', addr: 'Jl. Ruhui Rahayu No. 45', city: 'Balikpapan', prov: 'Kalimantan Timur', zip: '76115' },
      stakeholders: [
        { name: 'Denny Kurniawan', pos: 'Direktur Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '6471011508820002', amount: 6000000000, pct: 60.0, email: 'denny.k@sumberalamlestari.co.id', phone: '08115566778', cap: 6000000000, fn: 'Denny', ln: 'Kurniawan', cit: 'INDONESIAN', ktp: true },
        { name: 'Rian Sugianto', pos: 'Komisaris', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '6471032203850001', amount: 4000000000, pct: 40.0, email: 'rian.sugianto@sumberalamlestari.co.id', phone: '08125588991', cap: 4000000000, fn: 'Rian', ln: 'Sugianto', cit: 'INDONESIAN', ktp: false }
      ],
      deeds: [
        { id: 'deed-est-003', type: 'establishment', deedNo: 'AHU-0028192.AH.01.01.2021', deedDate: '2021-04-18', notaryName: 'Yuliana, S.H., M.Kn.', notaryLocation: 'Balikpapan', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta pendirian perseroan terbatas PT Sumber Alam Lestari.</li><li>Modal dasar Rp 15 Miliar, disetor Rp 10 Miliar.</li></ol>' }
      ],
      projects: [
        { owner: 'PT Inhutani I', loc: 'Kutai Barat, Kalimantan Timur', role: 'Main Contractor Logging & Hauling', status: 'EXISTING' },
        { owner: 'PT ITCI Hutani Manunggal', loc: 'Sepaku, Penajam Paser Utara', role: 'Kontraktor Land Clearing HTI', status: 'NEW' }
      ],
      banks: [
        { name: 'Bank Mandiri', curr: 'IDR', facility: 6000000000, inst: 195000000, yr: 2021, rate: 9.75, record: 'Lancar (Kol-1)', status: 'ACTIVE' }
      ],
      proposal: { purpose: 'INVESTMENT', method: 'FINANCIAL_LEASE', value: 6400000000, dp: 1280000000, rate: 10.75, tenor: 24, pay: 'In Arrear' },
      units: [
        { brand: 'LiuGong', cat: 'HE', model: '922E Log Loader', qty: 2, price: 3200000000, total: 6400000000 }
      ],
      financials: [
        { yr: 2023, ca: 11000000000, nca: 15000000000, ta: 26000000000, cl: 6500000000, ncl: 8500000000, tl: 15000000000, eq: 11000000000, rev: 32000000000, gm: 8500000000, om: 5200000000, tax: 1040000000, net: 4160000000 },
        { yr: 2024, ca: 15000000000, nca: 19000000000, ta: 34000000000, cl: 8000000000, ncl: 10000000000, tl: 18000000000, eq: 16000000000, rev: 41000000000, gm: 11200000000, om: 7100000000, tax: 1420000000, net: 5680000000 },
        { yr: 2025, ca: 19500000000, nca: 23500000000, ta: 43000000000, cl: 9500000000, ncl: 11500000000, tl: 21000000000, eq: 22000000000, rev: 52000000000, gm: 14500000000, om: 9200000000, tax: 1840000000, net: 7360000000 }
      ],
      docs: { fap: false, pre: false, iclf: false }
    },
    {
      fapNumber: '004/AF/IX/2026',
      status: 'CREDIT_COMMITTEE_REVIEW',
      companyName: 'PT Mitra Tambang Sejahtera',
      companyType: 'CORPORATE',
      nib: '1209260000045',
      npwp: '0456789012345000',
      establishmentActNo: 'AHU-0008761.AH.01.01.2016',
      establishmentDate: '2016-08-22',
      branchCode: 'PLB01',
      customerStatus: 'EXISTING',
      companyAddress: 'Jl. R. Sukamto No. 45, Ilir Timur II',
      city: 'Palembang',
      province: 'Sumatera Selatan',
      postalCode: '30114',
      phoneFax: '0711-388299',
      email: 'management@mitratambangsejahtera.com',
      website: 'www.mitratambangsejahtera.com',
      mainBusiness: 'Jasa Penambangan Batubara Terintegrasi & Overburden Removal',
      experienceYears: 10,
      experienceMonths: 2,
      locationStatus: 'OWNED',
      repaymentSource: 'Arus Kas Operasional Kontrak Jangka Panjang PT Bukit Asam Tbk (Tanjung Enim)',
      latestDeedNo: 'AHU-0056128.AH.01.02.2024',
      latestDeedDate: '2024-03-10',
      industrySegment: 'MINING',
      businessRole: 'CONTRACTORS',
      assetHeLiu: 6, assetTruckLiu: 8, assetHeNon: 5, assetTruckNon: 12,
      pic: { name: 'H. Ahmad Zulkarnain', pos: 'Direktur Utama', phone: '08117788990', email: 'ahmad.zulkarnain@mitratambangsejahtera.com', addr: 'Jl. Demang Lebar Daun No. 18', city: 'Palembang', prov: 'Sumatera Selatan', zip: '30137' },
      stakeholders: [
        { name: 'H. Ahmad Zulkarnain', pos: 'Direktur Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '1671041108690001', amount: 15000000000, pct: 50.0, email: 'ahmad.zulkarnain@mitratambangsejahtera.com', phone: '08117788990', cap: 15000000000, fn: 'Ahmad', ln: 'Zulkarnain', cit: 'INDONESIAN', ktp: true },
        { name: 'Rahmat Hidayat', pos: 'Direktur Keuangan', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '1671062507740003', amount: 9000000000, pct: 30.0, email: 'rahmat.hidayat@mitratambangsejahtera.com', phone: '08127711223', cap: 9000000000, fn: 'Rahmat', ln: 'Hidayat', cit: 'INDONESIAN', ktp: false },
        { name: 'PT Palembang Investama', pos: 'Pemegang Saham Badan', type: 'CORPORATE', nat: 'WNI', idType: 'NPWP', idNum: '018899001122000', amount: 6000000000, pct: 20.0, email: 'legal@palembanginvestama.co.id', phone: '0711-355122', cap: 6000000000, fn: 'PT Palembang', ln: 'Investama', cit: 'INDONESIAN', ktp: false }
      ],
      deeds: [
        { id: 'deed-est-004', type: 'establishment', deedNo: 'AHU-0008761.AH.01.01.2016', deedDate: '2016-08-22', notaryName: 'Syamsul Bahri, S.H., M.Kn.', notaryLocation: 'Palembang', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta pendirian perseroan terbatas PT Mitra Tambang Sejahtera.</li><li>Modal dasar Rp 50 Miliar, modal disetor Rp 20 Miliar.</li></ol>' },
        { id: 'deed-amd-004', type: 'amendment', deedNo: 'AHU-0056128.AH.01.02.2024', deedDate: '2024-03-10', notaryName: 'Syamsul Bahri, S.H., M.Kn.', notaryLocation: 'Palembang', remarkCategoryIds: ['amendment-share-change', 'amendment-capital-increase'], remarks: '<ol><li>Peningkatan modal disetor perseroan menjadi Rp 30 Miliar sehubungan penambahan unit alat berat tambang.</li><li>Perubahan susunan pemegang saham masuknya PT Palembang Investama.</li></ol>' }
      ],
      projects: [
        { owner: 'PT Bukit Asam Tbk', loc: 'Tanjung Enim, Sumatera Selatan', role: 'Main Contractor Pengupasan Batubara', status: 'EXISTING' },
        { owner: 'PT Semen Baturaja Tbk', loc: 'Baturaja, Ogan Komering Ulu', role: 'Kontraktor Penambangan Limestone', status: 'EXISTING' },
        { owner: 'PT Dizamatra Powerindo', loc: 'Lahat, Sumatera Selatan', role: 'Kontraktor Hauling Batubara ke PLTU', status: 'EXISTING' }
      ],
      banks: [
        { name: 'Bank Mandiri', curr: 'IDR', facility: 25000000000, inst: 780000000, yr: 2019, rate: 9.50, record: 'Lancar (Kol-1)', status: 'ACTIVE' },
        { name: 'Bank BNI', curr: 'IDR', facility: 15000000000, inst: 480000000, yr: 2021, rate: 9.60, record: 'Lancar (Kol-1)', status: 'ACTIVE' }
      ],
      proposal: { purpose: 'INVESTMENT', method: 'FINANCIAL_LEASE', value: 18000000000, dp: 3600000000, rate: 10.00, tenor: 48, pay: 'In Arrear' },
      units: [
        { brand: 'LiuGong', cat: 'HE', model: '950HD Mining Excavator', qty: 3, price: 6000000000, total: 18000000000 }
      ],
      financials: [
        { yr: 2023, ca: 28000000000, nca: 58000000000, ta: 86000000000, cl: 21000000000, ncl: 29000000000, tl: 50000000000, eq: 36000000000, rev: 95000000000, gm: 27500000000, om: 18500000000, tax: 3700000000, net: 14800000000 },
        { yr: 2024, ca: 38000000000, nca: 74000000000, ta: 112000000000, cl: 26000000000, ncl: 37000000000, tl: 63000000000, eq: 49000000000, rev: 122000000000, gm: 36000000000, om: 24500000000, tax: 4900000000, net: 19600000000 },
        { yr: 2025, ca: 49000000000, nca: 96000000000, ta: 145000000000, cl: 32000000000, ncl: 48000000000, tl: 80000000000, eq: 65000000000, rev: 156000000000, gm: 47000000000, om: 32800000000, tax: 6560000000, net: 26240000000 }
      ],
      docs: { fap: true, pre: true, iclf: true }
    },
    {
      fapNumber: '005/AF/IX/2026',
      status: 'APPROVED',
      companyName: 'PT Agro Prima Indonesia',
      companyType: 'CORPORATE',
      nib: '1209260000056',
      npwp: '0567890123456000',
      establishmentActNo: 'AHU-0015523.AH.01.01.2017',
      establishmentDate: '2017-09-15',
      branchCode: 'MDN01',
      customerStatus: 'EXISTING',
      companyAddress: 'Jl. Brigjend Katamso No. 120, Kampung Baru',
      city: 'Medan',
      province: 'Sumatera Utara',
      postalCode: '20158',
      phoneFax: '061-4567890',
      email: 'corp@agroprimaindonesia.com',
      website: 'www.agroprimaindonesia.com',
      mainBusiness: 'Perkebunan Kelapa Sawit, Pabrik Kelapa Sawit (PKS) & Pengolahan CPO',
      experienceYears: 9,
      experienceMonths: 1,
      locationStatus: 'OWNED',
      repaymentSource: 'Penjualan CPO & Palm Kernel Kontrak Rutin ke Wilmar Group & Musim Mas',
      latestDeedNo: 'AHU-0041235.AH.01.02.2023',
      latestDeedDate: '2023-11-20',
      industrySegment: 'AGRICULTURE',
      businessRole: 'AGRO',
      assetHeLiu: 5, assetTruckLiu: 4, assetHeNon: 2, assetTruckNon: 4,
      pic: { name: 'Michael Tanoto, B.Bus.', pos: 'General Manager Finance', phone: '08116012345', email: 'michael.tanoto@agroprimaindonesia.com', addr: 'Jl. Iskandar Muda No. 55', city: 'Medan', prov: 'Sumatera Utara', zip: '20154' },
      stakeholders: [
        { name: 'Michael Tanoto', pos: 'Direktur Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '1271011809800002', amount: 10000000000, pct: 50.0, email: 'michael.tanoto@agroprimaindonesia.com', phone: '08116012345', cap: 10000000000, fn: 'Michael', ln: 'Tanoto', cit: 'INDONESIAN', ktp: true },
        { name: 'Hendra Tanoto', pos: 'Komisaris Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '1271030504840001', amount: 10000000000, pct: 50.0, email: 'hendra.tanoto@agroprimaindonesia.com', phone: '08126088992', cap: 10000000000, fn: 'Hendra', ln: 'Tanoto', cit: 'INDONESIAN', ktp: false }
      ],
      deeds: [
        { id: 'deed-est-005', type: 'establishment', deedNo: 'AHU-0015523.AH.01.01.2017', deedDate: '2017-09-15', notaryName: 'Baharuddin, S.H., M.Kn.', notaryLocation: 'Medan', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta pendirian perseroan terbatas PT Agro Prima Indonesia.</li><li>Modal dasar Rp 40 Miliar, disetor Rp 15 Miliar.</li></ol>' },
        { id: 'deed-amd-005', type: 'amendment', deedNo: 'AHU-0041235.AH.01.02.2023', deedDate: '2023-11-20', notaryName: 'Baharuddin, S.H., M.Kn.', notaryLocation: 'Medan', remarkCategoryIds: ['amendment-share-change'], remarks: '<ol><li>Penyesuaian porsi kepemilikan saham perseroan menjadi berimbang 50%-50%.</li><li>Peningkatan modal disetor perseroan menjadi Rp 20 Miliar.</li></ol>' }
      ],
      projects: [
        { owner: 'PT Astra Agro Lestari Tbk', loc: 'Labuhanbatu, Sumatera Utara', role: 'Main Contractor Pengangkutan TBS', status: 'EXISTING' },
        { owner: 'PTPN IV', loc: 'Simalungun, Sumatera Utara', role: 'Rental Alat Berat Wheel Loader', status: 'EXISTING' }
      ],
      banks: [
        { name: 'Bank Danamon', curr: 'IDR', facility: 7000000000, inst: 220000000, yr: 2020, rate: 9.25, record: 'Lancar (Kol-1)', status: 'ACTIVE' },
        { name: 'Bank Permata', curr: 'IDR', facility: 5000000000, inst: 160000000, yr: 2022, rate: 9.35, record: 'Lancar (Kol-1)', status: 'ACTIVE' }
      ],
      proposal: { purpose: 'INVESTMENT', method: 'FINANCIAL_LEASE', value: 4200000000, dp: 840000000, rate: 9.85, tenor: 24, pay: 'In Arrear' },
      units: [
        { brand: 'LiuGong', cat: 'HE', model: '835H Wheel Loader', qty: 4, price: 1050000000, total: 4200000000 }
      ],
      financials: [
        { yr: 2023, ca: 16000000000, nca: 26000000000, ta: 42000000000, cl: 11000000000, ncl: 13000000000, tl: 24000000000, eq: 18000000000, rev: 48000000000, gm: 14500000000, om: 9500000000, tax: 1900000000, net: 7600000000 },
        { yr: 2024, ca: 22000000000, nca: 33000000000, ta: 55000000000, cl: 13000000000, ncl: 16000000000, tl: 29000000000, eq: 26000000000, rev: 62000000000, gm: 19000000000, om: 12800000000, tax: 2560000000, net: 10240000000 },
        { yr: 2025, ca: 29000000000, nca: 42000000000, ta: 71000000000, cl: 16000000000, ncl: 19000000000, tl: 35000000000, eq: 36000000000, rev: 79000000000, gm: 25000000000, om: 17200000000, tax: 3440000000, net: 13760000000 }
      ],
      docs: { fap: true, pre: true, iclf: true }
    },
    {
      fapNumber: '006/AF/IX/2026',
      status: 'RETURNED',
      companyName: 'PT Konstruksi Mandiri Sejahtera',
      companyType: 'CORPORATE',
      nib: '1209260000067',
      npwp: '0678901234567000',
      establishmentActNo: 'AHU-0031892.AH.01.01.2020',
      establishmentDate: '2020-02-10',
      branchCode: 'JKT01',
      customerStatus: 'EXISTING',
      companyAddress: 'Komp. Ruko Fatmawati Mas Blok III/15, Cilandak',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12430',
      phoneFax: '021-7698822',
      email: 'kontak@konstruksimandiri.com',
      website: 'www.konstruksimandiri.com',
      mainBusiness: 'Pondasi Khusus, Bored Pile & Dinding Diafragma',
      experienceYears: 5,
      experienceMonths: 6,
      locationStatus: 'RENTED',
      repaymentSource: 'Termin Pembayaran Subkontraktor Proyek MRT & Gedung Swasta',
      latestDeedNo: 'AHU-0051289.AH.01.02.2024',
      latestDeedDate: '2024-05-18',
      industrySegment: 'CONSTRUCTION',
      businessRole: 'CONTRACTORS',
      assetHeLiu: 3, assetTruckLiu: 2, assetHeNon: 6, assetTruckNon: 4,
      pic: { name: 'Ir. Dedi Supriyadi', pos: 'Project Director', phone: '08118822334', email: 'dedi.supriyadi@konstruksimandiri.com', addr: 'Jl. Margasatwa No. 20, Ragunan', city: 'Jakarta Selatan', prov: 'DKI Jakarta', zip: '12550' },
      stakeholders: [
        { name: 'Ir. Dedi Supriyadi', pos: 'Direktur Utama', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '3174061805790003', amount: 7000000000, pct: 70.0, email: 'dedi.supriyadi@konstruksimandiri.com', phone: '08118822334', cap: 7000000000, fn: 'Dedi', ln: 'Supriyadi', cit: 'INDONESIAN', ktp: true },
        { name: 'Wahyu Hidayat', pos: 'Komisaris', type: 'INDIVIDUAL', nat: 'WNI', idType: 'KTP', idNum: '3174092103810002', amount: 3000000000, pct: 30.0, email: 'wahyu.hidayat@konstruksimandiri.com', phone: '08129933441', cap: 3000000000, fn: 'Wahyu', ln: 'Hidayat', cit: 'INDONESIAN', ktp: false }
      ],
      deeds: [
        { id: 'deed-est-006', type: 'establishment', deedNo: 'AHU-0031892.AH.01.01.2020', deedDate: '2020-02-10', notaryName: 'Kurniawan, S.H., M.Kn.', notaryLocation: 'Jakarta Selatan', remarkCategoryIds: ['establishment-deed'], remarks: '<ol><li>Akta pendirian perseroan terbatas PT Konstruksi Mandiri Sejahtera.</li><li>Modal dasar Rp 20 Miliar, disetor Rp 10 Miliar.</li></ol>' },
        { id: 'deed-amd-006', type: 'amendment', deedNo: 'AHU-0051289.AH.01.02.2024', deedDate: '2024-05-18', notaryName: 'Kurniawan, S.H., M.Kn.', notaryLocation: 'Jakarta Selatan', remarkCategoryIds: ['amendment-share-change'], remarks: '<ol><li>Perubahan susunan pemegang saham dan peningkatan modal disetor.</li><li>Catatan revisi: Harap lengkapi masa berlaku KTP dan rincian remarks permodalan.</li></ol>' }
      ],
      projects: [
        { owner: 'PT PP (Persero) Tbk', loc: 'Kuningan, Jakarta Selatan', role: 'Subkontraktor Pekerjaan Bored Pile', status: 'EXISTING' },
        { owner: 'PT Adhi Karya Tbk', loc: 'Cawang, Jakarta Timur', role: 'Pondasi Flyover LRT', status: 'EXISTING' }
      ],
      banks: [
        { name: 'Bank BRI', curr: 'IDR', facility: 12000000000, inst: 390000000, yr: 2021, rate: 9.65, record: 'Lancar (Kol-1)', status: 'ACTIVE' }
      ],
      proposal: { purpose: 'INVESTMENT', method: 'FINANCIAL_LEASE', value: 9600000000, dp: 1920000000, rate: 10.50, tenor: 36, pay: 'In Arrear' },
      units: [
        { brand: 'LiuGong', cat: 'HE', model: '936E Hydraulic Excavator', qty: 2, price: 4800000000, total: 9600000000 }
      ],
      financials: [
        { yr: 2023, ca: 12500000000, nca: 20000000000, ta: 32500000000, cl: 8000000000, ncl: 10500000000, tl: 18500000000, eq: 14000000000, rev: 38000000000, gm: 10500000000, om: 6800000000, tax: 1360000000, net: 5440000000 },
        { yr: 2024, ca: 16500000000, nca: 25500000000, ta: 42000000000, cl: 10000000000, ncl: 13000000000, tl: 23000000000, eq: 19000000000, rev: 49000000000, gm: 13800000000, om: 8900000000, tax: 1780000000, net: 7120000000 },
        { yr: 2025, ca: 21500000000, nca: 32500000000, ta: 54000000000, cl: 12500000000, ncl: 16500000000, tl: 29000000000, eq: 25000000000, rev: 61000000000, gm: 17500000000, om: 11400000000, tax: 2280000000, net: 9120000000 }
      ],
      docs: { fap: true, pre: false, iclf: false }
    }
  ];

  await transaction(async q => {
    for (const s of scenarios) {
      console.log(`Processing ${s.fapNumber} (${s.companyName})...`);

      // 1. Get Application
      const appRes = await q('SELECT a.id, a.customer_id FROM applications a WHERE a.fap_number = $1', [s.fapNumber]);
      if (!appRes.rows.length) {
        console.warn(`Application ${s.fapNumber} not found, skipping...`);
        continue;
      }
      const appId = appRes.rows[0].id;
      const custId = appRes.rows[0].customer_id;

      // 2. Update Customer details
      await q(`UPDATE customers SET 
        company_name = $1,
        company_type = $2,
        nib = $3,
        npwp = $4,
        establishment_act_no = $5,
        establishment_date = $6
        WHERE id = $7`, [s.companyName, s.companyType, s.nib, s.npwp, s.establishmentActNo, s.establishmentDate, custId]);

      // 3. Update Application details
      const legalJson = {
        deeds: s.deeds.map(d => ({
          ...d,
          stakeholders: s.stakeholders.map(sh => ({
            id: `sh-${sh.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: sh.name,
            firstName: sh.fn,
            lastName: sh.ln,
            position: sh.pos,
            idType: sh.idType,
            idNumber: sh.idNum,
            sharePercentage: sh.pct,
            depositedCapital: sh.amount,
            citizenship: sh.cit,
            ...(sh.ktp ? { ktpUrl: ktpB64, ktpFileName: `KTP_${sh.fn}_${sh.ln}.png`, ktpMime: 'image/png' } : {})
          }))
        }))
      };

      await q(`UPDATE applications SET 
        status = $1,
        branch_code = $2,
        customer_status = $3,
        company_address = $4,
        city = $5,
        province = $6,
        postal_code = $7,
        phone_fax = $8,
        email = $9,
        website = $10,
        main_business = $11,
        experience_years = $12,
        experience_months = $13,
        location_status = $14,
        repayment_source = $15,
        latest_deed_no = $16,
        latest_deed_date = $17,
        industry_segment = $18,
        business_role = $19,
        legal = $20,
        asset_summary_he_liugong = $21,
        asset_summary_truck_liugong = $22,
        asset_summary_he_non_liugong = $23,
        asset_summary_truck_non_liugong = $24
        WHERE id = $25`, 
        [s.status, s.branchCode, s.customerStatus, s.companyAddress, s.city, s.province, s.postalCode, s.phoneFax, s.email, s.website, s.mainBusiness, s.experienceYears, s.experienceMonths, s.locationStatus, s.repaymentSource, s.latestDeedNo, s.latestDeedDate, s.industrySegment, s.businessRole, JSON.stringify(legalJson), s.assetHeLiu, s.assetTruckLiu, s.assetHeNon, s.assetTruckNon, appId]);

      // 4. Update PIC
      await q(`DELETE FROM application_pics WHERE application_id = $1`, [appId]);
      await q(`INSERT INTO application_pics(application_id, pic_name, position, phone, email, current_address, city, province, postal_code)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`, 
        [appId, s.pic.name, s.pic.pos, s.pic.phone, s.pic.email, s.pic.addr, s.pic.city, s.pic.prov, s.pic.zip]);

      // 5. Update Stakeholders in Table
      await q(`DELETE FROM stakeholders WHERE application_id = $1`, [appId]);
      for (const sh of s.stakeholders) {
        await q(`INSERT INTO stakeholders(application_id, name, position, stakeholder_type, nationality_type, id_type, id_number, share_amount, share_percentage, email, mobile_phone, primary_capital, first_name, last_name, citizenship)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [appId, sh.name, sh.pos, sh.type, sh.nat, sh.idType, sh.idNum, sh.amount, sh.pct, sh.email, sh.phone, sh.cap, sh.fn, sh.ln, sh.cit]);
      }

      // 6. Update Project Contracts
      await q(`DELETE FROM project_contracts WHERE application_id = $1`, [appId]);
      for (const p of s.projects) {
        await q(`INSERT INTO project_contracts(application_id, project_owner, project_location, project_role, contract_status)
          VALUES($1, $2, $3, $4, $5)`, [appId, p.owner, p.loc, p.role, p.status]);
      }

      // 7. Update Bank References
      await q(`DELETE FROM bank_references WHERE application_id = $1`, [appId]);
      for (const b of s.banks) {
        await q(`INSERT INTO bank_references(application_id, bank_or_fin_institution, currency, credit_facility, monthly_installment, year_started, interest_rate, payment_record, facility_status)
          VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [appId, b.name, b.curr, b.facility, b.inst, b.yr, b.rate, b.record, b.status]);
      }

      // 8. Update Financing Proposal
      await q(`DELETE FROM financing_proposals WHERE application_id = $1`, [appId]);
      const propId = crypto.randomUUID();
      await q(`INSERT INTO financing_proposals(id, application_id, facility_purpose, financing_method, currency, financing_value, down_payment_value, interest_rate, tenor_months, payment_method, application_source)
        VALUES($1, $2, $3, $4, 'IDR', $5, $6, $7, $8, $9, 'Direct')`,
        [propId, appId, s.proposal.purpose, s.proposal.method, s.proposal.value, s.proposal.dp, s.proposal.rate, s.proposal.tenor, s.proposal.pay]);

      await q(`DELETE FROM financing_unit_items WHERE proposal_id = $1`, [propId]);
      for (const u of s.units) {
        await q(`INSERT INTO financing_unit_items(proposal_id, unit_category, brand, model_name, quantity, unit_price, total_price)
          VALUES($1, $2, $3, $4, $5, $6, $7)`,
          [propId, u.cat, u.brand, u.model, u.qty, u.price, u.total]);
      }

      // 9. Update Financial Statements
      await q(`DELETE FROM financial_statements WHERE application_id = $1`, [appId]);
      for (const fsItem of s.financials) {
        await q(`INSERT INTO financial_statements(application_id, fiscal_year, is_audited, current_assets, non_current_assets, total_assets, current_liabilities, non_current_liabilities, total_liabilities, equity, total_liab_and_equity, revenue, gross_margin, operating_margin, tax, net_income)
          VALUES($1, $2, true, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [appId, fsItem.yr, fsItem.ca, fsItem.nca, fsItem.ta, fsItem.cl, fsItem.ncl, fsItem.tl, fsItem.eq, fsItem.ta, fsItem.rev, fsItem.gm, fsItem.om, fsItem.tax, fsItem.net]);
      }

      // 10. Ensure the 3 Official Evidence Checklists Exist: FAP, PREANALYSIS, ICLF
      const requiredDocs = [
        { code: 'FAP', name: 'FAP (Financing Application Form)', role: 'MKT', hasFile: s.docs.fap, bytes: fapBytes, ext: 'pdf', title: `FAP-${s.fapNumber.replace(/\//g, '-')}-Signed.pdf` },
        { code: 'PREANALYSIS', name: 'Pre-analysis Document', role: 'CA', hasFile: s.docs.pre, bytes: preBytes, ext: 'pdf', title: `Preanalysis-${s.fapNumber.replace(/\//g, '-')}.pdf` },
        { code: 'ICLF', name: 'ICLF (Credit Committee Review)', role: 'CA', hasFile: s.docs.iclf, bytes: iclfBytes, ext: 'pdf', title: `ICLF-Committee-${s.fapNumber.replace(/\//g, '-')}.pdf` }
      ];

      for (const d of requiredDocs) {
        let chkRes = await q('SELECT id FROM document_checklists WHERE application_id = $1 AND document_code = $2', [appId, d.code]);
        let chkId: string;
        if (!chkRes.rows.length) {
          chkId = crypto.randomUUID();
          await q(`INSERT INTO document_checklists(id, application_id, document_code, document_name, is_mandatory, assigned_role, status)
            VALUES($1, $2, $3, $4, true, $5, $6)`, 
            [chkId, appId, d.code, d.name, d.role, d.hasFile ? 'UPLOADED' : 'PENDING']);
        } else {
          chkId = chkRes.rows[0].id;
          await q(`UPDATE document_checklists SET status = $1 WHERE id = $2`, [d.hasFile ? 'UPLOADED' : 'PENDING', chkId]);
        }

        if (d.hasFile) {
          const fileKey = crypto.randomUUID();
          fs.writeFileSync(path.join(filesDir, fileKey), d.bytes);
          await q('DELETE FROM document_files WHERE checklist_id = $1', [chkId]);
          await q(`INSERT INTO document_files(checklist_id, file_name, file_key, file_size, mime_type, uploaded_by)
            VALUES($1, $2, $3, $4, 'application/pdf', 'Verifikator LFI')`,
            [chkId, d.title, fileKey, d.bytes.length]);
        }
      }
    }
  });

  console.log('Successfully seeded rich scenario dummy data into ALL 6 applications in PostgreSQL/PGlite!');
}

seedScenarios().catch(err => {
  console.error('Failed to seed scenarios:', err);
  process.exit(1);
});
