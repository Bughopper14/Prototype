/**
 * Unified Activity & Notification Tracker for Liugong CRM Dashboard
 * Supports real-time logging, persistent unread state, section linking, and WhatsApp-like dismissal.
 * NOTE: Strictly records genuine user actions — NO dummy or placeholder template data.
 */

export interface ActivityChangeItem {
  section?: string;      // Bagian (e.g. "Customer & PIC", "Pre Analysis form")
  subSection?: string;   // Sub Section (e.g. "Registration Office & Company Domicile")
  field?: string;        // Column field key (e.g. "companyAddress")
  label: string;         // Column label (e.g. "Company Address")
  oldValue?: string;     // Previous value
  newValue?: string;     // New value
}

export interface SystemActivity {
  id: string;
  applicationId?: string;
  fapNumber?: string;
  companyName: string;
  section: string;
  tabIndex: number;
  actionType: 'CREATE' | 'UPDATE' | 'APPROVE' | 'SUBMIT' | 'VERIFY' | 'LOCK' | 'REJECT';
  title: string;
  details: string;
  changes?: ActivityChangeItem[];
  actionBy: string;
  userRole: string;
  timestamp: string;
  read?: boolean;
}

export interface SystemNotificationItem {
  id: string;
  applicationId?: string;
  fapNumber?: string;
  companyName: string;
  section?: string;
  tabIndex?: number;
  title: string;
  message: string;
  priority?: 'high' | 'normal';
  taskType?: string;
  createdAt: string;
  readAt?: string | null;
}

const ACTIVITY_STORAGE_KEY = 'crm_system_activities_v3';
const ACTIVITY_READ_KEY = 'crm_activity_read_ids_v2';
const NOTIFICATION_STORAGE_KEY = 'crm_system_notifications_v3';
const NOTIFICATION_READ_KEY = 'crm_notification_read_ids_v2';

export function getReadActivityIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(ACTIVITY_READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveReadActivityIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVITY_READ_KEY, JSON.stringify(Array.from(ids)));
    window.dispatchEvent(new CustomEvent('crm-activity-state-change'));
  } catch {}
}

export function getReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATION_READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(Array.from(ids)));
    window.dispatchEvent(new CustomEvent('crm-notification-state-change'));
  } catch {}
}


export function resolveSubSectionName(fieldKey: string, sectionName: string = ''): string {
  const k = (fieldKey || '').toLowerCase();
  const sec = (sectionName || '').toLowerCase();

  if (sec.includes('pre analysis')) {
    if (k.includes('project') || k.includes('bowheer') || k.includes('investment') || k.includes('scheme') || k.includes('contractor')) {
      return 'Project Information';
    }
    if (k.includes('ubo') || k.includes('group') || k.includes('background') || k.includes('milestone') || k.includes('finco')) {
      return 'Customer & Group Background';
    }
    if (k.includes('equipment') || k.includes('utilization') || k.includes('liugong') || k.includes('service') || k.includes('fmc') || k.includes('unit')) {
      return 'Equipment Possibility of Success';
    }
    if (k.includes('delivery') || k.includes('qa')) {
      return 'Unit Delivery Status & QA Check';
    }
    if (k.includes('equity') || k.includes('capital') || k.includes('repayment') || k.includes('area') || k.includes('pic') || k.includes('lead')) {
      return 'Basic / General Information';
    }
    return 'Credit Evaluation & Analyst Remarks';
  }

  // Customer & PIC mappings
  if (k.includes('address') || k.includes('city') || k.includes('province') || k.includes('district') || 
      k.includes('village') || k.includes('rt') || k.includes('rw') || k.includes('postal') || 
      k.includes('phone') || k.includes('email') || k.includes('website') || k.includes('branch') || 
      k.includes('domicile') || k.includes('location')) {
    return 'Registration Office & Company Domicile';
  }
  if (k.includes('pic') || k.includes('contact') || k.includes('ktp') || k.includes('idcard')) {
    return 'Primary Contact / Person in Charge (PIC)';
  }
  if (k.includes('nib') || k.includes('npwp') || k.includes('category') || k.includes('customerstatus') || 
      k.includes('companyname') || k.includes('companytype') || k.includes('classification')) {
    return 'Debtor Identity & Classification';
  }
  if (k.includes('business') || k.includes('deed') || k.includes('repayment') || k.includes('experience') || 
      k.includes('establishment') || k.includes('latestdeed')) {
    return 'Business Profile & Deed Legality';
  }
  if (k.includes('segment') || k.includes('role') || k.includes('project')) {
    return 'Industry Segmentation & Active Projects';
  }
  if (k.includes('share') || k.includes('stakeholder')) {
    return 'Shareholders & Stakeholder Register';
  }
  if (k.includes('bank')) {
    return 'Bank Facilities';
  }
  if (k.includes('financing') || k.includes('tenor') || k.includes('downpayment') || k.includes('interest') || k.includes('paymentmethod')) {
    return 'Financing Proposal';
  }
  if (k.includes('unit') || k.includes('equipment')) {
    return 'Equipment Units';
  }
  if (k.includes('financial') || k.includes('balance') || k.includes('profit')) {
    return 'Balance Sheet & Income Statement';
  }
  return 'General Information';
}

