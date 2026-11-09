import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {EnhancedNotificationsPage} from '@/features/crm/components/lazy';
import {PageHeading} from '@/features/crm/components/PageHeading';

export default function NotificationsPage() {
  const {
    notifications,
    readNotificationIds,
    openApplication,
    markNotificationRead,
    markAllNotificationsRead,
  } = useCrm();
  return (
    <>
      <PageHeading page="Notifications" />
      <AccessGate authority="crm_view_notifications" page="Notifications">
        <EnhancedNotificationsPage
          notifications={notifications}
          readNotificationIds={readNotificationIds}
          onOpen={openApplication}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllNotificationsRead}
        />
      </AccessGate>
    </>
  );
}
