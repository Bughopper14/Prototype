/** Key numbers under the heading. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {money} from '@/shared/lib/format';
import {label} from '@liugong/shared';

export function DetailSummary() {
  const {a, customerCategory, draft} = useWorkspace();
  return (
    <div className="detail-summary">
      <div>
        <span>Proposed Financing</span>
        <b>{money(draft.proposal?.financingValue || a.proposal?.financingValue)}</b>
      </div>
      <div>
        <span>Financing Term</span>
        <b>{draft.proposal?.tenorMonths || a.proposal?.tenorMonths || '—'} months</b>
      </div>
      <div>
        <span>Customer Category</span>
        <b>
          {customerCategory === 'EXISTING'
            ? 'Existing Customer'
            : customerCategory === 'NEW'
              ? 'New Customer'
              : label(a.customer?.companyType || '—')}
        </b>
      </div>
      <div>
        <span>Documents Verified</span>
        <b>
          {a.documentChecks
            ? `${a.documentChecks.filter((d: any) => d.status === 'VERIFIED').length} / ${a.documentChecks.length}`
            : '0 / 0'}
        </b>
      </div>
    </div>
  );
}
