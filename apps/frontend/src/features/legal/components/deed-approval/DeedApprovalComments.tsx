/** Comment box for the approver and the error message. */

export function DeedApprovalComments({
  canApprove,
  error,
  comments,
  setComments,
  withRemarks = true,
}: {
  canApprove: boolean;
  /** Includes a third Remarks action when the workflow does not configure section-level deed approval. */
  withRemarks?: boolean;
  error: string;
  comments: string;
  setComments: (v: string) => void;
}) {
  return (
    <>
      {canApprove && (
        <label className="deed-approval-comments">
          {withRemarks ? 'Remarks (optional when approving, required for Remarks or Reject)' : 'Notes (optional when approving, required for Reject)'}
          <textarea
            aria-label="Remarks"
            rows={3}
            maxLength={10000}
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder={
              withRemarks
                ? 'Add remarks for the record. To ask MKT to change something, describe it here and use Remarks. To refuse the deed, give the reason and use Reject.'
                : 'Add a note for the record. To send the deed back to MKT, write what must be changed and use Reject.'
            }
          />
        </label>
      )}
      {canApprove && !comments.trim() && (
        <ul className="muted deed-approval-hint">
          <li>
            <b>Approve</b>: the deed is correct. A note is optional.
          </li>
          {withRemarks && (
            <li>
              <b>Remarks</b>: the deed is not wrong, but MKT must change or add something. It goes back to MKT
              as "Rejected" with your note, and MKT submits it again.
            </li>
          )}
          <li>
            <b>Reject</b>: {withRemarks ? 'the deed is refused. ' : 'the deed goes back to MKT as "Rejected" with your reason, whether it is wrong or only needs a change. '}
            {withRemarks ? 'It goes back to MKT as "Rejected" with your reason.' : 'MKT fixes it and submits it again.'}
          </li>
          <li>{withRemarks ? 'Remarks and Reject' : 'Reject'} stays grey until you write in the box above.</li>
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
