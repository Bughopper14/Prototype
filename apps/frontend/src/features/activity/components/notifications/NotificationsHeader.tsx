/** Title bar of the notifications page with mark-all-read. */
import {Bell, CheckCheck} from 'lucide-react';
import type {SystemNotificationItem} from '@/features/activity/lib/types';

export function NotificationsHeader({
  unreadList,
  notifications,
  onMarkAllRead,
}: {
  unreadList: SystemNotificationItem[];
  notifications: SystemNotificationItem[];
  onMarkAllRead: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 18,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} />
        </div>
        <div>
          <h2 style={{margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a'}}>
            Notifications &amp; Tasks
          </h2>
          <p style={{margin: '2px 0 0', fontSize: 13, color: '#64748b'}}>
            Pending approvals, verification tasks, and deed reviews needing follow-up.
          </p>
        </div>
      </div>

      {unreadList.length > 0 && (
        <button
          type="button"
          className="button"
          onClick={onMarkAllRead}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: '#0284c7',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 7,
            cursor: 'pointer',
          }}
          title="Mark all notifications as read (clears badge count)"
        >
          <CheckCheck size={16} />
          <span>Mark all as read</span>
        </button>
      )}
    </div>
  );
}
