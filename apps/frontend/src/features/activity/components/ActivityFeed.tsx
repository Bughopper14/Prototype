/** Activity log: filters, timeline and per-change details. */
import {ActivityCard} from '@/features/activity/components/feed/ActivityCard';
import {ActivityEmptyState} from '@/features/activity/components/feed/ActivityEmptyState';
import {ActivityFilters} from '@/features/activity/components/feed/ActivityFilters';
import {ActivityHeader} from '@/features/activity/components/feed/ActivityHeader';
import {filterActivities} from '@/features/activity/lib/activity-format';
import {type SystemActivity} from '@/features/activity/lib/types';
import {useState} from 'react';

interface ActivityPageProps {
  activities: SystemActivity[];
  readActivityIds: Set<string>;
  onOpen: (applicationId: string, tabIndex?: number) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export function ActivityPage({
  activities,
  readActivityIds,
  onOpen,
  onMarkRead,
  onMarkAllRead,
  title = 'Recent System Activity',
  subtitle = 'Live record of application changes, form submissions, and section updates.',
  emptyMessage,
}: ActivityPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [search, setSearch] = useState('');

  const unreadList = activities.filter(a => !a.read && !readActivityIds.has(a.id));
  const displayList = filterActivities(filter === 'unread' ? unreadList : activities, search);

  return (
    <section className="panel" style={{padding: '24px 28px', borderRadius: 12}}>
      <ActivityHeader
        unreadList={unreadList}
        activities={activities}
        title={title}
        subtitle={subtitle}
        onMarkAllRead={onMarkAllRead}
      />
      <ActivityFilters
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        unreadList={unreadList}
        activities={activities}
      />

      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        {displayList.map(item => (
          <ActivityCard
            key={item.id}
            item={item}
            isUnread={!item.read && !readActivityIds.has(item.id)}
            onOpen={onOpen}
            onMarkRead={onMarkRead}
          />
        ))}

        <ActivityEmptyState
          filter={filter}
          setFilter={setFilter}
          search={search}
          displayList={displayList}
          activities={activities}
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}
