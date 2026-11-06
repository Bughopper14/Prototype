/** Form section 1: General Information. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {stripHtmlTags} from '@/features/pre-analysis/lib/text';
import {ChevronDown} from 'lucide-react';

export function GeneralInfoSection() {
  const {reqMark, data, openSections, toggleSection, scrollToPreviewElement, updateField} = usePreAnalysis();
  return (
    <div
      id="acc-sec1"
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
        onClick={() => toggleSection('sec1')}
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: openSections.sec1 ? '1px solid #e2e8f0' : 'none',
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
            01
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>1. GENERAL INFORMATION</span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec1 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec1 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}
        >
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Pre-Analysis No
            </label>
            <input
              type="text"
              name="preAnalysisNo"
              data-field="preAnalysisNo"
              className="preana-input-greyed-out"
              value={data.preAnalysisNo}
              readOnly
              tabIndex={-1}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisNo')}
              placeholder="000/PREANA/MKT/IX/YYYY"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#cbd5e1',
                background: '#cbd5e1',
                color: '#1e293b',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Pre-Analysis Date
            </label>
            <input
              type="text"
              name="preAnalysisDate"
              data-field="preAnalysisDate"
              className="preana-input-greyed-out"
              value={data.preAnalysisDate}
              readOnly
              tabIndex={-1}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-preAnalysisDate')}
              placeholder="DD-Mmm-YY"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#cbd5e1',
                background: '#cbd5e1',
                color: '#1e293b',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            />
          </div>
          <div style={{gridColumn: 'span 2'}}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Customer / Project
            </label>
            <input
              type="text"
              name="customerProjectName"
              data-field="customerProjectName"
              className="preana-input-greyed-out"
              value={data.customerProjectName}
              readOnly
              tabIndex={-1}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-customerProjectName')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#cbd5e1',
                background: '#cbd5e1',
                color: '#1e293b',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Tax ID (NPWP)
            </label>
            <input
              type="text"
              name="taxId"
              data-field="taxId"
              className="preana-input-greyed-out"
              value={data.taxId}
              readOnly
              tabIndex={-1}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-taxId')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#cbd5e1',
                background: '#cbd5e1',
                color: '#1e293b',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              FAP No
            </label>
            <input
              type="text"
              name="fapNumber"
              data-field="fapNumber"
              className="preana-input-greyed-out"
              value={data.fapNumber}
              readOnly
              tabIndex={-1}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-fapNumber')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#cbd5e1',
                background: '#cbd5e1',
                color: '#1e293b',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Lead Source{reqMark('leadSource', 'General Information')}
            </label>
            <input
              type="text"
              name="leadSource"
              data-field="leadSource"
              value={data.leadSource}
              onChange={e => updateField('leadSource', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-leadSource')}
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Customer Area
            </label>
            <input
              type="text"
              name="customerArea"
              data-field="customerArea"
              className="preana-input-greyed-out"
              value={data.customerArea}
              readOnly
              tabIndex={-1}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-customerArea')}
              placeholder="City, Province"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#cbd5e1',
                background: '#cbd5e1',
                color: '#1e293b',
                cursor: 'not-allowed',
                fontWeight: 500,
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              Dealer PIC{reqMark('dealerPic', 'General Information')}
            </label>
            <input
              type="text"
              name="dealerPic"
              data-field="dealerPic"
              value={data.dealerPic}
              onChange={e => updateField('dealerPic', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-dealerPic')}
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              LMI PIC{reqMark('lmiPic', 'General Information')}
            </label>
            <input
              type="text"
              name="lmiPic"
              data-field="lmiPic"
              value={data.lmiPic}
              onChange={e => updateField('lmiPic', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-lmiPic')}
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              LFI PIC{reqMark('lfiPic', 'General Information')}
            </label>
            <input
              type="text"
              name="lfiPic"
              data-field="lfiPic"
              value={data.lfiPic}
              onChange={e => updateField('lfiPic', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-lfiPic')}
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              Customer PIC{reqMark('customerPic', 'General Information')}
            </label>
            <input
              type="text"
              name="customerPic"
              data-field="customerPic"
              value={data.customerPic}
              onChange={e => updateField('customerPic', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-customerPic')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
          <div style={{gridColumn: 'span 2'}}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              Equity
            </label>
            <input
              type="text"
              name="equity"
              data-field="equity"
              value={data.equity}
              onChange={e => updateField('equity', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-equity')}
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              Paid up Capital
            </label>
            <input
              type="text"
              name="paidUpCapital"
              data-field="paidUpCapital"
              value={data.paidUpCapital}
              onChange={e => updateField('paidUpCapital', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-paidUpCapital')}
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              Source of Repayment{reqMark('sourceOfRepayment', 'General Information')}
            </label>
            <input
              type="text"
              name="sourceOfRepayment"
              data-field="sourceOfRepayment"
              value={stripHtmlTags(data.sourceOfRepayment)}
              onChange={e => updateField('sourceOfRepayment', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-sourceOfRepayment')}
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
