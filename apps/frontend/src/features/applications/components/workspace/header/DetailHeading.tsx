/** Application title, customer name and status badge. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {date} from '@/shared/lib/format';
import {Badge} from '@/shared/ui/Badge';
import {IconBox} from '@/shared/ui/IconBox';
import {label} from '@liugong/shared';
import {Building2} from 'lucide-react';

export function DetailHeading() {
  const {a, draft, liveCompanyName, currentAppStage} = useWorkspace();
  return (
    <div className="detail-heading">
      <IconBox>
        <Building2 size={25} />
      </IconBox>
      <div>
        <div className="eyebrow">
          {draft.isNew ? (
            <span>NEW APPLICATION · FAP INTAKE</span>
          ) : a.fapNumber ? (
            <>
              {a.fapNumber}
              {a.branchCode && <span> / {a.branchCode}</span>}
            </>
          ) : (
            a.branchCode || null
          )}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
          <h1>{liveCompanyName || (draft.isNew ? 'New Financing Application' : 'Financing Application')}</h1>
          <span
            className={`stage-pill-indicator ${currentAppStage === 'FAP Stage' ? 'stage-fap' : 'stage-preanalysis'}`}
          >
            Active Stage: {currentAppStage}
          </span>
        </div>
        <p>
          {draft.isNew ? (
            <>
              FAP Intake Stage <span>·</span> {draft.city || draft.branchCode || 'Draft'} <span>·</span>{' '}
              {new Date().toLocaleDateString('en-GB')}
            </>
          ) : (
            <>
              {label(draft.industrySegment || a.industrySegment)} <span>·</span> {draft.city || a.city || '—'}{' '}
              <span>·</span> Created {date(draft.applicationDate || a.applicationDate)}
            </>
          )}
        </p>
      </div>
      <Badge status={draft.isNew ? 'DRAFT' : a.status} />
    </div>
  );
}
