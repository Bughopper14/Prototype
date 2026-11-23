import {ShieldCheck} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {ActivityLog} from '@/shared/ui/ActivityLog';
import {ApplicationsDialog} from '@/shared/ui/ApplicationsDialog';
import {Modal} from '@/shared/ui/Modal';
import {VersionTimeline} from '@/shared/ui/VersionTimeline';
import {
  workflowApi,
  type Catalog,
  type WorkflowHistoryRow,
  type WorkflowLogRow,
  type WorkflowVersion,
} from './api';

/** The saved versions of one workflow (newest first) as a timeline; each one can be opened to see everything it contained. */
export function WorkflowHistory({workflowId, rows}: {workflowId: string; rows: WorkflowHistoryRow[]}) {
  const [shown, setShown] = useState<WorkflowVersion | null>(null);
  const [error, setError] = useState('');
  const [appsOf, setAppsOf] = useState<WorkflowHistoryRow | null>(null);
  const [tab, setTab] = useState<'versions' | 'log'>('versions');
  const [log, setLog] = useState<WorkflowLogRow[] | null>(null);
  useEffect(() => {
    void workflowApi
      .activity(workflowId)
      .then(setLog)
      .catch(() => setLog([]));
  }, [workflowId, rows]);
  const loadApps = useCallback(
    (q: string, page: number) => workflowApi.versionApplications(workflowId, appsOf!.id, q, page),
    [workflowId, appsOf],
  );
  async function open(freezeId: string) {
    try {
      setError('');
      setShown(await workflowApi.version(workflowId, freezeId));
    } catch (e: any) {
      setError(e.message || 'Could not open this version');
    }
  }
  return (
    <div className="vt-wrap">
      {error && <p className="vt-note">{error}</p>}
      <div className="vt-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'versions'}
          className={tab === 'versions' ? 'on' : ''}
          onClick={() => setTab('versions')}
        >
          Versions ({rows.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'log'}
          className={tab === 'log' ? 'on' : ''}
          onClick={() => setTab('log')}
        >
          Activity log{log ? ` (${log.length})` : ''}
        </button>
      </div>
      {tab === 'log' && (log ? <ActivityLog rows={log} /> : <p className="vt-empty">Loading…</p>)}
      {tab === 'versions' && (
        <VersionTimeline
          versions={rows}
          noun="workflow"
          onViewApplications={setAppsOf}
          facts={v => (
            <span>
              {v.counts.stages} stage{v.counts.stages === 1 ? '' : 's'} · {v.counts.fields} field
              {v.counts.fields === 1 ? '' : 's'} · {v.counts.documents} document
              {v.counts.documents === 1 ? '' : 's'} · {v.counts.approvals} approval
              {v.counts.approvals === 1 ? '' : 's'}
            </span>
          )}
          extra={v => (
            <button className="wf-btn small" onClick={() => open(v.id)}>
              View full content
            </button>
          )}
        />
      )}
      {appsOf && (
        <ApplicationsDialog
          title={`Applications on version ${appsOf.freezeVersion}`}
          load={loadApps}
          onClose={() => setAppsOf(null)}
        />
      )}
      {shown && <VersionDetail version={shown} onClose={() => setShown(null)} />}
    </div>
  );
}

/** The levels of an approval as steps: the same level number is approved at the same time. */
function Levels({levels}: {levels: WorkflowVersion['approvals'][number]['levelList']}) {
  const byNo = new Map<number, string[]>();
  for (const l of levels)
    byNo.set(l.levelNo, [
      ...(byNo.get(l.levelNo) ?? []),
      l.isPicMarketing ? 'PIC Marketing' : l.authorityName,
    ]);
  const rows = [...byNo].sort((x, y) => x[0] - y[0]);
  if (!rows.length) return <span className="vt-muted">No level.</span>;
  return (
    <ol className="vd-levels">
      {rows.map(([n, who]) => (
        <li key={n}>
          <span className="vd-levelno">Level {n}</span>
          <span className="vd-who">
            {who.map(w => (
              <code key={w}>{w}</code>
            ))}
            {who.length > 1 && <em>at the same time</em>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** One approval of a place, in words: what it is, where it applies, who approves at each level. */
function ApprovalCard({a, place}: {a: WorkflowVersion['approvals'][number]; place: string}) {
  return (
    <div className={`vd-approval ${a.scope === 'GROUP' ? 'group' : ''}`}>
      <div className="vd-approval-head">
        <b>{a.approvalName}</b>
        <span className="vd-ver">version {a.approvalVersion ?? '-'}</span>
      </div>
      <span className="vd-place">{place}</span>
      <Levels levels={a.levelList} />
    </div>
  );
}

type Ver = WorkflowVersion;

/** One stage of a version: what it asks for and who approves, in words. */
function StageCard({
  v,
  stage,
  sectionName,
  docName,
}: {
  v: Ver;
  stage: Ver['stages'][number];
  sectionName: (c: string | null) => string;
  docName: (c: string | null) => string;
}) {
  const fields = v.fields.filter(f => f.stageCode === stage.code);
  const docs = v.documents.filter(d => d.stageCode === stage.code);
  const aps = v.approvals.filter(a => a.scope !== 'GROUP' && a.stageCode === stage.code);
  const place = (a: Ver['approvals'][number]) =>
    a.scope === 'STAGE'
      ? 'Approves the whole stage'
      : a.scope === 'DOCUMENT'
        ? `Approves the document "${docName(a.documentCode)}"`
        : `Approves the form section "${sectionName(a.sectionCode)}"`;
  return (
    <article className="vd-stage">
      <header>
        <h5>{stage.name}</h5>
        <div className="vd-tags">
          <code>{stage.code}</code>
          {stage.formCode && <span className="vd-tag form">Form {stage.formCode}</span>}
          {stage.departmentCode && <span className="vd-tag dept">{stage.departmentCode}</span>}
        </div>
      </header>
      {fields.length > 0 && (
        <div className="vd-block">
          <h6>
            Fields <small>{fields.length}</small>
          </h6>
          <div className="vd-chips">
            {fields.map(f => (
              <span
                key={f.code}
                className={`vd-chip ${f.mandatory ? 'req' : ''}`}
                title={f.mandatory ? 'Required' : 'Optional'}
              >
                {f.label}
              </span>
            ))}
          </div>
        </div>
      )}
      {docs.length > 0 && (
        <div className="vd-block">
          <h6>
            Documents <small>{docs.length}</small>
          </h6>
          <div className="vd-chips">
            {docs.map(d => {
              const ap = aps.find(a => a.scope === 'DOCUMENT' && a.documentCode === d.code);
              return (
                <span
                  key={d.code}
                  className={`vd-chip doc ${d.isMandatory ? 'req' : ''}`}
                  title={`${d.isMandatory ? 'Required' : 'Optional'}${ap ? ` · approved by: ${ap.approvalName}` : ''}`}
                >
                  {d.name}
                  {ap && (
                    <ShieldCheck
                      size={12}
                      className="vd-chip-ap"
                      aria-label="This document has its own approval"
                    />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {aps.length > 0 && (
        <div className="vd-block">
          <h6>
            Approvals <small>{aps.length}</small>
          </h6>
          {aps.map(a => (
            <ApprovalCard
              key={`${a.scope}-${a.approvalCode}-${a.sectionCode ?? a.documentCode ?? ''}`}
              a={a}
              place={place(a)}
            />
          ))}
        </div>
      )}
      {!fields.length && !docs.length && !aps.length && (
        <p className="vt-muted">Nothing is required in this stage.</p>
      )}
    </article>
  );
}

/** The route in one line: steps left to right, groups in a step run together, stages of a group top to bottom (side by side when they share an order). Click a stage for its detail. */
function Overview({
  v,
  picked,
  onPick,
}: {
  v: Ver;
  picked: string | null;
  onPick: (code: string | null) => void;
}) {
  const steps: {order: number; groups: Ver['groups']}[] = [];
  for (const g of v.groups) {
    const st = steps.find(x => x.order === g.order);
    if (st) st.groups.push(g);
    else steps.push({order: g.order, groups: [g]});
  }
  steps.sort((a, b) => a.order - b.order);
  return (
    <div className="vo">
      <div className="vo-flow">
        <span className="vo-end">Start</span>
        {steps.map((step, si) => (
          <div key={step.order} className="vo-stepwrap">
            <span className="vo-arrow" aria-hidden>
              →
            </span>
            <div className={`vo-step ${step.groups.length > 1 ? 'parallel' : ''}`}>
              <small>{step.groups.length > 1 ? `Step ${si + 1} · together` : `Step ${si + 1}`}</small>
              {step.groups.map(g => {
                const stages = v.stages.filter(s => s.groupCode === g.code);
                const tiers: Ver['stages'][] = [];
                for (const s of stages) {
                  const last = tiers[tiers.length - 1];
                  if (last && last[0].order === s.order) last.push(s);
                  else tiers.push([s]);
                }
                const gap = v.approvals.some(a => a.scope === 'GROUP' && a.groupCode === g.code);
                return (
                  <section key={g.code} className="vo-group">
                    <header>
                      <b>{g.name}</b>
                      {gap && <ShieldCheck size={13} aria-label="The whole group needs an approval" />}
                    </header>
                    {tiers.map((tier, ti) => (
                      <div key={ti} className={`vo-tier ${tier.length > 1 ? 'parallel' : ''}`}>
                        {tier.map(s => {
                          const ap = v.approvals.filter(
                            a => a.scope !== 'GROUP' && a.stageCode === s.code,
                          ).length;
                          return (
                            <button
                              key={s.code}
                              type="button"
                              className={`vo-stage ${picked === s.code ? 'on' : ''}`}
                              aria-pressed={picked === s.code}
                              onClick={() => onPick(picked === s.code ? null : s.code)}
                            >
                              <span>{s.name}</span>
                              {ap > 0 && (
                                <i title={`${ap} approval${ap === 1 ? '' : 's'}`}>
                                  <ShieldCheck size={12} /> {ap}
                                </i>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
          </div>
        ))}
        <span className="vo-arrow" aria-hidden>
          →
        </span>
        <span className="vo-end">Done</span>
      </div>
      <p className="vt-muted vo-hint">Click a stage to see what it asks for and who approves.</p>
    </div>
  );
}

/** Everything one version of a workflow contained: a short overview first, the full detail when wanted. */
function VersionDetail({version: v, onClose}: {version: WorkflowVersion; onClose: () => void}) {
  const [tab, setTab] = useState<'overview' | 'details'>('overview');
  const [picked, setPicked] = useState<string | null>(null);
  const [base, setBase] = useState<Catalog | null>(null);
  useEffect(() => {
    void workflowApi
      .catalog()
      .then(setBase)
      .catch(() => setBase(null));
  }, []);
  const sectionName = (code: string | null) => base?.sections.find(x => x.code === code)?.name || code || '';
  const docName = (code: string | null) =>
    v.documents.find(d => d.code === code)?.name ||
    base?.documents.find(x => x.code === code)?.name ||
    code ||
    '';
  const stage = picked ? v.stages.find(s => s.code === picked) : undefined;
  return (
    <Modal
      title={`Version ${v.freeze.freezeVersion} of ${v.freeze.name}`}
      onClose={onClose}
      className="wf-history-modal vd-modal"
    >
      <div className="vd">
        <div className="vd-meta">
          <span className="vt-chip">{v.freeze.isLatest ? 'Newest version' : 'Older version'}</span>
          <span>
            Saved {new Date(v.freeze.at).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'})}
            {v.freeze.by ? ` by ${v.freeze.by}` : ''}
          </span>
          <span className="vd-ro">Read only</span>
        </div>
        <div className="vd-stats">
          <div>
            <b>{v.groups.length}</b>
            <span>groups</span>
          </div>
          <div>
            <b>{v.stages.length}</b>
            <span>stages</span>
          </div>
          <div>
            <b>{v.fields.length}</b>
            <span>fields</span>
          </div>
          <div>
            <b>{v.documents.length}</b>
            <span>documents</span>
          </div>
          <div>
            <b>{v.approvals.length}</b>
            <span>approvals</span>
          </div>
        </div>
        <div className="vt-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={tab === 'overview' ? 'on' : ''}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'details'}
            className={tab === 'details' ? 'on' : ''}
            onClick={() => setTab('details')}
          >
            Full detail
          </button>
        </div>
        {tab === 'overview' && (
          <>
            <Overview v={v} picked={picked} onPick={setPicked} />
            {stage && <StageCard v={v} stage={stage} sectionName={sectionName} docName={docName} />}
          </>
        )}
        {tab === 'details' &&
          v.groups.map((g, gi) => (
            <section key={g.code} className="vd-group">
              <header className="vd-group-head">
                <span className="vd-step">{gi + 1}</span>
                <h4>{g.name}</h4>
                <code>{g.code}</code>
              </header>
              {v.approvals
                .filter(a => a.scope === 'GROUP' && a.groupCode === g.code)
                .map(a => (
                  <ApprovalCard key={a.approvalCode} a={a} place="Approves the whole group" />
                ))}
              <div className="vd-stages">
                {v.stages
                  .filter(s => s.groupCode === g.code)
                  .map(s => (
                    <StageCard key={s.code} v={v} stage={s} sectionName={sectionName} docName={docName} />
                  ))}
              </div>
            </section>
          ))}
        {tab === 'details' && (
          <p className="vd-legend">
            <span className="vd-chip req">Highlighted</span> means required. A shield on a document means that
            document has its own approval.
          </p>
        )}
      </div>
    </Modal>
  );
}
