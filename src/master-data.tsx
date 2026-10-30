import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Plus,Pencil,Search,Settings2,X,Save,MapPin,ChevronRight,Check,Trash2,Menu,Layers} from 'lucide-react';
import {api} from './api';
import {defaultMasterCatalog,masterGroups,masterKey,validateMasterCatalog,type MasterCatalog,type MasterItem} from './master-catalog';

const equipmentChildren=new Set(['brand','unitType','modelName','assetName']);
const locationGroups=new Set(['province','city','district','village']);

let catalog=defaultMasterCatalog(),revision=0;
export function setMasterData(data:{catalog:MasterCatalog,revision:number}){
  const def = defaultMasterCatalog();
  const next = { ...def, ...data.catalog };
  for (const k of ['district', 'village', 'postalCode'] as const) {
    if (!next[k] || next[k].length === 0) {
      next[k] = def[k];
    }
  }
  catalog = next;
  revision = data.revision;
  window.dispatchEvent(new Event('master-data-updated'));
}
export function useMasterData(){const [data,setData]=useState(catalog);useEffect(()=>{const update=()=>setData(catalog);window.addEventListener('master-data-updated',update);return()=>window.removeEventListener('master-data-updated',update);},[]);return data;}

export const DEFAULT_MANDATORY_RULES: any[] = [
  {
    "id": 1,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "customerCategory",
    "field_label": "Customer Category",
    "mandatory": 0
  },
  {
    "id": 2,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "companyName",
    "field_label": "Company Name",
    "mandatory": 1
  },
  {
    "id": 3,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "companyType",
    "field_label": "Business Category",
    "mandatory": 1
  },
  {
    "id": 4,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "nib",
    "field_label": "NIB",
    "mandatory": 1
  },
  {
    "id": 5,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "nibDate",
    "field_label": "NIB Established Date",
    "mandatory": 0
  },
  {
    "id": 6,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "npwp",
    "field_label": "NPWP",
    "mandatory": 1
  },
  {
    "id": 7,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "establishmentActNo",
    "field_label": "Establishment Deed Number",
    "mandatory": 1
  },
  {
    "id": 8,
    "stage": "FAP",
    "section": "Debtor Identity & Classification",
    "field_key": "establishmentDate",
    "field_label": "Establishment Deed Date",
    "mandatory": 1
  },
  {
    "id": 9,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "branchCode",
    "field_label": "Branch",
    "mandatory": 1
  },
  {
    "id": 10,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "customerStatus",
    "field_label": "Customer Relationship",
    "mandatory": 1
  },
  {
    "id": 11,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "locationStatus",
    "field_label": "Business Premises",
    "mandatory": 0
  },
  {
    "id": 12,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "companyAddress",
    "field_label": "Company Address",
    "mandatory": 1
  },
  {
    "id": 13,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "province",
    "field_label": "Province",
    "mandatory": 1
  },
  {
    "id": 14,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "city",
    "field_label": "City",
    "mandatory": 1
  },
  {
    "id": 15,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "district",
    "field_label": "District",
    "mandatory": 0
  },
  {
    "id": 16,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "village",
    "field_label": "Village / Sub-District",
    "mandatory": 0
  },
  {
    "id": 17,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "rt",
    "field_label": "RT",
    "mandatory": 0
  },
  {
    "id": 18,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "rw",
    "field_label": "RW",
    "mandatory": 0
  },
  {
    "id": 19,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "postalCode",
    "field_label": "Postal Code",
    "mandatory": 1
  },
  {
    "id": 20,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "phoneFax",
    "field_label": "Phone / Fax",
    "mandatory": 0
  },
  {
    "id": 21,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "email",
    "field_label": "Company Email",
    "mandatory": 0
  },
  {
    "id": 22,
    "stage": "FAP",
    "section": "Registration Office & Company Domicile",
    "field_key": "website",
    "field_label": "Website",
    "mandatory": 0
  },
  {
    "id": 23,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "mainBusiness",
    "field_label": "Main Business",
    "mandatory": 0
  },
  {
    "id": 24,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "repaymentSource",
    "field_label": "Source of Repayment",
    "mandatory": 0
  },
  {
    "id": 25,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "industrySegment",
    "field_label": "Industry",
    "mandatory": 0
  },
  {
    "id": 26,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "businessRole",
    "field_label": "Business Role",
    "mandatory": 0
  },
  {
    "id": 27,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "experienceYears",
    "field_label": "Experience · Years",
    "mandatory": 1
  },
  {
    "id": 28,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "experienceMonths",
    "field_label": "Experience · Months",
    "mandatory": 1
  },
  {
    "id": 29,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "latestDeedNo",
    "field_label": "Latest Deed Number",
    "mandatory": 0
  },
  {
    "id": 30,
    "stage": "FAP",
    "section": "Business Profile & Deed Legality",
    "field_key": "latestDeedDate",
    "field_label": "Latest Deed Date",
    "mandatory": 0
  },
  {
    "id": 31,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "picName",
    "field_label": "Contact Name",
    "mandatory": 0
  },
  {
    "id": 32,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "position",
    "field_label": "Position",
    "mandatory": 0
  },
  {
    "id": 33,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "phone",
    "field_label": "Phone Number",
    "mandatory": 0
  },
  {
    "id": 34,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "email",
    "field_label": "Email",
    "mandatory": 0
  },
  {
    "id": 35,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "country",
    "field_label": "Country",
    "mandatory": 0
  },
  {
    "id": 36,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "province",
    "field_label": "Province",
    "mandatory": 0
  },
  {
    "id": 37,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "city",
    "field_label": "City / Regency",
    "mandatory": 0
  },
  {
    "id": 38,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "district",
    "field_label": "District",
    "mandatory": 0
  },
  {
    "id": 39,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "village",
    "field_label": "Village / Sub-District",
    "mandatory": 0
  },
  {
    "id": 40,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "rt",
    "field_label": "RT",
    "mandatory": 0
  },
  {
    "id": 41,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "rw",
    "field_label": "RW",
    "mandatory": 0
  },
  {
    "id": 42,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "postalCode",
    "field_label": "ZIP Code",
    "mandatory": 0
  },
  {
    "id": 43,
    "stage": "FAP",
    "section": "Primary Contact / Person in Charge (PIC)",
    "field_key": "currentAddress",
    "field_label": "Full Address",
    "mandatory": 0
  },
  {
    "id": 44,
    "stage": "FAP",
    "section": "Industry Segmentation & Active Projects",
    "field_key": "projectOwner",
    "field_label": "Project Owner",
    "mandatory": 0
  },
  {
    "id": 45,
    "stage": "FAP",
    "section": "Industry Segmentation & Active Projects",
    "field_key": "projectLocation",
    "field_label": "Location",
    "mandatory": 1
  },
  {
    "id": 46,
    "stage": "FAP",
    "section": "Industry Segmentation & Active Projects",
    "field_key": "projectRole",
    "field_label": "Role In Project",
    "mandatory": 0
  },
  {
    "id": 47,
    "stage": "FAP",
    "section": "Industry Segmentation & Active Projects",
    "field_key": "contractStatus",
    "field_label": "Contract Status",
    "mandatory": 0
  },
  {
    "id": 48,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "preAnalysisNo",
    "field_label": "Pre-Analysis No",
    "mandatory": 1
  },
  {
    "id": 49,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "preAnalysisDate",
    "field_label": "Pre-Analysis Date",
    "mandatory": 1
  },
  {
    "id": 50,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "customerProjectName",
    "field_label": "Customer / Project Name",
    "mandatory": 1
  },
  {
    "id": 51,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "taxId",
    "field_label": "Tax ID (NPWP)",
    "mandatory": 1
  },
  {
    "id": 52,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "fapNumber",
    "field_label": "FAP Number",
    "mandatory": 1
  },
  {
    "id": 53,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "leadSource",
    "field_label": "Lead Source",
    "mandatory": 1
  },
  {
    "id": 54,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "customerArea",
    "field_label": "Customer Area",
    "mandatory": 1
  },
  {
    "id": 55,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "dealerPic",
    "field_label": "Dealer PIC",
    "mandatory": 1
  },
  {
    "id": 56,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "lmiPic",
    "field_label": "LMI PIC",
    "mandatory": 1
  },
  {
    "id": 57,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "lfiPic",
    "field_label": "LFI PIC",
    "mandatory": 1
  },
  {
    "id": 58,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "customerPic",
    "field_label": "Customer PIC",
    "mandatory": 1
  },
  {
    "id": 59,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "equity",
    "field_label": "Equity",
    "mandatory": 0
  },
  {
    "id": 60,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "paidUpCapital",
    "field_label": "Paid up Capital",
    "mandatory": 0
  },
  {
    "id": 61,
    "stage": "PRE-AN",
    "section": "General Information",
    "field_key": "sourceOfRepayment",
    "field_label": "Source of Repayment",
    "mandatory": 1
  },
  {
    "id": 62,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "holdingGroup",
    "field_label": "Holding Group / Parent Company",
    "mandatory": 0
  },
  {
    "id": 63,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "projectName",
    "field_label": "Project Name (Nama Objek Proyek)",
    "mandatory": 1
  },
  {
    "id": 64,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "projectLocation",
    "field_label": "Project Location (Lokasi Proyek)",
    "mandatory": 1
  },
  {
    "id": 65,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "customerRole",
    "field_label": "Role of Customer",
    "mandatory": 1
  },
  {
    "id": 66,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "otherContractors",
    "field_label": "Other Contractor work in same bowheer",
    "mandatory": 0
  },
  {
    "id": 67,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "projectStatus",
    "field_label": "Project Status",
    "mandatory": 1
  },
  {
    "id": 68,
    "stage": "PRE-AN",
    "section": "Project Information",
    "field_key": "financingSchemeRequested",
    "field_label": "Financing Scheme Requested",
    "mandatory": 1
  },
  {
    "id": 69,
    "stage": "PRE-AN",
    "section": "Customer & Group Background",
    "field_key": "companyBackground",
    "field_label": "Company Background",
    "mandatory": 0
  },
  {
    "id": 70,
    "stage": "PRE-AN",
    "section": "Customer & Group Background",
    "field_key": "uboInfo",
    "field_label": "Ultimate Beneficial Owner (UBO)",
    "mandatory": 0
  },
  {
    "id": 71,
    "stage": "PRE-AN",
    "section": "Customer & Group Background",
    "field_key": "businessDevBackground",
    "field_label": "Business Development Background",
    "mandatory": 0
  },
  {
    "id": 72,
    "stage": "PRE-AN",
    "section": "Customer & Group Background",
    "field_key": "existingFincoBackup",
    "field_label": "Existing Finco Backup",
    "mandatory": 1
  },
  {
    "id": 73,
    "stage": "PRE-AN",
    "section": "Equipment Possibility of Success",
    "field_key": "equipmentJobFit",
    "field_label": "Equipment-to-Job Fit",
    "mandatory": 1
  },
  {
    "id": 74,
    "stage": "PRE-AN",
    "section": "Equipment Possibility of Success",
    "field_key": "utilizationDuration",
    "field_label": "Utilization vs Project Duration",
    "mandatory": 1
  },
  {
    "id": 75,
    "stage": "PRE-AN",
    "section": "Equipment Possibility of Success",
    "field_key": "priorLiugongExperience",
    "field_label": "Prior LiuGong Experience",
    "mandatory": 0
  },
  {
    "id": 76,
    "stage": "PRE-AN",
    "section": "Equipment Possibility of Success",
    "field_key": "serviceAgreementFmc",
    "field_label": "Have Service Agreement / FMC",
    "mandatory": 1
  },
  {
    "id": 77,
    "stage": "PRE-AN",
    "section": "Unit Delivery Status & QA Check",
    "field_key": "deliveryStatus",
    "field_label": "Delivery Status",
    "mandatory": 1
  },
  {
    "id": 78,
    "stage": "PRE-AN",
    "section": "Unit Delivery Status & QA Check",
    "field_key": "deliveryDate",
    "field_label": "Delivery Date",
    "mandatory": 0
  },
  {
    "id": 79,
    "stage": "PRE-AN",
    "section": "Unit Delivery Status & QA Check",
    "field_key": "qaIlinkComment",
    "field_label": "QA Comment — iLink/GPS Check",
    "mandatory": 0
  },
  {
    "id": 80,
    "stage": "PRE-AN",
    "section": "Unit Delivery Status & QA Check",
    "field_key": "qaConclusion",
    "field_label": "QA Conclusion",
    "mandatory": 1
  },
  {
    "id": 81,
    "stage": "PRE-AN",
    "section": "Cross-Check with Dealer / LMI",
    "field_key": "dealerCheck",
    "field_label": "Dealer Payment & Performance Check",
    "mandatory": 1
  },
  {
    "id": 82,
    "stage": "PRE-AN",
    "section": "Cross-Check with Dealer / LMI",
    "field_key": "topDealerToCustomer",
    "field_label": "TOP Dealer to Customer",
    "mandatory": 0
  },
  {
    "id": 83,
    "stage": "PRE-AN",
    "section": "Cross-Check with Dealer / LMI",
    "field_key": "topLmiToDealer",
    "field_label": "TOP LMI to Dealer",
    "mandatory": 0
  },
  {
    "id": 84,
    "stage": "PRE-AN",
    "section": "Cross-Check with Dealer / LMI",
    "field_key": "lmiArCheck",
    "field_label": "LMI Internal AR Check",
    "mandatory": 1
  },
  {
    "id": 85,
    "stage": "PRE-AN",
    "section": "Cross-Check with Dealer / LMI",
    "field_key": "applicantPefindoCheck",
    "field_label": "Applicant Pefindo Check",
    "mandatory": 1
  },
  {
    "id": 86,
    "stage": "PRE-AN",
    "section": "Expert Judgement Conclusion",
    "field_key": "recommendation",
    "field_label": "Credit Recommendation",
    "mandatory": 1
  },
  {
    "id": 87,
    "stage": "PRE-AN",
    "section": "Expert Judgement Conclusion",
    "field_key": "proposedBy",
    "field_label": "Proposed By (Pengusul)",
    "mandatory": 1
  },
  {
    "id": 88,
    "stage": "PRE-AN",
    "section": "Expert Judgement Conclusion",
    "field_key": "reviewedBy",
    "field_label": "Reviewed By (Reviewer)",
    "mandatory": 1
  },
  {
    "id": 89,
    "stage": "PRE-AN",
    "section": "Expert Judgement Conclusion",
    "field_key": "approvedBy",
    "field_label": "Approved By (Approver)",
    "mandatory": 1
  }
];

