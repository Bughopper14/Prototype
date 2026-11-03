'use client';

import {hasAuthority} from '@/lib/client/auth';
import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {useCrm} from '@/components/crm/CrmProvider';
import {CustomerDirectory} from './CustomerDirectory';

export default function CustomersPage() {
  const {customers, rows, user, openApplication, startNewApplication, notify} = useCrm();
  return (
    <>
      <PageHeading page="Customers" />
      <AccessGate authority="crm_view_customers" page="Customers">
        <CustomerDirectory
          customers={customers}
          rows={rows}
          user={user}
          open={openApplication}
          startNewApplication={hasAuthority(user, 'crm_create_application') ? startNewApplication : undefined}
          notify={notify}
        />
      </AccessGate>
    </>
  );
}
