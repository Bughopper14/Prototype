/** Preview section 2: Project Information. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';

export function ProjectInfoPreview() {
  const {data, handlePreviewCellClick} = usePreAnalysis();
  return (
    <>
      <div
        id="preana-preview-sec-2"
        onClick={() => handlePreviewCellClick('projectNameLocation', 'sec2')}
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
        2. PROJECT INFORMATION
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Holding Group / Main Company</td>
            <td
              id="preana-preview-cell-holdingGroup"
              onClick={() => handlePreviewCellClick('holdingGroup', 'sec2')}
              style={{
                width: '74%',
                padding: '4px 6px',
                fontWeight: 700,
                color: '#1e3a8a',
                cursor: 'pointer',
              }}
            >
              {data.holdingGroup || '-'}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Project Name</td>
            <td
              id="preana-preview-cell-projectName"
              onClick={() => handlePreviewCellClick('projectName', 'sec2')}
              style={{padding: '4px 6px', fontWeight: 600, cursor: 'pointer'}}
            >
              {data.projectName || '-'}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Project Location</td>
            <td
              id="preana-preview-cell-projectLocation"
              onClick={() => handlePreviewCellClick('projectLocation', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.projectLocation || '-'}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Existing Projects</td>
            <td
              id="preana-preview-cell-existingProjects"
              onClick={() => handlePreviewCellClick('existingProjects', 'sec2')}
              style={{
                padding: '4px 6px',
                whiteSpace: 'pre-line',
                cursor: 'pointer',
                background: '#f8fafc',
              }}
            >
              {renderRichHtml(data.existingProjects)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>New Projects</td>
            <td
              id="preana-preview-cell-newProjects"
              onClick={() => handlePreviewCellClick('newProjects', 'sec2')}
              style={{
                padding: '4px 6px',
                whiteSpace: 'pre-line',
                cursor: 'pointer',
                background: '#fffbeb',
              }}
            >
              {renderRichHtml(data.newProjects)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Role of Customer</td>
            <td
              id="preana-preview-cell-customerRole"
              onClick={() => handlePreviewCellClick('customerRole', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.customerRole}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Other Contractor work in the same bowheer</td>
            <td
              id="preana-preview-cell-otherContractors"
              onClick={() => handlePreviewCellClick('otherContractors', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.otherContractors}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Project Owner</td>
            <td
              id="preana-preview-cell-projectOwner"
              onClick={() => handlePreviewCellClick('projectOwner', 'sec2')}
              style={{padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer'}}
            >
              {data.projectOwner}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Bowheer Information</td>
            <td
              id="preana-preview-cell-bowheerInfo"
              onClick={() => handlePreviewCellClick('bowheerInfo', 'sec2')}
              style={{padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer'}}
            >
              {renderRichHtml(data.bowheerInfo)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Project Status</td>
            <td
              id="preana-preview-cell-projectStatus"
              onClick={() => handlePreviewCellClick('projectStatus', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.projectStatus}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Investment Plan</td>
            <td
              id="preana-preview-cell-investmentPlan"
              onClick={() => handlePreviewCellClick('investmentPlan', 'sec2')}
              style={{padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer'}}
            >
              {renderRichHtml(data.investmentPlan)}
            </td>
          </tr>
          <tr>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Financing Scheme Requested</td>
            <td
              id="preana-preview-cell-financingSchemeRequested"
              onClick={() => handlePreviewCellClick('financingSchemeRequested', 'sec2')}
              style={{padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer'}}
            >
              {data.financingSchemeRequested}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