const MANDATORY_STORAGE_KEY = 'liugong_mandatory_rules_cache_v25';

// Automatically clear obsolete cache versions
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 1; i <= 24; i++) {
      localStorage.removeItem('liugong_mandatory_rules_cache_v' + i);
    }
    localStorage.removeItem('liugong_mandatory_rules_cache');
    try {
      const demoRaw = localStorage.getItem('liugong_demo_state');
      if (demoRaw) {
        const demoObj = JSON.parse(demoRaw);
        if (demoObj && demoObj.mandatoryRules && (!demoObj.mandatoryRules.some((r: any) => r.stage === 'PRE-AN') || !demoObj.mandatoryRules.some((r: any) => r.field_key === 'nibDate'))) {
          delete demoObj.mandatoryRules;
          localStorage.setItem('liugong_demo_state', JSON.stringify(demoObj));
        }
      }
    } catch {}
  }
} catch {}

export const MANDATORY_SECTIONS_FAP = [
  'Debtor Identity & Classification',
  'Registration Office & Company Domicile',
  'Business Profile & Deed Legality',
  'Primary Contact / Person in Charge (PIC)',
  'Industry Segmentation & Active Projects'
] as const;

export const MANDATORY_SECTIONS_PRE = [
  'General Information',
  'Project Information',
  'Customer & Group Background',
  'Equipment Possibility of Success',
  'Unit Delivery Status & QA Check',
  'Cross-Check with Dealer / LMI',
  'Expert Judgement Conclusion'
] as const;

