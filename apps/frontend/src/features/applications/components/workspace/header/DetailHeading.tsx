/** Application title, customer name and status badge. */
import {initialStatusCode, useMasterData} from '@/shared/master-data';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {date} from '@/shared/lib/format';
import {Badge} from '@/shared/ui/Badge';
import {IconBox} from '@/shared/ui/IconBox';
import {label} from '@liugong/shared';
import {Building2} from 'lucide-react';

export function DetailHeading() {
  const {a, draft, liveCompanyName} = useWorkspace();
  const master = useMasterData();

  const rawCity = draft.city || a.city;
  const resolvedCity = master.city?.find(c => c.value === rawCity || c.name === rawCity)?.name || rawCity;
  const rawSegment = draft.industrySegment || a.industrySegment;
  const resolvedSegment =
    master.industrySegment?.find(s => s.value === rawSegment || s.name === rawSegment)?.name ||
    label(rawSegment);
  const mktPic = draft.mktPicName || a.mktPicName;

  return (
    <div className="detail-heading">
      <IconBox>
        <Building2 size={25} />
      </IconBox>
      <div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
          <h1>{liveCompanyName || (draft.isNew ? 'New Financing Application' : 'Financing Application')}</h1>
        </div>
        <p className="detail-meta">
          {!draft.isNew && (a.applicationNumber || a.application_number || a.fapNumber || a.code) && (
            <span className="detail-meta-id" title="Application Number">
              {a.applicationNumber || a.application_number || a.fapNumber || a.code}
            </span>
          )}
          {!draft.isNew && a.fapNumber && a.fapNumber !== (a.applicationNumber || a.application_number) && (
            <span className="detail-meta-id" title="FAP Registration Number">
              FAP: {a.fapNumber}
            </span>
          )}
          {!draft.isNew && a.branchCode && <span>{a.branchCode}</span>}
          {resolvedCity && <span>{resolvedCity}</span>}
          {(draft.companyType || a.companyType) && <span>{label(draft.companyType || a.companyType)}</span>}
          {resolvedSegment && <span>{resolvedSegment}</span>}
          <span>Created {date(draft.applicationDate || a.applicationDate)}</span>
        </p>
        {!draft.isNew && (
          <p className="detail-meta">
            <span>
              PIC Marketing: <b>{a.mktPic?.name || mktPic || (a.mktPic?.id ? `User #${a.mktPic.id}` : 'not set')}</b>
              {a.mktPic?.username && a.mktPic.username !== (a.mktPic?.name || mktPic) ? ` (${a.mktPic.username})` : ''}
            </span>
            {a.createdBy && <span>Created by {a.createdBy}</span>}
          </p>
        )}
      </div>
      <Badge status={draft.isNew ? initialStatusCode() : a.status} />
    </div>
  );
}
