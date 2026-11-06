/** Preview section 7: Expert Judgement Conclusion. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';

export function ExpertJudgementPreview() {
  const {data, handlePreviewCellClick} = usePreAnalysis();
  return (
    <>
      <div
        id="preana-preview-sec-7"
        onClick={() => handlePreviewCellClick('recommendation', 'sec7')}
        style={{
          background: '#1b365d',
          color: '#ffffff',
          padding: '6px 10px',
          fontWeight: 700,
          fontSize: '10.5pt',
          marginTop: '16px',
          marginBottom: '8px',
          cursor: 'pointer',
        }}
      >
        7. EXPERT JUDGEMENT CONCLUSION
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '12px'}}>
        <thead>
          <tr style={{background: '#f1f5f9'}}>
            <th
              style={{
                width: '30%',
                padding: '4px 6px',
                textAlign: 'left',
                border: '1px solid #cbd5e1',
              }}
            >
              Aspect
            </th>
            <th
              style={{
                width: '20%',
                padding: '4px 6px',
                textAlign: 'center',
                border: '1px solid #cbd5e1',
              }}
            >
              Assessment
            </th>
            <th style={{padding: '4px 6px', textAlign: 'left', border: '1px solid #cbd5e1'}}>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr
            id="preana-preview-cell-goodProject"
            onClick={() => handlePreviewCellClick('goodProjectNote', 'sec7')}
            style={{cursor: 'pointer'}}
          >
            <td style={{padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700}}>Good Project?</td>
            <td
              style={{
                padding: '4px 6px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                fontWeight: 700,
                color: data.goodProject ? '#16a34a' : '#dc2626',
              }}
            >
              {data.goodProject ? 'Yes' : 'No'}
            </td>
            <td style={{padding: '4px 6px', border: '1px solid #e2e8f0'}}>{data.goodProjectNote}</td>
          </tr>
          <tr
            id="preana-preview-cell-goodCustomer"
            onClick={() => handlePreviewCellClick('goodCustomerNote', 'sec7')}
            style={{cursor: 'pointer'}}
          >
            <td style={{padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700}}>Good Customer?</td>
            <td
              style={{
                padding: '4px 6px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                fontWeight: 700,
                color: data.goodCustomer ? '#16a34a' : '#dc2626',
              }}
            >
              {data.goodCustomer ? 'Yes' : 'No'}
            </td>
            <td style={{padding: '4px 6px', border: '1px solid #e2e8f0'}}>{data.goodCustomerNote}</td>
          </tr>
        </tbody>
      </table>

      <div
        id="preana-preview-cell-briefNote"
        onClick={() => handlePreviewCellClick('briefNote', 'sec7')}
        style={{marginBottom: '10px', fontSize: '9pt', cursor: 'pointer'}}
      >
        <span style={{fontWeight: 700}}>Brief Note:</span>
        <div style={{whiteSpace: 'pre-line', marginTop: '2px', color: '#1e293b'}}>
          {renderRichHtml(data.briefNote)}
        </div>
      </div>
    </>
  );
}
