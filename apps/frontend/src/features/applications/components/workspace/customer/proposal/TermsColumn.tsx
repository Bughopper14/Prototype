/** One Terms & Conditions column: a heading and its free-text fields. */
import {TermsField} from '@/features/applications/components/workspace/customer/proposal/TermsField';
import type {TermsGroupConfig} from '@/features/applications/components/workspace/customer/proposal/terms-config';

export function TermsColumn({config}: {config: TermsGroupConfig}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{minHeight: '42px', display: 'flex', alignItems: 'center', marginBottom: '14px'}}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#002c5f',
            background: config.headerBackground,
            padding: '6px 10px',
            borderRadius: '4px',
            lineHeight: 1.3,
            width: '100%',
          }}
        >
          {config.title}
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        {config.fields.map(field => (
          <TermsField key={field.dataField} group={config.group} field={field} />
        ))}
      </div>
    </div>
  );
}
