/** Application title, customer name and status badge. */
import {initialStatusCode} from '@/shared/master-data';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {date} from '@/shared/lib/format';
import {Badge} from '@/shared/ui/Badge';
import {IconBox} from '@/shared/ui/IconBox';
import {label} from '@liugong/shared';
import {Building2} from 'lucide-react';

export function DetailHeading() {
  const {a, draft, liveCompanyName} = useWorkspace();
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
          {!draft.isNew && (
            <span className="detail-meta-id" title="Application ID">
              {a.id}
            </span>
          )}
          {!draft.isNew && a.branchCode && <span>{a.branchCode}</span>}
          {(draft.companyType || a.companyType) && <span>{label(draft.companyType || a.companyType)}</span>}
          <span>Created {date(draft.applicationDate || a.applicationDate)}</span>
        </p>
        {!draft.isNew && (
          <p className="detail-meta">
            <span>
              PIC Marketing: <b>{a.mktPic ? a.mktPic.name || `User #${a.mktPic.id}` : 'not set'}</b>
              {a.mktPic?.username && a.mktPic.username !== a.mktPic.name ? ` (${a.mktPic.username})` : ''}
            </span>
            {a.createdBy && <span>Created by {a.createdBy}</span>}
          </p>
        )}
      </div>
      <Badge status={draft.isNew ? initialStatusCode() : a.status} />
    </div>
  );
}
