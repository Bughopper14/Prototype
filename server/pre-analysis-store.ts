import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './mysql-store';

const storeDir = path.resolve('database/pre_analysis');

export const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function getRomanMonthFromDate(dateInput?: string | Date): string {
  if (!dateInput) return 'IX';
  if (typeof dateInput === 'string') {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const lower = dateInput.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) return romanMonths[i];
    }
  }
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) return romanMonths[d.getUTCMonth()] || 'IX';
  return 'IX';
}

export function generatePreAnalysisNo(existingNumbers: string[], dateInput?: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : (dateInput ? new Date(dateInput) : new Date());
  const year = !isNaN(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear();
  const romanMonth = getRomanMonthFromDate(dateInput || d);
  let largest = 0;
  for (const raw of existingNumbers) {
    if (!raw) continue;
    const match = /^(\d+)\/PREANA\/MKT\/(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(\d{4})$/i.exec(String(raw).trim());
    if (match && Number(match[2]) === year) {
      largest = Math.max(largest, Number(match[1]));
    }
  }
  const nextSeq = largest + 1;
  return `${String(nextSeq).padStart(3, '0')}/PREANA/MKT/${romanMonth}/${year}`;
}

export async function getAllPreAnalysisNumbers(): Promise<string[]> {
  await ensureDir();
  const numbers: string[] = [];

  if (pool) {
    try {
      const [rows] = await pool.query<any[]>('SELECT form_data FROM application_pre_analysis');
      if (rows && rows.length > 0) {
        for (const row of rows) {
          try {
            const parsed = typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
            if (parsed && parsed.preAnalysisNo) numbers.push(parsed.preAnalysisNo);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to query numbers from MySQL:', e);
    }
  }

  try {
    const files = await fs.readdir(storeDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const raw = await fs.readFile(path.join(storeDir, file), 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.preAnalysisNo) numbers.push(parsed.preAnalysisNo);
        } catch {}
      }
    }
  } catch {}

  return numbers;
}


export const DEFAULT_COMPETITION_TABLE = [
  { finco: 'Komatsu Astra Finance (KAF)', rate: '9% - 11,5%', purpose: 'HE' },
  { finco: 'Astra Credit Companies (ACC)', rate: '10% - 12%', purpose: 'HE & Vehicles' },
  { finco: 'SAN Finance (SANF)', rate: '10,5% - 11,66%', purpose: 'HE & Vehicles' },
  { finco: 'Mahada Finance', rate: '10,50%', purpose: 'Truck' },
  { finco: 'Adira Finance', rate: '10,54%', purpose: 'HE & Vehicles' },
  { finco: 'Bank Mandiri', rate: '7,5% - 9,5%', purpose: 'HE & Vehicles' },
  { finco: 'BFI Finance', rate: '10,50%', purpose: 'HE' },
  { finco: 'BNI Multifinance', rate: '7,51%', purpose: 'HE' },
  { finco: 'Buana Finance', rate: '14,00%', purpose: 'HE' },
  { finco: 'Clipan Finance', rate: '12,49%', purpose: 'Truck' },
  { finco: 'Dipo Star Finance', rate: '9,66% - 13,76%', purpose: 'Truck' },
  { finco: 'IMFI', rate: '10,00%', purpose: 'HE' },
  { finco: 'SMFL', rate: '10,5% - 11,25%', purpose: 'HE' }
];

export interface GroupShareholder {
  name: string;
  percentage: string;
  role?: string;
}

export interface GroupEntity {
  name: string;
  authorizedCapital: string;
  paidUpCapital: string;
  shareholders: GroupShareholder[];
  management?: string;
}

export interface GroupStructureData {
  holding: GroupEntity;
  subsidiaries: GroupEntity[];
}

export const DEFAULT_GROUP_STRUCTURE: GroupStructureData = {
  holding: {
    name: 'PT STAR (PT Santosa Abadi Raja)',
    authorizedCapital: 'Rp 240 Miliar',
    paidUpCapital: 'Rp 60 Miliar',
    shareholders: [
      { name: 'Hansen Santosa', percentage: '54%', role: 'Presiden Direktur' },
      { name: 'Leonard Santosa', percentage: '34%', role: 'Direktur' },
      { name: 'Oky Santosa', percentage: '12%', role: 'Komisaris' }
    ],
    management: 'Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa'
  },
  subsidiaries: [
    {
      name: 'PT PASS (PT Pangan Sejahtera Sentosa)',
      authorizedCapital: 'Rp 40 Miliar',
      paidUpCapital: 'Rp 10 Miliar',
      shareholders: [
        { name: 'PT STAR', percentage: '99%', role: 'Holding' },
        { name: 'Leonard Santosa', percentage: '1%', role: 'Direktur' }
      ],
      management: 'Komisaris: Hansen Santosa'
    },
    {
      name: 'PT HPS (PT Handalan Putra Sentosa)',
      authorizedCapital: 'Rp 160 Miliar',
      paidUpCapital: 'Rp 40 Miliar',
      shareholders: [
        { name: 'PT STAR', percentage: '99%', role: 'Holding' },
        { name: 'Hansen Santosa', percentage: '1%', role: 'Presdir' }
      ],
      management: 'Direktur: Leonard Santosa'
    },
    {
      name: 'PT HTPS (PT Harta Putramas Sentosa)',
      authorizedCapital: 'Rp 80 Miliar',
      paidUpCapital: 'Rp 20 Miliar',
      shareholders: [
        { name: 'PT STAR', percentage: '99%', role: 'Holding' },
        { name: 'Hansen Santosa', percentage: '1%', role: 'Presdir' }
      ],
      management: 'Direktur: Leonard Santosa'
    }
  ]
};

export function createBlankPreAnalysisData(appId: string, appRecord?: any, preAnalysisNo?: string): any {
  const companyName = appRecord?.customer?.companyName || appRecord?.companyName || '';
  const npwp = appRecord?.customer?.npwp || appRecord?.npwp || '';
  const fapNumber = appRecord?.fapNumber || appRecord?.fap_number || '';
  
  const pic = appRecord?.pic;
  const picName = pic?.picName 
    ? `${pic.picName}${pic.position ? ` (${pic.position})` : ''}` 
    : '';

  const city = appRecord?.city || appRecord?.customer?.city || '';
  const province = appRecord?.province || appRecord?.customer?.province || '';
  const customerArea = city ? `${city}${province ? `, ${province}` : ''}` : (province || '');

  const sourceOfRepayment = appRecord?.repaymentSource || '';
  const leadSource = appRecord?.leadSource || '';
  const dealerPic = appRecord?.dealerPic || '';
  const lmiPic = appRecord?.lmiPic || '';
  const lfiPic = appRecord?.lfiPic || '';

  // Extract capital from deed stakeholders if present
  let paidUpCapital = '';
  let equity = '';
  const deeds = appRecord?.legal?.deeds;
  if (deeds && Array.isArray(deeds)) {
    let totalDeposited = 0;
    deeds.forEach((d: any) => {
      (d.stakeholders || []).forEach((s: any) => {
        const val = Number(s.depositedCapital || s.primaryCapital || 0);
        if (!isNaN(val)) totalDeposited += val;
      });
    });
    if (totalDeposited > 0) {
      paidUpCapital = `IDR ${totalDeposited.toLocaleString('id-ID')}`;
      equity = paidUpCapital;
    }
  }

  const today = new Date();
  const dStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  return {
    preAnalysisNo: preAnalysisNo || '',
    preAnalysisDate: dStr,
    customerProjectName: companyName,
    taxId: npwp,
    fapNumber,
    leadSource,
    customerArea,
    dealerPic,
    lmiPic,
    lfiPic,
    customerPic: picName,
    equity,
    paidUpCapital,
    sourceOfRepayment,

    // Discrete Project & Background fields
    holdingGroup: '',
    projectName: '',
    projectLocation: '',
    existingProjects: '',
    newProjects: '',
    projectNameLocation: '',
    customerRole: '',
    otherContractors: '',
    projectOwner: '',
    bowheerInfo: '',
    projectStatus: '',
    investmentPlan: '',
    financingSchemeRequested: '',

    ubo: '',
    uboInfo: '',
    uboInformation: '',
    groupStructure: {
      holding: {
        name: '',
        authorizedCapital: '',
        paidUpCapital: '',
        shareholders: [{ name: '', percentage: '', role: '' }],
        management: ''
      },
      subsidiaries: []
    },
    companyBackground: '',
    starGroupMilestonesNarrative: '',
    businessDevBackground: '',
    operationalTeamInfo: '',
    milestones: [],
    existingFincoBackup: '',

    equipmentJobFit: '',
    utilizationDuration: '',
    priorLiugongExperience: '',
    serviceAgreementFmc: '',
    unitComposition: [],

    deliveryStatus: '',
    deliveryDate: '',
    qaIlinkComment: '',
    qaConclusion: '',

    dealerCheck: '',
    topDealerToCustomer: '',
    topLmiToDealer: '',
    lmiArCheck: '',
    slikPefindoHighlight: '',
    applicantPefindoCheck: '',
    pefindoTerms: '',
    pefindoNotes: '',
    lenderExposures: [],

    goodProject: false,
    goodProjectNote: '',
    goodCustomer: false,
    goodCustomerNote: '',
    recommendation: '',
    briefNote: '',
    suggestions: [],
    competitionNotes: '',
    competitionTable: [],
    proposedBy: '',
    reviewedBy: '',
    approvedBy: ''
  };
}

export const DEFAULT_PRE_ANALYSIS_DATA = {
  preAnalysisNo: '001/PREANA/MKT/IX/2026',
  preAnalysisDate: '07-Sep-2026',
  customerProjectName: 'PT Handalan Putramas Santosa (HPS)',
  taxId: '27.817.616.9-041.000',
  fapNumber: '070/AF/VIII/2026',
  leadSource: 'LMI',
  customerArea: 'Sumatera Area / Riau / Jakarta',
  dealerPic: 'Direct to LMI',
  lmiPic: 'Deny Ardhian',
  lfiPic: 'Amanda Cynthia',
  customerPic: 'Mr. Abraham (Business Director)',
  equity: 'IDR 130.000.000.000 (as of Last deed no 8, 8 June 2026)',
  paidUpCapital: 'IDR 32.500.000.000',
  sourceOfRepayment: 'Income / Others',

  holdingGroup: 'STAR GROUP (PT Sentosa Abadi Raja)',
  projectName: 'Land Clearing, Wood Hauling & Forestry Harvesting Operations',
  projectLocation: 'Head Office: Jakarta | Sites: Sumatera Area (Riau, Pelalawan, South Sumatra) & Kalimantan Timur',
  existingProjects: 'A. PT Handalan Putramas Santosa (HPS) - Existing Project:\n1. PT Bumi Andalas Permai (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging (Start Nov 2025)\n2. PT Bumi Mekar Hijau (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging (Start Nov 2025)\n3. PT Sebangun Bumi Andalas Wood Industries (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging (Start Nov 2025)\n4. PT Riau Andalan Pulp & Paper (RAPP) - Wood Hauling & Logging Project (Start Dec 2024)\n\nB. PT Pangan Sejahtera Santosa (PASS) - Existing Project:\n1. PT Sinar Sosro - FMCG Distributor (Start 2022)\n2. PT FKS Pangan Nusantara (Start 2022)\n3. PT Perfetti Van Melle (Start 2022)\n4. PT Mondelez Indonesia Trading (Start 2022)',
  newProjects: 'C. PT Harta Putramas Santosa (HTPS) - NEW Project:\n1. PT Industrial Forest Plantation - Harvesting Project (Est. Sept/Oct 2026, Kalimantan Timur)\n2. PT SBA Wood Industries - Land Clearing (Est. Oct 2026, Lebong Hitam)\n3. RAPP - Mayawana (For next year)',
  projectNameLocation: 'STAR GROUP (PT Sentosa Abadi Raja) - Land Clearing, Wood Hauling & Harvesting | Sumatera & Kalimantan',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\n2. Oki Pulp & Paper (APP / Sinarmas)',
  bowheerInfo: 'PT Riau Andalan Pulp and Paper (RAPP) - APRIL Group (RGE Group). One of the largest pulp and paper producers in the world located in Pangkalan Kerinci, Riau. Mill capacity 2.8M tons pulp and 1.15M tons paper/yr. Upstream fiber plantation management planting 200M saplings/yr.',
  projectStatus: 'On Going with RAPP since 2025 for logistics and harvesting support',
  investmentPlan: '20-30 units nearest plan: 20 units LIUGONG Excavator for RAPP & 30 units for Sinarmas',
  financingSchemeRequested: '36-month lease, 15-20% Security Deposit, Normal Installment structure',

    ubo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  uboInfo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  companyBackground: 'PT Handalan Putramas Santosa (HPS) is family company belongs to Mr. Hansen Santosa & family, under holding named PT Santosa Abadi Raja (STAR).',
  starGroupMilestonesNarrative: `2022 | PT PASS Established – FMCG Distribution Business
- PT Pangan Sejahtera Santosa (PT PASS) was established by Mr. Hansen Santosa, son of Mr. Oky Santosa, marking the beginning of the STAR Group's business operations.
- PT PASS focuses on urban FMCG distribution, operating warehouses and providing next-day delivery services while generating revenue from distribution margins.
- In 2022, PT PASS supported the distribution activities of several major FMCG companies, including PT Sinar Sosro, PT FKS Pangan Nusantara, PT Perfetti Van Melle, and PT Mondelez Indonesia Trading.

Q1 2024 | PT STAR Established as Holding Company
- PT Sentosa Abadi Raja (STAR) was established by Mr. Hansen Santosa as a holding company to consolidate and manage the businesses of Mr. Hansen.

November 2024 | PT HPS Established – Entry into Forestry Logistics and Hauling
- PT HPS was established as the vehicle for STAR Group's entry into forestry, following Mr. Herry Tho's former experience. The initial business focus was forestry logistics and wood hauling.
- PT HPS secured a five-year contract with RAPP, with operations commencing in December 2024.

Late 2025 | Expansion into Land Clearing and Harvesting
- After approximately one year of forestry operations, Mr. Herry Tho proposed further expansion into land clearing and harvesting.
- In November 2025, PT HPS commenced land clearing, maintenance, and logging projects with three APP Group/Sinar Mas companies:
  1. PT Bumi Andalas Permai
  2. PT Bumi Mekar Hijau
  3. PT Sebangun Bumi Andalas Wood Industries

End-2025 | PT HTPS Established – Harvesting Business
- PT HTPS was established by Mr. Hansen Santosa to focus specifically on harvesting projects.
- The establishment of a separate entity was intended to differentiate and streamline the diversification of each business/project within the STAR Group and to focusing on land clearing & harvesting contractor.`,
  businessDevBackground: `While seeking a partner to develop wingbox trucking services to support his FMCG distribution business, Mr. Hansen Santosa met Mr. Herry Tho.
- Mr. Herry Tho is based from Pekanbaru and has a background in logistics and hauling, with business connections within the forestry sector, including contacts at RAPP and APP/Sinar Mas. Through this relationship, he introduced Mr. Hansen to investment opportunities in forestry logistics and wood hauling.
- Mr. Herry previously worked at DNR Logistics (Dos Ni Roha). According to the information provided, the business he was involved in reportedly failed. His experience during that period appears to have been primarily in logistics and hauling, with no established harvesting track record.`,
  operationalTeamInfo: `Mr. Herry Tho is expected to lead the harvesting project. The planned operational team will include personnel formerly employed by RAPP, Sarindo, and CIS who have experience in forestry operations.`,
  uboInformation: `STAR GROUP Corporate Shareholding & Governance Structure:
• PT Sentosa Abadi Raja (STAR Holding): Modal Dasar Rp 240 M, Modal Disetor Rp 60 M
  - Hansen Santosa (54% - Presiden Direktur)
  - Leonard Santosa (34% - Direktur)
  - Oky Santosa (12% - Komisaris)
• PT Pangan Sejahtera Santosa (PASS - FMCG): Modal Dasar Rp 50 M, Modal Disetor Rp 17,5 M
  - PT STAR (99,994%), Leonard Santosa (0,006%)
• PT Handalan Putramas Santosa (HPS - Sister Co): Modal Dasar Rp 130 M, Modal Disetor Rp 32,5 M
  - PT STAR (99,997%), Leonard Santosa (0,003%)
• PT Harta Putramas Santosa (HTPS - Applicant): Modal Dasar Rp 500 Juta, Modal Disetor Rp 500 Juta
  - PT STAR (99,98%), Leonard Santosa (0,02%)`,
  groupStructure: DEFAULT_GROUP_STRUCTURE,

  milestones: [
    { year: '2022', entity: 'PT PASS', description: 'Established for FMCG transport (Sinar Sosro, FKS, Perfetti)' },
    { year: 'Q1 2024', entity: 'PT HPS', description: 'Formed to expand heavy logistics for RAPP & APP Sinarmas' },
    { year: 'Nov-24', entity: 'PT PASS', description: 'Secured long-term contracts with Mayora & Mondelez' },
    { year: 'End-2025', entity: 'PT HPS', description: 'Operation full capacity with 70+ transport units' },
    { year: 'Mid-2026', entity: 'PT HTPS', description: 'Established for direct wood harvesting concession with RAPP' }
  ],
  existingFincoBackup: 'ACC, SANF, MTF, RADANA, SMFL, BCA, Bank Saqu, Bank Nano Syariah, Mitsui',

  equipmentJobFit: 'Suitable - for harvesting in Sumatera Area (Heavy forestry spec)',
  utilizationDuration: 'Reasonable — 3 years contract duration matching requested financing term',
  priorLiugongExperience: 'Never invest LiuGong prior to this proposal (First-time user)',
  serviceAgreementFmc: 'Standard warranty from LMI, on-site mechanic standby at Riau depot',
  unitComposition: [
    { brand: 'Truk ISUZU GIGA FVM U', type: 'Transport / Heavy Truck', qty: 45 },
    { brand: 'Truk FAW', type: 'Dump Truck 6x4', qty: 41 },
    { brand: 'Truk Shacman', type: 'Heavy Duty 8x4', qty: 25 },
    { brand: 'Truk ISUZU CDE L', type: 'Light Truck', qty: 10 },
    { brand: 'Vehicle Commercial Dmax', type: 'Operational Support 4x4', qty: 3 },
    { brand: 'Vehicle Commercial Calya / Innova', type: 'Management Support', qty: 2 }
  ],

  deliveryStatus: 'Not Yet Delivered (Pending PO & Credit Committee Approval)',
  deliveryDate: 'Demand units Sept 2026, delivery est W3 after PO release',
  qaIlinkComment: 'No Records / Pre-Delivery Inspection Pending',
  qaConclusion: 'Standard PDI required upon delivery and iLink telemetry activation',

  dealerCheck: 'No Records Payment - New Liugong Customer',
  topDealerToCustomer: '20% DP, 80% cover by Leasing',
  topLmiToDealer: '-',
  lmiArCheck: 'No Records Payment - New Liugong Customer',
  slikPefindoHighlight: 'No Records Payment - New Established Company',
  applicantPefindoCheck: "2. PT HARTA PUTRA SANTOSA (REQUEST USING THIS COMPANY) - NO RECORD SINCE IT'S NEWLY ESTABLISHED",
  pefindoTerms: 'Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract',
  pefindoNotes: 'Based on Pefindo Checking on 4 Sept 2026',
  lenderExposures: [
    { lender: 'ACC', plafond: 'IDR 11.730.000.000', rate: '6.24%', notes: 'Active facilities, smooth payment record' },
    { lender: 'BCA', plafond: 'IDR 13.530.000.000', rate: '9.50%', notes: 'Working capital & vehicle financing' },
    { lender: 'Bank Nano Syariah', plafond: 'IDR 6.160.000.000', rate: '-', notes: 'Murabahah facility' },
    { lender: 'Bank Saqu', plafond: 'IDR 2.730.000.000', rate: '10.41%', notes: 'Short term revolving' },
    { lender: 'MTF', plafond: 'IDR 14.990.000.000', rate: '9.50%', notes: 'Fleet truck lease' },
    { lender: 'Mitsui', plafond: 'IDR 392.800.000', rate: '10.63%', notes: 'Support fleet' },
    { lender: 'Radana', plafond: 'IDR 3.270.000.000', rate: '7.20%', notes: 'Heavy transport equipment' },
    { lender: 'SMFL', plafond: 'IDR 4.300.000.000', rate: '12.49%', notes: 'Equipment lease' },
    { lender: 'SANF', plafond: 'IDR 23.530.000.000', rate: '11.25%', notes: 'Logistics fleet facility' }
  ],

  goodProject: true,
  goodProjectNote: 'Harvesting Contractor, PT RAPP - APRIL Group',
  goodCustomer: false,
  goodCustomerNote: 'PT HPS was newly established in 2024. All leasing contracts remain open. Group entity PT HTPS is newly established with zero track record across banks and fincos. Diversification into harvesting lacks operational experience.',
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
  briefNote: 'Key risks identified: Customer newly established (2024) with lack of harvesting experience; sister company PT PASS focuses only on FMCG transport; no closed contracts yet in Pefindo.',
  suggestions: [
    'Corporate Guarantee from PT PASS (Star Group parent holding with proven revenue).',
    'Personal Guarantee from Mr. Hansen Santosa (ultimate beneficial owner) with asset pledge.',
    'Escrow Account mechanism with Bowheer (RAPP) or direct payment split agreement.',
    'Pre-Delivery inspection and strict iLink GPS tracking with remote immobilizer protocol.'
  ],
  competitionTable: DEFAULT_COMPETITION_TABLE,
  competitionNotes: 'Pefindo check 4 Sept 2026. Rate benchmark: Flat 7% p.a., 20% Security Deposit, 36-month lease tenor, 1% provision fee, IDR 5.000.000 admin fee per contract.',
  proposedBy: 'Amanda Cynthia (Senior Account Manager)',
  reviewedBy: 'Maria Regina (Dept. Head)',
  approvedBy: 'Jembar Ganda E (Director)'
};

async function ensureDir() {
  await fs.mkdir(storeDir, { recursive: true }).catch(() => {});
}

export async function initPreAnalysisStore() {
  await ensureDir();
  if (pool) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS application_pre_analysis (
          application_id VARCHAR(50) PRIMARY KEY,
          form_data LONGTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e) {
      console.warn('MySQL pre_analysis table creation skipped:', e);
    }
  }
}

export async function getPreAnalysisData(appId: string, appRecord?: any): Promise<any> {
  await ensureDir();
  let storedData: any = null;

  if (pool) {
    try {
      const [rows] = await pool.query<any[]>(
        'SELECT form_data FROM pre_analysis_records WHERE application_id = ?',
        [appId]
      );
      if (rows && rows.length > 0 && rows[0].form_data) {
        storedData = typeof rows[0].form_data === 'string'
          ? JSON.parse(rows[0].form_data)
          : rows[0].form_data;
      }
    } catch {}
  }

  if (!storedData) {
    const filePath = path.join(storeDir, `${appId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      storedData = JSON.parse(raw);
    } catch {}
  }

  // Check if existing stored data is old dummy fallback data (e.g. PT Handalan Putramas Santosa when real app is different)
  const isOldDummy = storedData && storedData.customerProjectName === 'PT Handalan Putramas Santosa (HPS)' &&
    appRecord && appRecord.companyName && appRecord.companyName !== 'PT Handalan Putramas Santosa (HPS)';

  if (!storedData || isOldDummy) {
    const existingNumbers = await getAllPreAnalysisNumbers();
    const nextNo = generatePreAnalysisNo(existingNumbers, new Date());
    
    if (appRecord) {
      const initialData = createBlankPreAnalysisData(appId, appRecord, nextNo);
      await savePreAnalysisData(appId, initialData);
      return initialData;
    }

    return {
      ...DEFAULT_PRE_ANALYSIS_DATA,
      preAnalysisNo: nextNo
    };
  }

  // If storedData exists and appRecord is provided, ensure any missing key FAP info is kept up-to-date
  if (appRecord) {
    let updated = false;
    const companyName = appRecord.customer?.companyName || appRecord.companyName;
    if (companyName && !storedData.customerProjectName) {
      storedData.customerProjectName = companyName;
      updated = true;
    }
    const npwp = appRecord.customer?.npwp || appRecord.npwp;
    if (npwp && !storedData.taxId) {
      storedData.taxId = npwp;
      updated = true;
    }
    if (appRecord.fapNumber && !storedData.fapNumber) {
      storedData.fapNumber = appRecord.fapNumber;
      updated = true;
    }
    if (updated) {
      await savePreAnalysisData(appId, storedData);
    }
  }

  return storedData;
}

export async function savePreAnalysisData(appId: string, data: any): Promise<any> {
  await ensureDir();
  const jsonStr = JSON.stringify(data, null, 2);

  const filePath = path.join(storeDir, `${appId}.json`);
  await fs.writeFile(filePath, jsonStr, 'utf-8').catch(err => {
    console.warn('Failed to save pre_analysis file:', err);
  });

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO application_pre_analysis (application_id, form_data)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE form_data = VALUES(form_data), updated_at = CURRENT_TIMESTAMP`,
        [appId, jsonStr]
      );
    } catch (e) {
      console.warn('Failed to upsert application_pre_analysis to MySQL:', e);
    }
  }

  return data;
}
