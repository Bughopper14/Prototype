/** Tab bar for the current stage. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

/** Tabs a new application can use before its first save: FAP form, financial statements, Pre-Analysis. */
const OPEN_BEFORE_SAVE = [0, 4, 8];

export function DetailTabs() {
  const {notify, tab, setTab, draft, setError, tabs, tabOrder} = useWorkspace();
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
        </button>
      ))}
    </div>
  );
}
