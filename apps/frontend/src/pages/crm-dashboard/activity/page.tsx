import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {useCrm} from '@/components/crm/CrmProvider';
import {ActivityPage} from '@/components/crm/lazy';

export default function ActivityRoute() {
  const {activities, readActivityIds, openApplication, markActivityRead, markAllActivitiesRead} = useCrm();
  return (
    <>
      <PageHeading page="Activity" />
      <AccessGate authority="crm_view_activity" page="Activity">
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
