/** All / unread tabs and the search box. */
import {type SystemActivity} from '@/features/activity/lib/types';

export function ActivityFilters({
  filter,
  setFilter,
  search,
  setSearch,
  unreadList,
  activities,
}: {
  filter: 'all' | 'unread';
  setFilter: (v: 'all' | 'unread') => void;
  search: string;
  setSearch: (v: string) => void;
  unreadList: SystemActivity[];
  activities: SystemActivity[];
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
        {/* 1. Unread Activities on the Left */}
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
            transition: 'all 0.15s ease',
          }}
        >
          <span>Unread Activities</span>
          <span
            style={{
              background:
                filter === 'unread'
                  ? unreadList.length > 0
                    ? '#ff9900'
                    : 'rgba(255,255,255,0.25)'
                  : unreadList.length > 0
                    ? '#ff9900'
                    : '#e2e8f0',
              color: filter === 'unread' ? '#ffffff' : unreadList.length > 0 ? '#ffffff' : '#334155',
              padding: '1px 7px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {unreadList.length}
          </span>
        </button>

        {/* 2. All Activity History on the Right */}
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
            transition: 'all 0.15s ease',
          }}
        >
          <span>All Activity History</span>
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
            {activities.length}
          </span>
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Filter activities..."
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
