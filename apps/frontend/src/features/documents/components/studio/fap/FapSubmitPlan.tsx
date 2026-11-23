/** What the FAP stage still lacks and which approvals start when it is submitted: the answers of the Submit dialog, shown next to the signed FAP review. */
import {api} from '@/shared/lib/api';
import {Check, ListChecks, ShieldCheck} from 'lucide-react';
import {useEffect, useState} from 'react';

type Gap = {target: string; label: string; detail?: string};
type Level = {levelNo: number; authorityName: string; isPicMarketing: boolean};

/** The approver of a level without the technical prefix and suffix (CRM_FAP-FORM_BS_APPROVE -> FAP-FORM BS). */
const who = (l: Level) => (l.isPicMarketing || !l.authorityName ? 'PIC Marketing' : l.authorityName.replace(/^CRM_/i, '').replace(/_?(APPROVE|APPROVAL|APPROVER)$/i, '').replace(/_/g, ' '));

/** "Level 1: BS · Level 2: CA + LEGAL" (rows of one level approve together). */
function levelsText(levels: Level[]) {
  const byLevel = new Map<number, string[]>();
  for (const l of [...levels].sort((x, y) => x.levelNo - y.levelNo)) byLevel.set(l.levelNo, [...(byLevel.get(l.levelNo) || []), who(l)]);
  return [...byLevel.entries()].map(([no, names]) => `Level ${no}: ${names.join(' + ')}`).join(' · ');
}

const PART: Record<string, (p: any) => string> = {
  DOCUMENT: p => `Document verification · ${p.documentCode}`,
  SECTION: () => 'Deed review (each deed sent for review)',
  STAGE: () => 'Stage approval',
  GROUP: () => 'Group approval',
};

export function FapSubmitPlan({application}: {application: any}) {
  const stage: string | undefined = application.stageProgress?.[0]?.stage;
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  useEffect(() => {
    if (!stage) return;
    let alive = true;
    api(`/applications/${application.id}/stages/${encodeURIComponent(stage)}/check`)
      // the unreviewed differences are what this panel is about (the buttons below note or approve them), so they are not listed as a gap here
      .then((r: any) => alive && setGaps(Array.isArray(r?.missing) ? r.missing.filter((g: Gap) => !/Perbedaan dokumen FAP/.test(g.label)) : []))
      .catch(() => alive && setGaps([]));
    return () => {
      alive = false;
    };
  }, [application.id, application.updatedAt, stage]);
  if (!stage) return null;
  const group = (application.workflow?.groups || []).find((g: any) => (g.stageCodes || []).includes(stage))?.code;
  const order = ['DOCUMENT', 'SECTION', 'STAGE', 'GROUP'];
  const places = ((application.approvalPlaces || []) as any[])
    .filter(p => (p.scope === 'GROUP' ? p.groupCode === group : p.stageCode === stage))
    .sort((x, y) => order.indexOf(x.scope) - order.indexOf(y.scope));
  const box = {border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', background: '#fff', marginTop: 14} as const;
  const head = {display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 8px'} as const;
  return (
    <div className="fap-submit-plan" style={{display: 'grid', gap: 0}}>
      <div style={box}>
        <h4 style={head}>
          <ListChecks size={15} /> Before the stage can be submitted
        </h4>
        {gaps === null ? (
          <p className="muted" style={{margin: 0, fontSize: 12.5}}>Checking…</p>
        ) : gaps.length === 0 ? (
          <p style={{margin: 0, fontSize: 12.5, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6}}>
            <Check size={14} /> Nothing is missing: required fields, documents and deeds are complete.
          </p>
        ) : (
          <ul style={{margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#334155', lineHeight: 1.6}}>
            {gaps.map((g, i) => (
              <li key={i}>
                <strong>{g.label}</strong>
                {g.detail ? <span className="muted"> · {g.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {places.length > 0 && (
        <div style={box}>
          <h4 style={head}>
            <ShieldCheck size={15} /> Approvals that start after submit
          </h4>
          <ul style={{margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#334155', lineHeight: 1.6}}>
            {places.map((p, i) => (
              <li key={i}>
                <strong>{(PART[p.scope] || (() => p.scope))(p)}</strong>
                <span className="muted"> · {p.approvalName || p.approvalCode}</span>
                <div className="muted" style={{fontSize: 12}}>{levelsText(p.levels || []) || 'No level set'}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
