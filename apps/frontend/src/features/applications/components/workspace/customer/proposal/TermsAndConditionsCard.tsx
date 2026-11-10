/** Sub-section 2 of the financing proposal: terms for Financial Lease, Sale & Lease Back and Installment Financing. */
import {TermsColumn} from '@/features/applications/components/workspace/customer/proposal/TermsColumn';
import {TERMS_GROUPS} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {FileText} from 'lucide-react';

export function TermsAndConditionsCard() {
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
        Detail terms for Financial Lease, Sale &amp; Lease Back, and Installment Financing (all free text)
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {TERMS_GROUPS.map(config => (
          <TermsColumn key={config.group} config={config} />
        ))}
      </div>
    </div>
  );
}
