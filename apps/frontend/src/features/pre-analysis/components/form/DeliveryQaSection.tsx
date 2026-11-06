/** Form section 5: Unit Delivery Status & QA Check. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {ChevronDown} from 'lucide-react';

export function DeliveryQaSection() {
  const {data, openSections, toggleSection, scrollToPreviewElement, updateField} = usePreAnalysis();
  return (
    <div
      id="acc-sec5"
      className="fap-accordion-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        className="fap-accordion-header"
        onClick={() => toggleSection('sec5')}
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: openSections.sec5 ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span
            className="badge-chip"
            style={{
              background: '#dbeafe',
              color: '#1e40af',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            05
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>
            5. UNIT DELIVERY STATUS & QA CHECK
          </span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec5 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec5 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
        >
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Delivery Status</label>
              <input
                type="text"
                name="deliveryStatus"
                data-field="deliveryStatus"
                value={data.deliveryStatus}
                onChange={e => updateField('deliveryStatus', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-deliveryStatus')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Delivery Date</label>
              <input
                type="text"
                name="deliveryDate"
                data-field="deliveryDate"
                value={data.deliveryDate}
                onChange={e => updateField('deliveryDate', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-deliveryDate')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              QA Comment — iLink/GPS Performance Check
            </label>
            <input
              type="text"
              name="qaIlinkComment"
              data-field="qaIlinkComment"
              value={data.qaIlinkComment}
              onChange={e => updateField('qaIlinkComment', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-qaIlinkComment')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>QA Conclusion</label>
            <input
              type="text"
              name="qaConclusion"
              data-field="qaConclusion"
              value={data.qaConclusion}
              onChange={e => updateField('qaConclusion', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-qaConclusion')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