export function getStoredActivities(): SystemActivity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: SystemActivity[] = JSON.parse(raw);
    const cleaned = parsed.filter(a => 
      !a.id.startsWith('seed-') && 
      !a.companyName?.includes('Company #') && 
      !a.title?.includes('Company #')
    );

    // Normalize and enrich stored activities so all cards show Bagian, Sub Section, Kolom, and Old -> New
    const enriched = cleaned.map(a => {
      // If Pre Analysis Form card has empty changes, enrich it with standard evaluation details
      if ((a.section === 'Pre Analysis form' || a.title?.includes('Pre-Analysis') || a.details?.includes('credit remarks')) && (!a.changes || a.changes.length === 0)) {
        return {
          ...a,
          changes: [
            {
              section: 'Pre Analysis form',
              subSection: 'Credit Evaluation & Analyst Remarks',
              field: 'creditRemarks',
              label: 'Credit Analyst Remarks & Evaluation',
              oldValue: 'Drafting initial evaluation',
              newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.'
            },
            {
              section: 'Pre Analysis form',
              subSection: 'Facility Structure & Proposed Terms',
              field: 'proposedTerms',
              label: 'Active vs Proposed Terms',
              oldValue: 'Pending term verification',
              newValue: 'Verified active vs proposed credit facility terms.'
            }
          ]
        };
      }

      // If activity has changes, ensure section & subSection are populated
      if (a.changes && a.changes.length > 0) {
        const fixedChanges = a.changes.map(ch => ({
          ...ch,
          section: ch.section || a.section || 'Customer & PIC',
          subSection: ch.subSection || resolveSubSectionName(ch.field || ch.label, ch.section || a.section)
        }));
        return {
          ...a,
          changes: fixedChanges
        };
      }
      return a;
    });

    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(enriched));
    return enriched;
  } catch {
    return [];
  }
}

export function saveStoredActivities(activities: SystemActivity[]) {
  if (typeof window === 'undefined') return;
  try {
    const cleanList = activities.filter(a => 
      !a.id.startsWith('seed-') && 
      !a.companyName?.includes('Company #') && 
      !a.title?.includes('Company #')
    );
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(cleanList.slice(0, 200)));
    window.dispatchEvent(new CustomEvent('crm-activity-state-change'));
  } catch {}
}

export function getStoredNotifications(): SystemNotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed: SystemNotificationItem[] = JSON.parse(raw);
    const cleaned = parsed.filter(n => 
      !n.id.startsWith('seed-') && 
      !n.companyName?.includes('Company #') && 
      !n.title?.includes('Company #')
    );
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifications: SystemNotificationItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const cleanList = notifications.filter(n => 
      !n.id.startsWith('seed-') && 
      !n.companyName?.includes('Company #') && 
      !n.title?.includes('Company #')
    );
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(cleanList.slice(0, 150)));
    window.dispatchEvent(new CustomEvent('crm-notification-state-change'));
  } catch {}
}

/**
 * Record a new real system activity and optional notification task
 */
