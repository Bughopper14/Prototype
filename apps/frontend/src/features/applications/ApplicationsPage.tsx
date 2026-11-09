import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {ApplicationTable} from './components/ApplicationTable';

export default function ApplicationsPage() {
  const {rows, openApplication} = useCrm();
  return (
    <>
      <PageHeading page="Applications" newApplicationButton />
      <AccessGate authority="crm_view_applications" page="Applications">
        <ApplicationTable rows={rows} open={openApplication} />
      </AccessGate>
    </>
  );
}
