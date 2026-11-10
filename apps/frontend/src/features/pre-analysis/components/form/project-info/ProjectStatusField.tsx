/** Project status and its remarks. */
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function ProjectStatusField() {
  const {data, updateField, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <>
      {/* PROJECT STATUS: DROPDOWN + REMARKS */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <label style={{fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', margin: 0}}>
          Project Status
        </label>
        <select
          name="projectStatus"
          data-field="projectStatus"
          value={data.projectStatus === 'None' ? '' : data.projectStatus || ''}
          onChange={e => updateField('projectStatus', e.target.value)}
          onFocus={() => scrollToPreviewElement('preana-preview-cell-projectStatus')}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '0.8rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <option value="" hidden></option>
          <option value="Ongoing">Ongoing</option>
          <option value="Not Yet Started">Not Yet Started</option>
          <option value="Others">Others</option>
        </select>

        <div>
          <label
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '3px',
            }}
          >
            Project Status Remarks
          </label>
          <input
            type="text"
            name="projectStatusRemarks"
            data-field="projectStatusRemarks"
            value={data.projectStatusRemarks || ''}
            onChange={e => updateField('projectStatusRemarks', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-projectStatus')}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '0.8rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
            }}
          />
        </div>
      </div>
    </>
  );
}
