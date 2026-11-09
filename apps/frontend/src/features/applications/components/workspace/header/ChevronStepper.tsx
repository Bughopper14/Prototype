/** Stage progress stepper (FAP → Pre-analysis → …). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';

export function ChevronStepper() {
  const {notify, activeStage, setActiveStage, tab, setTab, draft} = useWorkspace();
  return (
    <div className="chevron-stepper">
      {['FAP Stage', 'Pre-analysis', 'ICLF'].map((st, i) => (
        <div
          key={st}
          className={`chevron-step ${i === 0 ? 'first' : ''} ${activeStage === st ? 'active' : 'inactive'}`}
          style={{cursor: draft.isNew && st !== 'FAP Stage' ? 'not-allowed' : 'pointer'}}
          title={
            draft.isNew && st !== 'FAP Stage'
              ? 'Please save the application first'
              : `Switch to ${st} view tab`
          }
          onClick={() => {
            if (draft.isNew && st !== 'FAP Stage') {
              notify('Please save the application (FAP Stage) first to unlock the next stage.');
              return;
            }
            setActiveStage(st);
            if (tab !== 7) {
              if (st === 'FAP Stage') setTab(0);
              else if (st === 'Pre-analysis') setTab(8);
              else if (st === 'ICLF') setTab(6);
            }
          }}
        >
          {st}
        </div>
      ))}
    </div>
  );
}
