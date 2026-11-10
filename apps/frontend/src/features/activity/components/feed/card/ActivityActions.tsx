/** Open-section and mark-as-read buttons of an activity. */
import {ArrowUpRight, Check, CheckCheck} from 'lucide-react';
import {type SystemActivity} from '@/features/activity/lib/types';

export function ActivityActions({
  item,
  isUnread,
  onOpen,
  onMarkRead,
}: {
  item: SystemActivity;
  isUnread: boolean;
  onOpen: (applicationId: string, tabIndex?: number) => void;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
        alignItems: 'flex-end',
      }}
    >
      {(item.applicationId || item.tabIndex !== undefined) && (
        <button
          type="button"
          onClick={() => {
            onMarkRead(item.id);
            onOpen(item.applicationId || '', item.tabIndex !== undefined ? item.tabIndex : 0);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#002c5f',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 44, 95, 0.2)',
            transition: 'background 0.15s ease',
          }}
          title={`Open ${item.companyName} at tab: ${item.section}`}
        >
          <span>Open Section</span>
          <ArrowUpRight size={14} />
        </button>
      )}

      {isUnread ? (
        <button
          type="button"
          onClick={() => onMarkRead(item.id)}
          style={{
            background: 'transparent',
            border: '1px solid #cbd5e1',
            color: '#64748b',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Mark this activity as seen (clears sidebar unread badge)"
        >
          <Check size={13} />
          <span>Mark seen</span>
        </button>
      ) : (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#94a3b8',
            padding: '5px 10px',
            fontWeight: 500,
          }}
        >
          <CheckCheck size={14} style={{color: '#10b981'}} />
          <span>Seen</span>
        </span>
      )}
    </div>
  );
}
