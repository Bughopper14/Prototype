/** Form section 4: Equipment Possibility of Success. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {ChevronDown, Trash2} from 'lucide-react';

export function EquipmentSection() {
  const {data, openSections, toggleSection, scrollToPreviewElement, updateField, totalUnits} =
    usePreAnalysis();
  return (
    <div
      id="acc-sec4"
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
        onClick={() => toggleSection('sec4')}
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: openSections.sec4 ? '1px solid #e2e8f0' : 'none',
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
            04
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>
            4. EQUIPMENT POSSIBILITY OF SUCCESS
          </span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec4 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec4 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
        >
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                Equipment-to-Job Fit
              </label>
              <input
                type="text"
                name="equipmentJobFit"
                data-field="equipmentJobFit"
                value={data.equipmentJobFit}
                onChange={e => updateField('equipmentJobFit', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-equipmentJobFit')}
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
                Utilization vs Project Duration
              </label>
              <input
                type="text"
                name="utilizationDuration"
                data-field="utilizationDuration"
                value={data.utilizationDuration}
                onChange={e => updateField('utilizationDuration', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-utilizationDuration')}
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

          {/* Current Unit Composition Table */}
          <div>
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

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                Prior LiuGong Experience
              </label>
              <input
                type="text"
                name="priorLiugongExperience"
                data-field="priorLiugongExperience"
                value={data.priorLiugongExperience}
                onChange={e => updateField('priorLiugongExperience', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-priorLiugongExperience')}
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
                Have Service Agreement / FMC
              </label>
              <input
                type="text"
                name="serviceAgreementFmc"
                data-field="serviceAgreementFmc"
                value={data.serviceAgreementFmc}
                onChange={e => updateField('serviceAgreementFmc', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-serviceAgreementFmc')}
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
        </div>
      )}
    </div>
  );
}
