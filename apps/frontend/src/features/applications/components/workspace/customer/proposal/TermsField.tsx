/** One free-text field of a Terms & Conditions column. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import type {
  TermsFieldConfig,
  TermsGroupKey,
} from '@/features/applications/components/workspace/customer/proposal/terms-config';

const LABEL_STYLE = {
  fontSize: '11px',
  minHeight: '28px',
  display: 'flex',
  alignItems: 'flex-end',
  lineHeight: 1.25,
  marginBottom: '4px',
  fontWeight: 600,
  color: '#475569',
} as const;

export function TermsField({group, field}: {group: TermsGroupKey; field: TermsFieldConfig}) {
  const {draft, setDraft, handleTriggerFieldSync, canFinance} = useWorkspace();
  const terms = draft.financingProposal?.[group] as Record<string, string> | undefined;
  const value = (field.readKeys || [field.key]).map(k => terms?.[k]).find(Boolean) || '';
  return (
    <div className="field-group" data-field={field.dataField}>
      <label className="field-label" style={LABEL_STYLE}>
        {field.label}
      </label>
      <input
        type="text"
        id={`fap-form-${field.dataField}`}
        data-field={field.dataField}
        className="field-input"
        value={value}
        disabled={!canFinance}
        onFocus={() => handleTriggerFieldSync(field.dataField, 'proposal')}
        onChange={e => {
          const val = e.target.value;
          const patch = Object.fromEntries([field.key, ...(field.alsoWrite || [])].map(k => [k, val]));
          setDraft((prev: any) => ({
            ...prev,
            financingProposal: {
              ...(prev.financingProposal || {}),
              [group]: {...(prev.financingProposal?.[group] || {}), ...patch},
            },
          }));
        }}
      />
    </div>
  );
}