export const MANDATORY_SECTIONS = [
  ...MANDATORY_SECTIONS_FAP,
  ...MANDATORY_SECTIONS_PRE
] as const;

export function cleanSectionName(sec: string): string {
  if (!sec) return '';
  return String(sec).replace(/^(?:0[1-9]|[1-9])\.\s*|^(?:0[1-9]|[1-9])\s*/, '').trim();
}


export function normalizeRule(r: any) {
  if (!r) return r;
  const rawStage = String(r.stage || (r.id > 47 ? 'PRE-AN' : 'FAP')).toUpperCase();
  const normalizedStage = (rawStage === 'PRE-AN' || rawStage === 'PRE') ? 'PRE-AN' : 'FAP';
  const stageRule = { ...r, stage: normalizedStage };
  return {
    ...stageRule,
    section: resolveRuleSection(stageRule)
  };
}

export function resolveRuleSection(rule: { id?: number; stage?: string; section?: string; field_key?: string }): string {
  const stage = String(rule?.stage || (rule?.id && rule.id > 47 ? 'PRE-AN' : 'FAP')).toUpperCase();
  const rawSec = cleanSectionName(String(rule?.section || ''));
  const fKey = String(rule?.field_key || '');

  // Pre-Analysis Stage Resolution
  if (stage === 'PRE-AN' || stage === 'PRE' || (rule?.id && rule.id > 47)) {
    for (const s of MANDATORY_SECTIONS_PRE) {
      if (rawSec.toLowerCase() === s.toLowerCase()) return s;
    }
    const sec = rawSec.toLowerCase();
    if (sec.includes('general')) return 'General Information';
    if (sec.includes('project')) return 'Project Information';
    if (sec.includes('customer') || sec.includes('group') || sec.includes('background')) return 'Customer & Group Background';
    if (sec.includes('equipment') || sec.includes('possibility')) return 'Equipment Possibility of Success';
    if (sec.includes('delivery') || sec.includes('qa')) return 'Unit Delivery Status & QA Check';
    if (sec.includes('cross') || sec.includes('check') || sec.includes('dealer') || sec.includes('lmi')) return 'Cross-Check with Dealer / LMI';
    if (sec.includes('conclusion') || sec.includes('expert') || sec.includes('judgement') || sec.includes('recommendation')) return 'Expert Judgement Conclusion';
    return rawSec || 'General Information';
  }

  // FAP Stage Resolution (Exact 5 sections)
  // 1. If rule already has an official section name, respect it!
  for (const s of MANDATORY_SECTIONS_FAP) {
    if (rawSec.toLowerCase() === s.toLowerCase()) return s;
  }

  const sec = rawSec.toLowerCase();

  // Seksi 1: Debtor Identity & Classification (Exact 8 fields from form card 01)
  if (['customerCategory', 'companyName', 'companyType', 'nib', 'nibDate', 'npwp', 'establishmentActNo', 'establishmentDate'].includes(fKey)) {
    return 'Debtor Identity & Classification';
  }

  // Seksi 5: Industry Segmentation & Active Projects (Exact 4 fields from form card 05)
  if (['projectOwner', 'projectLocation', 'projectRole', 'contractStatus'].includes(fKey)) {
    return 'Industry Segmentation & Active Projects';
  }

  // Seksi 3: Business Profile & Deed Legality (Exact 8 fields from form card 03)
  if (['mainBusiness', 'repaymentSource', 'industrySegment', 'businessRole', 'experienceYears', 'experienceMonths', 'latestDeedNo', 'latestDeedDate'].includes(fKey)) {
    return 'Business Profile & Deed Legality';
  }

  // Seksi 4: Primary Contact / Person in Charge (PIC) (Exact 13 fields from form card 04)
  if (['picName', 'position', 'phone', 'currentAddress', 'country'].includes(fKey) || sec.includes('pic') || sec.includes('contact')) {
    return 'Primary Contact / Person in Charge (PIC)';
  }

  // Seksi 2: Registration Office & Company Domicile (Exact 14 fields from form card 02)
  return 'Registration Office & Company Domicile';
}

function getInitialMandatoryRules(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(MANDATORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_MANDATORY_RULES.length && parsed.some((x: any) => x.field_key === 'nibDate')) {
          return parsed.map(normalizeRule);
        }
      }
    }
  } catch {}
  return DEFAULT_MANDATORY_RULES.map(normalizeRule);
}

let mandatoryCatalogCache: any[] = getInitialMandatoryRules();
let mandatoryMapCache = new Map<string, boolean>();

export function getSectionAliases(secName: string): string[] {
  const norm = (secName || '').toLowerCase().trim();
  const aliases: string[] = [norm];
  if (norm.includes('debtor') || norm.includes('identity') || norm.includes('classification') || norm.includes('customer') || norm.startsWith('01')) {
    aliases.push('customer', 'debtor', 'identity', 'classification', '01');
  }
  if (norm.includes('domicile') || norm.includes('office') || norm.includes('registration') || norm.includes('company') || norm.startsWith('02')) {
    aliases.push('company', 'office', 'domicile', 'registration', '02', 'profile');
  }
  if (norm.includes('business') || norm.includes('deed') || norm.includes('legality') || norm.startsWith('03')) {
    aliases.push('business', 'legality', 'deed', 'profile', '03');
  }
  if (norm.includes('pic') || norm.includes('contact') || norm.startsWith('04')) {
    aliases.push('pic', 'contact', '04');
  }
  if (norm.includes('project') || norm.includes('industry') || norm.includes('segmentation') || norm.startsWith('05')) {
    aliases.push('projects', 'project', 'industry', 'segmentation', '05');
  }
  return aliases;
}

function buildMandatoryMap(rules: any[]) {
  const map = new Map<string, boolean>();
  for (const r of rules) {
    if (!r) continue;
    const isMandatory = Boolean(r.mandatory);
    const fKey = String(r.field_key || '');
    const sec = String(r.section || '').trim();
    if (fKey) {
      map.set(`*:${fKey}`, isMandatory);
      if (sec) {
        const aliases = getSectionAliases(sec);
        for (const al of aliases) {
          map.set(`${al}:${fKey}`, isMandatory);
        }
      }
    }
  }
  return map;
}

mandatoryMapCache = buildMandatoryMap(mandatoryCatalogCache);

export function setMandatoryRules(data: any[]) {
  const normalized = (data || []).map(normalizeRule);
  mandatoryCatalogCache = normalized;
  mandatoryMapCache = buildMandatoryMap(normalized);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MANDATORY_STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {}
  window.dispatchEvent(new Event('mandatory-updated'));
}

let inFlightMandatoryPromise: Promise<any[]> | null = null;
export function fetchMandatoryRules(): Promise<any[]> {
  if (inFlightMandatoryPromise) return inFlightMandatoryPromise;
  inFlightMandatoryPromise = api('/mandatory').then((data: any) => {
    inFlightMandatoryPromise = null;
    if (Array.isArray(data)) {
      setMandatoryRules(data);
      return data;
    }
    return mandatoryCatalogCache;
  }).catch(() => {
    inFlightMandatoryPromise = null;
    return mandatoryCatalogCache;
  });
  return inFlightMandatoryPromise;
}

