/**
 * Activity feed from the server (crm_application_activity_logs) and the per-browser "seen" markers.
 * The server logs its own actions (create, workflow, documents, deed review); the workspace records what a save
 * changed, field by field, with recordSystemActivity.
 */
import {api} from '@/shared/lib/api';
import {resolveSubSectionName} from './sub-section';
import {ActivityChangeItem, SystemActivity} from './types';

const ACTIVITY_READ_KEY = 'crm_activity_read_ids_v2';

const NOTIFICATION_READ_KEY = 'crm_notification_read_ids_v2';

/** Fired after the feed changed (an activity was recorded) or a "seen" marker changed. */
export const ACTIVITY_EVENT = 'crm-activity-state-change';

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
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT));
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

/** Every change row names its section and sub section, so the cards can show Bagian › Sub Section › Kolom. */
function normalize(a: SystemActivity): SystemActivity {
  if (!a.changes?.length) return a;
  return {
    ...a,
    changes: a.changes.map(ch => ({
      ...ch,
      section: ch.section || a.section,
      subSection: ch.subSection || resolveSubSectionName(ch.field || ch.label, ch.section || a.section),
    })),
  };
}

/** Activity page: newest entries of every application. */
export async function fetchActivities(): Promise<SystemActivity[]> {
  const rows: SystemActivity[] = await api('/activity');
  return rows.map(normalize);
}

/** Activity tab: entries of one application. */
export async function fetchApplicationActivities(applicationId: string): Promise<SystemActivity[]> {
  const rows: SystemActivity[] = await api(`/applications/${applicationId}/activity`);
  return rows.map(normalize);
}

/**
 * Records what a save changed. The server stores it as an UPDATE of the signed-in user; notifications are decided by
 * the server (workflow and deed review), not here.
 */
export async function recordSystemActivity(params: {
  applicationId?: string;
  fapNumber?: string;
  companyName?: string;
  section: string;
  tabIndex: number;
  actionType?: 'UPDATE';
  title: string;
  details: string;
  changes?: ActivityChangeItem[];
  actionBy?: string;
  userRole?: string;
}) {
  if (!params.applicationId) return;
  try {
    await api(`/applications/${params.applicationId}/activity`, 'POST', {
      section: params.section,
      tabIndex: params.tabIndex,
      title: params.title,
      details: params.details,
      changes: params.changes?.length ? params.changes : undefined,
    });
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT));
  } catch (e) {
    console.error('Activity record error:', e);
  }
}
