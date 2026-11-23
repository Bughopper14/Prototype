/** Review status and the reason a deed was rejected (the remarks of the rejection in its approval). */
import {Clock} from 'lucide-react';
import {deedStatusLabel} from '@liugong/shared';

export function ReviewNotices({deed, status}: {deed: any; status: string}) {
  return (
    <>
      <div className={'deed-review-status ' + status.toLowerCase()}>
        <Clock size={15} />
        {deedStatusLabel(deed)}
      </div>
      {status === 'REJECTED' && deed.review?.notes && (
        <div className="error">
          <b>Rejected: </b>
          {deed.review.notes}
        </div>
      )}
    </>
  );
}
