/** Form section 6: Cross-check with Dealer / LMI, incl. SLIK review per group entity. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {ChevronDown} from 'lucide-react';

import {EntitySlikReviews} from '@/features/pre-analysis/components/form/dealer-cross-check/EntitySlikReviews';
export function DealerCrossCheckSection() {
  const {data, openSections, toggleSection, scrollToPreviewElement, updateField} = usePreAnalysis();
  return (
    <div
      id="acc-sec6"
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
        onClick={() => toggleSection('sec6')}
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: openSections.sec6 ? '1px solid #e2e8f0' : 'none',
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
            06
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>
            6. CROSS-CHECK WITH DEALER / LMI (quick)
          </span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec6 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec6 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
        >
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
              <span style={{fontSize: '0.68rem', color: '#1e40af', fontWeight: 600}}>
                Dealer Verification
              </span>
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
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                TOP from Dealer to Customer
              </label>
              <input
                type="text"
                name="topDealerToCustomer"
                data-field="topDealerToCustomer"
                value={data.topDealerToCustomer}
                onChange={e => updateField('topDealerToCustomer', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-topDealerToCustomer')}
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
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                TOP from LMI to Dealer
              </label>
              <input
                type="text"
                name="topLmiToDealer"
                data-field="topLmiToDealer"
                value={data.topLmiToDealer}
                onChange={e => updateField('topLmiToDealer', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-topLmiToDealer')}
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
              LMI Internal AR Check
            </label>
            <input
              type="text"
              name="lmiArCheck"
              data-field="lmiArCheck"
              value={data.lmiArCheck}
              onChange={e => updateField('lmiArCheck', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-lmiArCheck')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
          {/* Per-PT from Subsection 3 Group Structure with Toggle YES/NO */}
          <EntitySlikReviews />{' '}
        </div>
      )}
    </div>
  );
}
