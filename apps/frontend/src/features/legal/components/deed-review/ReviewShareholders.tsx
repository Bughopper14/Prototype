/** Shareholders and management of the deed, expandable per person. */
import {ChevronDown} from 'lucide-react';
import type {Dispatch, SetStateAction} from 'react';

export function ReviewShareholders({
  deed,
  closedRows,
  setClosedRows,
  detailRows,
  holders,
}: {
  deed: any;
  closedRows: Record<number, boolean>;
  setClosedRows: Dispatch<SetStateAction<Record<number, boolean>>>;
  detailRows: (r: any) => (readonly [string, string])[];
  holders: any[];
}) {
  return (
    <div className="deed-review-shareholders">
      <h3>Submitted stakeholders / shareholders</h3>
      {holders.map((r: any, i: number) => (
        <div key={r.id || i} className={'deed-review-holder' + (closedRows[i] ? '' : ' open')}>
          <button
            type="button"
            className="deed-review-holder-row"
            aria-expanded={!closedRows[i]}
            onClick={() => setClosedRows({...closedRows, [i]: !closedRows[i]})}
          >
            <span>
              {[r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || r.name || 'No name'}
            </span>
            <b>{Number(r.sharePercentage || 0).toFixed(2)}%</b>
            <ChevronDown size={15} />
          </button>
          {!closedRows[i] && (
            <dl className="deed-review-holder-detail">
              {detailRows(r).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}
