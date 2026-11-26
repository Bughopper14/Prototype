import {useRef} from 'react';
import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {ApplicationTable, type ApplicationTableHandle} from './components/ApplicationTable';

export default function ApplicationsPage() {
  const {rows, openApplication} = useCrm();
  const tableRef = useRef<ApplicationTableHandle>(null);

  return (
    <>
      <PageHeading
        page="Applications"
        newApplicationButton
        exportButton
        onExport={() => tableRef.current?.exportCsv()}
      />
      <AccessGate authority="CRM_APPLICATION_VIEW" page="Applications">
        <ApplicationTable ref={tableRef} rows={rows} open={openApplication} />
      </AccessGate>
    </>
  );
}