export function useMandatoryRules() {
  const [rules, setRules] = useState<any[]>(() => mandatoryCatalogCache.map(r => ({ ...r, section: resolveRuleSection(r) })));
  useEffect(() => {
    let active = true;
    fetchMandatoryRules().then(data => {
      if (active && Array.isArray(data)) {
        setRules(data.map(normalizeRule));
      }
    });
    const handleUpdate = () => {
      if (active) setRules(mandatoryCatalogCache.map(normalizeRule));
    };
    window.addEventListener('mandatory-updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('mandatory-updated', handleUpdate);
    };
  }, []);
  return rules.map(normalizeRule);
}

export function isFieldMandatory(rules: any[], section: string | undefined, fieldKey: string, defaultRequired?: boolean, stage?: string): boolean {
  if (!mandatoryMapCache.size && rules && rules.length) {
    mandatoryMapCache = buildMandatoryMap(rules);
  }
  if (!mandatoryMapCache.size) return false;
  const normSec = (section || '').toLowerCase().trim();
  if (normSec) {
    if (mandatoryMapCache.has(`${normSec}:${fieldKey}`)) {
      return mandatoryMapCache.get(`${normSec}:${fieldKey}`)!;
    }
    const aliases = getSectionAliases(normSec);
    for (const al of aliases) {
      if (mandatoryMapCache.has(`${al}:${fieldKey}`)) {
        return mandatoryMapCache.get(`${al}:${fieldKey}`)!;
      }
    }
  }
  if (mandatoryMapCache.has(`*:${fieldKey}`)) {
    return mandatoryMapCache.get(`*:${fieldKey}`)!;
  }
  return false;
}

export const cleanWilayahStr = (s: string) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const matchesMasterItem = (item: MasterItem, val: string) => {
  if (!item || !val) return false;
  if (item.value === val || item.name === val) return true;
  const cName = cleanWilayahStr(item.name);
  const cVal = cleanWilayahStr(val);
  if (cName === cVal) return true;
  if ((cVal === 'dkijakarta' || cVal === 'jakarta') && cName === 'daerahkhususibukotajakarta') return true;
  if ((cName === 'dkijakarta' || cName === 'jakarta') && cVal === 'daerahkhususibukotajakarta') return true;
  if (cName.length >= 4 && cVal.length >= 4 && (cName.includes(cVal) || cVal.includes(cName))) return true;
  return false;
};

export function resolveWilayahUpwards(record: any, data: MasterCatalog) {
  if (!data || !record) return record;
  const next = { ...record };
  const vList = data.village || [];
  const dList = data.district || [];
  const cList = data.city || [];
  const pList = data.province || [];

  const rawVill = next.village;
  const rawDist = next.district;
  const rawCity = next.city || next.cityRegency;
  const rawProv = next.province;
  const rawZip = next.postalCode;

  // 1. Try finding village
  let villageItem: MasterItem | undefined;
  if (rawVill) {
    villageItem = vList.find(x => matchesMasterItem(x, rawVill));
  }
  if (!villageItem && rawZip) {
    villageItem = vList.find(x => x.zipCode === String(rawZip).trim());
  }

  // 2. Try finding district
  let districtItem: MasterItem | undefined;
  if (villageItem?.parentValue) {
    districtItem = dList.find(x => x.value === villageItem!.parentValue);
  }
  if (!districtItem && rawDist) {
    districtItem = dList.find(x => matchesMasterItem(x, rawDist));
  }

  // 3. Try finding city
  let cityItem: MasterItem | undefined;
  if (districtItem?.parentValue) {
    cityItem = cList.find(x => x.value === districtItem!.parentValue);
  }
  if (!cityItem && rawCity) {
    cityItem = cList.find(x => matchesMasterItem(x, rawCity));
  }

  // 4. Try finding province
  let provItem: MasterItem | undefined;
  if (cityItem?.parentValue) {
    provItem = pList.find(x => x.value === cityItem!.parentValue);
  }
  if (!provItem && rawProv) {
    provItem = pList.find(x => matchesMasterItem(x, rawProv));
  }

  // Auto-populate upward hierarchy if missing
  if (provItem && (!next.province || next.province === '')) {
    next.province = provItem.name;
  }
  if (cityItem && (!next.cityRegency || next.cityRegency === '')) {
    next.cityRegency = cityItem.name;
    next.city = cityItem.name;
  }
  if (districtItem && (!next.district || next.district === '' || cleanWilayahStr(next.district) === cleanWilayahStr(districtItem.name) || next.district === districtItem.value)) {
    next.district = districtItem.name;
  }
  if (villageItem && (!next.village || next.village === '' || cleanWilayahStr(next.village) === cleanWilayahStr(villageItem.name) || next.village === villageItem.value)) {
    next.village = villageItem.name;
    if (!next.postalCode && villageItem.zipCode) {
      next.postalCode = villageItem.zipCode;
    }
  }

  return next;
}

export function masterEntries(data:MasterCatalog,key:string,value:any){
  const group=masterGroups.find(g=>g.key===masterKey(key));
  if(!group)return null;
  if(group.key==='postalCode'){
    const provinceValue=value?.province,cityValue=value?.city||value?.cityRegency;
    if(cityValue){
      const province=provinceValue?data.province?.find(x=>matchesMasterItem(x, provinceValue)):undefined;
      const city=data.city?.find(x=>matchesMasterItem(x, cityValue)&&(!province||x.parentValue===province.value));
      const targetCity=city?.value||cityValue;
      return (data.postalCode||[]).filter(x=>x.active&&x.parentValue===targetCity);
    }
    return (data.postalCode||[]).slice(0,50);
  }
  if(group.key==='village'){
    let parentDistrict=group.parentField?value?.[group.parentField]||value?.[masterKey(group.parentField)]:value?.district;
    if(parentDistrict){
      const pDid=(data.district||[]).find(x=>matchesMasterItem(x, parentDistrict))?.value||parentDistrict;
      return (data.village||[]).filter(x=>x.active&&x.parentValue===pDid);
    }
    const cVal=value?.city||value?.cityRegency;
    if(cVal){
      const cObj=(data.city||[]).find(x=>matchesMasterItem(x, cVal));
      if(cObj){
        const dSet=new Set((data.district||[]).filter(x=>x.parentValue===cObj.value).map(x=>x.value));
        return (data.village||[]).filter(x=>x.active&&!!x.parentValue&&dSet.has(x.parentValue));
      }
    }
    return (data.village||[]).slice(0,50);
  }
  let parentValue=group.parentField?value?.[group.parentField]||value?.[masterKey(group.parentField)]:undefined;
  if(!parentValue&&group.key==='district')parentValue=value?.city||value?.cityRegency;
  if(parentValue&&group.parent){
    const parent=data[group.parent]?.find(x=>matchesMasterItem(x, parentValue));
    parentValue=parent?.value||parentValue;
  }
  if(group.key==='district'||group.key==='city'){
    if(!parentValue)return (data[group.key]||[]).slice(0,50);
    return (data[group.key]||[]).filter(x=>x.active&&x.parentValue===parentValue);
  }
  if(equipmentChildren.has(group.key))return (data[group.key]||[]).filter(x=>x.active&&!!parentValue&&x.parentValue===parentValue);
  return (data[group.key]||[]).filter(x=>x.active&&(!parentValue||!x.parentValue||x.parentValue===parentValue));
}
export function resetMasterChildren(key:string,next:any,fieldKeys:string[]){const changed=new Set([masterKey(key)]);for(let pass=0;pass<masterGroups.length;pass++)for(const group of masterGroups)if(group.parent&&changed.has(group.parent)&&!changed.has(group.key)){changed.add(group.key);for(const child of fieldKeys)if(masterKey(child)===group.key)next[child]='';}return next;}
async function saveCatalog(next:MasterCatalog){validateMasterCatalog(next);const result=await api('/master-data','PUT',{catalog:next,revision});setMasterData(result);return result;}

