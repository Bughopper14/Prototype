/** What the FAP stage still lacks before it can be submitted, shown next to the signed FAP review. */
import {api} from '@/shared/lib/api';
import {Check, ListChecks} from 'lucide-react';
import {useEffect, useState} from 'react';

type Gap = {target: string; label: string; detail?: string};
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
    </div>
  );
}
