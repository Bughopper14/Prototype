/** Tab: Stakeholders. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {StakeholderDeedView} from '@/features/legal/components/DeedViews';

export function StakeholdersTab() {
  const {a, tab, draft} = useWorkspace();
  return (
    <>
      {tab === 1 && (
        <>
          <StakeholderDeedView legal={draft.legal || {}} application={a} fallbackRows={draft.stakeholders} />
        </>
      )}
    </>
  );
}
