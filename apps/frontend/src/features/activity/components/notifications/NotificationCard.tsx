/** One notification: icon, message, who / when and the open / mark-read buttons. */
import {AlertCircle, ArrowUpRight, Check, CheckCheck, Clock} from 'lucide-react';
import {formatTime} from '@/features/activity/lib/activity-format';
import type {SystemNotificationItem} from '@/features/activity/lib/types';

export function NotificationCard({
  onOpen,
  onMarkRead,
  item,
  isUnread,
}: {
  onOpen: (applicationId: string, tabIndex?: number) => void;
  onMarkRead: (id: string) => void;
  item: SystemNotificationItem;
  isUnread: boolean;
}) {
  return (
    <article
      key={item.id}
      style={{
        background: isUnread ? '#fffbf5' : '#ffffff',
        border: isUnread ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: isUnread ? '0 2px 8px rgba(249, 115, 22, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        position: 'relative',
      }}
    >
      {/* Alert icon */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: item.priority === 'high' ? '#fee2e2' : '#fef3c7',
          color: item.priority === 'high' ? '#dc2626' : '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <AlertCircle size={20} />
      </div>

      {/* Main Body */}
      <div style={{flex: 1, minWidth: 0}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 4,
          }}
        >
          {item.taskType && (
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
              {item.taskType}
            </span>
          )}

          {item.priority === 'high' && (
            <span
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              HIGH PRIORITY
            </span>
          )}

          {isUnread && (
            <span
              style={{
                background: '#ea580c',
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

        <h4
          style={{
            margin: '4px 0 6px',
            fontSize: 15,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          {item.title}
        </h4>

        <p
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          {item.message}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: '#64748b',
          }}
        >
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>
            <Clock size={13} />
            <span>{formatTime(item.createdAt)}</span>
          </span>
          {item.fapNumber && (
            <>
              <span>•</span>
              <span style={{fontWeight: 600, color: '#334155'}}>{item.fapNumber}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
          alignItems: 'flex-end',
        }}
      >
        {item.applicationId && (
          <button
            type="button"
            onClick={() => {
              onMarkRead(item.id);
              onOpen(item.applicationId!, item.tabIndex !== undefined ? item.tabIndex : 0);
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
            }}
            title={`Open ${item.companyName} for action`}
          >
            <span>Open Task</span>
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
            title="Mark this notification as read (clears sidebar unread badge)"
          >
            <Check size={13} />
            <span>Mark as read</span>
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
            <span>Read</span>
          </span>
        )}
      </div>
    </article>
  );
}
