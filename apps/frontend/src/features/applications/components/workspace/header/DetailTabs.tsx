/** Tab bar for the current stage. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

/** Tabs a new application can use before its first save: FAP form, financial statements, Pre-Analysis. */
const OPEN_BEFORE_SAVE = [0, 4, 8];

export function DetailTabs() {
  const {a, notify, tab, setTab, draft, setError, tabs, tabOrder} = useWorkspace();
  // the Approvals tab says how many steps wait for the signed-in person
  const readyToSubmit = ((a?.stageProgress || []) as any[]).filter(s => s.canSubmit && !s.submitted && !s.completed).length;
  const waitingForMe = ((a?.approval?.current || []) as any[]).flatMap(c => c.steps).filter((s: any) => s.canAct).length;
  return (
    <div className="detail-tabs">
      {tabOrder.map(id => (
        <button
          key={tabs[id]}
          className={tab === id ? 'active' : ''}
          onClick={() => {
            if (draft.isNew && !OPEN_BEFORE_SAVE.includes(id)) {
              notify('Please save the application (FAP Stage) before opening other tabs.');
              return;
            }
            setTab(id);
            setError('');
          }}
          title={draft.isNew && !OPEN_BEFORE_SAVE.includes(id) ? 'Save application first' : undefined}
          style={
            draft.isNew && !OPEN_BEFORE_SAVE.includes(id) ? {opacity: 0.6, cursor: 'not-allowed'} : undefined
          }
        >
          {tabs[id]}
          {id === 10 && waitingForMe > 0 && <span className="tab-count">{waitingForMe}</span>}
          {id === 11 && readyToSubmit > 0 && <span className="tab-count ready">{readyToSubmit}</span>}
        </button>
      ))}
    </div>
  );
}
