/** Tab bar for the current stage. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

export function DetailTabs() {
  const {notify, tab, setTab, draft, setError, tabs, tabOrder} = useWorkspace();
  return (
    <div className="detail-tabs">
      {tabOrder.map(id => (
        <button
          key={tabs[id]}
          className={tab === id ? 'active' : ''}
          onClick={() => {
            if (draft.isNew && id !== 0) {
              notify('Please save the application (FAP Stage) before opening other tabs.');
              return;
            }
            setTab(id);
            setError('');
          }}
          title={draft.isNew && id !== 0 ? 'Save application first' : undefined}
          style={draft.isNew && id !== 0 ? {opacity: 0.6, cursor: 'not-allowed'} : undefined}
        >
          {tabs[id]}
        </button>
      ))}
    </div>
  );
}
