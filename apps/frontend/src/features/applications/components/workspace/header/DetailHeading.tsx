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
          {!draft.isNew && (a.fapNumber || a.code) && <span className="detail-meta-id">{a.fapNumber || a.code}</span>}
          {!draft.isNew && a.branchCode && <span>{a.branchCode}</span>}
          {mktPic && <span>MKT_PIC: {mktPic}</span>}
          {resolvedCity && <span>{resolvedCity}</span>}
          {(draft.companyType || a.companyType) && <span>{label(draft.companyType || a.companyType)}</span>}
          {resolvedSegment && <span>{resolvedSegment}</span>}
          <span>Created {date(draft.applicationDate || a.applicationDate)}</span>
        </p>
      </div>
      <Badge status={draft.isNew ? initialStatusCode() : a.status} />
    </div>
  );
}