export function MasterItemDialog({groupKey,item,onClose,onSaved,parentValue}:{groupKey:string,item?:MasterItem,onClose:()=>void,onSaved?:(item:MasterItem)=>void,parentValue?:string}){
 const data=useMasterData(),group=masterGroups.find(x=>x.key===groupKey)!;
 const [draft,setDraft]=useState<MasterItem>(item?{...item}:{value:'',name:'',active:true,parentValue:group.parent?(data[group.parent].find(x=>x.value===parentValue||x.name===parentValue)?.value||(groupKey==='province'?data.country.find(x=>x.active)?.value:'')||''):'',role:'BS',required:false,timing:'arrear'}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onClose();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[busy,onClose]);
 async function save(){setBusy(true);setError('');try{if((locationGroups.has(groupKey)||groupKey==='postalCode'||equipmentChildren.has(groupKey))&&group.parent&&!draft.parentValue)throw new Error('Please select '+masterGroups.find(x=>x.key===group.parent)?.name+' first.');const value=locationGroups.has(groupKey)?item?.value||crypto.randomUUID():draft.value.trim()||draft.name.trim(),row={...draft,value,name:draft.name.trim()};const next={...data,[groupKey]:item?data[groupKey].map(x=>x.value===item.value&&(groupKey!=='postalCode'||x.parentValue===item.parentValue)?row:x):[...data[groupKey],row]};await saveCatalog(next);onSaved?.(row);onClose();}catch(e:any){setError(e.message);try{const latest=await api('/master-data');setMasterData(latest);}catch{} }finally{setBusy(false);}}
 return createPortal(<div className="modal-scrim master-modal-scrim"><section className="modal" role="dialog" aria-modal="true" aria-label={`${item?'Edit':'Add'} ${group.name}`}><div className="modal-head"><h2>{item?'Edit':'Add'} · {group.name}</h2><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Close"><X size={20}/></button></div><div className="modal-body"><div className="formgrid"><label>Option name<input autoFocus maxLength={150} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>{!locationGroups.has(groupKey)&&<label>Code / value<input disabled={!!item} maxLength={150} placeholder="Auto-generated from name if empty" value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})}/></label>}{group.parent&&<label>{masterGroups.find(x=>x.key===group.parent)?.name}<select value={draft.parentValue||''} onChange={e=>setDraft({...draft,parentValue:e.target.value,...(groupKey==='village'?{zipCode:''}:{})})}><option value="">{locationGroups.has(groupKey)||groupKey==='postalCode'||equipmentChildren.has(groupKey)?'Select parent':'All / No parent'}</option>{data[group.parent].filter(x=>x.active||x.value===draft.parentValue).map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label>}{groupKey==='province'&&<label>Region<input maxLength={100} placeholder="Region name (optional)" value={draft.region||''} onChange={e=>setDraft({...draft,region:e.target.value})}/></label>}{groupKey==='village'&&<label>ZIP code<select aria-label="ZIP code" value={draft.zipCode||''} onChange={e=>setDraft({...draft,zipCode:e.target.value})}><option value="">Select ZIP code (optional)</option>{data.postalCode.filter(x=>x.value===draft.zipCode||x.active&&(!x.parentValue||x.parentValue===data.district.find(d=>d.value===draft.parentValue)?.parentValue)).map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label>}<label>Status<select value={draft.active?'active':'inactive'} onChange={e=>setDraft({...draft,active:e.target.value==='active'})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>{groupKey==='documents'&&<><label>Review department<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>{['BS','CA','LEGAL'].map(x=><option key={x}>{x}</option>)}</select></label><label>Mandatory document<select value={draft.required?'yes':'no'} onChange={e=>setDraft({...draft,required:e.target.value==='yes'})}><option value="yes">Mandatory</option><option value="no">Optional</option></select></label></>}{groupKey==='paymentMethod'&&<label>Payment timing rule<select value={draft.timing} onChange={e=>setDraft({...draft,timing:e.target.value})}><option value="arrear">Paid in arrear (end of period)</option><option value="advance">Paid in advance (start of period)</option></select></label>}</div>{error&&<div className="error" role="alert">{error}</div>}<p className="master-help">Active options will appear in form dropdowns. Deactivating an option does not delete existing application records.</p></div><div className="modal-actions"><button className="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||!draft.name.trim()} onClick={save}><Save size={15}/>{busy?'Saving…':'Save selection'}</button></div></section></div>,document.body);
}

