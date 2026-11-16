/** Review status and the note of a deed sent back for revision (crm_fap_legal_deed_reviews.review_notes). */
import {Clock} from 'lucide-react';
import {deedStatusLabel} from '@liugong/shared';

export function ReviewNotices({deed, status}: {deed: any; status: string}) {
  return (
    <>
      <div className={'deed-review-status ' + status.toLowerCase()}>
        <Clock size={15} />
        {deedStatusLabel(deed)}
      </div>
      {status === 'NEEDS_REVISION' && deed.review?.notes && (
        <div className="error">
          <b>Revision notes: </b>
          {deed.review.notes}
        </div>
      )}
    </>
  );
}
