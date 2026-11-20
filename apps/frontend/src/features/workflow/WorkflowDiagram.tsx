/**
 * The "Diagram" tab of a workflow's details page: the route an application takes, drawn left to right so it can be read (and
 * explained) at a glance. Each column is a step. Groups of the same step run together (stacked). Inside a group the stages run top to
 * bottom, and stages that share an order run side by side. Click a stage to see what it asks for.
 */
import {ArrowDown, ArrowRight, Building2, FileText, Flag, ListChecks, Play, ShieldCheck, Zap} from 'lucide-react';
import {Fragment, useMemo, useState} from 'react';
import type {Catalog, Definition, Group, Stage} from './api';
import {sortStages, stepsOf} from './definition-ops';
import {GROUP_COLORS} from './palette';

type Tier = Stage[];

/** The stages of a group as tiers: stages with the same order are one tier and run together. */
function tiersOf(stages: Stage[]): Tier[] {
  const tiers: Tier[] = [];
  for (const s of sortStages(stages)) {
    const last = tiers[tiers.length - 1];
    if (last && last[0].order === s.order) last.push(s);
    else tiers.push([s]);
  }
  return tiers;
}

export function WorkflowDiagramView({def, catalog}: {def: Definition; catalog: Catalog | null}) {
  const [picked, setPicked] = useState<string | null>(null);
  const steps = useMemo(() => stepsOf(def), [def]);
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    steps.forEach(s => s.groups.forEach(g => map.set(g.key, GROUP_COLORS[map.size % GROUP_COLORS.length])));
    return map;
  }, [steps]);
  const deptName = (code?: string | null) => (code ? catalog?.departments.find(d => d.code === code)?.name || code : null);
  const stage = picked ? def.stages.find(s => s.key === picked) : undefined;

  if (!steps.length)
    return (
      <div className="wf-dg-empty">
        <Flag size={30} />
        <b>Nothing to draw yet</b>
        <span>Add the first group in the “Steps &amp; stages” tab.</span>
      </div>
    );

  return (
    <div className="wf-dg">
      <div className="wf-dg-legend" aria-label="How to read the diagram">
        <span>
          <ArrowRight size={14} /> next step, when the one before is done
        </span>
        <span>
          <ArrowDown size={14} /> next stage inside the same group
        </span>
        <span>
          <Zap size={16} /> worked at the same time
        </span>
        <span className="wf-dg-hint">Click a stage to see what it asks for</span>
      </div>

      <div className="wf-dg-canvas">
        <div className="wf-dg-flow">
          <div className="wf-dg-end start">
            <Play size={18} />
            <b>Application created</b>
          </div>
          {steps.map((step, si) => (
            <Fragment key={step.order}>
              <ArrowRight className="wf-dg-arrow" size={20} />
              <div className={`wf-dg-step ${step.groups.length > 1 ? 'parallel' : ''}`}>
                <div className="wf-dg-steplabel">
                  <b>Step {si + 1}</b>
                  {step.groups.length > 1 && (
                    <em>
                      <Zap size={13} /> {step.groups.length} groups at the same time
                    </em>
                  )}
                </div>
                {step.groups.map(g => (
                  <GroupBox key={g.key} group={g} color={colorOf.get(g.key) || GROUP_COLORS[0]} def={def} catalog={catalog} deptName={deptName} picked={picked} onPick={setPicked} />
                ))}
              </div>
            </Fragment>
          ))}
          <ArrowRight className="wf-dg-arrow" size={20} />
          <div className="wf-dg-end finish">
            <Flag size={18} />
            <b>Done</b>
          </div>
        </div>
      </div>

      {stage ? (
        <StageDetail stage={stage} def={def} catalog={catalog} color={colorOf.get(stage.groupKey) || GROUP_COLORS[0]} deptName={deptName(stage.departmentCode)} />
      ) : (
        <p className="wf-dg-pickhint">Pick a stage to see its department, form, required fields and documents.</p>
      )}
    </div>
  );
}