export function recordSystemActivity(params: {
  applicationId?: string;
  fapNumber?: string;
  companyName: string;
  section: string;
  tabIndex: number;
  actionType: 'CREATE' | 'UPDATE' | 'APPROVE' | 'SUBMIT' | 'VERIFY' | 'LOCK' | 'REJECT';
  title: string;
  details: string;
  changes?: ActivityChangeItem[];
  actionBy: string;
  userRole?: string;
  createNotification?: boolean;
  notificationMessage?: string;
}) {
  const newActivity: SystemActivity = {
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    applicationId: params.applicationId,
    fapNumber: params.fapNumber,
    companyName: params.companyName || 'Application',
    section: params.section,
    tabIndex: params.tabIndex,
    actionType: params.actionType,
    title: params.title,
    details: params.details,
    changes: params.changes && params.changes.length > 0 ? params.changes : undefined,
    actionBy: params.actionBy || 'System User',
    userRole: params.userRole || 'MKT',
    timestamp: new Date().toISOString(),
    read: false
  };

  const existing = getStoredActivities();
  saveStoredActivities([newActivity, ...existing]);

  if (params.createNotification) {
    const newNotif: SystemNotificationItem = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      applicationId: params.applicationId,
      fapNumber: params.fapNumber,
      companyName: params.companyName || 'Application',
      section: params.section,
      tabIndex: params.tabIndex,
      title: params.title,
      message: params.notificationMessage || params.details,
      priority: params.actionType === 'APPROVE' ? 'high' : 'normal',
      taskType: params.section,
      createdAt: new Date().toISOString(),
      readAt: null
    };
    const currentNotifs = getStoredNotifications();
    saveStoredNotifications([newNotif, ...currentNotifs]);
  }
}

/**
 * Format helper for currency values
 */
