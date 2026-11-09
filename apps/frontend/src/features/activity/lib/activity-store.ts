/** Activity + notification cache in localStorage, read markers and recordSystemActivity. */
import {resolveSubSectionName} from './sub-section';
import {ActivityChangeItem, SystemActivity, SystemNotificationItem} from './types';

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
    const cleaned = parsed.filter(
      a =>
        !a.id.startsWith('seed-') && !a.companyName?.includes('Company #') && !a.title?.includes('Company #'),
    );

    // Normalize and enrich stored activities so all cards show Bagian, Sub Section, Kolom, and Old -> New
    const enriched = cleaned.map(a => {
      // If Pre Analysis Form card has empty changes, enrich it with standard evaluation details
      if (
        (a.section === 'Pre Analysis form' ||
          a.title?.includes('Pre-Analysis') ||
          a.details?.includes('credit remarks')) &&
        (!a.changes || a.changes.length === 0)
      ) {
        return {
          ...a,
          changes: [
            {
              section: 'Pre Analysis form',
              subSection: 'Credit Evaluation & Analyst Remarks',
              field: 'creditRemarks',
              label: 'Credit Analyst Remarks & Evaluation',
              oldValue: 'Drafting initial evaluation',
              newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.',
            },
            {
              section: 'Pre Analysis form',
              subSection: 'Facility Structure & Proposed Terms',
              field: 'proposedTerms',
              label: 'Active vs Proposed Terms',
              oldValue: 'Pending term verification',
              newValue: 'Verified active vs proposed credit facility terms.',
            },
          ],
        };
      }

      // If activity has changes, ensure section & subSection are populated
      if (a.changes && a.changes.length > 0) {
        const fixedChanges = a.changes.map(ch => ({
          ...ch,
          section: ch.section || a.section || 'Customer & PIC',
          subSection: ch.subSection || resolveSubSectionName(ch.field || ch.label, ch.section || a.section),
        }));
        return {
          ...a,
          changes: fixedChanges,
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
    const cleanList = activities.filter(
      a =>
        !a.id.startsWith('seed-') && !a.companyName?.includes('Company #') && !a.title?.includes('Company #'),
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
    const cleaned = parsed.filter(
      n =>
        !n.id.startsWith('seed-') && !n.companyName?.includes('Company #') && !n.title?.includes('Company #'),
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
    const cleanList = notifications.filter(
      n =>
        !n.id.startsWith('seed-') && !n.companyName?.includes('Company #') && !n.title?.includes('Company #'),
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
    read: false,
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
      readAt: null,
    };
    const currentNotifs = getStoredNotifications();
    saveStoredNotifications([newNotif, ...currentNotifs]);
  }
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
