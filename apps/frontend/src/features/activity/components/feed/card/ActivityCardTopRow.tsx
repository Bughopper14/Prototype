/** First row of an activity: action badge, section and the unread dot. */
import {type SystemActivity} from '@/features/activity/lib/types';
import type {ActionBadge} from '@/features/activity/lib/activity-format';

export function ActivityCardTopRow({
  item,
  isUnread,
  badge,
}: {
  item: SystemActivity;
  isUnread: boolean;
  badge: ActionBadge;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 4,
      }}
    >
      <span
        style={{
          background: badge.bg,
          color: badge.text,
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {badge.label}
      </span>

      <span
        style={{
          background: '#f1f5f9',
          color: '#475569',
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 4,
        }}
      >
        Section: {item.section}
      </span>

      {item.fapNumber && (
        <span
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {item.fapNumber}
        </span>
      )}

      {isUnread && (
        <span
          style={{
            background: '#0284c7',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 999,
          }}
        >
          NEW
        </span>
      )}
    </div>
  );
}
