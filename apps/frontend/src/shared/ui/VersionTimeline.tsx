/** A vertical timeline of the versions of something (a workflow, an approval): when, by whom, what changed and which applications run on each. */
import {type ReactNode} from 'react';
import {Link} from 'react-router';
import {applicationHref} from '@/shared/lib/routes';

export interface VersionChange {
  kind: 'added' | 'removed' | 'changed';
  area: string;
  label: string;
  detail?: string;
}

export interface TimelineVersion {
  id: string;
  freezeVersion: number;
  isLatest: boolean;
  at: string;
  by: string | null;
  action: 'CREATED' | 'EDITED';
  changes: VersionChange[] | null;
  summary: {added: number; removed: number; changed: number} | null;
  applications: number;
  applicationList: {id: string; companyName: string | null; createdAt: string}[];
}

const when = (v: string) => new Date(v).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'});
const SIGN = {added: '+', removed: '−', changed: '~'} as const;
const WORD = {added: 'Added', removed: 'Removed', changed: 'Changed'} as const;

export function VersionTimeline<T extends TimelineVersion>({
  versions,
  noun,
  facts,
  extra,
  onViewApplications,
}: {
  versions: T[];
  noun: string;
  facts?: (v: T) => ReactNode;
  extra?: (v: T) => ReactNode;
  onViewApplications?: (v: T) => void;
}) {
  if (!versions.length) return <p className="vt-empty">No versions yet.</p>;
  return (
    <ol className="vt">
      {versions.map(v => {
        const s = v.summary;
        const none = v.action === 'EDITED' && v.changes?.length === 0;
        return (
          <li key={v.id} className={`vt-item ${v.isLatest ? 'latest' : ''}`}>
            <span className="vt-dot" aria-hidden />
            <article className="vt-card">
              <header className="vt-head">
                <span className="vt-ver">Version {v.freezeVersion}</span>
                {v.isLatest && <span className="vt-chip newest">Newest</span>}
                <span className={`vt-chip ${v.action === 'CREATED' ? 'created' : 'edited'}`}>
                  {v.action === 'CREATED' ? 'Created' : 'Edited'}
                </span>
                <span className="vt-when">
                  {when(v.at)}
                  {v.by ? ` · by ${v.by}` : ''}
                </span>
              </header>

              {facts && <div className="vt-facts">{facts(v)}</div>}

              {v.action === 'CREATED' && <p className="vt-note">First version of this {noun}.</p>}
              {none && (
                <p className="vt-note">
                  Saved without any edit, so nothing is different from the version before it.
                </p>
              )}
              {s && !none && (
                <div className="vt-sum">
                  {(['added', 'removed', 'changed'] as const).map(
                    k =>
                      s[k] > 0 && (
                        <span key={k} className={`vt-sumchip ${k}`}>
                          {SIGN[k]} {s[k]} {k}
                        </span>
                      ),
                  )}
                </div>
              )}

              {v.changes && v.changes.length > 0 && (
                <details className="vt-changes" open={v.isLatest}>
                  <summary>What changed since version {v.freezeVersion - 1}</summary>
                  <ul>
                    {v.changes.map((c, i) => (
                      <li key={i} className={c.kind}>
                        <b>{WORD[c.kind]}</b> <span className="vt-area">{c.area.toLowerCase()}</span>{' '}
                        {c.label}
                        {c.detail && <span className="vt-detail">{c.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <Applications v={v} onViewAll={onViewApplications} />

              {extra && <div className="vt-extra">{extra(v)}</div>}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

/** The applications on a version: at most 3 are named here, the rest are behind "View all". */
function Applications<T extends TimelineVersion>({v, onViewAll}: {v: T; onViewAll?: (v: T) => void}) {
  const shown = v.applicationList.slice(0, 3);
  return (
    <div className="vt-apps">
      <b>
        {v.applications} application{v.applications === 1 ? '' : 's'}
      </b>{' '}
      <span className="vt-muted">
        {v.applications === 0 ? 'run on this version.' : 'run on this version'}
      </span>
      {shown.length > 0 && (
        <ul className="vt-applist">
          {shown.map(a => (
            <li key={a.id}>
              <Link to={applicationHref(a.id)}>{a.companyName || 'Application'}</Link>
              <span className="vt-muted"> · {new Date(a.createdAt).toLocaleDateString('en-GB', {dateStyle: 'medium'})}</span>
            </li>
          ))}
        </ul>
      )}
      {v.applications > shown.length && onViewAll && (
        <button type="button" className="vt-viewall" onClick={() => onViewAll(v)}>
          View all {v.applications} applications
        </button>
      )}
    </div>
  );
}
