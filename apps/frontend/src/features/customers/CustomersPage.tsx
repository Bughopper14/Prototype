import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {hasAuthority} from '@/shared/lib/auth';
import {CustomerDirectory} from './components/CustomerDirectory';

export default function CustomersPage() {
  const {customers, rows, user, openApplication, startNewApplication, notify} = useCrm();
  return (
    <>
      <PageHeading page="Customers" />
      <AccessGate authority="CRM_CUSTOMER_VIEW" page="Customers">
        <CustomerDirectory
          customers={customers}
          rows={rows}
          user={user}
          open={openApplication}
          startNewApplication={hasAuthority(user, 'CRM_APPLICATION_CREATE') ? startNewApplication : undefined}
          notify={notify}
        />
      </AccessGate>
    </>
  );
}
