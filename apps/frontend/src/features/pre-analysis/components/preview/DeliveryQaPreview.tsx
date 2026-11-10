/** Section 5 of the document: unit delivery status and QA check. */
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';
import {PreviewSectionTitle} from '@/features/pre-analysis/components/preview/PreviewSectionTitle';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function DeliveryQaPreview() {
  const {handlePreviewCellClick, data} = usePreAnalysisContext();
  return (
    <>
      <PreviewSectionTitle n={5} field="deliveryStatus">
        5. UNIT DELIVERY STATUS & QA CHECK
      </PreviewSectionTitle>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Delivery Status</td>
            <td
              id="preana-preview-cell-deliveryStatus"
              onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')}
              style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.deliveryStatus}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Delivery Date</td>
            <td
              id="preana-preview-cell-deliveryDate"
              onClick={() => handlePreviewCellClick('deliveryDate', 'sec5')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.deliveryDate)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>QA Comment — iLink/GPS Performance Check</td>
            <td
              id="preana-preview-cell-qaIlinkComment"
              onClick={() => handlePreviewCellClick('qaIlinkComment', 'sec5')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              <span style={{fontWeight: 600, color: '#0f172a'}}>
                {data.qaDocumentName || data.qaIlinkComment || '-'}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{padding: '4px 6px', fontWeight: 700}}>QA Conclusion</td>
            <td
              id="preana-preview-cell-qaConclusion"
              onClick={() => handlePreviewCellClick('qaConclusion', 'sec5')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.qaConclusion)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
