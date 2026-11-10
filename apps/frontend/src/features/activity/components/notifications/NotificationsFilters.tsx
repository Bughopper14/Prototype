/** All / unread tabs and the search box. */
import type {SystemNotificationItem} from '@/features/activity/lib/types';

export function NotificationsFilters({
  filter,
  setFilter,
  search,
  setSearch,
  unreadList,
  notifications,
}: {
  filter: 'all' | 'unread';
  setFilter: (v: 'all' | 'unread') => void;
  search: string;
  setSearch: (v: string) => void;
  unreadList: SystemNotificationItem[];
  notifications: SystemNotificationItem[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{display: 'flex', gap: 8}}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 20,
            border: '1px solid',
            borderColor: filter === 'all' ? '#002c5f' : '#cbd5e1',
            background: filter === 'all' ? '#002c5f' : '#ffffff',
            color: filter === 'all' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>All Notifications</span>
          <span
            style={{
              background: filter === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
              color: filter === 'all' ? '#ffffff' : '#334155',
              padding: '1px 7px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('unread')}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 20,
            border: '1px solid',
            borderColor: filter === 'unread' ? '#002c5f' : '#cbd5e1',
            background: filter === 'unread' ? '#002c5f' : '#ffffff',
            color: filter === 'unread' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Unread Notifications</span>
          {unreadList.length > 0 && (
            <span
              style={{
                background: filter === 'unread' ? '#ff9900' : '#e2e8f0',
                color: filter === 'unread' ? '#ffffff' : '#334155',
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {unreadList.length}
            </span>
          )}
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search notifications..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            width: 220,
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
