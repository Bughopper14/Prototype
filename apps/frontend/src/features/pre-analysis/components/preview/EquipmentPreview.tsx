/** Section 4 of the document: equipment possibility of success. */
import {renderRichHtml} from '@/features/pre-analysis/components/RichHtml';
import {PreviewSectionTitle} from '@/features/pre-analysis/components/preview/PreviewSectionTitle';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function EquipmentPreview() {
  const {handlePreviewCellClick, data, totalUnits} = usePreAnalysisContext();
  return (
    <>
      <PreviewSectionTitle n={4} field="equipmentJobFit">
        4. EQUIPMENT POSSIBILITY OF SUCCESS
      </PreviewSectionTitle>
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px'}}>
        <tbody>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{width: '26%', padding: '4px 6px', fontWeight: 700}}>Equipment-to-Job Fit</td>
            <td
              id="preana-preview-cell-equipmentJobFit"
              onClick={() => handlePreviewCellClick('equipmentJobFit', 'sec4')}
              style={{width: '74%', padding: '4px 6px', cursor: 'pointer'}}
            >
              {data.equipmentJobFit}
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Utilization vs Project Duration</td>
            <td
              id="preana-preview-cell-utilizationDuration"
              onClick={() => handlePreviewCellClick('utilizationDuration', 'sec4')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.utilizationDuration)}
            </td>
          </tr>
          <tr
            id="preana-preview-cell-unitComposition"
            onClick={() => handlePreviewCellClick('unitComposition', 'sec4')}
            style={{borderBottom: '1px solid #e2e8f0', cursor: 'pointer'}}
          >
            <td style={{padding: '4px 6px', fontWeight: 700}}>Current Unit Composition</td>
            <td style={{padding: '4px 6px'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt'}}>
                <thead>
                  <tr style={{background: '#f1f5f9'}}>
                    <th style={{padding: '3px 6px', textAlign: 'left', border: '1px solid #cbd5e1'}}>
                      Asset Category
                    </th>
                    <th
                      style={{
                        width: '25%',
                        padding: '3px 6px',
                        textAlign: 'left',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      Brand
                    </th>
                    <th
                      style={{
                        width: '18%',
                        padding: '3px 6px',
                        textAlign: 'right',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.unitComposition || []).map((u, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>
                        {u.kategoriAset || '-'}
                      </td>
                      <td style={{padding: '3px 6px', border: '1px solid #e2e8f0'}}>{u.brand}</td>
                      <td style={{padding: '3px 6px', border: '1px solid #e2e8f0', textAlign: 'right'}}>
                        {u.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background: '#f8fafc', fontWeight: 700}}>
                    <td colSpan={2} style={{padding: '4px 6px', border: '1px solid #cbd5e1'}}>
                      TOTAL
                    </td>
                    <td style={{padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right'}}>
                      {totalUnits}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          <tr style={{borderBottom: '1px solid #e2e8f0'}}>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Prior LiuGong Experience</td>
            <td
              id="preana-preview-cell-priorLiugongExperience"
              onClick={() => handlePreviewCellClick('priorLiugongExperience', 'sec4')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.priorLiugongExperience)}
            </td>
          </tr>
          <tr>
            <td style={{padding: '4px 6px', fontWeight: 700}}>Have Service Agreement / FMC</td>
            <td
              id="preana-preview-cell-serviceAgreementFmc"
              onClick={() => handlePreviewCellClick('serviceAgreementFmc', 'sec4')}
              style={{padding: '4px 6px', cursor: 'pointer'}}
            >
              {renderRichHtml(data.serviceAgreementFmc)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
