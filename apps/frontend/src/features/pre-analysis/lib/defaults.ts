/** Default pre-analysis content for a new application (unchanged sample defaults). */
import {CompetitionItem, GroupStructureData, PreAnalysisData} from './types';

export const DEFAULT_GROUP_STRUCTURE: GroupStructureData = {
  holding: {
    name: 'PT STAR',
    subtitle: '(PT Santosa Abadi Raja)',
    authorizedCapital: 'Rp. 240,000,000,000',
    paidUpCapital: 'Rp. 60,000,000,000',
    borderColor: '#1e3a8a',
    shareholders: [
      {
        name: 'HANSEN SANTOSA',
        position: 'President Director',
        role: 'President Director',
        shareClass: '-',
        numberOfShares: '324,000',
        total: 'Rp. 32,400,000,000',
        percentage: '54%',
      },
      {
        name: 'LEONARD SANTOSA',
        position: 'Director',
        role: 'Director',
        shareClass: '-',
        numberOfShares: '204,000',
        total: 'Rp. 20,400,000,000',
        percentage: '34%',
      },
      {
        name: 'OKY SANTOSA',
        position: 'Commissioner',
        role: 'Commissioner',
        shareClass: '-',
        numberOfShares: '72,000',
        total: 'Rp. 7,200,000,000',
        percentage: '12%',
      },
    ],
    management: 'Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa',
  },
  subsidiaries: [
    {
      name: 'PT PASS',
      subtitle: '(PT Pangan Sejahtera Santosa)',
      authorizedCapital: 'Rp. 50,000,000,000',
      paidUpCapital: 'Rp. 17,500,000,000',
      borderColor: '#0284c7',
      shareholders: [
        {
          name: 'LEONARD SANTOSA',
          position: 'Director',
          role: 'Director',
          shareClass: '-',
          numberOfShares: '10',
          total: 'Rp. 1,000,000',
          percentage: '<1%',
        },
        {
          name: 'HANSEN SANTOSA',
          position: 'Commissioner',
          role: 'Commissioner',
          shareClass: '-',
          numberOfShares: '-',
          total: 'Rp. 0',
          percentage: '0%',
        },
        {
          name: 'PT SANTOSA ABADI RAJA',
          position: 'Legal Entity',
          role: 'Legal Entity',
          shareClass: '-',
          numberOfShares: '174,990',
          total: 'Rp. 17,499,000,000',
          percentage: '99.99%',
        },
      ],
      management: 'Direktur: Leonard Santosa | Komisaris: Hansen Santosa',
    },
    {
      name: 'PT HPS',
      subtitle: '(PT Handalan Putra Santosa)',
      authorizedCapital: 'Rp. 130,000,000,000',
      paidUpCapital: 'Rp. 32,500,000,000',
      borderColor: '#dc2626',
      shareholders: [
        {
          name: 'LEONARD SANTOSA',
          position: 'Director',
          role: 'Director',
          shareClass: '-',
          numberOfShares: '10',
          total: 'Rp. 1,000,000',
          percentage: '<1%',
        },
        {
          name: 'HANSEN SANTOSA',
          position: 'Commissioner',
          role: 'Commissioner',
          shareClass: '-',
          numberOfShares: '-',
          total: 'Rp. 0',
          percentage: '0%',
        },
        {
          name: 'PT SANTOSA ABADI RAJA',
          position: 'Legal Entity',
          role: 'Legal Entity',
          shareClass: '-',
          numberOfShares: '324,990',
          total: 'Rp. 32,499,000,000',
          percentage: '99.99%',
        },
      ],
      management: 'Direktur: Leonard Santosa | Komisaris: Hansen Santosa',
    },
    {
      name: 'PT HTPS',
      subtitle: '(PT Harta Putramas Santosa)',
      authorizedCapital: 'Rp. 500,000,000',
      paidUpCapital: 'Rp. 500,000,000',
      borderColor: '#16a34a',
      shareholders: [
        {
          name: 'HANSEN SANTOSA',
          position: 'Commissioner',
          role: 'Commissioner',
          shareClass: '-',
          numberOfShares: '-',
          total: 'Rp. 0',
          percentage: '0%',
        },
        {
          name: 'LEONARD SANTOSA',
          position: 'Director',
          role: 'Director',
          shareClass: '-',
          numberOfShares: '1',
          total: 'Rp. 100,000',
          percentage: '<1%',
        },
        {
          name: 'PT SANTOSA ABADI RAJA',
          position: 'Legal Entity',
          role: 'Legal Entity',
          shareClass: '-',
          numberOfShares: '4,999',
          total: 'Rp. 499,900,000',
          percentage: '99.98%',
        },
      ],
      management: 'Komisaris: Hansen Santosa | Direktur: Leonard Santosa',
    },
  ],
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
  existingProjects: `A. PT Handalan Putramas Santosa (HPS) (Existing Project):
1. PT Bumi Andalas Permai (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging - project start from November 2025
2. PT Bumi Mekar Hijau (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging - project start from November 2025
3. PT Sebangun Bumi Andalas Wood Industries (APP / Sinarmas Group) - Land Clearing, Maintenance & Logging - project start from November 2025
4. PT Riau Andalan Pulp & Paper (RAPP) - Wood Hauling & Logging Project - Project start from December 2024

B. PT Pangan Sejahtera Santosa (PASS) (Existing Project):
1. PT Sinar Sosro - FMCG distributor - Start from 2022
2. PT FKS Pangan Nusantara - Start from 2022
3. PT Perfetti Van Melle - Start from 2022
4. PT Mondelez Indonesia Trading - Start from 2022`,
  newProjects: `C. PT Harta Putramas Santosa (HTPS) - NEW (Proposed Project):
1. PT Industrial Forest Plantation - Harvesting project - Project start estimated around Sept / Oct 2026 (Kalimantan Timur)
2. PT SBA Wood Industries - Land Clearing - Project start estimated around Oct 2026 (Lebong Hitam)
3. RAPP - Mayawana (for next year)`,
  projectNameLocation:
    'STAR GROUP (PT Sentosa Abadi Raja) - Land Clearing, Wood Hauling & Harvesting | Sumatera & Kalimantan',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\n2. Oki Pulp & Paper',
  bowheerInfo: `1. PT Riau Andalan Pulp and Paper (RAPP) is one of the world's largest producers of sustainable pulp and paper, operating in Pangkalan Kerinci, Pelalawan Regency, Riau Province.\n- Parent Company: The core business unit of APRIL Group (Asia Pacific Resources International Limited) under the RGE (Royal Golden Eagle) Group.\n- Operational Location: Pangkalan Kerinci, Riau, Sumatra, Indonesia.\n- Production Capacity: Capable of producing up to 2.8 million tons of pulp and 1.15 million tons of paper annually.\n- Flagship Product: PaperOne™\nEstablishment: Founded May 15, 1989. Integrated mill in Pangkalan Kerinci with 11 MW solar array and self-sufficient power.\n\n2. OKI Pulp & Paper - Sinar Mas Forestry Group\nStrategic subsidiary of Asia Pulp & Paper (APP) Group located in Air Sugihan, Ogan Komering Ilir Regency, South Sumatra, supported by Tanjung Tapa Seaport. Integrated upstream-to-downstream sustainable fiber supply network.`,
  projectStatus: 'on Going with RAPP since 2025 for logistic',
  investmentPlan: `- nearest plan : 20 units LIUGONG Excavator for RAPP & 30 units LIUGONG Excavator for Sinarmas Project (combine 13 & 20 ton)\nTotal demand will be around 100 units until end of 2026.\nOther info : 20-30 unit (1st batch) estimated will delivery on W3 September 2026`,
  financingSchemeRequested: 'Tenor : 36-month lease\nSD : 15%',

  ubo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  uboInfo: 'Mr. Oky Santosa (Father)\nMr. Hansen Santosa (Owner)\nMr. Leonard Santosa (Brother)',
  companyBackground:
    'PT Handalan Putramas Santosa (HPS) is family company belongs to Mr. Hansen Santosa & family, under holding named PT Santosa Abadi Raja (STAR).',
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
  qaIlinkComment: 'No Records / Pre-Delivery Inspection Pending',
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
  recommendation: 'NOT RECOMMENDED',
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
  reviewedBy: 'Maria Regina\nDept. Head',
  approvedBy: 'Jembar Ganda E\nDirector',
};
