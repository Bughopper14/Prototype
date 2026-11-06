/** Preview: propose / review / approve sign-off footer. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignOffPreview() {
  const {data, handlePreviewCellClick} = usePreAnalysis();
  return (
    <div style={{marginTop: '36px', marginBottom: '28px'}}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '9pt',
          border: '1.5px solid #000000',
          background: '#ffffff',
        }}
      >
        <thead>
          <tr style={{background: '#f8fafc', borderBottom: '1.5px solid #000000'}}>
            <th
              style={{
                width: '33.33%',
                padding: '8px 10px',
                textAlign: 'left',
                fontWeight: 700,
                fontSize: '9pt',
                color: '#000000',
                borderRight: '1.5px solid #000000',
              }}
            >
              Propose by :
            </th>
            <th
              style={{
                width: '33.33%',
                padding: '8px 10px',
                textAlign: 'left',
                fontWeight: 700,
                fontSize: '9pt',
                color: '#000000',
                borderRight: '1.5px solid #000000',
              }}
            >
              Reviewed by :
            </th>
            <th
              style={{
                width: '33.34%',
                padding: '8px 10px',
                textAlign: 'left',
                fontWeight: 700,
                fontSize: '9pt',
                color: '#000000',
              }}
            >
              Approved by :
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Generous signature clearance - 95px height */}
          <tr style={{height: '95px'}}>
            <td
              id="preana-preview-cell-sign-propose"
              onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
              style={{
                padding: '10px',
                verticalAlign: 'bottom',
                borderRight: '1.5px solid #000000',
                cursor: 'pointer',
                height: '95px',
              }}
            >
              <div
                style={{
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  fontSize: '7.5pt',
                }}
              >
                ( Tanda Tangan / Stempel )
              </div>
            </td>
            <td
              id="preana-preview-cell-sign-review"
              onClick={() => handlePreviewCellClick('reviewedBy', 'sec7')}
              style={{
                padding: '10px',
                verticalAlign: 'bottom',
                borderRight: '1.5px solid #000000',
                cursor: 'pointer',
                height: '95px',
              }}
            >
              <div
                style={{
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  fontSize: '7.5pt',
                }}
              >
                ( Tanda Tangan / Stempel )
              </div>
            </td>
            <td
              id="preana-preview-cell-sign-approve"
              onClick={() => handlePreviewCellClick('approvedBy', 'sec7')}
              style={{padding: '10px', verticalAlign: 'bottom', cursor: 'pointer', height: '95px'}}
            >
              <div
                style={{
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  fontSize: '7.5pt',
                }}
              >
                ( Tanda Tangan / Stempel )
              </div>
            </td>
          </tr>
          {/* Signatory Names & Positions */}
          <tr style={{borderTop: '1px solid #000000'}}>
            <td
              id="preana-preview-cell-proposedBy"
              onClick={() => handlePreviewCellClick('proposedBy', 'sec7')}
              style={{
                padding: '8px 10px',
                verticalAlign: 'top',
                borderRight: '1.5px solid #000000',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '9pt',
                  color: '#000000',
                  textDecoration: 'underline',
                }}
              >
                {(data.proposedBy || '').split('\n')[0] || data.proposedBy || '-'}
              </div>
              <div
                style={{
                  fontSize: '8pt',
                  color: '#1e293b',
                  marginTop: '2px',
                  whiteSpace: 'pre-line',
                }}
              >
                {(data.proposedBy || '').split('\n').slice(1).join('\n')}
              </div>
              <div style={{fontSize: '7pt', color: '#64748b', marginTop: '6px'}}>
                Date: ____ / ____ / 2026
              </div>
            </td>
            <td
              id="preana-preview-cell-reviewedBy"
              onClick={() => handlePreviewCellClick('reviewedBy', 'sec7')}
              style={{
                padding: '8px 10px',
                verticalAlign: 'top',
                borderRight: '1.5px solid #000000',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '9pt',
                  color: '#000000',
                  textDecoration: 'underline',
                }}
              >
                {(data.reviewedBy || '').split('\n')[0] || data.reviewedBy || '-'}
              </div>
              <div
                style={{
                  fontSize: '8pt',
                  color: '#1e293b',
                  marginTop: '2px',
                  whiteSpace: 'pre-line',
                }}
              >
                {(data.reviewedBy || '').split('\n').slice(1).join('\n')}
              </div>
              <div style={{fontSize: '7pt', color: '#64748b', marginTop: '6px'}}>
                Date: ____ / ____ / 2026
              </div>
            </td>
            <td
              id="preana-preview-cell-approvedBy"
              onClick={() => handlePreviewCellClick('approvedBy', 'sec7')}
              style={{padding: '8px 10px', verticalAlign: 'top', cursor: 'pointer'}}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '9pt',
                  color: '#000000',
                  textDecoration: 'underline',
                }}
              >
                {(data.approvedBy || '').split('\n')[0] || data.approvedBy || '-'}
              </div>
              <div
                style={{
                  fontSize: '8pt',
                  color: '#1e293b',
                  marginTop: '2px',
                  whiteSpace: 'pre-line',
                }}
              >
                {(data.approvedBy || '').split('\n').slice(1).join('\n')}
              </div>
              <div style={{fontSize: '7pt', color: '#64748b', marginTop: '6px'}}>
                Date: ____ / ____ / 2026
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
