/** Group structure builder: holding company and its shareholders. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function HoldingCompanyEditor() {
  const {
    scrollToPreviewElement,
    currentGroupStructure,
    updateHoldingField,
    updateHoldingShareholder,
    addHoldingShareholder,
    removeHoldingShareholder,
  } = usePreAnalysis();
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '4px',
          marginBottom: '8px',
        }}
      >
        <span style={{fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a'}}>
          🏢 Parent Entity (Holding Company)
        </span>
        <span
          style={{
            fontSize: '0.65rem',
            background: '#dbeafe',
            color: '#1e40af',
            padding: '1px 6px',
            borderRadius: '3px',
            fontWeight: 600,
          }}
        >
          Level 1 Parent
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <div>
          <label
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Holding Company Name
          </label>
          <input
            type="text"
            value={currentGroupStructure.holding?.name || ''}
            onChange={e => updateHoldingField('name', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
            placeholder="e.g. PT STAR (PT Sentosa Abadi Raja)"
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Authorized Capital
          </label>
          <input
            type="text"
            value={currentGroupStructure.holding?.authorizedCapital || ''}
            onChange={e => updateHoldingField('authorizedCapital', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
            placeholder="e.g. Rp 240 Miliar"
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Paid-up Capital
          </label>
          <input
            type="text"
            value={currentGroupStructure.holding?.paidUpCapital || ''}
            onChange={e => updateHoldingField('paidUpCapital', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
            placeholder="e.g. Rp 60 Miliar"
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
      <div style={{marginBottom: '8px'}}>
        <label
          style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: '#64748b',
            display: 'block',
            marginBottom: '2px',
          }}
        >
          Management / Board of Directors
        </label>
        <input
          type="text"
          value={currentGroupStructure.holding?.management || ''}
          onChange={e => updateHoldingField('management', e.target.value)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
          placeholder="e.g. Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa"
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>

      {/* Holding Shareholders */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span style={{fontSize: '0.68rem', fontWeight: 700, color: '#334155'}}>Parent Shareholders</span>
          <button
            type="button"
            onClick={addHoldingShareholder}
            style={{
              fontSize: '0.65rem',
              padding: '1px 6px',
              borderRadius: '3px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
            }}
          >
            + Add Shareholder
          </button>
        </div>
        {(currentGroupStructure.holding?.shareholders || []).map((sh, sIdx) => (
          <div
            key={sIdx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1.2fr 0.6fr 1fr 1.3fr auto',
              gap: '4px',
              marginBottom: '4px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={sh.name}
              onChange={e => updateHoldingShareholder(sIdx, 'name', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="Name (e.g. HANSEN SANTOSA)"
              title="Name"
              style={{
                padding: '3px 6px',
                fontSize: '0.72rem',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
              }}
            />
            <input
              type="text"
              value={sh.position || sh.role || ''}
              onChange={e => updateHoldingShareholder(sIdx, 'position', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="Position (e.g. President Director)"
              title="Position"
              style={{
                padding: '3px 6px',
                fontSize: '0.72rem',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
              }}
            />
            <input
              type="text"
              value={sh.shareClass || '-'}
              onChange={e => updateHoldingShareholder(sIdx, 'shareClass', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="Class"
              title="Share Class"
              style={{
                padding: '3px 4px',
                fontSize: '0.72rem',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
                textAlign: 'center',
              }}
            />
            <input
              type="text"
              value={sh.numberOfShares || sh.percentage || ''}
              onChange={e => updateHoldingShareholder(sIdx, 'numberOfShares', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="Shares (e.g. 324,000)"
              title="Number of Shares"
              style={{
                padding: '3px 6px',
                fontSize: '0.72rem',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
                textAlign: 'right',
              }}
            />
            <input
              type="text"
              value={sh.total || ''}
              onChange={e => updateHoldingShareholder(sIdx, 'total', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="Total (e.g. Rp. 32,400,000,000)"
              title="Total Amount"
              style={{
                padding: '3px 6px',
                fontSize: '0.72rem',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
                textAlign: 'right',
              }}
            />
            <button
              type="button"
              onClick={() => removeHoldingShareholder(sIdx)}
              style={{
                padding: '2px 6px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '0.68rem',
              }}
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
