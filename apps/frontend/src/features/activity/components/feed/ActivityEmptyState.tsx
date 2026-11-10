/** Shown when no activity matches the filter. */
import {CheckCircle2} from 'lucide-react';
import {type SystemActivity} from '@/features/activity/lib/types';

export function ActivityEmptyState({
  filter,
  setFilter,
  search,
  displayList,
  activities,
  emptyMessage,
}: {
  filter: 'all' | 'unread';
  setFilter: (v: 'all' | 'unread') => void;
  search: string;
  displayList: SystemActivity[];
  activities: SystemActivity[];
  emptyMessage: string | undefined;
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
              background: '#e0f2fe',
              color: '#0284c7',
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
              : activities.length === 0
                ? emptyMessage || 'No activity history yet'
                : 'No activities found'}
          </h3>
          <p style={{margin: 0, fontSize: 13, color: '#64748b'}}>
            {filter === 'unread'
              ? 'No unread activity tasks.'
              : activities.length === 0
                ? 'Real-time application changes and updates will be logged here automatically.'
                : 'No activities match the current search filter.'}
          </p>
          {filter === 'unread' && activities.length > 0 && (
            <div style={{marginTop: 14}}>
              <button
                type="button"
                onClick={() => setFilter('all')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#002c5f',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                View All Activity History ({activities.length})
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