function GroupBox({group, color, def, catalog, deptName, picked, onPick}: {group: Group; color: string; def: Definition; catalog: Catalog | null; deptName: (c?: string | null) => string | null; picked: string | null; onPick: (key: string | null) => void}) {
  const tiers = tiersOf(def.stages.filter(s => s.groupKey === group.key));
  return (
    <section className="wf-dg-group" style={{['--gc' as any]: color}}>
      <header>
        <b>{group.name}</b>
        <small>
          {tiers.reduce((n, t) => n + t.length, 0)} stage{tiers.reduce((n, t) => n + t.length, 0) === 1 ? '' : 's'}
        </small>
      </header>
      {def.approvals.some(a => a.scope === 'GROUP' && a.groupKey === group.key) && (
        <p className="wf-dg-groupap">
          <ShieldCheck size={15} /> Approval of the whole group:{' '}
          {def.approvals
            .filter(a => a.scope === 'GROUP' && a.groupKey === group.key)
            .map(a => catalog?.approvals.find(x => x.code === a.approvalCode)?.name || a.approvalCode || 'not chosen yet')
            .join(', ')}
        </p>
      )}
      {tiers.length === 0 && <p className="wf-dg-nostage">No stage in this group yet.</p>}
      {tiers.map((tier, ti) => (
        <Fragment key={ti}>
          {ti > 0 && <ArrowDown className="wf-dg-down" size={16} />}
          <div className={`wf-dg-tier ${tier.length > 1 ? 'parallel' : ''}`}>
            {tier.length > 1 && (
              <span className="wf-dg-tierlabel">
                <Zap size={13} /> at the same time
              </span>
            )}
            <div className="wf-dg-stages">
              {tier.map(s => {
                const mandatory = def.fields.filter(f => f.stageKey === s.key && f.mandatory).length;
                const docs = def.documents.filter(d => d.stageKey === s.key).length;
                const approvals = def.approvals.filter(a => a.scope !== 'GROUP' && a.stageKey === s.key).length;
                const dept = deptName(s.departmentCode);
                return (
                  <button key={s.key} type="button" className={`wf-dg-stage ${picked === s.key ? 'on' : ''}`} aria-pressed={picked === s.key} onClick={() => onPick(picked === s.key ? null : s.key)}>
                    <b>{s.name}</b>
                    {dept && (
                      <span className="wf-dg-dept">
                        <Building2 size={14} /> {dept}
                      </span>
                    )}
                    <span className="wf-dg-counts">
                      <i>
                        <ListChecks size={14} /> {mandatory} required
                      </i>
                      <i>
                        <FileText size={14} /> {docs} document{docs === 1 ? '' : 's'}
                      </i>
                      {approvals > 0 && (
                        <i className="wf-dg-ap">
                          <ShieldCheck size={14} /> {approvals} approval{approvals === 1 ? '' : 's'}
                        </i>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Fragment>
      ))}
    </section>
  );
}

function StageDetail({stage, def, catalog, color, deptName}: {stage: Stage; def: Definition; catalog: Catalog | null; color: string; deptName: string | null}) {
  const fields = def.fields.filter(f => f.stageKey === stage.key && f.mandatory);
  const docs = def.documents.filter(d => d.stageKey === stage.key);
  const form = catalog?.forms.find(f => f.code === stage.formCode)?.name;
  const labelOf = (f: Definition['fields'][number]) => catalog?.formFields.find(x => x.formCode === f.formCode && x.section === f.section && x.code === f.code)?.label || f.code;
  const docName = (code: string) => catalog?.documents.find(d => d.code === code)?.name || code;
  const places = def.approvals.filter(a => (a.scope === 'GROUP' && a.groupKey === stage.groupKey) || a.stageKey === stage.key);
  const approvalOf = (code: string) => catalog?.approvals.find(x => x.code === code);
  const placeName = (a: Definition['approvals'][number]) =>
    a.scope === 'GROUP'
      ? 'The whole group'
      : a.scope === 'STAGE'
        ? 'This stage'
        : a.scope === 'SECTION'
          ? `Section · ${catalog?.sections.find(x => x.code === a.sectionCode)?.name || a.sectionCode}`
          : `Document · ${docName(a.documentCode || '')}`;
  const levelText = (code: string) => {
    const ap = approvalOf(code);
    if (!ap) return code ? 'this approval no longer exists' : 'no approval chosen yet';
    const by = new Map<number, string[]>();
    for (const l of ap.levels) by.set(l.levelNo, [...(by.get(l.levelNo) || []), l.isPicMarketing ? 'PIC Marketing' : l.authorityName]);
    return [...by].sort((x, y) => x[0] - y[0]).map(([n, a]) => `${n}: ${a.join(' + ')}`).join('  →  ');
  };
  const bySection = new Map<string, string[]>();
  for (const f of fields) bySection.set(f.section, [...(bySection.get(f.section) || []), labelOf(f)]);

  return (
    <section className="wf-dg-detail" style={{['--gc' as any]: color}}>
      <header>
        <h5>{stage.name}</h5>
        {deptName && (
          <span className="wf-dg-dept">
            <Building2 size={14} /> {deptName}
          </span>
        )}
        <span className="wf-dg-dept">{form ? `Shows: ${form}` : 'No form in this stage'}</span>
      </header>
      <div className="wf-dg-cols">
        <div>
          <h6>
            <ListChecks size={16} /> Required fields ({fields.length})
          </h6>
          {fields.length === 0 ? (
            <p className="wf-dg-none">Nothing is required here.</p>
          ) : (
            [...bySection.entries()].map(([section, labels]) => (
              <p key={section} className="wf-dg-sec">
                <b>{section}</b>
                <span>{labels.join(' · ')}</span>
              </p>
            ))
          )}
        </div>
        <div>
          <h6>
            <FileText size={16} /> Documents ({docs.length})
          </h6>
          {docs.length === 0 ? (
            <p className="wf-dg-none">No document is listed.</p>
          ) : (
            <ul>
              {docs.map(d => (
                <li key={d.documentCode}>
                  {docName(d.documentCode)}
                  <em className={d.isMandatory ? 'must' : ''}>{d.isMandatory ? 'Required' : 'Optional'}</em>
                  {!d.isDefault && <em>Added</em>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="wf-dg-approval">
        <h6>
          <ShieldCheck size={16} /> Approval ({places.length})
        </h6>
        {places.length === 0 ? (
          <p className="wf-dg-none">Nobody has to approve this stage: it is done as soon as it is submitted.</p>
        ) : (
          <>
            <table className="wf-dg-table">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Approval</th>
                  <th>Levels (who approves)</th>
                </tr>
              </thead>
              <tbody>
                {places.map((a, i) => (
                  <tr key={i}>
                    <td>{placeName(a)}</td>
                    <td>{approvalOf(a.approvalCode)?.name || a.approvalCode || 'not chosen yet'}</td>
                    <td>
                      <code>{levelText(a.approvalCode)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="wf-dg-none">Levels with the same number are approved at the same time; the next number starts when they are all approved. Anyone who holds the authority can approve or reject.</p>
          </>
        )}
      </div>
    </section>
  );
}
