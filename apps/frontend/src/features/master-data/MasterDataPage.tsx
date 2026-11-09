import {AccessGate} from '@/features/crm/components/AccessGate';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {MasterDataWorkspace} from './components/MasterDataWorkspace';

export default function MasterDataRoute() {
  return (
    <>
      <PageHeading page="Customize master data" />
      <AccessGate authority="crm_view_master_data" page="Customize master data">
        <MasterDataWorkspace />
      </AccessGate>
    </>
  );
}
