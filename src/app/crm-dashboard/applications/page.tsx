'use client';

import {ApplicationTable} from '@/components/crm/application/ApplicationTable';
import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {useCrm} from '@/components/crm/CrmProvider';

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
