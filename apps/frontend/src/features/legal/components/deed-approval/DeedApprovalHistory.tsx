/** Earlier approval rounds of the deed. */
import {deedApprovalLabels} from '@liugong/shared';

export function DeedApprovalHistory({deed}: {deed: any}) {
  return (
    <>
      {deed.approvalHistory?.length > 0 && (
        <details className="deed-approval-history">
          <summary>Review history</summary>
          {[...deed.approvalHistory].reverse().map((h: any, i: number) => (
            <div key={i}>
              <b>
                {h.action === 'REMARKS' ? 'Remarks' : deedApprovalLabels[h.status]} · {h.actor}
              </b>
              <small>{new Date(h.at).toLocaleString('en-GB', {timeZone: 'Asia/Bangkok'})}</small>
              {h.comments && <p>{h.comments}</p>}
            </div>
          ))}
        </details>
      )}
    </>
  );
}
