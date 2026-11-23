/** A list of who did what and when (newest first). */
export interface ActivityRow {
  action: string;
  summary: string;
  by: string | null;
  at: string;
  version?: number | null;
  workflow?: string | null;
}

const LABEL: Record<string, string> = {CREATE: 'Created', EDIT: 'Saved', RENAME: 'Renamed', ACTIVATE: 'Set active', DEACTIVATE: 'Switched off', DELETE: 'Deleted'};

export function ActivityLog({rows, empty = 'Nothing was recorded yet.'}: {rows: ActivityRow[]; empty?: string}) {
  if (!rows.length) return <p className="vt-empty">{empty}</p>;
  return (
    <ol className="al">
      {rows.map((r, i) => (
        <li key={i} className={`al-row ${r.action.toLowerCase()}`}>
          <span className={`al-chip ${r.action.toLowerCase()}`}>{LABEL[r.action] ?? r.action}</span>
          <div className="al-body">
            <p>{r.summary}</p>
            <small>
              {r.workflow ? <b>{r.workflow} · </b> : null}
              {new Date(r.at).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'})}
              {r.by ? ` · by ${r.by}` : ''}
              {r.version != null ? ` · version ${r.version}` : ''}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
