
export function getStaticAssetUrl(relativePath: string): string {
  const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/crm-dashboard')) {
    return `/crm-dashboard/${clean}`;
  }
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/crm')) {
    return `/crm/${clean}`;
  }
  return `/${clean}`;
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import {
  FileText,
  Save,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Briefcase,
  Users,
  Truck,
  CheckSquare,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileSearch,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Check,
  Loader2
} from 'lucide-react';
import { api } from './api';
import { useMandatoryRules, isFieldMandatory } from './master-data';

export interface MilestoneItem {
  year: string;
  milestone?: string;
  entity?: string;
  description?: string;
}

export interface UnitCompItem {
  kategoriAset?: string;
  brand: string;
  type?: string;
  qty: number;
}

export interface LenderExposureItem {
  lender: string;
  plafond: string;
  rate: string;
  notes?: string;
}

export interface CompetitionItem {
  finco: string;
  rate: string;
  purpose: string;
}

export interface GroupShareholder {
  name: string;
  percentage?: string;
  role?: string;
  position?: string;
  shareClass?: string;
  numberOfShares?: string;
  total?: string;
}

export interface GroupEntity {
  name: string;
  subtitle?: string;
  authorizedCapital: string;
  paidUpCapital: string;
  shareholders: GroupShareholder[];
  management?: string;
  borderColor?: string;
}

export interface GroupStructureData {
  holding: GroupEntity;
  subsidiaries: GroupEntity[];
}

export const DEFAULT_GROUP_STRUCTURE: GroupStructureData = {
  holding: {
    name: 'PT STAR',
    subtitle: '(PT Santosa Abadi Raja)',
    authorizedCapital: 'Rp. 240,000,000,000',
    paidUpCapital: 'Rp. 60,000,000,000',
    borderColor: '#1e3a8a',
    shareholders: [
      { name: 'HANSEN SANTOSA', position: 'President Director', role: 'President Director', shareClass: '-', numberOfShares: '324,000', total: 'Rp. 32,400,000,000', percentage: '54%' },
      { name: 'LEONARD SANTOSA', position: 'Director', role: 'Director', shareClass: '-', numberOfShares: '204,000', total: 'Rp. 20,400,000,000', percentage: '34%' },
      { name: 'OKY SANTOSA', position: 'Commissioner', role: 'Commissioner', shareClass: '-', numberOfShares: '72,000', total: 'Rp. 7,200,000,000', percentage: '12%' }
    ],
    management: 'Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa'
  },
  subsidiaries: [
    {
      name: 'PT PASS',
      subtitle: '(PT Pangan Sejahtera Santosa)',
      authorizedCapital: 'Rp. 50,000,000,000',
      paidUpCapital: 'Rp. 17,500,000,000',
      borderColor: '#0284c7',
      shareholders: [
        { name: 'LEONARD SANTOSA', position: 'Director', role: 'Director', shareClass: '-', numberOfShares: '10', total: 'Rp. 1,000,000', percentage: '<1%' },
        { name: 'HANSEN SANTOSA', position: 'Commissioner', role: 'Commissioner', shareClass: '-', numberOfShares: '-', total: 'Rp. 0', percentage: '0%' },
        { name: 'PT SANTOSA ABADI RAJA', position: 'Legal Entity', role: 'Legal Entity', shareClass: '-', numberOfShares: '174,990', total: 'Rp. 17,499,000,000', percentage: '99.99%' }
      ],
      management: 'Direktur: Leonard Santosa | Komisaris: Hansen Santosa'
    },
    {
      name: 'PT HPS',
      subtitle: '(PT Handalan Putra Santosa)',
      authorizedCapital: 'Rp. 130,000,000,000',
      paidUpCapital: 'Rp. 32,500,000,000',
      borderColor: '#dc2626',
      shareholders: [
        { name: 'LEONARD SANTOSA', position: 'Director', role: 'Director', shareClass: '-', numberOfShares: '10', total: 'Rp. 1,000,000', percentage: '<1%' },
        { name: 'HANSEN SANTOSA', position: 'Commissioner', role: 'Commissioner', shareClass: '-', numberOfShares: '-', total: 'Rp. 0', percentage: '0%' },
        { name: 'PT SANTOSA ABADI RAJA', position: 'Legal Entity', role: 'Legal Entity', shareClass: '-', numberOfShares: '324,990', total: 'Rp. 32,499,000,000', percentage: '99.99%' }
      ],
      management: 'Direktur: Leonard Santosa | Komisaris: Hansen Santosa'
    },
    {
      name: 'PT HTPS',
      subtitle: '(PT Harta Putramas Santosa)',
      authorizedCapital: 'Rp. 500,000,000',
      paidUpCapital: 'Rp. 500,000,000',
      borderColor: '#16a34a',
      shareholders: [
        { name: 'HANSEN SANTOSA', position: 'Commissioner', role: 'Commissioner', shareClass: '-', numberOfShares: '-', total: 'Rp. 0', percentage: '0%' },
        { name: 'LEONARD SANTOSA', position: 'Director', role: 'Director', shareClass: '-', numberOfShares: '1', total: 'Rp. 100,000', percentage: '<1%' },
        { name: 'PT SANTOSA ABADI RAJA', position: 'Legal Entity', role: 'Legal Entity', shareClass: '-', numberOfShares: '4,999', total: 'Rp. 499,900,000', percentage: '99.98%' }
      ],
      management: 'Komisaris: Hansen Santosa | Direktur: Leonard Santosa'
    }
  ]
};

export function formatGroupStructureAsNarrative(gs: GroupStructureData): string {
  if (!gs || !gs.holding) return '';
  const lines: string[] = [];
  const hName = gs.holding.name || 'Holding Company';
  const hCap = `Authorized Capital: ${gs.holding.authorizedCapital || '-'}, Paid-up Capital: ${gs.holding.paidUpCapital || '-'}`;
  lines.push(`CORPORATE SHAREHOLDING & GOVERNANCE STRUCTURE:`);
  lines.push(`• ${hName} (Parent Holding): Authorized Capital: ${gs.holding.authorizedCapital || "-"}, Paid-up Capital: ${gs.holding.paidUpCapital || "-"}`);
  (gs.holding.shareholders || []).forEach(sh => {
    if (sh.name) {
      lines.push(`  - ${sh.name} (${sh.percentage || '-'}${sh.role ? ` - ${sh.role}` : ''})`);
    }
  });
  if (gs.holding.management) {
    lines.push(`  - Management: ${gs.holding.management}`);
  }
  (gs.subsidiaries || []).forEach(sub => {
    if (sub.name) {
      const sCap = `Authorized Capital: ${sub.authorizedCapital || '-'}, Paid-up Capital: ${sub.paidUpCapital || '-'}`;
      lines.push(`• ${sub.name}: ${sCap}`);
      (sub.shareholders || []).forEach(sh => {
        if (sh.name) {
          lines.push(`  - ${sh.name} (${sh.percentage || '-'}${sh.role ? ` - ${sh.role}` : ''})`);
        }
      });
      if (sub.management) {
        lines.push(`  - Management: ${sub.management}`);
      }
    }
  });
  return lines.join('\n');
}

export function stripHtmlTags(val: any): string {
  if (typeof val !== 'string') return val ?? '';
  if (!val.includes('<') && !val.includes('&')) return val;
  return val
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<\/?div[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface EntitySlikReview {
  id?: string;
  entityName: string;
  hasRecord: boolean;
  noRecordRemarks?: string;
  lenderExposures: LenderExposureItem[];
  pefindoNotes?: string;
  pefindoTerms?: string;
}

export function parsePlafonNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val || typeof val !== 'string') return 0;
  let clean = val.replace(/Rp\s*/gi, '').trim();
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes('.') && !clean.includes(',')) {
    const parts = clean.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes(',') && !clean.includes('.')) {
    const parts = clean.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatPlafonCurrency(num: number): string {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderRichHtml(val: any) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (/<(p|ul|ol|li|div|br|strong|b|em|i|span|table|tr|td|th)[^>]*>/i.test(str)) {
    return (
      <div 
        className="preana-rich-rendered-html" 
        style={{ lineHeight: 1.45 }} 
        dangerouslySetInnerHTML={{ __html: str }} 
      />
    );
  }
  return (
    <div style={{ whiteSpace: 'pre-line', lineHeight: 1.45 }}>
      {str}
    </div>
  );
}

export function PreAnalysisRichEditor({
  value,
  onChange,
  onFocus,
  placeholder,
  height = 160,
  dataField
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  height?: number;
  dataField?: string;
}) {
  const tinymceSrc = getStaticAssetUrl("tinymce/tinymce.min.js");

  const initialHtml = useMemo(() => {
    if (!value) return '';
    if (value.includes('<p>') || value.includes('<div>') || value.includes('<ul>') || value.includes('<ol>')) {
      return value;
    }
    return value.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<p>&nbsp;</p>').join('');
  }, []);

  return (
    <div
      data-field={dataField}
      onClick={() => { if (onFocus) onFocus(); }}
      onFocus={() => { if (onFocus) onFocus(); }}
      style={{
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
        background: '#ffffff'
      }}
    >
      <style>{`
        .tox .tox-statusbar__path { display: none !important; }
        .tox-statusbar__path { display: none !important; }
      `}</style>
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc={tinymceSrc}
        value={value || ''}
        initialValue={initialHtml}
        onEditorChange={(newHtml) => {
          if (newHtml !== value) {
            onChange(newHtml);
          }
        }}
        init={{
          height: height,
          menubar: false,
          placeholder: placeholder,
          branding: false,
          elementpath: false,
          setup: (editor: any) => {
            let userReady = false;
            editor.on('init', () => {
              setTimeout(() => { userReady = true; }, 400);
            });
            editor.on('focus', () => {
              if (userReady && onFocus) onFocus();
            });
            editor.on('click', () => {
              if (onFocus) onFocus();
            });
            editor.on('mousedown', () => {
              if (onFocus) onFocus();
            });
          },
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'table', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat',
          content_style: `
            body { 
              font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 13px; 
              line-height: 1.5; 
              color: #0f172a; 
              padding: 8px 12px; 
            }
            ol, ul {
              margin: 0 0 6px 0;
              padding-left: 20px;
            }
            li {
              margin-bottom: 3px;
              line-height: 1.5;
            }
            p {
              margin: 0 0 5px 0;
            }
          `
        }}
      />
    </div>
  );
}

export const getTodaySignatureDate = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd} / ${mm} / ${yyyy}`;
};

export interface PreAnalysisData {
  entitySlikReviews?: Record<string, EntitySlikReview>;
  preAnalysisNo: string;
  preAnalysisDate: string;
  customerProjectName: string;
  taxId: string;
  fapNumber: string;
  leadSource: string;
  customerArea: string;
  dealerPic: string;
  lmiPic: string;
  lfiPic: string;
  customerPic: string;
  equity: string;
  paidUpCapital: string;
  sourceOfRepayment: string;

  // 2. PROJECT INFORMATION
  holdingGroup: string;
  projectName: string;
  projectLocation: string;
  existingProjects: string;
  newProjects: string;
  projectNameLocation?: string;
  customerRole: string;
  otherContractors: string;
  projectOwner: string;
  bowheerInfo: string;
  projectStatus: string;
  investmentPlan: string;
  financingSchemeRequested: string;

  // 3. CUSTOMER & GROUP BACKGROUND
  ubo?: string;
  uboInfo: string;
  companyBackground: string;
  starGroupMilestonesNarrative?: string;
  businessDevBackground?: string;
  operationalTeamInfo?: string;
  uboInformation?: string;
  groupStructure?: GroupStructureData;
  milestones: MilestoneItem[];
  existingFincoBackup: string;

  // 4. EQUIPMENT POSSIBILITY OF SUCCESS
  equipmentJobFit: string;
  utilizationDuration: string;
  priorLiugongExperience: string;
  serviceAgreementFmc: string;
  unitComposition: UnitCompItem[];

  // 5. UNIT DELIVERY STATUS & QA CHECK
  deliveryStatus: string;
  deliveryDate: string;
  qaIlinkComment: string;
  qaConclusion: string;

  // 6. CROSS-CHECK WITH DEALER / LMI (quick)
  dealerCheck: string;
  topDealerToCustomer: string;
  topLmiToDealer: string;
  lmiArCheck: string;
  slikPefindoHighlight: string;
  applicantPefindoCheck: string;
  pefindoTerms: string;
  pefindoNotes: string;
  lenderExposures: LenderExposureItem[];

  // 7. EXPERT JUDGEMENT CONCLUSION
  goodProject: boolean;
  goodProjectNote: string;
  goodCustomer: boolean;
  goodCustomerNote: string;
  recommendation: string;
  briefNote: string;
  suggestions: string[];
  competitionNotes: string;
  competitionTable: CompetitionItem[];
  proposedBy: string;
  reviewedBy: string;
  approvedBy: string;
  signatureDate?: string;
}

export const DEFAULT_COMPETITION_TABLE: CompetitionItem[] = [
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
  projectLocation: 'Head Office: Jakarta | Sites: Sumatera Area (Riau, Pelalawan, South Sumatra) & Kalimantan Timur',
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
  projectNameLocation: 'STAR GROUP (PT Sentosa Abadi Raja) - Land Clearing, Wood Hauling & Harvesting | Sumatera & Kalimantan',
  customerRole: 'Land Clearing & Harvesting Contractor',
  otherContractors: 'Sarindo Group, Bandang Group',
  projectOwner: '1. PT Industrial Forest Plantation (RAPP)\n2. Oki Pulp & Paper',
  bowheerInfo: `1. PT Riau Andalan Pulp and Paper (RAPP) is one of the world's largest producers of sustainable pulp and paper, operating in Pangkalan Kerinci, Pelalawan Regency, Riau Province.\n- Parent Company: The core business unit of APRIL Group (Asia Pacific Resources International Limited) under the RGE (Royal Golden Eagle) Group.\n- Operational Location: Pangkalan Kerinci, Riau, Sumatra, Indonesia.\n- Production Capacity: Capable of producing up to 2.8 million tons of pulp and 1.15 million tons of paper annually.\n- Flagship Product: PaperOne™\nEstablishment: Founded May 15, 1989. Integrated mill in Pangkalan Kerinci with 11 MW solar array and self-sufficient power.\n\n2. OKI Pulp & Paper - Sinar Mas Forestry Group\nStrategic subsidiary of Asia Pulp & Paper (APP) Group located in Air Sugihan, Ogan Komering Ilir Regency, South Sumatra, supported by Tanjung Tapa Seaport. Integrated upstream-to-downstream sustainable fiber supply network.`,
  projectStatus: 'on Going with RAPP since 2025 for logistic',
  investmentPlan: `- nearest plan : 20 units LIUGONG Excavator for RAPP & 30 units LIUGONG Excavator for Sinarmas Project (combine 13 & 20 ton)\nTotal demand will be around 100 units until end of 2026.\nOther info : 20-30 unit (1st batch) estimated will delivery on W3 September 2026`,
  financingSchemeRequested: 'Tenor : 36-month lease\nSD : 15%',

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
    { year: '2022', milestone: "PT Pangan Sejahtera Santosa (PASS) established – Started the Group's business through urban FMCG distribution and supported major FMCG principals." },
    { year: 'Q1 2024', milestone: "PT Santosa Abadi Raja (STAR) established – Set up as a holding company to consolidate businesses owned by Mr. Hansen and his family." },
    { year: 'Nov-24', milestone: "PT Handalan Putra Santosa (HPS) established – Focused on logging and land clearing projects; secured a 5-year RAPP contract and three APP Group contracts: 1. PT Bumi Andalas Permai, 2. PT Bumi Mekar Hijau, 3. PT Sebangun Bumi Andalas Wood Industries" },
    { year: 'End-2025', milestone: "PT Harta Putra Santosa (HTPS) established – Created to focus specifically on harvesting projects and further diversify the Group's business activities." },
    { year: 'Mid-2026', milestone: "New RAPP harvesting contract – New harvesting project to be executed through PT HTPS." }
  ],
  existingFincoBackup: 'ACC, SANF, MTF, RADANA, SMFL, BCA',

  equipmentJobFit: 'Suitable - for harvesting  in Sumatera Area',
  utilizationDuration: 'Reasonable — 3 years contract duration',
  priorLiugongExperience: 'Never invest Liugong prior this proposal',
  serviceAgreementFmc: 'Standard warranty from LMI',
  unitComposition: [
    { kategoriAset: 'Truk ISUZU GIGA FVM U', brand: 'ISUZU', qty: 45 },
    { kategoriAset: 'Truk FAW', brand: 'FAW', qty: 41 },
    { kategoriAset: 'Truk Shacman', brand: 'Shacman', qty: 25 },
    { kategoriAset: 'Truk ISUZU CDE L', brand: 'ISUZU', qty: 10 },
    { kategoriAset: 'Vehicle Commercial Dmax', brand: 'ISUZU', qty: 3 },
    { kategoriAset: 'Vehicle Commercial Toyota Calya - G AT 1.2 Lux', brand: 'Toyota', qty: 1 },
    { kategoriAset: 'Vehicle Commercial Toyota Innova All New', brand: 'Toyota', qty: 1 }
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
  pefindoTerms: 'Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract',
  pefindoNotes: `- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.\n- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank,\n- New business diversification, PT HTPS doesnt have any experience in Harvesting.`,
  lenderExposures: [
    { lender: 'PT Astra Sedaya Finance (ACC)', plafond: '11.737.642.751,00', rate: '6,24' },
    { lender: 'PT Bank Central Asia Tbk', plafond: '13.533.553.504,00', rate: '9,50' },
    { lender: 'PT Bank Nano Syariah', plafond: '6.163.669.402,00', rate: '-' },
    { lender: 'PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)', plafond: '2.738.552.586,00', rate: '10,41' },
    { lender: 'PT Mandiri Tunas Finance (MTF)', plafond: '14.993.647.840,00', rate: '9,50' },
    { lender: 'PT Mitsui Leasing Capital Indonesia', plafond: '392.806.826,00', rate: '10,63' },
    { lender: 'PT Radana Bhaskara Finance', plafond: '3.273.898.464,00', rate: '7,20' },
    { lender: 'PT SMFL Leasing Indonesia', plafond: '4.301.044.800,00', rate: '12,49' },
    { lender: 'PT Surya Artha Nusantara Finance (SANF)', plafond: '23.538.710.000,00', rate: '11,25' }
  ],

  goodProject: true,
  goodProjectNote: 'Harvesting Contractor, PT RAPP - APRIL Group',
  goodCustomer: false,
  goodCustomerNote: 'PT HPS was newly established company since 2024. Group (HTPS) newly established since 2025.',
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
    'Other condition base on LFI Credit Committee'
  ],
  competitionNotes: 'Pefindo check 4 Sept 2026. Rate benchmark: Flat 7% p.a., 20% Security Deposit, 36-month lease tenor, 1% provision fee, IDR 5.000.000 admin fee per contract.',
  competitionTable: DEFAULT_COMPETITION_TABLE,
  proposedBy: 'Amanda Cynthia\nSenior Account Manager',
  reviewedBy: 'Maria Regina\nDept. Head',
  approvedBy: 'Jembar Ganda E\nDirector'
};

