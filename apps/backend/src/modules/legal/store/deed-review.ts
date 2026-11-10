/** Review state (remarks, reject) of a deed. */
import {pool} from '../../../core/db/pool';

/** Persists the approval workflow state (review, history, approved snapshot) of a deed. */
export async function saveDeedReviewState(
  applicationId: string,
  deedId: string,
  state: {review?: any; reviewHistory?: any[]; approvedSnapshot?: any; approvedAt?: string},
) {
  await pool.execute(
    'INSERT INTO deed_review(application_id,deed_id,review) VALUES(?,?,?) ON DUPLICATE KEY UPDATE review=VALUES(review)',
    [applicationId, deedId, JSON.stringify(state)],
  );
}
