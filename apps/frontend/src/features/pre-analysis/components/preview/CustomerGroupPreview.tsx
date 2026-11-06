/** Preview section 3: Customer & Group Background with the group structure diagram. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';

import {GroupStructureDiagram} from '@/features/pre-analysis/components/preview/GroupStructureDiagram';
export function CustomerGroupPreview() {
  const {data, handlePreviewCellClick} = usePreAnalysis();
  return (
    <>
      <div
        id="preana-preview-sec-3"
        onClick={() => handlePreviewCellClick('uboInfo', 'sec3')}
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
        3. CUSTOMER & GROUP BACKGROUND
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>
              UBO (Ultimate Beneficiary Owner)
            </td>
            <td
              id="preana-preview-cell-uboInfo"
              onClick={() => handlePreviewCellClick('uboInfo', 'sec3')}
              style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.uboInfo || data.ubo)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Company Background</td>
            <td
              id="preana-preview-cell-companyBackground"
              onClick={() => handlePreviewCellClick('companyBackground', 'sec3')}
              style={{
                padding: '4px 6px',
                whiteSpace: 'pre-line',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#1e3a8a',
              }}
            >
              {renderRichHtml(data.companyBackground)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>STAR Group – Key Milestones</td>
            <td
              id="preana-preview-cell-starGroupMilestonesNarrative"
              onClick={() => handlePreviewCellClick('starGroupMilestonesNarrative', 'sec3')}
              style={{
                padding: '4px 6px',
                whiteSpace: 'pre-line',
                cursor: 'pointer',
                background: '#f8fafc',
              }}
            >
              {renderRichHtml(data.starGroupMilestonesNarrative)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Business Development Background</td>
            <td
              id="preana-preview-cell-businessDevBackground"
              onClick={() => handlePreviewCellClick('businessDevBackground', 'sec3')}
              style={{
                padding: '4px 6px',
                whiteSpace: 'pre-line',
                cursor: 'pointer',
                background: '#fffbeb',
              }}
            >
              {renderRichHtml(data.businessDevBackground)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Other information :</td>
            <td
              id="preana-preview-cell-operationalTeamInfo"
              onClick={() => handlePreviewCellClick('operationalTeamInfo', 'sec3')}
              style={{padding: '4px 6px', whiteSpace: 'pre-line', cursor: 'pointer'}}
            >
              {renderRichHtml(data.operationalTeamInfo)}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td
              colSpan={2}
              id="preana-preview-cell-uboInformation"
              onClick={() => handlePreviewCellClick('uboInformation', 'sec3')}
              style={{width: '100%', padding: '8px 10px', cursor: 'pointer'}}
            >
              <div style={{fontWeight: 700, fontSize: '9pt', color: '#1e3a8a', marginBottom: '6px'}}>
                UBO Information (Group Shareholding Structure & Legal Profile)
              </div>
              {data.uboInformation && (
                <div style={{fontSize: '8.5pt', color: '#1e293b', marginBottom: '10px', lineHeight: 1.4}}>
                  {renderRichHtml(data.uboInformation)}
                </div>
              )}

              {/* Corporate Group Structure Diagram matching Image 3 with full Shareholding Tables */}
              <GroupStructureDiagram />
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Company Milestones</td>
            <td
              id="preana-preview-cell-unitComposition"
              onClick={() => handlePreviewCellClick('unitComposition', 'sec4')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th
                      style={{
                        width: '20%',
                        padding: '3px 6px',
                        textAlign: 'left',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      Year
                    </th>
                    <th style={{padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1'}}>
                      Milestone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.milestones || []).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '3px 6px', border: '1px solid #e2e8f0', fontWeight: 600}}>
                        {m.year}
                      </td>
                      <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>
                        {m.milestone || m.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Existing Finco Backup</td>
            <td
              id="preana-preview-cell-existingFincoBackup"
              onClick={() => handlePreviewCellClick('existingFincoBackup', 'sec3')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.existingFincoBackup}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
