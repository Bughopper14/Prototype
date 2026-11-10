/** Current unit composition table. */
import {Trash2} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function UnitCompositionField() {
  const {totalUnits, data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* Current Unit Composition Table */}
      <div id="preana-form-unitComposition" data-field="unitComposition" tabIndex={-1}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
            Current Unit Composition (Total: {totalUnits} units)
          </label>
          <button
            type="button"
            onClick={() => {
              const next = [...(data.unitComposition || []), {kategoriAset: '', brand: '', qty: 0}];
              updateField('unitComposition', next);
            }}
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
            }}
          >
            + Add Unit
          </button>
        </div>
        <div style={{border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
            <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
              <tr>
                <th style={{padding: '6px 8px', textAlign: 'left'}}>Asset Category</th>
                <th style={{width: '25%', padding: '6px 8px', textAlign: 'left'}}>Brand</th>
                <th style={{width: '18%', padding: '6px 8px', textAlign: 'right'}}>Qty</th>
                <th style={{width: '40px', padding: '6px 8px'}}></th>
              </tr>
            </thead>
            <tbody>
              {(data.unitComposition || []).map((u, idx) => (
                <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                  <td style={{padding: '4px 6px'}}>
                    <input
                      type="text"
                      value={u.kategoriAset || ''}
                      onChange={e => {
                        const copy = [...data.unitComposition];
                        copy[idx] = {...copy[idx], kategoriAset: e.target.value};
                        updateField('unitComposition', copy);
                      }}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-unitComposition')}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '3px',
                      }}
                    />
                  </td>
                  <td style={{padding: '4px 6px'}}>
                    <input
                      type="text"
                      value={u.brand || ''}
                      onChange={e => {
                        const copy = [...data.unitComposition];
                        copy[idx] = {...copy[idx], brand: e.target.value};
                        updateField('unitComposition', copy);
                      }}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-unitComposition')}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '3px',
                      }}
                    />
                  </td>
                  <td style={{padding: '4px 6px', textAlign: 'right'}}>
                    <input
                      type="number"
                      value={u.qty || 0}
                      onChange={e => {
                        const copy = [...data.unitComposition];
                        copy[idx] = {...copy[idx], qty: Number(e.target.value) || 0};
                        updateField('unitComposition', copy);
                      }}
                      onFocus={() => scrollToPreviewElement('preana-preview-cell-unitComposition')}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '0.75rem',
                        textAlign: 'right',
                        border: '1px solid #cbd5e1',
                        borderRadius: '3px',
                      }}
                    />
                  </td>
                  <td style={{padding: '4px 6px', textAlign: 'center'}}>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = data.unitComposition.filter((_, i) => i !== idx);
                        updateField('unitComposition', copy);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontWeight: 700}}>
              <tr>
                <td colSpan={2} style={{padding: '6px 8px'}}>
                  TOTAL
                </td>
                <td style={{padding: '6px 8px', textAlign: 'right'}}>{totalUnits}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
