/** Role of the customer, other contractors, project owner and bowheer information. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function CustomerRoleFields() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
        <TextField name="customerRole" label="Role of Customer" />
        <TextField name="otherContractors" label="Other Contractor work in the same bowheer" />
      </div>
      <div>
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Project Owner</label>
        <PreAnalysisRichEditor
          value={data.projectOwner || ''}
          onChange={val => updateField('projectOwner', val)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-projectOwner')}
          height={120}
          dataField="projectOwner"
        />
      </div>
      <div>
        <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Bowheer Information</label>
        <PreAnalysisRichEditor
          value={data.bowheerInfo || ''}
          onChange={val => updateField('bowheerInfo', val)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-bowheerInfo')}
          height={130}
          dataField="bowheerInfo"
        />
      </div>
    </>
  );
}
