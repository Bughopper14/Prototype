/** Section 2 of the document: project information. */
import {
  renderProjectGroupListPreview,
  renderInvestmentPlanPreview,
} from '@/features/pre-analysis/components/preview/ProjectListPreview';
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';
import {PreviewSectionTitle} from '@/features/pre-analysis/components/preview/PreviewSectionTitle';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function ProjectInfoPreview() {
  const {handlePreviewCellClick, data} = usePreAnalysisContext();
  return (
    <>
      <PreviewSectionTitle n={2} field="projectNameLocation">
        2. PROJECT INFORMATION
      </PreviewSectionTitle>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Project Name</td>
            <td
              id="preana-preview-cell-projectName"
              onClick={() => handlePreviewCellClick('projectName', 'sec2')}
              style={{width: '74%', padding: '4px 6px', fontWeight: 600, cursor: 'pointer'}}
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
            <td style={{padding: '4px 6px', fontWeight: 700}}>Current Project</td>
            <td
              id="preana-preview-cell-currentProjects"
              onClick={() => handlePreviewCellClick('currentProjects', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderProjectGroupListPreview(data.currentProjects, 'PT Handalan Putramas Santosa (HPS)')}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>History Project</td>
            <td
              id="preana-preview-cell-historyProjects"
              onClick={() => handlePreviewCellClick('historyProjects', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderProjectGroupListPreview(data.historyProjects, 'PT Pangan Sejahtera Santosa (PASS)')}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Investment Project Plan</td>
            <td
              id="preana-preview-cell-investmentProjectPlans"
              onClick={() => handlePreviewCellClick('investmentProjectPlans', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderProjectGroupListPreview(data.investmentProjectPlans, 'PT Harta Putramas Santosa (HTPS)')}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Role of Customer</td>
            <td
              id="preana-preview-cell-customerRole"
              onClick={() => handlePreviewCellClick('customerRole', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.customerRole)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Other Contractor work in the same bowheer</td>
            <td
              id="preana-preview-cell-otherContractors"
              onClick={() => handlePreviewCellClick('otherContractors', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.otherContractors)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Project Owner</td>
            <td
              id="preana-preview-cell-projectOwner"
              onClick={() => handlePreviewCellClick('projectOwner', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.projectOwner)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Bowheer Information</td>
            <td
              id="preana-preview-cell-bowheerInfo"
              onClick={() => handlePreviewCellClick('bowheerInfo', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
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
              <span style={{fontWeight: 600}}>{data.projectStatus || 'Ongoing'}</span>
              {data.projectStatusRemarks ? ` - ${data.projectStatusRemarks}` : ''}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Investment Plan</td>
            <td
              id="preana-preview-cell-investmentPlan"
              onClick={() => handlePreviewCellClick('investmentPlan', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderInvestmentPlanPreview(data)}
            </td>
          </tr>
          <tr>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Financing Scheme Requested</td>
            <td
              id="preana-preview-cell-financingSchemeRequested"
              onClick={() => handlePreviewCellClick('financingSchemeRequested', 'sec2')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.financingSchemeRequested)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