export function MasterSelect({fieldKey,value,record,disabled,required,onChange,placeholder,onFocus}:{fieldKey:string,value:string,record:any,disabled:boolean,required?:boolean,onChange:(v:string)=>void,placeholder?:string,onFocus?:()=>void}){
 const data=useMasterData(),entries=masterEntries(data,fieldKey,record)||[],group=masterGroups.find(g=>g.key===masterKey(fieldKey))!,cleanVal=(value==='-'||(fieldKey==='postalCode'&&value==='00000'))?'':value,existing=data[group.key]?.find(x=>matchesMasterItem(x, cleanVal)),selectedValue=existing?.value||cleanVal,storeName=group.key==='province'||group.key==='city'||group.key==='district'||group.key==='village';
 const select=(id:string)=>{const item=entries.find(x=>x.value===id)||data[group.key]?.find(x=>x.value===id);onChange(storeName&&item?item.name:id);};
 const emptyLabel = placeholder || (group.key === 'remarkCategoryId' ? 'Select Category' : `Select ${group.name}`);
 return <select required={required} disabled={disabled} value={selectedValue} onFocus={onFocus} onChange={e=>select(e.target.value)}><option value="">{emptyLabel}</option>{selectedValue&&!entries.some(x=>x.value===selectedValue)&&<option value={selectedValue}>{existing?.name||value}{existing&&!existing.active?' · Inactive':''}</option>}{entries.map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select>;
}

export function MasterMandatoryView({canManage=true, onLogActivity}:{canManage?:boolean, onLogActivity?:(msg:string)=>void}){
  const rules = useMandatoryRules();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'FAP' | 'PRE-AN'>('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const getSectionBadgeStyle = (sec: string, stage?: string) => {
    const s = String(sec || '').toLowerCase();
    const st = String(stage || '').toUpperCase();
    if (st === 'PRE-AN' || st === 'PRE') {
      if (s.includes('general')) return { color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' };
      if (s.includes('project')) return { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' };
      if (s.includes('customer') || s.includes('group') || s.includes('background')) return { color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' };
      if (s.includes('equipment')) return { color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
      if (s.includes('delivery') || s.includes('qa')) return { color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' };
      if (s.includes('cross') || s.includes('check') || s.includes('dealer') || s.includes('lmi')) return { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' };
      if (s.includes('conclusion') || s.includes('expert') || s.includes('recommendation')) return { color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' };
      return { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
    }
    if (s.includes('debtor') || s.includes('identity') || s.includes('classification')) {
      return { color: '#3730a3', bg: '#eef2ff', border: '#c7d2fe' };
    }
    if (s.includes('domicile') || s.includes('office') || s.includes('registration')) {
      return { color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
    }
    if (s.includes('business') || s.includes('legality') || s.includes('deed')) {
      return { color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
    }
    if (s.includes('pic') || s.includes('contact') || s.includes('primary contact')) {
      return { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
    }
    if (s.includes('industry') || s.includes('projects') || s.includes('segmentation')) {
      return { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' };
    }
    return { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
  };

  const fapRules = rules.filter(r => (r.stage || 'FAP').toUpperCase() === 'FAP');
  const preRules = rules.filter(r => { const s = (r.stage || '').toUpperCase(); return s === 'PRE-AN' || s === 'PRE'; });
  const fapMandatoryCount = fapRules.filter(r => r.mandatory).length;
  const preMandatoryCount = preRules.filter(r => r.mandatory).length;
  const mandatoryCount = rules.filter(x => x.mandatory).length;

  const visible = rules.filter(x => {
    const rStage = (x.stage || 'FAP').toUpperCase();
    const matchStage = stageFilter === 'ALL' || rStage === stageFilter;
    const matchSection = selectedSection === 'ALL' || x.section === selectedSection;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === '1' ? Boolean(x.mandatory) : !x.mandatory);
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      String(x.field_label || '').toLowerCase().includes(q) ||
      String(x.field_key || '').toLowerCase().includes(q) ||
      String(x.section || '').toLowerCase().includes(q) ||
      ((rStage === 'PRE-AN' || rStage === 'PRE') && (q.includes('pre') || q.includes('analysis'))) ||
      (rStage === 'FAP' && (q.includes('fap') || q.includes('stage')));
    return matchStage && matchSection && matchStatus && matchSearch;
  });

  async function handleToggle(item: any, forceStatus?: number) {
    if (!canManage) return;
    const nextVal = forceStatus !== undefined ? forceStatus : (item.mandatory ? 0 : 1);
    setBusyId(item.id);
    try {
      const res = await api('/mandatory', 'PUT', { id: item.id, mandatory: nextVal });
      if (Array.isArray(res)) {
        setMandatoryRules(res);
      }
      const label = item.field_label || item.field_key;
      const stageName = ((item.stage || 'FAP').toUpperCase() === 'PRE-AN' || (item.stage || 'FAP').toUpperCase() === 'PRE') ? 'PRE-AN' : 'FAP';
      const msg = `[${stageName}] Field "${label}" successfully updated to ${nextVal ? 'Mandatory (1)' : 'Optional (0)'}.`;
      setToast(msg);
      onLogActivity?.(`Updated mandatory status for [${stageName}] field ${label} (${item.field_key}) to ${nextVal ? 'Mandatory' : 'Optional'}`);
      setTimeout(() => setToast(''), 3500);
    } catch (e: any) {
      alert('Failed to update mandatory status: ' + e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="master-content" style={{ width: '100%', padding: '24px 32px', boxSizing: 'border-box' }}>
      <div className="section-title">
        <div>
          <h3 style={{ fontSize: 18, color: '#002060', fontWeight: 700 }}>Field Mandatory</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Manage column rules for whether a field is mandatory (1) or optional (0) for <b>FAP</b> and <b>PRE-AN</b>. Changes are saved directly to the database and automatically display a red asterisk (*) on form labels.
          </p>
        </div>
      </div>

      {toast && (
        <div style={{
          padding: '10px 14px',
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          color: '#065f46',
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Check size={16} color="#059669" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div className="search" style={{ margin: 0, flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={16} />
          <input
            placeholder="Search label, field key, section, stage..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stage Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={stageFilter}
            onChange={e => {
              setStageFilter(e.target.value as any);
              setSelectedSection('ALL');
            }}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: '#ffffff',
              color: '#002060',
              cursor: 'pointer'
            }}
            aria-label="Filter Stage"
          >
            <option value="ALL">All Stages (FAP & PRE-AN) ({rules.length})</option>
            <option value="FAP">FAP ({fapRules.length})</option>
            <option value="PRE-AN">PRE-AN ({preRules.length})</option>
          </select>
        </div>

        {/* Section Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              minWidth: 280
            }}
            aria-label="Filter Section"
          >
            {stageFilter === 'FAP' ? (
              <>
                <option value="ALL">All FAP Sections ({fapRules.length})</option>
                {MANDATORY_SECTIONS_FAP.map(sec => {
                  const count = fapRules.filter(r => resolveRuleSection(r) === sec).length;
                  return (
                    <option key={sec} value={sec}>
                      {sec} ({count})
                    </option>
                  );
                })}
              </>
            ) : stageFilter === 'PRE-AN' ? (
              <>
                <option value="ALL">All PRE-AN Sections ({preRules.length})</option>
                {MANDATORY_SECTIONS_PRE.map(sec => {
                  const count = preRules.filter(r => resolveRuleSection(r) === sec).length;
                  return (
                    <option key={sec} value={sec}>
                      {sec} ({count})
                    </option>
                  );
                })}
              </>
            ) : (
              <>
                <option value="ALL">All Sections ({rules.length})</option>
                <optgroup label="FAP">
                  {MANDATORY_SECTIONS_FAP.map(sec => {
                    const count = fapRules.filter(r => resolveRuleSection(r) === sec).length;
                    return (
                      <option key={`fap-${sec}`} value={sec}>
                        FAP · {sec} ({count})
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="PRE-AN">
                  {MANDATORY_SECTIONS_PRE.map(sec => {
                    const count = preRules.filter(r => resolveRuleSection(r) === sec).length;
                    return (
                      <option key={`pre-${sec}`} value={sec}>
                        PRE · {sec} ({count})
                      </option>
                    );
                  })}
                </optgroup>
              </>
            )}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff' }}
            aria-label="Filter Status Mandatory"
          >
            <option value="ALL">All Status</option>
            <option value="1">Mandatory Only (1)</option>
            <option value="0">Optional Only (0)</option>
          </select>
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        padding: '10px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 12,
        color: '#475569',
        marginBottom: 16,
        alignItems: 'center'
      }}>
        <span>Total Fields: <b>{rules.length}</b></span>
        <span>•</span>
        <span style={{ color: '#0284c7', fontWeight: 600 }}>
          FAP: <b>{fapRules.length}</b> ({fapMandatoryCount} Mandatory)
        </span>
        <span>•</span>
        <span style={{ color: '#b45309', fontWeight: 600 }}>
          PRE-AN: <b>{preRules.length}</b> ({preMandatoryCount} Mandatory)
        </span>
        <span>•</span>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>
          * Total Mandatory: <b>{mandatoryCount}</b>
        </span>
        <span>•</span>
        <span style={{ color: '#64748b' }}>
          Total Optional: <b>{rules.length - mandatoryCount}</b>
        </span>
      </div>

      <div className="table-scroll">
        <table className="data-table master-table" style={{ width: '100%', minWidth: 1040, borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{ width: 45, textAlign: 'center', padding: '12px 8px' }}>NO</th>
              <th style={{ width: 140, textAlign: 'center', padding: '12px 10px' }}>STAGE</th>
              <th style={{ width: 260, minWidth: 260, textAlign: 'left', padding: '12px 14px' }}>SECTION</th>
              <th style={{ minWidth: 220, textAlign: 'left', padding: '12px 14px' }}>FIELD LABEL</th>
              <th style={{ width: 190, minWidth: 190, textAlign: 'left', padding: '12px 14px' }}>FIELD KEY</th>
              <th style={{ textAlign: 'center', width: 150, padding: '12px 14px' }}>MANDATORY STATUS</th>
              {canManage && <th style={{ textAlign: 'center', width: 190, padding: '12px 14px' }}>ACTION</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((x, idx) => {
              const secName = resolveRuleSection(x);
              const rStage = (x.stage || 'FAP').toUpperCase();
              const isPre = rStage === 'PRE-AN' || rStage === 'PRE';
              const st = getSectionBadgeStyle(secName, rStage);
              return (
                <tr key={x.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, padding: '12px 8px' }}>
                    {idx + 1}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {isPre ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#92400e',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        padding: '3px 8px',
                        borderRadius: 9999,
                        letterSpacing: '0.02em',
                        boxShadow: '0 1px 2px rgba(180, 83, 9, 0.06)'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                        PRE-AN
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#1d4ed8',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '3px 8px',
                        borderRadius: 9999,
                        letterSpacing: '0.02em',
                        boxShadow: '0 1px 2px rgba(29, 78, 216, 0.06)'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                        FAP
                      </span>
                    )}
                  </td>
                  <td style={{ width: 260, minWidth: 260, padding: '12px 14px', verticalAlign: 'middle' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      lineHeight: 1.35,
                      color: st.color,
                      background: st.bg,
                      border: `1px solid ${st.border}`,
                      padding: '4px 9px',
                      borderRadius: 5,
                      display: 'inline-block',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      maxWidth: 250
                    }}>
                      {secName}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 600, color: '#0f172a', fontSize: 12 }}>
                    {x.field_label}
                  </td>
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle', width: 190, minWidth: 190 }}>
                    <code style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 7px', borderRadius: 4, color: '#334155', fontFamily: 'monospace' }}>
                      {x.field_key}
                    </code>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 14px', verticalAlign: 'middle' }}>
                    {x.mandatory ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b91c1c',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '3px 9px',
                        borderRadius: 9999
                      }}>
                        * Mandatory (1)
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: 11,
                        color: '#64748b',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '3px 9px',
                        borderRadius: 9999
                      }}>
                        Optional (0)
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td style={{ textAlign: 'center', padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          disabled={busyId === x.id}
                          className={x.mandatory ? 'button small' : 'button primary small'}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => handleToggle(x)}
                          title={x.mandatory ? 'Change to optional (0)' : 'Make mandatory (1)'}
                        >
                          {busyId === x.id ? (
                            'Saving...'
                          ) : x.mandatory ? (
                            <>
                              <X size={12} style={{ marginRight: 3 }} />
                              Set Optional (0)
                            </>
                          ) : (
                            <>
                              <Check size={12} style={{ marginRight: 3 }} />
                              Set Mandatory (1)
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === x.id}
                          className="button small"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => setEditingItem(x)}
                          title="Edit field rule"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty-small">No fields match the search or filter.</div>
        )}
      </div>

      {editingItem && (
        <EditMandatoryDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={(status) => {
            handleToggle(editingItem, status);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function EditMandatoryDialog({ item, onClose, onSaved }: { item: any, onClose: () => void, onSaved: (status: number) => void }) {
  const [val, setVal] = useState<number>(item.mandatory ? 1 : 0);
  const isPre = (item.stage || 'FAP').toUpperCase() === 'PRE-AN' || (item.stage || 'FAP').toUpperCase() === 'PRE';
  return createPortal(
    <div className="modal-scrim master-modal-scrim">
      <section className="modal" role="dialog" aria-modal="true" aria-label={`Edit Mandatory · ${item.field_label}`}>
        <div className="modal-head">
          <h2>Edit Mandatory Rule · {item.field_label}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button>
        </div>
        <div className="modal-body">
          <div className="formgrid">
            <label>Application Stage
              <input disabled value={isPre ? 'PRE-AN' : 'FAP'} />
            </label>
            <label>Section
              <input disabled value={resolveRuleSection(item)} />
            </label>
            <label>Field Label
              <input disabled value={item.field_label} />
            </label>
            <label>Field Key
              <input disabled value={item.field_key} />
            </label>
            <label>Mandatory Status in Database
              <select value={val} onChange={e => setVal(Number(e.target.value))}>
                <option value={0}>0 — Optional (Not required)</option>
                <option value={1}>1 — Mandatory (Required, red asterisk *)</option>
              </select>
            </label>
          </div>
          <p className="master-help">
            If set to <b>Mandatory (1)</b>, the system validates this column before application submission, and automatically displays a red asterisk (*) on form labels.
          </p>
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onClose}>Cancel</button>
          <button className="button primary" onClick={() => onSaved(val)}>
            <Save size={15}/> Save Changes
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function MasterDataPage(){
  const data=useMasterData(),[selected,setSelected]=useState('master_mandatory'),[search,setSearch]=useState(''),[editing,setEditing]=useState<MasterItem|null|undefined>(undefined);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [burgerSearch, setBurgerSearch] = useState('');
  const mandatoryRules=useMandatoryRules();
  const group=masterGroups.find(g=>g.key===selected)||masterGroups[0];
  const visible=(data[selected]||[]).filter(x=>(x.name+' '+x.value).toLowerCase().includes(search.toLowerCase()));

  const currentCategoryTitle = selected === 'master_mandatory'
    ? 'Field Mandatory (FAP & PRE-AN)'
    : selected === 'location'
      ? 'Indonesian Region'
      : group.name;

  async function handleDelete(item:MasterItem){
    if(!confirm(`Delete "${item.name}" from ${group.name}?`))return;
    const next={...data,[selected]:(data[selected]||[]).filter(x=>x.value!==item.value)};
    try{
      await saveCatalog(next);
    }catch(e:any){
      alert('Failed to delete: '+e.message);
    }
  }

  return (
    <section className="panel master-page" style={{ width: '100%' }}>
      {/* Panel Header with Burger Menu Toggle */}
      <div className="panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '18px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            className="master-burger-toggle-btn"
            onClick={() => { setBurgerSearch(''); setBurgerOpen(true); }}
            title="Click to open master data catalog menu"
          >
            <Menu size={18} />
            <span>Master Data Catalog</span>
          </button>

          <div className="master-selected-indicator">
            <span className="master-selected-label">Active Category:</span>
            <span className="master-selected-chip">{currentCategoryTitle}</span>
          </div>
        </div>
      </div>

      {/* Pop-up Burger Menu Drawer */}
      {burgerOpen && createPortal(
        <div className="master-burger-scrim" onClick={() => setBurgerOpen(false)}>
          <aside
            className="master-burger-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Master Data Catalog"
            onClick={e => e.stopPropagation()}
          >
            <div className="master-burger-drawer-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Menu size={18} color="#002060" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#002060' }}>Master Data Catalog</h3>
              </div>
              <button
                type="button"
                className="master-burger-close-btn"
                onClick={() => setBurgerOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="master-burger-drawer-search">
              <Search size={14} color="#64748b" />
              <input
                placeholder="Search master catalog..."
                value={burgerSearch}
                onChange={e => setBurgerSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="master-burger-drawer-content" role="navigation">
              {/* FORM RULES */}
              {(!burgerSearch || 'field mandatory form rules fap pre'.includes(burgerSearch.toLowerCase())) && (
                <div className="master-burger-group">
                  <h4>FORM RULES</h4>
                  <button
                    type="button"
                    className={`master-burger-item ${selected === 'master_mandatory' ? 'active' : ''}`}
                    onClick={() => { setSelected('master_mandatory'); setSearch(''); setBurgerOpen(false); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Settings2 size={15} color="#002060" />
                      <span>Field Mandatory</span>
                    </div>
                    <span className="master-burger-badge mandatory">
                      {mandatoryRules.filter(x => x.mandatory).length} / {mandatoryRules.length}
                    </span>
                  </button>
                </div>
              )}

              {/* LOKASI */}
              {(!burgerSearch || 'indonesian region lokasi location country province city wilayah'.includes(burgerSearch.toLowerCase())) && (
                <div className="master-burger-group">
                  <h4>INDONESIAN REGION</h4>
                  <button
                    type="button"
                    className={`master-burger-item ${selected === 'location' ? 'active' : ''}`}
                    onClick={() => { setSelected('location'); setSearch(''); setBurgerOpen(false); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={15} color="#002060" />
                      <span>Indonesian Region</span>
                    </div>
                  </button>
                </div>
              )}

              {/* OTHER GROUPS: LEGAL, ADDRESS, CUSTOMER, etc. */}
              {[...new Set(masterGroups.map(x => x.section))].map(section => {
                const filteredItems = masterGroups
                  .filter(x => x.section === section)
                  .filter(g => !burgerSearch || g.name.toLowerCase().includes(burgerSearch.toLowerCase()) || section.toLowerCase().includes(burgerSearch.toLowerCase()));
                if (!filteredItems.length) return null;
                return (
                  <div key={section} className="master-burger-group">
                    <h4>{section}</h4>
                    {filteredItems.map(g => (
                      <button
                        key={g.key}
                        type="button"
                        className={`master-burger-item ${selected === g.key ? 'active' : ''}`}
                        onClick={() => { setSelected(g.key); setSearch(''); setBurgerOpen(false); }}
                      >
                        <span>{g.name}</span>
                        <span className="master-burger-badge">
                          {data[g.key]?.filter(x => x.active).length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* Main Content Area - Full Width */}
      {selected === 'location' ? (
        <LocationConfiguration />
      ) : selected === 'master_mandatory' ? (
        <div className="master-page-layout">
          <MasterMandatoryView />
        </div>
      ) : (
        <div className="master-page-layout">
          <div className="master-content" style={{ width: '100%', padding: '24px 32px', boxSizing: 'border-box' }}>
            <div className="section-title">
              <div>
                <h3 style={{ fontSize: 18, color: '#002060', fontWeight: 700 }}>{group.name}</h3>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Manage dropdown choices for {group.section}.</p>
              </div>
              <button className="button primary small" onClick={() => setEditing(null)}>
                <Plus size={15} /> Add data
              </button>
            </div>
            {group.key === 'documents' && (
              <p className="master-help">
                Document types, review departments, and mandatory flags apply to new applications. Newly added document types also appear in existing application checklists without altering existing files.
              </p>
            )}
            <div className="search" style={{ margin: '14px 0', maxWidth: 400 }}>
              <Search size={16} />
              <input
                aria-label="Cari master data"
                placeholder={locationGroups.has(selected) ? 'Search name…' : 'Search name or code…'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="table-scroll">
              <table className="data-table master-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th>NAME</th>
                    {!locationGroups.has(selected) && <th>CODE / VALUE</th>}
                    {group.parent && <th>PARENT</th>}
                    {selected === 'documents' && (
                      <>
                        <th>DEPARTMENT</th>
                        <th>MANDATORY</th>
                      </>
                    )}
                    <th>STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(x => (
                    <tr key={x.value} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{x.name}</td>
                      {!locationGroups.has(selected) && <td><code>{x.value}</code></td>}
                      {group.parent && (
                        <td>{data[group.parent].find(p => p.value === x.parentValue)?.name || 'All'}</td>
                      )}
                      {selected === 'documents' && (
                        <>
                          <td>{x.role}</td>
                          <td>{x.required ? 'Mandatory' : 'Optional'}</td>
                        </>
                      )}
                      <td>
                        <span className={'deed-validity ' + (x.active ? 'active' : 'inactive')}>
                          {x.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                          <button className="button small" onClick={() => setEditing(x)}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            className="button small legal-delete-button"
                            onClick={() => handleDelete(x)}
                            title={`Delete ${x.name}`}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && (
                <div className="empty-small">No options yet. Click Add data to create one.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {editing !== undefined && (
        <MasterItemDialog
          key={selected}
          groupKey={selected}
          item={editing || undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </section>
  );
}

function LocationConfiguration(){
 const data=useMasterData(),[countryValue,setCountry]=useState(''),[path,setPath]=useState<Record<string,string>>({}),[editing,setEditing]=useState<{key:string,item?:MasterItem,parent?:string}|null>(null),[search,setSearch]=useState(''),[showInactive,setShowInactive]=useState(false);
 const countries=data.country.filter(x=>x.active),country=countries.find(x=>x.value===countryValue)||countries[0];
 const groups=['province','city','district','village'];
 const levels:{key:string,parent?:MasterItem,items:MasterItem[],selected?:MasterItem}[]=[];
 for(const key of groups){const parent=levels.length?levels.at(-1)?.selected:country;const items=parent?(data[key]||[]).filter(x=>x.parentValue===parent.value||!x.parentValue):[];const selected=items.find(x=>x.value===path[key]&&x.active)||items.find(x=>x.active);levels.push({key,parent,items,selected});}
 const select=(key:string,value:string)=>setPath(old=>{const next={...old,[key]:value};for(const child of groups.slice(groups.indexOf(key)+1))delete next[child];return next;});
 return <div className="location-config"><div className="location-config-toolbar"><div><span className="location-eyebrow"><MapPin size={14}/>INDONESIAN REGION</span><h3>Indonesian Region</h3><p>Select regions from left to right to manage nested location data.</p></div><div className="location-country"><label>Country<select aria-label="Country location" value={country?.value||''} onChange={e=>{setCountry(e.target.value);setPath({});}}><option value="">Select country</option>{countries.map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label><button className="button small" aria-label="Edit country" disabled={!country} onClick={()=>setEditing({key:'country',item:country})}><Pencil size={14}/></button><button className="button small" onClick={()=>setEditing({key:'country'})}><Plus size={14}/>Country</button></div></div><div className="location-config-controls"><div className="location-breadcrumb">{[country,...levels.map(x=>x.selected)].filter(Boolean).map((x,i)=><span key={i}>{i>0&&<ChevronRight size={12}/>}<b>{x?.name}</b></span>)}</div><div className="location-search"><Search size={14}/><input aria-label="Search region" placeholder="Search region..." value={search} onChange={e=>setSearch(e.target.value)}/></div><label className="checkbox"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/>Show inactive</label></div><div className="location-columns">{levels.map(({key,parent,items,selected},index)=>{const title=masterGroups.find(g=>g.key===key)!.name,visible=items.filter(x=>(showInactive||x.active)&&x.name.toLowerCase().includes(search.toLowerCase()));return <section className="location-column" key={key} aria-label={title}><header><div><span className="location-step">{index+1}</span><h4>{title}</h4><span className="location-item-count">{items.filter(x=>x.active).length}</span></div><button className="location-add" aria-label={`Add ${title}`} title={parent?`Add ${title}`:'Select parent region first'} disabled={!parent} onClick={()=>setEditing({key,parent:parent?.value})}><Plus size={17}/></button></header><div className="location-parent-caption">{parent?.name||'Select parent region'}</div><div className="location-column-scroll"><table><thead><tr><th>NAME</th>{key==='province'&&<th>REGION</th>}{key==='village'&&<th>ZIP CODE</th>}<th/></tr></thead><tbody>{visible.map(x=><tr key={x.value} className={(selected?.value===x.value?'selected ':'')+(!x.active?'inactive':'')}><td><button className="location-select-row" disabled={!x.active} aria-pressed={selected?.value===x.value} onClick={()=>select(key,x.value)}><b>{x.name}</b>{!x.active&&<span>Inactive</span>}</button></td>{key==='province'&&<td>{x.region||'—'}</td>}{key==='village'&&<td>{data.postalCode.find(p=>p.value===x.zipCode)?.name||x.zipCode||'—'}</td>}<td><button className="location-edit" aria-label={`Edit ${x.name}`} onClick={()=>setEditing({key,item:x,parent:parent?.value})}><Pencil size={13}/></button></td></tr>)}</tbody></table>{!visible.length&&<div className="location-empty">{!parent?'Select a region in the previous column.':search?'No matching regions.':`No ${title.toLowerCase()} for ${parent.name}.`}</div>}</div></section>;})}</div><div className="location-config-footer"><span>Active options are available in application forms. Use Edit to update data or deactivate regions.</span><button className="button small" onClick={()=>setEditing({key:'postalCode',parent:levels.find(x=>x.key==='city')?.selected?.value})}><Plus size={14}/>Add ZIP code</button></div>{editing&&<MasterItemDialog key={editing.key+':'+(editing.item?.value||'new')} groupKey={editing.key} item={editing.item} parentValue={editing.parent} onClose={()=>setEditing(null)} onSaved={item=>{if(editing.key==='country'){setCountry(item.value);setPath({});}else if(groups.includes(editing.key))select(editing.key,item.value);}}/>}</div>;
}
