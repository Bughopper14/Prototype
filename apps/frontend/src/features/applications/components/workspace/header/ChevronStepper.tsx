/** Stage progress stepper (FAP → Pre-analysis → …): stages and their names come from Master Data. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {STAGE, useMasterData, workflowStages} from '@/shared/master-data';

/** The tab each stage opens on. */
const STAGE_TAB: Record<string, number> = {[STAGE.FAP]: 0, [STAGE.PRE_ANALYSIS]: 8, [STAGE.ICLF]: 6};

export function ChevronStepper() {
  const {notify, activeStage, setActiveStage, tab, setTab, draft} = useWorkspace();
  const master = useMasterData();
  return (
    <div className="chevron-stepper">
      {workflowStages(master).map((stage, i) => {
        const code = stage.value;
        // The first two stages can both be filled before the first save; later stages need a saved application.
        const needsSave = draft.isNew && i > 1;
        return (
          <div
            key={code}
            className={`chevron-step ${i === 0 ? 'first' : ''} ${activeStage === code ? 'active' : 'inactive'}`}
            style={{cursor: needsSave ? 'not-allowed' : 'pointer'}}
            title={needsSave ? 'Please save the application first' : `Switch to ${stage.name} view tab`}
            onClick={() => {
              if (needsSave) {
                notify(`Please save the application first to open the ${stage.name} stage.`);
                return;
              }
              setActiveStage(code);
              if (tab !== 7 && STAGE_TAB[code] !== undefined) setTab(STAGE_TAB[code]);
            }}
          >
            {stage.name}
          </div>
        );
      })}
    </div>
  );
}
