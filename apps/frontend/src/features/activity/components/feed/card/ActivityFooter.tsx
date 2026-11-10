/** Who did it, their role and when. */
import {Clock} from 'lucide-react';
import {formatTime} from '@/features/activity/lib/activity-format';
import {type SystemActivity} from '@/features/activity/lib/types';

export function ActivityFooter({item}: {item: SystemActivity}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 12,
        color: '#64748b',
        flexWrap: 'wrap',
      }}
    >
      <span style={{display: 'inline-flex', alignItems: 'center', gap: 5}}>
        <span style={{fontWeight: 600, color: '#334155'}}>{item.actionBy}</span>
        <span
          style={{
            background: '#f1f5f9',
            padding: '1px 6px',
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          {item.userRole || 'User'}
        </span>
      </span>

      <span>•</span>

      <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>
        <Clock size={13} />
        <span>{formatTime(item.timestamp)}</span>
      </span>
    </div>
  );
}
