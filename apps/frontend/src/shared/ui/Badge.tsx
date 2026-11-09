/** Status pill (draft, review, approved…). */
import {statusLabel} from '@/shared/lib/format';
import {label} from '@liugong/shared';

export function Badge({status}: {status: string}) {
  return (
    <span className={'badge ' + status?.toLowerCase()}>
      <i />
      {statusLabel[status] || label(status)}
    </span>
  );
}
