/**
 * Unified Activity & Notification Tracker for Liugong CRM Dashboard
 * Supports real-time logging, persistent unread state, section linking, and WhatsApp-like dismissal.
 * NOTE: Strictly records genuine user actions — NO dummy or placeholder template data.
 */

export interface ActivityChangeItem {
  field?: string;
  label: string;
  oldValue?: string;
  newValue?: string;
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
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
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
  const { tab, beforeApp = {}, draft = {}, customerPayload = {}, resolvedName, customerCategory } = params;
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
    const newCust = { ...(draft.customer || {}), ...(customerPayload || {}) };
    const newPic = draft.pic || {};

    const checkField = (label: string, field: string, oldVal: any, newVal: any) => {
      const sOld = cleanVal(oldVal);
      const sNew = cleanVal(newVal);
      if (sOld !== sNew) {
        changes.push({
          field,
          label,
          oldValue: sOld || '(none)',
          newValue: sNew || '(empty)'
        });
      }
    };

    checkField('Company Name', 'companyName', oldCust.companyName || beforeApp.companyName, resolvedName || newCust.companyName);
    checkField('Company Type', 'companyType', oldCust.companyType || beforeApp.companyType, newCust.companyType);
    checkField('NIB', 'nib', oldCust.nib || beforeApp.nib, newCust.nib);
    checkField('NPWP', 'npwp', oldCust.npwp || beforeApp.npwp, newCust.npwp);
    checkField('NIB Date', 'nibDate', oldCust.nibDate, newCust.nibDate);
    checkField('Deed No.', 'establishmentActNo', oldCust.establishmentActNo || beforeApp.establishmentActNo, newCust.establishmentActNo);
    checkField('Deed Date', 'establishmentDate', oldCust.establishmentDate || beforeApp.establishmentDate, newCust.establishmentDate);
    checkField('Company Address', 'companyAddress', oldCust.companyAddress || beforeApp.companyAddress, newCust.companyAddress || draft.companyAddress);
    checkField('City', 'city', oldCust.city || beforeApp.city, newCust.city || draft.city);
    checkField('Province', 'province', oldCust.province || beforeApp.province, newCust.province || draft.province);
    checkField('Postal Code', 'postalCode', oldCust.postalCode || beforeApp.postalCode, newCust.postalCode || draft.postalCode);
    checkField('Phone / Fax', 'phoneFax', oldCust.phoneFax || beforeApp.phoneFax, newCust.phoneFax || draft.phoneFax);
    checkField('Email', 'email', oldCust.email || beforeApp.email, newCust.email || draft.email);
    if (customerCategory) {
      checkField('Customer Category', 'customerStatus', beforeApp.customerStatus || beforeApp.customerCategory, customerCategory);
    }
    checkField('Industry Segment', 'industrySegment', beforeApp.industrySegment, draft.industrySegment);
    checkField('Business Role', 'businessRole', beforeApp.businessRole, draft.businessRole);

