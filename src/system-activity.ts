/**
 * Unified Activity & Notification Tracker for Liugong CRM Dashboard
 * Supports real-time logging, persistent unread state, section linking, and WhatsApp-like dismissal.
 */

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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredActivities(activities: SystemActivity[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activities.slice(0, 200)));
    window.dispatchEvent(new CustomEvent('crm-activity-state-change'));
  } catch {}
}

export function getStoredNotifications(): SystemNotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifications: SystemNotificationItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications.slice(0, 150)));
    window.dispatchEvent(new CustomEvent('crm-notification-state-change'));
  } catch {}
}

/**
 * Record a new system activity and optional notification task
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
 * Generate initial seed activities from existing applications if storage is empty
 */
export function ensureInitialActivitySeeds(applications: any[], currentUser: any) {
  if (typeof window === 'undefined' || !applications || applications.length === 0) return;
  const existing = getStoredActivities();
  if (existing.length >= 5) return;

  const seeds: SystemActivity[] = [];
  const notifSeeds: SystemNotificationItem[] = [];

  applications.slice(0, 10).forEach((app: any, idx: number) => {
    const comp = app.customer?.companyName || app.companyName || `Company #${idx + 1}`;
    const fap = app.fapNumber || `FAP-2026-000${idx + 1}`;
    const baseDate = new Date(Date.now() - (idx * 3600 * 1000 * 4 + 1800000)).toISOString();

    if (idx === 0) {
      seeds.push({
        id: 'seed-act-0',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Pre Analysis form',
        tabIndex: 8,
        actionType: 'UPDATE',
        title: `Updated Pre-Analysis Form for ${comp}`,
        details: 'Updated credit remarks, financial evaluation, and contract risk summary.',
        actionBy: currentUser?.name || 'Keith Santoso',
        userRole: 'CA',
        timestamp: baseDate,
        read: false
      });
      notifSeeds.push({
        id: 'seed-notif-0',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Pre Analysis form',
        tabIndex: 8,
        title: `Pre-Analysis Review Needed for ${comp}`,
        message: `${fap} — Pre-Analysis draft requires credit committee evaluation.`,
        priority: 'high',
        taskType: 'Pre-Analysis Evaluation',
        createdAt: baseDate,
        readAt: null
      });
    } else if (idx === 1) {
      seeds.push({
        id: 'seed-act-1',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Documents',
        tabIndex: 6,
        actionType: 'APPROVE',
        title: `Approved Document & Locked Customer/PIC for ${comp}`,
        details: 'Physical FAP Document signed & verified. Application successfully unlocked for Pre-analysis.',
        actionBy: 'Andi Wijaya',
        userRole: 'BS',
        timestamp: baseDate,
        read: false
      });
      notifSeeds.push({
        id: 'seed-notif-1',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Documents',
        tabIndex: 6,
        title: `Document Checklist Action for ${comp}`,
        message: `${fap} — Document checklist ready for branch head verification.`,
        priority: 'normal',
        taskType: 'Document Verification',
        createdAt: baseDate,
        readAt: null
      });
    } else if (idx === 2) {
      seeds.push({
        id: 'seed-act-2',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Legal',
        tabIndex: 5,
        actionType: 'UPDATE',
        title: `Saved Establishment Deed for ${comp}`,
        details: 'Entered notarial deed data, ministerial decree number, and updated stakeholder ownership.',
        actionBy: 'Dewi Lestari',
        userRole: 'LEGAL',
        timestamp: baseDate,
        read: false
      });
      notifSeeds.push({
        id: 'seed-notif-2',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Legal',
        tabIndex: 5,
        title: `Deed Verification Follow-up for ${comp}`,
        message: `${fap} — Legal deed registered. Verification is pending for shareholder structure.`,
        priority: 'normal',
        taskType: 'Legal Review',
        createdAt: baseDate,
        readAt: null
      });
    } else if (idx === 3) {
      seeds.push({
        id: 'seed-act-3',
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: 'Customer & PIC',
        tabIndex: 0,
        actionType: 'CREATE',
        title: `Created New Application for ${comp}`,
        details: `Initial FAP intake initiated for branch ${app.branchCode || 'JKT01'}, Customer category: Corporate.`,
        actionBy: currentUser?.name || 'Marketing Officer',
        userRole: 'MKT',
        timestamp: baseDate,
        read: false
      });
    } else {
      seeds.push({
        id: `seed-act-${idx}`,
        applicationId: app.id,
        fapNumber: fap,
        companyName: comp,
        section: idx % 2 === 0 ? 'Financing & units' : 'Financial statements',
        tabIndex: idx % 2 === 0 ? 4 : 4,
        actionType: 'UPDATE',
        title: idx % 2 === 0 ? `Updated Financing Proposal for ${comp}` : `Updated Financial Statements for ${comp}`,
        details: idx % 2 === 0 ? 'Adjusted equipment quantities and unit financing terms.' : 'Audited financial statements and financial ratio calculations updated.',
        actionBy: 'Financing Analyst',
        userRole: 'CA',
        timestamp: baseDate,
        read: idx > 4 // Mark older ones as already read so initially there are unread items
      });
    }
  });

  saveStoredActivities([...seeds, ...existing]);

  const existingNotifs = getStoredNotifications();
  if (existingNotifs.length < 3) {
    saveStoredNotifications([...notifSeeds, ...existingNotifs]);
  }
}
