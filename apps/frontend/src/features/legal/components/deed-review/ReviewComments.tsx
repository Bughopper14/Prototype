/** Comment box for the reviewer and the error message. */

export function ReviewComments({
  deed,
  canCheck,
  canApprove,
  error,
  comments,
  setComments,
}: {
  deed: any;
  canCheck: boolean;
  canApprove: boolean;
  error: string;
  comments: string;
  setComments: (v: string) => void;
}) {
  return (
    <>
      {(canCheck || canApprove) && (
        <label className="deed-review-comments">
          Remarks (optional when approving, required for Remarks or Reject)
          <textarea
            aria-label="Remarks"
            rows={3}
            maxLength={10000}
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Add remarks for the record. To ask MKT to change something, describe it here and use Remarks. To refuse the deed, give the reason and use Reject."
          />
        </label>
      )}
      {(canCheck || canApprove) && !comments.trim() && (
        <ul className="muted deed-review-hint">
          <li>
            <b>{canCheck ? 'Verification passed' : 'Approve deed'}</b>: the deed is correct. Remarks are
            optional.
          </li>
          <li>
            <b>Remarks</b>: the deed is not wrong, but MKT must change or add something. It goes back to MKT
            as "Needs correction" with your note, and MKT submits it again.
          </li>
          <li>
            <b>Reject</b>: the deed is refused. It goes back to MKT as "Rejected" with your reason.
          </li>
          <li>Remarks and Reject stay grey until you write in the Remarks box above.</li>
        </ul>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
