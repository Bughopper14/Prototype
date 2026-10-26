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

export function createBlankPreAnalysisData(appId: string, appRecord?: any, preAnalysisNo?: string): any {
  const companyName = appRecord?.customer?.companyName || appRecord?.companyName || '';
  const npwp = appRecord?.customer?.npwp || appRecord?.npwp || '';
  const fapNumber = appRecord?.fapNumber || '';
  
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

    // Non-FAP fields are blank as requested by user
    projectNameLocation: '',
    customerRole: '',
    otherContractors: '',
    projectOwner: '',
    bowheerInfo: '',
    projectStatus: '',
    investmentPlan: '',
    financingSchemeRequested: '',

    uboInfo: '',
    companyBackground: '',
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
    suggestionOverview: '',
    suggestions: [],
    mitigationConditions: [],
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

  projectNameLocation: 'STAR GROUP Project Portfolio:\nA. PT Handalan Putramas Santosa (HPS) - RAPP, SBA Wood, BMH (Start Dec 2024 - ongoing)\nB. PT Pelayaran Andalan Santosa (PAS) - Transport (Ongoing)\nC. PT Harta Putramas Santosa (HTPS) - Harvesting (Start Oct 2026)',
  customerRole: 'Main Contractor / Sub-Contractor',
  otherContractors: 'KAP, BAP, HJM, RPP, WBS, etc.',
  projectOwner: 'PT Riau Andalan Pulp & Paper (APRIL Group)',
  bowheerInfo: 'RAPP Pelalawan Concession, Riau Province. Long-term concession license valid through 2045.',
  projectStatus: 'Active harvesting & hauling contract for wood fiber supplying Pangkalan Kerinci mill.',
  investmentPlan: 'Procurement of 10 Units Heavy Equipment for capacity ramp-up Q4 2026.',
  financingSchemeRequested: 'Leasing with balloon payment or normal installment 36 months tenor, 20% down payment.',

  uboInfo: 'Mr. Hansen Santosa (80% shares via holding PT PASS), Mr. Hendry Santosa (20% shares). Ultimate Beneficial Owner is Mr. Hansen Santosa.',
  companyBackground: 'HPS established in 2024 as dedicated forestry contractor unit under Star Group. Star Group itself has operated logistics & maritime transport since 2012 across Sumatera and Java.',
  milestones: [
    { year: '2012', entity: 'PT Pelayaran Andalan Santosa (PAS)', description: 'Established transport & barging company with 8 tug & barges.' },
    { year: '2018', entity: 'Star Logistics Holding', description: 'Consolidation of FMCG distribution fleet across Riau and Jambi.' },
    { year: '2024', entity: 'PT Handalan Putramas Santosa (HPS)', description: 'Established forestry contractor division and entered RAPP supplier network.' },
    { year: '2026', entity: 'PT Harta Putramas Santosa (HTPS)', description: 'Formed new legal entity for harvesting operation expansion.' }
  ],
  existingFincoBackup: 'SAN Finance, Astra Credit Companies (ACC), Dipo Star Finance, Komatsu Astra Finance (KAF).',

  equipmentJobFit: 'Forestry Excavators (922E/920E forestry package) with log grapple & high-ground clearance track shoes.',
  utilizationDuration: 'Planned 18-20 hours/day across 2 shifts in concession blocks.',
  priorLiugongExperience: 'Customer has operated 4 units LiuGong 922E with zero major powertrain breakdown over 3,500 hours.',
  serviceAgreementFmc: 'Full Maintenance Contract (FMC) backed by PT LiuGong Machinery Indonesia & authorized regional dealer.',
  unitComposition: [
    { kategoriAset: 'Forestry Excavator', brand: 'LiuGong', type: '922E Forestry Spec', qty: 6 },
    { kategoriAset: 'Wheel Loader', brand: 'LiuGong', type: '856H Log Handler', qty: 2 },
    { kategoriAset: 'Motor Grader', brand: 'LiuGong', type: '4180D Concession Road', qty: 2 }
  ],

  deliveryStatus: 'Not yet Deliver',
  deliveryDate: 'Waiting DP and Contract Signing',
  qaIlinkComment: 'GPS iLink unit ready for installation upon delivery to RAPP concession.',
  qaConclusion: 'Passed preliminary unit check.',

  topDealerToCustomer: '30 days after unit commissioning on site',
  topLmiToDealer: '45 days invoice settlement backed by LFI commitment letter',
  lmiArCheck: 'Clear record, no overdue or write-off history with LMI or dealers.',
  slikPefindoHighlight: 'SLIK Kol 1 Smooth across all commercial lenders. Total facility IDR 80.67 Bio.',
  applicantPefindoCheck: 'NO RECORD SINCE ITS NEWLY ESTABLISHED',
  pefindoTerms: 'Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract',
  pefindoNotes: '- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.\n- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank,\n- New business diversification, PT HTPS doesnt have any experience in Harvesting.',
  lenderExposures: [
    { lender: 'SANF', plafond: 'IDR 35.000.000.000', rate: 'Flat 7.25% p.a.' },
    { lender: 'ACC', plafond: 'IDR 24.500.000.000', rate: 'Flat 7.00% p.a.' },
    { lender: 'Dipo Star Finance', plafond: 'IDR 12.000.000.000', rate: 'Flat 7.50% p.a.' },
    { lender: 'Bank Mandiri', plafond: 'IDR 9.173.526.173', rate: 'Floating 9.25% eff' }
  ],

  goodProject: true,
  goodProjectNote: 'Long-term captive wood supply contract with APRIL Group (RAPP). High off-taker reliability.',
  goodCustomer: false,
  goodCustomerNote: 'Entity newly incorporated in 2024 with limited standalone financial track record; relies heavily on Group operational experience.',
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
  briefNote: 'Key risks identified: Customer newly established (2024) with lack of harvesting experience; sister company PT PASS focuses only on FMCG transport; no closed contracts yet in Pefindo.',
  suggestionOverview: 'Corporate Guarantee from PT PASS and Personal Guarantee from Mr. Hansen Santosa are mandatory.',
  suggestions: [
    'Corporate Guarantee from PT PASS (Star Group parent holding with proven revenue).',
    'Personal Guarantee from Mr. Hansen Santosa (ultimate beneficial owner) with asset pledge.',
    'Escrow Account mechanism with Bowheer (RAPP) or direct payment split agreement.',
    'Pre-Delivery inspection and strict iLink GPS tracking with remote immobilizer protocol.'
  ],
  mitigationConditions: [
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
        'SELECT form_data FROM application_pre_analysis WHERE application_id = ?',
        [appId]
      );
      if (rows && rows.length > 0 && rows[0].form_data) {
        storedData = typeof rows[0].form_data === 'string'
          ? JSON.parse(rows[0].form_data)
          : rows[0].form_data;
      }
    } catch (e) {
      console.warn('Failed to query application_pre_analysis from MySQL, falling back to file:', e);
    }
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