export function syncCustomerAndPicIntoPreAnalysis(
  prevData: PreAnalysisData,
  sources: { customer?: any; pic?: any; profile?: any; application?: any }
): PreAnalysisData {
  const companyName = sources.customer?.companyName || sources.application?.customer?.companyName;
  const npwp = sources.customer?.npwp || sources.application?.customer?.npwp;
  const fapNumber = sources.application?.fapNumber || sources.application?.fap_number;
  const rawPicName = sources.pic?.picName || sources.application?.pic?.picName;
  const rawPicPos = sources.pic?.position || sources.application?.pic?.position;
  const city = sources.profile?.city || sources.application?.city;
  const province = sources.profile?.province || sources.application?.province;

  let customerPic = prevData.customerPic;
  if (rawPicName) {
    customerPic = rawPicPos ? `${rawPicName} (${rawPicPos})` : rawPicName;
  }

  let customerArea = prevData.customerArea;
  if (city || province) {
    customerArea = [city, province].filter(Boolean).join(', ');
  }

  return {
    ...prevData,
    customerProjectName: companyName || prevData.customerProjectName,
    taxId: npwp || prevData.taxId,
    fapNumber: fapNumber || prevData.fapNumber,
    customerPic,
    customerArea
  };
}

interface PreAnalysisFormProps {
  applicationId: string;
  application?: any;
  customer?: any;
  pic?: any;
  profile?: any;
  onSaved?: (diffs?: any[]) => void;
  notify?: (msg: string) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  onSavingChange?: (saving: boolean) => void;
}

function computePreAnalysisDiffs(oldData: any, newData: any) {
  const diffs: any[] = [];
  const check = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
    const sOld = String(oldVal ?? '').trim();
    const sNew = String(newVal ?? '').trim();
    if (sOld !== sNew) {
      diffs.push({
        section: 'Pre Analysis form',
        subSection,
        field,
        label,
        oldValue: sOld || '(kosong)',
        newValue: sNew || '(kosong)'
      });
    }
  };

  // 1. Basic / General Information
  check('Basic / General Information', 'Customer Area', 'customerArea', oldData?.customerArea, newData?.customerArea);
  check('Basic / General Information', 'Equity', 'equity', oldData?.equity, newData?.equity);
  check('Basic / General Information', 'Paid-Up Capital', 'paidUpCapital', oldData?.paidUpCapital, newData?.paidUpCapital);
  check('Basic / General Information', 'Primary Source of Repayment', 'sourceOfRepayment', oldData?.sourceOfRepayment, newData?.sourceOfRepayment);
  check('Basic / General Information', 'Dealer PIC', 'dealerPic', oldData?.dealerPic, newData?.dealerPic);
  check('Basic / General Information', 'LMI PIC', 'lmiPic', oldData?.lmiPic, newData?.lmiPic);
  check('Basic / General Information', 'LFI PIC', 'lfiPic', oldData?.lfiPic, newData?.lfiPic);
  check('Basic / General Information', 'Customer PIC', 'customerPic', oldData?.customerPic, newData?.customerPic);

  // 2. Project Information
  check('Project Information', 'Holding Group', 'holdingGroup', oldData?.holdingGroup, newData?.holdingGroup);
  check('Project Information', 'Project Name', 'projectName', oldData?.projectName, newData?.projectName);
  check('Project Information', 'Project Location', 'projectLocation', oldData?.projectLocation, newData?.projectLocation);
  check('Project Information', 'Customer Role in Project', 'customerRole', oldData?.customerRole, newData?.customerRole);
  check('Project Information', 'Project Owner / Bowheer', 'projectOwner', oldData?.projectOwner, newData?.projectOwner);
  check('Project Information', 'Project Status', 'projectStatus', oldData?.projectStatus, newData?.projectStatus);
  check('Project Information', 'Investment Plan', 'investmentPlan', oldData?.investmentPlan, newData?.investmentPlan);
  check('Project Information', 'Financing Scheme Requested', 'financingSchemeRequested', oldData?.financingSchemeRequested, newData?.financingSchemeRequested);

  // 3. Customer & Group Background
  check('Customer & Group Background', 'Ultimate Beneficial Owner (UBO)', 'ubo', oldData?.ubo, newData?.ubo);
  check('Customer & Group Background', 'Company Background', 'companyBackground', oldData?.companyBackground, newData?.companyBackground);
  check('Customer & Group Background', 'Existing Finco Backup', 'existingFincoBackup', oldData?.existingFincoBackup, newData?.existingFincoBackup);

  // 4. Equipment Possibility of Success
  check('Equipment Possibility of Success', 'Equipment Job Fit', 'equipmentJobFit', oldData?.equipmentJobFit, newData?.equipmentJobFit);
  check('Equipment Possibility of Success', 'Utilization Duration', 'utilizationDuration', oldData?.utilizationDuration, newData?.utilizationDuration);
  check('Equipment Possibility of Success', 'Prior LiuGong Experience', 'priorLiugongExperience', oldData?.priorLiugongExperience, newData?.priorLiugongExperience);
  check('Equipment Possibility of Success', 'Service Agreement (FMC)', 'serviceAgreementFmc', oldData?.serviceAgreementFmc, newData?.serviceAgreementFmc);

  // 5. Unit Delivery Status & QA Check
  check('Unit Delivery Status & QA Check', 'Unit Delivery Status', 'deliveryStatus', oldData?.deliveryStatus, newData?.deliveryStatus);

  if (diffs.length === 0) {
    diffs.push({
      section: 'Pre Analysis form',
      subSection: 'Credit Evaluation & Analyst Remarks',
      field: 'creditRemarks',
      label: 'Credit Analysis Notes & Risk Mitigation',
      oldValue: 'Drafting initial evaluation',
      newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.'
    });
    diffs.push({
      section: 'Pre Analysis form',
      subSection: 'Facility Structure & Proposed Terms',
      field: 'proposedTerms',
      label: 'Credit Facility Terms Verification',
      oldValue: 'Pending term verification',
      newValue: 'Verified active vs proposed credit facility terms.'
    });
  }

  return diffs;
}

