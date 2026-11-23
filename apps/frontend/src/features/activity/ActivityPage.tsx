import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {ActivityPage} from '@/features/crm/components/lazy';
import {PageHeading} from '@/features/crm/components/PageHeading';

export default function ActivityRoute() {
  const {activities, readActivityIds, openApplication, markActivityRead, markAllActivitiesRead} = useCrm();
  return (
    <>
      <PageHeading page="Activity" />
      <AccessGate authority="CRM_ACTIVITY_VIEW" page="Activity">
        <ActivityPage
          activities={activities}
          readActivityIds={readActivityIds}
          onOpen={openApplication}
          onMarkRead={markActivityRead}
          onMarkAllRead={markAllActivitiesRead}
        />
      </AccessGate>
    </>
  );
}
