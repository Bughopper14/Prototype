/** Preview: competition information table. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {DEFAULT_COMPETITION_TABLE} from '@/features/pre-analysis/lib/defaults';

export function CompetitionPreview() {
  const {data, handlePreviewCellClick} = usePreAnalysis();
  return (
    <div
      id="preana-preview-cell-competitionTable"
      onClick={() => handlePreviewCellClick('competitionTable', 'sec7')}
      style={{marginTop: '14px', marginBottom: '16px', cursor: 'pointer'}}
    >
      <div style={{fontWeight: 700, fontSize: '9pt', marginBottom: '4px'}}>Competition Information</div>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '8pt'}}>
        <thead>
          <tr style={{background: '#f1f5f9'}}>
            <th style={{padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1'}}>Finco</th>
            <th
              style={{
                width: '25%',
                padding: '3px 6px',
                textAlign: 'left',
                border: '1px solid #cbd5e1',
              }}
            >
              Rate (effective)
            </th>
            <th
              style={{
                width: '25%',
                padding: '3px 6px',
                textAlign: 'left',
                border: '1px solid #cbd5e1',
              }}
            >
              Purpose
            </th>
          </tr>
        </thead>
        <tbody>
          {(data.competitionTable || DEFAULT_COMPETITION_TABLE).map((c, idx) => (
            <tr key={idx}>
              <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>{c.finco}</td>
              <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>{c.rate}</td>
              <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>{c.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
