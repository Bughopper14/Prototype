/** Dealer verification, terms of payment and the LMI internal AR check. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function DealerVerificationFields() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      <div>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Dealer Check</span>
          <span style={{fontSize: '0.68rem', color: '#1e40af', fontWeight: 600}}>Dealer Verification</span>
        </label>
        <input
          type="text"
          name="dealerCheck"
          data-field="dealerCheck"
          value={data.dealerCheck || ''}
          onChange={e => updateField('dealerCheck', e.target.value)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-dealerCheck')}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '0.8rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
        <TextField name="topDealerToCustomer" label="TOP from Dealer to Customer" />
        <TextField name="topLmiToDealer" label="TOP from LMI to Dealer" />
      </div>
      <TextField name="lmiArCheck" label="LMI Internal AR Check" />
    </>
  );
}
