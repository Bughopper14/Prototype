/** Title bar of the deed review dialog with the close button. */
import {X} from 'lucide-react';

export function ReviewHeader({
  application,
  deed,
  busy,
  onClose,
}: {
  application: any;
  deed: any;
  busy: boolean;
  onClose: () => void;
}) {
  return (
    <div className="modal-head">
      <div>
        <h2>Deed review {deed.deedNumber}</h2>
        <p>{application.customer.companyName}</p>
      </div>
      <button className="icon-button" disabled={busy} onClick={onClose} aria-label="Close review">
        <X size={20} />
      </button>
    </div>
  );
}
