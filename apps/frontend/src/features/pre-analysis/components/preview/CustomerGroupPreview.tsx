/** Section 3 of the document: customer and group background. */
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';
import {PreviewSectionTitle} from '@/features/pre-analysis/components/preview/PreviewSectionTitle';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function CustomerGroupPreview() {
  const {handlePreviewCellClick, data} = usePreAnalysisContext();
  return (
    <>
      <PreviewSectionTitle n={3} field="uboInfo">
        3. CUSTOMER & GROUP BACKGROUND
      </PreviewSectionTitle>
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
            <td style={{padding: '4px 6px', fontWeight: 700, verticalAlign: 'top'}}>Company Background</td>
            <td
              id="preana-preview-cell-companyBackground"
              onClick={() => handlePreviewCellClick('companyBackground', 'sec3')}
              style={{
                padding: '4px 6px',
                whiteSpace: 'pre-line',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              {renderRichHtml(data.companyBackground)}
            </td>
          </tr>
          {data.showUboInformation !== false && (
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
                  <div
                    style={{
                      fontSize: '8.5pt',
                      color: '#1e293b',
                      marginBottom: '10px',
                      lineHeight: 1.4,
                    }}
                  >
                    {renderRichHtml(data.uboInformation)}
                  </div>
                )}

                {/* Manual Uploaded Group Shareholding Structure Graph (Optional) */}
                {Boolean(data.groupStructureImage) && (
                  <div
                    id="preana-preview-cell-groupStructureImage"
                    onClick={e => {
                      e.stopPropagation();
                      handlePreviewCellClick('groupStructureImage', 'sec3');
                    }}
                    style={{
                      marginTop: '10px',
                      marginBottom: '6px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '7.5pt',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '6px',
                        textAlign: 'left',
                      }}
                    >
                      Group Shareholding Structure Chart:
                    </div>
                    <img
                      src={data.groupStructureImage}
                      alt="Group Shareholding Structure Chart"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '440px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        display: 'inline-block',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    />
                  </div>
                )}
              </td>
            </tr>
          )}
          <tr
            id="preana-preview-cell-milestones"
            onClick={() => handlePreviewCellClick('milestones', 'sec3')}
            style={{borderBottom: '1px solid #e2e8f0', cursor: 'pointer'}}
          >
            <td style={{padding: '4px 6px', fontWeight: 700}}>Company Milestones</td>
            <td style={{padding: '4px 6px'}}>
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
              {renderRichHtml(data.existingFincoBackup)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
