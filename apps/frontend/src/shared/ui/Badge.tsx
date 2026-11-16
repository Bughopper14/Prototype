/** Status pill (draft, review, approved…). */
import {statusName, useMasterData} from '@/shared/master-data';
import {label} from '@liugong/shared';

export function Badge({status}: {status: string}) {
  const master = useMasterData();
  return (
    <span className={'badge ' + status?.toLowerCase()}>
      <i />
      {statusName(status, master) || label(status)}
    </span>
  );
}
