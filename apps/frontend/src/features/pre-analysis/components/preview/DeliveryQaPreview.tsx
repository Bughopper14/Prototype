/** Preview section 5: Unit Delivery Status & QA Check. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function DeliveryQaPreview() {
  const {data, handlePreviewCellClick} = usePreAnalysis();
  return (
    <>
      <div
        id="preana-preview-sec-5"
        onClick={() => handlePreviewCellClick('deliveryStatus', 'sec5')}
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
        5. UNIT DELIVERY STATUS & QA CHECK
      </div>
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
              {data.deliveryDate}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>QA Comment — iLink/GPS Performance Check</td>
            <td
              id="preana-preview-cell-qaIlinkComment"
              onClick={() => handlePreviewCellClick('qaIlinkComment', 'sec5')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.qaIlinkComment}
            </td>
          </tr>
          <tr>
            <td style={{padding: '4px 6px', fontWeight: 700}}>QA Conclusion</td>
            <td
              id="preana-preview-cell-qaConclusion"
              onClick={() => handlePreviewCellClick('qaConclusion', 'sec5')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.qaConclusion}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
