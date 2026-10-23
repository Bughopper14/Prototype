import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './mysql-store';

const storeDir = path.resolve('database/pre_analysis');

export const DEFAULT_PRE_ANALYSIS_DATA = {
  preAnalysisNo: '047/PREANA/MKT/IX/2026',
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
  projectNameLocation: '1. PT Handalan Putramas Santosa (HPS) - RAPP, SBA Wood Industries\\n2. PT Pangan Sejahtera Santosa (PASS) - FMCG (Sosro, FKS)\\n3. PT Harta Putramas Santosa (HTPS) - NEW (Harvesting)',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\\n2. Oki Pulp & Paper',
  bowheerInfo: 'RAPP (APRIL Group) & OKI Pulp & Paper (Sinar Mas Group) — largest integrated pulp & paper producer in Asia.',
  projectStatus: 'On Going with RAPP since 2025 for logistics',
  investmentPlan: '20-30 units nearest plan: 20 units LIUGONG Excavator for RAPP & 30 units for Sinarmas',
  financingSchemeRequested: '36-month lease, 15-20% Down Payment / Security Deposit',
  ubo: '1. Mr. Oky Santosa (Father)\\n2. Mr. Hansen Santosa (Owner)\\n3. Mr. Leonard Santosa (Brother)',
  companyBackground: 'STAR Group started in transport & logistics in 2022. Expanded to PASS in FMCG and newly formed HTPS for harvesting.',
  milestones: [
    { year: '2022', entity: 'STAR Group', description: 'Established transportation logistics unit' },
    { year: 'Q1 2024', entity: 'PT PASS', description: 'FMCG distribution contract with Sosro' },
    { year: 'Nov-24', entity: 'PT HPS', description: 'Incorporated for forestry & land clearing' },
    { year: 'End-2025', entity: 'STAR Group', description: 'Fleet expansion to 120+ units' },
    { year: 'Mid-2026', entity: 'PT HTPS', description: 'New harvesting entity created' }
  ],
  existingFincoBackup: 'ACC, SANF, MTF, RADANA, SMFL, BCA, Bank Saqu, Bank Nano Syariah, Mitsui',
  equipmentJobFit: 'Suitable - for harvesting in Sumatera Area',
  utilizationDuration: 'Reasonable — 3 years contract duration',
  priorLiugongExperience: 'Never invest LiuGong prior to this proposal',
  serviceAgreementFmc: 'Standard warranty from LMI',
  unitComposition: [
    { type: 'Truk ISUZU GIGA FVM U', qty: '45' },
    { type: 'Truk FAW', qty: '41' },
    { type: 'Truk Shacman', qty: '25' },
    { type: 'Truk ISUZU CDE L', qty: '10' },
    { type: 'Vehicle Commercial Dmax', qty: '3' },
    { type: 'Vehicle Commercial Calya / Innova', qty: '2' }
  ],
  deliveryStatus: 'Not Yet Delivered (Pending PO)',
  deliveryDate: 'Demand units Sept 2026, delivery est W3 after PO',
  qaIlinkComment: 'No Records / Pre-Delivery Inspection Pending',
  qaConclusion: 'Standard PDI required upon delivery',
  topDealerToCustomer: '20% DP, 80% covered by Leasing',
  topLmiToDealer: '-',
  lmiArCheck: 'No Records Payment - New LiuGong Customer',
  slikPefindoHighlight: 'Pefindo 4 Sept 2026: 9 facilities total IDR 80.67 Bio, Kol 1 Current, 0 closed contracts',
  lenderExposures: [
    { lender: 'ACC', plafond: 'Rp 11.73 Bio', rate: '6.24%', notes: 'Vehicle financing' },
    { lender: 'BCA', plafond: 'Rp 13.53 Bio', rate: '9.50%', notes: 'Working capital' },
    { lender: 'Bank Nano Syariah', plafond: 'Rp 6.16 Bio', rate: '-', notes: 'Murabahah' },
    { lender: 'Bank Saqu', plafond: 'Rp 2.73 Bio', rate: '10.41%', notes: 'Installment loan' },
    { lender: 'MTF', plafond: 'Rp 14.99 Bio', rate: '9.50%', notes: 'Commercial fleet' },
    { lender: 'Mitsui', plafond: 'Rp 392.8 Mio', rate: '10.63%', notes: 'Equipment' },
    { lender: 'Radana', plafond: 'Rp 3.27 Bio', rate: '7.20%', notes: 'Fleet lease' },
    { lender: 'SMFL', plafond: 'Rp 4.30 Bio', rate: '12.49%', notes: 'Machinery lease' },
    { lender: 'SANF', plafond: 'Rp 23.53 Bio', rate: '11.25%', notes: 'Heavy equipment' }
  ],
  goodProject: true,
  goodProjectNote: 'Harvesting Contractor, PT RAPP - APRIL Group',
  goodCustomer: false,
  goodCustomerNote: 'PT HPS was newly established in 2024. All leasing contracts remain open. Group entity PT HTPS is newly established with zero track record across banks and fincos. Diversification into harvesting lacks operational experience.',
  recommendation: 'NOT RECOMMEND TO FULL DOCUMENTATION',
  suggestions: '1. Corporate Guarantee PT PASS\\n2. Personal Guarantee Mr. Hansen Santosa\\n3. Escrow Account + Post-Dated Cheques (PDC)\\n4. Factoring Nano Bank or 3x Cash Collateral',
  competitionTerms: 'Pefindo checking 4 Sept 2026. Rate flat 7%, 20% SD, Normal Installment, 36 months, 1% provision, IDR 5M admin fee.',
  signoffs: {
    proposedBy: 'Amanda Cynthia',
    reviewedBy: 'Maria Regina',
    approvedBy: 'Jembar Ganda E'
  }
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

export async function getPreAnalysisData(appId: string): Promise<any> {
  await ensureDir();
  if (pool) {
    try {
      const [rows] = await pool.query<any[]>(
        'SELECT form_data FROM application_pre_analysis WHERE application_id = ?',
        [appId]
      );
      if (rows && rows.length > 0 && rows[0].form_data) {
        return typeof rows[0].form_data === 'string'
          ? JSON.parse(rows[0].form_data)
          : rows[0].form_data;
      }
    } catch (e) {
      console.warn('Failed to query application_pre_analysis from MySQL, falling back to file:', e);
    }
  }

  const filePath = path.join(storeDir, `${appId}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PRE_ANALYSIS_DATA };
  }
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
