import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {OverviewScreen} from './components/OverviewScreen';

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
