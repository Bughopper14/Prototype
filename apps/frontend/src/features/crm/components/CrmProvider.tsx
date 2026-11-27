import {
  ACTIVITY_EVENT,
  fetchActivities,
  getReadActivityIds,
  getReadNotificationIds,
  saveReadActivityIds,
  saveReadNotificationIds,
} from '@/features/activity/lib/activity-store';
import {type SystemActivity, type SystemNotificationItem} from '@/features/activity/lib/types';
import {type CreatedApplicationInfo} from '@/features/applications/NewApplicationStart';
import {api} from '@/shared/lib/api';
import {hasAuthority} from '@/shared/lib/auth';
import {applicationHref, CRM_PAGES, pageHref} from '@/shared/lib/routes';
import {setMasterData} from '@/shared/master-data';
import {useConfirm, type ConfirmAsk} from '@/features/workflow/ConfirmDialog';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useLocation, useNavigate} from 'react-router';

const NOTIFICATION_POLL_MS = 15_000;
const TOAST_MS = 4_500;
const CREATED_APP_MS = 8_000;

export type ToastState = {message: string; tone: 'info' | 'error'};

type CrmContextValue = {
  user: any;
  rows: any[];
  customers: any[];
  addCustomer: (customer: any) => void;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  notify: (message: string, tone?: 'info' | 'error') => void;
  dismissToast: () => void;
  toast: ToastState | null;
  confirm: (ask: ConfirmAsk) => Promise<boolean>;
  openApplication: (id: string, tab?: number) => void;
  startNewApplication: (customerId?: string) => void;
  newAppModal: {open: boolean; customerId?: string};
  closeNewApplication: () => void;
  completeNewApplication: (created: CreatedApplicationInfo) => Promise<void>;
  createdAppBanner: CreatedApplicationInfo | null;
  dismissCreatedAppBanner: () => void;
  recentlyCreatedAppId: string | null;
  goTo: (pageName: string) => void;
  inboxCount: number;
  refreshInboxCount: () => Promise<void>;
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
  const {pathname} = useLocation();
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [serverNotifications, setServerNotifications] = useState<any[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [readActivityIds, setReadActivityIds] = useState(() => getReadActivityIds());
  const [readNotificationIds, setReadNotificationIds] = useState(() => getReadNotificationIds());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [newAppModal, setNewAppModal] = useState<{open: boolean; customerId?: string}>({open: false});
  const [createdAppBanner, setCreatedAppBanner] = useState<CreatedApplicationInfo | null>(null);
  const [recentlyCreatedAppId, setRecentlyCreatedAppId] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState<number>(0);

  const refreshInboxCount = useCallback(async () => {
    if (!hasAuthority(user, 'CRM_APPLICATION_VIEW')) return;
    try {
      const res = await api('/inbox');
      setInboxCount(Number(res?.counts?.total || 0));
    } catch {
      // ignore background badge refresh errors
    }
  }, [user]);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  }, []);

  const notify = useCallback((message: string, tone?: 'info' | 'error') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const resolvedTone = tone ?? (/^(failed|could not|error|cannot|gagal)/i.test(message.trim()) ? 'error' : 'info');
    setToast({message, tone: resolvedTone});
    toastTimer.current = window.setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, resolvedTone === 'error' ? 6_000 : TOAST_MS);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Only ask for what the user's role may read; the API refuses the rest.
      const can = (authority: string) => hasAuthority(user, authority);
      const [applications, customerList, masterData, notifications] = await Promise.all([
        can('CRM_APPLICATION_VIEW') ? api('/applications') : [],
        can('CRM_CUSTOMER_VIEW') || can('CRM_APPLICATION_CREATE') ? api('/customers') : [],
        api('/master-data'),
        can('CRM_NOTIFICATION_VIEW') ? api('/notifications') : [],
      ]);
      setServerNotifications(notifications);
      setMasterData(masterData);
      setRows(applications);
      setCustomers(customerList);
      if (can('CRM_ACTIVITY_VIEW')) fetchActivities().then(setActivities).catch(() => {});
      if (can('CRM_APPLICATION_VIEW')) {
        api('/inbox')
          .then(res => setInboxCount(Number(res?.counts?.total || 0)))
          .catch(() => {});
      }
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
      (hasAuthority(user, 'CRM_NOTIFICATION_VIEW') ? api('/notifications') : Promise.resolve([]))
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
      if (hasAuthority(user, 'CRM_ACTIVITY_VIEW')) fetchActivities().then(setActivities).catch(() => {});
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
    // DEED_APPROVAL opens the Legal tab; WORKFLOW_ACTION opens the application.
    const list: SystemNotificationItem[] = serverNotifications.map((n: any) => {
      const deed = n.type === 'DEED_APPROVAL';
      return {
        id: n.id,
        applicationId: n.applicationId,
        applicationNumber: n.applicationNumber,
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

  const startNewApplication = useCallback(
    (customerId?: string) => {
      if (!hasAuthority(user, 'CRM_APPLICATION_CREATE')) {
        notify('Your role is not allowed to create applications.');
        return;
      }
      setNewAppModal({open: true, customerId});
    },
    [user, notify],
  );

  const closeNewApplication = useCallback(() => {
    setNewAppModal({open: false});
  }, []);

  const completeNewApplication = useCallback(
    async (created: CreatedApplicationInfo) => {
      setNewAppModal({open: false});
      await reload();
      setRecentlyCreatedAppId(created.id);
      setCreatedAppBanner(created);
      // Ensure the user sees the updated applications table if created from Customers or /new
      if (pathname !== CRM_PAGES[1].href && pathname !== CRM_PAGES[0].href) {
        navigate(CRM_PAGES[1].href);
      }
      setTimeout(() => {
        setCreatedAppBanner(prev => (prev?.id === created.id ? null : prev));
        setRecentlyCreatedAppId(prev => (prev === created.id ? null : prev));
      }, CREATED_APP_MS);
    },
    [reload, pathname, navigate],
  );

  const dismissCreatedAppBanner = useCallback(() => {
    setCreatedAppBanner(null);
  }, []);

  const value: CrmContextValue = {
    user,
    rows,
    customers,
    addCustomer: customer => setCustomers(previous => [customer, ...previous]),
    loading,
    error,
    reload,
    notify,
    dismissToast,
    toast,
    confirm,
    openApplication: (id, tab) => {
      setCreatedAppBanner(null);
      navigate(applicationHref(id, tab));
    },
    startNewApplication,
    newAppModal,
    closeNewApplication,
    completeNewApplication,
    createdAppBanner,
    dismissCreatedAppBanner,
    recentlyCreatedAppId,
    goTo: name => navigate(pageHref(name)),
    inboxCount,
    refreshInboxCount,
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

  return (
    <CrmContext.Provider value={value}>
      {children}
      {confirmDialog}
    </CrmContext.Provider>
  );
}
