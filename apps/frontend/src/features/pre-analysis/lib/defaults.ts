/** Starting values of a Pre-Analysis (sample data), the competition table and the signature date of today. */
import type {CompetitionItem, PreAnalysisData} from '@/features/pre-analysis/lib/types';
import {DEFAULT_GROUP_STRUCTURE} from '@/features/pre-analysis/lib/group-structure';

export const getTodaySignatureDate = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd} / ${mm} / ${yyyy}`;
};

export const DEFAULT_COMPETITION_TABLE: CompetitionItem[] = [
  {finco: 'Komatsu Astra Finance (KAF)', rate: '9% - 11,5%', purpose: 'HE'},
  {finco: 'Astra Credit Companies (ACC)', rate: '10% - 12%', purpose: 'HE & Vehicles'},
  {finco: 'SAN Finance (SANF)', rate: '10,5% - 11,66%', purpose: 'HE & Vehicles'},
  {finco: 'Mahada Finance', rate: '10,50%', purpose: 'Truck'},
  {finco: 'Adira Finance', rate: '10,54%', purpose: 'HE & Vehicles'},
  {finco: 'Bank Mandiri', rate: '7,5% - 9,5%', purpose: 'HE & Vehicles'},
  {finco: 'BFI Finance', rate: '10,50%', purpose: 'HE'},
  {finco: 'BNI Multifinance', rate: '7,51%', purpose: 'HE'},
  {finco: 'Buana Finance', rate: '14,00%', purpose: 'HE'},
  {finco: 'Clipan Finance', rate: '12,49%', purpose: 'Truck'},
  {finco: 'Dipo Star Finance', rate: '9,66% - 13,76%', purpose: 'Truck'},
  {finco: 'IMFI', rate: '10,00%', purpose: 'HE'},
  {finco: 'SMFL', rate: '10,5% - 11,25%', purpose: 'HE'},
];

export const defaultInitialData: PreAnalysisData = {
  preAnalysisNo: '047/PREANA/MKT/IX/2026',
  preAnalysisDate: '07-Sep-26',
  customerProjectName: 'PT Handalan Putra Santosa (HPS)',
  taxId: '27.817.616.9-041.000',
  fapNumber: '070/AF/VIII/2026',
  leadSource: 'LMI',
  customerArea: 'Head Office : Jakarta\nSite Operation : Sumatera Area',
  dealerPic: 'Direct to LMI',
  lmiPic: 'Deny Ardhian',
  lfiPic: 'Amanda - no history with customer (new customer)',
  customerPic: 'Mr. Abraham (Business Director)',
  equity: '130.000.000.000  as of Last deed no 8, 8 June 2026',
  paidUpCapital: '32.500.000.000',
  sourceOfRepayment: 'Income / Others',

  // 2. PROJECT INFORMATION
  holdingGroup: 'STAR GROUP (PT Sentosa Abadi Raja)',
  projectName: 'Land Clearing, Wood Hauling & Forestry Harvesting Operations',
  projectLocation:
    'Head Office: Jakarta | Sites: Sumatera Area (Riau, Pelalawan, South Sumatra) & Kalimantan Timur',
  currentProjects: [
    {
      headName: 'PT Handalan Putramas Santosa (HPS)',
      projects: [
        {
          projectName: 'PT Bumi Andalas Permai',
          location: 'Jakarta',
          scope: 'Land Clearing, Maintenance & Logging - project start from November 2025',
        },
        {
          projectName: 'PT Bumi Mekar Hijau',
          location: 'Sumatera',
          scope: 'Land Clearing, Maintenance & Logging - project start from November 2025',
        },
        {
          projectName: 'PT Sebangun Bumi Andalas Wood Industries',
          location: 'Sumatera',
          scope: 'Land Clearing, Maintenance & Logging - project start from November 2025',
        },
        {
          projectName: 'PT Riau Andalan Pulp & Paper (RAPP)',
          location: 'Riau, Pelalawan',
          scope: 'Wood Hauling & Logging Project - Project start from December 2024',
        },
      ],
    },
  ],
  historyProjects: [
    {
      headName: 'PT Pangan Sejahtera Santosa (PASS)',
      projects: [
        {projectName: 'PT Sinar Sosro', location: 'Jakarta', scope: 'FMCG distributor - Start from 2022'},
        {
          projectName: 'PT FKS Pangan Nusantara',
          location: 'Surabaya',
          scope: 'FMCG distribution logistics - Start from 2022',
        },
        {
          projectName: 'PT Perfetti Van Melle',
          location: 'Jakarta',
          scope: 'Confectionery logistics distribution - Start from 2022',
        },
        {
          projectName: 'PT Mondelez Indonesia Trading',
          location: 'Bandung',
          scope: 'Snack distribution & transport - Start from 2022',
        },
      ],
    },
  ],
  investmentProjectPlans: [
    {
      headName: 'PT Harta Putramas Santosa (HTPS)',
      projects: [
        {
          projectName: 'PT Industrial Forest Plantation',
          location: 'Kalimantan Timur',
          scope: 'Harvesting project - Project start estimated around Sept / Oct 2026',
        },
        {
          projectName: 'PT SBA Wood Industries',
          location: 'Lebong Hitam',
          scope: 'Land Clearing - Project start estimated around Oct 2026',
        },
        {
          projectName: 'RAPP - Mayawana',
          location: 'Kalimantan Barat',
          scope: 'Logging and harvesting supply for next year',
        },
      ],
    },
  ],
  existingProjects: '',
  newProjects: '',
  projectNameLocation:
    'STAR GROUP (PT Sentosa Abadi Raja) - Land Clearing, Wood Hauling & Harvesting | Sumatera & Kalimantan',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\n2. Oki Pulp & Paper',
  bowheerInfo: `1. PT Riau Andalan Pulp and Paper (RAPP) is one of the world's largest producers of sustainable pulp and paper, operating in Pangkalan Kerinci, Pelalawan Regency, Riau Province.\n- Parent Company: The core business unit of APRIL Group (Asia Pacific Resources International Limited) under the RGE (Royal Golden Eagle) Group.\n- Operational Location: Pangkalan Kerinci, Riau, Sumatra, Indonesia.\n- Production Capacity: Capable of producing up to 2.8 million tons of pulp and 1.15 million tons of paper annually.\n- Flagship Product: PaperOne™\nEstablishment: Founded May 15, 1989. Integrated mill in Pangkalan Kerinci with 11 MW solar array and self-sufficient power.\n\n2. OKI Pulp & Paper - Sinar Mas Forestry Group\nStrategic subsidiary of Asia Pulp & Paper (APP) Group located in Air Sugihan, Ogan Komering Ilir Regency, South Sumatra, supported by Tanjung Tapa Seaport. Integrated upstream-to-downstream sustainable fiber supply network.`,
  projectStatus: 'Ongoing',
  projectStatusRemarks: 'with RAPP since 2025 for logistic',
  investmentPlan: '',
  investmentPlanSelected: ['SD', 'Tenor', 'Rate', 'Provision', 'Adm'],
  investmentPlanRemarks: {
    SD: '15% down payment / security deposit',
    Tenor: '36-month lease duration',
    Rate: 'Competitive interest rate per LiuGong standard',
    Adm: '1.5% administration fee',
  },
  financingSchemeRequested: 'Tenor : 36-month lease\nSD : 15%',

  ubo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  uboInfo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  companyBackground: `<p>PT Handalan Putramas Santosa (HPS) is family company belongs to Mr. Hansen Santosa &amp; family, under holding named PT Santosa Abadi Raja (STAR).</p>
<p><strong>STAR Group – Key Milestones</strong></p>
<p><strong>2022 | PT PASS Established – FMCG Distribution Business</strong><br/>
- PT Pangan Sejahtera Santosa (PT PASS) was established by Mr. Hansen Santosa, son of Mr. Oky Santosa, marking the beginning of the STAR Group's business operations.<br/>
- PT PASS focuses on urban FMCG distribution, operating warehouses and providing next-day delivery services while generating revenue from distribution margins.<br/>
- In 2022, PT PASS supported the distribution activities of several major FMCG companies, including PT Sinar Sosro, PT FKS Pangan Nusantara, PT Perfetti Van Melle, and PT Mondelez Indonesia Trading.</p>
<p><strong>Q1 2024 | PT STAR Established as Holding Company</strong><br/>
- PT Sentosa Abadi Raja (STAR) was established by Mr. Hansen Santosa as a holding company to consolidate and manage the businesses of Mr. Hansen.</p>
<p><strong>November 2024 | PT HPS Established – Entry into Forestry Logistics and Hauling</strong><br/>
- PT HPS was established as the vehicle for STAR Group's entry into forestry, following Mr. Herry Tho's former experience. The initial business focus was forestry logistics and wood hauling.<br/>
- PT HPS secured a five-year contract with RAPP, with operations commencing in December 2024.</p>
<p><strong>Late 2025 | Expansion into Land Clearing and Harvesting</strong><br/>
- After approximately one year of forestry operations, Mr. Herry Tho proposed further expansion into land clearing and harvesting.<br/>
- In November 2025, PT HPS commenced land clearing, maintenance, and logging projects with three APP Group/Sinar Mas companies:<br/>
&nbsp;&nbsp;&bull; PT Bumi Andalas Permai<br/>
&nbsp;&nbsp;&bull; PT Bumi Mekar Hijau<br/>
&nbsp;&nbsp;&bull; PT Sebangun Bumi Andalas Wood Industries</p>
<p><strong>End-2025 | PT HTPS Established – Harvesting Business</strong><br/>
- PT HTPS was established by Mr. Hansen Santosa to focus specifically on harvesting projects.<br/>
- The establishment of a separate entity was intended to differentiate and streamline the diversification of each business/project within the STAR Group and to focusing on land clearing &amp; harvesting contractor.</p>`,
  businessDevBackground: `While seeking a partner to develop wingbox trucking services to support his FMCG distribution business, Mr. Hansen Santosa met Mr. Herry Tho.
- Mr. Herry Tho is based from Pekanbaru and has a background in logistics and hauling, with business connections within the forestry sector, including contacts at RAPP and APP/Sinar Mas. Through this relationship, he introduced Mr. Hansen to investment opportunities in forestry logistics and wood hauling.
- Mr. Herry previously worked at DNR Logistics (Dos Ni Roha). According to the information provided, the business he was involved in reportedly failed. His experience during that period appears to have been primarily in logistics and hauling, with no established harvesting track record.`,
  operationalTeamInfo: `Mr. Herry Tho is expected to lead the harvesting project. The planned operational team will include personnel formerly employed by RAPP, Sarindo, and CIS who have experience in forestry operations.`,
  groupStructureImage: '',
  showUboInformation: true,
  uboInformation: `STAR GROUP Corporate Shareholding & Governance Structure:
• PT Sentosa Abadi Raja (Holding Company): Authorized Capital IDR 240B, Paid-up Capital IDR 60B
  - Hansen Santosa (54% - Presiden Direktur)
  - Leonard Santosa (34% - Direktur)
  - Oky Santosa (12% - Komisaris)
• PT Pangan Sejahtera Santosa (PASS - FMCG): Authorized Capital IDR 50B, Paid-up Capital IDR 17.5B
  - PT STAR (99,994%), Leonard Santosa (0,006%)
• PT Handalan Putramas Santosa (HPS - Sister Co): Authorized Capital IDR 130B, Paid-up Capital IDR 32.5B
  - PT STAR (99,997%), Leonard Santosa (0,003%)
• PT Harta Putramas Santosa (HTPS - Applicant): Authorized Capital IDR 500M, Paid-up Capital IDR 500M
  - PT STAR (99,98%), Leonard Santosa (0,02%)`,
  groupStructure: DEFAULT_GROUP_STRUCTURE,
  milestones: [
    {
      year: '2022',
      milestone:
        "PT Pangan Sejahtera Santosa (PASS) established – Started the Group's business through urban FMCG distribution and supported major FMCG principals.",
    },
    {
      year: 'Q1 2024',
      milestone:
        'PT Santosa Abadi Raja (STAR) established – Set up as a holding company to consolidate businesses owned by Mr. Hansen and his family.',
    },
    {
      year: 'Nov-24',
      milestone:
        'PT Handalan Putra Santosa (HPS) established – Focused on logging and land clearing projects; secured a 5-year RAPP contract and three APP Group contracts: 1. PT Bumi Andalas Permai, 2. PT Bumi Mekar Hijau, 3. PT Sebangun Bumi Andalas Wood Industries',
    },
    {
      year: 'End-2025',
      milestone:
        "PT Harta Putra Santosa (HTPS) established – Created to focus specifically on harvesting projects and further diversify the Group's business activities.",
    },
    {
      year: 'Mid-2026',
      milestone: 'New RAPP harvesting contract – New harvesting project to be executed through PT HTPS.',
    },
  ],
  existingFincoBackup: 'ACC, SANF, MTF, RADANA, SMFL, BCA',

  equipmentJobFit: 'Suitable - for harvesting  in Sumatera Area',
  utilizationDuration: 'Reasonable — 3 years contract duration',
  priorLiugongExperience: 'Never invest Liugong prior this proposal',
  serviceAgreementFmc: 'Standard warranty from LMI',
  unitComposition: [
    {kategoriAset: 'Truk ISUZU GIGA FVM U', brand: 'ISUZU', qty: 45},
    {kategoriAset: 'Truk FAW', brand: 'FAW', qty: 41},
    {kategoriAset: 'Truk Shacman', brand: 'Shacman', qty: 25},
    {kategoriAset: 'Truk ISUZU CDE L', brand: 'ISUZU', qty: 10},
    {kategoriAset: 'Vehicle Commercial Dmax', brand: 'ISUZU', qty: 3},
    {kategoriAset: 'Vehicle Commercial Toyota Calya - G AT 1.2 Lux', brand: 'Toyota', qty: 1},
    {kategoriAset: 'Vehicle Commercial Toyota Innova All New', brand: 'Toyota', qty: 1},
  ],

  deliveryStatus: 'Not yet Deliver',
  deliveryDate: 'demand units Sept 2026, will be delivery estimate on W3 & after receive PO from Finco',
  qaIlinkComment: 'iLink_PDI_Performance_Report.pdf',
  qaDocumentName: 'iLink_PDI_Performance_Report.pdf',
  qaDocumentFile: '',
  qaConclusion: 'Standard PDI required upon delivery and iLink telemetry activation',

  dealerCheck: 'No Records Payment - New Liugong Customer',
  topDealerToCustomer: '20% DP, 80% cover by Leasing',
  topLmiToDealer: '-',
  lmiArCheck: 'No Records Payment - New Liugong Customer',
  slikPefindoHighlight: 'Based on Pefindo Checking on 4 Sept 2026',
  applicantPefindoCheck: 'NO RECORD SINCE ITS NEWLY ESTABLISHED',
  pefindoTerms:
    'Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract',
  pefindoNotes: `- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.\n- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank,\n- New business diversification, PT HTPS doesnt have any experience in Harvesting.`,
  lenderExposures: [
    {lender: 'PT Astra Sedaya Finance (ACC)', plafond: '11.737.642.751,00', rate: '6,24'},
    {lender: 'PT Bank Central Asia Tbk', plafond: '13.533.553.504,00', rate: '9,50'},
    {lender: 'PT Bank Nano Syariah', plafond: '6.163.669.402,00', rate: '-'},
    {lender: 'PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)', plafond: '2.738.552.586,00', rate: '10,41'},
    {lender: 'PT Mandiri Tunas Finance (MTF)', plafond: '14.993.647.840,00', rate: '9,50'},
    {lender: 'PT Mitsui Leasing Capital Indonesia', plafond: '392.806.826,00', rate: '10,63'},
    {lender: 'PT Radana Bhaskara Finance', plafond: '3.273.898.464,00', rate: '7,20'},
    {lender: 'PT SMFL Leasing Indonesia', plafond: '4.301.044.800,00', rate: '12,49'},
    {lender: 'PT Surya Artha Nusantara Finance (SANF)', plafond: '23.538.710.000,00', rate: '11,25'},
  ],

  goodProject: true,
  goodProjectNote: 'Harvesting Contractor, PT RAPP - APRIL Group',
  goodCustomer: false,
  goodCustomerNote:
    'PT HPS was newly established company since 2024. Group (HTPS) newly established since 2025.',
  recommendation: 'NOT RECOMMENDED TO FULL DOCUMENTATION',
  briefNote: `- Based on documents (Legal & financial data), PT HPS is newly established company since 2024.\n- It's Group (PT Harta Putramas Santosa / PT HTPS) also newly established company since 2025.\nNot recommend to process in this stage`,
  suggestions: [
    'If still want to process with FPG, can be consider with the limitations :',
    'Corporate Guarantee from PT PASS',
    'Personal Guarantee from Hansen Santosa',
    'Project limited only for Sinarmas',
    'Not support for harvesting project',
    'Payment method : escrow + cover PDC for full tenor',
    'HTPS must have factoring facility for Nano Bank, as a source of payment to LFI',
    'If Nano Bank can not support, then need cover by 3 x Cash Collateral',
    'Other condition base on LFI Credit Committee',
  ],
  competitionNotes:
    'Pefindo check 4 Sept 2026. Rate benchmark: Flat 7% p.a., 20% Security Deposit, 36-month lease tenor, 1% provision fee, IDR 5.000.000 admin fee per contract.',
  competitionTable: DEFAULT_COMPETITION_TABLE,
  proposedBy: 'Amanda Cynthia\nSenior Account Manager',
  reviewedBy: 'Maria Regina\nDept. Head Marketing',
  approvedBy: 'Jembar Ganda E\nDirector',
  signatories: [
    {id: 'sig-1', role: 'Propose by :', name: 'Amanda Cynthia', position: 'Senior Account Manager'},
    {id: 'sig-2', role: 'Reviewed by :', name: 'Maria Regina', position: 'Dept. Head Marketing'},
    {id: 'sig-3', role: 'Approved by :', name: 'Jembar Ganda E', position: 'Director'},
  ],
};
