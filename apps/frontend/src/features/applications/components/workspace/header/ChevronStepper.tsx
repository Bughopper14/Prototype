/** Stage stepper of the workflow this application runs in: its groups and stages come from the workflow, not from a fixed list. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {GroupedStepper} from '@/features/applications/components/GroupedStepper';
import {screenOf, type WorkflowStage} from '@/features/applications/lib/workspace/stage';
import {STAGE, useMasterData, workflowStages} from '@/shared/master-data';
import {useState} from 'react';

/** The tab each screen opens on. */
const SCREEN_TAB: Record<string, number> = {[STAGE.FAP]: 0, [STAGE.PRE_ANALYSIS]: 8, [STAGE.ICLF]: 6};

export function ChevronStepper() {
  const {a, notify, activeStage, setActiveStage, tab, setTab, draft} = useWorkspace();
  const master = useMasterData();
  const [picked, setPicked] = useState('');
  // The stages of the application's workflow (an application without one falls back to the Master Data stages).
  const stages: WorkflowStage[] = a?.workflow?.stages?.length
    ? a.workflow.stages
    : workflowStages(master).map((s, i) => ({code: s.value, name: s.name, groupCode: '', formCode: null, order: i}));
  // Several stages can open the same screen: the one picked last is highlighted, else the first one with that screen.
  const current =
    stages.find(s => s.code === picked && screenOf(s) === activeStage)?.code ?? stages.find(s => screenOf(s) === activeStage)?.code;
  return (
    <GroupedStepper
      stages={stages.map(s => ({value: s.code, name: s.name}))}
      groups={a?.workflow?.groups}
      step={(stage, first) => {
        const index = stages.findIndex(s => s.code === stage.value);
        const screen = screenOf(stages[index]);
        // The first two stages can both be filled before the first save; later stages need a saved application.
        const needsSave = draft.isNew && index > 1;
        return (
          <div
            key={stage.value}
            className={`chevron-step ${first ? 'first' : ''} ${current === stage.value ? 'active' : 'inactive'}`}
            style={{cursor: needsSave ? 'not-allowed' : 'pointer'}}
            title={needsSave ? 'Please save the application first' : `Switch to ${stage.name}`}
            onClick={() => {
              if (needsSave) {
                notify(`Please save the application first to open the ${stage.name} stage.`);
                return;
              }
              setPicked(stage.value);
              setActiveStage(screen);
              if (tab !== 7 && SCREEN_TAB[screen] !== undefined) setTab(SCREEN_TAB[screen]);
            }}
          >
            {stage.name}
          </div>
        );
      }}
    />
  );
}
