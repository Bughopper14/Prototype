/** Form section 7: Expert Judgement Conclusion, suggestions, competition and sign-offs. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {CheckCircle2, ChevronDown, XCircle} from 'lucide-react';

import {CompetitionTableEditor} from '@/features/pre-analysis/components/form/expert-judgement/CompetitionTableEditor';
import {GoodProjectCustomerToggles} from '@/features/pre-analysis/components/form/expert-judgement/GoodProjectCustomerToggles';
import {SignOffEditor} from '@/features/pre-analysis/components/form/expert-judgement/SignOffEditor';
import {SuggestionsEditor} from '@/features/pre-analysis/components/form/expert-judgement/SuggestionsEditor';
export function ExpertJudgementSection() {
  const {reqMark, data, isRecommended, openSections, toggleSection, scrollToPreviewElement, updateField} =
    usePreAnalysis();
  return (
    <div
      id="acc-sec7"
      className="fap-accordion-card"
      style={{
        background: '#ffffff',
        border: '2px solid #1e3a8a',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        className="fap-accordion-header"
        onClick={() => toggleSection('sec7')}
        style={{
          padding: '10px 14px',
          background: '#eff6ff',
          borderBottom: openSections.sec7 ? '1px solid #bfdbfe' : 'none',
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
              background: '#1e3a8a',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            07
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>
            7. EXPERT JUDGEMENT CONCLUSION
          </span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec7 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec7 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
        >
          {/* Good Project & Good Customer Toggles */}
          <GoodProjectCustomerToggles />

          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Brief Note</label>
            <PreAnalysisRichEditor
              value={data.briefNote || ''}
              onChange={val => updateField('briefNote', val)}
              height={160}
              dataField="briefNote"
            />
          </div>

          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span>RECOMMENDATION{reqMark('recommendation', 'Expert Judgement Conclusion')}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: isRecommended ? '#166534' : '#991b1b',
                  fontWeight: 700,
                }}
              >
                {isRecommended ? '✓ RECOMMENDED' : '✕ NOT RECOMMENDED'}
              </span>
            </label>
            <div
              id="preana-input-recommendation"
              data-field="recommendation"
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                id="btn-toggle-recommendation-yes"
                onClick={() => {
                  updateField('recommendation', 'RECOMMENDED');
                  scrollToPreviewElement('preana-preview-cell-recommendation');
                }}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  border: isRecommended ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: isRecommended ? '#f0fdf4' : '#ffffff',
                  color: isRecommended ? '#15803d' : '#64748b',
                  boxShadow: isRecommended ? '0 1px 3px rgba(22, 163, 74, 0.2)' : 'none',
                }}
              >
                <CheckCircle2 size={16} color={isRecommended ? '#16a34a' : '#94a3b8'} />
                RECOMMENDED
              </button>
              <button
                type="button"
                id="btn-toggle-recommendation-no"
                onClick={() => {
                  updateField('recommendation', 'NOT RECOMMENDED');
                  scrollToPreviewElement('preana-preview-cell-recommendation');
                }}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  border: !isRecommended ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  background: !isRecommended ? '#fef2f2' : '#ffffff',
                  color: !isRecommended ? '#b91c1c' : '#64748b',
                  boxShadow: !isRecommended ? '0 1px 3px rgba(239, 68, 68, 0.2)' : 'none',
                }}
              >
                <XCircle size={16} color={!isRecommended ? '#ef4444' : '#94a3b8'} />
                NOT RECOMMENDED
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          <SuggestionsEditor />

          {/* Competition Information Table */}
          <CompetitionTableEditor />

          {/* Sign-offs (Area Tanda Tangan Diperlebar & Terstruktur) */}
          <SignOffEditor />
        </div>
      )}
    </div>
  );
}
