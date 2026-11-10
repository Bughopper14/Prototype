/** One activity: icon, title, details, field changes, who / when, and the open / mark-read buttons. */
import {ActivityActions} from '@/features/activity/components/feed/card/ActivityActions';
import {ActivityFooter} from '@/features/activity/components/feed/card/ActivityFooter';
import {ActivityChanges} from '@/features/activity/components/feed/card/ActivityChanges';
import {ActivityCardTopRow} from '@/features/activity/components/feed/card/ActivityCardTopRow';
import {type SystemActivity} from '@/features/activity/lib/types';
import {getActionBadge} from '@/features/activity/lib/activity-format';

export function ActivityCard({
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
  const badge = getActionBadge(item.actionType);
  const BadgeIcon = badge.icon;
  return (
    <article
      key={item.id}
      style={{
        background: isUnread ? '#f8fafc' : '#ffffff',
        border: isUnread ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: isUnread ? '0 2px 8px rgba(59, 130, 246, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Left Action Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: badge.bg,
          color: badge.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <BadgeIcon size={20} />
      </div>

      {/* Main Card Body */}
      <div style={{flex: 1, minWidth: 0}}>
        <ActivityCardTopRow item={item} isUnread={isUnread} badge={badge} />

        {/* Title */}
        <h4
          style={{
            margin: '4px 0 6px',
            fontSize: 15,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </h4>

        {/* Details snippet */}
        {item.details && (
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 13,
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            {item.details}
          </p>
        )}

        {/* Specific field changes diff box with Bagian, Sub Section, Kolom, and Old -> New */}
        <ActivityChanges item={item} />

        {/* Meta footer: User, Role, Timestamp */}
        <ActivityFooter item={item} />
      </div>

      {/* Action buttons on the right: Direct Link to section & Mark as read */}
      <ActivityActions item={item} isUnread={isUnread} onOpen={onOpen} onMarkRead={onMarkRead} />
    </article>
  );
}
