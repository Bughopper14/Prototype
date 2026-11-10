/** Title bar of the activity page with the mark-all-read button. */
import {Activity, CheckCheck} from 'lucide-react';
import {type SystemActivity} from '@/features/activity/lib/types';

export function ActivityHeader({
  unreadList,
  activities,
  title,
  subtitle,
  onMarkAllRead,
}: {
  unreadList: SystemActivity[];
  activities: SystemActivity[];
  title: string;
  subtitle: string;
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
      <div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <h2 style={{margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a'}}>{title}</h2>
            <p style={{margin: '2px 0 0', fontSize: 13, color: '#64748b'}}>{subtitle}</p>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
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
            title="Mark all unread activities as seen (clears badge count)"
          >
            <CheckCheck size={16} />
            <span>Mark all as seen</span>
          </button>
        )}
      </div>
    </div>
  );
}
