/** Sub-section 2 of the financing proposal: the terms of the financing method chosen above. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {TermsColumn} from '@/features/applications/components/workspace/customer/proposal/TermsColumn';
import {
  TERMS_GROUPS,
  type TermsGroupConfig,
} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {resolveFinancingMethodGroup} from '@liugong/shared';
import {FileText} from 'lucide-react';

export function TermsAndConditionsCard() {
  const {draft} = useWorkspace();
  const method = draft.financingProposal?.facilityProposed?.financingMethod || draft.proposal?.financingMethod || '';
  const group = resolveFinancingMethodGroup(method);
  const matchedConfig = group ? TERMS_GROUPS.find(g => g.group === group) : undefined;

  const activeConfig: TermsGroupConfig = matchedConfig ?? {
    group: 'termsUnassigned',
    title: '',
    headerBackground: '#e0f2fe',
    fields: TERMS_GROUPS[0].fields,
  };

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
        Terms of the financing method chosen above.
      </p>
      <div style={{display: 'grid', gridTemplateColumns: 'minmax(320px, 680px)', gap: '16px'}}>
        <TermsColumn config={activeConfig} />
      </div>
    </div>
  );
}
