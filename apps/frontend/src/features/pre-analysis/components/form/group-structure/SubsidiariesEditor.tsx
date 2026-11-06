/** Group structure builder: subsidiaries and their shareholders. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SubsidiariesEditor() {
  const {
    scrollToPreviewElement,
    currentGroupStructure,
    removeSubsidiary,
    updateSubsidiaryField,
    updateSubsidiaryShareholder,
    addSubsidiaryShareholder,
    removeSubsidiaryShareholder,
  } = usePreAnalysis();
  return (
    <div>
      <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '6px'}}>
        🔗 Subsidiaries ({currentGroupStructure.subsidiaries?.length || 0} Entities)
      </div>
      {(currentGroupStructure.subsidiaries || []).map((sub, subIdx) => (
        <div
          key={subIdx}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '4px',
              marginBottom: '6px',
            }}
          >
            <span style={{fontSize: '0.72rem', fontWeight: 700, color: '#0369a1'}}>
              Subsidiary #{subIdx + 1}: {sub.name ? sub.name.split('(')[0] : 'New Entity'}
            </span>
            <button
              type="button"
              onClick={() => removeSubsidiary(subIdx)}
              style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              Delete Entity
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <div>
              <label style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>Company Name</label>
              <input
                type="text"
                value={sub.name}
                onChange={e => updateSubsidiaryField(subIdx, 'name', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                placeholder="e.g. PT Subsidiary Company"
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div>
              <label style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>
                Authorized Capital
              </label>
              <input
                type="text"
                value={sub.authorizedCapital || ''}
                onChange={e => updateSubsidiaryField(subIdx, 'authorizedCapital', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                placeholder="Rp ..."
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div>
              <label style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>Paid-up Capital</label>
              <input
                type="text"
                value={sub.paidUpCapital || ''}
                onChange={e => updateSubsidiaryField(subIdx, 'paidUpCapital', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                placeholder="Rp ..."
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
          </div>
          <div style={{marginBottom: '6px'}}>
            <label style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>
              Management / Board
            </label>
            <input
              type="text"
              value={sub.management || ''}
              onChange={e => updateSubsidiaryField(subIdx, 'management', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="e.g. Direktur: Leonard Santosa | Komisaris: Hansen Santosa"
              style={{
                width: '100%',
                padding: '3px 6px',
                fontSize: '0.72rem',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>

          {/* Subsidiary Shareholders */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3px',
              }}
            >
              <span style={{fontSize: '0.65rem', fontWeight: 600, color: '#475569'}}>Shareholders</span>
              <button
                type="button"
                onClick={() => addSubsidiaryShareholder(subIdx)}
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: '2px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  cursor: 'pointer',
                }}
              >
                + Shareholder
              </button>
            </div>
            {(sub.shareholders || []).map((sh, sIdx) => (
              <div
                key={sIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1.2fr 0.6fr 1fr 1.3fr auto',
                  gap: '4px',
                  marginBottom: '3px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={sh.name}
                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'name', e.target.value)}
                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                  placeholder="Name / Entity"
                  title="Name"
                  style={{
                    padding: '2px 5px',
                    fontSize: '0.7rem',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <input
                  type="text"
                  value={sh.position || sh.role || ''}
                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'position', e.target.value)}
                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                  placeholder="Position (e.g. Director)"
                  title="Position"
                  style={{
                    padding: '2px 5px',
                    fontSize: '0.7rem',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <input
                  type="text"
                  value={sh.shareClass || '-'}
                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'shareClass', e.target.value)}
                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                  placeholder="Class"
                  title="Share Class"
                  style={{
                    padding: '2px 4px',
                    fontSize: '0.7rem',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                    textAlign: 'center',
                  }}
                />
                <input
                  type="text"
                  value={sh.numberOfShares || sh.percentage || ''}
                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'numberOfShares', e.target.value)}
                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                  placeholder="Shares"
                  title="Number of Shares"
                  style={{
                    padding: '2px 5px',
                    fontSize: '0.7rem',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                    textAlign: 'right',
                  }}
                />
                <input
                  type="text"
                  value={sh.total || ''}
                  onChange={e => updateSubsidiaryShareholder(subIdx, sIdx, 'total', e.target.value)}
                  onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
                  placeholder="Total (Rp)"
                  title="Total Amount"
                  style={{
                    padding: '2px 5px',
                    fontSize: '0.7rem',
                    borderRadius: '3px',
                    border: '1px solid #cbd5e1',
                    textAlign: 'right',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeSubsidiaryShareholder(subIdx, sIdx)}
                  style={{
                    padding: '1px 5px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
