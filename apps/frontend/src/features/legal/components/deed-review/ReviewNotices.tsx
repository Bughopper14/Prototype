/** Review status and the rejection / correction note. */
import {Clock} from 'lucide-react';
import {deedStatusLabel} from '@liugong/shared';

export function ReviewNotices({deed, status, error}: {deed: any; status: string; error: string}) {
  return (
    <>
      <div className={'deed-review-status ' + status.toLowerCase()}>
        <Clock size={15} />
        {deedStatusLabel(deed)}
      </div>
      {status === 'REJECTED' && deed.review?.rejectionReason && (
        <div className="error">
          <b>Rejection reason: </b>
          {deed.review.rejectionReason}
        </div>
      )}
      {status === 'NEEDS_CORRECTION' && deed.review?.correctionNote && (
        <div className="error">
          <b>Remarks: </b>
          {deed.review.correctionNote}
        </div>
      )}
    </>
  );
}
