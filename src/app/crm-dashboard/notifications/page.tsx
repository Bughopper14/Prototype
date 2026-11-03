'use client';

import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {useCrm} from '@/components/crm/CrmProvider';
import {EnhancedNotificationsPage} from '@/components/crm/lazy';

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
