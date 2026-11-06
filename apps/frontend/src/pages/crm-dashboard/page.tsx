import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {useCrm} from '@/components/crm/CrmProvider';
import {OverviewScreen} from './OverviewScreen';

export default function OverviewPage() {
  const {rows, user, openApplication, goTo} = useCrm();
  return (
    <>
      <PageHeading page="Overview" newApplicationButton />
      <AccessGate authority="crm_view_overview" page="Overview">
        <OverviewScreen rows={rows} user={user} open={openApplication} navigate={goTo} />
      </AccessGate>
    </>
  );
}
