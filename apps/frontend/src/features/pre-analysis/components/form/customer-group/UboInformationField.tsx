/** UBO information: group shareholding structure and legal profile, with the optional group structure graph. */
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function UboInformationField() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* UBO Information with YES/NO Toggle */}
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px',
          background: data.showUboInformation !== false ? '#ffffff' : '#f8fafc',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: data.showUboInformation !== false ? '10px' : '0',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a', margin: 0}}>
              UBO Information (Group Shareholding Structure & Legal Profile)
            </label>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#475569',
                background: '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              Optional Section
            </span>
          </div>

          {/* Toggle YES / NO */}
          <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
            <span style={{fontSize: '0.72rem', fontWeight: 600, color: '#475569'}}>
              Include UBO Information?
            </span>
            <div
              style={{
                display: 'inline-flex',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                background: '#e2e8f0',
              }}
            >
              <button
                type="button"
                id="btn-toggle-ubo-yes"
                onClick={() => {
                  updateField('showUboInformation', true);
                  scrollToPreviewElement('preana-preview-cell-uboInformation');
                }}
                style={{
                  padding: '3px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: data.showUboInformation !== false ? '#16a34a' : 'transparent',
                  color: data.showUboInformation !== false ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                ✓ YES
              </button>
              <button
                type="button"
                id="btn-toggle-ubo-no"
                onClick={() => {
                  updateField('showUboInformation', false);
                }}
                style={{
                  padding: '3px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: data.showUboInformation === false ? '#dc2626' : 'transparent',
                  color: data.showUboInformation === false ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                ✕ NO
              </button>
            </div>
          </div>
        </div>

        {/* If YES: Unified UBO Rich Editor with direct Image & Narrative support */}
        {data.showUboInformation !== false && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingTop: '6px',
              borderTop: '1px dashed #cbd5e1',
            }}
          >
            <PreAnalysisRichEditor
              value={data.uboInformation || ''}
              onChange={val => updateField('uboInformation', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              height={260}
              dataField="uboInformation"
            />
          </div>
        )}
      </div>
    </>
  );
}
