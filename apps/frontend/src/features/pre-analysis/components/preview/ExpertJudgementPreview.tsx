/** Section 7 of the document: assessment table and brief note. */
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';
import {PreviewSectionTitle} from '@/features/pre-analysis/components/preview/PreviewSectionTitle';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function ExpertJudgementPreview() {
  const {handlePreviewCellClick, data} = usePreAnalysisContext();
  return (
    <>
      <PreviewSectionTitle n={7} field="recommendation">
        7. PRELIMENARY ASSESSMENT
      </PreviewSectionTitle>
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
        style={{marginBottom: '14px', fontSize: '8.5pt', cursor: 'pointer'}}
      >
        <span style={{fontWeight: 700}}>Brief Note:</span>
        <div className="preana-brief-note-content" style={{marginTop: '4px', color: '#1e293b'}}>
          {renderRichHtml(data.briefNote)}
        </div>
      </div>
    </>
  );
}
