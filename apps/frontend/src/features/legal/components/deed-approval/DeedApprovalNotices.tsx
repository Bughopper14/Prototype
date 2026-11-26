/** Approval status and the reason a deed was rejected (the remarks of the rejection in its approval). */
import {Check, Clock, X} from 'lucide-react';
import {deedApprovalLabel} from '@liugong/shared';

export function DeedApprovalNotices({deed, status}: {deed: any; status: string}) {
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  return (
    <>
      <div className={'deed-approval-status ' + status.toLowerCase()}>
        {isApproved ? (
          <Check size={15} style={{strokeWidth: 2.5}} />
        ) : isRejected ? (
          <X size={15} style={{strokeWidth: 2.5}} />
        ) : (
          <Clock size={15} />
        )}
        {deedApprovalLabel(deed)}
      </div>
      {status === 'REJECTED' && deed.approval?.remarks && (
        <div className="error">
          <b>Rejected: </b>
          {deed.approval.remarks}
        </div>
      )}
    </>
  );
}
