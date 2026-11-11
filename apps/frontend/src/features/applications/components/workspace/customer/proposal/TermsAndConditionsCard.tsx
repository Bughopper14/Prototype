/** Sub-section 2 of the financing proposal: active Terms & Conditions column matching the selected Financing Method. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {TermsColumn} from '@/features/applications/components/workspace/customer/proposal/TermsColumn';
import {
  resolveFinancingMethod,
  TERMS_GROUPS,
} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {FileText} from 'lucide-react';

function hasAnyValue(obj: Record<string, any> | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some(v => v !== undefined && v !== null && String(v).trim() !== '');
}

export function TermsAndConditionsCard() {
  const {draft} = useWorkspace();
  const fp = draft.financingProposal || {};
  const resolved = resolveFinancingMethod(fp.facilityProposed?.financingMethod);

  const activeGroupKey =
    resolved?.group ||
    (hasAnyValue(fp.termsSaleAndLeaseBack)
      ? 'termsSaleAndLeaseBack'
      : hasAnyValue(fp.termsInstallmentFinancing)
        ? 'termsInstallmentFinancing'
        : 'termsFinancialLease');

  const activeConfig = TERMS_GROUPS.find(g => g.group === activeGroupKey) || TERMS_GROUPS[0];

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
        Detail terms for the selected financing method (automatically synced to the FAP form on the right)
      </p>

      <TermsColumn key={activeConfig.group} config={activeConfig} />
    </div>
  );
}
