/** Application title, customer name and status badge. */
import {STAGE, initialStatusCode, stageName, useMasterData} from '@/shared/master-data';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {date} from '@/shared/lib/format';
import {Badge} from '@/shared/ui/Badge';
import {IconBox} from '@/shared/ui/IconBox';
import {label} from '@liugong/shared';
import {Building2} from 'lucide-react';

export function DetailHeading() {
  const {a, draft, liveCompanyName, currentAppStage} = useWorkspace();
  const master = useMasterData();

  const rawCity = draft.city || a.city;
  const resolvedCity = master.city?.find(c => c.value === rawCity || c.name === rawCity)?.name || rawCity;
  const rawSegment = draft.industrySegment || a.industrySegment;
  const resolvedSegment =
    master.industrySegment?.find(s => s.value === rawSegment || s.name === rawSegment)?.name ||
    label(rawSegment);

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
            className={`stage-pill-indicator ${currentAppStage === STAGE.FAP ? 'stage-fap' : 'stage-preanalysis'}`}
          >
            Active Stage: {stageName(currentAppStage)}
          </span>
        </div>
        <p>
          {draft.isNew ? (
            <>
              FAP Intake Stage <span>·</span> {resolvedCity || draft.branchCode || 'Draft'} <span>·</span>{' '}
              {new Date().toLocaleDateString('en-GB')}
            </>
          ) : (
            <>
              {resolvedSegment} <span>·</span> {resolvedCity || '—'}{' '}
              <span>·</span> Created {date(draft.applicationDate || a.applicationDate)}
            </>
          )}
        </p>
      </div>
      <Badge status={draft.isNew ? initialStatusCode() : a.status} />
    </div>
  );
}
