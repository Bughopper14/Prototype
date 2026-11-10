/** UBO and company background. */
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function CompanyBackgroundFields() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      <div>
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
          UBO (Ultimate Beneficiary Owner)
        </label>
        <PreAnalysisRichEditor
          value={data.uboInfo || data.ubo || ''}
          onChange={val => {
            updateField('uboInfo', val);
            updateField('ubo', val);
          }}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInfo')}
          height={130}
          dataField="uboInfo"
        />
      </div>
      <div>
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
          Company Background (Entity, Group Profile & Key Milestones)
        </label>
        <PreAnalysisRichEditor
          value={data.companyBackground || ''}
          onChange={val => updateField('companyBackground', val)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-companyBackground')}
          height={280}
          dataField="companyBackground"
        />
      </div>
    </>
  );
}