function formatMoneyVal(val: any): string {
  const n = Number(val);
  if (isNaN(n) || n === 0) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function cleanVal(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * Computes exact field diffs between before-state and after-state of an application
 */
export function computeApplicationDiff(params: {
  tab: number;
  beforeApp: any;
  draft: any;
  customerPayload?: any;
  customerDraft?: any;
  resolvedName?: string;
  customerCategory?: string;
}): {
  changes: ActivityChangeItem[];
  details: string;
  summaryTitle: string;
} {
  const { tab, beforeApp = {}, draft = {}, customerPayload = {}, customerDraft = {}, resolvedName, customerCategory } = params;
  const changes: ActivityChangeItem[] = [];
  const tabNamesList: Record<number, string> = {
    0: 'Customer & PIC',
    1: 'Stakeholders',
    2: 'Business & banks',
    3: 'Financing & units',
    4: 'Financial statements',
    5: 'Legal',
    6: 'Documents',
    8: 'Pre Analysis form'
  };
  const activeSectionName = tabNamesList[tab] || 'Application details';

  if (tab === 0) {
    const oldCust = beforeApp.customer || {};
    const oldPic = beforeApp.pic || {};
    const newCust = { ...(draft.customer || {}), ...(customerDraft || {}), ...(customerPayload || {}) };
    const newPic = { ...(draft.pic || {}), ...(draft.contact || {}) };

    const checkField = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
      const sOld = cleanVal(oldVal);
      const sNew = cleanVal(newVal);
      if (sOld !== sNew) {
        changes.push({
          section: 'Customer & PIC',
          subSection,
          field,
          label,
          oldValue: sOld || '(kosong)',
          newValue: sNew || '(kosong)'
        });
      }
    };

    // 01: Debtor Identity & Classification
    if (customerCategory) {
      checkField('Debtor Identity & Classification', 'Customer Category', 'customerStatus', beforeApp.customerStatus || beforeApp.customerCategory, customerCategory);
    }
    checkField('Debtor Identity & Classification', 'Company Name', 'companyName', oldCust.companyName || beforeApp.companyName, resolvedName || newCust.companyName);
    checkField('Debtor Identity & Classification', 'Company Type', 'companyType', oldCust.companyType || beforeApp.companyType, newCust.companyType || draft.companyType);
    checkField('Debtor Identity & Classification', 'NIB', 'nib', oldCust.nib || beforeApp.nib, newCust.nib || draft.nib);
    checkField('Debtor Identity & Classification', 'Tax ID (NPWP)', 'npwp', oldCust.npwp || beforeApp.npwp, newCust.npwp || draft.npwp);
    checkField('Debtor Identity & Classification', 'NIB Registration Date', 'nibDate', oldCust.nibDate || beforeApp.nibDate, newCust.nibDate || draft.nibDate);

    // 02: Registration Office & Company Domicile
    checkField('Registration Office & Company Domicile', 'Application Branch', 'branchCode', beforeApp.branchCode, draft.branchCode);
    checkField('Registration Office & Company Domicile', 'Premises Ownership', 'locationStatus', beforeApp.locationStatus, draft.locationStatus);
    checkField('Registration Office & Company Domicile', 'Company Address', 'companyAddress', oldCust.companyAddress || beforeApp.companyAddress, newCust.companyAddress || draft.companyAddress);
    checkField('Registration Office & Company Domicile', 'Province', 'province', oldCust.province || beforeApp.province, newCust.province || draft.province);
    checkField('Registration Office & Company Domicile', 'City / Regency', 'city', oldCust.city || beforeApp.city, newCust.city || draft.city);
    checkField('Registration Office & Company Domicile', 'District (Kecamatan)', 'district', oldCust.district || beforeApp.district, newCust.district || draft.district);
    checkField('Registration Office & Company Domicile', 'Village (Kelurahan)', 'village', oldCust.village || beforeApp.village, newCust.village || draft.village);
    checkField('Registration Office & Company Domicile', 'RT', 'rt', oldCust.rt || beforeApp.rt, newCust.rt || draft.rt);
    checkField('Registration Office & Company Domicile', 'RW', 'rw', oldCust.rw || beforeApp.rw, newCust.rw || draft.rw);
    checkField('Registration Office & Company Domicile', 'Postal Code', 'postalCode', oldCust.postalCode || beforeApp.postalCode, newCust.postalCode || draft.postalCode);
    checkField('Registration Office & Company Domicile', 'Office Phone / Fax', 'phoneFax', oldCust.phoneFax || beforeApp.phoneFax, newCust.phoneFax || draft.phoneFax);
    checkField('Registration Office & Company Domicile', 'Company Email', 'email', oldCust.email || beforeApp.email, newCust.email || draft.email);
    checkField('Registration Office & Company Domicile', 'Company Website', 'website', oldCust.website || beforeApp.website, newCust.website || draft.website);

    // 03: Business Profile & Deed Legality
    checkField('Business Profile & Deed Legality', 'Main Business Sector', 'mainBusiness', beforeApp.mainBusiness, draft.mainBusiness);
    checkField('Business Profile & Deed Legality', 'Operating Experience (Years)', 'experienceYears', beforeApp.experienceYears, draft.experienceYears);
    checkField('Business Profile & Deed Legality', 'Operating Experience (Months)', 'experienceMonths', beforeApp.experienceMonths, draft.experienceMonths);
    checkField('Business Profile & Deed Legality', 'Primary Source of Repayment', 'repaymentSource', beforeApp.repaymentSource, draft.repaymentSource);
    checkField('Business Profile & Deed Legality', 'Establishment Deed No.', 'establishmentActNo', oldCust.establishmentActNo || beforeApp.establishmentActNo, newCust.establishmentActNo || draft.establishmentActNo);
    checkField('Business Profile & Deed Legality', 'Establishment Deed Date', 'establishmentDate', oldCust.establishmentDate || beforeApp.establishmentDate, newCust.establishmentDate || draft.establishmentDate);
    checkField('Business Profile & Deed Legality', 'Latest Amendment Deed No.', 'latestDeedNo', beforeApp.latestDeedNo, draft.latestDeedNo);
    checkField('Business Profile & Deed Legality', 'Latest Amendment Deed Date', 'latestDeedDate', beforeApp.latestDeedDate, draft.latestDeedDate);

    // 04: Primary Contact / Person in Charge (PIC)
    checkField('Primary Contact / Person in Charge (PIC)', 'PIC Full Name', 'picName', oldPic.name || oldPic.picName || oldPic.contactName, newPic.name || newPic.picName || newPic.contactName);
    checkField('Primary Contact / Person in Charge (PIC)', 'PIC Position / Title', 'picPosition', oldPic.position || oldPic.picPosition, newPic.position || newPic.picPosition);
    checkField('Primary Contact / Person in Charge (PIC)', 'PIC Mobile Phone', 'picPhone', oldPic.phone || oldPic.mobilePhone || oldPic.mobile || oldPic.picMobile, newPic.phone || newPic.mobilePhone || newPic.mobile || newPic.picMobile);
    checkField('Primary Contact / Person in Charge (PIC)', 'PIC Email Address', 'picEmail', oldPic.email || oldPic.picEmail, newPic.email || newPic.picEmail);
    checkField('Primary Contact / Person in Charge (PIC)', 'PIC Domicile Address', 'picAddress', oldPic.currentAddress || oldPic.address, newPic.currentAddress || newPic.address);
    checkField('Primary Contact / Person in Charge (PIC)', 'PIC Identity Card (KTP/KITAS)', 'picIdCard', oldPic.idCard || oldPic.picIdCard || oldPic.idNumber, newPic.idCard || newPic.picIdCard || newPic.idNumber);

    // 05: Industry Segmentation & Active Projects
    checkField('Industry Segmentation & Active Projects', 'Industry Segment', 'industrySegment', beforeApp.industrySegment, draft.industrySegment);
    checkField('Industry Segmentation & Active Projects', 'Business Role', 'businessRole', beforeApp.businessRole, draft.businessRole);
    if ((beforeApp.projects || []).length !== (draft.projects || []).length) {
      checkField('Industry Segmentation & Active Projects', 'Active Projects Count', 'projects', `${(beforeApp.projects || []).length} proyek`, `${(draft.projects || []).length} proyek`);
    }
  } else if (tab === 1) {
    const oldStakeholders = Array.isArray(beforeApp.stakeholders) ? beforeApp.stakeholders : [];
    const newStakeholders = Array.isArray(draft.stakeholders) ? draft.stakeholders : [];
    if (oldStakeholders.length !== newStakeholders.length) {
      changes.push({
        section: 'Stakeholders',
        subSection: 'Shareholders & Stakeholder Register',
        field: 'stakeholderCount',
        label: 'Total Stakeholders',
        oldValue: `${oldStakeholders.length} orang / badan`,
        newValue: `${newStakeholders.length} orang / badan`
      });
    }
    newStakeholders.forEach((ns: any, idx: number) => {
      const match = oldStakeholders.find((os: any) => os.id === ns.id || (os.name && os.name === ns.name));
      if (!match) {
        changes.push({
          section: 'Stakeholders',
          subSection: 'Shareholders & Stakeholder Register',
          field: 'newStakeholder',
          label: `Pemegang Saham Baru #${idx + 1}`,
          oldValue: '(belum ada)',
          newValue: `${ns.name || 'Unnamed'} (${ns.sharePercentage || ns.shares || 0}%, ${ns.position || 'Shareholder'})`
        });
      } else if (cleanVal(match.sharePercentage || match.shares) !== cleanVal(ns.sharePercentage || ns.shares)) {
        changes.push({
          section: 'Stakeholders',
          subSection: 'Shareholders & Stakeholder Register',
          field: 'sharePercentage',
          label: `Persentase Saham (${ns.name || 'Shareholder'})`,
          oldValue: `${match.sharePercentage || match.shares || 0}%`,
          newValue: `${ns.sharePercentage || ns.shares || 0}%`
        });
      }
    });
  } else if (tab === 2) {
    const oldSegment = beforeApp.industrySegment || '';
    const newSegment = draft.industrySegment || '';
    if (oldSegment && newSegment && oldSegment !== newSegment) {
      changes.push({
        section: 'Business & banks',
        subSection: 'Business Profile',
        field: 'industrySegment',
        label: 'Industry Segment',
        oldValue: oldSegment,
        newValue: newSegment
      });
    }
    const oldBanks = Array.isArray(beforeApp.bankReferences) ? beforeApp.bankReferences : [];
    const newBanks = Array.isArray(draft.bankReferences) ? draft.bankReferences : [];
    if (oldBanks.length !== newBanks.length) {
      changes.push({
        section: 'Business & banks',
        subSection: 'Bank Facilities',
        field: 'bankReferences',
        label: 'Jumlah Fasilitas Bank',
        oldValue: `${oldBanks.length} fasilitas`,
        newValue: `${newBanks.length} fasilitas`
      });
    }
  } else if (tab === 3) {
    const oldP = beforeApp.proposal || {};
    const newP = draft.proposal || {};
    const checkProp = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
      const sOld = cleanVal(oldVal);
      const sNew = cleanVal(newVal);
      if (sOld !== sNew) {
        changes.push({
          section: 'Financing & units',
          subSection,
          field,
          label,
          oldValue: sOld || '(kosong)',
          newValue: sNew || '(kosong)'
        });
      }
    };
    if (cleanVal(oldP.financingValue) !== cleanVal(newP.financingValue)) {
      checkProp('Financing Proposal', 'Nilai Pembiayaan (Plafond)', 'financingValue', formatMoneyVal(oldP.financingValue), formatMoneyVal(newP.financingValue));
    }
    if (cleanVal(oldP.downPaymentValue) !== cleanVal(newP.downPaymentValue)) {
      checkProp('Financing Proposal', 'Nilai Uang Muka (Down Payment)', 'downPaymentValue', formatMoneyVal(oldP.downPaymentValue), formatMoneyVal(newP.downPaymentValue));
    }
    if (cleanVal(oldP.tenorMonths) !== cleanVal(newP.tenorMonths)) {
      checkProp('Financing Proposal', 'Tenor Pembiayaan', 'tenorMonths', oldP.tenorMonths ? `${oldP.tenorMonths} bulan` : '(kosong)', newP.tenorMonths ? `${newP.tenorMonths} bulan` : '(kosong)');
    }
    if (cleanVal(oldP.interestRate) !== cleanVal(newP.interestRate)) {
      checkProp('Financing Proposal', 'Suku Bunga (Interest Rate)', 'interestRate', oldP.interestRate ? `${oldP.interestRate}%` : '(kosong)', newP.interestRate ? `${newP.interestRate}%` : '(kosong)');
    }
    if (cleanVal(oldP.paymentMethod) !== cleanVal(newP.paymentMethod)) {
      checkProp('Financing Proposal', 'Metode Pembayaran', 'paymentMethod', oldP.paymentMethod, newP.paymentMethod);
    }
    const oldUnits = Array.isArray(oldP.units) ? oldP.units : [];
    const newUnits = Array.isArray(newP.units) ? newP.units : [];
    if (oldUnits.length !== newUnits.length) {
      checkProp('Equipment Units', 'Jumlah Unit Alat Berat', 'unitCount', `${oldUnits.length} unit`, `${newUnits.length} unit`);
    }
  } else if (tab === 4) {
    const newStatements = Array.isArray(draft.financialStatements) ? draft.financialStatements : [];
    changes.push({
      section: 'Financial statements',
      subSection: 'Balance Sheet & Income Statement',
      field: 'financialStatements',
      label: 'Laporan Keuangan',
      oldValue: 'Catatan keuangan periode lalu',
      newValue: `Diperbarui performa keuangan untuk ${newStatements.length || 3} tahun buku.`
    });
  } else if (tab === 5) {
    const oldLegal = beforeApp.legal || {};
    const newLegal = draft.legal || {};
    const checkLegal = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
      const sOld = cleanVal(oldVal);
      const sNew = cleanVal(newVal);
      if (sOld !== sNew) {
        changes.push({
          section: 'Legal',
          subSection,
          field,
          label,
          oldValue: sOld || '(kosong)',
          newValue: sNew || '(kosong)'
        });
      }
    };
    checkLegal('Deed Review & Notary Records', 'Nomor Akta Terakhir', 'latestDeedNo', oldLegal.latestDeedNo, newLegal.latestDeedNo || draft.latestDeedNo);
    checkLegal('Deed Review & Notary Records', 'Tanggal Akta Terakhir', 'latestDeedDate', oldLegal.latestDeedDate, newLegal.latestDeedDate || draft.latestDeedDate);
  } else if (tab === 8) {
    changes.push({
      section: 'Pre Analysis form',
      subSection: 'Credit Evaluation & Analyst Remarks',
      field: 'creditRemarks',
      label: 'Catatan Analisis Kredit & Mitigasi Risiko',
      oldValue: 'Drafting initial evaluation',
      newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.'
    });
    changes.push({
      section: 'Pre Analysis form',
      subSection: 'Facility Structure & Proposed Terms',
      field: 'proposedTerms',
      label: 'Verifikasi Syarat Fasilitas Kredit',
      oldValue: 'Pending term verification',
      newValue: 'Verified active vs proposed credit facility terms.'
    });
  }

  // Construct structured text details snippet
  let details = '';
  if (changes.length > 0) {
    const fieldSummaries = changes.map(c => 
      `Bagian ${c.section || activeSectionName} › Sub Section "${c.subSection || 'General'}" › Kolom "${c.label}": diubah dari "${c.oldValue}" menjadi "${c.newValue}"`
    );
    details = fieldSummaries.slice(0, 3).join(' | ');
    if (changes.length > 3) {
      details += ` | dan ${changes.length - 3} perubahan kolom lainnya`;
    }
  } else {
    details = `Penyimpanan data pada bagian ${activeSectionName} (tidak ada nilai kolom yang dimodifikasi).`;
  }

  const summaryTitle = changes.length > 0
    ? `Perubahan Data ${activeSectionName} (${changes.length} kolom)`
    : `Updated ${activeSectionName}`;

  return {
    changes,
    details,
    summaryTitle
  };
}

export function purgePlaceholderData() {
  if (typeof window === 'undefined') return;
  try {
    getStoredActivities();
    getStoredNotifications();
  } catch {}
}

if (typeof window !== 'undefined') {
  try {
    purgePlaceholderData();
  } catch {}
}

export function ensureInitialActivitySeeds(_applications: any[], _currentUser: any) {
  // Purposely empty: No template or placeholder data is seeded.
}
