'use client';

import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {MasterDataPage} from '@/components/crm/master-data/MasterData';

export default function MasterDataRoute() {
  return (
    <>
      <PageHeading page="Customize master data" />
      <AccessGate authority="crm_view_master_data" page="Customize master data">
        <MasterDataPage />
      </AccessGate>
    </>
  );
}
