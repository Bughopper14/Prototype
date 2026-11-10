/** Earlier review rounds of the deed. */
import {deedReviewLabels} from '@liugong/shared';

export function ReviewHistory({deed}: {deed: any}) {
  return (
    <>
      {deed.reviewHistory?.length > 0 && (
        <details className="deed-review-history">
          <summary>Review history</summary>
          {[...deed.reviewHistory].reverse().map((h: any, i: number) => (
            <div key={i}>
              <b>
                {h.action === 'REMARKS' ? 'Remarks' : deedReviewLabels[h.status]} · {h.actor}
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
