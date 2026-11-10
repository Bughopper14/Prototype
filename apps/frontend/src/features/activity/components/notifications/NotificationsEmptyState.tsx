/** Shown when no notification matches the filter. */
import {CheckCircle2} from 'lucide-react';
import type {SystemNotificationItem} from '@/features/activity/lib/types';

export function NotificationsEmptyState({
  filter,
  search,
  displayList,
  notifications,
}: {
  filter: 'all' | 'unread';
  search: string;
  displayList: SystemNotificationItem[];
  notifications: SystemNotificationItem[];
}) {
  return (
    <>
      {displayList.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            color: '#64748b',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#ffedd5',
              color: '#ea580c',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <h3 style={{margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e293b'}}>
            {filter === 'unread'
              ? 'All caught up!'
              : notifications.length === 0
                ? 'No notifications yet'
                : 'No notifications found'}
          </h3>
          <p style={{margin: 0, fontSize: 13, color: '#64748b'}}>
            {filter === 'unread'
              ? 'No unread notification tasks.'
              : notifications.length === 0
                ? 'Important reminders and required actions will appear here automatically.'
                : 'No notifications match the current search filter.'}
          </p>
        </div>
      )}
    </>
  );
}
