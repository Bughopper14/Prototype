/**
 * "What is being approved": a summary of the thing a step is about, shown to the approver right where they decide, so they do not have to hunt
 * through the tabs. Built only from the application the workspace already holds. It reads (never edits), and has buttons that open the full
 * form / documents / legal tab of the right stage.
 */
import {screenOf} from '@/features/applications/lib/workspace/stage';
import {SCREEN} from '@/shared/master-data';
import {ChevronRight, FileText, FolderOpen} from 'lucide-react';
import {useWorkspace} from './WorkspaceContext';
import type {Scope} from './approval-shared';

const dash = (v: any) => (v === null || v === undefined || v === '' ? '-' : String(v));

function Facts({rows}: {rows: [string, any][]}) {
  return (
    <dl className="ap-facts">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{dash(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

const DOC_STATUS: Record<string, string> = {PENDING: 'Not uploaded', UPLOADED: 'Uploaded', VERIFIED: 'Approved', REJECTED: 'Rejected'};

/** Opens the screen a scope is about (the same way the stage stepper does) and says what it opens, for a button label. */
export function useOpenView() {
  const {a, setActiveStage, setTab} = useWorkspace();
  const stages: any[] = a.workflow?.stages || [];
  const SCREEN_TAB: Record<string, number> = {[SCREEN.FAP]: 0, [SCREEN.PRE_ANALYSIS]: 8, [SCREEN.DOCUMENTS]: 6};
  return (scope: Scope): {label: string; go: () => void} | null => {
    const stageCode = scope.stageCode || stages.find(s => s.groupCode === scope.groupCode)?.code;
    const stage = stages.find(s => s.code === stageCode);
    if (!stage) return null;
    const tab = scope.scope === 'SECTION' ? 5 : scope.scope === 'DOCUMENT' ? 9 : undefined;
    const label = scope.scope === 'SECTION' ? 'View the deed' : scope.scope === 'DOCUMENT' ? 'View the document' : scope.scope === 'GROUP' ? 'View the stages' : `View ${stage.name}`;
    return {
      label,
      go: () => {
        const screen = screenOf(stage);
        setActiveStage(screen);
        setTab(tab ?? SCREEN_TAB[screen] ?? 0);
        window.scrollTo({top: 0, behavior: 'smooth'});
      },
    };
  };
}

export function ApprovalSummary({scope}: {scope: Scope}) {
  const {a, setActiveStage, setTab} = useWorkspace();
  const stages: any[] = a.workflow?.stages || [];
  const docs: any[] = a.documentChecks || [];
  const progress: any[] = a.stageProgress || [];
  /** The tab each screen opens on (the same ones the stage stepper uses). */
  const SCREEN_TAB: Record<string, number> = {[SCREEN.FAP]: 0, [SCREEN.PRE_ANALYSIS]: 8, [SCREEN.DOCUMENTS]: 6};
  /** Opens a stage the way the stepper does: switch to its screen, then to a tab (its first one unless a tab is given, e.g. 5 = Legal). */
  const open = (stageCode: string | null | undefined, tab?: number) => {
    const stage = stages.find(s => s.code === stageCode);
    if (!stage) return;
    const screen = screenOf(stage);
    setActiveStage(screen);
    setTab(tab ?? SCREEN_TAB[screen] ?? 0);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const docList = (list: any[]) =>
    list.length ? (
      <ul className="ap-sum-list">
        {list.map(d => (
          <li key={d.id}>
            <FileText size={14} />
            <span>
              {d.documentName}
              {d.isMandatory && <span className="ap-req">Required</span>}
            </span>
            <em>
              {DOC_STATUS[d.status] ?? d.status}
              {d.files?.length ? ` · ${d.files.length} file${d.files.length === 1 ? '' : 's'}` : ''}
            </em>
          </li>
        ))}
      </ul>
    ) : (
      <p className="muted">No document in this stage.</p>
    );

  if (scope.scope === 'SECTION' && scope.subjectId) {
    const deed = (a.legal?.deeds || []).find((d: any) => d.id === scope.subjectId);
    if (!deed) return null;
    return (
      <div className="ap-summary">
        <b>The deed</b>
        <Facts
          rows={[
            ['Deed number', deed.deedNumber],
            ['Type', deed.type === 'amendment' ? 'Amendment deed' : 'Establishment deed'],
            ['Deed date', deed.deedDate],
            ['Notary', deed.notaryName],
            ['Ministerial decree', [deed.ministerialDecreeNumber, deed.ministerialDecreeDate].filter(Boolean).join(' · ')],
            ['Stakeholders', deed.stakeholders?.length ?? deed.shareholders],
            ['Remarks', deed.remarks],
          ]}
        />
        <button type="button" className="button small" onClick={() => open(scope.stageCode, 5)}>
          <FolderOpen size={14} /> Open the Legal tab
        </button>
      </div>
    );
  }

  if (scope.scope === 'STAGE') {
    const stage = stages.find(s => s.code === scope.stageCode);
    const mine = docs.filter(d => d.stageCode === scope.stageCode);
    // a required document is done when it is approved (it has an approval in the workflow) or uploaded (it has none)
    const notDone = mine.filter(d => d.isMandatory && (d.approval ? d.status !== 'VERIFIED' : !(d.files || []).length));
    return (
      <div className="ap-summary">
        <b>{stage?.name ?? 'The stage'}</b>
        <b>Documents of this stage</b>
        {docList(mine)}
        {notDone.length > 0 && (
          <p className="wf-apl-warn block">
            This stage cannot be approved yet: {notDone.length} required document{notDone.length === 1 ? ' is' : 's are'} not done ({notDone.map(d => d.documentName).join(', ')}).
          </p>
        )}
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <button type="button" className="button small" onClick={() => open(scope.stageCode, 9)}>
            <FolderOpen size={14} /> Open Document Checklist
          </button>
          <button type="button" className="button small" onClick={() => open(scope.stageCode)}>
            <FolderOpen size={14} /> Open {stage?.name ?? 'the stage'}
          </button>
        </div>
      </div>
    );
  }

  if (scope.scope === 'GROUP') {
    const inGroup = stages.filter(s => s.groupCode === scope.groupCode);
    return (
      <div className="ap-summary">
        <b>The stages of this group</b>
        <ul className="ap-sum-list">
          {inGroup.map(s => {
            const p = progress.find(x => x.stage === s.code);
            return (
              <li key={s.code}>
                <button type="button" className="ap-sum-open" onClick={() => open(s.code)} title={`Open ${s.name}`}>
                  <FileText size={14} />
                  <span>{s.name}</span>
                  <em>{p?.completed ? 'Approved' : p?.submitted ? 'Submitted, in approval' : 'Not submitted'}</em>
                  <ChevronRight size={14} />
                </button>
              </li>
            );
          })}
        </ul>
        {inGroup.some(st => !progress.find(x => x.stage === st.code)?.completed) && (
          <p className="wf-apl-warn block">
            This group cannot be approved yet: every stage in it must be approved first ({inGroup.filter(st => !progress.find(x => x.stage === st.code)?.completed).map(st => st.name).join(', ')}).
          </p>
        )}
      </div>
    );
  }

  if (scope.scope === 'DOCUMENT') {
    const d = docs.find(x => x.id === scope.checklistId);
    return (
      <div className="ap-summary">
        <b>The document</b>
        {d ? docList([d]) : <p className="muted">Document not found.</p>}
      </div>
    );
  }
  return null;
}
