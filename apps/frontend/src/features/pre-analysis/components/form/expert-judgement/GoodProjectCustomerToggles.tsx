/** Good project / good customer toggles with their notes. */
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function GoodProjectCustomerToggles() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* Good Project & Good Customer Toggles */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
        <div
          data-field="goodProject"
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
              onClick={() => {
                updateField('goodProject', !data.goodProject);
                scrollToPreviewElement('preana-preview-cell-goodProject');
              }}
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
            name="goodProjectNote"
            data-field="goodProjectNote"
            value={data.goodProjectNote}
            onChange={e => updateField('goodProjectNote', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-goodProject')}
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
          data-field="goodCustomer"
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
              onClick={() => {
                updateField('goodCustomer', !data.goodCustomer);
                scrollToPreviewElement('preana-preview-cell-goodCustomer');
              }}
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
            name="goodCustomerNote"
            data-field="goodCustomerNote"
            value={data.goodCustomerNote}
            onChange={e => updateField('goodCustomerNote', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-goodCustomer')}
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

      <div>
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Brief Note</label>
        <PreAnalysisRichEditor
          value={data.briefNote || ''}
          onChange={val => updateField('briefNote', val)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-briefNote')}
          height={160}
          dataField="briefNote"
        />
      </div>
    </>
  );
}