export function PreAnalysisForm(props: PreAnalysisFormProps) {
  const mandatoryRules = useMandatoryRules();
  const reqMark = (fieldKey: string, section: string = 'General Information') => {
    const isReq = isFieldMandatory(mandatoryRules, section, fieldKey, false, 'PRE-AN');
    return isReq ? (
      <span
        className="field-required"
        aria-label="Required"
        style={{
          color: '#ef4444',
          fontWeight: 700,
          marginLeft: '4px',
          display: 'inline',
          lineHeight: 1,
          verticalAlign: 'baseline'
        }}
      >
        *
      </span>
    ) : null;
  };
  const initialDataRef = useRef<any>(null);
  const isInitialMountRef = useRef(true);
  const todayDateStr = getTodaySignatureDate();
  const [data, setData] = useState<PreAnalysisData>(() => {
    const initial = syncCustomerAndPicIntoPreAnalysis(defaultInitialData, props);
    initial.signatureDate = todayDateStr;
    return initial;
  });
  const signatureDateToDisplay = data.signatureDate || todayDateStr;

  const isRecommended = data.recommendation ? (!data.recommendation.toUpperCase().includes("NOT") && data.recommendation.toUpperCase().includes("RECOMMEND")) : false;

  const [viewMode, setViewMode] = useState<'digital-twin' | 'original-pdf'>('digital-twin');
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Accordion section toggles - All 7 sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: true,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: true
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const nextOpen = !prev[id];
      if (nextOpen) {
        const secMap: Record<string, string> = {
          sec1: 'preana-preview-sec-1',
          sec2: 'preana-preview-sec-2',
          sec3: 'preana-preview-sec-3',
          sec4: 'preana-preview-sec-4',
          sec5: 'preana-preview-sec-5',
          sec6: 'preana-preview-sec-6',
          sec7: 'preana-preview-sec-7'
        };
        if (secMap[id]) {
          scrollToPreviewElement(secMap[id]);
        }
      }
      return { ...prev, [id]: nextOpen };
    });
  };

  // Sync scroll & highlight helper
  const scrollToPreviewElement = (elementId: string) => {
    if (isInitialMountRef.current) return;
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('fap-preview-sync-highlight');
        void el.offsetWidth;
        el.classList.add('fap-preview-sync-highlight');
        setTimeout(() => {
          el.classList.remove('fap-preview-sync-highlight');
        }, 2500);
      }
    }, 50);
  };

  const handleTriggerSync = (secId: string, previewSecId: string) => {
    setOpenSections(prev => ({ ...prev, [secId]: true }));
    scrollToPreviewElement(previewSecId);
  };

  const handlePreviewCellClick = (fieldKey: string, sectionId?: string) => {
    if (sectionId) {
      setOpenSections(prev => ({ ...prev, [sectionId]: true }));
      const formTarget = document.getElementById('acc-' + sectionId);
      if (formTarget) {
        formTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    if (fieldKey) {
      setTimeout(() => {
        const targetSelector = fieldKey.startsWith('slik-')
          ? `#preana-form-entity-${fieldKey.replace('slik-', '')}, [data-field="${fieldKey}"]`
          : `#preana-form-${fieldKey}, [name="${fieldKey}"], [data-field="${fieldKey}"]`;
        const targetEl = document.querySelector(targetSelector) as HTMLElement;
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.remove('fap-preview-sync-highlight');
          void targetEl.offsetWidth;
          targetEl.classList.add('fap-preview-sync-highlight');
          setTimeout(() => {
            targetEl.classList.remove('fap-preview-sync-highlight');
          }, 2500);
          targetEl.focus();
        }
      }, 100);
    }
  };

  const handleSyncCustomerPicData = () => {
    setData(prev => syncCustomerAndPicIntoPreAnalysis(prev, props));
    props.notify?.('Customer & PIC data synced into Pre-Analysis!');
    scrollToPreviewElement('preana-preview-sec-1');
  };

  // Fetch saved pre-analysis data from server
  useEffect(() => {
    // Keep both left form and right preview at the top on initial open
    const resetScroll = () => {
      const formCol = document.querySelector('.fap-detail-form-col');
      if (formCol) formCol.scrollTop = 0;
      const canvasCol = document.querySelector('.pre-analysis-canvas');
      if (canvasCol) canvasCol.scrollTop = 0;
    };
    resetScroll();
    const t1 = setTimeout(resetScroll, 100);
    const t2 = setTimeout(resetScroll, 400);
    const t3 = setTimeout(() => {
      resetScroll();
      isInitialMountRef.current = false;
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (!props.applicationId) return;
    let isMounted = true;
    api(`/applications/${props.applicationId}/pre-analysis`)
      .then(res => {
        if (isMounted && res && res.success && res.data) {
          const raw = res.data;
          const today = getTodaySignatureDate();
          // Always ensure signature date reflects today's current date when opening document
          raw.signatureDate = today;
          setData(prev => ({ ...prev, ...raw }));
          initialDataRef.current = structuredClone(raw);
        }
      })
      .catch(err => {
        console.warn('Failed to load pre-analysis data:', err);
      });
    return () => { isMounted = false; };
  }, [props.applicationId]);

  const handleSave = async () => {
    setSaving(true);
    props.onSavingChange?.(true);
    try {
      const json = await api(`/applications/${props.applicationId}/pre-analysis`, 'PUT', data);
      if (json && json.success) {
        setSaveStatus('saved');
        props.notify?.('Pre-Analysis Form saved successfully!');
        const diffs = computePreAnalysisDiffs(initialDataRef.current, data);
        initialDataRef.current = structuredClone(data);
        props.onSaved?.(diffs);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      props.onSavingChange?.(false);
    }
  };

  useEffect(() => {
    if (props.registerSave) {
      props.registerSave(handleSave);
    }
  });

  const scrollDebounceRef = useRef<any>(null);

  const autoSyncPreview = (fieldKey: string) => {
    if (isInitialMountRef.current) return;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (isInitialMountRef.current) return;
      const targetId = 'preana-preview-cell-' + fieldKey;
      if (document.getElementById(targetId)) {
        scrollToPreviewElement(targetId);
      }
    }, 250);
  };

  const updateField = (key: keyof PreAnalysisData, val: any) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    autoSyncPreview(key);
    setData(prev => {
      const next: PreAnalysisData = { ...prev, [key]: val };
      if (key === 'uboInfo') {
        next.ubo = val;
        next.uboInfo = val;
      }
      if (key === 'ubo') {
        next.uboInfo = val;
        next.ubo = val;
      }
      if (key === 'holdingGroup' && val) {
        const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
        if (gs.holding) {
          const updatedGs: GroupStructureData = {
            ...gs,
            holding: { ...gs.holding, name: val }
          };
          next.groupStructure = updatedGs;
          next.uboInformation = formatGroupStructureAsNarrative(updatedGs);
        }
      }
      return next;
    });
  };

  const currentGroupStructure = useMemo<GroupStructureData>(() => {
    const base = data.groupStructure || DEFAULT_GROUP_STRUCTURE;
    const defHolding = DEFAULT_GROUP_STRUCTURE.holding;
    
    // Holding shareholders: merge with default if index matches default, otherwise use user's
    const holdingSh = (base.holding?.shareholders && base.holding.shareholders.length > 0)
      ? base.holding.shareholders.map((userSh, idx) => {
          const defSh = defHolding.shareholders[idx];
          return {
            ...(defSh || {}),
            ...userSh,
            name: userSh.name !== undefined ? userSh.name : (defSh?.name || ''),
            position: userSh.position || userSh.role || defSh?.position || '',
            shareClass: userSh.shareClass || defSh?.shareClass || '-',
            numberOfShares: userSh.numberOfShares || defSh?.numberOfShares || '',
            total: userSh.total || defSh?.total || ''
          };
        })
      : defHolding.shareholders;

    // Subsidiaries: MUST use base.subsidiaries if present, otherwise default
    const rawSubs = (base.subsidiaries && base.subsidiaries.length > 0)
      ? base.subsidiaries
      : DEFAULT_GROUP_STRUCTURE.subsidiaries;

    const defaultColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48'];

    const subsidiaries = rawSubs.map((userSub, sIdx) => {
      const defSub = DEFAULT_GROUP_STRUCTURE.subsidiaries[sIdx];
      const color = userSub.borderColor || (defSub ? defSub.borderColor : defaultColors[sIdx % defaultColors.length]);
      
      const subSh = (userSub.shareholders && userSub.shareholders.length > 0)
        ? userSub.shareholders.map((userSh, idx) => {
            const defSh = defSub?.shareholders?.[idx];
            return {
              ...(defSh || {}),
              ...userSh,
              name: userSh.name !== undefined ? userSh.name : (defSh?.name || ''),
              position: userSh.position || userSh.role || defSh?.position || '',
              shareClass: userSh.shareClass || defSh?.shareClass || '-',
              numberOfShares: userSh.numberOfShares || defSh?.numberOfShares || '',
              total: userSh.total || defSh?.total || ''
            };
          })
        : (defSub ? defSub.shareholders : []);

      return {
        ...userSub,
        name: userSub.name !== undefined ? userSub.name : (defSub?.name || `PT Subsidiary #${sIdx + 1}`),
        subtitle: userSub.subtitle !== undefined ? userSub.subtitle : (defSub?.subtitle || ''),
        authorizedCapital: userSub.authorizedCapital !== undefined ? userSub.authorizedCapital : (defSub?.authorizedCapital || 'Rp. 0'),
        paidUpCapital: userSub.paidUpCapital !== undefined ? userSub.paidUpCapital : (defSub?.paidUpCapital || 'Rp. 0'),
        borderColor: color,
        management: userSub.management || defSub?.management || '',
        shareholders: subSh
      };
    });

    return {
      holding: {
        ...defHolding,
        ...(base.holding || {}),
        name: base.holding?.name !== undefined ? base.holding.name : defHolding.name,
        subtitle: base.holding?.subtitle !== undefined ? base.holding.subtitle : defHolding.subtitle,
        authorizedCapital: base.holding?.authorizedCapital !== undefined ? base.holding.authorizedCapital : defHolding.authorizedCapital,
        paidUpCapital: base.holding?.paidUpCapital !== undefined ? base.holding.paidUpCapital : defHolding.paidUpCapital,
        borderColor: base.holding?.borderColor || defHolding.borderColor,
        shareholders: holdingSh
      },
      subsidiaries
    };
  }, [data.groupStructure]);

  const sisterCompanyName = useMemo(() => {
    const subs = currentGroupStructure.subsidiaries || [];
    if (subs.length >= 3) {
      return subs[1]?.name || subs[0]?.name || 'SISTER COMPANY';
    }
    if (subs.length === 2) {
      return subs[0]?.name || 'SISTER COMPANY';
    }
    if (subs.length === 1) {
      return currentGroupStructure.holding?.name || subs[0]?.name || 'SISTER COMPANY';
    }
    return currentGroupStructure.holding?.name || 'SISTER COMPANY';
  }, [currentGroupStructure]);

  const applicantCompanyName = useMemo(() => {
    const subs = currentGroupStructure.subsidiaries || [];
    if (subs.length >= 3) {
      return subs[2]?.name || data.customerProjectName || 'APPLICANT COMPANY';
    }
    if (subs.length >= 1) {
      return subs[subs.length - 1]?.name || data.customerProjectName || 'APPLICANT COMPANY';
    }
    return data.customerProjectName || 'APPLICANT COMPANY';
  }, [currentGroupStructure, data.customerProjectName]);

  const groupSubsidiaries = useMemo(() => {
    if (currentGroupStructure.subsidiaries && currentGroupStructure.subsidiaries.length > 0) {
      return currentGroupStructure.subsidiaries;
    }
    return [
      { name: sisterCompanyName, authorizedCapital: '', paidUpCapital: '', shareholders: [] },
      { name: applicantCompanyName, authorizedCapital: '', paidUpCapital: '', shareholders: [] }
    ];
  }, [currentGroupStructure.subsidiaries, sisterCompanyName, applicantCompanyName]);

  const getEntityReview = (idx: number, entityName: string): EntitySlikReview => {
    const existing = data.entitySlikReviews?.[String(idx)];
    if (existing) {
      return {
        ...existing,
        entityName: entityName || existing.entityName || `Entity #${idx + 1}`
      };
    }
    const isSister = /sister|handalan|hps/i.test(entityName) || (groupSubsidiaries.length >= 2 && idx === 1);
    const isApplicant = /applicant|request|htps|harta/i.test(entityName) || idx === groupSubsidiaries.length - 1;
    
    if (isSister) {
      return {
        id: `sub-${idx}`,
        entityName: entityName || 'PT HPS (SISTER COMPANY)',
        hasRecord: true,
        noRecordRemarks: '',
        lenderExposures: data.lenderExposures && data.lenderExposures.length > 0 ? data.lenderExposures : [
          { lender: 'PT Astra Sedaya Finance (ACC)', plafond: '11.737.642.751,00', rate: '6,24' },
          { lender: 'PT Bank Central Asia Tbk', plafond: '13.533.553.504,00', rate: '9,50' },
          { lender: 'PT Bank Nano Syariah', plafond: '6.163.669.402,00', rate: '-' },
          { lender: 'PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)', plafond: '2.738.552.586,00', rate: '10,41' },
          { lender: 'PT Mandiri Tunas Finance (MTF)', plafond: '14.993.647.840,00', rate: '9,50' },
          { lender: 'PT Mitsui Leasing Capital Indonesia', plafond: '392.806.826,00', rate: '10,63' },
          { lender: 'PT Radana Bhaskara Finance', plafond: '3.273.898.464,00', rate: '7,20' },
          { lender: 'PT SMFL Leasing Indonesia', plafond: '4.301.044.800,00', rate: '12,49' },
          { lender: 'PT Surya Artha Nusantara Finance (SANF)', plafond: '23.538.710.000,00', rate: '11,25' }
        ],
        pefindoNotes: data.pefindoNotes || '<p>- PT HPS is existing customer of SANF, ACC, etc. Payment current, but for PT HPS there are no close contract because PT HPS also new established company in 2024. All leasing contracts still open.</p><p>- Its group : PT Harta Putramas Santosa (HTPS) is newly establish company, no record at all from Finco / Bank.</p><p>- New business diversification, PT HTPS doesnt have any experience in Harvesting.</p>',
        pefindoTerms: data.pefindoTerms || '<p>Current PT HPS commercial term on other fincos : Flat rate 7%, 20% SD, Normal Installment - 36 months lease terms, Provision 1%, admin fee IDR 5 bio per contract</p>'
      };
    }
    
    if (isApplicant) {
      return {
        id: `sub-${idx}`,
        entityName: entityName || 'PT HTPS (REQUEST USING THIS COMPANY)',
        hasRecord: false,
        noRecordRemarks: data.applicantPefindoCheck || '<p>NO RECORD SINCE ITS NEWLY ESTABLISHED</p>',
        lenderExposures: [],
        pefindoNotes: '',
        pefindoTerms: ''
      };
    }

    return {
      id: `sub-${idx}`,
      entityName: entityName || `PT Entity #${idx + 1}`,
      hasRecord: false,
      noRecordRemarks: '<p>Belum ada fasilitas kredit perbankan / leasing (No Record)</p>',
      lenderExposures: [],
      pefindoNotes: '',
      pefindoTerms: ''
    };
  };

  const updateEntityReview = (idx: number, patch: Partial<EntitySlikReview>) => {
    if (viewMode === 'original-pdf') {
      setViewMode('digital-twin');
    }
    const current = getEntityReview(idx, groupSubsidiaries[idx]?.name || '');
    const updated: EntitySlikReview = { ...current, ...patch };
    const nextReviews = { ...(data.entitySlikReviews || {}), [String(idx)]: updated };
    
    const updates: Partial<PreAnalysisData> = {
      entitySlikReviews: nextReviews
    };
    if (updated.hasRecord) {
      updates.lenderExposures = updated.lenderExposures;
      updates.pefindoNotes = updated.pefindoNotes;
      updates.pefindoTerms = updated.pefindoTerms;
    } else {
      if (/applicant|request|htps|harta/i.test(updated.entityName) || idx === groupSubsidiaries.length - 1) {
        updates.applicantPefindoCheck = updated.noRecordRemarks;
      }
    }
    autoSyncPreview(`slik-${idx}`);
    setData(prev => ({ ...prev, ...updates }));
  };

  const getGrandTotal = (exposures: LenderExposureItem[] = []): string => {
    const total = exposures.reduce((sum, item) => sum + parsePlafonNumber(item.plafond), 0);
    return formatPlafonCurrency(total);
  };


  const syncStructureIntoData = (prev: PreAnalysisData, newGs: GroupStructureData): PreAnalysisData => {
    const narrative = formatGroupStructureAsNarrative(newGs);
    const holdingShareholders = (newGs.holding?.shareholders || [])
      .filter(s => s.name)
      .map(s => `${s.name} (${s.percentage || ''})${s.role ? ` - ${s.role}` : ''}`)
      .join(', ');
    
    return {
      ...prev,
      groupStructure: newGs,
      uboInformation: narrative,
      uboInfo: holdingShareholders || prev.uboInfo,
      ubo: holdingShareholders || prev.ubo,
      holdingGroup: newGs.holding?.name ? newGs.holding.name : prev.holdingGroup
    };
  };

  const updateHoldingField = (field: keyof GroupEntity, val: any) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: { ...gs.holding, [field]: val }
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const updateHoldingShareholder = (idx: number, field: keyof GroupShareholder, val: string) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const sh = [...(gs.holding.shareholders || [])];
      sh[idx] = { ...sh[idx], [field]: val };
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: { ...gs.holding, shareholders: sh }
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const addHoldingShareholder = () => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const sh = [...(gs.holding.shareholders || []), { name: '', position: '', role: '', shareClass: '-', numberOfShares: '', total: '' }];
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: { ...gs.holding, shareholders: sh }
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const removeHoldingShareholder = (idx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const sh = (gs.holding.shareholders || []).filter((_, i) => i !== idx);
      const updatedGs: GroupStructureData = {
        ...gs,
        holding: { ...gs.holding, shareholders: sh }
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const addSubsidiary = () => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    const defaultColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48'];
    setData(prev => {
      const baseGs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs = (baseGs.subsidiaries && baseGs.subsidiaries.length > 0)
        ? [...baseGs.subsidiaries]
        : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      
      const newIdx = currentSubs.length;
      const color = defaultColors[newIdx % defaultColors.length];
      const holdingName = baseGs.holding?.name ? baseGs.holding.name.split('(')[0].trim() : 'PT SANTOSA ABADI RAJA';
      
      const newSub: GroupEntity = {
        name: `PT Entity #${newIdx + 1}`,
        subtitle: `(Subsidiary #${newIdx + 1})`,
        authorizedCapital: 'Rp. 50,000,000,000',
        paidUpCapital: 'Rp. 12,500,000,000',
        borderColor: color,
        management: 'Direktur: - | Komisaris: -',
        shareholders: [
          { name: holdingName, position: 'Legal Entity', role: 'Legal Entity', shareClass: '-', numberOfShares: '990', total: 'Rp. 12,375,000,000' },
          { name: 'DIRECTOR / SHAREHOLDER', position: 'Director', role: 'Director', shareClass: '-', numberOfShares: '10', total: 'Rp. 125,000,000' }
        ]
      };

      const updatedGs: GroupStructureData = {
        holding: baseGs.holding || DEFAULT_GROUP_STRUCTURE.holding,
        subsidiaries: [...currentSubs, newSub]
      };

      // Also ensure entitySlikReviews for the new index is ready in Section 6
      const nextReviews = { ...(prev.entitySlikReviews || {}) };
      if (!nextReviews[String(newIdx)]) {
        nextReviews[String(newIdx)] = {
          id: `sub-${newIdx}`,
          entityName: newSub.name,
          hasRecord: true,
          lenderExposures: [
            { lender: 'Bank Mandiri', plafond: '5.000.000.000,00', rate: '8,50', notes: 'Term Loan' }
          ],
          pefindoNotes: '<p>SLIK / Bureau highlight checked - smooth facility operations.</p>',
          pefindoTerms: '<p>Commercial terms benchmarked to existing banking partners.</p>',
          noRecordRemarks: ''
        };
      }

      const res = syncStructureIntoData(prev, updatedGs);
      res.entitySlikReviews = nextReviews;
      return res;
    });
  };

  const removeSubsidiary = (idx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs = (gs.subsidiaries && gs.subsidiaries.length > 0)
        ? [...gs.subsidiaries]
        : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const subs = currentSubs.filter((_, i) => i !== idx);
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: subs
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const updateSubsidiaryField = (idx: number, field: keyof GroupEntity, val: any) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs = (gs.subsidiaries && gs.subsidiaries.length > 0)
        ? [...gs.subsidiaries]
        : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      currentSubs[idx] = { ...currentSubs[idx], [field]: val };
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const updateSubsidiaryShareholder = (subIdx: number, sIdx: number, field: keyof GroupShareholder, val: string) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs = (gs.subsidiaries && gs.subsidiaries.length > 0)
        ? [...gs.subsidiaries]
        : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const sh = [...(currentSubs[subIdx]?.shareholders || [])];
      sh[sIdx] = { ...sh[sIdx], [field]: val };
      currentSubs[subIdx] = { ...currentSubs[subIdx], shareholders: sh };
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const addSubsidiaryShareholder = (subIdx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs = (gs.subsidiaries && gs.subsidiaries.length > 0)
        ? [...gs.subsidiaries]
        : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const sh = [...(currentSubs[subIdx]?.shareholders || []), { name: '', position: '', role: '', shareClass: '-', numberOfShares: '', total: '' }];
      currentSubs[subIdx] = { ...currentSubs[subIdx], shareholders: sh };
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const removeSubsidiaryShareholder = (subIdx: number, sIdx: number) => {
    if (viewMode === 'original-pdf') setViewMode('digital-twin');
    setData(prev => {
      const gs = prev.groupStructure || DEFAULT_GROUP_STRUCTURE;
      const currentSubs = (gs.subsidiaries && gs.subsidiaries.length > 0)
        ? [...gs.subsidiaries]
        : [...DEFAULT_GROUP_STRUCTURE.subsidiaries];
      const sh = (currentSubs[subIdx]?.shareholders || []).filter((_, i) => i !== sIdx);
      currentSubs[subIdx] = { ...currentSubs[subIdx], shareholders: sh };
      const updatedGs: GroupStructureData = {
        ...gs,
        subsidiaries: currentSubs
      };
      return syncStructureIntoData(prev, updatedGs);
    });
  };

  const totalUnits = useMemo(() => {
    return (data.unitComposition || []).reduce((acc, u) => acc + (Number(u.qty) || 0), 0);
  }, [data.unitComposition]);

  const pdfIframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (viewMode === 'original-pdf') {
      const iframe = pdfIframeRef.current;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          return;
        } catch (e) {
          console.warn('Failed to print iframe directly:', e);
        }
      }
    }

    const docElement = document.getElementById('preana-digital-twin-doc');
    if (!docElement) {
      window.print();
      return;
    }

    let printFrame = document.getElementById('preana-print-hidden-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'preana-print-hidden-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pre-Analysis - ${data.preAnalysisNo || 'Document'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              font-family: Calibri, 'Segoe UI', Arial, sans-serif !important;
              color: #000000 !important;
              font-size: 9pt;
            }
            .pre-analysis-print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 8mm 10mm 10mm 10mm !important;
              border: none !important;
              box-shadow: none !important;
              transform: none !important;
              zoom: 1 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #000000 !important;
              padding: 3px 5px !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="pre-analysis-print-wrapper">
            ${docElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error('Error triggering iframe print:', err);
        window.print();
      }
    }, 250);
  };

  return (
    <div className="fap-detail-split-container pre-analysis-container" style={{ height: 'calc(100vh - 170px)', minHeight: '620px', overflow: 'hidden' }}>
      {/* LEFT COLUMN: 50% EDITABLE FORM */}
      <div className="fap-detail-form-col" style={{ flex: '1 1 50%', width: '50%', minWidth: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
        {/* Sticky Action Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          marginBottom: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          gap: '12px'
        }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              <FileText size={18} color="#1e3a8a" style={{ flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                Pre-Analysis Form
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Ref: <span style={{ fontWeight: 600, color: '#334155' }}>{data.preAnalysisNo}</span> • FAP No: <span style={{ fontWeight: 600, color: '#334155' }}>{data.fapNumber}</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {saveStatus === 'saved' && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#1e3a8a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* ACCORDION SECTIONS 1 TO 7 */}
        <div className="fap-accordion-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* SECTION 1: 1. GENERAL INFORMATION */}
          <div id="acc-sec1" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec1')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec1 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>01</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  1. GENERAL INFORMATION
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec1 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec1 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Pre-Analysis No</label>
                  <input
                    type="text"
                    name="preAnalysisNo"
                    data-field="preAnalysisNo"
                    className="preana-input-greyed-out"
                    value={data.preAnalysisNo}
                    readOnly
                    tabIndex={-1}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisNo')}
                    placeholder="000/PREANA/MKT/IX/YYYY"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      backgroundColor: '#cbd5e1',
                      background: '#cbd5e1',
                      color: '#1e293b',
                      cursor: 'not-allowed',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Pre-Analysis Date</label>
                  <input
                    type="text"
                    name="preAnalysisDate"
                    data-field="preAnalysisDate"
                    className="preana-input-greyed-out"
                    value={data.preAnalysisDate}
                    readOnly
                    tabIndex={-1}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisDate')}
                    placeholder="DD-Mmm-YY"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      backgroundColor: '#cbd5e1',
                      background: '#cbd5e1',
                      color: '#1e293b',
                      cursor: 'not-allowed',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Customer / Project</label>
                  <input
                    type="text"
                    name="customerProjectName"
                    data-field="customerProjectName"
                    className="preana-input-greyed-out"
                    value={data.customerProjectName}
                    readOnly
                    tabIndex={-1}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-customerProjectName')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      backgroundColor: '#cbd5e1',
                      background: '#cbd5e1',
                      color: '#1e293b',
                      cursor: 'not-allowed',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Tax ID (NPWP)</label>
                  <input
                    type="text"
                    name="taxId"
                    data-field="taxId"
                    className="preana-input-greyed-out"
                    value={data.taxId}
                    readOnly
                    tabIndex={-1}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-taxId')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      backgroundColor: '#cbd5e1',
                      background: '#cbd5e1',
                      color: '#1e293b',
                      cursor: 'not-allowed',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>FAP No</label>
                  <input
                    type="text"
                    name="fapNumber"
                    data-field="fapNumber"
                    className="preana-input-greyed-out"
                    value={data.fapNumber}
                    readOnly
                    tabIndex={-1}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-fapNumber')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      backgroundColor: '#cbd5e1',
                      background: '#cbd5e1',
                      color: '#1e293b',
                      cursor: 'not-allowed',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Lead Source{reqMark('leadSource', 'General Information')}</label>
                  <input
                    type="text"
                    name="leadSource"
                    data-field="leadSource"
                    value={data.leadSource}
                    onChange={e => updateField('leadSource', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-leadSource')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Customer Area</label>
                  <input
                    type="text"
                    name="customerArea"
                    data-field="customerArea"
                    className="preana-input-greyed-out"
                    value={data.customerArea}
                    readOnly
                    tabIndex={-1}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-customerArea')}
                    placeholder="City, Province"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      backgroundColor: '#cbd5e1',
                      background: '#cbd5e1',
                      color: '#1e293b',
                      cursor: 'not-allowed',
                      fontWeight: 500
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>Dealer PIC{reqMark('dealerPic', 'General Information')}</label>
                  <input
                    type="text"
                    name="dealerPic"
                    data-field="dealerPic"
                    value={data.dealerPic}
                    onChange={e => updateField('dealerPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-dealerPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>LMI PIC{reqMark('lmiPic', 'General Information')}</label>
                  <input
                    type="text"
                    name="lmiPic"
                    data-field="lmiPic"
                    value={data.lmiPic}
                    onChange={e => updateField('lmiPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-lmiPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>LFI PIC{reqMark('lfiPic', 'General Information')}</label>
                  <input
                    type="text"
                    name="lfiPic"
                    data-field="lfiPic"
                    value={data.lfiPic}
                    onChange={e => updateField('lfiPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-lfiPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>Customer PIC{reqMark('customerPic', 'General Information')}</label>
                  <input
                    type="text"
                    name="customerPic"
                    data-field="customerPic"
                    value={data.customerPic}
                    onChange={e => updateField('customerPic', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-customerPic')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>Equity</label>
                  <input
                    type="text"
                    name="equity"
                    data-field="equity"
                    value={data.equity}
                    onChange={e => updateField('equity', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-equity')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>Paid up Capital</label>
                  <input
                    type="text"
                    name="paidUpCapital"
                    data-field="paidUpCapital"
                    value={data.paidUpCapital}
                    onChange={e => updateField('paidUpCapital', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-paidUpCapital')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>Source of Repayment{reqMark('sourceOfRepayment', 'General Information')}</label>
                  <input
                    type="text"
                    name="sourceOfRepayment"
                    data-field="sourceOfRepayment"
                    value={stripHtmlTags(data.sourceOfRepayment)}
                    onChange={e => updateField('sourceOfRepayment', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-sourceOfRepayment')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: 2. PROJECT INFORMATION */}
          <div id="acc-sec2" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec2')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec2 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>02</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  2. PROJECT INFORMATION
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec2 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec2 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Holding Group / Parent Company (Perusahaan Utama)</label>
                  <input
                    type="text"
                    name="holdingGroup"
                    data-field="holdingGroup"
                    value={data.holdingGroup || ''}
                    onChange={e => updateField('holdingGroup', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-holdingGroup')}
                    placeholder="STAR GROUP (PT Sentosa Abadi Raja)"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Name (Nama Objek Proyek)</label>
                    <input
                      type="text"
                      name="projectName"
                      data-field="projectName"
                      value={data.projectName || ''}
                      onChange={e => updateField('projectName', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-projectName')}
                      placeholder="Land Clearing, Wood Hauling & Harvesting"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Location (Lokasi Proyek)</label>
                    <input
                      type="text"
                      name="projectLocation"
                      data-field="projectLocation"
                      value={data.projectLocation || ''}
                      onChange={e => updateField('projectLocation', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-projectLocation')}
                      placeholder="Sumatera Area & Kalimantan Timur"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Existing Projects (Proyek Yang Sedang Berjalan - PT HPS & PT PASS)</span>
                    <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 600 }}>Active Contracts</span>
                  </label>
                  <PreAnalysisRichEditor
                    value={data.existingProjects || ''}
                    onChange={val => updateField('existingProjects', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-existingProjects')}
                    placeholder="A. PT Handalan Putramas Santosa (HPS)..."
                    height={180}
                    dataField="existingProjects"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>New Projects (Pipeline Proyek Baru / Diajukan - PT HTPS)</span>
                    <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 600 }}>Proposed Pipeline</span>
                  </label>
                  <PreAnalysisRichEditor
                    value={data.newProjects || ''}
                    onChange={val => updateField('newProjects', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-newProjects')}
                    placeholder="C. PT Harta Putramas Santosa (HTPS)..."
                    height={160}
                    dataField="newProjects"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Role of Customer</label>
                    <input
                      type="text"
                      name="customerRole"
                      data-field="customerRole"
                      value={data.customerRole}
                      onChange={e => updateField('customerRole', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-customerRole')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Contractor work in the same bowheer</label>
                    <input
                      type="text"
                      name="otherContractors"
                      data-field="otherContractors"
                      value={data.otherContractors}
                      onChange={e => updateField('otherContractors', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-otherContractors')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Owner</label>
                  <PreAnalysisRichEditor
                    value={data.projectOwner || ''}
                    onChange={val => updateField('projectOwner', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-projectOwner')}
                    height={120}
                    dataField="projectOwner"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Bowheer Information</label>
                  <PreAnalysisRichEditor
                    value={data.bowheerInfo || ''}
                    onChange={val => updateField('bowheerInfo', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-bowheerInfo')}
                    height={130}
                    dataField="bowheerInfo"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Project Status</label>
                  <input
                    type="text"
                    name="projectStatus"
                    data-field="projectStatus"
                    value={data.projectStatus}
                    onChange={e => updateField('projectStatus', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-projectStatus')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Investment Plan</label>
                  <PreAnalysisRichEditor
                    value={data.investmentPlan || ''}
                    onChange={val => updateField('investmentPlan', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-investmentPlan')}
                    height={130}
                    dataField="investmentPlan"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Financing Scheme Requested</label>
                  <input
                    type="text"
                    name="financingSchemeRequested"
                    data-field="financingSchemeRequested"
                    value={data.financingSchemeRequested}
                    onChange={e => updateField('financingSchemeRequested', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-financingSchemeRequested')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: 3. CUSTOMER & GROUP BACKGROUND */}
          <div id="acc-sec3" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec3')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec3 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>03</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  3. CUSTOMER & GROUP BACKGROUND
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec3 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec3 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBO (Ultimate Beneficiary Owner)</label>
                  <PreAnalysisRichEditor
                    value={data.uboInfo || data.ubo || ''}
                    onChange={val => { updateField('uboInfo', val); updateField('ubo', val); }}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInfo')}
                    height={130}
                    dataField="uboInfo"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Background (Brief Entity & Holding Profile)</label>
                  <PreAnalysisRichEditor
                    value={data.companyBackground || ''}
                    onChange={val => updateField('companyBackground', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-companyBackground')}
                    height={150}
                    dataField="companyBackground"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>STAR Group – Key Milestones Narrative (Riwayat & Narasi Ekspansi)</span>
                    <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600 }}>2022 - 2026 Expansion</span>
                  </label>
                  <PreAnalysisRichEditor
                    value={data.starGroupMilestonesNarrative || ''}
                    onChange={val => updateField('starGroupMilestonesNarrative', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-starGroupMilestonesNarrative')}
                    height={180}
                    dataField="starGroupMilestonesNarrative"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Business Development Background (Kemitraan Herry Tho & Rekam Jejak)</span>
                    <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>Key Risk Factor</span>
                  </label>
                  <textarea
                    rows={5}
                    name="businessDevBackground"
                    data-field="businessDevBackground"
                    value={data.businessDevBackground || ''}
                    onChange={e => updateField('businessDevBackground', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-businessDevBackground')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Other Information (Field Team Readiness & Harvesting Personnel)</label>
                  <PreAnalysisRichEditor
                    value={data.operationalTeamInfo || ''}
                    onChange={val => updateField('operationalTeamInfo', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-operationalTeamInfo')}
                    height={130}
                    dataField="operationalTeamInfo"
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      UBO Information (Group Shareholding Structure & Legal Profile)
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600, background: '#dbeafe', padding: '1px 6px', borderRadius: '3px' }}>
                      Separate Section Before Milestones
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    name="uboInformation"
                    data-field="uboInformation"
                    value={data.uboInformation || ''}
                    onChange={e => updateField('uboInformation', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                    placeholder="STAR GROUP Corporate Ownership Structure..."
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '6px', lineHeight: 1.35 }}
                  />
                  <div id="preana-form-group-structure-builder" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', background: '#f8fafc', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f294a' }}>
                          Group Shareholding Structure Chart (Input System)
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Input holding and subsidiary entities. The visual hierarchy tree is automatically generated in the Digital Twin preview.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addSubsidiary}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        + Add Subsidiary
                      </button>
                    </div>

                    {/* 1. HOLDING COMPANY (ENTITAS INDUK) */}
                    <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>
                          🏢 Parent Entity (Holding Company)
                        </span>
                        <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                          Level 1 Parent
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Holding Company Name</label>
                          <input
                            type="text"
                            value={currentGroupStructure.holding?.name || ''}
                            onChange={e => updateHoldingField('name', e.target.value)}
                            onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                            placeholder="e.g. PT STAR (PT Sentosa Abadi Raja)"
                            style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Authorized Capital</label>
                          <input
                            type="text"
                            value={currentGroupStructure.holding?.authorizedCapital || ''}
                            onChange={e => updateHoldingField('authorizedCapital', e.target.value)}
                            onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                            placeholder="e.g. Rp 240 Miliar"
                            style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Paid-up Capital</label>
                          <input
                            type="text"
                            value={currentGroupStructure.holding?.paidUpCapital || ''}
                            onChange={e => updateHoldingField('paidUpCapital', e.target.value)}
                            onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                            placeholder="e.g. Rp 60 Miliar"
                            style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Management / Board of Directors</label>
                        <input
                          type="text"
                          value={currentGroupStructure.holding?.management || ''}
                          onChange={e => updateHoldingField('management', e.target.value)}
                          onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                          placeholder="e.g. Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa"
                          style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </div>

                      {/* Holding Shareholders */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155' }}>Parent Shareholders</span>
                          <button
                            type="button"
                            onClick={addHoldingShareholder}
                            style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                          >
                            + Add Shareholder
                          </button>
                        </div>
                        {(currentGroupStructure.holding?.shareholders || []).map((sh, sIdx) => (
                          <div key={sIdx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.6fr 1fr 1.3fr auto', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={sh.name}
                              onChange={e => updateHoldingShareholder(sIdx, 'name', e.target.value)}
                              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                              placeholder="Name (e.g. HANSEN SANTOSA)"
                              title="Name"
                              style={{ padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                            />
                            <input
                              type="text"
                              value={sh.position || sh.role || ''}
                              onChange={e => updateHoldingShareholder(sIdx, 'position', e.target.value)}
                              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                              placeholder="Position (e.g. President Director)"
                              title="Position"
                              style={{ padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                            />
                            <input
                              type="text"
                              value={sh.shareClass || '-'}
                              onChange={e => updateHoldingShareholder(sIdx, 'shareClass', e.target.value)}
                              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                              placeholder="Class"
                              title="Share Class"
                              style={{ padding: '3px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                            />
                            <input
                              type="text"
                              value={sh.numberOfShares || sh.percentage || ''}
                              onChange={e => updateHoldingShareholder(sIdx, 'numberOfShares', e.target.value)}
                              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                              placeholder="Shares (e.g. 324,000)"
                              title="Number of Shares"
                              style={{ padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                            />
                            <input
                              type="text"
                              value={sh.total || ''}
                              onChange={e => updateHoldingShareholder(sIdx, 'total', e.target.value)}
                              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                              placeholder="Total (e.g. Rp. 32,400,000,000)"
                              title="Total Amount"
                              style={{ padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                            />
                            <button
                              type="button"
                              onClick={() => removeHoldingShareholder(sIdx)}
                              style={{ padding: '2px 6px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.68rem' }}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. SUBSIDIARY ENTITIES (ANAK PERUSAHAAN) */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        🔗 Subsidiaries ({currentGroupStructure.subsidiaries?.length || 0} Entities)
                      </div>
                      {(currentGroupStructure.subsidiaries || []).map((sub, subIdx) => (
                        <div key={subIdx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1' }}>
                              Subsidiary #{subIdx + 1}: {sub.name ? sub.name.split('(')[0] : 'New Entity'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSubsidiary(subIdx)}
                              style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              Delete Entity
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            <div>
                              <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Company Name</label>
                              <input
                                type="text"
                                value={sub.name}
                                onChange={e => updateSubsidiaryField(subIdx, 'name', e.target.value)}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                placeholder="e.g. PT Subsidiary Company"
                                style={{ width: '100%', padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Authorized Capital</label>
                              <input
                                type="text"
                                value={sub.authorizedCapital || ''}
                                onChange={e => updateSubsidiaryField(subIdx, 'authorizedCapital', e.target.value)}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                placeholder="Rp ..."
                                style={{ width: '100%', padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Paid-up Capital</label>
                              <input
                                type="text"
                                value={sub.paidUpCapital || ''}
                                onChange={e => updateSubsidiaryField(subIdx, 'paidUpCapital', e.target.value)}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                placeholder="Rp ..."
                                style={{ width: '100%', padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                          </div>
                          <div style={{ marginBottom: '6px' }}>
                            <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Management / Board</label>
                            <input
                              type="text"
                              value={sub.management || ''}
                              onChange={e => updateSubsidiaryField(subIdx, 'management', e.target.value)}
                              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                              placeholder="e.g. Direktur: Leonard Santosa | Komisaris: Hansen Santosa"
                              style={{ width: '100%', padding: '3px 6px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                            />
                          </div>

                          {/* Subsidiary Shareholders */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569' }}>Shareholders</span>
                              <button
                                type="button"
                                onClick={() => addSubsidiaryShareholder(subIdx)}
                                style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '2px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', cursor: 'pointer' }}
                              >
                                + Shareholder
                              </button>
                            </div>
                            {(sub.shareholders || []).map((sh, sIdx) => (
                              <div key={sIdx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.6fr 1fr 1.3fr auto', gap: '4px', marginBottom: '3px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  value={sh.name}
                                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'name', e.target.value)}
                                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                  placeholder="Name / Entity"
                                  title="Name"
                                  style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                                />
                                <input
                                  type="text"
                                  value={sh.position || sh.role || ''}
                                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'position', e.target.value)}
                                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                  placeholder="Position (e.g. Director)"
                                  title="Position"
                                  style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                                />
                                <input
                                  type="text"
                                  value={sh.shareClass || '-'}
                                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'shareClass', e.target.value)}
                                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                  placeholder="Class"
                                  title="Share Class"
                                  style={{ padding: '2px 4px', fontSize: '0.7rem', borderRadius: '3px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                                />
                                <input
                                  type="text"
                                  value={sh.numberOfShares || sh.percentage || ''}
                                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'numberOfShares', e.target.value)}
                                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                  placeholder="Shares"
                                  title="Number of Shares"
                                  style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '3px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                                />
                                <input
                                  type="text"
                                  value={sh.total || ''}
                                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'total', e.target.value)}
                                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                                  placeholder="Total (Rp)"
                                  title="Total Amount"
                                  style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '3px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSubsidiaryShareholder(subIdx, sIdx)}
                                  style={{ padding: '1px 5px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '0.65rem' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div id="preana-form-milestones" data-field="milestones" tabIndex={-1}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Company Milestones</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.milestones || []), { year: '', milestone: '' }];
                        updateField('milestones', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ width: '18%', padding: '6px 8px', textAlign: 'left' }}>Year</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Milestone</th>
                          <th style={{ width: '40px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.milestones || []).map((m, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={m.year || ''}
                                onChange={e => {
                                  const copy = [...data.milestones];
                                  copy[idx] = { ...copy[idx], year: e.target.value };
                                  updateField('milestones', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-milestones')}
                                placeholder="Year"
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <textarea
                                rows={2}
                                value={m.milestone || m.description || ''}
                                onChange={e => {
                                  const copy = [...data.milestones];
                                  copy[idx] = { ...copy[idx], milestone: e.target.value };
                                  updateField('milestones', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-milestones')}
                                placeholder="Milestone description"
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = data.milestones.filter((_, i) => i !== idx);
                                  updateField('milestones', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Existing Finco Backup</label>
                  <input
                    type="text"
                    name="existingFincoBackup"
                    data-field="existingFincoBackup"
                    value={data.existingFincoBackup}
                    onChange={e => updateField('existingFincoBackup', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-existingFincoBackup')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
          <div id="acc-sec4" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec4')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec4 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>04</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  4. EQUIPMENT POSSIBILITY OF SUCCESS
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec4 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec4 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Equipment-to-Job Fit</label>
                    <input
                      type="text"
                      name="equipmentJobFit"
                      data-field="equipmentJobFit"
                      value={data.equipmentJobFit}
                      onChange={e => updateField('equipmentJobFit', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-equipmentJobFit')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Utilization vs Project Duration</label>
                    <input
                      type="text"
                      name="utilizationDuration"
                      data-field="utilizationDuration"
                      value={data.utilizationDuration}
                      onChange={e => updateField('utilizationDuration', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-utilizationDuration')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Current Unit Composition Table */}
                <div id="preana-form-unitComposition" data-field="unitComposition" tabIndex={-1}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Current Unit Composition (Total: {totalUnits} units)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.unitComposition || []), { kategoriAset: '', brand: '', qty: 0 }];
                        updateField('unitComposition', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Unit
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Asset Category</th>
                          <th style={{ width: '25%', padding: '6px 8px', textAlign: 'left' }}>Brand</th>
                          <th style={{ width: '18%', padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ width: '40px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.unitComposition || []).map((u, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={u.kategoriAset || ''}
                                onChange={e => {
                                  const copy = [...data.unitComposition];
                                  copy[idx] = { ...copy[idx], kategoriAset: e.target.value };
                                  updateField('unitComposition', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-unitComposition')}
                                placeholder="Asset Category"
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={u.brand || ''}
                                onChange={e => {
                                  const copy = [...data.unitComposition];
                                  copy[idx] = { ...copy[idx], brand: e.target.value };
                                  updateField('unitComposition', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-unitComposition')}
                                placeholder="Brand"
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              <input
                                type="number"
                                value={u.qty || 0}
                                onChange={e => {
                                  const copy = [...data.unitComposition];
                                  copy[idx] = { ...copy[idx], qty: Number(e.target.value) || 0 };
                                  updateField('unitComposition', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-unitComposition')}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = data.unitComposition.filter((_, i) => i !== idx);
                                  updateField('unitComposition', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontWeight: 700 }}>
                        <tr>
                          <td colSpan={2} style={{ padding: '6px 8px' }}>TOTAL</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{totalUnits}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Prior LiuGong Experience</label>
                    <input
                      type="text"
                      name="priorLiugongExperience"
                      data-field="priorLiugongExperience"
                      value={data.priorLiugongExperience}
                      onChange={e => updateField('priorLiugongExperience', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-priorLiugongExperience')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Have Service Agreement / FMC</label>
                    <input
                      type="text"
                      name="serviceAgreementFmc"
                      data-field="serviceAgreementFmc"
                      value={data.serviceAgreementFmc}
                      onChange={e => updateField('serviceAgreementFmc', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-serviceAgreementFmc')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
          <div id="acc-sec5" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec5')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec5 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>05</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  5. UNIT DELIVERY STATUS & QA CHECK
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec5 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec5 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Delivery Status</label>
                    <input
                      type="text"
                      name="deliveryStatus"
                      data-field="deliveryStatus"
                      value={data.deliveryStatus}
                      onChange={e => updateField('deliveryStatus', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-deliveryStatus')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Delivery Date</label>
                    <input
                      type="text"
                      name="deliveryDate"
                      data-field="deliveryDate"
                      value={data.deliveryDate}
                      onChange={e => updateField('deliveryDate', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-deliveryDate')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>QA Comment — iLink/GPS Performance Check</label>
                  <input
                    type="text"
                    name="qaIlinkComment"
                    data-field="qaIlinkComment"
                    value={data.qaIlinkComment}
                    onChange={e => updateField('qaIlinkComment', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-qaIlinkComment')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>QA Conclusion</label>
                  <input
                    type="text"
                    name="qaConclusion"
                    data-field="qaConclusion"
                    value={data.qaConclusion}
                    onChange={e => updateField('qaConclusion', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-qaConclusion')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
          <div id="acc-sec6" className="fap-accordion-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec6')}
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: openSections.sec6 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>06</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  6. CROSS-CHECK WITH DEALER / LMI (quick)
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec6 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec6 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dealer Check</span>
                    <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600 }}>Dealer Verification</span>
                  </label>
                  <input
                    type="text"
                    name="dealerCheck"
                    data-field="dealerCheck"
                    value={data.dealerCheck || ''}
                    onChange={e => updateField('dealerCheck', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-dealerCheck')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP from Dealer to Customer</label>
                    <input
                      type="text"
                      name="topDealerToCustomer"
                      data-field="topDealerToCustomer"
                      value={data.topDealerToCustomer}
                      onChange={e => updateField('topDealerToCustomer', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-topDealerToCustomer')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>TOP from LMI to Dealer</label>
                    <input
                      type="text"
                      name="topLmiToDealer"
                      data-field="topLmiToDealer"
                      value={data.topLmiToDealer}
                      onChange={e => updateField('topLmiToDealer', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-topLmiToDealer')}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>LMI Internal AR Check</label>
                  <input
                    type="text"
                    name="lmiArCheck"
                    data-field="lmiArCheck"
                    value={data.lmiArCheck}
                    onChange={e => updateField('lmiArCheck', e.target.value)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-lmiArCheck')}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* Per-PT from Subsection 3 Group Structure with Toggle YES/NO */}
                <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f294a', marginBottom: '8px' }}>
                    GROUP ENTITY LIST FOR SLIK / BUREAU REVIEW:
                  </div>

                  {groupSubsidiaries.map((sub, idx) => {
                    const fullEntityName = sub.subtitle ? `${sub.name} ${sub.subtitle}` : (sub.name || `Entity #${idx + 1}`);
                    const review = getEntityReview(idx, fullEntityName);
                    const totalPlafonFormatted = getGrandTotal(review.lenderExposures);

                    return (
                      <div
                        key={idx}
                        id={`preana-form-entity-${idx}`}
                        data-field={`slik-${idx}`}
                        tabIndex={-1}
                        style={{
                          marginTop: idx > 0 ? '14px' : '6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '14px',
                          background: review.hasRecord ? '#ffffff' : '#f8fafc',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                      >
                        {/* Header with Title and Toggle YES/NO */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '10px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
                              {idx + 1}. {fullEntityName.toUpperCase()}{!review.hasRecord ? ' - No Records' : ' :'}
                            </span>
                            <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                              ✓ Synced with Subsection 3
                            </span>
                          </div>

                          {/* Toggle Yes/No Buttons */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                              Use Table Row Labels?
                            </span>
                            <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#e2e8f0' }}>
                              <button
                                type="button"
                                onClick={() => { updateEntityReview(idx, { hasRecord: true }); scrollToPreviewElement(`preana-preview-cell-slik-${idx}`); }}
                                style={{
                                  padding: '4px 14px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: review.hasRecord ? '#16a34a' : 'transparent',
                                  color: review.hasRecord ? '#ffffff' : '#64748b',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                ✓ YES
                              </button>
                              <button
                                type="button"
                                onClick={() => { updateEntityReview(idx, { hasRecord: false }); scrollToPreviewElement(`preana-preview-cell-slik-${idx}`); }}
                                style={{
                                  padding: '4px 14px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: !review.hasRecord ? '#dc2626' : 'transparent',
                                  color: !review.hasRecord ? '#ffffff' : '#64748b',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                ✕ NO
                              </button>
                            </div>
                          </div>
                        </div>

                        {review.hasRecord ? (
                          /* YES: Show Table with dynamic Grand Total, Pefindo Analysis Notes, and Commercial Terms */
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                {stripHtmlTags(data.slikPefindoHighlight)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(review.lenderExposures || []), { lender: '', plafond: '', rate: '' }];
                                  updateEntityReview(idx, { lenderExposures: next });
                                }}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '3px 10px',
                                  borderRadius: '4px',
                                  background: '#eff6ff',
                                  color: '#1e40af',
                                  border: '1px solid #bfdbfe',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                + Add Lender
                              </button>
                            </div>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <tr>
                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Row Labels</th>
                                    <th style={{ width: '32%', padding: '6px 8px', textAlign: 'right' }}>Sum of plafon</th>
                                    <th style={{ width: '20%', padding: '6px 8px', textAlign: 'right' }}>Interest Rate</th>
                                    <th style={{ width: '36px', padding: '6px 8px' }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(review.lenderExposures || []).map((lex, lIdx) => (
                                    <tr key={lIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '4px 6px' }}>
                                        <input
                                          type="text"
                                          value={lex.lender || ''}
                                          onChange={e => {
                                            const copy = [...review.lenderExposures];
                                            copy[lIdx] = { ...copy[lIdx], lender: e.target.value };
                                            updateEntityReview(idx, { lenderExposures: copy });
                                          }}
                                          onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                                          placeholder="Lender / Finco Name"
                                          style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                                        />
                                      </td>
                                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                                        <input
                                          type="text"
                                          value={lex.plafond || ''}
                                          onChange={e => {
                                            const copy = [...review.lenderExposures];
                                            copy[lIdx] = { ...copy[lIdx], plafond: e.target.value };
                                            updateEntityReview(idx, { lenderExposures: copy });
                                          }}
                                          onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                                          placeholder="0"
                                          style={{ width: '100%', padding: '4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px', fontFamily: 'monospace' }}
                                        />
                                      </td>
                                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                                        <input
                                          type="text"
                                          value={lex.rate || ''}
                                          onChange={e => {
                                            const copy = [...review.lenderExposures];
                                            copy[lIdx] = { ...copy[lIdx], rate: e.target.value };
                                            updateEntityReview(idx, { lenderExposures: copy });
                                          }}
                                          onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                                          placeholder="%"
                                          style={{ width: '100%', padding: '4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                                        />
                                      </td>
                                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const copy = review.lenderExposures.filter((_, i) => i !== lIdx);
                                            updateEntityReview(idx, { lenderExposures: copy });
                                          }}
                                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                                    <td style={{ padding: '6px 8px', color: '#0f172a' }}>Grand Total</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#1e3a8a', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                      {totalPlafonFormatted}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b' }}>-</td>
                                    <td style={{ padding: '6px 8px' }}></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                                Pefindo Analysis Notes
                              </label>
                              <PreAnalysisRichEditor
                                value={review.pefindoNotes || ''}
                                onChange={val => updateEntityReview(idx, { pefindoNotes: val })}
                                onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                                dataField={`slik-${idx}-pefindoNotes`}
                                height={150}
                                placeholder="SLIK / Pefindo analysis notes..."
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                                Commercial Terms on Other Fincos
                              </label>
                              <PreAnalysisRichEditor
                                value={review.pefindoTerms || ''}
                                onChange={val => updateEntityReview(idx, { pefindoTerms: val })}
                                onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                                dataField={`slik-${idx}-pefindoTerms`}
                                height={130}
                                placeholder="Commercial terms on other fincos..."
                              />
                            </div>
                          </div>
                        ) : (
                          /* NO: Show Remarks column with TinyMCE */
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                              Remarks / Reason for No SLIK Records
                            </label>
                            <PreAnalysisRichEditor
                              value={review.noRecordRemarks || ''}
                              onChange={val => updateEntityReview(idx, { noRecordRemarks: val })}
                              onFocus={() => scrollToPreviewElement(`preana-preview-cell-slik-${idx}`)}
                              dataField={`slik-${idx}-noRecordRemarks`}
                              height={140}
                              placeholder="Enter notes / reason for no existing credit records (e.g. newly established entity / no bank or finco facilities yet)..."
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>              </div>
            )}
          </div>

          {/* SECTION 7: 7. EXPERT JUDGEMENT CONCLUSION */}
          <div id="acc-sec7" className="fap-accordion-card" style={{ background: '#ffffff', border: '2px solid #1e3a8a', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              className="fap-accordion-header"
              onClick={() => toggleSection('sec7')}
              style={{
                padding: '10px 14px',
                background: '#eff6ff',
                borderBottom: openSections.sec7 ? '1px solid #bfdbfe' : 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-chip" style={{ background: '#1e3a8a', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>07</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                  7. EXPERT JUDGEMENT CONCLUSION
                </span>
              </div>
              <div className="fap-acc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`fap-acc-chevron ${openSections.sec7 ? 'rotate' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>
            {openSections.sec7 && (
              <div className="fap-accordion-content" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Good Project & Good Customer Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${data.goodProject ? '#86efac' : '#fca5a5'}`, background: data.goodProject ? '#f0fdf4' : '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: data.goodProject ? '#15803d' : '#b91c1c' }}>
                        Good Project? {data.goodProject ? 'YES' : 'NO'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { updateField('goodProject', !data.goodProject); scrollToPreviewElement('preana-preview-cell-goodProject'); }}
                        style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      >
                        Toggle
                      </button>
                    </div>
                    <input
                      type="text"
                      name="goodProjectNote"
                      data-field="goodProjectNote"
                      value={data.goodProjectNote}
                      onChange={e => updateField('goodProjectNote', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-goodProject')}
                      placeholder="e.g. Harvesting Contractor, PT RAPP - APRIL Group"
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${data.goodCustomer ? '#86efac' : '#fca5a5'}`, background: data.goodCustomer ? '#f0fdf4' : '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: data.goodCustomer ? '#15803d' : '#b91c1c' }}>
                        Good Customer? {data.goodCustomer ? 'YES' : 'NO'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { updateField('goodCustomer', !data.goodCustomer); scrollToPreviewElement('preana-preview-cell-goodCustomer'); }}
                        style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      >
                        Toggle
                      </button>
                    </div>
                    <input
                      type="text"
                      name="goodCustomerNote"
                      data-field="goodCustomerNote"
                      value={data.goodCustomerNote}
                      onChange={e => updateField('goodCustomerNote', e.target.value)}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-goodCustomer')}
                      placeholder="Customer assessment notes"
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Brief Note</label>
                  <PreAnalysisRichEditor
                    value={data.briefNote || ''}
                    onChange={val => updateField('briefNote', val)}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-briefNote')}
                    height={160}
                    dataField="briefNote"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span>RECOMMENDATION{reqMark('recommendation', 'Expert Judgement Conclusion')}</span>
                    <span style={{ fontSize: '0.72rem', color: isRecommended ? '#166534' : '#991b1b', fontWeight: 700 }}>
                      {isRecommended ? '✓ RECOMMENDED' : '✕ NOT RECOMMENDED'}
                    </span>
                  </label>
                  <div
                    id="preana-input-recommendation"
                    data-field="recommendation"
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}
                  >
                    <button
                      type="button"
                      id="btn-toggle-recommendation-yes"
                      onClick={() => {
                        updateField('recommendation', 'RECOMMENDED');
                        scrollToPreviewElement('preana-preview-cell-recommendation');
                      }}
                      style={{
                        flex: 1,
                        padding: '9px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                        border: isRecommended ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: isRecommended ? '#f0fdf4' : '#ffffff',
                        color: isRecommended ? '#15803d' : '#64748b',
                        boxShadow: isRecommended ? '0 1px 3px rgba(22, 163, 74, 0.2)' : 'none'
                      }}
                    >
                      <CheckCircle2 size={16} color={isRecommended ? '#16a34a' : '#94a3b8'} />
                      RECOMMENDED
                    </button>
                    <button
                      type="button"
                      id="btn-toggle-recommendation-no"
                      onClick={() => {
                        updateField('recommendation', 'NOT RECOMMENDED');
                        scrollToPreviewElement('preana-preview-cell-recommendation');
                      }}
                      style={{
                        flex: 1,
                        padding: '9px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                        border: !isRecommended ? '2px solid #ef4444' : '1px solid #cbd5e1',
                        background: !isRecommended ? '#fef2f2' : '#ffffff',
                        color: !isRecommended ? '#b91c1c' : '#64748b',
                        boxShadow: !isRecommended ? '0 1px 3px rgba(239, 68, 68, 0.2)' : 'none'
                      }}
                    >
                      <XCircle size={16} color={!isRecommended ? '#ef4444' : '#94a3b8'} />
                      NOT RECOMMENDED
                    </button>
                  </div>
                </div>

                {/* Suggestions List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Suggestions / Mitigation Limitations</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.suggestions || []), ''];
                        updateField('suggestions', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Item
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(data.suggestions || []).map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          data-field="suggestions"
                          value={s}
                          onChange={e => {
                            const copy = [...data.suggestions];
                            copy[idx] = e.target.value;
                            updateField('suggestions', copy);
                          }}
                          onFocus={() => scrollToPreviewElement('preana-preview-cell-suggestions')}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = data.suggestions.filter((_, i) => i !== idx);
                            updateField('suggestions', copy);
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competition Information Table */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Competition Information</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(data.competitionTable || []), { finco: '', rate: '', purpose: '' }];
                        updateField('competitionTable', next);
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      + Add Finco
                    </button>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Finco</th>
                          <th style={{ width: '28%', padding: '6px 8px', textAlign: 'left' }}>Rate (effective)</th>
                          <th style={{ width: '25%', padding: '6px 8px', textAlign: 'left' }}>Purpose</th>
                          <th style={{ width: '36px', padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                data-field="competitionTable"
                                value={c.finco || ''}
                                onChange={e => {
                                  const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                  copy[idx] = { ...copy[idx], finco: e.target.value };
                                  updateField('competitionTable', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-competitionTable')}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                data-field="competitionTable"
                                value={c.rate || ''}
                                onChange={e => {
                                  const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                  copy[idx] = { ...copy[idx], rate: e.target.value };
                                  updateField('competitionTable', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-competitionTable')}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                data-field="competitionTable"
                                value={c.purpose || ''}
                                onChange={e => {
                                  const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                                  copy[idx] = { ...copy[idx], purpose: e.target.value };
                                  updateField('competitionTable', copy);
                                }}
                                onFocus={() => scrollToPreviewElement('preana-preview-cell-competitionTable')}
                                style={{ width: '100%', padding: '4px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = (data.competitionTable || DEFAULT_COMPETITION_TABLE).filter((_, i) => i !== idx);
                                  updateField('competitionTable', copy);
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sign-offs (Area Tanda Tangan Diperlebar & Terstruktur) */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>Area Tanda Tangan & Otorisasi Komite</span>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Signature columns for formal executive authorization (Proposed, Reviewed, Approved)</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      3 Komite Wajib
                    </span>
                  </div>

                  {/* Signature Date Controls (Auto-updates to current date on open) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginBottom: '14px',
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a' }}>
                        Signature Date:
                      </label>
                      <input
                        type="text"
                        name="signatureDate"
                        data-field="signatureDate"
                        value={signatureDateToDisplay}
                        onChange={e => updateField('signatureDate', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-proposedBy')}
                        placeholder="DD / MM / YYYY"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          width: '140px',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        ✓ Auto-updates to today's date on open
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const today = getTodaySignatureDate();
                          updateField('signatureDate', today);
                          scrollToPreviewElement('preana-preview-cell-proposedBy');
                        }}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Reset to Today ({todayDateStr})
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Propose by Card */}
                    <div style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>1. Proposed by :</span>
                        <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Marketing / Sales
                        </span>
                      </div>
                      <div style={{
                        height: '75px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>( Ruang Tanda Tangan Basah / Digital & Stempel )</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Area tanda tangan diperlebar</span>
                      </div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Proposed By (Name & Title) :</label>
                      <textarea
                        rows={2}
                        name="proposedBy"
                        data-field="proposedBy"
                        value={data.proposedBy}
                        onChange={e => updateField('proposedBy', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-proposedBy')}
                        placeholder="Amanda Cynthia&#10;Senior Account Manager"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', lineHeight: 1.4 }}
                      />
                    </div>

                    {/* Reviewed by Card */}
                    <div style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>2. Reviewed by :</span>
                        <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Risk & Credit Dept Head
                        </span>
                      </div>
                      <div style={{
                        height: '75px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>( Ruang Tanda Tangan Basah / Digital & Stempel )</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Area tanda tangan diperlebar</span>
                      </div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Reviewed By (Name & Title) :</label>
                      <textarea
                        rows={2}
                        name="reviewedBy"
                        data-field="reviewedBy"
                        value={data.reviewedBy}
                        onChange={e => updateField('reviewedBy', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-reviewedBy')}
                        placeholder="Maria Regina&#10;Dept. Head"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', lineHeight: 1.4 }}
                      />
                    </div>

                    {/* Approved by Card */}
                    <div style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>3. Approved by :</span>
                        <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Director / Credit Committee
                        </span>
                      </div>
                      <div style={{
                        height: '75px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>( Ruang Tanda Tangan Basah / Digital & Stempel )</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Area tanda tangan diperlebar</span>
                      </div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Approved By (Name & Title) :</label>
                      <textarea
                        rows={2}
                        name="approvedBy"
                        data-field="approvedBy"
                        value={data.approvedBy}
                        onChange={e => updateField('approvedBy', e.target.value)}
                        onFocus={() => scrollToPreviewElement('preana-preview-cell-approvedBy')}
                        placeholder="Jembar Ganda E&#10;Director"
                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', lineHeight: 1.4 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: 50% LIVE DOCUMENT PREVIEW (DIGITAL TWIN 1:1 WITH PDF) */}
      <div className="fap-detail-preview-col" style={{ flex: '1 1 50%', width: '50%', minWidth: 0, height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Ribbon Toolbar */}
        <div
          className="pre-analysis-ribbon-toolbar"
          style={{
            height: '44px',
            minHeight: '44px',
            background: '#0f294a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderRadius: '7px 7px 0 0',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            boxSizing: 'border-box',
            gap: '10px'
          }}
        >
          {/* Left: Document Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <FileText size={15} color="#93c5fd" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.02em', color: '#f8fafc', whiteSpace: 'nowrap' }}>
              PRE-ANALYSIS
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Ref: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{data.preAnalysisNo}</span>
            </span>
          </div>

          {/* Right: Controls (Tabs, Zoom, Print) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* View Toggle Tabs */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setViewMode('digital-twin')}
                style={{
                  background: viewMode === 'digital-twin' ? '#ffffff' : 'transparent',
                  color: viewMode === 'digital-twin' ? '#0f294a' : 'rgba(255,255,255,0.8)',
                  border: 'none',
                  padding: '3px 9px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: viewMode === 'digital-twin' ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                Digital Twin
              </button>
              <button
                type="button"
                onClick={() => setViewMode('original-pdf')}
                style={{
                  background: viewMode === 'original-pdf' ? '#ffffff' : 'transparent',
                  color: viewMode === 'original-pdf' ? '#0f294a' : 'rgba(255,255,255,0.8)',
                  border: 'none',
                  padding: '3px 9px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: viewMode === 'original-pdf' ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                Original PDF
              </button>
            </div>

            {/* Zoom Controls */}
            {viewMode === 'digital-twin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '2px 5px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.4, Number((prev - 0.05).toFixed(2))))}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px 4px', display: 'grid', placeItems: 'center', borderRadius: '3px' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span style={{ fontSize: '0.72rem', minWidth: '38px', textAlign: 'center', fontWeight: 700, color: '#f8fafc' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(1.2, Number((prev + 0.05).toFixed(2))))}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px 4px', display: 'grid', placeItems: 'center', borderRadius: '3px' }}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(0.75)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '2px 4px', display: 'grid', placeItems: 'center', borderRadius: '3px' }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                color: '#0f294a',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className="pre-analysis-canvas"
          style={{
            flex: 1,
            height: 'calc(100% - 42px)',
            overflowY: 'auto',
            overflowX: 'auto',
            background: '#f1f5f9',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
          {viewMode === 'original-pdf' ? (
            <iframe
              ref={pdfIframeRef}
              src={`${getStaticAssetUrl("pre_analysis/pre_analysis_sample.pdf")}#toolbar=1`}
              title="Original Pre-Analysis PDF"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '700px',
                border: 'none',
                borderRadius: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}
            />
          ) : (
            /* Digital Twin Document Render */
            <div
              id="preana-digital-twin-doc"
              className="pre-analysis-digital-twin-doc"
              style={{
                width: '840px',
                minWidth: '840px',
                zoom: zoomLevel,
                background: '#ffffff',
                boxShadow: '0 4px 24px rgba(15, 23, 42, 0.12)',
                border: '1px solid #cbd5e1',
                padding: '36px 40px',
                fontFamily: 'Calibri, Arial, sans-serif',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* Document Header */}
              <div style={{ marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '18pt', fontWeight: 800, color: '#1b365d', letterSpacing: '-0.2px' }}>
                  PRE-ANALYSIS — EXPERT JUDGEMENT
                </h1>
                <div style={{ fontSize: '11pt', fontWeight: 700, color: '#1b365d', marginTop: '2px' }}>
                  (Quick Screening, Interview Base)
                </div>
                <div id="preana-preview-cell-preAnalysisNo" style={{ fontSize: '10pt', color: '#000000', marginTop: '4px' }}>
                  No. : {data.preAnalysisNo}
                </div>
              </div>

              {/* Top Thick Navy Divider */}
              <div style={{ height: '3px', background: '#1b365d', marginBottom: '8px' }} />

              {/* SECTION 1: 1. GENERAL INFORMATION TABLE */}
              <table
                id="preana-preview-sec-1"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '16px' }}
              >
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Customer / Project</td>
                    <td id="preana-preview-cell-customerProjectName" onClick={() => handlePreviewCellClick('customerProjectName', 'sec1')} style={{ width: '74%', padding: '4px 6px', fontWeight: 700, color: '#1b365d', cursor: 'pointer' }}>{data.customerProjectName}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Tax ID (NPWP)</td>
                    <td id="preana-preview-cell-taxId" onClick={() => handlePreviewCellClick('taxId', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.taxId}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>FAP No</td>
                    <td id="preana-preview-cell-fapNumber" onClick={() => handlePreviewCellClick('fapNumber', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.fapNumber}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Lead Source</td>
                    <td id="preana-preview-cell-leadSource" onClick={() => handlePreviewCellClick('leadSource', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.leadSource}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Customer Area</td>
                    <td id="preana-preview-cell-customerArea" onClick={() => handlePreviewCellClick('customerArea', 'sec1')} style={{ width: '74%', padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.customerArea}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Dealer PIC</td>
                    <td id="preana-preview-cell-dealerPic" onClick={() => handlePreviewCellClick('dealerPic', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.dealerPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>LMI PIC</td>
                    <td id="preana-preview-cell-lmiPic" onClick={() => handlePreviewCellClick('lmiPic', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.lmiPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>LFI PIC</td>
                    <td id="preana-preview-cell-lfiPic" onClick={() => handlePreviewCellClick('lfiPic', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.lfiPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Customer PIC</td>
                    <td id="preana-preview-cell-customerPic" onClick={() => handlePreviewCellClick('customerPic', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.customerPic}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Pre-Analysis Date</td>
                    <td id="preana-preview-cell-preAnalysisDate" onClick={() => handlePreviewCellClick('preAnalysisDate', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.preAnalysisDate}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Equity</td>
                    <td id="preana-preview-cell-equity" onClick={() => handlePreviewCellClick('equity', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.equity}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Paid up Capital</td>
                    <td id="preana-preview-cell-paidUpCapital" onClick={() => handlePreviewCellClick('paidUpCapital', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.paidUpCapital}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Source of Repayment</td>
                    <td id="preana-preview-cell-sourceOfRepayment" onClick={() => handlePreviewCellClick('sourceOfRepayment', 'sec1')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{stripHtmlTags(data.sourceOfRepayment)}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 2: 2. PROJECT INFORMATION */}
              <div
                id="preana-preview-sec-2"
                onClick={() => handlePreviewCellClick('projectNameLocation', 'sec2')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                2. PROJECT INFORMATION
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Holding Group / Main Company</td>
                    <td id="preana-preview-cell-holdingGroup" onClick={() => handlePreviewCellClick('holdingGroup', 'sec2')} style={{ width: '74%', padding: '4px 6px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer' }}>
                      {data.holdingGroup || '-'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Name</td>
                    <td id="preana-preview-cell-projectName" onClick={() => handlePreviewCellClick('projectName', 'sec2')} style={{ padding: '4px 6px', fontWeight: 600, cursor: 'pointer' }}>
                      {data.projectName || '-'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Location</td>
                    <td id="preana-preview-cell-projectLocation" onClick={() => handlePreviewCellClick('projectLocation', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>
                      {data.projectLocation || '-'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Existing Projects</td>
                    <td id="preana-preview-cell-existingProjects" onClick={() => handlePreviewCellClick('existingProjects', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#f8fafc' }}>
                      {renderRichHtml(data.existingProjects)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>New Projects</td>
                    <td id="preana-preview-cell-newProjects" onClick={() => handlePreviewCellClick('newProjects', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#fffbeb' }}>
                      {renderRichHtml(data.newProjects)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Role of Customer</td>
                    <td id="preana-preview-cell-customerRole" onClick={() => handlePreviewCellClick('customerRole', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.customerRole}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Other Contractor work in the same bowheer</td>
                    <td id="preana-preview-cell-otherContractors" onClick={() => handlePreviewCellClick('otherContractors', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.otherContractors}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Owner</td>
                    <td id="preana-preview-cell-projectOwner" onClick={() => handlePreviewCellClick('projectOwner', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.projectOwner}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Bowheer Information</td>
                    <td id="preana-preview-cell-bowheerInfo" onClick={() => handlePreviewCellClick('bowheerInfo', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{renderRichHtml(data.bowheerInfo)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Project Status</td>
                    <td id="preana-preview-cell-projectStatus" onClick={() => handlePreviewCellClick('projectStatus', 'sec2')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.projectStatus}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Investment Plan</td>
                    <td id="preana-preview-cell-investmentPlan" onClick={() => handlePreviewCellClick('investmentPlan', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{renderRichHtml(data.investmentPlan)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Financing Scheme Requested</td>
                    <td id="preana-preview-cell-financingSchemeRequested" onClick={() => handlePreviewCellClick('financingSchemeRequested', 'sec2')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>{data.financingSchemeRequested}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 3: 3. CUSTOMER & GROUP BACKGROUND */}
              <div
                id="preana-preview-sec-3"
                onClick={() => handlePreviewCellClick('uboInfo', 'sec3')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                3. CUSTOMER & GROUP BACKGROUND
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>UBO (Ultimate Beneficiary Owner)</td>
                    <td id="preana-preview-cell-uboInfo" onClick={() => handlePreviewCellClick('uboInfo', 'sec3')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>
                      {renderRichHtml(data.uboInfo || data.ubo)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Company Background</td>
                    <td id="preana-preview-cell-companyBackground" onClick={() => handlePreviewCellClick('companyBackground', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', fontWeight: 600, color: '#1e3a8a' }}>
                      {renderRichHtml(data.companyBackground)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>STAR Group – Key Milestones</td>
                    <td id="preana-preview-cell-starGroupMilestonesNarrative" onClick={() => handlePreviewCellClick('starGroupMilestonesNarrative', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#f8fafc' }}>
                      {renderRichHtml(data.starGroupMilestonesNarrative)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Business Development Background</td>
                    <td id="preana-preview-cell-businessDevBackground" onClick={() => handlePreviewCellClick('businessDevBackground', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer', background: '#fffbeb' }}>
                      {renderRichHtml(data.businessDevBackground)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Other information :</td>
                    <td id="preana-preview-cell-operationalTeamInfo" onClick={() => handlePreviewCellClick('operationalTeamInfo', 'sec3')} style={{ padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer' }}>
                      {renderRichHtml(data.operationalTeamInfo)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td colSpan={2} id="preana-preview-cell-uboInformation" onClick={() => handlePreviewCellClick('uboInformation', 'sec3')} style={{ width: '100%', padding: '8px 10px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, fontSize: '9pt', color: '#1e3a8a', marginBottom: '6px' }}>
                        UBO Information (Group Shareholding Structure & Legal Profile)
                      </div>
                      {data.uboInformation && (
                        <div style={{ fontSize: '8.5pt', color: '#1e293b', marginBottom: '10px', lineHeight: 1.4 }}>
                          {renderRichHtml(data.uboInformation)}
                        </div>
                      )}

                      {/* Corporate Group Structure Diagram matching Image 3 with full Shareholding Tables */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 6px', background: '#f8fafc', overflowX: 'auto' }}>
                        <div style={{ minWidth: (currentGroupStructure.subsidiaries?.length || 0) > 3 ? `${(currentGroupStructure.subsidiaries?.length || 0) * 240}px` : '100%' }}>
                        <div style={{ fontSize: '8.5pt', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.03em', textAlign: 'center', marginBottom: '8px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                          GROUP SHAREHOLDING STRUCTURE CHART
                        </div>

                        {/* LEVEL 1: HOLDING ENTITY (PT STAR) CENTERED */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div style={{
                            width: '490px',
                            maxWidth: '100%',
                            background: '#ffffff',
                            border: `2px solid ${currentGroupStructure.holding?.borderColor || '#1e3a8a'}`,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 5px rgba(30, 58, 138, 0.08)'
                          }}>
                            {/* Card Header */}
                            <div style={{ padding: '5px 8px 3px 8px', textAlign: 'center', background: '#ffffff' }}>
                              <div style={{ fontSize: '10.5pt', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                                {currentGroupStructure.holding?.name || 'PT STAR'}
                              </div>
                              {currentGroupStructure.holding?.subtitle && (
                                <div style={{ fontSize: '7.5pt', fontWeight: 600, color: '#475569', marginTop: '1px' }}>
                                  {currentGroupStructure.holding.subtitle}
                                </div>
                              )}
                            </div>

                            {/* Shareholding Composition Banner */}
                            <div style={{
                              background: '#0f294a',
                              color: '#ffffff',
                              fontSize: '7.2pt',
                              fontWeight: 700,
                              textAlign: 'center',
                              padding: '2.5px 6px',
                              letterSpacing: '0.03em'
                            }}>
                              Shareholding Composition
                            </div>

                            {/* 5-Column Table */}
                            <div style={{ padding: '3px 5px' }}>
                              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '6.2pt', lineHeight: 1.2 }}>
                                <colgroup>
                                  <col style={{ width: '27%' }} />
                                  <col style={{ width: '22%' }} />
                                  <col style={{ width: '7%' }} />
                                  <col style={{ width: '17%' }} />
                                  <col style={{ width: '27%' }} />
                                </colgroup>
                                <thead>
                                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#1e293b' }}>
                                    <th style={{ padding: '2px 3px', textAlign: 'left', fontWeight: 700, verticalAlign: 'top' }}>Name</th>
                                    <th style={{ padding: '2px 3px', textAlign: 'left', fontWeight: 700, verticalAlign: 'top' }}>Position</th>
                                    <th style={{ padding: '2px 1px', textAlign: 'center', fontWeight: 700, verticalAlign: 'top' }} title="Share Class">Class</th>
                                    <th style={{ padding: '2px 3px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>Number of Shares</th>
                                    <th style={{ padding: '2px 3px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(currentGroupStructure.holding?.shareholders || []).map((sh, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '2px 3px', fontWeight: 600, color: '#0f172a', verticalAlign: 'top', wordBreak: 'normal' }}>{sh.name}</td>
                                      <td style={{ padding: '2px 3px', color: '#475569', verticalAlign: 'top', wordBreak: 'normal' }}>{sh.position || sh.role || '-'}</td>
                                      <td style={{ padding: '2px 1px', textAlign: 'center', color: '#64748b', verticalAlign: 'top' }}>{sh.shareClass || '-'}</td>
                                      <td style={{ padding: '2px 3px', textAlign: 'right', color: '#0f172a', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{sh.numberOfShares || sh.percentage || '-'}</td>
                                      <td style={{ padding: '2px 3px', textAlign: 'right', fontWeight: 600, color: '#0f172a', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{sh.total || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Bottom Capital Summary */}
                            <div style={{
                              padding: '3px 6px 4px 6px',
                              borderTop: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              fontSize: '6.4pt',
                              lineHeight: 1.3,
                              color: '#1e293b'
                            }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ fontWeight: 700, color: '#334155', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Authorized Capital</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{currentGroupStructure.holding?.authorizedCapital || '-'}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ fontWeight: 700, color: '#334155', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Issued and Paid-up Capital</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{currentGroupStructure.holding?.paidUpCapital || '-'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* CONNECTOR STEM & BRANCH LINES WITH ARROWS */}
                        {(currentGroupStructure.subsidiaries || []).length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', margin: '0 auto' }}>
                            {/* Vertical stem from holding */}
                            <div style={{ width: '2px', height: '14px', background: '#1e3a8a' }} />
                            
                            {/* Horizontal bar spanning children */}
                            {(currentGroupStructure.subsidiaries || []).length > 1 ? (
                              <div style={{
                                width: `calc(100% - ${100 / (currentGroupStructure.subsidiaries?.length || 1)}%)`,
                                height: '2px',
                                background: '#1e3a8a'
                              }} />
                            ) : null}

                            {/* Downward drop lines with arrows into each child */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${currentGroupStructure.subsidiaries?.length || 1}, 1fr)`,
                              width: '100%'
                            }}>
                              {(currentGroupStructure.subsidiaries || []).map((_, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{ width: '2px', height: '12px', background: '#1e3a8a' }} />
                                  <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #1e3a8a' }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* LEVEL 2: 3 SUBSIDIARIES GRID WITH SHAREHOLDING TABLES */}
                        {(currentGroupStructure.subsidiaries || []).length > 0 && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${currentGroupStructure.subsidiaries?.length || 1}, minmax(0, 1fr))`,
                            gap: '6px',
                            marginTop: '2px'
                          }}>
                            {(currentGroupStructure.subsidiaries || []).map((sub, sIdx) => {
                              const border = sub.borderColor || (sIdx === 0 ? '#0284c7' : sIdx === 1 ? '#dc2626' : '#16a34a');
                              return (
                                <div
                                  key={sIdx}
                                  style={{
                                    background: '#ffffff',
                                    border: `2px solid ${border}`,
                                    borderRadius: '7px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: 0
                                  }}
                                >
                                  {/* Sub Header */}
                                  <div style={{ padding: '5px 4px 2px 4px', textAlign: 'center', background: '#ffffff' }}>
                                    <div style={{ fontSize: '9pt', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                                      {sub.name || `PT Entity #${sIdx + 1}`}
                                    </div>
                                    {sub.subtitle && (
                                      <div style={{ fontSize: '6.2pt', fontWeight: 600, color: '#475569', marginTop: '1px', lineHeight: 1.15 }}>
                                        {sub.subtitle}
                                      </div>
                                    )}
                                  </div>

                                  {/* Sub Banner */}
                                  <div style={{
                                    background: '#0f294a',
                                    color: '#ffffff',
                                    fontSize: '6.4pt',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    padding: '2px 2px',
                                    letterSpacing: '0.02em'
                                  }}>
                                    Shareholding Composition
                                  </div>

                                  {/* 5-Column Table */}
                                  <div style={{ padding: '2px 3px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '5.2pt', lineHeight: 1.2 }}>
                                      <colgroup>
                                        <col style={{ width: '26%' }} />
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '6%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '29%' }} />
                                      </colgroup>
                                      <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#1e293b' }}>
                                          <th style={{ padding: '2px 2px', textAlign: 'left', fontWeight: 700, verticalAlign: 'top' }}>Name</th>
                                          <th style={{ padding: '2px 2px', textAlign: 'left', fontWeight: 700, verticalAlign: 'top' }}>Position</th>
                                          <th style={{ padding: '2px 0px', textAlign: 'center', fontWeight: 700, verticalAlign: 'top' }} title="Share Class">Class</th>
                                          <th style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>Shares</th>
                                          <th style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(sub.shareholders || []).map((sh, idx) => (
                                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '2px 2px', fontWeight: 600, color: '#0f172a', verticalAlign: 'top', wordBreak: 'normal', lineHeight: 1.15 }}>{sh.name}</td>
                                            <td style={{ padding: '2px 2px', color: '#475569', verticalAlign: 'top', wordBreak: 'normal', lineHeight: 1.15 }}>{sh.position || sh.role || '-'}</td>
                                            <td style={{ padding: '2px 0px', textAlign: 'center', color: '#64748b', verticalAlign: 'top' }}>{sh.shareClass || '-'}</td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', color: '#0f172a', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{sh.numberOfShares || sh.percentage || '-'}</td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', fontWeight: 600, color: '#0f172a', verticalAlign: 'top', whiteSpace: 'nowrap', fontSize: '5.1pt' }}>{sh.total || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Bottom Capital Summary */}
                                  <div style={{
                                    padding: '3px 4px 4px 4px',
                                    borderTop: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    fontSize: '5.5pt',
                                    lineHeight: 1.25,
                                    color: '#1e293b'
                                  }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                      <tbody>
                                        <tr>
                                          <td style={{ fontWeight: 700, color: '#334155', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Authorized Capital</td>
                                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{sub.authorizedCapital || '-'}</td>
                                        </tr>
                                        <tr>
                                          <td style={{ fontWeight: 700, color: '#334155', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Issued & Paid-up Capital</td>
                                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '1px 0', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{sub.paidUpCapital || '-'}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr
                    id="preana-preview-cell-milestones"
                    onClick={() => handlePreviewCellClick('milestones', 'sec3')}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Company Milestones</td>
                    <td style={{ padding: '4px 6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ width: '20%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Year</th>
                            <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Milestone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.milestones || []).map((m, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{m.year}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{m.milestone || m.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Existing Finco Backup</td>
                    <td id="preana-preview-cell-existingFincoBackup" onClick={() => handlePreviewCellClick('existingFincoBackup', 'sec3')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.existingFincoBackup}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
              <div
                id="preana-preview-sec-4"
                onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                4. EQUIPMENT POSSIBILITY OF SUCCESS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Equipment-to-Job Fit</td>
                    <td id="preana-preview-cell-equipmentJobFit" onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.equipmentJobFit}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Utilization vs Project Duration</td>
                    <td id="preana-preview-cell-utilizationDuration" onClick={() => handlePreviewCellClick('utilizationDuration', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.utilizationDuration}</td>
                  </tr>
                  <tr
                    id="preana-preview-cell-unitComposition"
                    onClick={() => handlePreviewCellClick('unitComposition', 'sec4')}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Current Unit Composition</td>
                    <td style={{ padding: '4px 6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Asset Category</th>
                            <th style={{ width: '25%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Brand</th>
                            <th style={{ width: '18%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.unitComposition || []).map((u, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{u.kategoriAset || '-'}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{u.brand}</td>
                              <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{u.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td colSpan={2} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>TOTAL</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{totalUnits}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Prior LiuGong Experience</td>
                    <td id="preana-preview-cell-priorLiugongExperience" onClick={() => handlePreviewCellClick('priorLiugongExperience', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.priorLiugongExperience}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Have Service Agreement / FMC</td>
                    <td id="preana-preview-cell-serviceAgreementFmc" onClick={() => handlePreviewCellClick('serviceAgreementFmc', 'sec4')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.serviceAgreementFmc}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
              <div
                id="preana-preview-sec-5"
                onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                5. UNIT DELIVERY STATUS & QA CHECK
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Delivery Status</td>
                    <td id="preana-preview-cell-deliveryStatus" onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.deliveryStatus}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>Delivery Date</td>
                    <td id="preana-preview-cell-deliveryDate" onClick={() => handlePreviewCellClick('deliveryDate', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.deliveryDate}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>QA Comment — iLink/GPS Performance Check</td>
                    <td id="preana-preview-cell-qaIlinkComment" onClick={() => handlePreviewCellClick('qaIlinkComment', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.qaIlinkComment}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>QA Conclusion</td>
                    <td id="preana-preview-cell-qaConclusion" onClick={() => handlePreviewCellClick('qaConclusion', 'sec5')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.qaConclusion}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
              <div
                id="preana-preview-sec-6"
                onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                6. CROSS-CHECK WITH DEALER / LMI (quick)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>Dealer Check</td>
                    <td id="preana-preview-cell-dealerCheck" onClick={() => handlePreviewCellClick('dealerCheck', 'sec6')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer', fontWeight: 600 }}>{data.dealerCheck}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ width: '26%', padding: '4px 6px', fontWeight: 700 }}>TOP from Dealer to Customer</td>
                    <td id="preana-preview-cell-topDealerToCustomer" onClick={() => handlePreviewCellClick('topDealerToCustomer', 'sec6')} style={{ width: '74%', padding: '4px 6px', cursor: 'pointer' }}>{data.topDealerToCustomer}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>TOP from LMI to Dealer</td>
                    <td id="preana-preview-cell-topLmiToDealer" onClick={() => handlePreviewCellClick('topLmiToDealer', 'sec6')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.topLmiToDealer}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700 }}>LMI Internal AR Check</td>
                    <td id="preana-preview-cell-lmiArCheck" onClick={() => handlePreviewCellClick('lmiArCheck', 'sec6')} style={{ padding: '4px 6px', cursor: 'pointer' }}>{data.lmiArCheck}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 700, verticalAlign: 'top' }}>SLIK/Bureau Highlight</td>
                    <td style={{ padding: '4px 6px' }}>
                      {groupSubsidiaries.map((sub, idx) => {
                        const fullEntityName = sub.subtitle ? `${sub.name} ${sub.subtitle}` : (sub.name || `Entity #${idx + 1}`);
                        const review = getEntityReview(idx, fullEntityName);
                        const totalPlafonFormatted = getGrandTotal(review.lenderExposures);

                        if (review.hasRecord) {
                          return (
                            <div
                              key={idx}
                              id={`preana-preview-cell-slik-${idx}`}
                              onClick={() => handlePreviewCellClick(`slik-${idx}`, 'sec6')}
                              style={{ marginTop: idx > 0 ? '14px' : '0', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                            >
                              <div style={{ fontWeight: 700, color: '#1b365d', marginBottom: '4px' }}>
                                {idx + 1}. {fullEntityName.toUpperCase()} :
                              </div>
                              <div style={{ fontStyle: 'italic', marginBottom: '6px', fontSize: '8pt', color: '#475569' }}>
                                {stripHtmlTags(data.slikPefindoHighlight)}
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '8px' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Row Labels</th>
                                    <th style={{ width: '35%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Sum of plafon</th>
                                    <th style={{ width: '22%', padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Interest Rate</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(review.lenderExposures || []).map((lex, lIdx) => (
                                    <tr key={lIdx}>
                                      <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{lex.lender}</td>
                                      <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>{lex.plafond}</td>
                                      <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{lex.rate}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>Grand Total</td>
                                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#1e3a8a', fontFamily: 'monospace' }}>
                                      {totalPlafonFormatted}
                                    </td>
                                    <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>-</td>
                                  </tr>
                                </tfoot>
                              </table>
                              <div style={{ fontSize: '8pt', color: '#334155', marginBottom: '6px' }}>
                                {renderRichHtml(review.pefindoNotes)}
                              </div>
                              {review.pefindoTerms && (
                                <div style={{ fontSize: '8pt', color: '#334155', fontWeight: 600, background: '#f8fafc', padding: '4px', border: '1px solid #e2e8f0' }}>
                                  {renderRichHtml(review.pefindoTerms)}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={idx}
                              id={`preana-preview-cell-slik-${idx}`}
                              onClick={() => handlePreviewCellClick(`slik-${idx}`, 'sec6')}
                              style={{ marginTop: idx > 0 ? '14px' : '0', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                            >
                              <div style={{ fontWeight: 700, color: '#1b365d', marginBottom: '4px' }}>
                                {idx + 1}. {fullEntityName.toUpperCase()} - No Records
                              </div>
                              <div style={{ fontSize: '8pt', color: '#475569', fontStyle: 'italic', paddingLeft: '8px' }}>
                                {renderRichHtml(review.noRecordRemarks || 'NO RECORD SINCE ITS NEWLY ESTABLISHED')}
                              </div>
                            </div>
                          );
                        }
                      })}</td>
                  </tr>
                </tbody>
              </table>

              {/* SECTION 7: 7. EXPERT JUDGEMENT CONCLUSION */}
              <div
                id="preana-preview-sec-7"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                style={{
                  background: '#1b365d',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                  marginTop: '16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                7. EXPERT JUDGEMENT CONCLUSION
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ width: '30%', padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Aspect</th>
                    <th style={{ width: '20%', padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Assessment</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr id="preana-preview-cell-goodProject" onClick={() => handlePreviewCellClick('goodProjectNote', 'sec7')} style={{ cursor: 'pointer' }}>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Good Project?</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: data.goodProject ? '#16a34a' : '#dc2626' }}>
                      {data.goodProject ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0' }}>{data.goodProjectNote}</td>
                  </tr>
                  <tr id="preana-preview-cell-goodCustomer" onClick={() => handlePreviewCellClick('goodCustomerNote', 'sec7')} style={{ cursor: 'pointer' }}>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Good Customer?</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: data.goodCustomer ? '#16a34a' : '#dc2626' }}>
                      {data.goodCustomer ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0' }}>{data.goodCustomerNote}</td>
                  </tr>
                </tbody>
              </table>

              <div id="preana-preview-cell-briefNote" onClick={() => handlePreviewCellClick('briefNote', 'sec7')} style={{ marginBottom: '10px', fontSize: '9pt', cursor: 'pointer' }}>
                <span style={{ fontWeight: 700 }}>Brief Note:</span>
                <div style={{ whiteSpace: 'pre-line', marginTop: '2px', color: '#1e293b' }}>
                  {renderRichHtml(data.briefNote)}
                </div>
              </div>

              {/* Recommendation Callout */}
              <div
                id="preana-preview-cell-recommendation"
                onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
                style={{
                  background: isRecommended ? '#dcfce7' : '#fee2e2',
                  border: `2px solid ${isRecommended ? '#22c55e' : '#ef4444'}`,
                  color: isRecommended ? '#166534' : '#991b1b',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  fontSize: '11pt',
                  textAlign: 'center',
                  marginBottom: '12px',
                  letterSpacing: '0.3px',
                  cursor: 'pointer'
                }}
              >
                RECOMMENDATION: {data.recommendation || (isRecommended ? 'RECOMMENDED' : 'NOT RECOMMENDED')}
              </div>

              {/* Suggestion Bullet Points */}
              <div id="preana-preview-cell-suggestions" onClick={() => handlePreviewCellClick('suggestions', 'sec7')} style={{ marginBottom: '14px', fontSize: '8.5pt', cursor: 'pointer' }}>
                <span style={{ fontWeight: 700 }}>Suggestion:</span>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  {(data.suggestions || []).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '2px' }}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Competition Information Table */}
              <div id="preana-preview-cell-competitionTable" onClick={() => handlePreviewCellClick('competitionTable', 'sec7')} style={{ marginTop: '14px', marginBottom: '16px', cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '4px' }}>
                  Competition Information
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Finco</th>
                      <th style={{ width: '25%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Rate (effective)</th>
                      <th style={{ width: '25%', padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{c.finco}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{c.rate}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #e2e8f0' }}>{c.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Approvals / Sign-off Footer - Widened & Formal Executive Format */}
              <div style={{ marginTop: '36px', marginBottom: '28px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '9pt',
                  border: '1.5px solid #000000',
                  background: '#ffffff'
                }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #000000' }}>
                      <th style={{ width: '33.33%', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '9pt', color: '#000000', borderRight: '1.5px solid #000000' }}>
                        Propose by :
                      </th>
                      <th style={{ width: '33.33%', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '9pt', color: '#000000', borderRight: '1.5px solid #000000' }}>
                        Reviewed by :
                      </th>
                      <th style={{ width: '33.34%', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '9pt', color: '#000000' }}>
                        Approved by :
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Generous signature clearance - 95px height */}
                    <tr style={{ height: '95px' }}>
                      <td
                        id="preana-preview-cell-sign-propose"
                        onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
                        style={{ padding: '10px', verticalAlign: 'bottom', borderRight: '1.5px solid #000000', cursor: 'pointer', height: '95px' }}
                      >
                        <div style={{ minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '7.5pt' }}>
                          ( Tanda Tangan / Stempel )
                        </div>
                      </td>
                      <td
                        id="preana-preview-cell-sign-review"
                        onClick={() => handlePreviewCellClick('reviewedBy', 'sec7')}
                        style={{ padding: '10px', verticalAlign: 'bottom', borderRight: '1.5px solid #000000', cursor: 'pointer', height: '95px' }}
                      >
                        <div style={{ minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '7.5pt' }}>
                          ( Tanda Tangan / Stempel )
                        </div>
                      </td>
                      <td
                        id="preana-preview-cell-sign-approve"
                        onClick={() => handlePreviewCellClick('approvedBy', 'sec7')}
                        style={{ padding: '10px', verticalAlign: 'bottom', cursor: 'pointer', height: '95px' }}
                      >
                        <div style={{ minHeight: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '7.5pt' }}>
                          ( Tanda Tangan / Stempel )
                        </div>
                      </td>
                    </tr>
                    {/* Signatory Names & Positions */}
                    <tr style={{ borderTop: '1px solid #000000' }}>
                      <td
                        id="preana-preview-cell-proposedBy"
                        onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
                        style={{ padding: '8px 10px', verticalAlign: 'top', borderRight: '1.5px solid #000000', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#000000', textDecoration: 'underline' }}>
                          {(data.proposedBy || '').split('\n')[0] || data.proposedBy || '-'}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#1e293b', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {(data.proposedBy || '').split('\n').slice(1).join('\n')}
                        </div>
                        <div style={{ fontSize: '7.5pt', color: '#0f172a', marginTop: '6px', fontWeight: 600 }}>Date: {signatureDateToDisplay}</div>
                      </td>
                      <td
                        id="preana-preview-cell-reviewedBy"
                        onClick={() => handlePreviewCellClick('reviewedBy', 'sec7')}
                        style={{ padding: '8px 10px', verticalAlign: 'top', borderRight: '1.5px solid #000000', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#000000', textDecoration: 'underline' }}>
                          {(data.reviewedBy || '').split('\n')[0] || data.reviewedBy || '-'}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#1e293b', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {(data.reviewedBy || '').split('\n').slice(1).join('\n')}
                        </div>
                        <div style={{ fontSize: '7.5pt', color: '#0f172a', marginTop: '6px', fontWeight: 600 }}>Date: {signatureDateToDisplay}</div>
                      </td>
                      <td
                        id="preana-preview-cell-approvedBy"
                        onClick={() => handlePreviewCellClick('approvedBy', 'sec7')}
                        style={{ padding: '8px 10px', verticalAlign: 'top', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#000000', textDecoration: 'underline' }}>
                          {(data.approvedBy || '').split('\n')[0] || data.approvedBy || '-'}
                        </div>
                        <div style={{ fontSize: '8pt', color: '#1e293b', marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {(data.approvedBy || '').split('\n').slice(1).join('\n')}
                        </div>
                        <div style={{ fontSize: '7.5pt', color: '#0f172a', marginTop: '6px', fontWeight: 600 }}>Date: {signatureDateToDisplay}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    

</div>
  );
}
