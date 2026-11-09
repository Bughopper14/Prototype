/** Good project / good customer yes-no toggles. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function GoodProjectCustomerToggles() {
  const {data, updateField} = usePreAnalysis();
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
      <div
        style={{
          padding: '10px',
          borderRadius: '6px',
          border: `1px solid ${data.goodProject ? '#86efac' : '#fca5a5'}`,
          background: data.goodProject ? '#f0fdf4' : '#fef2f2',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: data.goodProject ? '#15803d' : '#b91c1c',
            }}
          >
            Good Project? {data.goodProject ? 'YES' : 'NO'}
          </span>
          <button
            type="button"
            onClick={() => updateField('goodProject', !data.goodProject)}
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            Toggle
          </button>
        </div>
        <input
          type="text"
          value={data.goodProjectNote}
          onChange={e => updateField('goodProjectNote', e.target.value)}
          placeholder="e.g. Harvesting Contractor, PT RAPP - APRIL Group"
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>

      <div
        style={{
          padding: '10px',
          borderRadius: '6px',
          border: `1px solid ${data.goodCustomer ? '#86efac' : '#fca5a5'}`,
          background: data.goodCustomer ? '#f0fdf4' : '#fef2f2',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: data.goodCustomer ? '#15803d' : '#b91c1c',
            }}
          >
            Good Customer? {data.goodCustomer ? 'YES' : 'NO'}
          </span>
          <button
            type="button"
            onClick={() => updateField('goodCustomer', !data.goodCustomer)}
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            Toggle
          </button>
        </div>
        <input
          type="text"
          value={data.goodCustomerNote}
          onChange={e => updateField('goodCustomerNote', e.target.value)}
          placeholder="Customer assessment notes"
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>
    </div>
  );
}
