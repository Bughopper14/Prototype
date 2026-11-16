import {
  ACTIVITY_EVENT,
  fetchActivities,
  getReadActivityIds,
  getReadNotificationIds,
  saveReadActivityIds,
  saveReadNotificationIds,
} from '@/features/activity/lib/activity-store';
import {type SystemActivity, type SystemNotificationItem} from '@/features/activity/lib/types';
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {applicationHref, newApplicationHref, pageHref} from '@/shared/lib/routes';
import {setMasterData} from '@/shared/master-data';
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router';

const NOTIFICATION_POLL_MS = 15_000;
const TOAST_MS = 4_500;

type CrmContextValue = {
  user: any;
  rows: any[];
  customers: any[];
  addCustomer: (customer: any) => void;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  notify: (message: string) => void;
  toast: string;
  openApplication: (id: string, tab?: number) => void;
  startNewApplication: (customerId?: string) => void;
  goTo: (pageName: string) => void;
  notifications: SystemNotificationItem[];
  readNotificationIds: Set<string>;
  unreadNotifications: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  activities: SystemActivity[];
  readActivityIds: Set<string>;
  unreadActivities: number;
  markActivityRead: (id: string) => void;
  markAllActivitiesRead: () => void;
};

const CrmContext = createContext<CrmContextValue | null>(null);

export function useCrm() {
  const value = useContext(CrmContext);
  if (!value) throw new Error('useCrm must be used inside <CrmProvider>');
  return value;
}

/** Loads the data every CRM page needs (applications, customers, master data, notifications) once per session. */
export function CrmProvider({user, children}: {user: any; children: ReactNode}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [serverNotifications, setServerNotifications] = useState<any[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [readActivityIds, setReadActivityIds] = useState(() => getReadActivityIds());
  const [readNotificationIds, setReadNotificationIds] = useState(() => getReadNotificationIds());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), TOAST_MS);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Only ask for what the user's role may read; the API refuses the rest.
      const can = (authority: string) => hasAuthority(user, authority);
      const [applications, customerList, masterData, notifications] = await Promise.all([
        can('crm_view_applications') ? api('/applications') : [],
        can('crm_view_customers') || can('crm_create_application') ? api('/customers') : [],
        api('/master-data'),
        can('crm_view_notifications') ? api('/notifications') : [],
      ]);
      setServerNotifications(notifications);
      setMasterData(masterData);
      setRows(applications);
      setCustomers(customerList);
      if (can('crm_view_activity')) fetchActivities().then(setActivities).catch(() => {});
      setError('');
    } catch (e: any) {
      if (!e?.message?.toLowerCase().includes('session') && !e?.message?.toLowerCase().includes('sesi')) {
        setError(e?.message || 'Gagal memuat data');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Load the OCR models in the background once, so the first scan is fast
  useEffect(() => {
    api('/ocr/warmup', 'POST', {}).catch(() => {});
  }, []);

  // Keep the notification badge fresh.
  useEffect(() => {
    let live = true;
    const refresh = () =>
      (hasAuthority(user, 'crm_view_notifications') ? api('/notifications') : Promise.resolve([]))
        .then(list => live && setServerNotifications(list))
        .catch(() => {});
    const timer = setInterval(refresh, NOTIFICATION_POLL_MS);
    window.addEventListener('storage', refresh);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener('storage', refresh);
    };
  }, [user]);

  // Activity and notification read-state is shared through browser events (see system-activity.ts).
  useEffect(() => {
    const sync = () => {
      if (hasAuthority(user, 'crm_view_activity')) fetchActivities().then(setActivities).catch(() => {});
      setReadActivityIds(getReadActivityIds());
      setReadNotificationIds(getReadNotificationIds());
    };
    window.addEventListener(ACTIVITY_EVENT, sync);
    window.addEventListener('crm-notification-state-change', sync);
    return () => {
      window.removeEventListener(ACTIVITY_EVENT, sync);
      window.removeEventListener('crm-notification-state-change', sync);
    };
  }, [user]);

  const notifications = useMemo<SystemNotificationItem[]>(() => {
    // DEED_REVIEW opens the Legal tab; WORKFLOW_ACTION opens the application.
    const list: SystemNotificationItem[] = serverNotifications.map((n: any) => {
      const deed = n.type === 'DEED_REVIEW';
      return {
        id: n.id,
        applicationId: n.applicationId,
        fapNumber: n.fapNumber,
        companyName: n.companyName || 'Application',
        section: deed ? 'Legal' : 'Workflow',
        tabIndex: deed ? 5 : undefined,
        title: n.title,
        message: n.message,
        priority: 'normal',
        taskType: deed ? 'Deed Review' : 'Workflow',
        createdAt: n.createdAt,
        readAt: n.readAt,
      };
    });
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [serverNotifications]);

  const markNotificationRead = async (id: string) => {
    const next = new Set(readNotificationIds).add(id);
    setReadNotificationIds(next);
    saveReadNotificationIds(next);
    await api(`/notifications/${id}/read`, 'PATCH', {}).catch(() => {});
  };

  const markAllNotificationsRead = async () => {
    const all = new Set(notifications.map(n => n.id));
    setReadNotificationIds(all);
    saveReadNotificationIds(all);
    for (const n of serverNotifications.filter(item => !item.readAt)) {
      await api(`/notifications/${n.id}/read`, 'PATCH', {}).catch(() => {});
    }
  };

  const markActivityRead = (id: string) => {
    const next = new Set(readActivityIds).add(id);
    setReadActivityIds(next);
    saveReadActivityIds(next);
  };

  const markAllActivitiesRead = () => {
    const all = new Set(activities.map(a => a.id));
    setReadActivityIds(all);
    saveReadActivityIds(all);
  };

  const startNewApplication = (customerId?: string) => {
    if (!hasAuthority(user, 'crm_create_application')) {
      notify('Your role is not allowed to create applications.');
      return;
    }
    navigate(newApplicationHref(customerId));
  };

  const value: CrmContextValue = {
    user,
    rows,
    customers,
    addCustomer: customer => setCustomers(previous => [customer, ...previous]),
    loading,
    error,
    reload,
    notify,
    toast,
    openApplication: (id, tab) => navigate(applicationHref(id, tab)),
    startNewApplication,
    goTo: name => navigate(pageHref(name)),
    notifications,
    readNotificationIds,
    unreadNotifications: notifications.filter(n => !n.readAt && !readNotificationIds.has(n.id)).length,
    markNotificationRead,
    markAllNotificationsRead,
    activities,
    readActivityIds,
    unreadActivities: activities.filter(a => !a.read && !readActivityIds.has(a.id)).length,
    markActivityRead,
    markAllActivitiesRead,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}
