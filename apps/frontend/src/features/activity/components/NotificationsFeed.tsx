/** Notifications inbox: filters, read / unread and jump-to-application. */
import {NotificationCard} from '@/features/activity/components/notifications/NotificationCard';
import {NotificationsEmptyState} from '@/features/activity/components/notifications/NotificationsEmptyState';
import {NotificationsFilters} from '@/features/activity/components/notifications/NotificationsFilters';
import {NotificationsHeader} from '@/features/activity/components/notifications/NotificationsHeader';
import {filterNotifications} from '@/features/activity/lib/activity-format';
import {type SystemNotificationItem} from '@/features/activity/lib/types';
import {useState} from 'react';

interface EnhancedNotificationsPageProps {
  notifications: SystemNotificationItem[];
  readNotificationIds: Set<string>;
  onOpen: (applicationId: string, tabIndex?: number) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function EnhancedNotificationsPage({
  notifications,
  readNotificationIds,
  onOpen,
  onMarkRead,
  onMarkAllRead,
}: EnhancedNotificationsPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const unreadList = notifications.filter(n => !n.readAt && !readNotificationIds.has(n.id));
  const displayList = filterNotifications(filter === 'unread' ? unreadList : notifications, search);

  return (
    <section className="panel" style={{padding: '24px 28px', borderRadius: 12}}>
      <NotificationsHeader
        unreadList={unreadList}
        notifications={notifications}
        onMarkAllRead={onMarkAllRead}
      />
      <NotificationsFilters
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        unreadList={unreadList}
        notifications={notifications}
      />

      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        {displayList.map(item => (
          <NotificationCard
            key={item.id}
            item={item}
            isUnread={!item.readAt && !readNotificationIds.has(item.id)}
            onOpen={onOpen}
            onMarkRead={onMarkRead}
          />
        ))}

        <NotificationsEmptyState
          filter={filter}
          search={search}
          displayList={displayList}
          notifications={notifications}
        />
      </div>
    </section>
  );
}
