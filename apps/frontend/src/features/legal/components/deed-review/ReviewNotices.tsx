/** Review status and the reason a deed was rejected (the remarks of the rejection in its approval). */
import {Check, Clock, X} from 'lucide-react';
import {deedStatusLabel} from '@liugong/shared';

export function ReviewNotices({deed, status}: {deed: any; status: string}) {
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  return (
    <>
      <div className={'deed-review-status ' + status.toLowerCase()}>
        {isApproved ? (
          <Check size={15} style={{strokeWidth: 2.5}} />
        ) : isRejected ? (
          <X size={15} style={{strokeWidth: 2.5}} />
        ) : (
          <Clock size={15} />
        )}
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
