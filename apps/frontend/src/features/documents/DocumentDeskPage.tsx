import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {DocumentDesk} from './components/DocumentDesk';

export default function DocumentDeskPage() {
  const {rows, user, openApplication} = useCrm();
  return (
    <>
      <PageHeading page="Document desk" />
      <AccessGate authority="crm_view_document_desk" page="Document desk">
        <DocumentDesk rows={rows} open={openApplication} user={user} />
      </AccessGate>
    </>
  );
}
