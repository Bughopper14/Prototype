/** Editable competition information table. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {DEFAULT_COMPETITION_TABLE} from '@/features/pre-analysis/lib/defaults';
import {Trash2} from 'lucide-react';

export function CompetitionTableEditor() {
  const {data, updateField} = usePreAnalysis();
  return (
    <div style={{marginTop: '8px'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
          Competition Information
        </label>
        <button
          type="button"
          onClick={() => {
            const next = [...(data.competitionTable || []), {finco: '', rate: '', purpose: ''}];
            updateField('competitionTable', next);
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
          + Add Finco
        </button>
      </div>
      <div style={{border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
          <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
            <tr>
              <th style={{padding: '6px 8px', textAlign: 'left'}}>Finco</th>
              <th style={{width: '28%', padding: '6px 8px', textAlign: 'left'}}>Rate (effective)</th>
              <th style={{width: '25%', padding: '6px 8px', textAlign: 'left'}}>Purpose</th>
              <th style={{width: '36px', padding: '6px 8px'}}></th>
            </tr>
          </thead>
          <tbody>
            {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
              <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                <td style={{padding: '4px 6px'}}>
                  <input
                    type="text"
                    value={c.finco || ''}
                    onChange={e => {
                      const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                      copy[idx] = {...copy[idx], finco: e.target.value};
                      updateField('competitionTable', copy);
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
                    value={c.rate || ''}
                    onChange={e => {
                      const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                      copy[idx] = {...copy[idx], rate: e.target.value};
                      updateField('competitionTable', copy);
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
                    value={c.purpose || ''}
                    onChange={e => {
                      const copy = [...(data.competitionTable || DEFAULT_COMPETITION_TABLE)];
                      copy[idx] = {...copy[idx], purpose: e.target.value};
                      updateField('competitionTable', copy);
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
                <td style={{padding: '4px 6px', textAlign: 'center'}}>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (data.competitionTable || DEFAULT_COMPETITION_TABLE).filter(
                        (_, i) => i !== idx,
                      );
                      updateField('competitionTable', copy);
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
        </table>
      </div>
    </div>
  );
}