    // PIC checks
    checkField('PIC Name', 'picName', oldPic.name || oldPic.picName, newPic.name || newPic.picName);
    checkField('PIC Position', 'picPosition', oldPic.position || oldPic.picPosition, newPic.position || newPic.picPosition);
    checkField('PIC Mobile', 'picMobile', oldPic.mobile || oldPic.picMobile, newPic.mobile || newPic.picMobile);
    checkField('PIC Email', 'picEmail', oldPic.email || oldPic.picEmail, newPic.email || newPic.picEmail);
    checkField('PIC ID Card', 'picIdCard', oldPic.idCard || oldPic.picIdCard, newPic.idCard || newPic.picIdCard);
  } else if (tab === 1) {
    const oldStakeholders = Array.isArray(beforeApp.stakeholders) ? beforeApp.stakeholders : [];
    const newStakeholders = Array.isArray(draft.stakeholders) ? draft.stakeholders : [];
    if (oldStakeholders.length !== newStakeholders.length) {
      changes.push({
        field: 'stakeholderCount',
        label: 'Stakeholder Count',
        oldValue: `${oldStakeholders.length} shareholder(s)`,
        newValue: `${newStakeholders.length} shareholder(s)`
      });
    }
    newStakeholders.forEach((ns: any, idx: number) => {
      const match = oldStakeholders.find((os: any) => os.id === ns.id || (os.name && os.name === ns.name));
      if (!match) {
        changes.push({
          label: `New Shareholder #${idx + 1}`,
          newValue: `${ns.name || 'Unnamed'} (${ns.sharePercentage || ns.shares || 0}%, ${ns.position || 'Shareholder'})`
        });
      } else if (cleanVal(match.sharePercentage || match.shares) !== cleanVal(ns.sharePercentage || ns.shares)) {
        changes.push({
          label: `${ns.name || 'Shareholder'} Shares`,
          oldValue: `${match.sharePercentage || match.shares || 0}%`,
          newValue: `${ns.sharePercentage || ns.shares || 0}%`
        });
      }
    });
  } else if (tab === 2) {
    const oldSegment = beforeApp.industrySegment || '';
    const newSegment = draft.industrySegment || '';
    if (oldSegment && newSegment && oldSegment !== newSegment) {
      changes.push({ label: 'Industry Segment', oldValue: oldSegment, newValue: newSegment });
    }
    const oldBanks = Array.isArray(beforeApp.bankReferences) ? beforeApp.bankReferences : [];
    const newBanks = Array.isArray(draft.bankReferences) ? draft.bankReferences : [];
    if (oldBanks.length !== newBanks.length) {
      changes.push({
        label: 'Bank Accounts',
        oldValue: `${oldBanks.length} accounts`,
        newValue: `${newBanks.length} accounts`
      });
    }
  } else if (tab === 3) {
    const oldP = beforeApp.proposal || {};
    const newP = draft.proposal || {};
    if (cleanVal(oldP.financingValue) !== cleanVal(newP.financingValue)) {
      changes.push({
        label: 'Financing Plafond',
        oldValue: formatMoneyVal(oldP.financingValue),
        newValue: formatMoneyVal(newP.financingValue)
      });
    }
    if (cleanVal(oldP.downPaymentValue) !== cleanVal(newP.downPaymentValue)) {
      changes.push({
        label: 'Down Payment',
        oldValue: formatMoneyVal(oldP.downPaymentValue),
        newValue: formatMoneyVal(newP.downPaymentValue)
      });
    }
    if (cleanVal(oldP.tenorMonths) !== cleanVal(newP.tenorMonths)) {
      changes.push({
        label: 'Tenor',
        oldValue: oldP.tenorMonths ? `${oldP.tenorMonths} months` : '(none)',
        newValue: newP.tenorMonths ? `${newP.tenorMonths} months` : '(empty)'
      });
    }
    if (cleanVal(oldP.interestRate) !== cleanVal(newP.interestRate)) {
      changes.push({
        label: 'Interest Rate',
        oldValue: oldP.interestRate ? `${oldP.interestRate}%` : '(none)',
        newValue: newP.interestRate ? `${newP.interestRate}%` : '(empty)'
      });
    }
    if (cleanVal(oldP.paymentMethod) !== cleanVal(newP.paymentMethod)) {
      changes.push({
        label: 'Payment Method',
        oldValue: oldP.paymentMethod || '(none)',
        newValue: newP.paymentMethod || '(empty)'
      });
    }
    const oldUnits = Array.isArray(oldP.units) ? oldP.units : [];
    const newUnits = Array.isArray(newP.units) ? newP.units : [];
    if (oldUnits.length !== newUnits.length) {
      changes.push({
        label: 'Equipment Units',
        oldValue: `${oldUnits.length} unit(s)`,
        newValue: `${newUnits.length} unit(s)`
      });
    }
  } else if (tab === 4) {
    const newStatements = Array.isArray(draft.financialStatements) ? draft.financialStatements : [];
    changes.push({
      label: 'Financial Statements',
      newValue: `Updated financial performance for ${newStatements.length || 3} recorded years.`
    });
  } else if (tab === 5) {
    const oldLegal = beforeApp.legal || {};
    const newLegal = draft.legal || {};
    if (cleanVal(oldLegal.latestDeedNo) !== cleanVal(newLegal.latestDeedNo || draft.latestDeedNo)) {
      changes.push({
        label: 'Latest Deed No.',
        oldValue: oldLegal.latestDeedNo || '(none)',
        newValue: newLegal.latestDeedNo || draft.latestDeedNo || '(empty)'
      });
    }
    if (cleanVal(oldLegal.latestDeedDate) !== cleanVal(newLegal.latestDeedDate || draft.latestDeedDate)) {
      changes.push({
        label: 'Latest Deed Date',
        oldValue: oldLegal.latestDeedDate || '(none)',
        newValue: newLegal.latestDeedDate || draft.latestDeedDate || '(empty)'
      });
    }
  } else if (tab === 8) {
    changes.push({
      label: 'Pre-Analysis Evaluation',
      newValue: 'Credit remarks, qualitative evaluation, and proposed contract terms updated.'
    });
  }

  // Construct text details snippet
  let details = '';
  if (changes.length > 0) {
    const fieldSummaries = changes.map(c => {
      if (c.oldValue && c.oldValue !== '(none)') {
        return `${c.label}: "${c.oldValue}" ➔ "${c.newValue}"`;
      }
      return `${c.label}: "${c.newValue}"`;
    });
    details = fieldSummaries.slice(0, 5).join(' · ');
    if (changes.length > 5) {
      details += ` · and ${changes.length - 5} more field(s)`;
    }
  } else {
    details = `Saved ${activeSectionName} records (no field values modified).`;
  }

  const summaryTitle = changes.length > 0
    ? `Updated ${activeSectionName} (${changes.length} change${changes.length > 1 ? 's' : ''})`
    : `Updated ${activeSectionName}`;

  return {
    changes,
    details,
    summaryTitle
  };
}

/**
 * Purges all template/seed placeholders and ensures only authentic activities exist.
 */
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
