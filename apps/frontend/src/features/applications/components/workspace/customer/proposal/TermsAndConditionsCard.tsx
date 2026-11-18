/** Sub-section 2 of the financing proposal: the terms of the financing method chosen above (only that one is shown). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {TermsColumn} from '@/features/applications/components/workspace/customer/proposal/TermsColumn';
import {TERMS_GROUPS} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {FAP_TERMS_COLUMNS} from '@liugong/shared';
import {FileText} from 'lucide-react';

export function TermsAndConditionsCard() {
  const {draft} = useWorkspace();
  const method = draft.financingProposal?.facilityProposed?.financingMethod || draft.proposal?.financingMethod || '';
  const column = Object.entries(FAP_TERMS_COLUMNS).find(([, code]) => code === method)?.[0];
  const config = TERMS_GROUPS.find(g => g.group === column);
  return (
    <div>
      <h5
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#0f172a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <FileText size={15} style={{color: '#0284c7'}} />
        Terms &amp; Conditions
      </h5>
      <p style={{fontSize: '12px', color: '#64748b', marginBottom: '14px'}}>
        {config ? 'Terms of the financing method chosen above.' : 'Choose a financing method above to fill in its terms.'}
      </p>
      {config && (
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(280px, 520px)', gap: '16px'}}>
          <TermsColumn config={config} />
        </div>
      )}
    </div>
  );
}
