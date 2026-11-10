/** Company milestones. */
import {Trash2} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function MilestonesField() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <div id="preana-form-milestones" data-field="milestones" tabIndex={-1}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Company Milestones</label>
        <button
          type="button"
          onClick={() => {
            const next = [...(data.milestones || []), {year: '', milestone: ''}];
            updateField('milestones', next);
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
          + Add Milestone
        </button>
      </div>
      <div style={{border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
          <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
            <tr>
              <th style={{width: '18%', padding: '6px 8px', textAlign: 'left'}}>Year</th>
              <th style={{padding: '6px 8px', textAlign: 'left'}}>Milestone</th>
              <th style={{width: '40px', padding: '6px 8px'}}></th>
            </tr>
          </thead>
          <tbody>
            {(data.milestones || []).map((m, idx) => (
              <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                <td style={{padding: '4px 6px', verticalAlign: 'middle'}}>
                  <input
                    type="text"
                    value={m.year || ''}
                    onChange={e => {
                      const copy = [...data.milestones];
                      copy[idx] = {...copy[idx], year: e.target.value};
                      updateField('milestones', copy);
                    }}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-milestones')}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </td>
                <td style={{padding: '4px 6px', verticalAlign: 'middle'}}>
                  <input
                    type="text"
                    value={m.milestone || m.description || ''}
                    onChange={e => {
                      const copy = [...data.milestones];
                      copy[idx] = {...copy[idx], milestone: e.target.value};
                      updateField('milestones', copy);
                    }}
                    onFocus={() => scrollToPreviewElement('preana-preview-cell-milestones')}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </td>
                <td style={{padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle'}}>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = data.milestones.filter((_, i) => i !== idx);
                      updateField('milestones', copy);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
