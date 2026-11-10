/** Section 1 of the document: general information table. */
import {stripHtmlTags} from '@/features/pre-analysis/lib/text';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function GeneralInfoPreview() {
  const {handlePreviewCellClick, data} = usePreAnalysisContext();
  return (
    <table
      id="preana-preview-sec-1"
      style={{width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '16px'}}
    >
      <tbody>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Customer / Project</td>
          <td
            id="preana-preview-cell-customerProjectName"
            onClick={() => handlePreviewCellClick('customerProjectName', 'sec1')}
            style={{
              width: '74%',
              padding: '4px 6px',
              fontWeight: 700,
              color: '#1b365d',
              cursor: 'pointer',
            }}
          >
            {data.customerProjectName}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Tax ID (NPWP)</td>
          <td
            id="preana-preview-cell-taxId"
            onClick={() => handlePreviewCellClick('taxId', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.taxId}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>FAP No</td>
          <td
            id="preana-preview-cell-fapNumber"
            onClick={() => handlePreviewCellClick('fapNumber', 'sec1')}
            style={{
              width: '74%',
              padding: '4px 6px',
              cursor: 'pointer',
              color: data.fapNumber?.includes('Auto') ? '#64748b' : '#000000',
              fontStyle: data.fapNumber?.includes('Auto') ? 'italic' : 'normal',
            }}
          >
            {data.fapNumber || 'Auto (Generated on save)'}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Lead Source</td>
          <td
            id="preana-preview-cell-leadSource"
            onClick={() => handlePreviewCellClick('leadSource', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.leadSource}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Customer Area</td>
          <td
            id="preana-preview-cell-customerArea"
            onClick={() => handlePreviewCellClick('customerArea', 'sec1')}
            style={{width: '74%', padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer'}}
          >
            {data.customerArea}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Dealer PIC</td>
          <td
            id="preana-preview-cell-dealerPic"
            onClick={() => handlePreviewCellClick('dealerPic', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.dealerPic}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>LMI PIC</td>
          <td
            id="preana-preview-cell-lmiPic"
            onClick={() => handlePreviewCellClick('lmiPic', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.lmiPic}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>LFI PIC</td>
          <td
            id="preana-preview-cell-lfiPic"
            onClick={() => handlePreviewCellClick('lfiPic', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.lfiPic}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Customer PIC</td>
          <td
            id="preana-preview-cell-customerPic"
            onClick={() => handlePreviewCellClick('customerPic', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.customerPic}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Pre-Analysis Date</td>
          <td
            id="preana-preview-cell-preAnalysisDate"
            onClick={() => handlePreviewCellClick('preAnalysisDate', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.preAnalysisDate}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Equity</td>
          <td
            id="preana-preview-cell-equity"
            onClick={() => handlePreviewCellClick('equity', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.equity}
          </td>
        </tr>
        <tr style={{borderBottom: '1px solid #e2e8f0'}}>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Paid up Capital</td>
          <td
            id="preana-preview-cell-paidUpCapital"
            onClick={() => handlePreviewCellClick('paidUpCapital', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {data.paidUpCapital}
          </td>
        </tr>
        <tr>
          <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Source of Repayment</td>
          <td
            id="preana-preview-cell-sourceOfRepayment"
            onClick={() => handlePreviewCellClick('sourceOfRepayment', 'sec1')}
            style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
          >
            {stripHtmlTags(data.sourceOfRepayment)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
