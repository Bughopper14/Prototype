/** Sticky header of the form: title and save. */
import {FileText, CheckCircle2, Loader2, Save} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function FormActionHeader() {
  const {data, saveStatus, handleSave, saving, props} = usePreAnalysisContext();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        marginBottom: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        gap: '12px',
      }}
    >
      <div style={{minWidth: 0, flex: '1 1 auto'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap'}}>
          <FileText size={18} color="#1e3a8a" style={{flexShrink: 0}} />
          <h3
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
              whiteSpace: 'nowrap',
            }}
          >
            Pre-Analysis Form
          </h3>
        </div>
        <p
          style={{
            margin: '3px 0 0 0',
            fontSize: '0.72rem',
            color: '#64748b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ref:{' '}
          <span
            style={{
              fontWeight: 600,
              color: data.preAnalysisNo?.includes('Auto') ? '#2563eb' : '#334155',
              fontStyle: data.preAnalysisNo?.includes('Auto') ? 'italic' : 'normal',
            }}
          >
            {data.preAnalysisNo || 'Auto (Generated on save)'}
          </span>{' '}
          • FAP No:{' '}
          <span
            style={{
              fontWeight: 600,
              color: data.fapNumber?.includes('Auto') ? '#2563eb' : '#334155',
              fontStyle: data.fapNumber?.includes('Auto') ? 'italic' : 'normal',
            }}
          >
            {data.fapNumber || 'Auto (Generated on save)'}
          </span>
        </p>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
        {saveStatus === 'saved' && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#16a34a',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={props.isNew ? props.onSaveNewApplication : handleSave}
          disabled={saving || (props.isNew && props.busy)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#1e3a8a',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: saving || (props.isNew && props.busy) ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {saving || (props.isNew && props.busy) ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <Save size={14} />
          )}
          {props.isNew
            ? props.busy
              ? 'Creating...'
              : 'Save & Create Application'
            : saving
              ? 'Saving...'
              : 'Save Draft'}
        </button>
      </div>
    </div>
  );
}
