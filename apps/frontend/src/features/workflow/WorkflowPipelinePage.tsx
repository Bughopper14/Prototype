import {AccessGate} from '@/features/crm/components/AccessGate';
import {PageHeading} from '@/features/crm/components/PageHeading';
import {useCanManageMasterData} from '@/features/master-data/hooks/useCanManageMasterData';
import {WorkflowConfigurationView} from '@/features/master-data/components/workflow/WorkflowConfigurationView';

export default function WorkflowPipelinePage() {
  const canManage = useCanManageMasterData();
  return (
    <>
      <PageHeading page="Workflow pipeline" />
      <AccessGate authority="crm_view_master_data" page="Workflow pipeline">
        <section className="panel master-page" style={{width: '100%'}}>
          <div className="master-page-layout" style={{width: '100%', padding: '0 8px'}}>
            <WorkflowConfigurationView canManage={canManage} />
          </div>
        </section>
      </AccessGate>
    </>
  );
}
