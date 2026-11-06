import {AccessGate} from '@/components/crm/common/AccessGate';
import {PageHeading} from '@/components/crm/common/PageHeading';
import {useCrm} from '@/components/crm/CrmProvider';
import {DocumentDesk} from './DocumentDesk';

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
